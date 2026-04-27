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
  page_title_messages: "Messages",
  page_title_send: "Send",
  nav_group_workspace: "Workspace",
  nav_messages: "Messages",
  nav_send: "Send",
  nav_messages_text: "Text",
  nav_messages_images: "Images",
  nav_messages_audio: "Audio",
  nav_messages_documents: "Documents",
  nav_trades: "Trades",
  nav_trades_market_watch: "Market Watch",
  nav_trades_my_trades: "My Trades",
  nav_contacts: "Contacts",
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
  messages_eyebrow: "Messages",
  messages_title: "Messages",
  messages_subtitle: "App, WhatsApp, and email messages in one inbox.",
  messages_filter_all: "All formats",
  messages_filter_text: "Text",
  messages_filter_image: "Images",
  messages_filter_audio: "Audio",
  messages_filter_document: "Documents",
  messages_empty: "No messages yet for this filter.",
  messages_loading: "Loading messages...",
  messages_error_title: "We could not load the Messages inbox.",
  messages_error_suggested_action: "Retry after confirming the backend and your session are still healthy.",
  messages_search_placeholder: "Search messages...",
  messages_identity_filter_all: "All identities",
  messages_language_filter_all: "All languages",
  messages_channel_filter_label: "Channel",
  messages_channel_filter_all: "All channels",
  messages_channel_filter_app: "Web app",
  messages_channel_filter_whatsapp: "WhatsApp",
  messages_channel_filter_email: "Email",
  messages_toggle_show: "Show",
  messages_toggle_hide: "Hide",
  messages_download_label: "Download",
  messages_format_label_text: "text",
  messages_format_label_image: "image",
  messages_format_label_audio: "audio",
  messages_format_label_document: "doc",
  messages_format_label_mixed: "mixed",
  messages_compose_label: "New message",
  messages_compose_placeholder: "Send a message, photo, voice note, or document to DCX.",
  messages_compose_files_label: "Attach files",
  messages_compose_files_selected: "Selected files",
  messages_compose_submit_idle: "Send message",
  messages_compose_submit_pending: "Sending...",
  messages_compose_help: "This first multimedia pass accepts files up to 10 MB each across image, audio, PDF, DOCX, and PPTX formats.",
  messages_compose_files_count_singular: "file",
  messages_compose_files_count_plural: "files",
  messages_compose_progress_preparing_title: "Preparing message...",
  messages_compose_progress_preparing_body_with_files: "We are packaging your note and {count} selected {file_word} for secure upload.",
  messages_compose_progress_preparing_body_no_files: "We are preparing your message for delivery.",
  messages_compose_progress_uploading_title: "Uploading files...",
  messages_compose_progress_uploading_body_with_files: "Your selected {file_word_phrase} being uploaded. Larger media can take a little longer.",
  messages_compose_progress_uploading_body_no_files: "Your message is on its way.",
  messages_compose_progress_processing_title: "Processing message...",
  messages_compose_progress_processing_body: "DCX is storing the message and preparing the first analysis pass.",
  messages_compose_progress_success_title: "Message sent.",
  messages_compose_progress_success_body: "Your message is now in the inbox and ready for review in Messages.",
  messages_compose_progress_error_title: "We could not send that message.",
  messages_compose_progress_error_body: "Please review the details below and retry when you are ready.",
  messages_compose_error_retry_suggested_action: "Retry after confirming the connection and selected files.",
  messages_compose_attachment_status_ready: "Ready to send",
  messages_compose_attachment_status_queued: "Queued",
  messages_compose_attachment_status_uploading: "Uploading",
  messages_compose_attachment_status_attached: "Attached",
  messages_compose_attachment_status_sent: "Sent",
  messages_compose_attachment_status_retry_needed: "Retry needed",
  messages_table_column_channel: "Channel",
  messages_table_column_format: "Format",
  messages_table_column_status: "Status",
  messages_table_column_language: "Language",
  messages_table_column_received: "Received",
  messages_table_column_summary: "Message",
  messages_detail_title: "Selected message",
  messages_detail_empty: "Choose a message row to see the raw text and the first derivation pass.",
  messages_detail_raw_text: "Raw text",
  messages_detail_derived_text: "Synthesis",
  messages_detail_summary: "Summary",
  messages_detail_description: "Description",
  messages_detail_context: "Context",
  messages_detail_transcription: "Transcription",
  messages_detail_language: "Detected language",
  messages_detail_processing_status: "Processing status",
  messages_detail_derivation_status: "Derivation status",
  messages_detail_attachments: "Attachments",
  messages_detail_attachments_empty: "No files are attached to this message.",
  messages_status_received: "Received",
  messages_status_queued: "Queued",
  messages_status_processing: "Processing",
  messages_status_ready: "Ready",
  messages_status_failed: "Failed",
  messages_status_analysing: "Analysing",
  messages_derivation_not_required: "Not required",
  messages_derivation_pending: "Pending",
  messages_derivation_completed: "Completed",
  messages_derivation_failed: "Failed",
  messages_title_fallback_message: "Message",
  messages_title_fallback_image: "Image",
  messages_title_fallback_audio: "Audio message",
  messages_title_fallback_document: "Document",
  messages_title_fallback_attachment: "Attachment",
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
