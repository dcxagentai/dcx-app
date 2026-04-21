/**
 * CONTEXT:
 * Shared display helpers and UX defaults for the first authenticated DCX app
 * account pages. These helpers keep the account, settings, and activity pages
 * visually and semantically aligned while we split the original single account
 * surface into more client-legible sections.
 */
import {
  readDcxLocaleForLanguageCode,
} from "../lib/dcx_app_language_preference"

export type DcxAppEditableFieldVisualState = "idle" | "editing" | "saving" | "saved" | "error"

export const DCX_APP_ACCOUNT_PAGE_DEFAULT_UX_STRINGS: Record<string, string> = {
  surface_label: "DCX App",
  page_title: "Account",
  page_title_account: "Account",
  page_title_settings: "Settings",
  page_title_activity_log: "Activity Log",
  nav_group_workspace: "Workspace",
  nav_chats: "Chats",
  nav_chats_inbox: "Inbox",
  nav_chats_humans: "Humans",
  nav_chats_agents: "Agents",
  nav_trades: "Trades",
  nav_trades_market_watch: "Market Watch",
  nav_trades_my_trades: "My Trades",
  nav_contacts: "Contacts",
  nav_files: "Files",
  nav_files_documents: "Documents",
  nav_files_images: "Images",
  nav_files_audio: "Audio",
  nav_badge_soon: "Soon",
  nav_toggle_section: "Toggle section",
  nav_admin_workspace: "Admin workspace",
  user_menu_account: "Account",
  user_menu_subscription: "Subscription",
  user_menu_settings: "Settings",
  user_menu_privacy_security: "Privacy & Security",
  user_menu_activity_log: "Activity Log",
  user_menu_log_out: "Log out",
  user_menu_log_out_pending: "Signing out...",
  refresh_button_label: "Refresh",
  loading_account_summary: "Loading account summary...",
  error_account_read_blocked: "Account read blocked",
  error_account_load_title: "We could not load the DCX account summary.",
  identity_eyebrow: "Identity",
  identity_subtitle: "Confirmed account with stable DCX user identity.",
  account_state_confirmed: "Confirmed",
  account_state_pending: "Pending",
  settings_eyebrow: "Settings",
  settings_title: "Preferences and notifications",
  settings_subtitle: "Control language, timezone, newsletters, and promotional email preferences from one simple settings page.",
  activity_eyebrow: "Activity",
  activity_title: "Account timeline",
  activity_subtitle: "See the basic account events we are already recording for this user.",
  field_primary_email: "Primary email",
  field_primary_phone: "Primary phone",
  field_primary_phone_code: "WhatsApp verification",
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
  field_phone_whatsapp_hint: "Send a WhatsApp verification link to connect this number to your DCX account.",
  field_phone_whatsapp_code_hint: "Open the secure link sent to WhatsApp to finish verification.",
  field_phone_send_code: "Send link",
  field_phone_resend_code: "Resend link",
  field_phone_verify_code: "Verify",
  field_phone_confirmed_badge: "Verified",
  field_email_confirmed_badge: "Verified",
  field_phone_pending_status: "Link sent",
  editable_status_idle: "Blue means editable. Click to adjust.",
  editable_status_editing: "Editing. Choose a value to autosave.",
  editable_status_saving: "Saving...",
  editable_status_saved: "Saved.",
  editable_status_retrying_template: "Retrying save ({attempt}/{total})...",
  editable_status_save_failed: "Save failed. Please click back in and retry.",
  editable_status_saving_default_language: "Saving default language...",
  editable_status_compact_idle: "Editable",
  editable_status_compact_changed_unsaved: "Changed, unsaved",
  editable_status_compact_saved: "Saved",
  editable_status_compact_save_failed: "Save failed",
  error_account_load_suggested_action: "Sign in again through the DCX app login flow, then retry.",
}

export function formatDcxAppAccountTimestampLabel(
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

export function DcxAppAccountFieldRow(props: { label: string; value: string; compact?: boolean }) {
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

export function readDcxAppEditableFieldBorderClass(visualState: DcxAppEditableFieldVisualState): string {
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

export function readDcxAppEditableFieldStatusTextClass(visualState: DcxAppEditableFieldVisualState): string {
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

export function readDcxAppEditableFieldCompactStatusLabel(
  visualState: DcxAppEditableFieldVisualState,
  uxStrings: Record<string, string>,
): string {
  if (visualState === "editing" || visualState === "saving") {
    return uxStrings.editable_status_compact_changed_unsaved
  }

  if (visualState === "saved") {
    return uxStrings.editable_status_compact_saved
  }

  if (visualState === "error") {
    return uxStrings.editable_status_compact_save_failed
  }

  return uxStrings.editable_status_compact_idle
}

export function DcxAppConfirmedTickBadge(props: { label: string }) {
  return (
    <span className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-emerald-700">
      <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-emerald-600 text-white">
        ✓
      </span>
      {props.label}
    </span>
  )
}
