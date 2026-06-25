/**
 * CONTEXT:
 * First app-private DCX Network feed page.
 * It gives traders short public posts and one-level replies as a habit/trust layer.
 */

import { useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { MessageCircleIcon, RefreshCwIcon } from "lucide-react"

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
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex rounded-md border border-slate-200 bg-white p-1">
          <Button
            type="button"
            variant={scope === "following" ? "default" : "ghost"}
            size="sm"
            onClick={() => setScope("following")}
          >
            Following
          </Button>
          <Button
            type="button"
            variant={scope === "all" ? "default" : "ghost"}
            size="sm"
            onClick={() => setScope("all")}
          >
            All
          </Button>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => void queryClient.invalidateQueries({ queryKey: ["dcx_app_network_feed"] })}
        >
          <RefreshCwIcon />
          {ux.refresh_button_label ?? "Refresh"}
        </Button>
      </div>

      {feedQuery.isLoading ? (
        <section className="border border-black/6 bg-white px-6 py-8">
          <p className="text-sm text-slate-500">Loading network feed...</p>
        </section>
      ) : null}

      {feedQuery.isError ? (
        <section className="border border-red-200 bg-white px-6 py-8">
          <p className="text-sm text-red-600">{(feedQuery.error as Error).message}</p>
        </section>
      ) : null}

      <div className="space-y-3">
        {posts.length === 0 && !feedQuery.isLoading ? (
          <section className="border border-black/6 bg-white px-6 py-8">
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
            isSavingReply={replyMutation.isPending}
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
  isSavingReply: boolean
  onChangeReplyText: (nextText: string) => void
  onSubmitReply: () => void
}) {
  return (
    <article className="rounded-md border border-black/6 bg-white p-5 shadow-[0_18px_55px_-48px_rgba(15,23,42,0.45)]">
      <header className="flex items-start gap-3">
        <DcxAppNetworkAvatar author={props.post.author} />
        <div className="min-w-0 flex-1">
          <DcxAppNetworkProfileLink author={props.post.author} />
          <p className="text-xs text-slate-500">
            {formatDcxAppAccountTimestampLabel(
              props.post.created_at_ts_ms,
              props.selectedLanguageCode,
              props.selectedTimezoneIanaName,
              "",
            )}
          </p>
        </div>
      </header>
      <p className="mt-4 whitespace-pre-wrap text-sm leading-6 text-slate-800">{props.post.post_text}</p>
      <DcxNetworkFeedPostAttachment apiBaseUrl={props.apiBaseUrl} post={props.post} />
      <section className="mt-4 space-y-3 border-t border-slate-100 pt-4">
        <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
          <MessageCircleIcon className="size-4" />
          <span>{props.post.reply_count} replies</span>
        </div>
        {props.post.replies.map((reply) => (
          <div key={reply.feed_reply_id} className="rounded-md bg-slate-50 px-3 py-2">
            <div className="flex items-center gap-2">
              <DcxAppNetworkAvatar author={reply.author} size="sm" />
              <DcxAppNetworkProfileLink author={reply.author} className="text-sm font-medium text-slate-950 hover:text-sky-700" />
            </div>
            <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-700">{reply.reply_text}</p>
          </div>
        ))}
        <div className="flex flex-col gap-2 sm:flex-row">
          <Textarea
            value={props.replyText}
            maxLength={500}
            rows={2}
            placeholder="Reply..."
            onChange={(event) => props.onChangeReplyText(event.target.value)}
          />
          <Button
            type="button"
            className="sm:self-end"
            disabled={props.replyText.trim() === "" || props.isSavingReply}
            onClick={props.onSubmitReply}
          >
            Reply
          </Button>
        </div>
      </section>
    </article>
  )
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
