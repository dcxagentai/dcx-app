import type { DcxAppMarketForumPostDetail } from "./read_dcx_app_market_forum_post_detail"

type DcxAppMarketForumCommentSuccessResponse = {
  ok: true
  data: DcxAppMarketForumPostDetail
}

type DcxAppMarketForumCommentErrorResponse = {
  ok: false
  error: { code: string; message: string; suggested_action: string }
}

export async function appendDcxAppMarketForumComment(params: {
  apiBaseUrl: string
  forumPostId: number
  commentText: string
  languageCode?: string
}): Promise<DcxAppMarketForumCommentSuccessResponse> {
  const response = await fetch(new URL(`/users/me/market/forum/${params.forumPostId}/comments`, params.apiBaseUrl).toString(), {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      comment_text: params.commentText,
      language_code: params.languageCode ?? "en",
    }),
  })
  const payload = (await response.json()) as
    | DcxAppMarketForumCommentSuccessResponse
    | DcxAppMarketForumCommentErrorResponse

  if (!response.ok || payload.ok !== true) {
    const errorPayload =
      payload && payload.ok === false
        ? payload.error
        : {
            code: "DCX_APP_MARKET_FORUM_COMMENT_FAILED",
            message: "We could not save that forum comment.",
            suggested_action: "Retry after confirming the backend is reachable.",
          }
    const error = new Error(errorPayload.message) as Error & { code?: string; suggested_action?: string }
    error.code = errorPayload.code
    error.suggested_action = errorPayload.suggested_action
    throw error
  }

  return payload
}
