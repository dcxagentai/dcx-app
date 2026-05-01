export type DcxAppMarketForumCatalogRow = {
  forum_post_id: number
  source_market_topic_id: number
  owner_user_id: number
  public_reference_code: string
  visibility_status: string
  forum_post_status: string
  forum_title: string
  forum_body_text: string
  forum_tags_json: string[]
  updated_at_ts_ms: number
  owner_public_identity_label: string
  comment_count: number
  is_owned_by_authenticated_user: boolean
}

type DcxAppMarketForumCatalogSuccessResponse = {
  ok: true
  data: {
    forum_posts: DcxAppMarketForumCatalogRow[]
    total_forum_post_count: number
  }
}

type DcxAppMarketForumCatalogErrorResponse = {
  ok: false
  error: { code: string; message: string; suggested_action: string }
}

export async function readDcxAppMarketForumCatalog(params: {
  apiBaseUrl: string
}): Promise<DcxAppMarketForumCatalogSuccessResponse> {
  const response = await fetch(new URL("/users/me/market/forum", params.apiBaseUrl).toString(), {
    method: "GET",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
  })
  const payload = (await response.json()) as
    | DcxAppMarketForumCatalogSuccessResponse
    | DcxAppMarketForumCatalogErrorResponse

  if (!response.ok || payload.ok !== true) {
    const errorPayload =
      payload && payload.ok === false
        ? payload.error
        : {
            code: "DCX_APP_MARKET_FORUM_READ_FAILED",
            message: "We could not load Market forum.",
            suggested_action: "Retry after confirming the backend is reachable.",
          }
    const error = new Error(errorPayload.message) as Error & { code?: string; suggested_action?: string }
    error.code = errorPayload.code
    error.suggested_action = errorPayload.suggested_action
    throw error
  }

  return payload
}
