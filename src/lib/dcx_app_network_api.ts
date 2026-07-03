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

export type DcxAppNetworkFeedAttachment = {
  file_object_id: number
  attachment_kind: "image" | "audio"
  attachment_metadata_json: Record<string, unknown>
  file_uuid: string
  content_type: string
  file_size_bytes: number
  original_filename: string
  file_kind: string
  attachment_url_path: string
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
  like_count: number
  repost_count: number
  bookmark_count: number
  view_count: number
  viewer_follows_author: boolean
  viewer_has_liked: boolean
  viewer_has_reposted: boolean
  viewer_has_bookmarked: boolean
  feed_activity_ts_ms: number
  is_owned_by_authenticated_user: boolean
  attachment: DcxAppNetworkFeedAttachment | null
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

export type DcxAppNetworkContactScope = "all" | "following" | "followers" | "mutual"

export type DcxAppNetworkContact = {
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
  latest_post_at_ts_ms: number | null
  post_count: number
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

export async function readDcxAppNetworkFeedPost(params: {
  apiBaseUrl: string
  feedPostId: number
}): Promise<DcxNetworkSuccessResponse<DcxAppNetworkFeedPost>> {
  return readDcxNetworkJson(new URL(`/network/feed/posts/${params.feedPostId}`, params.apiBaseUrl), {
    method: "GET",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
  })
}

export async function createDcxAppNetworkFeedPost(params: {
  apiBaseUrl: string
  postText: string
  languageCode: string
  postFile?: File | null
}): Promise<DcxNetworkSuccessResponse<DcxAppNetworkFeedPost>> {
  const formData = new FormData()
  formData.append("post_text", params.postText)
  formData.append("language_code", params.languageCode)
  if (params.postFile) {
    formData.append("post_file", params.postFile)
  }
  return readDcxNetworkJson(new URL("/network/feed/posts", params.apiBaseUrl), {
    method: "POST",
    credentials: "include",
    body: formData,
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

export async function setDcxAppNetworkFeedPostLike(params: {
  apiBaseUrl: string
  feedPostId: number
  shouldLike: boolean
}): Promise<DcxNetworkSuccessResponse<DcxAppNetworkFeedPost>> {
  return readDcxNetworkJson(new URL(`/network/feed/posts/${params.feedPostId}/like`, params.apiBaseUrl), {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ should_like: params.shouldLike }),
  })
}

export async function setDcxAppNetworkFeedPostRepost(params: {
  apiBaseUrl: string
  feedPostId: number
  shouldRepost: boolean
}): Promise<DcxNetworkSuccessResponse<DcxAppNetworkFeedPost>> {
  return readDcxNetworkJson(new URL(`/network/feed/posts/${params.feedPostId}/repost`, params.apiBaseUrl), {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ should_repost: params.shouldRepost }),
  })
}

export async function setDcxAppNetworkFeedPostBookmark(params: {
  apiBaseUrl: string
  feedPostId: number
  shouldBookmark: boolean
}): Promise<DcxNetworkSuccessResponse<DcxAppNetworkFeedPost>> {
  return readDcxNetworkJson(new URL(`/network/feed/posts/${params.feedPostId}/bookmark`, params.apiBaseUrl), {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ should_bookmark: params.shouldBookmark }),
  })
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

export async function readDcxAppNetworkContacts(params: {
  apiBaseUrl: string
  scope: DcxAppNetworkContactScope
  searchQuery: string
}): Promise<DcxNetworkSuccessResponse<{
  scope: DcxAppNetworkContactScope
  search_query: string
  contacts: DcxAppNetworkContact[]
  total_contact_count: number
}>> {
  const url = new URL("/network/contacts", params.apiBaseUrl)
  url.searchParams.set("scope", params.scope)
  if (params.searchQuery.trim()) {
    url.searchParams.set("search", params.searchQuery.trim())
  }
  return readDcxNetworkJson(url, {
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
