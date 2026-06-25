import type { DcxAppAuthenticatedUserTradeDetail } from "./read_dcx_app_authenticated_user_trade_detail"

type DcxAppTradeVisibilitySuccessResponse = {
  ok: true
  data: DcxAppAuthenticatedUserTradeDetail
}

type DcxAppTradeVisibilityErrorResponse = {
  ok: false
  error: {
    code: string
    message: string
    suggested_action: string
  }
}

export async function setDcxAppAuthenticatedUserTradeVisibility(params: {
  apiBaseUrl: string
  tradeId: number
  visibilityStatus: "private" | "shareable" | "public"
}): Promise<DcxAppTradeVisibilitySuccessResponse> {
  const response = await fetch(new URL(`/trades/objects/${params.tradeId}/visibility`, params.apiBaseUrl).toString(), {
    method: "PATCH",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ visibility_status: params.visibilityStatus }),
  })

  const payload = (await response.json()) as
    | DcxAppTradeVisibilitySuccessResponse
    | DcxAppTradeVisibilityErrorResponse

  if (!response.ok || payload.ok !== true) {
    const errorPayload =
      payload && payload.ok === false
        ? payload.error
        : {
            code: "DCX_APP_TRADE_VISIBILITY_FAILED",
            message: "We could not change that trade visibility.",
            suggested_action: "Retry after confirming the backend is reachable.",
          }

    const error = new Error(errorPayload.message) as Error & { code?: string; suggested_action?: string }
    error.code = errorPayload.code
    error.suggested_action = errorPayload.suggested_action
    throw error
  }

  return payload
}
