import type { DcxAppAuthenticatedUserTradeDetail } from "./read_dcx_app_authenticated_user_trade_detail"

type DcxAppTradeConfirmSuccessResponse = {
  ok: true
  data: DcxAppAuthenticatedUserTradeDetail
}

type DcxAppTradeConfirmErrorResponse = {
  ok: false
  error: {
    code: string
    message: string
    suggested_action: string
  }
}

export async function confirmDcxAppAuthenticatedUserTradeCandidate(params: {
  apiBaseUrl: string
  tradeId: number
}): Promise<DcxAppTradeConfirmSuccessResponse> {
  const response = await fetch(new URL(`/trades/objects/${params.tradeId}/confirm`, params.apiBaseUrl).toString(), {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
  })

  const payload = (await response.json()) as
    | DcxAppTradeConfirmSuccessResponse
    | DcxAppTradeConfirmErrorResponse

  if (!response.ok || payload.ok !== true) {
    const errorPayload =
      payload && payload.ok === false
        ? payload.error
        : {
            code: "DCX_APP_TRADE_CONFIRM_FAILED",
            message: "We could not confirm that trade.",
            suggested_action: "Retry after confirming the backend is reachable.",
          }

    const error = new Error(errorPayload.message) as Error & { code?: string; suggested_action?: string }
    error.code = errorPayload.code
    error.suggested_action = errorPayload.suggested_action
    throw error
  }

  return payload
}
