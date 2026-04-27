/**
 * CONTEXT:
 * This file reads one authenticated DCX app message detail payload.
 * It exists so the Messages surface can load attachment metadata and richer message detail without
 * bloating the inbox payload itself.
 *
 * CONTRACT:
 * preconditions: The app knows the API base URL, the browser carries one authenticated DCX session cookie, and the selected message id is valid.
 * postconditions: Returns the canonical backend message-detail wrapper on success.
 * side_effects: None.
 * idempotent: Yes.
 * retry_safe: Yes.
 * blocking_behavior: Async fetch over HTTP.
 *
 * NARRATIVE:
 * WHY this exists: The right-hand Messages detail pane now needs attachment metadata and private attachment URLs.
 * WHEN TO USE it: Use it when one message row is selected on the authenticated Messages surface.
 * WHEN NOT TO USE it: Do not use it for the inbox list or admin cross-user inspection.
 * WHAT CAN GO WRONG: The selected message can disappear, the session can be missing, or the network can fail.
 * WHAT COMES NEXT: Later detail reads can add classification, linked trades, linked questions, and richer attachment analysis.
 *
 * TESTS:
 * No frontend test harness exists in dcx_app yet.
 *
 * ERRORS:
 * - DCX_APP_MESSAGE_DETAIL_READ_FAILED: The backend returned a non-success wrapper or the fetch failed.
 *   suggested_action: Confirm the API is reachable, the session is valid, and the selected message still exists.
 *   common_causes: Missing session cookie, expired session, stale selected message id, backend unavailable.
 *   recovery_steps: Refresh the inbox, sign in again if needed, and retry after backend health is restored.
 *   retry_safe: Yes.
 *
 * CODE:
 */
export type DcxAppAuthenticatedUserMessageAttachment = {
  attachment_id: number
  file_object_id: number
  file_uuid: string | null
  attachment_role: string
  provider_media_id: string | null
  sort_order: number
  file_kind: string
  content_type: string
  file_size_bytes: number | null
  original_filename: string
  analysis_status: string
  analysis_summary_text: string
  analysis_description_text: string
  analysis_transcription_text: string
  analysis_synthesis_text: string
  context_within_message: string
  analysis_model_name: string
  analysis_metadata_json: Record<string, unknown>
  analysis_completed_at_ts_ms: number | null
  detected_language_code: string | null
  attachment_url_path: string
}

export type DcxAppAuthenticatedUserMessageDetail = {
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
  analysis_model_name: string
  analysis_metadata_json: Record<string, unknown>
  analysis_completed_at_ts_ms: number | null
  detected_language_code: string | null
  received_at_ts_ms: number | null
  created_at_ts_ms: number
  updated_at_ts_ms: number
  attachments: DcxAppAuthenticatedUserMessageAttachment[]
}

type DcxAppMessageDetailSuccessResponse = {
  ok: true
  data: DcxAppAuthenticatedUserMessageDetail
  context?: {
    surface?: string
    view?: string
    identity_resolution_mode?: string
  }
}

type DcxAppMessageDetailErrorResponse = {
  ok: false
  error: {
    code: string
    message: string
    suggested_action: string
  }
}

export async function readDcxAppAuthenticatedUserMessageDetail(params: {
  apiBaseUrl: string
  messageId: number
}): Promise<DcxAppMessageDetailSuccessResponse> {
  const detailUrl = new URL(`/users/me/messages/${params.messageId}`, params.apiBaseUrl)

  const response = await fetch(detailUrl.toString(), {
    method: "GET",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
    },
  })

  const payload = (await response.json()) as
    | DcxAppMessageDetailSuccessResponse
    | DcxAppMessageDetailErrorResponse

  if (!response.ok || payload.ok !== true) {
    const errorPayload =
      payload && payload.ok === false
        ? payload.error
        : {
            code: "DCX_APP_MESSAGE_DETAIL_READ_FAILED",
            message: "We could not load that message.",
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
