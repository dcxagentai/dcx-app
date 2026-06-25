/**
 * CONTEXT:
 * Shared frontend API helpers for the first DCX Network slice.
 * These functions keep profile/feed/follow/DM fetch details out of page components.
 */

export type DcxAppNetworkAuthor = {
  user_id: number
  public_display_name: string
  public_handle: string
  public_identity_mode: string
  public_identity_label: string
  profile_image_url: string
}

export type DcxAppNetworkLanguageBadge = {
  id: number
  language_code: string
  language_name_en: string
  language_name_native: string
  is_rtl: boolean
}

export type DcxAppNetworkTimezoneBadge = {
  id: number
  iana_name: string
  display_label: string
  region_label: string
  country_code_alpha2?: string | null
  country_display_name?: string | null
  flag_asset_key?: string | null
}

export type DcxAppNetworkCountryBadge = {
  id: number
  country_code_alpha2: string
  default_display_name: string
  flag_asset_key: string
}

export type DcxAppNetworkCommodityBadge = {
  material_key: string
  display_label: string
  sort_order: number
}

export type DcxAppNetworkFeedReply = {
  feed_reply_id: number
  feed_post_id: number
  author: DcxAppNetworkAuthor
  reply_text: string
  language_code: string
  translations_json: Record<string, unknown>
  created_at_ts_ms: number
  is_owned_by_authenticated_user: boolean
}

export type DcxAppNetworkFeedPost = {
  feed_post_id: number
  author: DcxAppNetworkAuthor
  post_text: string
  language_code: string
  translations_json: Record<string, unknown>
  created_at_ts_ms: number
  updated_at_ts_ms: number
  reply_count: number
  viewer_follows_author: boolean
  is_owned_by_authenticated_user: boolean
  replies: DcxAppNetworkFeedReply[]
}

export type DcxAppNetworkFeedScope = "following" | "all"

export type DcxAppNetworkProfile = {
  user_id: number
  public_display_name: string
  public_handle: string
  public_identity_mode: string
  public_identity_label: string
  profile_image_url: string
  dm_acceptance_mode: string
  created_at_ts_ms: number
  follower_count: number
  following_count: number
  is_followed_by_authenticated_user: boolean
  is_following_authenticated_user: boolean
  is_self: boolean
  can_dm: boolean
  languages: DcxAppNetworkLanguageBadge[]
  timezones: DcxAppNetworkTimezoneBadge[]
  countries: DcxAppNetworkCountryBadge[]
  commodities: DcxAppNetworkCommodityBadge[]
  recent_posts: DcxAppNetworkFeedPost[]
}

export type DcxAppNetworkDmMessage = {
  dm_message_id: number
  sender_user_id: number
  message_text: string
  raw_message_text: string
  canonical_message_text?: string
  language_code: string
  translations_json?: Record<string, unknown>
  created_at_ts_ms: number
  is_owned_by_authenticated_user: boolean
}

export type DcxAppNetworkDmThreadCatalogRow = {
  dm_thread_id: number
  thread_status: string
  updated_at_ts_ms: number
  other_participant: DcxAppNetworkAuthor
  latest_message: DcxAppNetworkDmMessage | null
}

export type DcxAppNetworkDmThreadDetail = {
  dm_thread_id: number
  thread_status: string
  created_at_ts_ms: number
  updated_at_ts_ms: number
  other_participant: DcxAppNetworkAuthor
  messages: DcxAppNetworkDmMessage[]
}

type DcxNetworkSuccessResponse<TData> = {
  ok: true
  data: TData
}

type DcxNetworkErrorResponse = {
  ok: false
  error: { code: string; message: string; suggested_action: string }
}

export async function readDcxAppNetworkFeed(params: {
  apiBaseUrl: string
  scope: DcxAppNetworkFeedScope
}): Promise<DcxNetworkSuccessResponse<{
  scope: DcxAppNetworkFeedScope
  posts: DcxAppNetworkFeedPost[]
  total_post_count: number
}>> {
  const url = new URL("/network/feed", params.apiBaseUrl)
  url.searchParams.set("scope", params.scope)
  return readDcxNetworkJson(url, {
    method: "GET",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
  })
}

export async function createDcxAppNetworkFeedPost(params: {
  apiBaseUrl: string
  postText: string
  languageCode: string
}): Promise<DcxNetworkSuccessResponse<DcxAppNetworkFeedPost>> {
  return readDcxNetworkJson(new URL("/network/feed/posts", params.apiBaseUrl), {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      post_text: params.postText,
      language_code: params.languageCode,
    }),
  })
}

export async function appendDcxAppNetworkFeedReply(params: {
  apiBaseUrl: string
  feedPostId: number
  replyText: string
  languageCode: string
}): Promise<DcxNetworkSuccessResponse<DcxAppNetworkFeedPost>> {
  return readDcxNetworkJson(
    new URL(`/network/feed/posts/${params.feedPostId}/replies`, params.apiBaseUrl),
    {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        reply_text: params.replyText,
        language_code: params.languageCode,
      }),
    },
  )
}

export async function readDcxAppNetworkProfile(params: {
  apiBaseUrl: string
  networkNickname: string
}): Promise<DcxNetworkSuccessResponse<DcxAppNetworkProfile>> {
  return readDcxNetworkJson(new URL(`/network/profiles/${params.networkNickname}`, params.apiBaseUrl), {
    method: "GET",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
  })
}

export async function setDcxAppNetworkFollow(params: {
  apiBaseUrl: string
  networkNickname: string
  shouldFollow: boolean
}): Promise<DcxNetworkSuccessResponse<DcxAppNetworkProfile>> {
  return readDcxNetworkJson(new URL(`/network/profiles/${params.networkNickname}/follow`, params.apiBaseUrl), {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ should_follow: params.shouldFollow }),
  })
}

export async function readDcxAppNetworkDms(params: {
  apiBaseUrl: string
}): Promise<DcxNetworkSuccessResponse<{ dm_threads: DcxAppNetworkDmThreadCatalogRow[] }>> {
  return readDcxNetworkJson(new URL("/network/dms", params.apiBaseUrl), {
    method: "GET",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
  })
}

export async function startDcxAppNetworkDm(params: {
  apiBaseUrl: string
  networkNickname: string
}): Promise<DcxNetworkSuccessResponse<DcxAppNetworkDmThreadDetail>> {
  return readDcxNetworkJson(new URL("/network/dms/start", params.apiBaseUrl), {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ network_nickname: params.networkNickname }),
  })
}

export async function readDcxAppNetworkDmThread(params: {
  apiBaseUrl: string
  dmThreadId: number
}): Promise<DcxNetworkSuccessResponse<DcxAppNetworkDmThreadDetail>> {
  return readDcxNetworkJson(new URL(`/network/dms/${params.dmThreadId}`, params.apiBaseUrl), {
    method: "GET",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
  })
}

export async function appendDcxAppNetworkDmMessage(params: {
  apiBaseUrl: string
  dmThreadId: number
  messageText: string
  languageCode: string
}): Promise<DcxNetworkSuccessResponse<DcxAppNetworkDmThreadDetail>> {
  return readDcxNetworkJson(new URL(`/network/dms/${params.dmThreadId}/messages`, params.apiBaseUrl), {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      message_text: params.messageText,
      language_code: params.languageCode,
    }),
  })
}

async function readDcxNetworkJson<TData>(
  url: URL,
  requestInit: RequestInit,
): Promise<DcxNetworkSuccessResponse<TData>> {
  const response = await fetch(url.toString(), requestInit)
  const payload = (await response.json()) as DcxNetworkSuccessResponse<TData> | DcxNetworkErrorResponse

  if (!response.ok || payload.ok !== true) {
    const errorPayload =
      payload && payload.ok === false
        ? payload.error
        : {
            code: "DCX_APP_NETWORK_REQUEST_FAILED",
            message: "We could not complete that network request.",
            suggested_action: "Retry after confirming the backend is reachable.",
          }
    const error = new Error(errorPayload.message) as Error & { code?: string; suggested_action?: string }
    error.code = errorPayload.code
    error.suggested_action = errorPayload.suggested_action
    throw error
  }

  return payload
}
