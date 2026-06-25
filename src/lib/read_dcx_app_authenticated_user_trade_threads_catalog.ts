/**
 * CONTEXT:
 * Client API reader for the authenticated user's private Trade Chats catalog.
 */
export type DcxAppTradeThreadCatalogRow = {
  trade_thread_id: number
  thread_reference_code: string
  thread_status: string
  trade_id: number
  trade_publication_id: number | null
  owner_user_id: number
  counterparty_user_id: number
  created_at_ts_ms: number
  updated_at_ts_ms: number
  trade_summary_text: string | null
  normalized_trade_side: string | null
  normalized_material_name: string | null
  normalized_quantity_value: number | null
  normalized_quantity_unit: string | null
  normalized_price_value: number | null
  normalized_price_unit_basis: string | null
  normalized_currency_code: string | null
  normalized_origin_location: string | null
  normalized_destination_location: string | null
  owner_public_identity_label: string
  counterparty_public_identity_label: string
  other_participant_public_identity_label: string
  is_authenticated_user_owner: boolean
  message_count: number
  latest_message_text: string | null
  latest_message_created_at_ts_ms: number | null
}

type DcxAppTradeThreadsCatalogSuccessResponse = {
  ok: true
  data: {
    trade_threads: DcxAppTradeThreadCatalogRow[]
    total_trade_thread_count: number
  }
}

type DcxAppTradeThreadsCatalogErrorResponse = {
  ok: false
  error: { code: string; message: string; suggested_action: string }
}

export async function readDcxAppAuthenticatedUserTradeThreadsCatalog(params: {
  apiBaseUrl: string
}): Promise<DcxAppTradeThreadsCatalogSuccessResponse> {
  const response = await fetch(new URL("/trades/chats", params.apiBaseUrl).toString(), {
    method: "GET",
    credentials: "include",
  })
  const payload = (await response.json()) as
    | DcxAppTradeThreadsCatalogSuccessResponse
    | DcxAppTradeThreadsCatalogErrorResponse

  if (!response.ok || payload.ok !== true) {
    const errorPayload =
      payload && payload.ok === false
        ? payload.error
        : {
            code: "DCX_APP_TRADE_THREADS_READ_FAILED",
            message: "We could not load Trade Chats.",
            suggested_action: "Retry after confirming the backend is reachable.",
          }
    const error = new Error(errorPayload.message) as Error & { code?: string; suggested_action?: string }
    error.code = errorPayload.code
    error.suggested_action = errorPayload.suggested_action
    throw error
  }

  return payload
}
