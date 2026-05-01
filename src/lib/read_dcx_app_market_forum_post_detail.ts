import type { DcxAppMarketForumCatalogRow } from "./read_dcx_app_market_forum_catalog"

export type DcxAppMarketForumComment = {
  forum_comment_id: number
  author_user_id: number
  comment_text: string
  language_code: string
  comment_summary_text: string
  created_at_ts_ms: number
  updated_at_ts_ms: number
  author_public_identity_label: string
  is_owned_by_authenticated_user: boolean
}

export type DcxAppMarketForumPostDetail = DcxAppMarketForumCatalogRow & {
  created_at_ts_ms: number
  comments: DcxAppMarketForumComment[]
}

type DcxAppMarketForumPostDetailSuccessResponse = {
  ok: true
  data: DcxAppMarketForumPostDetail
}

type DcxAppMarketForumPostDetailErrorResponse = {
  ok: false
  error: { code: string; message: string; suggested_action: string }
}

export async function readDcxAppMarketForumPostDetail(params: {
  apiBaseUrl: string
  forumPostId: number
}): Promise<DcxAppMarketForumPostDetailSuccessResponse> {
  const response = await fetch(new URL(`/users/me/market/forum/${params.forumPostId}`, params.apiBaseUrl).toString(), {
    method: "GET",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
  })
  const payload = (await response.json()) as
    | DcxAppMarketForumPostDetailSuccessResponse
    | DcxAppMarketForumPostDetailErrorResponse

  if (!response.ok || payload.ok !== true) {
    const errorPayload =
      payload && payload.ok === false
        ? payload.error
        : {
            code: "DCX_APP_MARKET_FORUM_POST_READ_FAILED",
            message: "We could not load that forum post.",
            suggested_action: "Retry after confirming the backend is reachable.",
          }
    const error = new Error(errorPayload.message) as Error & { code?: string; suggested_action?: string }
    error.code = errorPayload.code
    error.suggested_action = errorPayload.suggested_action
    throw error
  }

  return payload
}
