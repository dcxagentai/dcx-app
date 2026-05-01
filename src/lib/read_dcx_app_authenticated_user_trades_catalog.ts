export type DcxAppAuthenticatedUserTradeCatalogRow = {
  trade_id: number
  source_message_id: number
  trade_confirmation_status: string
  trade_status: string
  trade_summary_text: string
  normalized_trade_side: string
  normalized_material_name: string
  normalized_quantity_value: number | null
  normalized_quantity_unit: string
  normalized_price_mode: string
  normalized_price_value: number | null
  normalized_price_unit_basis: string
  normalized_currency_code: string
  normalized_total_price_value: number | null
  normalized_origin_location: string
  normalized_destination_location: string
  missing_required_fields_json: string[]
  trade_metadata_json: Record<string, unknown>
  visibility_status: string
  trade_publication_id: number | null
  public_reference_code: string | null
  publication_visibility_status: string | null
  publication_status: string | null
  requires_user_attention: boolean
  updated_at_ts_ms: number
  source_channel_type: string
  source_created_at_ts_ms: number
}

type DcxAppTradesCatalogSuccessResponse = {
  ok: true
  data: {
    trades: DcxAppAuthenticatedUserTradeCatalogRow[]
    total_trade_count: number
  }
}

type DcxAppTradesCatalogErrorResponse = {
  ok: false
  error: {
    code: string
    message: string
    suggested_action: string
  }
}

export async function readDcxAppAuthenticatedUserTradesCatalog(params: {
  apiBaseUrl: string
}): Promise<DcxAppTradesCatalogSuccessResponse> {
  const response = await fetch(new URL("/users/me/trades", params.apiBaseUrl).toString(), {
    method: "GET",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
  })

  const payload = (await response.json()) as
    | DcxAppTradesCatalogSuccessResponse
    | DcxAppTradesCatalogErrorResponse

  if (!response.ok || payload.ok !== true) {
    const errorPayload =
      payload && payload.ok === false
        ? payload.error
        : {
            code: "DCX_APP_TRADES_CATALOG_READ_FAILED",
            message: "We could not load the Trades view.",
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
