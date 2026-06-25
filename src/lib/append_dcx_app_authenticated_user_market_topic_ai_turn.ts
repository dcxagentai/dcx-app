import type { DcxAppAuthenticatedUserMarketTopicDetail } from "./read_dcx_app_authenticated_user_market_topic_detail"

type DcxAppMarketTopicAiTurnSuccessResponse = {
  ok: true
  data: DcxAppAuthenticatedUserMarketTopicDetail
}

type DcxAppMarketTopicAiTurnErrorResponse = {
  ok: false
  error: {
    code: string
    message: string
    suggested_action: string
  }
}

export async function appendDcxAppAuthenticatedUserMarketTopicAiTurn(params: {
  apiBaseUrl: string
  marketTopicId: number
  turnText: string
  languageCode: string
}): Promise<DcxAppMarketTopicAiTurnSuccessResponse> {
  const response = await fetch(new URL(`/ai/chats/${params.marketTopicId}/turns`, params.apiBaseUrl).toString(), {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      turn_text: params.turnText,
      language_code: params.languageCode,
    }),
  })

  const payload = (await response.json()) as
    | DcxAppMarketTopicAiTurnSuccessResponse
    | DcxAppMarketTopicAiTurnErrorResponse

  if (!response.ok || payload.ok !== true) {
    const errorPayload =
      payload && payload.ok === false
        ? payload.error
        : {
            code: "DCX_APP_MARKET_TOPIC_AI_TURN_APPEND_FAILED",
            message: "We could not continue that topic chat.",
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
