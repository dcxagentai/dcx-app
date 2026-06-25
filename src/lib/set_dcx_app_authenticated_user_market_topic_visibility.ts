import type { DcxAppAuthenticatedUserMarketTopicDetail } from "./read_dcx_app_authenticated_user_market_topic_detail"

type DcxAppMarketTopicVisibilitySuccessResponse = {
  ok: true
  data: DcxAppAuthenticatedUserMarketTopicDetail
}

type DcxAppMarketTopicVisibilityErrorResponse = {
  ok: false
  error: {
    code: string
    message: string
    suggested_action: string
  }
}

export async function setDcxAppAuthenticatedUserMarketTopicVisibility(params: {
  apiBaseUrl: string
  marketTopicId: number
  visibilityStatus: "private" | "shareable" | "public"
}): Promise<DcxAppMarketTopicVisibilitySuccessResponse> {
  const response = await fetch(new URL(`/ai/chats/${params.marketTopicId}/visibility`, params.apiBaseUrl).toString(), {
    method: "PATCH",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ visibility_status: params.visibilityStatus }),
  })

  const payload = (await response.json()) as
    | DcxAppMarketTopicVisibilitySuccessResponse
    | DcxAppMarketTopicVisibilityErrorResponse

  if (!response.ok || payload.ok !== true) {
    const errorPayload =
      payload && payload.ok === false
        ? payload.error
        : {
            code: "DCX_APP_MARKET_TOPIC_VISIBILITY_FAILED",
            message: "We could not change that topic visibility.",
            suggested_action: "Retry after confirming the backend is reachable.",
          }

    const error = new Error(errorPayload.message) as Error & { code?: string; suggested_action?: string }
    error.code = errorPayload.code
    error.suggested_action = errorPayload.suggested_action
    throw error
  }

  return payload
}
