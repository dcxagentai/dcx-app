/**
 * CONTEXT:
 * First app-private DCX Network feed page.
 * It gives traders short public posts and one-level replies as a habit/trust layer.
 */

import { useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import {
  BarChart3Icon,
  BookmarkIcon,
  HeartIcon,
  MessageCircleIcon,
  MoreHorizontalIcon,
  RefreshCwIcon,
  Repeat2Icon,
  ShareIcon,
} from "lucide-react"

import { Button } from "./ui/button"
import { Textarea } from "./ui/textarea"
import {
  DCX_APP_ACCOUNT_PAGE_DEFAULT_UX_STRINGS,
  formatDcxAppAccountTimestampLabel,
} from "./dcx_app_user_account_shared"
import { readDcxAppAuthenticatedUserAccountSummary } from "../lib/read_dcx_app_authenticated_user_account_summary"
import {
  appendDcxAppNetworkFeedReply,
  readDcxAppNetworkFeed,
  readDcxAppNetworkFeedPost,
  setDcxAppNetworkFeedPostBookmark,
  setDcxAppNetworkFeedPostLike,
  setDcxAppNetworkFeedPostRepost,
  type DcxAppNetworkFeedPost,
  type DcxAppNetworkFeedScope,
} from "../lib/dcx_app_network_api"
import {
  DcxAppNetworkAvatar,
  DcxAppNetworkProfileLink,
} from "./dcx_app_network_shared"

type Props = {
  apiBaseUrl: string
  routeFeedPostId?: number | null
  feedMode?: "feed" | "bookmarks"
}

export function DcxAppNetworkFeedPage(props: Props) {
  const queryClient = useQueryClient()
  const [scope, setScope] = useState<DcxAppNetworkFeedScope>("following")
  const [activeReplyPostId, setActiveReplyPostId] = useState<number | null>(null)
  const [replyTextByPostId, setReplyTextByPostId] = useState<Record<number, string>>({})
  const [copiedSharePostId, setCopiedSharePostId] = useState<number | null>(null)
  const routeFeedPostId = props.routeFeedPostId ?? null
  const isPostDetailRoute = routeFeedPostId !== null
  const feedMode = props.feedMode ?? "feed"
  const activeFeedScope: DcxAppNetworkFeedScope = feedMode === "bookmarks" ? "bookmarks" : scope

  const accountSummaryQuery = useQuery({
    queryKey: ["dcx_app_authenticated_user_account_summary"],
    queryFn: async () => readDcxAppAuthenticatedUserAccountSummary({ apiBaseUrl: props.apiBaseUrl }),
  })
  const accountSummary = accountSummaryQuery.data?.data ?? null
  const ux = accountSummary?.ux_strings ?? DCX_APP_ACCOUNT_PAGE_DEFAULT_UX_STRINGS
  const selectedLanguageCode = accountSummary?.preferred_language?.language_code ?? "en"
  const selectedTimezoneIanaName = accountSummary?.preferred_timezone?.iana_name ?? null

  const feedQuery = useQuery({
    queryKey: ["dcx_app_network_feed", activeFeedScope],
    queryFn: async () => readDcxAppNetworkFeed({ apiBaseUrl: props.apiBaseUrl, scope: activeFeedScope }),
    enabled: !isPostDetailRoute,
  })

  const feedPostQuery = useQuery({
    queryKey: ["dcx_app_network_feed_post", routeFeedPostId],
    queryFn: async () =>
      readDcxAppNetworkFeedPost({
        apiBaseUrl: props.apiBaseUrl,
        feedPostId: routeFeedPostId ?? 0,
      }),
    enabled: isPostDetailRoute && routeFeedPostId !== null,
  })

  const replyMutation = useMutation({
    mutationFn: async (params: { feedPostId: number; replyText: string }) =>
      appendDcxAppNetworkFeedReply({
        apiBaseUrl: props.apiBaseUrl,
        feedPostId: params.feedPostId,
        replyText: params.replyText,
        languageCode: selectedLanguageCode,
      }),
    onSuccess: async (_payload, variables) => {
      setReplyTextByPostId((previous) => ({
        ...previous,
        [variables.feedPostId]: "",
      }))
      await invalidateNetworkFeedPost(variables.feedPostId)
    },
  })

  const likeMutation = useMutation({
    mutationFn: async (params: { feedPostId: number; shouldLike: boolean }) =>
      setDcxAppNetworkFeedPostLike({
        apiBaseUrl: props.apiBaseUrl,
        feedPostId: params.feedPostId,
        shouldLike: params.shouldLike,
      }),
    onSuccess: async (_payload, variables) => {
      await invalidateNetworkFeedPost(variables.feedPostId)
    },
  })

  const repostMutation = useMutation({
    mutationFn: async (params: { feedPostId: number; shouldRepost: boolean }) =>
      setDcxAppNetworkFeedPostRepost({
        apiBaseUrl: props.apiBaseUrl,
        feedPostId: params.feedPostId,
        shouldRepost: params.shouldRepost,
      }),
    onSuccess: async (_payload, variables) => {
      await invalidateNetworkFeedPost(variables.feedPostId)
    },
  })

  const bookmarkMutation = useMutation({
    mutationFn: async (params: { feedPostId: number; shouldBookmark: boolean }) =>
      setDcxAppNetworkFeedPostBookmark({
        apiBaseUrl: props.apiBaseUrl,
        feedPostId: params.feedPostId,
        shouldBookmark: params.shouldBookmark,
      }),
    onSuccess: async (_payload, variables) => {
      await invalidateNetworkFeedPost(variables.feedPostId)
    },
  })

  async function invalidateNetworkFeedPost(feedPostId: number): Promise<void> {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["dcx_app_network_feed"] }),
      queryClient.invalidateQueries({ queryKey: ["dcx_app_network_feed_post", feedPostId] }),
    ])
  }

  async function handleSharePost(feedPostId: number): Promise<void> {
    const postUrl = `${window.location.origin}/network/feed/${feedPostId}`
    await navigator.clipboard?.writeText(postUrl)
    setCopiedSharePostId(feedPostId)
    window.setTimeout(() => {
      setCopiedSharePostId((currentPostId) => (currentPostId === feedPostId ? null : currentPostId))
    }, 1800)
  }

  const posts = isPostDetailRoute
    ? feedPostQuery.data?.data
      ? [feedPostQuery.data.data]
      : []
    : feedQuery.data?.data.posts ?? []
  const isLoading = isPostDetailRoute ? feedPostQuery.isLoading : feedQuery.isLoading
  const isError = isPostDetailRoute ? feedPostQuery.isError : feedQuery.isError
  const error = isPostDetailRoute ? feedPostQuery.error : feedQuery.error

  return (
    <section className="flex min-h-[calc(100vh-5rem)] flex-col gap-4 text-slate-950">
      <div className="mx-auto flex w-full max-w-3xl flex-wrap items-center justify-between gap-3">
        {isPostDetailRoute ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="rounded-full"
            onClick={() => window.location.assign("/network/feed")}
          >
            Back to feed
          </Button>
        ) : feedMode === "bookmarks" ? (
          <div className="inline-flex rounded-full border border-slate-200 bg-white p-1">
            <Button type="button" variant="default" size="sm" className="rounded-full">
              Bookmarks
            </Button>
          </div>
        ) : (
        <div className="inline-flex rounded-full border border-slate-200 bg-white p-1">
          <Button
            type="button"
            variant={scope === "following" ? "default" : "ghost"}
            size="sm"
            className="rounded-full"
            onClick={() => setScope("following")}
          >
            Following
          </Button>
          <Button
            type="button"
            variant={scope === "all" ? "default" : "ghost"}
            size="sm"
            className="rounded-full"
            onClick={() => setScope("all")}
          >
            All
          </Button>
        </div>
        )}
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="rounded-full"
          onClick={() =>
            void (isPostDetailRoute && routeFeedPostId !== null
              ? queryClient.invalidateQueries({ queryKey: ["dcx_app_network_feed_post", routeFeedPostId] })
              : queryClient.invalidateQueries({ queryKey: ["dcx_app_network_feed"] }))
          }
        >
          <RefreshCwIcon />
          {ux.refresh_button_label ?? "Refresh"}
        </Button>
      </div>

      {isLoading ? (
        <section className="mx-auto w-full max-w-3xl border border-black/6 bg-white px-6 py-8">
          <p className="text-sm text-slate-500">Loading network feed...</p>
        </section>
      ) : null}

      {isError ? (
        <section className="mx-auto w-full max-w-3xl border border-red-200 bg-white px-6 py-8">
          <p className="text-sm text-red-600">{(error as Error).message}</p>
        </section>
      ) : null}

      <div className="mx-auto w-full max-w-3xl border-x border-t border-slate-200 bg-white">
        {posts.length === 0 && !isLoading ? (
          <section className="border-b border-slate-200 px-6 py-10">
            <p className="text-sm text-slate-500">
              {feedMode === "bookmarks" ? "No bookmarked posts yet." : "No network posts yet."}
            </p>
          </section>
        ) : null}
        {posts.map((post) => (
          <DcxNetworkFeedPostCard
            key={post.feed_post_id}
            apiBaseUrl={props.apiBaseUrl}
            post={post}
            isDetailView={isPostDetailRoute}
            selectedLanguageCode={selectedLanguageCode}
            selectedTimezoneIanaName={selectedTimezoneIanaName}
            replyText={replyTextByPostId[post.feed_post_id] ?? ""}
            isReplyComposerOpen={
              activeReplyPostId === post.feed_post_id ||
              (replyTextByPostId[post.feed_post_id] ?? "").trim() !== ""
            }
            isSavingReply={replyMutation.isPending}
            onOpenReplyComposer={() => setActiveReplyPostId(post.feed_post_id)}
            onChangeReplyText={(nextText) =>
              setReplyTextByPostId((previous) => ({
                ...previous,
                [post.feed_post_id]: nextText,
              }))
            }
            onSubmitReply={() => {
              const replyText = (replyTextByPostId[post.feed_post_id] ?? "").trim()
              if (replyText) {
                replyMutation.mutate({ feedPostId: post.feed_post_id, replyText })
              }
            }}
            onOpenPost={() => {
              if (!isPostDetailRoute) {
                window.location.assign(`/network/feed/${post.feed_post_id}`)
              }
            }}
            onToggleLike={() =>
              likeMutation.mutate({
                feedPostId: post.feed_post_id,
                shouldLike: !post.viewer_has_liked,
              })
            }
            onToggleRepost={() =>
              repostMutation.mutate({
                feedPostId: post.feed_post_id,
                shouldRepost: !post.viewer_has_reposted,
              })
            }
            onToggleBookmark={() =>
              bookmarkMutation.mutate({
                feedPostId: post.feed_post_id,
                shouldBookmark: !post.viewer_has_bookmarked,
              })
            }
            onSharePost={() => void handleSharePost(post.feed_post_id)}
            isShareCopied={copiedSharePostId === post.feed_post_id}
          />
        ))}
      </div>
    </section>
  )
}

function DcxNetworkFeedPostCard(props: {
  apiBaseUrl: string
  post: DcxAppNetworkFeedPost
  isDetailView: boolean
  selectedLanguageCode: string
  selectedTimezoneIanaName: string | null
  replyText: string
  isReplyComposerOpen: boolean
  isSavingReply: boolean
  onOpenReplyComposer: () => void
  onChangeReplyText: (nextText: string) => void
  onSubmitReply: () => void
  onOpenPost: () => void
  onToggleLike: () => void
  onToggleRepost: () => void
  onToggleBookmark: () => void
  onSharePost: () => void
  isShareCopied: boolean
}) {
  return (
    <article
      className={[
        "border-b border-slate-200 bg-white px-4 py-4 transition-colors sm:px-5",
        props.isDetailView ? "" : "cursor-pointer hover:bg-slate-50/50",
      ].join(" ")}
      onClick={props.isDetailView ? undefined : props.onOpenPost}
      onKeyDown={(event) => {
        if (!props.isDetailView && (event.key === "Enter" || event.key === " ")) {
          event.preventDefault()
          props.onOpenPost()
        }
      }}
      role={props.isDetailView ? undefined : "link"}
      tabIndex={props.isDetailView ? undefined : 0}
    >
      <header className="flex items-start gap-3">
        <DcxAppNetworkAvatar author={props.post.author} size="lg" />
        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 items-start justify-between gap-3">
            <div onClick={(event) => event.stopPropagation()}>
            <DcxNetworkFeedAuthorLine
              author={props.post.author}
              createdAtTsMs={props.post.created_at_ts_ms}
              selectedLanguageCode={props.selectedLanguageCode}
              selectedTimezoneIanaName={props.selectedTimezoneIanaName}
            />
            </div>
            <button
              type="button"
              className="rounded-full p-1 text-slate-500 transition-colors hover:bg-sky-50 hover:text-sky-700"
              aria-label="More post actions"
              onClick={(event) => event.stopPropagation()}
            >
              <MoreHorizontalIcon className="size-5" />
            </button>
          </div>
          <p className="mt-1 whitespace-pre-wrap text-[15px] leading-6 text-slate-900">{props.post.post_text}</p>
          <DcxNetworkFeedPostAttachment apiBaseUrl={props.apiBaseUrl} post={props.post} />
          <DcxNetworkFeedActionBar
            replyCount={props.post.reply_count}
            repostCount={props.post.repost_count}
            likeCount={props.post.like_count}
            viewCount={props.post.view_count}
            viewerHasReposted={props.post.viewer_has_reposted}
            viewerHasLiked={props.post.viewer_has_liked}
            viewerHasBookmarked={props.post.viewer_has_bookmarked}
            isShareCopied={props.isShareCopied}
            onOpenReplyComposer={props.onOpenReplyComposer}
            onToggleRepost={props.onToggleRepost}
            onToggleLike={props.onToggleLike}
            onToggleBookmark={props.onToggleBookmark}
            onSharePost={props.onSharePost}
          />
        </div>
      </header>
      {(props.post.replies.length > 0 || props.isReplyComposerOpen) ? (
      <section className="mt-3 ml-12 space-y-3 border-l border-slate-200 pl-4" onClick={(event) => event.stopPropagation()}>
        {props.post.replies.map((reply) => (
          <div key={reply.feed_reply_id} className="flex gap-2">
              <DcxAppNetworkAvatar author={reply.author} size="sm" />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-baseline gap-x-1 text-sm">
                <DcxAppNetworkProfileLink author={reply.author} className="font-semibold text-slate-950 hover:text-sky-700" />
                <span className="text-slate-500">@{reply.author.public_handle}</span>
              </div>
              <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-slate-700">{reply.reply_text}</p>
            </div>
          </div>
        ))}
        {props.isReplyComposerOpen ? (
        <div className="flex flex-col gap-2">
          <Textarea
            value={props.replyText}
            maxLength={500}
            rows={2}
            placeholder="Post your reply..."
            onChange={(event) => props.onChangeReplyText(event.target.value)}
            onClick={(event) => event.stopPropagation()}
            className="min-h-20 resize-y border-slate-200 bg-white text-sm shadow-none"
          />
          <Button
            type="button"
            className="self-end rounded-full"
            disabled={props.replyText.trim() === "" || props.isSavingReply}
            onClick={(event) => {
              event.stopPropagation()
              props.onSubmitReply()
            }}
          >
            Reply
          </Button>
        </div>
        ) : null}
      </section>
      ) : null}
    </article>
  )
}

function DcxNetworkFeedAuthorLine(props: {
  author: DcxAppNetworkFeedPost["author"]
  createdAtTsMs: number
  selectedLanguageCode: string
  selectedTimezoneIanaName: string | null
}) {
  const handle = props.author.public_handle ? `@${props.author.public_handle}` : ""
  const displayName = props.author.public_display_name || props.author.public_identity_label || handle
  const relativeTimestamp = readDcxNetworkFeedRelativeTimestamp(props.createdAtTsMs)
  const absoluteTimestamp = formatDcxAppAccountTimestampLabel(
    props.createdAtTsMs,
    props.selectedLanguageCode,
    props.selectedTimezoneIanaName,
    "",
  )

  return (
    <div className="min-w-0">
      <div className="flex min-w-0 flex-wrap items-baseline gap-x-1 text-sm">
        <a
          href={props.author.public_handle ? `/network/${props.author.public_handle}` : "#"}
          className="truncate font-semibold text-slate-950 hover:text-sky-700"
        >
          {displayName}
        </a>
        {handle && displayName !== handle ? <span className="text-slate-500">{handle}</span> : null}
        <span className="text-slate-500">·</span>
        <time className="text-slate-500" dateTime={new Date(props.createdAtTsMs).toISOString()} title={absoluteTimestamp}>
          {relativeTimestamp}
        </time>
      </div>
    </div>
  )
}

function DcxNetworkFeedActionBar(props: {
  replyCount: number
  repostCount: number
  likeCount: number
  viewCount: number
  viewerHasReposted: boolean
  viewerHasLiked: boolean
  viewerHasBookmarked: boolean
  isShareCopied: boolean
  onOpenReplyComposer: () => void
  onToggleRepost: () => void
  onToggleLike: () => void
  onToggleBookmark: () => void
  onSharePost: () => void
}) {
  return (
    <div className="mt-3 grid grid-cols-6 items-center gap-1 text-slate-500 sm:max-w-xl">
      <button
        type="button"
        className="group inline-flex items-center gap-2 rounded-full py-1 text-sm transition-colors hover:text-sky-700"
        title="Reply"
        onClick={(event) => {
          event.stopPropagation()
          props.onOpenReplyComposer()
        }}
      >
        <span className="rounded-full p-1.5 transition-colors group-hover:bg-sky-50">
          <MessageCircleIcon className="size-4" />
        </span>
        <span>{formatDcxNetworkFeedCount(props.replyCount)}</span>
      </button>
      <button
        type="button"
        className={[
          "group inline-flex items-center gap-2 rounded-full py-1 text-sm transition-colors hover:text-emerald-600",
          props.viewerHasReposted ? "text-emerald-600" : "",
        ].join(" ")}
        title={props.viewerHasReposted ? "Remove repost" : "Repost"}
        onClick={(event) => {
          event.stopPropagation()
          props.onToggleRepost()
        }}
      >
        <span className="rounded-full p-1.5 transition-colors group-hover:bg-emerald-50">
          <Repeat2Icon className="size-4" />
        </span>
        <span>{formatDcxNetworkFeedCount(props.repostCount)}</span>
      </button>
      <button
        type="button"
        className={[
          "group inline-flex items-center gap-2 rounded-full py-1 text-sm transition-colors hover:text-rose-600",
          props.viewerHasLiked ? "text-rose-600" : "",
        ].join(" ")}
        title={props.viewerHasLiked ? "Unlike" : "Like"}
        onClick={(event) => {
          event.stopPropagation()
          props.onToggleLike()
        }}
      >
        <span className="rounded-full p-1.5 transition-colors group-hover:bg-rose-50">
          <HeartIcon className={["size-4", props.viewerHasLiked ? "fill-current" : ""].join(" ")} />
        </span>
        <span>{formatDcxNetworkFeedCount(props.likeCount)}</span>
      </button>
      <span className="inline-flex items-center gap-2 rounded-full py-1 text-sm">
        <span className="rounded-full p-1.5">
          <BarChart3Icon className="size-4" />
        </span>
        <span>{formatDcxNetworkFeedCount(props.viewCount)}</span>
      </span>
      <button
        type="button"
        className={[
          "group inline-flex justify-end rounded-full py-1 text-sm transition-colors hover:text-sky-700 sm:justify-start",
          props.viewerHasBookmarked ? "text-sky-700" : "",
        ].join(" ")}
        title={props.viewerHasBookmarked ? "Remove bookmark" : "Bookmark"}
        onClick={(event) => {
          event.stopPropagation()
          props.onToggleBookmark()
        }}
      >
        <span className="rounded-full p-1.5 transition-colors group-hover:bg-sky-50">
          <BookmarkIcon className={["size-4", props.viewerHasBookmarked ? "fill-current" : ""].join(" ")} />
        </span>
      </button>
      <button
        type="button"
        className="group inline-flex justify-end rounded-full py-1 text-sm transition-colors hover:text-sky-700 sm:justify-start"
        title={props.isShareCopied ? "Copied" : "Copy link"}
        onClick={(event) => {
          event.stopPropagation()
          props.onSharePost()
        }}
      >
        <span className="rounded-full p-1.5 transition-colors group-hover:bg-sky-50">
          <ShareIcon className="size-4" />
        </span>
      </button>
    </div>
  )
}

function formatDcxNetworkFeedCount(count: number): string {
  const normalizedCount = Number.isFinite(count) && count > 0 ? count : 0
  if (normalizedCount < 1000) {
    return `${normalizedCount}`
  }
  return new Intl.NumberFormat("en", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(normalizedCount)
}

function readDcxNetworkFeedRelativeTimestamp(createdAtTsMs: number): string {
  const deltaMs = Date.now() - createdAtTsMs
  if (!Number.isFinite(deltaMs) || deltaMs < 0) {
    return "now"
  }
  const minuteMs = 60 * 1000
  const hourMs = 60 * minuteMs
  const dayMs = 24 * hourMs
  if (deltaMs < minuteMs) {
    return "now"
  }
  if (deltaMs < hourMs) {
    return `${Math.max(1, Math.floor(deltaMs / minuteMs))}m`
  }
  if (deltaMs < dayMs) {
    return `${Math.floor(deltaMs / hourMs)}h`
  }
  if (deltaMs < 7 * dayMs) {
    return `${Math.floor(deltaMs / dayMs)}d`
  }
  return new Intl.DateTimeFormat("en", {
    day: "numeric",
    month: "short",
  }).format(new Date(createdAtTsMs))
}

function DcxNetworkFeedPostAttachment(props: {
  apiBaseUrl: string
  post: DcxAppNetworkFeedPost
}) {
  const attachment = props.post.attachment
  if (!attachment) {
    return null
  }

  const attachmentUrl = new URL(attachment.attachment_url_path, props.apiBaseUrl).toString()
  if (attachment.attachment_kind === "image") {
    return (
      <div
        className="mt-4 overflow-hidden rounded-md border border-slate-200 bg-slate-50"
        onClick={(event) => event.stopPropagation()}
      >
        <img
          src={attachmentUrl}
          alt={attachment.original_filename || "Network post image"}
          className="max-h-96 w-auto max-w-full object-contain"
        />
      </div>
    )
  }

  return (
    <div
      className="mt-4 rounded-md border border-slate-200 bg-slate-50 px-4 py-3"
      onClick={(event) => event.stopPropagation()}
    >
      <audio controls className="w-full">
        <source src={attachmentUrl} type={attachment.content_type || "audio/mpeg"} />
      </audio>
    </div>
  )
}
