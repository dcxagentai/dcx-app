/**
 * CONTEXT:
 * Authenticated account-summary page for the DCX app.
 * It exists so the `/me/account` surface can present stable primary contact summaries,
 * verified status, and the normalized email/phone contact-method lists without exposing
 * higher-risk contact edits as casual inline field mutations.
 */
import type { ReactNode } from "react"
import { useMemo, useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import type { ColumnDef } from "@tanstack/react-table"

import { removeDcxAppAuthenticatedUserPhoneContactMethod } from "../lib/account_phone/remove_dcx_app_authenticated_user_phone_contact_method"
import { requestDcxAppAuthenticatedUserWhatsappPhoneLink } from "../lib/account_phone/request_dcx_app_authenticated_user_whatsapp_phone_link"
import { setDcxAppAuthenticatedUserPrimaryPhoneContactMethod } from "../lib/account_phone/set_dcx_app_authenticated_user_primary_phone_contact_method"
import {
  buildDcxAppPhoneE164FromCountrySelection,
  readDcxAppPhoneCountryOptionByRegionCode,
  splitDcxAppPhoneE164ForDisplay,
  type DcxAppPhoneCountryOption,
} from "../lib/dcx_app_phone_country_options"
import {
  readDcxAppPhoneCountryOptionsFromCountriesBundle,
  readDcxAppReferenceCountriesBundle,
} from "../lib/read_dcx_app_reference_countries_bundle"
import {
  readDcxAppAuthenticatedUserAccountSummary,
} from "../lib/read_dcx_app_authenticated_user_account_summary"
import {
  DCX_APP_ACCOUNT_PAGE_DEFAULT_UX_STRINGS,
  DcxAppConfirmedTickBadge,
} from "./dcx_app_user_account_shared"
import { Button } from "./ui/button"
import { DcxAppDataTable } from "./ui/dcx_app_data_table"
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
  ComboboxTriggerIcon,
} from "./ui/combobox"
import { DcxCountryFlagIcon } from "./ui/dcx_country_flag_icon"
import { Input } from "./ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select"

type Props = {
  apiBaseUrl: string
}

type PhoneEditorMode = "hidden" | "add" | "edit"
type PhoneEditorVisualState = "idle" | "saved" | "error"
type DcxAppAccountSummaryData = NonNullable<
  Awaited<ReturnType<typeof readDcxAppAuthenticatedUserAccountSummary>>["data"]
>
type DcxAppEmailContactMethodRow = DcxAppAccountSummaryData["email_contact_methods"][number]
type DcxAppPhoneContactMethodRow = DcxAppAccountSummaryData["phone_contact_methods"][number]

function readDcxCurrentPhoneUxString(
  uxStrings: Record<string, string>,
  key: string,
  fallback: string,
): string {
  const rawValue = (uxStrings[key] ?? "").trim()
  if (rawValue === "") {
    return fallback
  }

  if (key === "field_phone_send_code" && rawValue === "Send code") {
    return fallback
  }

  if (key === "field_phone_resend_code" && rawValue === "Resend code") {
    return fallback
  }

  if (key === "field_phone_whatsapp_code_hint" && rawValue.toLowerCase().includes("six-digit")) {
    return fallback
  }

  if (key === "field_phone_pending_status" && rawValue === "Saved.") {
    return fallback
  }

  return rawValue
}

function DcxAppContactChip(props: { label: string; tone?: "neutral" | "primary" | "verified" }) {
  const toneClassName =
    props.tone === "verified"
      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
      : props.tone === "primary"
        ? "border-sky-200 bg-sky-50 text-sky-700"
        : "border-slate-200 bg-slate-50 text-slate-600"

  return (
    <span
      className={[
        "inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.16em]",
        toneClassName,
      ].join(" ")}
    >
      {props.label}
    </span>
  )
}

function DcxAppCountryCodeBadge(props: {
  regionCode: string
  title?: string
  fallbackLabel?: string
}) {
  return (
    <DcxCountryFlagIcon
      regionCode={props.regionCode}
      title={props.title}
      fallbackLabel={props.fallbackLabel}
      className="inline-flex min-w-9 items-center justify-center border border-black/10 bg-slate-100 px-2 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-700"
    />
  )
}

function DcxAppReadonlySummaryField(props: {
  label: string
  value: ReactNode
  badges?: Array<{ label: string; tone?: "neutral" | "primary" | "verified" }>
  hint?: string | null
}) {
  return (
    <section className="space-y-2">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
          {props.label}
        </p>
        {props.badges && props.badges.length > 0 ? (
          <div className="flex flex-wrap items-center justify-end gap-2">
            {props.badges.map((badge) => (
              <DcxAppContactChip
                key={`${props.label}-${badge.label}`}
                label={badge.label}
                tone={badge.tone}
              />
            ))}
          </div>
        ) : null}
      </div>
      <div className="min-h-12 border border-black/8 bg-slate-50 px-4 py-3 text-sm text-slate-950">
        {props.value}
      </div>
      {props.hint ? <p className="text-sm text-slate-500">{props.hint}</p> : null}
    </section>
  )
}

export function DcxAppUserAccountSummaryPage(props: Props) {
  const queryClient = useQueryClient()
  const [phoneEditorMode, setPhoneEditorMode] = useState<PhoneEditorMode>("hidden")
  const [phoneDraftCountryRegionCode, setPhoneDraftCountryRegionCode] = useState("ES")
  const [phoneDraftNationalNumber, setPhoneDraftNationalNumber] = useState("")
  const [phoneEditorVisualState, setPhoneEditorVisualState] = useState<PhoneEditorVisualState>("idle")
  const [phoneEditorStatusText, setPhoneEditorStatusText] = useState<string | null>(null)
  const [localDebugVerificationLinkUrl, setLocalDebugVerificationLinkUrl] = useState<string | null>(null)
  const [selectedPhoneVerificationMethod, setSelectedPhoneVerificationMethod] = useState("whatsapp")
  const [editingPhoneContactMethodId, setEditingPhoneContactMethodId] = useState<number | null>(null)
  const [editingPhoneIsVerified, setEditingPhoneIsVerified] = useState(false)
  const [editingPhoneIsPrimary, setEditingPhoneIsPrimary] = useState(false)

  const accountSummaryQuery = useQuery({
    queryKey: ["dcx_app_authenticated_user_account_summary"],
    queryFn: async () =>
      readDcxAppAuthenticatedUserAccountSummary({
        apiBaseUrl: props.apiBaseUrl,
      }),
    retry: false,
  })
  const countriesBundleQuery = useQuery({
    queryKey: ["dcx_app_reference_countries_bundle"],
    queryFn: async () =>
      readDcxAppReferenceCountriesBundle({
        apiBaseUrl: props.apiBaseUrl,
      }),
    retry: false,
  })

  const phoneLinkRequestMutation = useMutation({
    mutationFn: async (requestPayload: {
      phoneE164: string
      languageCode: string
      confirmationPurpose?: "contact_verification" | "sender_reconfirmation"
      forceSend?: boolean
    }) =>
      requestDcxAppAuthenticatedUserWhatsappPhoneLink({
        apiBaseUrl: props.apiBaseUrl,
        phoneE164: requestPayload.phoneE164,
        languageCode: requestPayload.languageCode,
        confirmationPurpose: requestPayload.confirmationPurpose,
        forceSend: requestPayload.forceSend,
      }),
    onSuccess: (payload) => {
      queryClient.setQueryData(["dcx_app_authenticated_user_account_summary"], payload)
      setLocalDebugVerificationLinkUrl(payload.context?.local_debug_verification_link_url ?? null)
      setPhoneEditorVisualState("saved")
      const nextDraftPhoneE164 =
        payload.data.pending_whatsapp_phone_link?.phone_e164
        ?? payload.data.primary_phone_e164
        ?? readPhoneEditorDraftE164()
      syncPhoneDraftFromE164(nextDraftPhoneE164)
      setPhoneEditorStatusText(
        payload.context?.operation === "account_phone_whatsapp_already_confirmed"
          ? "This phone is already confirmed for the current DCX WhatsApp number."
          : payload.context?.operation === "account_phone_whatsapp_reverification_link_sent"
            ? "Reverification link sent"
          : readDcxCurrentPhoneUxString(
              payload.data.ux_strings,
              "field_phone_pending_status",
              "Link sent",
            ),
      )
    },
    onError: (error) => {
      const requestError = error as Error & { suggested_action?: string }
      setPhoneEditorVisualState("error")
      setPhoneEditorStatusText(requestError.suggested_action ?? requestError.message)
    },
  })
  const setPrimaryPhoneMutation = useMutation({
    mutationFn: async (phoneContactMethodId: number) =>
      setDcxAppAuthenticatedUserPrimaryPhoneContactMethod({
        apiBaseUrl: props.apiBaseUrl,
        phoneContactMethodId,
      }),
    onSuccess: (payload) => {
      queryClient.setQueryData(["dcx_app_authenticated_user_account_summary"], payload)
      closePhoneEditor()
    },
    onError: (error) => {
      const primarySetError = error as Error & { suggested_action?: string }
      setPhoneEditorVisualState("error")
      setPhoneEditorStatusText(primarySetError.suggested_action ?? primarySetError.message)
    },
  })
  const removePhoneMutation = useMutation({
    mutationFn: async (phoneContactMethodId: number) =>
      removeDcxAppAuthenticatedUserPhoneContactMethod({
        apiBaseUrl: props.apiBaseUrl,
        phoneContactMethodId,
      }),
    onSuccess: (payload) => {
      queryClient.setQueryData(["dcx_app_authenticated_user_account_summary"], payload)
      closePhoneEditor()
    },
    onError: (error) => {
      const removeError = error as Error & { suggested_action?: string }
      setPhoneEditorVisualState("error")
      setPhoneEditorStatusText(removeError.suggested_action ?? removeError.message)
    },
  })

  const accountSummary = accountSummaryQuery.data?.data ?? null
  const uxStrings = accountSummary?.ux_strings ?? DCX_APP_ACCOUNT_PAGE_DEFAULT_UX_STRINGS
  const pendingWhatsappPhoneLink = accountSummary?.pending_whatsapp_phone_link ?? null

  const sendPhoneLinkLabel = readDcxCurrentPhoneUxString(
    uxStrings,
    "field_phone_send_code",
    "Send link",
  )
  const resendPhoneLinkLabel = readDcxCurrentPhoneUxString(
    uxStrings,
    "field_phone_resend_code",
    "Resend link",
  )
  const phoneVerificationHint = readDcxCurrentPhoneUxString(
    uxStrings,
    "field_phone_whatsapp_code_hint",
    "Open the secure link sent to WhatsApp to finish verification.",
  )
  const emailSectionTitle = uxStrings["section_emails_title"] ?? "Emails"
  const phoneSectionTitle = uxStrings["section_phone_numbers_title"] ?? "Phone numbers"
  const addEmailActionLabel = uxStrings["action_add_email"] ?? "Add email"
  const addPhoneActionLabel = uxStrings["action_add_phone"] ?? "Add phone number"
  const editActionLabel = uxStrings["action_edit_contact_method"] ?? "Edit"
  const setPrimaryActionLabel = uxStrings["action_set_primary_contact_method"] ?? "Set primary"
  const cancelActionLabel = uxStrings["action_cancel_contact_method_edit"] ?? "Cancel"
  const verifyPhoneActionLabel = uxStrings["action_verify_phone_contact_method"] ?? "Verify"
  const reverifyWhatsappActionLabel =
    uxStrings["action_reverify_whatsapp_contact_method"] ?? "Reverify WhatsApp"
  const removePhoneActionLabel = uxStrings["action_remove_phone_contact_method"] ?? "Remove"
  const currentSenderConfirmedLabel =
    uxStrings["contact_method_current_sender_confirmed_badge"] ?? "Sender confirmed"
  const currentSenderPendingLabel =
    uxStrings["contact_method_current_sender_pending_badge"] ?? "Confirm sender"
  const primaryBadgeLabel = uxStrings["contact_method_primary_badge"] ?? "Primary"
  const unverifiedBadgeLabel = uxStrings["contact_method_unverified_badge"] ?? "Unverified"
  const noEmailsLabel = uxStrings["empty_email_contact_methods"] ?? "No email contact methods yet."
  const noPhonesLabel = uxStrings["empty_phone_contact_methods"] ?? "No phone numbers added yet."
  const debugLinkLabel = uxStrings["local_debug_verification_link_label"] ?? "Local debug link"
  const phoneVerificationMethodLabel =
    uxStrings["field_phone_verification_method"] ?? "Verification method"
  const whatsappVerificationMethodLabel =
    uxStrings["phone_verification_method_whatsapp"] ?? "WhatsApp"
  const phoneCountryLabel = uxStrings["field_phone_country"] ?? "Country"
  const phoneNumberLabel = uxStrings["field_phone_number"] ?? "Phone number"
  const phoneInputPlaceholder = uxStrings["field_phone_local_number_placeholder"] ?? "647818145"
  const phoneCountryOptions = useMemo(
    () =>
      countriesBundleQuery.data
        ? readDcxAppPhoneCountryOptionsFromCountriesBundle(countriesBundleQuery.data.data)
        : [],
    [countriesBundleQuery.data],
  )
  const selectedPhoneCountryOption =
    readDcxAppPhoneCountryOptionByRegionCode(phoneCountryOptions, phoneDraftCountryRegionCode)
    ?? phoneCountryOptions[0]
    ?? null

  const primaryEmailBadges = useMemo(() => {
    const badges: Array<{ label: string; tone?: "neutral" | "primary" | "verified" }> = []
    if (accountSummary?.primary_email_confirmed) {
      badges.push({
        label: uxStrings.field_email_confirmed_badge,
        tone: "verified",
      })
    }
    badges.push({
      label: primaryBadgeLabel,
      tone: "primary",
    })
    return badges
  }, [accountSummary?.primary_email_confirmed, primaryBadgeLabel, uxStrings.field_email_confirmed_badge])

  const primaryPhoneBadges = useMemo(() => {
    const badges: Array<{ label: string; tone?: "neutral" | "primary" | "verified" }> = []
    if (accountSummary?.primary_phone_confirmed) {
      badges.push({
        label: uxStrings.field_phone_confirmed_badge,
        tone: "verified",
      })
    }
    if (accountSummary?.primary_phone_e164) {
      badges.push({
        label: primaryBadgeLabel,
        tone: "primary",
      })
    }
    return badges
  }, [
    accountSummary?.primary_phone_confirmed,
    accountSummary?.primary_phone_e164,
    primaryBadgeLabel,
    uxStrings.field_phone_confirmed_badge,
  ])

  const emailContactMethodColumns = useMemo<ColumnDef<DcxAppEmailContactMethodRow>[]>(
    () => [
      {
        id: "normalized_value",
        header: "Email",
        cell: ({ row }) => (
          <span className="block truncate font-medium text-slate-950" title={row.original.normalized_value}>
            {row.original.normalized_value}
          </span>
        ),
      },
      {
        id: "status",
        header: "Status",
        cell: ({ row }) => (
          <div className="flex flex-wrap gap-2">
            {row.original.is_verified ? (
              <DcxAppContactChip
                label={uxStrings.field_email_confirmed_badge}
                tone="verified"
              />
            ) : (
              <DcxAppContactChip label={unverifiedBadgeLabel} tone="neutral" />
            )}
            {row.original.is_primary ? (
              <DcxAppContactChip label={primaryBadgeLabel} tone="primary" />
            ) : null}
          </div>
        ),
      },
    ],
    [
      primaryBadgeLabel,
      unverifiedBadgeLabel,
      uxStrings.field_email_confirmed_badge,
    ],
  )

  const phoneContactMethodColumns = useMemo<ColumnDef<DcxAppPhoneContactMethodRow>[]>(
    () => [
      {
        id: "normalized_value",
        header: "Phone number",
        cell: ({ row }) => readRenderablePhoneValue(row.original.normalized_value),
      },
      {
        id: "status",
        header: "Status",
        cell: ({ row }) => (
          <div className="flex flex-wrap gap-2">
            {row.original.is_verified ? (
              <DcxAppContactChip
                label={uxStrings.field_phone_confirmed_badge}
                tone="verified"
              />
            ) : (
              <DcxAppContactChip label={unverifiedBadgeLabel} tone="neutral" />
            )}
            {row.original.is_primary ? (
              <DcxAppContactChip label={primaryBadgeLabel} tone="primary" />
            ) : null}
            {row.original.channel ? (
              <DcxAppContactChip label={row.original.channel} tone="neutral" />
            ) : null}
            {row.original.channel === "whatsapp" && row.original.is_verified ? (
              row.original.current_channel_confirmation?.confirmation_status === "confirmed"
                && row.original.current_channel_confirmation.confirmed_at_ts_ms !== null ? (
                <DcxAppContactChip label={currentSenderConfirmedLabel} tone="verified" />
              ) : (
                <DcxAppContactChip label={currentSenderPendingLabel} tone="neutral" />
              )
            ) : null}
          </div>
        ),
      },
      {
        id: "actions",
        header: "Actions",
        cell: ({ row }) => (
          <div className="flex flex-wrap justify-end gap-2">
            {!row.original.is_verified ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={
                  setPrimaryPhoneMutation.isPending
                  || phoneLinkRequestMutation.isPending
                  || removePhoneMutation.isPending
                }
                onClick={() =>
                  requestExistingPhoneWhatsappLink({
                    phoneE164: row.original.normalized_value,
                    confirmationPurpose: "contact_verification",
                    forceSend: false,
                  })
                }
              >
                {verifyPhoneActionLabel}
              </Button>
            ) : null}
            {row.original.is_verified && row.original.channel === "whatsapp" ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={
                  setPrimaryPhoneMutation.isPending
                  || phoneLinkRequestMutation.isPending
                  || removePhoneMutation.isPending
                }
                onClick={() =>
                  requestExistingPhoneWhatsappLink({
                    phoneE164: row.original.normalized_value,
                    confirmationPurpose: "sender_reconfirmation",
                    forceSend: true,
                  })
                }
              >
                {reverifyWhatsappActionLabel}
              </Button>
            ) : null}
            {row.original.is_verified && !row.original.is_primary ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={
                  setPrimaryPhoneMutation.isPending
                  || phoneLinkRequestMutation.isPending
                  || removePhoneMutation.isPending
                }
                onClick={() => {
                  setPhoneEditorVisualState("idle")
                  setPhoneEditorStatusText(null)
                  setPrimaryPhoneMutation.mutate(row.original.id)
                }}
              >
                {setPrimaryActionLabel}
              </Button>
            ) : null}
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={
                setPrimaryPhoneMutation.isPending
                || phoneLinkRequestMutation.isPending
                || removePhoneMutation.isPending
              }
              onClick={() => openPhoneEditorForExistingPhone(row.original)}
            >
              {editActionLabel}
            </Button>
            {!row.original.is_verified && !row.original.is_primary ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={
                  setPrimaryPhoneMutation.isPending
                  || phoneLinkRequestMutation.isPending
                  || removePhoneMutation.isPending
                }
                onClick={() => removePhoneMutation.mutate(row.original.id)}
              >
                {removePhoneActionLabel}
              </Button>
            ) : null}
          </div>
        ),
      },
    ],
    [
      editActionLabel,
      currentSenderConfirmedLabel,
      currentSenderPendingLabel,
      phoneLinkRequestMutation.isPending,
      primaryBadgeLabel,
      readRenderablePhoneValue,
      removePhoneActionLabel,
      removePhoneMutation,
      reverifyWhatsappActionLabel,
      setPrimaryActionLabel,
      setPrimaryPhoneMutation.isPending,
      unverifiedBadgeLabel,
      verifyPhoneActionLabel,
      uxStrings.field_phone_confirmed_badge,
    ],
  )

  function readEmailContactMethodColumnWidthClassName(columnId: string): string {
    if (columnId === "normalized_value") {
      return "w-[60%]"
    }

    if (columnId === "status") {
      return "w-[40%]"
    }

    return ""
  }

  function readPhoneContactMethodColumnWidthClassName(columnId: string): string {
    if (columnId === "normalized_value") {
      return "w-[42%]"
    }

    if (columnId === "status") {
      return "w-[36%]"
    }

    if (columnId === "actions") {
      return "w-[22%]"
    }

    return ""
  }

  function readPhoneEditorDraftE164(): string {
    if (!selectedPhoneCountryOption) {
      return phoneDraftNationalNumber
    }
    return buildDcxAppPhoneE164FromCountrySelection({
      countryOption: selectedPhoneCountryOption,
      nationalNumberInput: phoneDraftNationalNumber,
    })
  }

  function readPhoneCountryOptionSearchLabel(countryOption: DcxAppPhoneCountryOption): string {
    return [
      countryOption.regionCode,
      countryOption.displayName,
      countryOption.callingCode,
    ].join(" ")
  }

  function syncPhoneDraftFromE164(phoneE164: string): void {
    const fallbackCountryOption = readPhoneCountryFallbackOptionForE164(phoneE164)
    const splitPhone = splitDcxAppPhoneE164ForDisplay({
      phoneE164,
      countryOptions: phoneCountryOptions,
    })
    setPhoneDraftCountryRegionCode(fallbackCountryOption.regionCode)
    setPhoneDraftNationalNumber(splitPhone.nationalNumber)
  }

  function readPhoneCountryFallbackOptionForE164(phoneE164: string): DcxAppPhoneCountryOption {
    const splitPhone = splitDcxAppPhoneE164ForDisplay({
      phoneE164,
      countryOptions: phoneCountryOptions,
    })
    if (splitPhone.countryOption) {
      return splitPhone.countryOption
    }

    if (splitPhone.callingCode) {
      return (
        phoneCountryOptions.find((option) => option.callingCode === splitPhone.callingCode)
        ?? phoneCountryOptions[0]
      )
    }

    return (
      phoneCountryOptions[0]
      ?? {
        countryId: 0,
        regionCode: "ES",
        displayName: "Spain",
        flagAssetKey: "es",
        callingCode: "+34",
        isPrimaryCallingCode: true,
        countrySortOrder: 0,
        callingCodeSortOrder: 0,
      }
    )
  }

  function readRenderablePhoneValue(phoneE164: string): ReactNode {
    const splitPhone = splitDcxAppPhoneE164ForDisplay({
      phoneE164,
      countryOptions: phoneCountryOptions,
    })
    const displayCountryOption =
      splitPhone.countryOption
      ?? (splitPhone.callingCode
        ? phoneCountryOptions.find((option) => option.callingCode === splitPhone.callingCode) ?? null
        : null)

    const countryName = displayCountryOption?.displayName ?? "International"
    const renderedPhoneValue =
      splitPhone.callingCode && splitPhone.nationalNumber
        ? `${splitPhone.callingCode} ${splitPhone.nationalNumber}`
        : phoneE164
    const badgeLabel =
      displayCountryOption?.regionCode
      ?? (splitPhone.isAmbiguousCallingCode ? "INTL" : "INTL")

    return (
      <span className="inline-flex items-center gap-2">
        <DcxAppCountryCodeBadge
          regionCode={displayCountryOption?.regionCode ?? "INTL"}
          fallbackLabel={badgeLabel}
          title={countryName}
        />
        <span title={countryName} className="font-medium text-slate-950">
          {renderedPhoneValue}
        </span>
      </span>
    )
  }

  function openPhoneEditorForAdd(): void {
    setPhoneEditorMode("add")
    setPhoneDraftCountryRegionCode("ES")
    setPhoneDraftNationalNumber("")
    setPhoneEditorVisualState("idle")
    setPhoneEditorStatusText(null)
    setLocalDebugVerificationLinkUrl(null)
    setSelectedPhoneVerificationMethod("whatsapp")
    setEditingPhoneContactMethodId(null)
    setEditingPhoneIsVerified(false)
    setEditingPhoneIsPrimary(false)
  }

  function openPhoneEditorForExistingPhone(phoneContactMethod: {
    id: number
    normalized_value: string
    is_verified: boolean
    is_primary: boolean
  }): void {
    setPhoneEditorMode("edit")
    syncPhoneDraftFromE164(phoneContactMethod.normalized_value)
    setPhoneEditorVisualState("idle")
    setPhoneEditorStatusText(null)
    setLocalDebugVerificationLinkUrl(null)
    setSelectedPhoneVerificationMethod("whatsapp")
    setEditingPhoneContactMethodId(phoneContactMethod.id)
    setEditingPhoneIsVerified(phoneContactMethod.is_verified)
    setEditingPhoneIsPrimary(phoneContactMethod.is_primary)
  }

  function closePhoneEditor(): void {
    setPhoneEditorMode("hidden")
    setPhoneDraftCountryRegionCode("ES")
    setPhoneDraftNationalNumber("")
    setPhoneEditorVisualState("idle")
    setPhoneEditorStatusText(null)
    setLocalDebugVerificationLinkUrl(null)
    setSelectedPhoneVerificationMethod("whatsapp")
    setEditingPhoneContactMethodId(null)
    setEditingPhoneIsVerified(false)
    setEditingPhoneIsPrimary(false)
  }

  function submitPhoneLinkRequest(): void {
    const trimmedNationalNumberDraft = phoneDraftNationalNumber.replace(/[^0-9]/g, "")

    if (trimmedNationalNumberDraft.length < 6) {
      setPhoneEditorVisualState("error")
      setPhoneEditorStatusText("Select a country and enter a phone number, for example Spain and 647818145.")
      return
    }

    if (!selectedPhoneCountryOption) {
      setPhoneEditorVisualState("error")
      setPhoneEditorStatusText("Wait for the countries list to load, then retry.")
      return
    }

    const nextPhoneE164 = readPhoneEditorDraftE164()
    setPhoneEditorVisualState("idle")
    setPhoneEditorStatusText(null)
    phoneLinkRequestMutation.mutate({
      phoneE164: nextPhoneE164,
      languageCode: readPreferredPhoneVerificationLanguageCode(),
      confirmationPurpose: "contact_verification",
      forceSend: false,
    })
  }

  function requestExistingPhoneWhatsappLink(requestPayload: {
    phoneE164: string
    confirmationPurpose: "contact_verification" | "sender_reconfirmation"
    forceSend: boolean
  }): void {
    setPhoneEditorVisualState("idle")
    setPhoneEditorStatusText(null)
    setLocalDebugVerificationLinkUrl(null)
    phoneLinkRequestMutation.mutate({
      phoneE164: requestPayload.phoneE164,
      languageCode: readPreferredPhoneVerificationLanguageCode(),
      confirmationPurpose: requestPayload.confirmationPurpose,
      forceSend: requestPayload.forceSend,
    })
  }

  function readPreferredPhoneVerificationLanguageCode(): string {
    return (
      accountSummary?.preferred_language?.language_code
      ?? accountSummary?.available_languages[0]?.language_code
      ?? "en"
    )
  }

  function submitSetPrimaryPhone(): void {
    if (editingPhoneContactMethodId === null) {
      return
    }
    setPhoneEditorVisualState("idle")
    setPhoneEditorStatusText(null)
    setPrimaryPhoneMutation.mutate(editingPhoneContactMethodId)
  }

  if (accountSummaryQuery.isLoading) {
    return (
      <section className="rounded-none border border-black/6 bg-white px-6 py-8 shadow-[0_20px_60px_-48px_rgba(15,23,42,0.45)]">
        <p className="text-sm text-slate-500">{uxStrings.loading_account_summary}</p>
      </section>
    )
  }

  if (accountSummaryQuery.isError || !accountSummary) {
    return (
      <section className="rounded-none border border-red-200 bg-white px-6 py-8 shadow-[0_20px_60px_-48px_rgba(15,23,42,0.45)]">
        <div className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-red-500">
            {uxStrings.error_account_read_blocked}
          </p>
          <h2 className="text-xl font-semibold tracking-tight text-slate-950">
            {uxStrings.error_account_load_title}
          </h2>
          <p className="max-w-2xl text-sm leading-6 text-slate-600">
            {(accountSummaryQuery.error as Error & { suggested_action?: string } | null)?.message
              ?? uxStrings.error_account_load_suggested_action}
          </p>
        </div>
      </section>
    )
  }

  const activePhoneEditorButtonLabel =
    pendingWhatsappPhoneLink && pendingWhatsappPhoneLink.phone_e164 === readPhoneEditorDraftE164()
      ? resendPhoneLinkLabel
      : sendPhoneLinkLabel

  return (
    <section className="flex flex-col gap-6 text-slate-950">
      <article className="rounded-none border border-black/6 bg-white px-6 py-6 shadow-[0_20px_60px_-48px_rgba(15,23,42,0.45)]">
        <div className="mb-6 space-y-2 border-b border-black/6 pb-5">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                {uxStrings.identity_eyebrow}
              </p>
              <h2 className="text-2xl font-semibold tracking-tight text-slate-950">
                {accountSummary.primary_email}
              </h2>
            </div>
            {accountSummary.primary_email_confirmed ? (
              <DcxAppConfirmedTickBadge label={uxStrings.field_email_confirmed_badge} />
            ) : null}
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <DcxAppReadonlySummaryField
            label={uxStrings.field_primary_email}
            value={accountSummary.primary_email || uxStrings.field_not_set}
            badges={primaryEmailBadges}
          />
          <DcxAppReadonlySummaryField
            label={uxStrings.field_primary_phone}
            value={
              accountSummary.primary_phone_e164
                ? readRenderablePhoneValue(accountSummary.primary_phone_e164)
                : uxStrings.field_phone_not_set_yet
            }
            badges={primaryPhoneBadges}
          />
        </div>
      </article>

      <article className="rounded-none border border-black/6 bg-white px-6 py-6 shadow-[0_20px_60px_-48px_rgba(15,23,42,0.45)]">
        <div className="mb-2 flex items-start justify-between gap-4">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
            {emailSectionTitle}
          </p>
          <Button type="button" variant="outline" size="sm" disabled>
            {addEmailActionLabel}
          </Button>
        </div>

        <div className="space-y-4">
          {accountSummary.email_contact_methods.length > 0 ? (
            <DcxAppDataTable
              columns={emailContactMethodColumns}
              data={accountSummary.email_contact_methods}
              emptyLabel={noEmailsLabel}
              readColumnWidthClassName={readEmailContactMethodColumnWidthClassName}
            />
          ) : (
            <p className="text-sm text-slate-500">{noEmailsLabel}</p>
          )}
        </div>
      </article>

      <article className="rounded-none border border-black/6 bg-white px-6 py-6 shadow-[0_20px_60px_-48px_rgba(15,23,42,0.45)]">
        <div className="mb-2 flex items-start justify-between gap-4">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
            {phoneSectionTitle}
          </p>
          {phoneEditorMode === "hidden" ? (
            <Button type="button" variant="outline" size="sm" onClick={openPhoneEditorForAdd}>
              {addPhoneActionLabel}
            </Button>
          ) : null}
        </div>

        <div className="space-y-4">
          {accountSummary.phone_contact_methods.length > 0 ? (
            <DcxAppDataTable
              columns={phoneContactMethodColumns}
              data={accountSummary.phone_contact_methods}
              emptyLabel={noPhonesLabel}
              readColumnWidthClassName={readPhoneContactMethodColumnWidthClassName}
            />
          ) : (
            <p className="text-sm text-slate-500">{noPhonesLabel}</p>
          )}

          {phoneEditorMode === "hidden" && phoneEditorStatusText ? (
            <p
              className={[
                "text-sm font-medium",
                phoneEditorVisualState === "error" ? "text-red-600" : "text-emerald-700",
              ].join(" ")}
            >
              {phoneEditorStatusText}
            </p>
          ) : null}

          {phoneEditorMode !== "hidden" ? (
            <section className="space-y-3 border border-sky-200 bg-sky-50/40 px-4 py-4">
              <div className="flex items-center justify-between gap-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                  {phoneEditorMode === "add" ? addPhoneActionLabel : `${editActionLabel} phone number`}
                </p>
                {phoneEditorVisualState === "saved" && phoneEditorStatusText ? (
                  <span className="text-xs font-medium text-emerald-700">{phoneEditorStatusText}</span>
                ) : null}
                {phoneEditorVisualState === "error" && phoneEditorStatusText ? (
                  <span className="text-xs font-medium text-red-600">{phoneEditorStatusText}</span>
                ) : null}
              </div>
              <div className="grid gap-4 lg:grid-cols-[minmax(0,280px)_minmax(0,1fr)]">
                <div className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                    {phoneCountryLabel}
                  </p>
                  <div className="relative">
                    <Combobox
                      items={phoneCountryOptions}
                      value={selectedPhoneCountryOption}
                      itemToStringLabel={(countryOption) =>
                        `${countryOption.displayName} (${countryOption.callingCode})`
                      }
                      itemToStringValue={readPhoneCountryOptionSearchLabel}
                      isItemEqualToValue={(left, right) => left.regionCode === right.regionCode}
                      onValueChange={(nextCountryOption) => {
                        if (!nextCountryOption) {
                          return
                        }
                        setPhoneDraftCountryRegionCode(nextCountryOption.regionCode)
                        if (phoneEditorVisualState !== "idle") {
                          setPhoneEditorVisualState("idle")
                          setPhoneEditorStatusText(null)
                        }
                      }}
                      autoHighlight
                      openOnInputClick
                    >
                      <ComboboxInput
                        className="pr-10"
                        placeholder="Search country or code"
                        disabled={phoneCountryOptions.length === 0}
                      />
                      <ComboboxTriggerIcon />
                      <ComboboxContent>
                        <ComboboxEmpty>No countries found.</ComboboxEmpty>
                        <ComboboxList>
                          {(countryOption) => (
                            <ComboboxItem key={countryOption.regionCode} value={countryOption}>
                              <DcxAppCountryCodeBadge
                                regionCode={countryOption.regionCode}
                                title={countryOption.displayName}
                              />
                              <div className="flex min-w-0 flex-col">
                                <span className="truncate font-medium text-slate-950">
                                  {countryOption.displayName}
                                </span>
                                <span className="text-xs text-slate-500">
                                  {countryOption.regionCode} {countryOption.callingCode}
                                </span>
                              </div>
                            </ComboboxItem>
                          )}
                        </ComboboxList>
                      </ComboboxContent>
                    </Combobox>
                  </div>
                </div>
                <div className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                    {phoneNumberLabel}
                  </p>
                  <div className="flex h-12 items-center border border-black/8 bg-white">
                    <span className="border-r border-black/8 px-4 text-sm font-medium text-slate-600">
                      {selectedPhoneCountryOption?.callingCode ?? "--"}
                    </span>
                    <Input
                      type="tel"
                      value={phoneDraftNationalNumber}
                      onChange={(event) => {
                        setPhoneDraftNationalNumber(event.target.value.replace(/[^0-9]/g, ""))
                        if (phoneEditorVisualState !== "idle") {
                          setPhoneEditorVisualState("idle")
                          setPhoneEditorStatusText(null)
                        }
                      }}
                      placeholder={phoneInputPlaceholder}
                      className="h-full rounded-none border-0 bg-transparent px-4 text-sm text-slate-950 shadow-none focus-visible:ring-0"
                    />
                  </div>
                </div>
              </div>
              <div className="max-w-xs space-y-2">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                  {phoneVerificationMethodLabel}
                </p>
                <Select
                  value={selectedPhoneVerificationMethod}
                  onValueChange={setSelectedPhoneVerificationMethod}
                >
                  <SelectTrigger className="h-12 w-full rounded-none border border-black/8 bg-white px-4 text-left text-sm text-slate-950 shadow-none">
                    <SelectValue placeholder={whatsappVerificationMethodLabel} />
                  </SelectTrigger>
                  <SelectContent align="start">
                    <SelectItem value="whatsapp">{whatsappVerificationMethodLabel}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <Button
                  type="button"
                  size="sm"
                  disabled={phoneLinkRequestMutation.isPending || setPrimaryPhoneMutation.isPending}
                  onClick={submitPhoneLinkRequest}
                >
                  {phoneLinkRequestMutation.isPending ? "Sending..." : activePhoneEditorButtonLabel}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={phoneLinkRequestMutation.isPending || setPrimaryPhoneMutation.isPending}
                  onClick={closePhoneEditor}
                >
                  {cancelActionLabel}
                </Button>
                {phoneEditorMode === "edit" && editingPhoneIsVerified && !editingPhoneIsPrimary ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={setPrimaryPhoneMutation.isPending || phoneLinkRequestMutation.isPending}
                    onClick={submitSetPrimaryPhone}
                  >
                    {setPrimaryPhoneMutation.isPending ? "Updating..." : setPrimaryActionLabel}
                  </Button>
                ) : null}
                {pendingWhatsappPhoneLink ? (
                  <span className="text-sm text-slate-600">{phoneVerificationHint}</span>
                ) : null}
              </div>
              {localDebugVerificationLinkUrl ? (
                <p className="text-sm text-slate-700">
                  {debugLinkLabel}:{" "}
                  <a
                    className="font-medium text-sky-700 underline underline-offset-2"
                    href={localDebugVerificationLinkUrl}
                  >
                    Open verification link
                  </a>
                </p>
              ) : null}
            </section>
          ) : null}
        </div>
      </article>

      <article className="rounded-none border border-black/6 bg-white px-6 py-6 shadow-[0_20px_60px_-48px_rgba(15,23,42,0.45)]">
        <dl className="space-y-0">
          <div className="flex items-start justify-between gap-4 border-b border-black/5 py-3">
            <dt className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500">
              {uxStrings.field_user_uuid}
            </dt>
            <dd className="text-right text-sm text-slate-900">{accountSummary.user_uuid}</dd>
          </div>
          <div className="flex items-start justify-between gap-4 py-3">
            <dt className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500">
              {uxStrings.field_account_status}
            </dt>
            <dd className="text-right text-sm font-medium text-slate-900">{accountSummary.account_status}</dd>
          </div>
        </dl>
      </article>
    </section>
  )
}
