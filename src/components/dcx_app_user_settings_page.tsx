/**
 * CONTEXT:
 * Basic user settings page for the DCX app.
 * It carries the editable preference controls that used to live on the account
 * page so the shell can now separate identity, settings, and activity clearly.
 */
import { useEffect, useRef, useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import {
  type DcxAppEditableFieldVisualState,
  DCX_APP_ACCOUNT_PAGE_DEFAULT_UX_STRINGS,
  readDcxAppEditableFieldBorderClass,
  readDcxAppEditableFieldStatusTextClass,
} from "./dcx_app_user_account_shared"
import { readDcxAppAuthenticatedUserAccountSummary } from "../lib/read_dcx_app_authenticated_user_account_summary"
import { saveDcxAppAuthenticatedUserAccountSettings } from "../lib/save_dcx_app_authenticated_user_account_settings"
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from "./ui/field"
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
  ComboboxTriggerIcon,
} from "./ui/combobox"
import { Input } from "./ui/input"
import { DcxCountryFlagIcon } from "./ui/dcx_country_flag_icon"
import { readDcxAppLanguageFlagRegionCode } from "../lib/dcx_app_language_flag_options"

type EditableFieldKey =
  | "public_display_name"
  | "public_handle"
  | "public_identity_mode"
  | "preferred_language"
  | "preferred_timezone"
  | "email_communication_preference"
  | "default_interaction_channel"
  | "trade_interest_materials"

type EditableDraft = {
  publicDisplayName: string
  publicHandle: string
  publicIdentityMode: string
  preferredLanguageId: number | null
  preferredTimezoneId: number | null
  emailCommunicationPreference: string
  defaultInteractionChannel: string
  tradeInterestMaterialKeys: string[]
}

type EditableFieldUiState = {
  visualState: DcxAppEditableFieldVisualState
  statusText: string
}

type Props = {
  apiBaseUrl: string
}

const DCX_APP_EDITABLE_FIELD_SAVED_STATE_DURATION_MS = 10000

type EditableSelectFieldProps = {
  label: string
  uxStrings: Record<string, string>
  visualState: DcxAppEditableFieldVisualState
  statusText: string
  isDisabled: boolean
  value: string
  placeholder: string
  options: Array<{
    value: string
    label: string
    searchLabel?: string
    subtitle?: string
    regionCode?: string
  }>
  onBeginEditing: () => void
  onCancelEditing: () => void
  onSelectValue: (value: string) => void
}

type EditableTextFieldProps = {
  label: string
  uxStrings: Record<string, string>
  visualState: DcxAppEditableFieldVisualState
  statusText: string
  isDisabled: boolean
  value: string
  placeholder: string
  onBeginEditing: () => void
  onCancelEditing: () => void
  onChangeValue: (value: string) => void
  onCommitValue: (value: string) => void
}

function DcxAppEditableTextField(props: EditableTextFieldProps) {
  const triggerBorderClass = readDcxAppEditableFieldBorderClass(props.visualState)
  const hasError = props.visualState === "error"

  return (
    <Field data-invalid={hasError || undefined} className="gap-2">
      <FieldLabel className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500">
        {props.label}
      </FieldLabel>
      <Input
        aria-invalid={hasError || undefined}
        className={[triggerBorderClass, "bg-slate-50"].join(" ")}
        disabled={props.isDisabled}
        value={props.value}
        placeholder={props.placeholder}
        onFocus={props.onBeginEditing}
        onChange={(event) => props.onChangeValue(event.target.value)}
        onBlur={(event) => props.onCommitValue(event.currentTarget.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.currentTarget.blur()
          }
          if (event.key === "Escape") {
            props.onCancelEditing()
            event.currentTarget.blur()
          }
        }}
      />
      {hasError ? <FieldError>{props.statusText}</FieldError> : null}
    </Field>
  )
}

function DcxAppEditableSelectField(props: EditableSelectFieldProps) {
  const triggerBorderClass = readDcxAppEditableFieldBorderClass(props.visualState)
  const hasError = props.visualState === "error"
  const selectedOption = props.options.find((option) => option.value === props.value) ?? null

  return (
    <Field data-invalid={hasError || undefined} className="gap-2">
      <FieldLabel className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500">
        {props.label}
      </FieldLabel>
      <div className="relative">
        {selectedOption?.regionCode ? (
          <div className="pointer-events-none absolute inset-y-0 left-4 z-10 flex items-center">
            <DcxCountryFlagIcon
              regionCode={selectedOption.regionCode}
              title={selectedOption.label}
              fallbackLabel={selectedOption.regionCode}
            />
          </div>
        ) : null}
        <Combobox
          items={props.options}
          value={selectedOption ?? undefined}
          itemToStringLabel={(option) => option.label}
          itemToStringValue={(option) => option.searchLabel ?? option.label}
          isItemEqualToValue={(left, right) => left.value === right.value}
          disabled={props.isDisabled}
          onOpenChange={(isOpen) => {
            if (isOpen) {
              props.onBeginEditing()
              return
            }

            props.onCancelEditing()
          }}
          onValueChange={(nextOption) => {
            if (!nextOption) {
              return
            }
            props.onSelectValue(nextOption.value)
          }}
          autoHighlight
          openOnInputClick
        >
          <ComboboxInput
            aria-invalid={hasError || undefined}
            className={[
              selectedOption?.regionCode ? "pl-16" : "",
              "pr-10",
              triggerBorderClass,
              "bg-slate-50",
            ].join(" ")}
            placeholder={props.placeholder}
            disabled={props.isDisabled}
          />
          <ComboboxTriggerIcon />
          <ComboboxContent>
            <ComboboxEmpty>No options found.</ComboboxEmpty>
            <ComboboxList>
              {(option) => (
                <ComboboxItem key={option.value} value={option}>
                  {option.regionCode ? (
                    <DcxCountryFlagIcon
                      regionCode={option.regionCode}
                      title={option.label}
                      fallbackLabel={option.regionCode}
                    />
                  ) : null}
                  <div className="flex min-w-0 flex-col">
                    <span className="truncate font-medium text-slate-950">{option.label}</span>
                    {option.subtitle ? (
                      <span className="text-xs text-slate-500">{option.subtitle}</span>
                    ) : null}
                  </div>
                </ComboboxItem>
              )}
            </ComboboxList>
          </ComboboxContent>
        </Combobox>
      </div>
      {hasError ? <FieldError>{props.statusText}</FieldError> : null}
    </Field>
  )
}

export function DcxAppUserSettingsPage(props: Props) {
  const queryClient = useQueryClient()
  const resetStatusTimeoutByFieldRef = useRef<
    Partial<Record<EditableFieldKey, ReturnType<typeof setTimeout>>>
  >({})
  const autoInitializedLanguageByUserIdRef = useRef<Record<number, boolean>>({})

  const accountSummaryQuery = useQuery({
    queryKey: ["dcx_app_authenticated_user_account_summary"],
    queryFn: async () =>
      readDcxAppAuthenticatedUserAccountSummary({
        apiBaseUrl: props.apiBaseUrl,
      }),
  })

  const saveAccountSettingsMutation = useMutation({
    mutationFn: async (nextDraft: EditableDraft) =>
      saveDcxAppAuthenticatedUserAccountSettings({
        apiBaseUrl: props.apiBaseUrl,
        preferredLanguageId: nextDraft.preferredLanguageId,
        preferredTimezoneId: nextDraft.preferredTimezoneId,
        emailCommunicationPreference: nextDraft.emailCommunicationPreference,
        publicDisplayName: nextDraft.publicDisplayName,
        publicHandle: nextDraft.publicHandle,
        publicIdentityMode: nextDraft.publicIdentityMode,
        defaultInteractionChannel: nextDraft.defaultInteractionChannel,
        tradeInterestMaterialKeys: nextDraft.tradeInterestMaterialKeys,
      }),
  })

  const accountSummary = accountSummaryQuery.data?.data ?? null
  const ux = accountSummary?.ux_strings ?? DCX_APP_ACCOUNT_PAGE_DEFAULT_UX_STRINGS
  const [editableDraft, setEditableDraft] = useState<EditableDraft>({
    publicDisplayName: "",
    publicHandle: "",
    publicIdentityMode: "display_name",
    preferredLanguageId: null,
    preferredTimezoneId: null,
    emailCommunicationPreference: "newsletters",
    defaultInteractionChannel: "app_only",
    tradeInterestMaterialKeys: [],
  })
  const [editableFieldUiStateByKey, setEditableFieldUiStateByKey] = useState<
    Record<EditableFieldKey, EditableFieldUiState>
  >({
    public_display_name: {
      visualState: "idle",
      statusText: DCX_APP_ACCOUNT_PAGE_DEFAULT_UX_STRINGS.editable_status_idle,
    },
    public_handle: {
      visualState: "idle",
      statusText: DCX_APP_ACCOUNT_PAGE_DEFAULT_UX_STRINGS.editable_status_idle,
    },
    public_identity_mode: {
      visualState: "idle",
      statusText: DCX_APP_ACCOUNT_PAGE_DEFAULT_UX_STRINGS.editable_status_idle,
    },
    preferred_language: {
      visualState: "idle",
      statusText: DCX_APP_ACCOUNT_PAGE_DEFAULT_UX_STRINGS.editable_status_idle,
    },
    preferred_timezone: {
      visualState: "idle",
      statusText: DCX_APP_ACCOUNT_PAGE_DEFAULT_UX_STRINGS.editable_status_idle,
    },
    email_communication_preference: {
      visualState: "idle",
      statusText: DCX_APP_ACCOUNT_PAGE_DEFAULT_UX_STRINGS.editable_status_idle,
    },
    default_interaction_channel: {
      visualState: "idle",
      statusText: DCX_APP_ACCOUNT_PAGE_DEFAULT_UX_STRINGS.editable_status_idle,
    },
    trade_interest_materials: {
      visualState: "idle",
      statusText: DCX_APP_ACCOUNT_PAGE_DEFAULT_UX_STRINGS.editable_status_idle,
    },
  })

  useEffect(() => {
    if (!accountSummary) {
      return
    }

    setEditableDraft({
      publicDisplayName: accountSummary.public_identity.public_display_name,
      publicHandle: accountSummary.public_identity.public_handle,
      publicIdentityMode: accountSummary.public_identity.public_identity_mode,
      preferredLanguageId: accountSummary.preferred_language?.id ?? null,
      preferredTimezoneId: accountSummary.preferred_timezone?.id ?? null,
      emailCommunicationPreference: accountSummary.email_communication_preference,
      defaultInteractionChannel: accountSummary.default_interaction_channel,
      tradeInterestMaterialKeys: accountSummary.selected_trade_interest_material_keys,
    })
  }, [accountSummary])

  useEffect(() => {
    if (!accountSummary) {
      return
    }

    if (accountSummary.preferred_language !== null) {
      return
    }

    if (autoInitializedLanguageByUserIdRef.current[accountSummary.user_id]) {
      return
    }

    const defaultLanguage = accountSummary.available_languages[0] ?? null
    if (!defaultLanguage) {
      return
    }

    autoInitializedLanguageByUserIdRef.current[accountSummary.user_id] = true

    const nextDraft = {
      publicDisplayName: editableDraft.publicDisplayName,
      publicHandle: editableDraft.publicHandle,
      publicIdentityMode: editableDraft.publicIdentityMode,
      preferredLanguageId: defaultLanguage.id,
      preferredTimezoneId: editableDraft.preferredTimezoneId,
      emailCommunicationPreference: editableDraft.emailCommunicationPreference,
      defaultInteractionChannel: editableDraft.defaultInteractionChannel,
      tradeInterestMaterialKeys: editableDraft.tradeInterestMaterialKeys,
    }

    setEditableDraft(nextDraft)
    setEditableFieldUiStateByKey((previousState) => ({
      ...previousState,
      preferred_language: {
        visualState: "saving",
        statusText: ux.editable_status_saving_default_language,
      },
    }))
    void saveEditableDraftWithRetries("preferred_language", nextDraft)
  }, [
    accountSummary,
    editableDraft.emailCommunicationPreference,
    editableDraft.defaultInteractionChannel,
    editableDraft.publicDisplayName,
    editableDraft.publicHandle,
    editableDraft.publicIdentityMode,
    editableDraft.tradeInterestMaterialKeys,
    ux.editable_status_saving_default_language,
  ])

  useEffect(() => {
    return () => {
      for (const timeoutHandle of Object.values(resetStatusTimeoutByFieldRef.current)) {
        if (timeoutHandle) {
          clearTimeout(timeoutHandle)
        }
      }
    }
  }, [])

  async function saveEditableDraftWithRetries(
    fieldKey: EditableFieldKey,
    nextDraft: EditableDraft,
  ): Promise<void> {
    for (let attemptNumber = 1; attemptNumber <= 3; attemptNumber += 1) {
      try {
        const savePayload = await saveAccountSettingsMutation.mutateAsync(nextDraft)
        queryClient.setQueryData(["dcx_app_authenticated_user_account_summary"], savePayload)
        setEditableDraft({
          publicDisplayName: savePayload.data.public_identity.public_display_name,
          publicHandle: savePayload.data.public_identity.public_handle,
          publicIdentityMode: savePayload.data.public_identity.public_identity_mode,
          preferredLanguageId: savePayload.data.preferred_language?.id ?? null,
          preferredTimezoneId: savePayload.data.preferred_timezone?.id ?? null,
          emailCommunicationPreference: savePayload.data.email_communication_preference,
          defaultInteractionChannel: savePayload.data.default_interaction_channel,
          tradeInterestMaterialKeys: savePayload.data.selected_trade_interest_material_keys,
        })
        setEditableFieldUiStateByKey((previousState) => ({
          ...previousState,
          [fieldKey]: {
            visualState: "saved",
            statusText: ux.editable_status_saved,
          },
        }))

        if (resetStatusTimeoutByFieldRef.current[fieldKey]) {
          clearTimeout(resetStatusTimeoutByFieldRef.current[fieldKey])
        }

        resetStatusTimeoutByFieldRef.current[fieldKey] = setTimeout(() => {
          setEditableFieldUiStateByKey((previousState) => ({
            ...previousState,
            [fieldKey]: {
              visualState: "idle",
              statusText: ux.editable_status_idle,
            },
          }))
        }, DCX_APP_EDITABLE_FIELD_SAVED_STATE_DURATION_MS)

        return
      } catch (error) {
        if (attemptNumber < 3) {
          setEditableFieldUiStateByKey((previousState) => ({
            ...previousState,
            [fieldKey]: {
              visualState: "saving",
              statusText: ux.editable_status_retrying_template
                .replace("{attempt}", String(attemptNumber + 1))
                .replace("{total}", "3"),
            },
          }))
          await new Promise((resolve) => setTimeout(resolve, 700 * attemptNumber))
          continue
        }

        const saveError = error as Error & { suggested_action?: string }
        setEditableFieldUiStateByKey((previousState) => ({
          ...previousState,
          [fieldKey]: {
            visualState: "error",
            statusText: saveError.suggested_action ?? ux.editable_status_save_failed,
          },
        }))
        return
      }
    }
  }

  function beginEditingField(fieldKey: EditableFieldKey): void {
    if (saveAccountSettingsMutation.isPending) {
      return
    }

    setEditableFieldUiStateByKey((previousState) => ({
      ...previousState,
      [fieldKey]: {
        visualState: "editing",
        statusText: ux.editable_status_editing,
      },
    }))
  }

  function cancelEditingField(fieldKey: EditableFieldKey): void {
    if (saveAccountSettingsMutation.isPending) {
      return
    }

    setEditableFieldUiStateByKey((previousState) => ({
      ...previousState,
      [fieldKey]: {
        visualState: "idle",
        statusText: ux.editable_status_idle,
      },
    }))
  }

  const editableControlsDisabled = saveAccountSettingsMutation.isPending
  const settingsSaveStatus = readDcxAppSettingsPageSaveStatus({
    editableFieldUiStateByKey,
    uxStrings: ux,
  })

  function toggleTradeInterestMaterial(materialKey: string): void {
    const nextMaterialKeys = editableDraft.tradeInterestMaterialKeys.includes(materialKey)
      ? editableDraft.tradeInterestMaterialKeys.filter((selectedMaterialKey) => selectedMaterialKey !== materialKey)
      : [...editableDraft.tradeInterestMaterialKeys, materialKey]
    const nextDraft = {
      ...editableDraft,
      tradeInterestMaterialKeys: nextMaterialKeys,
    }
    setEditableDraft(nextDraft)
    setEditableFieldUiStateByKey((previousState) => ({
      ...previousState,
      trade_interest_materials: {
        visualState: "saving",
        statusText: ux.editable_status_saving,
      },
    }))
    void saveEditableDraftWithRetries("trade_interest_materials", nextDraft)
  }

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
          </div>
        </section>
      ) : null}

      {accountSummary && !accountSummaryQuery.isError ? (
        <article className="rounded-none border border-black/6 bg-white px-6 py-6 shadow-[0_20px_60px_-48px_rgba(15,23,42,0.45)]">
          <div className="mb-6 space-y-2 border-b border-black/6 pb-5">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                  {ux.settings_eyebrow}
                </p>
                <h2 className="text-2xl font-semibold tracking-tight text-slate-950">
                  {ux.settings_title}
                </h2>
                <p className="text-sm text-slate-600">
                  {ux.settings_subtitle}
                </p>
              </div>
              <div className="rounded-md border border-slate-200 px-3 py-2 text-right">
                <p className={["text-xs font-medium", settingsSaveStatus.textClassName].join(" ")}>
                  {settingsSaveStatus.label}
                </p>
              </div>
            </div>
          </div>

          <FieldSet>
            <FieldLegend className="sr-only">{ux.settings_title}</FieldLegend>
            <FieldGroup className="gap-6">
              <div className="grid gap-6 lg:grid-cols-3">
                <DcxAppEditableTextField
                  uxStrings={ux}
                  label={ux.field_public_display_name ?? "Name"}
                  visualState={editableFieldUiStateByKey.public_display_name.visualState}
                  statusText={editableFieldUiStateByKey.public_display_name.statusText}
                  isDisabled={editableControlsDisabled}
                  value={editableDraft.publicDisplayName}
                  placeholder={ux.field_public_display_name_placeholder ?? "Name shown on public forum posts"}
                  onBeginEditing={() => beginEditingField("public_display_name")}
                  onCancelEditing={() => cancelEditingField("public_display_name")}
                  onChangeValue={(nextValue) => {
                    setEditableDraft((previousDraft) => ({
                      ...previousDraft,
                      publicDisplayName: nextValue,
                    }))
                    beginEditingField("public_display_name")
                  }}
                  onCommitValue={(committedValue) => {
                    const nextDraft = {
                      ...editableDraft,
                      publicDisplayName: committedValue.trim(),
                    }
                    setEditableDraft(nextDraft)
                    setEditableFieldUiStateByKey((previousState) => ({
                      ...previousState,
                      public_display_name: {
                        visualState: "saving",
                        statusText: ux.editable_status_saving,
                      },
                    }))
                    void saveEditableDraftWithRetries("public_display_name", nextDraft)
                  }}
                />
                <DcxAppEditableTextField
                  uxStrings={ux}
                  label={ux.field_public_handle ?? "Nickname"}
                  visualState={editableFieldUiStateByKey.public_handle.visualState}
                  statusText={editableFieldUiStateByKey.public_handle.statusText}
                  isDisabled={editableControlsDisabled}
                  value={editableDraft.publicHandle}
                  placeholder={ux.field_public_handle_placeholder ?? "trader_handle"}
                  onBeginEditing={() => beginEditingField("public_handle")}
                  onCancelEditing={() => cancelEditingField("public_handle")}
                  onChangeValue={(nextValue) => {
                    setEditableDraft((previousDraft) => ({
                      ...previousDraft,
                      publicHandle: nextValue,
                    }))
                    beginEditingField("public_handle")
                  }}
                  onCommitValue={(committedValue) => {
                    const nextDraft = {
                      ...editableDraft,
                      publicHandle: committedValue.trim().replace(/^@/, ""),
                    }
                    setEditableDraft(nextDraft)
                    setEditableFieldUiStateByKey((previousState) => ({
                      ...previousState,
                      public_handle: {
                        visualState: "saving",
                        statusText: ux.editable_status_saving,
                      },
                    }))
                    void saveEditableDraftWithRetries("public_handle", nextDraft)
                  }}
                />
                <DcxAppEditableSelectField
                  uxStrings={ux}
                  label={ux.field_public_identity_mode ?? "Public identity"}
                  visualState={editableFieldUiStateByKey.public_identity_mode.visualState}
                  statusText={editableFieldUiStateByKey.public_identity_mode.statusText}
                  isDisabled={editableControlsDisabled}
                  value={editableDraft.publicIdentityMode}
                  placeholder={ux.field_public_identity_mode ?? "Public identity"}
                  options={accountSummary.available_public_identity_modes
                    .filter((availableMode) => availableMode.value !== "anonymous")
                    .map((availableMode) => ({
                      value: availableMode.value,
                      label:
                        availableMode.value === "display_name"
                          ? "Name"
                          : availableMode.value === "handle"
                            ? "Nickname"
                            : availableMode.label,
                      searchLabel: availableMode.label,
                    }))}
                  onBeginEditing={() => beginEditingField("public_identity_mode")}
                  onCancelEditing={() => cancelEditingField("public_identity_mode")}
                  onSelectValue={(selectedValue) => {
                    const nextDraft = {
                      ...editableDraft,
                      publicIdentityMode: selectedValue,
                    }
                    setEditableDraft(nextDraft)
                    setEditableFieldUiStateByKey((previousState) => ({
                      ...previousState,
                      public_identity_mode: {
                        visualState: "saving",
                        statusText: ux.editable_status_saving,
                      },
                    }))
                    void saveEditableDraftWithRetries("public_identity_mode", nextDraft)
                  }}
                />
              </div>
              <DcxAppEditableSelectField
              uxStrings={ux}
              label={ux.field_preferred_language}
              visualState={editableFieldUiStateByKey.preferred_language.visualState}
              statusText={editableFieldUiStateByKey.preferred_language.statusText}
              isDisabled={editableControlsDisabled}
              value={String(editableDraft.preferredLanguageId ?? accountSummary.available_languages[0]?.id ?? "")}
              placeholder={ux.field_preferred_language}
              options={accountSummary.available_languages.map((availableLanguage) => ({
                value: String(availableLanguage.id),
                label: `${availableLanguage.language_name_native} (${availableLanguage.language_code})`,
                subtitle: `${availableLanguage.language_code.toUpperCase()} · ${availableLanguage.language_name_native}`,
                searchLabel: `${availableLanguage.language_name_native} ${availableLanguage.language_code}`,
                regionCode: readDcxAppLanguageFlagRegionCode(availableLanguage.language_code),
              }))}
              onBeginEditing={() => beginEditingField("preferred_language")}
              onCancelEditing={() => cancelEditingField("preferred_language")}
              onSelectValue={(selectedValue) => {
                const nextDraft = {
                  ...editableDraft,
                  preferredLanguageId: Number(selectedValue),
                }
                setEditableDraft(nextDraft)
                setEditableFieldUiStateByKey((previousState) => ({
                  ...previousState,
                  preferred_language: {
                    visualState: "saving",
                    statusText: ux.editable_status_saving,
                  },
                }))
                void saveEditableDraftWithRetries("preferred_language", nextDraft)
              }}
            />
              <DcxAppEditableSelectField
              uxStrings={ux}
              label={ux.field_timezone}
              visualState={editableFieldUiStateByKey.preferred_timezone.visualState}
              statusText={editableFieldUiStateByKey.preferred_timezone.statusText}
              isDisabled={editableControlsDisabled}
              value={String(editableDraft.preferredTimezoneId ?? accountSummary.available_timezones[0]?.id ?? "")}
              placeholder={ux.field_timezone}
              options={accountSummary.available_timezones.map((availableTimezone) => ({
                value: String(availableTimezone.id),
                label: availableTimezone.display_label,
                searchLabel: availableTimezone.display_label,
              }))}
              onBeginEditing={() => beginEditingField("preferred_timezone")}
              onCancelEditing={() => cancelEditingField("preferred_timezone")}
              onSelectValue={(selectedValue) => {
                const nextDraft = {
                  ...editableDraft,
                  preferredTimezoneId: Number(selectedValue),
                }
                setEditableDraft(nextDraft)
                setEditableFieldUiStateByKey((previousState) => ({
                  ...previousState,
                  preferred_timezone: {
                    visualState: "saving",
                    statusText: ux.editable_status_saving,
                  },
                }))
                void saveEditableDraftWithRetries("preferred_timezone", nextDraft)
              }}
            />
              <DcxAppEditableSelectField
              uxStrings={ux}
              label={ux.field_email_preference}
              visualState={editableFieldUiStateByKey.email_communication_preference.visualState}
              statusText={editableFieldUiStateByKey.email_communication_preference.statusText}
              isDisabled={editableControlsDisabled}
              value={editableDraft.emailCommunicationPreference}
              placeholder={ux.field_email_preference}
              options={accountSummary.available_email_communication_preferences.map((availablePreference) => ({
                value: availablePreference.value,
                label: availablePreference.label,
                searchLabel: availablePreference.label,
              }))}
              onBeginEditing={() => beginEditingField("email_communication_preference")}
              onCancelEditing={() => cancelEditingField("email_communication_preference")}
              onSelectValue={(selectedValue) => {
                const nextDraft = {
                  ...editableDraft,
                  emailCommunicationPreference: selectedValue,
                }
                setEditableDraft(nextDraft)
                setEditableFieldUiStateByKey((previousState) => ({
                  ...previousState,
                  email_communication_preference: {
                    visualState: "saving",
                    statusText: ux.editable_status_saving,
                  },
                }))
                void saveEditableDraftWithRetries("email_communication_preference", nextDraft)
              }}
            />
              <DcxAppEditableSelectField
              uxStrings={ux}
              label="Trade chat notifications"
              visualState={editableFieldUiStateByKey.default_interaction_channel.visualState}
              statusText={editableFieldUiStateByKey.default_interaction_channel.statusText}
              isDisabled={editableControlsDisabled}
              value={editableDraft.defaultInteractionChannel}
              placeholder="Trade chat notifications"
              options={accountSummary.available_default_interaction_channels.map((availableChannel) => ({
                value: availableChannel.value,
                label: availableChannel.label,
                searchLabel: availableChannel.label,
              }))}
              onBeginEditing={() => beginEditingField("default_interaction_channel")}
              onCancelEditing={() => cancelEditingField("default_interaction_channel")}
              onSelectValue={(selectedValue) => {
                const nextDraft = {
                  ...editableDraft,
                  defaultInteractionChannel: selectedValue,
                }
                setEditableDraft(nextDraft)
                setEditableFieldUiStateByKey((previousState) => ({
                  ...previousState,
                  default_interaction_channel: {
                    visualState: "saving",
                    statusText: ux.editable_status_saving,
                  },
                }))
                void saveEditableDraftWithRetries("default_interaction_channel", nextDraft)
              }}
            />
              <Field data-invalid={editableFieldUiStateByKey.trade_interest_materials.visualState === "error" || undefined} className="gap-3">
                <FieldLabel className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500">
                  Trade alerts
                </FieldLabel>
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {accountSummary.available_trade_interest_materials.map((materialOption) => {
                    const isSelected = editableDraft.tradeInterestMaterialKeys.includes(materialOption.material_key)
                    return (
                      <label
                        key={materialOption.material_key}
                        className={[
                          "flex cursor-pointer items-center gap-3 rounded-md border px-3 py-2 text-sm transition",
                          isSelected
                            ? "border-sky-300 bg-sky-50 text-slate-950"
                            : "border-slate-200 bg-slate-50 text-slate-700 hover:border-slate-300",
                          editableControlsDisabled ? "cursor-not-allowed opacity-60" : "",
                        ].join(" ")}
                      >
                        <input
                          type="checkbox"
                          className="h-4 w-4 accent-sky-600"
                          disabled={editableControlsDisabled}
                          checked={isSelected}
                          onChange={() => toggleTradeInterestMaterial(materialOption.material_key)}
                        />
                        <span className="font-medium">{materialOption.display_label}</span>
                      </label>
                    )
                  })}
                </div>
                {editableFieldUiStateByKey.trade_interest_materials.visualState === "error" ? (
                  <FieldError>{editableFieldUiStateByKey.trade_interest_materials.statusText}</FieldError>
                ) : null}
              </Field>
            </FieldGroup>
          </FieldSet>
        </article>
      ) : null}
    </section>
  )
}

function readDcxAppSettingsPageSaveStatus(params: {
  editableFieldUiStateByKey: Record<EditableFieldKey, EditableFieldUiState>
  uxStrings: Record<string, string>
}): {
  label: string
  textClassName: string
} {
  const visualStates = Object.values(params.editableFieldUiStateByKey).map((fieldState) => fieldState.visualState)

  if (visualStates.includes("error")) {
    return {
      label: params.uxStrings.editable_status_compact_save_failed,
      textClassName: readDcxAppEditableFieldStatusTextClass("error"),
    }
  }

  if (visualStates.includes("saving")) {
    return {
      label: params.uxStrings.editable_status_saving,
      textClassName: readDcxAppEditableFieldStatusTextClass("saving"),
    }
  }

  if (visualStates.includes("editing")) {
    return {
      label: params.uxStrings.editable_status_compact_changed_unsaved,
      textClassName: readDcxAppEditableFieldStatusTextClass("editing"),
    }
  }

  if (visualStates.includes("saved")) {
    return {
      label: params.uxStrings.editable_status_compact_saved,
      textClassName: readDcxAppEditableFieldStatusTextClass("saved"),
    }
  }

  return {
    label: params.uxStrings.editable_status_compact_idle,
    textClassName: readDcxAppEditableFieldStatusTextClass("idle"),
  }
}
