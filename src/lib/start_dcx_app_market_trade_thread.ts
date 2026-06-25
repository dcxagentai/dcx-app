type DcxAppMarketTradeThreadStartSuccessResponse = {
  ok: true
  data: {
    trade_thread_id: number
    thread_reference_code: string
    thread_status: string
    trade_id: number
    trade_publication_id: number
    owner_user_id: number
    counterparty_user_id: number
  }
}

type DcxAppMarketTradeThreadStartErrorResponse = {
  ok: false
  error: { code: string; message: string; suggested_action: string }
}

export async function startDcxAppMarketTradeThread(params: {
  apiBaseUrl: string
  tradePublicationId: number
}): Promise<DcxAppMarketTradeThreadStartSuccessResponse> {
  const response = await fetch(new URL(`/trades/board/${params.tradePublicationId}/chats`, params.apiBaseUrl).toString(), {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
  })
  const payload = (await response.json()) as
    | DcxAppMarketTradeThreadStartSuccessResponse
    | DcxAppMarketTradeThreadStartErrorResponse

  if (!response.ok || payload.ok !== true) {
    const errorPayload =
      payload && payload.ok === false
        ? payload.error
        : {
            code: "DCX_APP_MARKET_TRADE_THREAD_START_FAILED",
            message: "We could not start that Trade Chat.",
            suggested_action: "Retry after confirming the backend is reachable.",
          }
    const error = new Error(errorPayload.message) as Error & { code?: string; suggested_action?: string }
    error.code = errorPayload.code
    error.suggested_action = errorPayload.suggested_action
    throw error
  }

  return payload
}
