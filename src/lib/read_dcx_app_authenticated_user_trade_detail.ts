export type DcxAppAuthenticatedUserTradeDetail = {
  trade_id: number
  source_message_id: number
  source_first_image_attachment: DcxAppTradeSourceImageAttachment | null
  trade_projection_status: string
  trade_confirmation_status: string
  trade_status: string
  raw_trade_side_text: string
  raw_material_text: string
  raw_quantity_text: string
  raw_price_text: string
  raw_origin_text: string
  raw_destination_text: string
  raw_shipping_method_text: string
  raw_incoterm_text: string
  raw_delivery_window_text: string
  raw_quality_text: string
  raw_payment_terms_text: string
  raw_counterparty_scope_text: string
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
  trade_summary_text: string
  trade_extraction_notes_text: string
  missing_required_fields_json: string[]
  trade_metadata_json: Record<string, unknown>
  visibility_status: string
  trade_publication_id: number | null
  public_reference_code: string | null
  publication_visibility_status: string | null
  publication_status: string | null
  requires_user_attention: boolean
  can_confirm: boolean
  can_reject: boolean
  created_at_ts_ms: number
  updated_at_ts_ms: number
  trade_versions: DcxAppAuthenticatedUserTradeVersion[]
}

export type DcxAppTradeSourceImageAttachment = {
  attachment_id: number
  file_object_id: number
  sort_order: number
  file_uuid: string | null
  file_kind: string
  content_type: string
  file_size_bytes: number | null
  original_filename: string
  attachment_url_path: string
}

export type DcxAppAuthenticatedUserTradeVersion = {
  version_id: number
  version_number: number
  is_live: boolean
  version_of_id: number | null
  version_source_type: string
  trade_confirmation_status: string
  trade_status: string
  normalized_trade_side: string
  normalized_material_name: string
  normalized_material_key: string
  normalized_quantity_value: number | null
  normalized_quantity_unit: string
  normalized_price_value: number | null
  normalized_currency_code: string
  normalized_total_price_value: number | null
  normalized_origin_location: string
  normalized_destination_location: string
  updated_at_ts_ms: number
}

type DcxAppTradeDetailSuccessResponse = {
  ok: true
  data: DcxAppAuthenticatedUserTradeDetail
}

type DcxAppTradeDetailErrorResponse = {
  ok: false
  error: {
    code: string
    message: string
    suggested_action: string
  }
}

export async function readDcxAppAuthenticatedUserTradeDetail(params: {
  apiBaseUrl: string
  tradeId: number
}): Promise<DcxAppTradeDetailSuccessResponse> {
  const response = await fetch(new URL(`/users/me/trades/${params.tradeId}`, params.apiBaseUrl).toString(), {
    method: "GET",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
  })

  const payload = (await response.json()) as
    | DcxAppTradeDetailSuccessResponse
    | DcxAppTradeDetailErrorResponse

  if (!response.ok || payload.ok !== true) {
    const errorPayload =
      payload && payload.ok === false
        ? payload.error
        : {
            code: "DCX_APP_TRADE_DETAIL_READ_FAILED",
            message: "We could not load that trade.",
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
