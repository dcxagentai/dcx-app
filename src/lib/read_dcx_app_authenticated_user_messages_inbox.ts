/**
 * CONTEXT:
 * This file reads the authenticated DCX app Messages inbox payload.
 * It exists so the first `/me/messages` surface can stay thin while TanStack Query owns
 * the fetch lifecycle for inbox rows and simple format filtering.
 *
 * CONTRACT:
 * preconditions: The app knows the API base URL and the browser carries one authenticated DCX session cookie.
 * postconditions: Returns the canonical backend Messages inbox wrapper on success.
 * side_effects: None.
 * idempotent: Yes.
 * retry_safe: Yes.
 * blocking_behavior: Async fetch over HTTP.
 *
 * NARRATIVE:
 * WHY this exists: The Messages page should read one stable backend contract instead of embedding fetch details in the component.
 * WHEN TO USE it: Use it from TanStack Query on the authenticated Messages surface.
 * WHEN NOT TO USE it: Do not use it for admin inspection or provider event debugging.
 * WHAT CAN GO WRONG: The session can be missing, the filter can be invalid, or the network can fail.
 * WHAT COMES NEXT: Later inbox reads can add pagination, attachment previews, and richer filters without changing the page structure.
 *
 * TESTS:
 * No frontend test harness exists in dcx_app yet.
 *
 * ERRORS:
 * - DCX_APP_MESSAGES_INBOX_READ_FAILED: The backend returned a non-success wrapper or the fetch failed.
 *   suggested_action: Confirm the API is reachable and the browser still has a valid DCX session.
 *   common_causes: Missing session cookie, expired session, backend unavailable.
 *   recovery_steps: Sign in again, then retry after backend health is restored.
 *   retry_safe: Yes.
 *
 * CODE:
 */
export type DcxAppAuthenticatedUserMessage = {
  message_id: number
  channel_type: string
  provider_type: string
  message_direction: string
  message_format: string
  message_subject: string
  raw_text_content: string
  derived_text_content: string
  analysis_summary_text: string
  processing_status: string
  derivation_status: string
  analysis_status: string
  detected_language_code: string | null
  received_at_ts_ms: number | null
  created_at_ts_ms: number
  contact_method: {
    id: number
    contact_type: string
    contact_value: string
    normalized_value: string
    display_label: string
  } | null
  source_handle_normalized: string | null
  target_handle_normalized: string | null
  attachment_summaries: Array<{
    attachment_id: number
    file_kind: string
    original_filename: string
    analysis_summary_text: string
  }>
}

type DcxAppMessagesInboxSuccessResponse = {
  ok: true
  data: {
    messages: DcxAppAuthenticatedUserMessage[]
    selected_filter: string
    total_message_count: number
  }
  context?: {
    surface?: string
    view?: string
    identity_resolution_mode?: string
  }
}

type DcxAppMessagesInboxErrorResponse = {
  ok: false
  error: {
    code: string
    message: string
    suggested_action: string
  }
}

export async function readDcxAppAuthenticatedUserMessagesInbox(params: {
  apiBaseUrl: string
  messageFormatFilter?: "all" | "text" | "image" | "audio" | "document"
}): Promise<DcxAppMessagesInboxSuccessResponse> {
  const inboxUrl = new URL("/users/me/messages", params.apiBaseUrl)
  if (params.messageFormatFilter && params.messageFormatFilter !== "all") {
    inboxUrl.searchParams.set("message_format_filter", params.messageFormatFilter)
  }

  const response = await fetch(inboxUrl.toString(), {
    method: "GET",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
    },
  })

  const payload = (await response.json()) as
    | DcxAppMessagesInboxSuccessResponse
    | DcxAppMessagesInboxErrorResponse

  if (!response.ok || payload.ok !== true) {
    const errorPayload =
      payload && payload.ok === false
        ? payload.error
        : {
            code: "DCX_APP_MESSAGES_INBOX_READ_FAILED",
            message: "We could not load the DCX Messages inbox.",
            suggested_action: "Retry after confirming the backend is reachable.",
          }

    const error = new Error(errorPayload.message) as Error & {
      code?: string
      suggested_action?: string
    }
    error.code = errorPayload.code
    error.suggested_action = errorPayload.suggested_action
    throw error
  }

  return payload
}
