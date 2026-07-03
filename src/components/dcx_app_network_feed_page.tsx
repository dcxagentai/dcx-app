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
  type DcxAppNetworkFeedPost,
  type DcxAppNetworkFeedScope,
} from "../lib/dcx_app_network_api"
import {
  DcxAppNetworkAvatar,
  DcxAppNetworkProfileLink,
} from "./dcx_app_network_shared"

type Props = {
  apiBaseUrl: string
}

export function DcxAppNetworkFeedPage(props: Props) {
  const queryClient = useQueryClient()
  const [scope, setScope] = useState<DcxAppNetworkFeedScope>("following")
  const [activeReplyPostId, setActiveReplyPostId] = useState<number | null>(null)
  const [replyTextByPostId, setReplyTextByPostId] = useState<Record<number, string>>({})

  const accountSummaryQuery = useQuery({
    queryKey: ["dcx_app_authenticated_user_account_summary"],
    queryFn: async () => readDcxAppAuthenticatedUserAccountSummary({ apiBaseUrl: props.apiBaseUrl }),
  })
  const accountSummary = accountSummaryQuery.data?.data ?? null
  const ux = accountSummary?.ux_strings ?? DCX_APP_ACCOUNT_PAGE_DEFAULT_UX_STRINGS
  const selectedLanguageCode = accountSummary?.preferred_language?.language_code ?? "en"
  const selectedTimezoneIanaName = accountSummary?.preferred_timezone?.iana_name ?? null

  const feedQuery = useQuery({
    queryKey: ["dcx_app_network_feed", scope],
    queryFn: async () => readDcxAppNetworkFeed({ apiBaseUrl: props.apiBaseUrl, scope }),
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
      await queryClient.invalidateQueries({ queryKey: ["dcx_app_network_feed"] })
    },
  })

  const posts = feedQuery.data?.data.posts ?? []

  return (
    <section className="flex min-h-[calc(100vh-5rem)] flex-col gap-4 text-slate-950">
      <div className="mx-auto flex w-full max-w-3xl flex-wrap items-center justify-between gap-3">
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
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="rounded-full"
          onClick={() => void queryClient.invalidateQueries({ queryKey: ["dcx_app_network_feed"] })}
        >
          <RefreshCwIcon />
          {ux.refresh_button_label ?? "Refresh"}
        </Button>
      </div>

      {feedQuery.isLoading ? (
        <section className="mx-auto w-full max-w-3xl border border-black/6 bg-white px-6 py-8">
          <p className="text-sm text-slate-500">Loading network feed...</p>
        </section>
      ) : null}

      {feedQuery.isError ? (
        <section className="mx-auto w-full max-w-3xl border border-red-200 bg-white px-6 py-8">
          <p className="text-sm text-red-600">{(feedQuery.error as Error).message}</p>
        </section>
      ) : null}

      <div className="mx-auto w-full max-w-3xl border-x border-t border-slate-200 bg-white">
        {posts.length === 0 && !feedQuery.isLoading ? (
          <section className="border-b border-slate-200 px-6 py-10">
            <p className="text-sm text-slate-500">No network posts yet.</p>
          </section>
        ) : null}
        {posts.map((post) => (
          <DcxNetworkFeedPostCard
            key={post.feed_post_id}
            apiBaseUrl={props.apiBaseUrl}
            post={post}
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
          />
        ))}
      </div>
    </section>
  )
}

function DcxNetworkFeedPostCard(props: {
  apiBaseUrl: string
  post: DcxAppNetworkFeedPost
  selectedLanguageCode: string
  selectedTimezoneIanaName: string | null
  replyText: string
  isReplyComposerOpen: boolean
  isSavingReply: boolean
  onOpenReplyComposer: () => void
  onChangeReplyText: (nextText: string) => void
  onSubmitReply: () => void
}) {
  return (
    <article className="border-b border-slate-200 bg-white px-4 py-4 transition-colors hover:bg-slate-50/50 sm:px-5">
      <header className="flex items-start gap-3">
        <DcxAppNetworkAvatar author={props.post.author} size="lg" />
        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 items-start justify-between gap-3">
            <DcxNetworkFeedAuthorLine
              author={props.post.author}
              createdAtTsMs={props.post.created_at_ts_ms}
              selectedLanguageCode={props.selectedLanguageCode}
              selectedTimezoneIanaName={props.selectedTimezoneIanaName}
            />
            <button
              type="button"
              className="rounded-full p-1 text-slate-500 transition-colors hover:bg-sky-50 hover:text-sky-700"
              aria-label="More post actions"
            >
              <MoreHorizontalIcon className="size-5" />
            </button>
          </div>
          <p className="mt-1 whitespace-pre-wrap text-[15px] leading-6 text-slate-900">{props.post.post_text}</p>
          <DcxNetworkFeedPostAttachment apiBaseUrl={props.apiBaseUrl} post={props.post} />
          <DcxNetworkFeedActionBar
            replyCount={props.post.reply_count}
            onOpenReplyComposer={props.onOpenReplyComposer}
          />
        </div>
      </header>
      {(props.post.replies.length > 0 || props.isReplyComposerOpen) ? (
      <section className="mt-3 ml-12 space-y-3 border-l border-slate-200 pl-4">
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
            className="min-h-20 resize-y border-slate-200 bg-white text-sm shadow-none"
          />
          <Button
            type="button"
            className="self-end rounded-full"
            disabled={props.replyText.trim() === "" || props.isSavingReply}
            onClick={props.onSubmitReply}
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
  onOpenReplyComposer: () => void
}) {
  return (
    <div className="mt-3 grid grid-cols-6 items-center gap-1 text-slate-500 sm:max-w-xl">
      <button
        type="button"
        className="group inline-flex items-center gap-2 rounded-full py-1 text-sm transition-colors hover:text-sky-700"
        onClick={props.onOpenReplyComposer}
      >
        <span className="rounded-full p-1.5 transition-colors group-hover:bg-sky-50">
          <MessageCircleIcon className="size-4" />
        </span>
        <span>{props.replyCount}</span>
      </button>
      <span className="inline-flex items-center gap-2 rounded-full py-1 text-sm">
        <span className="rounded-full p-1.5">
          <Repeat2Icon className="size-4" />
        </span>
        <span>0</span>
      </span>
      <span className="inline-flex items-center gap-2 rounded-full py-1 text-sm">
        <span className="rounded-full p-1.5">
          <HeartIcon className="size-4" />
        </span>
        <span>0</span>
      </span>
      <span className="inline-flex items-center gap-2 rounded-full py-1 text-sm">
        <span className="rounded-full p-1.5">
          <BarChart3Icon className="size-4" />
        </span>
        <span>0</span>
      </span>
      <span className="inline-flex justify-end rounded-full py-1 text-sm sm:justify-start">
        <span className="rounded-full p-1.5">
          <BookmarkIcon className="size-4" />
        </span>
      </span>
      <span className="inline-flex justify-end rounded-full py-1 text-sm sm:justify-start">
        <span className="rounded-full p-1.5">
          <ShareIcon className="size-4" />
        </span>
      </span>
    </div>
  )
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
      <div className="mt-4 overflow-hidden rounded-md border border-slate-200 bg-slate-50">
        <img
          src={attachmentUrl}
          alt={attachment.original_filename || "Network post image"}
          className="max-h-96 w-auto max-w-full object-contain"
        />
      </div>
    )
  }

  return (
    <div className="mt-4 rounded-md border border-slate-200 bg-slate-50 px-4 py-3">
      <audio controls className="w-full">
        <source src={attachmentUrl} type={attachment.content_type || "audio/mpeg"} />
      </audio>
    </div>
  )
}
