/**
 * CONTEXT:
 * Identity-focused account overview page for the DCX app.
 * It keeps the core user identity fields together in one calm surface while
 * settings and activity move into their own pages in the new sidebar shell.
 * This page now also owns the first explicit WhatsApp phone-link flow for an
 * already authenticated user.
 */
import { useEffect, useRef, useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import {
  DcxAppAccountFieldRow,
  DcxAppConfirmedTickBadge,
  DCX_APP_ACCOUNT_PAGE_DEFAULT_UX_STRINGS,
  type DcxAppEditableFieldVisualState,
  readDcxAppEditableFieldBorderClass,
  readDcxAppEditableFieldCompactStatusLabel,
  readDcxAppEditableFieldStatusTextClass,
} from "./dcx_app_user_account_shared"
import { readDcxAppAuthenticatedUserAccountSummary } from "../lib/read_dcx_app_authenticated_user_account_summary"
import { requestDcxAppAuthenticatedUserWhatsappPhoneLinkOtp } from "../lib/account_phone/request_dcx_app_authenticated_user_whatsapp_phone_link_otp"
import { verifyDcxAppAuthenticatedUserWhatsappPhoneLinkOtp } from "../lib/account_phone/verify_dcx_app_authenticated_user_whatsapp_phone_link_otp"
import { Button } from "./ui/button"
import { Input } from "./ui/input"

type Props = {
  apiBaseUrl: string
}

const DCX_APP_ACCOUNT_FIELD_SAVED_STATE_DURATION_MS = 10000

export function DcxAppUserAccountSummaryPage(props: Props) {
  const queryClient = useQueryClient()
  const phoneFieldSavedTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const otpFieldSavedTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const accountSummaryQuery = useQuery({
    queryKey: ["dcx_app_authenticated_user_account_summary"],
    queryFn: async () =>
      readDcxAppAuthenticatedUserAccountSummary({
        apiBaseUrl: props.apiBaseUrl,
      }),
  })

  const requestWhatsappOtpMutation = useMutation({
    mutationFn: async (phoneE164: string) =>
      requestDcxAppAuthenticatedUserWhatsappPhoneLinkOtp({
        apiBaseUrl: props.apiBaseUrl,
        phoneE164,
      }),
  })

  const verifyWhatsappOtpMutation = useMutation({
    mutationFn: async (otpCode: string) =>
      verifyDcxAppAuthenticatedUserWhatsappPhoneLinkOtp({
        apiBaseUrl: props.apiBaseUrl,
        otpCode,
      }),
  })

  const accountSummary = accountSummaryQuery.data?.data ?? null
  const ux = accountSummary?.ux_strings ?? DCX_APP_ACCOUNT_PAGE_DEFAULT_UX_STRINGS
  const [phoneDraftValue, setPhoneDraftValue] = useState("")
  const [otpDraftValue, setOtpDraftValue] = useState("")
  const [phoneFieldVisualState, setPhoneFieldVisualState] = useState<DcxAppEditableFieldVisualState>("idle")
  const [phoneFieldStatusText, setPhoneFieldStatusText] = useState(
    DCX_APP_ACCOUNT_PAGE_DEFAULT_UX_STRINGS.editable_status_idle,
  )
  const [otpFieldVisualState, setOtpFieldVisualState] = useState<DcxAppEditableFieldVisualState>("idle")
  const [otpFieldStatusText, setOtpFieldStatusText] = useState(
    DCX_APP_ACCOUNT_PAGE_DEFAULT_UX_STRINGS.editable_status_idle,
  )

  useEffect(() => {
    if (!accountSummary) {
      return
    }

    setPhoneDraftValue(
      accountSummary.pending_whatsapp_phone_link?.phone_e164 ??
        accountSummary.primary_phone_e164 ??
        "",
    )
  }, [accountSummary])

  useEffect(() => {
    return () => {
      if (phoneFieldSavedTimeoutRef.current) {
        clearTimeout(phoneFieldSavedTimeoutRef.current)
      }
      if (otpFieldSavedTimeoutRef.current) {
        clearTimeout(otpFieldSavedTimeoutRef.current)
      }
    }
  }, [])

  const phoneFieldBusy = requestWhatsappOtpMutation.isPending
  const otpFieldBusy = verifyWhatsappOtpMutation.isPending
  const pendingWhatsappPhoneLink = accountSummary?.pending_whatsapp_phone_link ?? null
  const phoneHasUnsavedChanges =
    phoneDraftValue.trim() !==
    (pendingWhatsappPhoneLink?.phone_e164 ?? accountSummary?.primary_phone_e164 ?? "")
  const shouldShowOtpField =
    pendingWhatsappPhoneLink !== null && pendingWhatsappPhoneLink.phone_e164 === phoneDraftValue.trim()

  function scheduleReset(
    kind: "phone" | "otp",
    setVisualState: (nextState: DcxAppEditableFieldVisualState) => void,
    setStatusText: (nextState: string) => void,
  ) {
    const targetRef = kind === "phone" ? phoneFieldSavedTimeoutRef : otpFieldSavedTimeoutRef
    if (targetRef.current) {
      clearTimeout(targetRef.current)
    }
    targetRef.current = setTimeout(() => {
      setVisualState("idle")
      setStatusText(ux.editable_status_idle)
    }, DCX_APP_ACCOUNT_FIELD_SAVED_STATE_DURATION_MS)
  }

  async function handleSendCode() {
    setPhoneFieldVisualState("saving")
    setPhoneFieldStatusText(ux.field_phone_pending_status)

    try {
      const payload = await requestWhatsappOtpMutation.mutateAsync(phoneDraftValue)
      queryClient.setQueryData(["dcx_app_authenticated_user_account_summary"], payload)
      setPhoneFieldVisualState("saved")
      setPhoneFieldStatusText(ux.editable_status_saved)
      setOtpFieldVisualState("idle")
      setOtpFieldStatusText(ux.editable_status_idle)
      setOtpDraftValue("")
      scheduleReset("phone", setPhoneFieldVisualState, setPhoneFieldStatusText)
    } catch (error) {
      const requestError = error as Error & { suggested_action?: string }
      setPhoneFieldVisualState("error")
      setPhoneFieldStatusText(requestError.suggested_action ?? ux.editable_status_save_failed)
    }
  }

  async function handleVerifyCode() {
    setOtpFieldVisualState("saving")
    setOtpFieldStatusText(ux.field_phone_pending_status)

    try {
      const payload = await verifyWhatsappOtpMutation.mutateAsync(otpDraftValue)
      queryClient.setQueryData(["dcx_app_authenticated_user_account_summary"], payload)
      setOtpDraftValue("")
      setOtpFieldVisualState("saved")
      setOtpFieldStatusText(ux.editable_status_saved)
      setPhoneFieldVisualState("saved")
      setPhoneFieldStatusText(ux.editable_status_saved)
      scheduleReset("otp", setOtpFieldVisualState, setOtpFieldStatusText)
      scheduleReset("phone", setPhoneFieldVisualState, setPhoneFieldStatusText)
    } catch (error) {
      const verifyError = error as Error & { suggested_action?: string }
      setOtpFieldVisualState("error")
      setOtpFieldStatusText(verifyError.suggested_action ?? ux.editable_status_save_failed)
    }
  }

  const phoneFieldEffectiveVisualState =
    phoneFieldVisualState === "idle" && phoneHasUnsavedChanges ? "editing" : phoneFieldVisualState
  const phoneFieldEffectiveStatusText =
    phoneFieldVisualState === "idle" && phoneHasUnsavedChanges
      ? ux.editable_status_compact_changed_unsaved
      : phoneFieldStatusText
  const phoneCompactStatusLabel =
    shouldShowOtpField && phoneFieldVisualState === "idle" && !phoneHasUnsavedChanges
      ? ux.field_phone_pending_status
      : phoneFieldVisualState === "idle" && phoneHasUnsavedChanges
        ? ux.editable_status_compact_changed_unsaved
        : readDcxAppEditableFieldCompactStatusLabel(phoneFieldEffectiveVisualState, ux)

  return (
    <section className="flex flex-col gap-6 text-slate-950">
      {accountSummaryQuery.isLoading ? (
        <section className="rounded-none border border-black/6 bg-white px-6 py-8 shadow-[0_20px_60px_-48px_rgba(15,23,42,0.45)]">
          <p className="text-sm text-slate-500">{ux.loading_account_summary}</p>
        </section>
      ) : null}

      {accountSummaryQuery.isError ? (
        <section className="rounded-none border border-red-200 bg-white px-6 py-8 shadow-[0_20px_60px_-48px_rgba(15,23,42,0.45)]">
          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-red-500">
              {ux.error_account_read_blocked}
            </p>
            <h2 className="text-xl font-semibold tracking-tight text-slate-950">
              {ux.error_account_load_title}
            </h2>
            <p className="max-w-2xl text-sm leading-6 text-slate-600">
              {(accountSummaryQuery.error as Error & { suggested_action?: string }).message}
            </p>
            <p className="text-sm text-slate-500">
              {(accountSummaryQuery.error as Error & { suggested_action?: string }).suggested_action ??
                ux.error_account_load_suggested_action}
            </p>
          </div>
        </section>
      ) : null}

      {accountSummary && !accountSummaryQuery.isError ? (
        <article className="rounded-none border border-black/6 bg-white px-6 py-6 shadow-[0_20px_60px_-48px_rgba(15,23,42,0.45)]">
          <div className="mb-6 flex items-start justify-between gap-4 border-b border-black/6 pb-5">
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                {ux.identity_eyebrow}
              </p>
              <h2 className="text-2xl font-semibold tracking-tight text-slate-950">
                {accountSummary.primary_email}
              </h2>
              <p className="text-sm text-slate-600">{ux.identity_subtitle}</p>
            </div>
            {accountSummary.primary_email_confirmed ? (
              <DcxAppConfirmedTickBadge label={ux.field_email_confirmed_badge} />
            ) : null}
          </div>

          <dl>
            <DcxAppAccountFieldRow label={ux.field_primary_email} value={accountSummary.primary_email} />

            <div className="border-b border-black/5 py-3">
              <div className="mb-3 flex items-center justify-between gap-4">
                <dt className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500">
                  {ux.field_primary_phone}
                </dt>
                <div className="flex items-center gap-3">
                  {accountSummary.primary_phone_confirmed && !pendingWhatsappPhoneLink ? (
                    <DcxAppConfirmedTickBadge label={ux.field_phone_confirmed_badge} />
                  ) : null}
                  <span
                    className={[
                      "text-xs font-medium",
                      readDcxAppEditableFieldStatusTextClass(phoneFieldEffectiveVisualState),
                    ].join(" ")}
                  >
                    {phoneCompactStatusLabel}
                  </span>
                </div>
              </div>
              <div className="flex flex-col gap-3">
                <Input
                  value={phoneDraftValue}
                  onChange={(event) => {
                    setPhoneDraftValue(event.target.value)
                    setPhoneFieldVisualState("idle")
                    setPhoneFieldStatusText(phoneFieldEffectiveStatusText)
                  }}
                  placeholder="+34600000001"
                  disabled={phoneFieldBusy || otpFieldBusy}
                  className={[
                    "h-12 rounded-none bg-slate-50 px-4 text-sm text-slate-950 shadow-none",
                    readDcxAppEditableFieldBorderClass(phoneFieldEffectiveVisualState),
                  ].join(" ")}
                />
                <p className="text-sm text-slate-500">{ux.field_phone_whatsapp_hint}</p>
                <div className="flex justify-start">
                  <Button
                    type="button"
                    onClick={() => void handleSendCode()}
                    disabled={phoneFieldBusy || otpFieldBusy || phoneDraftValue.trim() === ""}
                    className="rounded-none"
                  >
                    {shouldShowOtpField ? ux.field_phone_resend_code : ux.field_phone_send_code}
                  </Button>
                </div>
                {(phoneFieldVisualState === "error" || phoneFieldVisualState === "saved") && (
                  <p
                    className={[
                      "text-sm",
                      readDcxAppEditableFieldStatusTextClass(phoneFieldEffectiveVisualState),
                    ].join(" ")}
                  >
                    {phoneFieldStatusText}
                  </p>
                )}
              </div>
            </div>

            {shouldShowOtpField ? (
              <div className="border-b border-black/5 py-3">
                <div className="mb-3 flex items-center justify-between gap-4">
                  <dt className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500">
                    {ux.field_primary_phone_code}
                  </dt>
                  <span
                    className={[
                      "text-xs font-medium",
                      readDcxAppEditableFieldStatusTextClass(otpFieldVisualState),
                    ].join(" ")}
                  >
                    {readDcxAppEditableFieldCompactStatusLabel(otpFieldVisualState, ux)}
                  </span>
                </div>
                <div className="flex flex-col gap-3">
                  <Input
                    value={otpDraftValue}
                    onChange={(event) => {
                      setOtpDraftValue(event.target.value)
                      setOtpFieldVisualState("idle")
                      setOtpFieldStatusText(ux.editable_status_idle)
                    }}
                    placeholder="123456"
                    inputMode="numeric"
                    disabled={phoneFieldBusy || otpFieldBusy}
                    className={[
                      "h-12 rounded-none bg-slate-50 px-4 text-sm text-slate-950 shadow-none",
                      readDcxAppEditableFieldBorderClass(otpFieldVisualState),
                    ].join(" ")}
                  />
                  <p className="text-sm text-slate-500">{ux.field_phone_whatsapp_code_hint}</p>
                  <div className="flex justify-start">
                    <Button
                      type="button"
                      onClick={() => void handleVerifyCode()}
                      disabled={phoneFieldBusy || otpFieldBusy || otpDraftValue.trim() === ""}
                      className="rounded-none"
                    >
                      {ux.field_phone_verify_code}
                    </Button>
                  </div>
                  {(otpFieldVisualState === "error" || otpFieldVisualState === "saved") && (
                    <p
                      className={[
                        "text-sm",
                        readDcxAppEditableFieldStatusTextClass(otpFieldVisualState),
                      ].join(" ")}
                    >
                      {otpFieldStatusText}
                    </p>
                  )}
                </div>
              </div>
            ) : null}

            <DcxAppAccountFieldRow label={ux.field_user_uuid} value={accountSummary.user_uuid} />
            <DcxAppAccountFieldRow label={ux.field_account_status} value={accountSummary.account_status} compact />
          </dl>
        </article>
      ) : null}
    </section>
  )
}
