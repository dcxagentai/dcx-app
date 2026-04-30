export type DcxAppAuthenticatedUserMarketTopicDetail = {
  market_topic_id: number
  source_message_id: number
  topic_status: string
  topic_title: string
  topic_summary_text: string
  topic_scope_text: string
  topic_tags_json: string[]
  topic_metadata_json: Record<string, unknown>
  created_at_ts_ms: number
  updated_at_ts_ms: number
  turns: Array<{
    market_topic_turn_id: number
    turn_role: string
    source_message_id: number | null
    turn_text: string
    turn_metadata_json: Record<string, unknown>
    created_at_ts_ms: number
  }>
}

type DcxAppMarketTopicDetailSuccessResponse = {
  ok: true
  data: DcxAppAuthenticatedUserMarketTopicDetail
}

type DcxAppMarketTopicDetailErrorResponse = {
  ok: false
  error: {
    code: string
    message: string
    suggested_action: string
  }
}

export async function readDcxAppAuthenticatedUserMarketTopicDetail(params: {
  apiBaseUrl: string
  marketTopicId: number
}): Promise<DcxAppMarketTopicDetailSuccessResponse> {
  const response = await fetch(new URL(`/users/me/market-topics/${params.marketTopicId}`, params.apiBaseUrl).toString(), {
    method: "GET",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
  })

  const payload = (await response.json()) as
    | DcxAppMarketTopicDetailSuccessResponse
    | DcxAppMarketTopicDetailErrorResponse

  if (!response.ok || payload.ok !== true) {
    const errorPayload =
      payload && payload.ok === false
        ? payload.error
        : {
            code: "DCX_APP_MARKET_TOPIC_DETAIL_READ_FAILED",
            message: "We could not load that topic.",
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
