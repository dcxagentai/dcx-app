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
  readDcxAppEditableFieldCompactStatusLabel,
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select"

type EditableFieldKey =
  | "preferred_language"
  | "preferred_timezone"
  | "email_communication_preference"

type EditableDraft = {
  preferredLanguageId: number | null
  preferredTimezoneId: number | null
  emailCommunicationPreference: string
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
  options: Array<{ value: string; label: string }>
  onBeginEditing: () => void
  onCancelEditing: () => void
  onSelectValue: (value: string) => void
}

function DcxAppEditableSelectField(props: EditableSelectFieldProps) {
  const statusTextClass = readDcxAppEditableFieldStatusTextClass(props.visualState)
  const triggerBorderClass = readDcxAppEditableFieldBorderClass(props.visualState)
  const hasError = props.visualState === "error"
  const compactStatusLabel = readDcxAppEditableFieldCompactStatusLabel(props.visualState, props.uxStrings)

  return (
    <Field data-invalid={hasError || undefined} className="gap-2">
      <div className="flex items-center justify-between gap-4">
        <FieldLabel className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500">
          {props.label}
        </FieldLabel>
        <span className={["text-xs font-medium", statusTextClass].join(" ")}>
          {compactStatusLabel}
        </span>
      </div>
      <Select
        disabled={props.isDisabled}
        value={props.value}
        onOpenChange={(isOpen) => {
          if (isOpen) {
            props.onBeginEditing()
            return
          }

          props.onCancelEditing()
        }}
        onValueChange={props.onSelectValue}
      >
        <SelectTrigger
          aria-invalid={hasError || undefined}
          className={[
            "h-12 w-full rounded-none bg-slate-50 px-4 text-left text-sm text-slate-950 shadow-none",
            triggerBorderClass,
          ].join(" ")}
        >
          <SelectValue placeholder={props.placeholder} />
        </SelectTrigger>
        <SelectContent align="end" className="min-w-[18rem]">
          {props.options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
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
      }),
  })

  const accountSummary = accountSummaryQuery.data?.data ?? null
  const ux = accountSummary?.ux_strings ?? DCX_APP_ACCOUNT_PAGE_DEFAULT_UX_STRINGS
  const [editableDraft, setEditableDraft] = useState<EditableDraft>({
    preferredLanguageId: null,
    preferredTimezoneId: null,
    emailCommunicationPreference: "announcements",
  })
  const [editableFieldUiStateByKey, setEditableFieldUiStateByKey] = useState<
    Record<EditableFieldKey, EditableFieldUiState>
  >({
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
  })

  useEffect(() => {
    if (!accountSummary) {
      return
    }

    setEditableDraft({
      preferredLanguageId: accountSummary.preferred_language?.id ?? null,
      preferredTimezoneId: accountSummary.preferred_timezone?.id ?? null,
      emailCommunicationPreference: accountSummary.email_communication_preference,
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
      preferredLanguageId: defaultLanguage.id,
      preferredTimezoneId: editableDraft.preferredTimezoneId,
      emailCommunicationPreference: editableDraft.emailCommunicationPreference,
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
  }, [accountSummary, editableDraft.emailCommunicationPreference, ux.editable_status_saving_default_language])

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
          preferredLanguageId: savePayload.data.preferred_language?.id ?? null,
          preferredTimezoneId: savePayload.data.preferred_timezone?.id ?? null,
          emailCommunicationPreference: savePayload.data.email_communication_preference,
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

          <FieldSet>
            <FieldLegend className="sr-only">{ux.settings_title}</FieldLegend>
            <FieldGroup className="gap-6">
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
            </FieldGroup>
          </FieldSet>
        </article>
      ) : null}
    </section>
  )
}
