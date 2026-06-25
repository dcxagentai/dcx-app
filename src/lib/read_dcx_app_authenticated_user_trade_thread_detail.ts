/**
 * CONTEXT:
 * Client API reader for a single participant-protected private trade conversation.
 */
import type { DcxAppTradeThreadCatalogRow } from "./read_dcx_app_authenticated_user_trade_threads_catalog"

export type DcxAppTradeThreadMessage = {
  trade_thread_message_id: number
  thread_id: number
  sender_user_id: number
  sender_public_identity_label: string
  is_sent_by_authenticated_user: boolean
  source_channel_type: string
  raw_message_text: string
  canonical_message_text: string
  display_message_text: string
  message_summary_text: string
  language_code: string
  displayed_translation_language_code: string | null
  translated_from_language_code: string | null
  translations_json: Record<string, unknown>
  created_at_ts_ms: number
  updated_at_ts_ms: number
}

export type DcxAppTradeThreadDetail = DcxAppTradeThreadCatalogRow & {
  source_message_id: number
  source_first_image_attachment: DcxAppTradeThreadSourceImageAttachment | null
  messages: DcxAppTradeThreadMessage[]
}

export type DcxAppTradeThreadSourceImageAttachment = {
  attachment_id: number
  file_object_id: number
  sort_order: number
  file_uuid: string | null
  file_kind: string
  content_type: string
  file_size_bytes: number | null
  original_filename: string
  attachment_url_path: string
}

type DcxAppTradeThreadDetailSuccessResponse = {
  ok: true
  data: DcxAppTradeThreadDetail
}

type DcxAppTradeThreadDetailErrorResponse = {
  ok: false
  error: { code: string; message: string; suggested_action: string }
}

export async function readDcxAppAuthenticatedUserTradeThreadDetail(params: {
  apiBaseUrl: string
  tradeThreadId: number
}): Promise<DcxAppTradeThreadDetailSuccessResponse> {
  const response = await fetch(new URL(`/trades/chats/${params.tradeThreadId}`, params.apiBaseUrl).toString(), {
    method: "GET",
    credentials: "include",
  })
  const payload = (await response.json()) as
    | DcxAppTradeThreadDetailSuccessResponse
    | DcxAppTradeThreadDetailErrorResponse

  if (!response.ok || payload.ok !== true) {
    const errorPayload =
      payload && payload.ok === false
        ? payload.error
        : {
            code: "DCX_APP_TRADE_THREAD_READ_FAILED",
            message: "We could not load that Trade Chat.",
            suggested_action: "Retry after confirming the backend is reachable.",
          }
    const error = new Error(errorPayload.message) as Error & { code?: string; suggested_action?: string }
    error.code = errorPayload.code
    error.suggested_action = errorPayload.suggested_action
    throw error
  }

  return payload
}
