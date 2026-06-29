import type { DcxAppAuthenticatedUserMarketTopicDetail } from "./read_dcx_app_authenticated_user_market_topic_detail"

type DcxAppAiChatCreateSuccessResponse = {
  ok: true
  data: DcxAppAuthenticatedUserMarketTopicDetail
}

type DcxAppAiChatCreateErrorResponse = {
  ok: false
  error: {
    code: string
    message: string
    suggested_action: string
  }
}

export async function createDcxAppAuthenticatedUserAiChat(params: {
  apiBaseUrl: string
  chatText: string
  languageCode: string
}): Promise<DcxAppAiChatCreateSuccessResponse> {
  const response = await fetch(new URL("/ai/chats", params.apiBaseUrl).toString(), {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_text: params.chatText,
      language_code: params.languageCode,
    }),
  })

  const payload = (await response.json()) as
    | DcxAppAiChatCreateSuccessResponse
    | DcxAppAiChatCreateErrorResponse

  if (!response.ok || payload.ok !== true) {
    const errorPayload =
      payload && payload.ok === false
        ? payload.error
        : {
            code: "DCX_APP_AI_CHAT_CREATE_FAILED",
            message: "We could not start that AI chat.",
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
