import type { DcxAppMarketTradeCatalogRow } from "./read_dcx_app_market_trades_catalog"

export type DcxAppMarketTradeDetail = DcxAppMarketTradeCatalogRow & {
  normalized_price_mode: string
  normalized_total_price_value: number | null
  normalized_shipping_method: string
  normalized_incoterm_code: string
  normalized_delivery_window_start_text: string
  normalized_delivery_window_end_text: string
  normalized_quality_summary_text: string
  normalized_payment_terms_summary_text: string
}

type DcxAppMarketTradeDetailSuccessResponse = {
  ok: true
  data: DcxAppMarketTradeDetail
}

type DcxAppMarketTradeDetailErrorResponse = {
  ok: false
  error: { code: string; message: string; suggested_action: string }
}

export async function readDcxAppMarketTradeDetail(params: {
  apiBaseUrl: string
  tradePublicationId: number
}): Promise<DcxAppMarketTradeDetailSuccessResponse> {
  const response = await fetch(new URL(`/users/me/market/trades/${params.tradePublicationId}`, params.apiBaseUrl).toString(), {
    method: "GET",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
  })
  const payload = (await response.json()) as
    | DcxAppMarketTradeDetailSuccessResponse
    | DcxAppMarketTradeDetailErrorResponse

  if (!response.ok || payload.ok !== true) {
    const errorPayload =
      payload && payload.ok === false
        ? payload.error
        : {
            code: "DCX_APP_MARKET_TRADE_READ_FAILED",
            message: "We could not load that Market deal.",
            suggested_action: "Retry after confirming the backend is reachable.",
          }
    const error = new Error(errorPayload.message) as Error & { code?: string; suggested_action?: string }
    error.code = errorPayload.code
    error.suggested_action = errorPayload.suggested_action
    throw error
  }

  return payload
}
