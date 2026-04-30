export type DcxAppAuthenticatedUserMarketTopicCatalogRow = {
  market_topic_id: number
  source_message_id: number
  topic_status: string
  topic_title: string
  topic_summary_text: string
  topic_scope_text: string
  topic_tags_json: string[]
  updated_at_ts_ms: number
  source_channel_type: string
  source_created_at_ts_ms: number
}

type DcxAppMarketTopicsCatalogSuccessResponse = {
  ok: true
  data: {
    market_topics: DcxAppAuthenticatedUserMarketTopicCatalogRow[]
    total_market_topic_count: number
  }
}

type DcxAppMarketTopicsCatalogErrorResponse = {
  ok: false
  error: {
    code: string
    message: string
    suggested_action: string
  }
}

export async function readDcxAppAuthenticatedUserMarketTopicsCatalog(params: {
  apiBaseUrl: string
}): Promise<DcxAppMarketTopicsCatalogSuccessResponse> {
  const response = await fetch(new URL("/users/me/market-topics", params.apiBaseUrl).toString(), {
    method: "GET",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
  })

  const payload = (await response.json()) as
    | DcxAppMarketTopicsCatalogSuccessResponse
    | DcxAppMarketTopicsCatalogErrorResponse

  if (!response.ok || payload.ok !== true) {
    const errorPayload =
      payload && payload.ok === false
        ? payload.error
        : {
            code: "DCX_APP_MARKET_TOPICS_CATALOG_READ_FAILED",
            message: "We could not load the Topics view.",
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
