import type { DcxAppAuthenticatedUserTradeDetail } from "./read_dcx_app_authenticated_user_trade_detail"

type DcxAppTradeRejectSuccessResponse = {
  ok: true
  data: DcxAppAuthenticatedUserTradeDetail
}

type DcxAppTradeRejectErrorResponse = {
  ok: false
  error: {
    code: string
    message: string
    suggested_action: string
  }
}

export async function rejectDcxAppAuthenticatedUserTradeCandidate(params: {
  apiBaseUrl: string
  tradeId: number
  rejectionReasonText?: string
}): Promise<DcxAppTradeRejectSuccessResponse> {
  const response = await fetch(new URL(`/users/me/trades/${params.tradeId}/reject`, params.apiBaseUrl).toString(), {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      rejection_reason_text: params.rejectionReasonText ?? "",
    }),
  })

  const payload = (await response.json()) as
    | DcxAppTradeRejectSuccessResponse
    | DcxAppTradeRejectErrorResponse

  if (!response.ok || payload.ok !== true) {
    const errorPayload =
      payload && payload.ok === false
        ? payload.error
        : {
            code: "DCX_APP_TRADE_REJECT_FAILED",
            message: "We could not reject that trade.",
            suggested_action: "Retry after confirming the backend is reachable.",
          }

    const error = new Error(errorPayload.message) as Error & { code?: string; suggested_action?: string }
    error.code = errorPayload.code
    error.suggested_action = errorPayload.suggested_action
    throw error
  }

  return payload
}
