/**
 * CONTEXT:
 * First editable account page for the DCX user app.
 * It exists to prove the app can render real authenticated user data and autosave a small
 * set of low-risk account fields in a compact, premium business surface before broader auth,
 * phone capture, or email-change verification flows exist.
 */
import { useEffect, useRef, useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Button } from "@/components/ui/button"
import dcxLogo from "@prompteoai/dcx-branding/assets/dcx_logo.png"

import {
  readDcxLocaleForLanguageCode,
} from "../lib/dcx_app_language_preference"
import {
  readDcxAppAuthenticatedUserAccountSummary,
} from "../lib/read_dcx_app_authenticated_user_account_summary"
import { saveDcxAppAuthenticatedUserAccountSettings } from "../lib/save_dcx_app_authenticated_user_account_settings"

type Props = {
  apiBaseUrl: string
  authenticatedSessionSummary: {
    primary_email: string
    user_role: string
  } | null
  onLogout: (() => void) | null
  isLogoutPending: boolean
}

type EditableFieldKey =
  | "preferred_language"
  | "preferred_timezone"
  | "email_communication_preference"
type EditableFieldVisualState = "idle" | "editing" | "saving" | "saved" | "error"

type EditableDraft = {
  preferredLanguageId: number | null
  preferredTimezoneId: number | null
  emailCommunicationPreference: string
}

type EditableFieldUiState = {
  visualState: EditableFieldVisualState
  statusText: string
}

const DCX_APP_ACCOUNT_PAGE_DEFAULT_UX_STRINGS: Record<string, string> = {
  surface_label: "DCX App",
  page_title: "Account",
  inline_autosave_badge: "Inline autosave MVP surface",
  refresh_button_label: "Refresh",
  loading_account_summary: "Loading account summary...",
  error_account_read_blocked: "Account read blocked",
  error_account_load_title: "We could not load the DCX account summary.",
  identity_eyebrow: "Identity",
  identity_subtitle: "Confirmed account with stable DCX user identity.",
  account_state_confirmed: "Confirmed",
  account_state_pending: "Pending",
  field_primary_email: "Primary email",
  field_primary_phone: "Primary phone",
  field_user_uuid: "User UUID",
  field_account_status: "Account status",
  field_preferred_language: "Preferred language",
  field_timezone: "Timezone",
  field_email_preference: "Email preference",
  field_email_confirmed_at: "Email confirmed at",
  field_phone_confirmed_at: "Phone confirmed at",
  field_last_seen_at: "Last seen at",
  field_created_at: "Created at",
  field_updated_at: "Updated at",
  field_not_set: "Not set",
  field_phone_not_set_yet: "Not set yet",
  logout_button_label: "Logout",
  logout_button_pending_label: "Signing out...",
  editable_status_idle: "Blue means editable. Click to adjust.",
  editable_status_editing: "Editing. Choose a value to autosave.",
  editable_status_saving: "Saving...",
  editable_status_saved: "Saved.",
  editable_status_retrying_template: "Retrying save ({attempt}/{total})...",
  editable_status_save_failed: "Save failed. Please click back in and retry.",
  editable_status_saving_default_language: "Saving default language...",
  error_account_load_suggested_action: "Sign in again through the DCX app login flow, then retry.",
  activity_eyebrow: "Activity",
  activity_title: "Account timeline",
  email_preference_announcements: "Announcements",
  email_preference_essential_only: "Essential only",
  next_eyebrow: "Next",
  next_title: "Email and phone changes can come after the field behavior is proven.",
  next_body:
    "This pass intentionally keeps primary email and phone read-only. Preferred language, timezone, and communication preference now prove the inline autosave behavior, retry path, and save-state feedback we can reuse later for higher-risk account changes.",
}

function formatTimestampLabel(
  timestampMs: number | null,
  languageCode: string,
  preferredTimezoneIanaName: string | null,
  emptyLabel: string,
): string {
  if (typeof timestampMs !== "number") {
    return emptyLabel
  }

  return new Intl.DateTimeFormat(readDcxLocaleForLanguageCode(languageCode), {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: preferredTimezoneIanaName ?? undefined,
  }).format(new Date(timestampMs))
}

function AccountFieldRow(props: { label: string; value: string; compact?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-black/5 py-3 last:border-b-0">
      <dt className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500">
        {props.label}
      </dt>
      <dd
        className={[
          "text-right text-sm text-slate-900",
          props.compact ? "font-medium" : "max-w-[22rem] leading-6",
        ].join(" ")}
      >
        {props.value}
      </dd>
    </div>
  )
}

function readEditableFieldBorderClass(visualState: EditableFieldVisualState): string {
  if (visualState === "editing" || visualState === "saving") {
    return "border-amber-300"
  }

  if (visualState === "saved") {
    return "border-emerald-300"
  }

  if (visualState === "error") {
    return "border-red-300"
  }

  return "border-sky-300"
}

function readEditableFieldStatusTextClass(visualState: EditableFieldVisualState): string {
  if (visualState === "editing" || visualState === "saving") {
    return "text-amber-600"
  }

  if (visualState === "saved") {
    return "text-emerald-600"
  }

  if (visualState === "error") {
    return "text-red-600"
  }

  return "text-sky-700"
}

function EditableInlineSelectRow(props: {
  label: string
  visualState: EditableFieldVisualState
  statusText: string
  isDisabled: boolean
  value: string
  options: Array<{ value: string; label: string }>
  onFocusField: () => void
  onCancelEditing: () => void
  onSelectValue: (value: string) => void
}) {
  return (
    <div className="border-b border-black/5 py-3 last:border-b-0">
      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 flex-col gap-2">
          <dt className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500">
            {props.label}
          </dt>
          <p className={["text-xs font-medium", readEditableFieldStatusTextClass(props.visualState)].join(" ")}>
            {props.statusText}
          </p>
        </div>

        <div className="w-full max-w-[22rem]">
          <select
            disabled={props.isDisabled}
            value={props.value}
            onFocus={props.onFocusField}
            onBlur={props.onCancelEditing}
            onChange={(event) => props.onSelectValue(event.target.value)}
            className={[
              "h-10 w-full rounded-2xl border bg-slate-50 px-3 text-right text-sm text-slate-950 outline-none transition disabled:cursor-not-allowed disabled:opacity-70",
              readEditableFieldBorderClass(props.visualState),
            ].join(" ")}
          >
            {props.options.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  )
}

export function DcxAppUserAccountSummaryPage(props: Props) {
  const queryClient = useQueryClient()
  const resetStatusTimeoutByFieldRef = useRef<
    Partial<Record<EditableFieldKey, ReturnType<typeof setTimeout>>>
  >({})

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
  const routeLabel = "/me/account"
  const [editableDraft, setEditableDraft] = useState<EditableDraft>({
    preferredLanguageId: null,
    preferredTimezoneId: null,
    emailCommunicationPreference: "announcements",
  })
  const autoInitializedLanguageByUserIdRef = useRef<Record<number, boolean>>({})
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
        queryClient.setQueryData(
          ["dcx_app_authenticated_user_account_summary"],
          savePayload,
        )
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
        }, 1400)

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
            statusText:
              saveError.suggested_action ??
              ux.editable_status_save_failed,
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
  const selectedTimezoneIanaName = accountSummary?.preferred_timezone?.iana_name ?? null
  const selectedLanguageCode = accountSummary?.preferred_language?.language_code ?? "en"
  const phoneDisplayValue = accountSummary?.primary_phone_e164
    ? `${accountSummary.primary_phone_e164}${accountSummary.primary_phone_channel ? ` (${accountSummary.primary_phone_channel})` : ""}`
    : ux.field_phone_not_set_yet

  return (
    <main className="min-h-screen bg-[#f4f6f8] px-4 py-6 text-slate-950 sm:px-6 lg:px-8">
      <section className="mx-auto flex max-w-6xl flex-col gap-6">
        <header className="flex flex-col gap-4 rounded-[1.75rem] border border-black/6 bg-white px-5 py-5 shadow-[0_20px_60px_-48px_rgba(15,23,42,0.45)] sm:px-7">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <img src={dcxLogo} alt="DCX logo" className="h-11 w-11 rounded-xl bg-[#fbfaf7] p-1.5" />
              <div className="space-y-1">
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
                  {ux.surface_label}
                </p>
                <h1 className="text-2xl font-semibold tracking-tight text-slate-950">
                  {ux.page_title}
                </h1>
              </div>
            </div>

            <div className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-600">
              {routeLabel}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 text-sm text-slate-600">
            <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1">
              {ux.inline_autosave_badge}
            </span>
            {props.authenticatedSessionSummary ? (
              <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1">
                {props.authenticatedSessionSummary.primary_email} · {props.authenticatedSessionSummary.user_role}
              </span>
            ) : null}
            <Button
              type="button"
              variant="outline"
              className="h-8 rounded-full px-4 text-xs"
              onClick={() => accountSummaryQuery.refetch()}
            >
              {ux.refresh_button_label}
            </Button>
            {props.onLogout ? (
              <Button
                type="button"
                variant="outline"
                className="h-8 rounded-full px-4 text-xs"
                onClick={props.onLogout}
                disabled={props.isLogoutPending}
              >
                {props.isLogoutPending ? ux.logout_button_pending_label : ux.logout_button_label}
              </Button>
            ) : null}
          </div>
        </header>

        {accountSummaryQuery.isLoading ? (
          <section className="rounded-[1.75rem] border border-black/6 bg-white px-6 py-8 shadow-[0_20px_60px_-48px_rgba(15,23,42,0.45)]">
            <p className="text-sm text-slate-500">{ux.loading_account_summary}</p>
          </section>
        ) : null}

        {accountSummaryQuery.isError ? (
          <section className="rounded-[1.75rem] border border-red-200 bg-white px-6 py-8 shadow-[0_20px_60px_-48px_rgba(15,23,42,0.45)]">
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
          <>
            <section className="grid gap-6 lg:grid-cols-[minmax(0,1.15fr)_minmax(20rem,0.85fr)]">
              <article className="rounded-[1.75rem] border border-black/6 bg-white px-6 py-6 shadow-[0_20px_60px_-48px_rgba(15,23,42,0.45)]">
                <div className="mb-6 flex items-start justify-between gap-4 border-b border-black/6 pb-5">
                  <div className="space-y-2">
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                      {ux.identity_eyebrow}
                    </p>
                    <h2 className="text-2xl font-semibold tracking-tight text-slate-950">
                      {accountSummary.primary_email}
                    </h2>
                    <p className="text-sm text-slate-600">
                      {ux.identity_subtitle}
                    </p>
                  </div>
                  <div
                    className={[
                      "rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em]",
                      accountSummary.primary_email_confirmed
                        ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200"
                        : "bg-amber-50 text-amber-700 ring-1 ring-amber-200",
                    ].join(" ")}
                  >
                    {accountSummary.primary_email_confirmed ? ux.account_state_confirmed : ux.account_state_pending}
                  </div>
                </div>

                <dl>
                  <AccountFieldRow label={ux.field_primary_email} value={accountSummary.primary_email} />
                  <AccountFieldRow label={ux.field_primary_phone} value={phoneDisplayValue} />
                  <AccountFieldRow label={ux.field_user_uuid} value={accountSummary.user_uuid} />
                  <AccountFieldRow label={ux.field_account_status} value={accountSummary.account_status} compact />
                  <EditableInlineSelectRow
                    label={ux.field_preferred_language}
                    visualState={editableFieldUiStateByKey.preferred_language.visualState}
                    statusText={editableFieldUiStateByKey.preferred_language.statusText}
                    isDisabled={editableControlsDisabled}
                    value={String(editableDraft.preferredLanguageId ?? accountSummary.available_languages[0]?.id ?? "")}
                    options={accountSummary.available_languages.map((availableLanguage) => ({
                      value: String(availableLanguage.id),
                      label: `${availableLanguage.language_name_native} (${availableLanguage.language_code})`,
                    }))}
                    onFocusField={() => beginEditingField("preferred_language")}
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
                  <EditableInlineSelectRow
                    label={ux.field_timezone}
                    visualState={editableFieldUiStateByKey.preferred_timezone.visualState}
                    statusText={editableFieldUiStateByKey.preferred_timezone.statusText}
                    isDisabled={editableControlsDisabled}
                    value={String(editableDraft.preferredTimezoneId ?? accountSummary.available_timezones[0]?.id ?? "")}
                    options={accountSummary.available_timezones.map((availableTimezone) => ({
                      value: String(availableTimezone.id),
                      label: availableTimezone.display_label,
                    }))}
                    onFocusField={() => beginEditingField("preferred_timezone")}
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
                  <EditableInlineSelectRow
                    label={ux.field_email_preference}
                    visualState={editableFieldUiStateByKey.email_communication_preference.visualState}
                    statusText={editableFieldUiStateByKey.email_communication_preference.statusText}
                    isDisabled={editableControlsDisabled}
                    value={editableDraft.emailCommunicationPreference}
                    options={accountSummary.available_email_communication_preferences.map((availablePreference) => ({
                      value: availablePreference.value,
                      label: availablePreference.label,
                    }))}
                    onFocusField={() => beginEditingField("email_communication_preference")}
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
                </dl>
              </article>

              <aside className="space-y-6">
                <section className="rounded-[1.75rem] border border-black/6 bg-white px-6 py-6 shadow-[0_20px_60px_-48px_rgba(15,23,42,0.45)]">
                  <div className="mb-5 space-y-2 border-b border-black/6 pb-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                      {ux.activity_eyebrow}
                    </p>
                    <h3 className="text-lg font-semibold tracking-tight text-slate-950">
                      {ux.activity_title}
                    </h3>
                  </div>
                  <dl>
                    <AccountFieldRow
                      label={ux.field_email_confirmed_at}
                      value={formatTimestampLabel(accountSummary.primary_email_confirmed_at_ts_ms, selectedLanguageCode, selectedTimezoneIanaName, ux.field_not_set)}
                    />
                    <AccountFieldRow
                      label={ux.field_phone_confirmed_at}
                      value={formatTimestampLabel(accountSummary.primary_phone_confirmed_at_ts_ms, selectedLanguageCode, selectedTimezoneIanaName, ux.field_not_set)}
                    />
                    <AccountFieldRow
                      label={ux.field_last_seen_at}
                      value={formatTimestampLabel(accountSummary.last_seen_at_ts_ms, selectedLanguageCode, selectedTimezoneIanaName, ux.field_not_set)}
                    />
                    <AccountFieldRow
                      label={ux.field_created_at}
                      value={formatTimestampLabel(accountSummary.created_at_ts_ms, selectedLanguageCode, selectedTimezoneIanaName, ux.field_not_set)}
                    />
                    <AccountFieldRow
                      label={ux.field_updated_at}
                      value={formatTimestampLabel(accountSummary.updated_at_ts_ms, selectedLanguageCode, selectedTimezoneIanaName, ux.field_not_set)}
                    />
                  </dl>
                </section>

                <section className="rounded-[1.75rem] border border-black/6 bg-[#111111] px-6 py-6 text-white shadow-[0_20px_60px_-48px_rgba(15,23,42,0.45)]">
                  <div className="space-y-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/45">
                      {ux.next_eyebrow}
                    </p>
                    <h3 className="text-lg font-semibold tracking-tight">
                      {ux.next_title}
                    </h3>
                    <p className="text-sm leading-6 text-white/65">
                      {ux.next_body}
                    </p>
                  </div>
                </section>
              </aside>
            </section>
          </>
        ) : null}
      </section>
    </main>
  )
}
