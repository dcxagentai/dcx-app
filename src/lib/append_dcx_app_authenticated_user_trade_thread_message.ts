/**
 * CONTEXT:
 * Client API writer for app-surface replies in a private trader-to-trader trade conversation.
 */
import type { DcxAppTradeThreadDetail } from "./read_dcx_app_authenticated_user_trade_thread_detail"

type DcxAppTradeThreadMessageAppendSuccessResponse = {
  ok: true
  data: DcxAppTradeThreadDetail
}

type DcxAppTradeThreadMessageAppendErrorResponse = {
  ok: false
  error: { code: string; message: string; suggested_action: string }
}

export async function appendDcxAppAuthenticatedUserTradeThreadMessage(params: {
  apiBaseUrl: string
  tradeThreadId: number
  messageText: string
  languageCode: string
}): Promise<DcxAppTradeThreadMessageAppendSuccessResponse> {
  const response = await fetch(new URL(`/trades/chats/${params.tradeThreadId}/messages`, params.apiBaseUrl).toString(), {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      message_text: params.messageText,
      language_code: params.languageCode,
    }),
  })
  const payload = (await response.json()) as
    | DcxAppTradeThreadMessageAppendSuccessResponse
    | DcxAppTradeThreadMessageAppendErrorResponse

  if (!response.ok || payload.ok !== true) {
    const errorPayload =
      payload && payload.ok === false
        ? payload.error
        : {
            code: "DCX_APP_TRADE_THREAD_MESSAGE_APPEND_FAILED",
            message: "We could not send that trade chat message.",
            suggested_action: "Refresh the conversation before retrying.",
          }
    const error = new Error(errorPayload.message) as Error & { code?: string; suggested_action?: string }
    error.code = errorPayload.code
    error.suggested_action = errorPayload.suggested_action
    throw error
  }

  return payload
}
