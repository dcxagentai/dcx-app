import type { DcxAppAuthenticatedUserTradeDetail } from "./read_dcx_app_authenticated_user_trade_detail"

export type DcxAppTradeCandidatePatchPayload = Partial<{
  normalized_trade_side: string
  normalized_material_name: string
  normalized_material_key: string
  normalized_quantity_value: number | null
  normalized_quantity_unit: string
  normalized_price_mode: string
  normalized_price_value: number | null
  normalized_price_unit_basis: string
  normalized_currency_code: string
  normalized_total_price_value: number | null
  normalized_origin_location: string
  normalized_destination_location: string
  normalized_shipping_method: string
  normalized_incoterm_code: string
  normalized_delivery_window_start_text: string
  normalized_delivery_window_end_text: string
  normalized_quality_summary_text: string
  normalized_payment_terms_summary_text: string
  trade_confirmation_status: string
  trade_status: string
}>

type DcxAppTradeUpdateSuccessResponse = {
  ok: true
  data: DcxAppAuthenticatedUserTradeDetail
}

type DcxAppTradeUpdateErrorResponse = {
  ok: false
  error: {
    code: string
    message: string
    suggested_action: string
  }
}

export async function updateDcxAppAuthenticatedUserTradeCandidate(params: {
  apiBaseUrl: string
  tradeId: number
  patchPayload: DcxAppTradeCandidatePatchPayload
}): Promise<DcxAppTradeUpdateSuccessResponse> {
  const response = await fetch(new URL(`/users/me/trades/${params.tradeId}`, params.apiBaseUrl).toString(), {
    method: "PATCH",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params.patchPayload),
  })

  const payload = (await response.json()) as
    | DcxAppTradeUpdateSuccessResponse
    | DcxAppTradeUpdateErrorResponse

  if (!response.ok || payload.ok !== true) {
    const errorPayload =
      payload && payload.ok === false
        ? payload.error
        : {
            code: "DCX_APP_TRADE_UPDATE_FAILED",
            message: "We could not update that trade.",
            suggested_action: "Retry after confirming the backend is reachable.",
          }

    const error = new Error(errorPayload.message) as Error & { code?: string; suggested_action?: string }
    error.code = errorPayload.code
    error.suggested_action = errorPayload.suggested_action
    throw error
  }

  return payload
}
