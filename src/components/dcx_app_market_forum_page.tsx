import { useEffect, useMemo, useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import type { Column, ColumnDef, SortingState } from "@tanstack/react-table"
import { RefreshCwIcon, SearchIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { DcxAppDataTable } from "@/components/ui/dcx_app_data_table"
import { Input } from "@/components/ui/input"
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable"
import { Textarea } from "@/components/ui/textarea"

import {
  DCX_APP_ACCOUNT_PAGE_DEFAULT_UX_STRINGS,
  formatDcxAppAccountTimestampLabel,
} from "./dcx_app_user_account_shared"
import { appendDcxAppMarketForumComment } from "../lib/append_dcx_app_market_forum_comment"
import { readDcxAppAuthenticatedUserAccountSummary } from "../lib/read_dcx_app_authenticated_user_account_summary"
import {
  readDcxAppMarketForumCatalog,
  type DcxAppMarketForumCatalogRow,
} from "../lib/read_dcx_app_market_forum_catalog"
import {
  readDcxAppMarketForumPostDetail,
  type DcxAppMarketForumPostDetail,
} from "../lib/read_dcx_app_market_forum_post_detail"

type Props = {
  apiBaseUrl: string
  routeForumPostId?: number | null
}

export function DcxAppMarketForumPage(props: Props) {
  const queryClient = useQueryClient()
  const [selectedForumPostId, setSelectedForumPostId] = useState<number | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [commentText, setCommentText] = useState("")
  const [sorting, setSorting] = useState<SortingState>([{ id: "updated", desc: true }])

  const accountSummaryQuery = useQuery({
    queryKey: ["dcx_app_authenticated_user_account_summary"],
    queryFn: async () => readDcxAppAuthenticatedUserAccountSummary({ apiBaseUrl: props.apiBaseUrl }),
  })
  const catalogQuery = useQuery({
    queryKey: ["dcx_app_market_forum_catalog"],
    queryFn: async () => readDcxAppMarketForumCatalog({ apiBaseUrl: props.apiBaseUrl }),
  })
  const forumPosts = catalogQuery.data?.data.forum_posts ?? []
  const accountSummary = accountSummaryQuery.data?.data ?? null
  const ux = accountSummary?.ux_strings ?? DCX_APP_ACCOUNT_PAGE_DEFAULT_UX_STRINGS
  const selectedLanguageCode = accountSummary?.preferred_language?.language_code ?? "en"
  const selectedTimezoneIanaName = accountSummary?.preferred_timezone?.iana_name ?? null

  useEffect(() => {
    if (props.routeForumPostId) {
      setSelectedForumPostId(props.routeForumPostId)
      return
    }
    if (selectedForumPostId !== null) {
      return
    }
    if (forumPosts[0]) {
      setSelectedForumPostId(forumPosts[0].forum_post_id)
    }
  }, [forumPosts, props.routeForumPostId, selectedForumPostId])

  const detailQuery = useQuery({
    queryKey: ["dcx_app_market_forum_post_detail", selectedForumPostId],
    enabled: typeof selectedForumPostId === "number",
    queryFn: async () =>
      readDcxAppMarketForumPostDetail({
        apiBaseUrl: props.apiBaseUrl,
        forumPostId: selectedForumPostId as number,
      }),
  })
  const commentMutation = useMutation({
    mutationFn: async (params: { forumPostId: number; commentText: string }) =>
      appendDcxAppMarketForumComment({
        apiBaseUrl: props.apiBaseUrl,
        forumPostId: params.forumPostId,
        commentText: params.commentText,
        languageCode: selectedLanguageCode,
      }),
    onSuccess: async (payload, variables) => {
      setCommentText("")
      queryClient.setQueryData(["dcx_app_market_forum_post_detail", variables.forumPostId], payload)
      await queryClient.invalidateQueries({ queryKey: ["dcx_app_market_forum_catalog"] })
    },
  })

  const filteredPosts = useMemo(() => {
    const normalizedSearchQuery = searchQuery.trim().toLowerCase()
    if (!normalizedSearchQuery) {
      return forumPosts
    }
    return forumPosts.filter((post) =>
      [
        post.forum_title,
        post.forum_body_text,
        post.public_reference_code,
        post.forum_post_status,
        post.owner_public_identity_label,
        ...post.forum_tags_json,
      ]
        .join(" ")
        .toLowerCase()
        .includes(normalizedSearchQuery),
    )
  }, [forumPosts, searchQuery])

  const columns = useMemo<Array<ColumnDef<DcxAppMarketForumCatalogRow>>>(
    () => [
      {
        id: "topic",
        accessorFn: (post) => post.forum_title,
        header: ({ column }) => <DcxForumSortableHeader column={column} title="Topic" />,
        cell: ({ row }) => <span className="line-clamp-1 font-medium text-slate-950">{row.original.forum_title || "Forum post"}</span>,
      },
      {
        id: "tags",
        accessorFn: (post) => post.forum_tags_json.join(" "),
        header: ({ column }) => <DcxForumSortableHeader column={column} title="Tags" />,
        cell: ({ row }) => <span className="line-clamp-1 text-sm text-slate-600">{row.original.forum_tags_json.slice(0, 3).join(", ") || "—"}</span>,
      },
      {
        id: "trader",
        accessorFn: (post) => post.owner_public_identity_label,
        header: ({ column }) => <DcxForumSortableHeader column={column} title="Trader" />,
        cell: ({ row }) => <span className="line-clamp-1 text-sm text-slate-700">{row.original.owner_public_identity_label}</span>,
      },
      {
        id: "comments",
        accessorFn: (post) => post.comment_count,
        header: ({ column }) => <DcxForumSortableHeader column={column} title="Comments" />,
        cell: ({ row }) => row.original.comment_count,
      },
      {
        id: "updated",
        accessorFn: (post) => post.updated_at_ts_ms,
        header: ({ column }) => <DcxForumSortableHeader column={column} title="Updated" />,
        cell: ({ row }) =>
          formatDcxAppAccountTimestampLabel(
            row.original.updated_at_ts_ms,
            selectedLanguageCode,
            selectedTimezoneIanaName,
            "—",
          ),
      },
    ],
    [selectedLanguageCode, selectedTimezoneIanaName],
  )

  const selectedPost = detailQuery.data?.data ?? null

  return (
    <div className="flex h-full min-h-0 flex-col gap-4">
      <ResizablePanelGroup orientation="horizontal" className="min-h-0 flex-1 rounded-lg border bg-white">
        <ResizablePanel defaultSize={52} minSize={38}>
          <div className="h-full overflow-hidden p-4">
            <section className="overflow-hidden border border-black/6 bg-white shadow-[0_18px_55px_-48px_rgba(15,23,42,0.45)]">
              <div className="flex flex-col gap-3 border-b border-black/6 px-4 py-3 lg:flex-row lg:items-center lg:justify-between">
                <label className="relative block w-full lg:flex-1">
                  <SearchIcon className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                  <Input value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} placeholder="Search forum..." className="pl-9" />
                </label>
                <div className="flex items-center justify-between gap-3 lg:justify-end">
                  <p className="text-xs text-slate-500">{filteredPosts.length} of {catalogQuery.data?.data.total_forum_post_count ?? forumPosts.length}</p>
                  <Button type="button" variant="outline" size="sm" onClick={() => void queryClient.invalidateQueries({ queryKey: ["dcx_app_market_forum_catalog"] })}>
                    <RefreshCwIcon />
                    {ux.refresh_button_label ?? "Refresh"}
                  </Button>
                </div>
              </div>
              <DcxAppDataTable
                columns={columns}
                data={filteredPosts}
                tableClassName="[&_td]:py-3"
                sorting={sorting}
                onSortingChange={setSorting}
                pageSize={25}
                onRowClick={(row) => {
                  setSelectedForumPostId(row.forum_post_id)
                  window.history.replaceState({}, "", `/me/market/forum/${row.forum_post_id}`)
                }}
                readRowClassName={(row) => row.forum_post_id === selectedForumPostId ? "bg-sky-50 hover:bg-sky-50 ring-1 ring-inset ring-sky-200" : ""}
                emptyLabel="No public forum posts yet."
              />
            </section>
          </div>
        </ResizablePanel>
        <ResizableHandle withHandle />
        <ResizablePanel defaultSize={48} minSize={32}>
          <div className="h-full overflow-y-auto border-l p-6">
            {!selectedPost ? (
              <p className="text-sm text-slate-500">Choose a forum post to read.</p>
            ) : (
              <DcxForumPostDetailPanel
                post={selectedPost}
                commentText={commentText}
                setCommentText={setCommentText}
                isSavingComment={commentMutation.isPending}
                commentErrorText={(commentMutation.error as Error | null)?.message ?? null}
                onSubmitComment={() => {
                  if (commentText.trim()) {
                    commentMutation.mutate({ forumPostId: selectedPost.forum_post_id, commentText })
                  }
                }}
              />
            )}
          </div>
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  )
}

function DcxForumPostDetailPanel(props: {
  post: DcxAppMarketForumPostDetail
  commentText: string
  setCommentText: (nextValue: string) => void
  isSavingComment: boolean
  commentErrorText: string | null
  onSubmitComment: () => void
}) {
  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Forum topic</p>
        <h2 className="mt-2 text-xl font-semibold text-slate-950">{props.post.forum_title || "Forum post"}</h2>
        <p className="mt-2 text-sm text-slate-500">Posted by {props.post.owner_public_identity_label}</p>
        <p className="mt-2 text-sm leading-6 text-slate-700">{props.post.forum_body_text}</p>
      </div>
      <section className="space-y-3 rounded-lg border border-slate-200 bg-white p-4">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Discussion</p>
        {props.post.comments.length === 0 ? (
          <p className="text-sm text-slate-500">No comments yet.</p>
        ) : (
          props.post.comments.map((comment) => (
            <div key={comment.forum_comment_id} className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
              <p className="text-sm leading-6 text-slate-900">{comment.comment_text}</p>
              <div className="mt-2 text-right text-[0.72rem] font-medium text-slate-400">
                {comment.author_public_identity_label}
              </div>
            </div>
          ))
        )}
      </section>
      <section className="space-y-3 rounded-lg border border-slate-200 bg-white p-4">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Add comment</p>
        <Textarea value={props.commentText} onChange={(event) => props.setCommentText(event.target.value)} rows={4} />
        {props.commentErrorText ? <p className="text-sm text-red-600">{props.commentErrorText}</p> : null}
        <Button type="button" onClick={props.onSubmitComment} disabled={props.isSavingComment || props.commentText.trim() === ""}>
          {props.isSavingComment ? "Saving..." : "Post comment"}
        </Button>
      </section>
    </div>
  )
}

function DcxForumSortableHeader<TData>(props: { column: Column<TData, unknown>; title: string }) {
  const isSorted = props.column.getIsSorted()
  return (
    <button type="button" onClick={() => props.column.toggleSorting(isSorted === "asc")} className="inline-flex items-center gap-1 text-left">
      <span>{props.title}</span>
      <span className="text-[0.8rem] text-slate-400">{isSorted ? (isSorted === "asc" ? "↑" : "↓") : "↕"}</span>
    </button>
  )
}
