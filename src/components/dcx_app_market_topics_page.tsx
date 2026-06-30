import { useEffect, useMemo, useRef, useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import type { Column, ColumnDef, SortingState } from "@tanstack/react-table"
import {
  MailIcon,
  MessageCircleIcon,
  MonitorIcon,
  RefreshCwIcon,
  SearchIcon,
  SendIcon,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { DcxAppDataTable } from "@/components/ui/dcx_app_data_table"
import { Input } from "@/components/ui/input"
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"

import {
  DCX_APP_ACCOUNT_PAGE_DEFAULT_UX_STRINGS,
  formatDcxAppAccountTimestampLabel,
} from "./dcx_app_user_account_shared"
import {
  readDcxAppAuthenticatedUserAccountSummary,
} from "../lib/read_dcx_app_authenticated_user_account_summary"
import {
  readDcxAppAuthenticatedUserMarketTopicsCatalog,
  type DcxAppAuthenticatedUserMarketTopicCatalogRow,
} from "../lib/read_dcx_app_authenticated_user_market_topics_catalog"
import {
  readDcxAppAuthenticatedUserMarketTopicDetail,
} from "../lib/read_dcx_app_authenticated_user_market_topic_detail"
import { setDcxAppAuthenticatedUserMarketTopicVisibility } from "../lib/set_dcx_app_authenticated_user_market_topic_visibility"
import { appendDcxAppAuthenticatedUserMarketTopicAiTurn } from "../lib/append_dcx_app_authenticated_user_market_topic_ai_turn"
import {
  useDcxAppBalancedDesktopSplitMode,
  useDcxAppDetailSheetMode,
} from "./use_dcx_app_master_detail_layout_mode"

type Props = {
  apiBaseUrl: string
  routeMarketTopicId?: number | null
}

type DcxTopicStatusFilter = "all" | "open" | "closed" | "archived"
type DcxTopicVisibilityStatus = "private" | "shareable" | "public"

type DcxPendingMarketTopicAiChatUserTurn = {
  marketTopicId: number
  turnText: string
  createdAtTsMs: number
}

const DCX_TOPIC_VISIBILITY_OPTIONS: Array<{ value: DcxTopicVisibilityStatus; label: string }> = [
  { value: "private", label: "Private" },
  { value: "shareable", label: "Shareable" },
  { value: "public", label: "Public" },
]

export function DcxAppMarketTopicsPage(props: Props) {
  const queryClient = useQueryClient()
  const lastAppliedRouteMarketTopicIdRef = useRef<number | null>(null)
  const [selectedMarketTopicId, setSelectedMarketTopicId] = useState<number | null>(null)
  const [topicSearchQuery, setTopicSearchQuery] = useState("")
  const [topicStatusFilter, setTopicStatusFilter] = useState<DcxTopicStatusFilter>("all")
  const [topicSourceFilter, setTopicSourceFilter] = useState("all")
  const [aiChatDraftText, setAiChatDraftText] = useState("")
  const [pendingAiChatUserTurn, setPendingAiChatUserTurn] = useState<DcxPendingMarketTopicAiChatUserTurn | null>(null)
  const [hasTopicChatReachedContextLimit, setHasTopicChatReachedContextLimit] = useState(false)
  const [isMobileDetailOpen, setIsMobileDetailOpen] = useState(false)
  const isDetailSheetMode = useDcxAppDetailSheetMode()
  const isBalancedDesktopSplitMode = useDcxAppBalancedDesktopSplitMode()
  const [topicSorting, setTopicSorting] = useState<SortingState>([
    { id: "updated", desc: true },
  ])

  const accountSummaryQuery = useQuery({
    queryKey: ["dcx_app_authenticated_user_account_summary"],
    queryFn: async () => readDcxAppAuthenticatedUserAccountSummary({ apiBaseUrl: props.apiBaseUrl }),
  })
  const topicsCatalogQuery = useQuery({
    queryKey: ["dcx_app_authenticated_user_market_topics_catalog"],
    queryFn: async () => readDcxAppAuthenticatedUserMarketTopicsCatalog({ apiBaseUrl: props.apiBaseUrl }),
  })

  const topics = topicsCatalogQuery.data?.data.market_topics ?? []
  const accountSummary = accountSummaryQuery.data?.data ?? null
  const ux = accountSummary?.ux_strings ?? DCX_APP_ACCOUNT_PAGE_DEFAULT_UX_STRINGS
  const selectedTimezoneIanaName = accountSummary?.preferred_timezone?.iana_name ?? null
  const selectedLanguageCode = accountSummary?.preferred_language?.language_code ?? "en"
  const sourceFilterOptions = useMemo(
    () => readDcxTopicSourceFilterOptions(topics),
    [topics],
  )
  const filteredTopics = useMemo(
    () =>
      readDcxTopicsMatchingFilters({
        topics,
        searchQuery: topicSearchQuery,
        statusFilter: topicStatusFilter,
        sourceFilter: topicSourceFilter,
      }),
    [topicSearchQuery, topicSourceFilter, topicStatusFilter, topics],
  )

  useEffect(() => {
    if (
      props.routeMarketTopicId &&
      props.routeMarketTopicId !== lastAppliedRouteMarketTopicIdRef.current
    ) {
      lastAppliedRouteMarketTopicIdRef.current = props.routeMarketTopicId
      setSelectedMarketTopicId(props.routeMarketTopicId)
      setAiChatDraftText("")
      setPendingAiChatUserTurn(null)
      setHasTopicChatReachedContextLimit(false)
    }
  }, [props.routeMarketTopicId])

  useEffect(() => {
    if (props.routeMarketTopicId) {
      return
    }
    if (selectedMarketTopicId !== null) {
      return
    }

    const rawMarketTopicId =
      typeof window !== "undefined"
        ? new URLSearchParams(window.location.search).get("market_topic_id")
        : null
    const parsedMarketTopicId = rawMarketTopicId ? Number.parseInt(rawMarketTopicId, 10) : Number.NaN
    if (Number.isFinite(parsedMarketTopicId) && parsedMarketTopicId > 0) {
      setSelectedMarketTopicId(parsedMarketTopicId)
      return
    }

    if (topics[0]) {
      setSelectedMarketTopicId(topics[0].market_topic_id)
    }
  }, [props.routeMarketTopicId, selectedMarketTopicId, topics])

  const selectedMarketTopicDetailQuery = useQuery({
    queryKey: ["dcx_app_authenticated_user_market_topic_detail", selectedMarketTopicId],
    enabled: typeof selectedMarketTopicId === "number",
    queryFn: async () =>
      readDcxAppAuthenticatedUserMarketTopicDetail({
        apiBaseUrl: props.apiBaseUrl,
        marketTopicId: selectedMarketTopicId as number,
      }),
  })
  const updateMarketTopicVisibilityMutation = useMutation({
    mutationFn: async (params: { marketTopicId: number; visibilityStatus: DcxTopicVisibilityStatus }) =>
      setDcxAppAuthenticatedUserMarketTopicVisibility({
        apiBaseUrl: props.apiBaseUrl,
        marketTopicId: params.marketTopicId,
        visibilityStatus: params.visibilityStatus,
      }),
    onSuccess: async (payload, variables) => {
      queryClient.setQueryData(
        ["dcx_app_authenticated_user_market_topic_detail", variables.marketTopicId],
        payload,
      )
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["dcx_app_authenticated_user_market_topics_catalog"] }),
        queryClient.invalidateQueries({ queryKey: ["dcx_app_market_forum_catalog"] }),
      ])
    },
  })
  const appendMarketTopicAiTurnMutation = useMutation({
    mutationFn: async (params: { marketTopicId: number; turnText: string }) =>
      appendDcxAppAuthenticatedUserMarketTopicAiTurn({
        apiBaseUrl: props.apiBaseUrl,
        marketTopicId: params.marketTopicId,
        turnText: params.turnText,
        languageCode: selectedLanguageCode,
      }),
    onMutate: (variables) => {
      setPendingAiChatUserTurn({
        marketTopicId: variables.marketTopicId,
        turnText: variables.turnText,
        createdAtTsMs: Date.now(),
      })
      setAiChatDraftText("")
    },
    onSuccess: async (payload, variables) => {
      queryClient.setQueryData(
        ["dcx_app_authenticated_user_market_topic_detail", variables.marketTopicId],
        payload,
      )
      setPendingAiChatUserTurn(null)
      setHasTopicChatReachedContextLimit(false)
      await queryClient.invalidateQueries({ queryKey: ["dcx_app_authenticated_user_market_topics_catalog"] })
    },
    onError: (error, variables) => {
      setPendingAiChatUserTurn(null)
      setAiChatDraftText((currentDraftText) => currentDraftText || variables.turnText)
      const errorCode = (error as Error & { code?: string }).code
      if (errorCode === "API_USERS_ME_MARKET_TOPIC_CHAT_CONTEXT_LIMIT_REACHED") {
        setHasTopicChatReachedContextLimit(true)
      }
    },
  })

  const columns = useMemo<Array<ColumnDef<DcxAppAuthenticatedUserMarketTopicCatalogRow>>>(
    () => [
      {
        id: "topic",
        accessorFn: (topic) => topic.topic_title || "Topic",
        header: ({ column }) => <DcxTopicSortableHeader column={column} title={ux.topics_table_column_topic ?? "Topic"} />,
        cell: ({ row }) => (
          <div className="min-w-0">
            <p className="line-clamp-1 font-medium text-slate-950">{row.original.topic_title || (ux.topics_table_column_topic ?? "Topic")}</p>
          </div>
        ),
      },
      {
        id: "tags",
        accessorFn: (topic) => topic.topic_tags_json.join(" "),
        header: ({ column }) => <DcxTopicSortableHeader column={column} title={ux.topics_table_column_tags ?? "Tags"} />,
        cell: ({ row }) => (
          <span className="line-clamp-1 text-sm text-slate-600">
            {readDcxTopicTagsPreview(row.original.topic_tags_json)}
          </span>
        ),
      },
      {
        id: "status",
        accessorFn: (topic) => topic.topic_status,
        header: ({ column }) => <DcxTopicSortableHeader column={column} title={ux.topics_table_column_status ?? "Status"} />,
        cell: ({ row }) => (
          <DcxTopicStatusBadge
            label={readDcxTopicStatusLabel(row.original.topic_status, ux)}
            tone={readDcxTopicStatusTone(row.original.topic_status)}
          />
        ),
      },
      {
        id: "source",
        accessorFn: (topic) => topic.source_channel_type,
        header: ({ column }) => <DcxTopicSortableHeader column={column} title={ux.topics_table_column_source ?? "Source"} />,
        cell: ({ row }) => <DcxTopicStatusBadge label={row.original.source_channel_type} tone="neutral" />,
      },
      {
        id: "updated",
        accessorFn: (topic) => topic.updated_at_ts_ms,
        header: ({ column }) => <DcxTopicSortableHeader column={column} title={ux.topics_table_column_updated ?? "Updated"} />,
        cell: ({ row }) =>
          formatDcxAppAccountTimestampLabel(
            row.original.updated_at_ts_ms,
            selectedLanguageCode,
            selectedTimezoneIanaName,
            "—",
          ),
      },
    ],
    [selectedLanguageCode, selectedTimezoneIanaName, ux],
  )

  const selectedTopic = selectedMarketTopicDetailQuery.data?.data ?? null

  const topicListPanel = (
    <section className="min-w-0 overflow-hidden border border-black/6 bg-white shadow-[0_18px_55px_-48px_rgba(15,23,42,0.45)]">
              <div className="flex flex-col gap-4 border-b border-black/6 px-4 py-3">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                  <label className="relative block w-full lg:flex-1">
                    <SearchIcon className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                    <Input
                      value={topicSearchQuery}
                      onChange={(event) => setTopicSearchQuery(event.target.value)}
                      placeholder={ux.topics_search_placeholder ?? "Search topics..."}
                      className="pl-9"
                    />
                  </label>
                  <div className="flex items-center justify-between gap-3 lg:justify-end">
                    <p className="text-xs text-slate-500">
                      {filteredTopics.length} of {topicsCatalogQuery.data?.data.total_market_topic_count ?? topics.length}
                    </p>
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => window.location.assign("/new/ai")}
                    >
                      <MessageCircleIcon />
                      New AI Chat
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        void queryClient.invalidateQueries({ queryKey: ["dcx_app_authenticated_user_market_topics_catalog"] })
                        if (selectedMarketTopicId !== null) {
                          void queryClient.invalidateQueries({
                            queryKey: ["dcx_app_authenticated_user_market_topic_detail", selectedMarketTopicId],
                          })
                        }
                      }}
                    >
                      <RefreshCwIcon />
                      {ux.refresh_button_label ?? "Refresh"}
                    </Button>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-1 gap-3 border-b border-black/6 px-4 py-3 md:grid-cols-2">
                <Select value={topicStatusFilter} onValueChange={(value) => setTopicStatusFilter(value as DcxTopicStatusFilter)}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder={ux.topics_filter_all_statuses ?? "All statuses"} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{ux.topics_filter_all_statuses ?? "All statuses"}</SelectItem>
                    <SelectItem value="open">{ux.topics_status_open ?? "Open"}</SelectItem>
                    <SelectItem value="closed">{ux.topics_status_closed ?? "Closed"}</SelectItem>
                    <SelectItem value="archived">{ux.topics_status_archived ?? "Archived"}</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={topicSourceFilter} onValueChange={setTopicSourceFilter}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder={ux.topics_filter_all_sources ?? "All sources"} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{ux.topics_filter_all_sources ?? "All sources"}</SelectItem>
                    {sourceFilterOptions.map((sourceOption) => (
                      <SelectItem key={sourceOption.value} value={sourceOption.value}>
                        {sourceOption.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {topicsCatalogQuery.isLoading ? (
                <div className="px-4 py-8">
                  <p className="text-sm text-slate-500">{ux.topics_loading ?? "Loading topics..."}</p>
                </div>
              ) : null}

              {topicsCatalogQuery.isError ? (
                <div className="px-4 py-8">
                  <h3 className="text-base font-semibold text-slate-950">{ux.topics_error_title ?? "Topics could not load"}</h3>
                  <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
                    {(
                      (topicsCatalogQuery.error as Error & { suggested_action?: string })?.suggested_action ??
                      (topicsCatalogQuery.error as Error)?.message
                    ) || (ux.topics_error_suggested_action ?? "Retry after confirming the backend is reachable.")}
                  </p>
                </div>
              ) : null}

              {!topicsCatalogQuery.isLoading && !topicsCatalogQuery.isError ? (
                <DcxAppDataTable
                  columns={columns}
                  data={filteredTopics}
                  tableClassName="[&_td]:py-3"
                  sorting={topicSorting}
                  onSortingChange={setTopicSorting}
                  pageSize={25}
                  onRowClick={(row) => {
                    setSelectedMarketTopicId(row.market_topic_id)
                    setAiChatDraftText("")
                    setPendingAiChatUserTurn(null)
                    setHasTopicChatReachedContextLimit(false)
                    if (typeof window !== "undefined") {
                      window.history.replaceState({}, "", `/ai/chats/${row.market_topic_id}`)
                    }
                    if (isDetailSheetMode) {
                      setIsMobileDetailOpen(true)
                    }
                  }}
                  readRowClassName={(row) => row.market_topic_id === selectedMarketTopicId ? "bg-sky-50 hover:bg-sky-50 ring-1 ring-inset ring-sky-200" : ""}
                  readColumnWidthClassName={(columnId) => {
                    if (columnId === "topic") {
                      return "w-[42%]"
                    }
                    if (columnId === "tags") {
                      return "w-[24%]"
                    }
                    if (columnId === "updated") {
                      return "w-[16%]"
                    }
                    return "w-[9%]"
                  }}
                  emptyLabel={ux.topics_empty ?? "No market topics match these filters."}
                />
              ) : null}
    </section>
  )

  const topicDetailPanel = (
    <aside className="h-full min-w-0 overflow-y-auto border border-black/6 bg-white p-6 shadow-[0_18px_55px_-48px_rgba(15,23,42,0.45)]">
            {!selectedTopic ? (
              <p className="text-sm text-slate-500">{ux.topics_detail_empty ?? "Choose a topic to inspect its seeded AI response."}</p>
            ) : (
              <div className="space-y-6">
                <div>
                  <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
                    <span>{ux.topics_detail_topic_label ?? "Topic"}</span>
                    <span aria-hidden="true">|</span>
                    <button
                      type="button"
                      onClick={() => navigateDcxAppToPath(`/me/messages/${selectedTopic.source_message_id}`)}
                      className="tracking-[0.18em] text-sky-700 transition-colors hover:text-sky-950"
                    >
                      Message {selectedTopic.source_message_id}
                    </button>
                  </p>
                  <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <h2 className="text-xl font-semibold text-slate-950">{selectedTopic.topic_title || (ux.topics_detail_topic_label ?? "Topic")}</h2>
                    <span className="inline-flex w-fit shrink-0 rounded-md border border-sky-200 bg-sky-50 px-2 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-sky-700">
                      #{readDcxMarketTopicReferenceCode(selectedTopic.market_topic_id)}
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-slate-600">{selectedTopic.topic_summary_text}</p>
                  {selectedTopic.source_first_image_attachment ? (
                    <DcxSourceMessageImagePreview
                      apiBaseUrl={props.apiBaseUrl}
                      attachment={selectedTopic.source_first_image_attachment}
                    />
                  ) : null}
                </div>
                <section className="rounded-lg border border-sky-200 bg-white px-4 py-3">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                        {ux.topics_visibility_label ?? "Visibility"}
                      </p>
                      <p className="mt-1 text-sm text-sky-700">
                        {readDcxTopicVisibilityLabel(selectedTopic.visibility_status, ux)}
                      </p>
                    </div>
                    <Select
                      value={(selectedTopic.visibility_status || "private") as DcxTopicVisibilityStatus}
                      onValueChange={(nextVisibilityStatus) => {
                        updateMarketTopicVisibilityMutation.mutate({
                          marketTopicId: selectedTopic.market_topic_id,
                          visibilityStatus: nextVisibilityStatus as DcxTopicVisibilityStatus,
                        })
                      }}
                      disabled={updateMarketTopicVisibilityMutation.isPending}
                    >
                      <SelectTrigger className="w-[170px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {DCX_TOPIC_VISIBILITY_OPTIONS.map((visibilityOption) => (
                          <SelectItem key={visibilityOption.value} value={visibilityOption.value}>
                            {readDcxTopicVisibilityLabel(visibilityOption.value, ux)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  {updateMarketTopicVisibilityMutation.isError ? (
                    <p className="mt-3 text-sm text-red-600">
                      {(
                        updateMarketTopicVisibilityMutation.error as Error & { suggested_action?: string }
                      )?.suggested_action ?? (updateMarketTopicVisibilityMutation.error as Error).message}
                    </p>
                  ) : null}
                </section>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">{ux.topics_detail_tags_label ?? "Tags"}</p>
                  <p className="mt-1 text-sm text-slate-900">{selectedTopic.topic_tags_json.join(", ") || "—"}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">{ux.topics_detail_opening_ai_response_label ?? "AI chat"}</p>
                  <div className="mt-3 space-y-3 rounded-lg border border-slate-200 bg-white p-4">
                    {selectedTopic.turns.length === 0 ? (
                      <p className="text-sm text-slate-500">No AI chat turns yet.</p>
                    ) : (
                      selectedTopic.turns.map((turn) => (
                        <DcxMarketTopicAiChatTurn
                          key={turn.market_topic_turn_id}
                          role={turn.turn_role}
                          text={turn.turn_text}
                          createdAtTsMs={turn.created_at_ts_ms}
                          languageCode={selectedLanguageCode}
                          timezoneIanaName={selectedTimezoneIanaName}
                          turnMetadata={turn.turn_metadata_json}
                        />
                      ))
                    )}
                    {pendingAiChatUserTurn?.marketTopicId === selectedTopic.market_topic_id ? (
                      <>
                        <DcxMarketTopicAiChatTurn
                          role="user"
                          text={pendingAiChatUserTurn.turnText}
                          createdAtTsMs={pendingAiChatUserTurn.createdAtTsMs}
                          languageCode={selectedLanguageCode}
                          timezoneIanaName={selectedTimezoneIanaName}
                          turnMetadata={{ source_channel_type: "app" }}
                        />
                        <DcxMarketTopicAiChatTurn
                          role="assistant"
                          text="DCX AI is thinking..."
                          createdAtTsMs={pendingAiChatUserTurn.createdAtTsMs}
                          languageCode={selectedLanguageCode}
                          timezoneIanaName={selectedTimezoneIanaName}
                          turnMetadata={{}}
                          isPending
                        />
                      </>
                    ) : null}
                  </div>
                  <form
                    className="mt-4 rounded-lg border border-sky-200 bg-white p-4"
                    onSubmit={(event) => {
                      event.preventDefault()
                      const trimmedDraftText = aiChatDraftText.trim()
                      if (trimmedDraftText === "" || appendMarketTopicAiTurnMutation.isPending || hasTopicChatReachedContextLimit) {
                        return
                      }
                      appendMarketTopicAiTurnMutation.mutate({
                        marketTopicId: selectedTopic.market_topic_id,
                        turnText: trimmedDraftText,
                      })
                    }}
                  >
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Ask DCX AI</p>
                    <Textarea
                      value={aiChatDraftText}
                      onChange={(event) => setAiChatDraftText(event.target.value)}
                      rows={4}
                      disabled={appendMarketTopicAiTurnMutation.isPending || hasTopicChatReachedContextLimit}
                      placeholder="Ask a follow-up about this market topic..."
                      className="mt-3"
                    />
                    {appendMarketTopicAiTurnMutation.isError ? (
                      <p className="mt-3 text-sm text-red-600">
                        {(
                          appendMarketTopicAiTurnMutation.error as Error & { suggested_action?: string }
                        )?.suggested_action ?? (appendMarketTopicAiTurnMutation.error as Error).message}
                      </p>
                    ) : null}
                    {hasTopicChatReachedContextLimit ? (
                      <p className="mt-3 text-sm text-amber-700">
                        This MVP chat has reached its context limit. Start a new topic with the latest question.
                      </p>
                    ) : null}
                    <div className="mt-3 flex justify-end">
                      <Button
                        type="submit"
                        disabled={aiChatDraftText.trim() === "" || appendMarketTopicAiTurnMutation.isPending || hasTopicChatReachedContextLimit}
                      >
                        <SendIcon />
                        {appendMarketTopicAiTurnMutation.isPending ? "Thinking..." : "Send"}
                      </Button>
                    </div>
                  </form>
                </div>
              </div>
            )}
    </aside>
  )

  const selectedTopicTitle = selectedTopic?.topic_title || (ux.topics_detail_topic_label ?? "Topic")

  return (
    <section className="flex min-h-[calc(100vh-5rem)] min-w-0 flex-col gap-4 overflow-x-hidden">
      {isDetailSheetMode ? (
        <main className="min-w-0 overflow-x-hidden">{topicListPanel}</main>
      ) : (
        <ResizablePanelGroup
          key={isBalancedDesktopSplitMode ? "balanced-desktop-split" : "wide-desktop-split"}
          orientation="horizontal"
          className="min-h-0 w-full max-w-full flex-1 overflow-hidden"
        >
          <ResizablePanel
            className="min-w-0 overflow-hidden"
            defaultSize={isBalancedDesktopSplitMode ? "50%" : "50%"}
            minSize="42%"
          >
            <div className="h-full min-w-0 overflow-x-hidden pr-2">{topicListPanel}</div>
          </ResizablePanel>
          <ResizableHandle withHandle className="mx-1 bg-transparent" />
          <ResizablePanel
            className="min-w-0 overflow-hidden"
            defaultSize={isBalancedDesktopSplitMode ? "50%" : "50%"}
            minSize={isBalancedDesktopSplitMode ? "50%" : "34%"}
            maxSize="58%"
          >
            <div className="h-full min-w-0 overflow-x-hidden pl-2">{topicDetailPanel}</div>
          </ResizablePanel>
        </ResizablePanelGroup>
      )}

      {isDetailSheetMode ? (
        <Sheet open={isMobileDetailOpen && selectedMarketTopicId !== null} onOpenChange={setIsMobileDetailOpen}>
          <SheetContent className="overflow-x-hidden overflow-y-auto p-0 data-[side=right]:w-[90vw] data-[side=right]:max-w-[90vw] data-[side=right]:sm:max-w-[90vw]">
            <SheetHeader className="sr-only">
              <SheetTitle>{selectedTopicTitle}</SheetTitle>
              <SheetDescription>Market topic detail</SheetDescription>
            </SheetHeader>
            {topicDetailPanel}
          </SheetContent>
        </Sheet>
      ) : null}
    </section>
  )
}

function DcxMarketTopicAiChatTurn(props: {
  role: string
  text: string
  createdAtTsMs: number
  languageCode: string
  timezoneIanaName: string | null
  turnMetadata: Record<string, unknown>
  isPending?: boolean
}) {
  const normalizedRole = props.role.trim().toLowerCase()
  const isAssistant = normalizedRole === "assistant"
  const roleLabel = isAssistant ? "DCX AI" : normalizedRole === "system" ? "System" : "You"
  const sourceMetadata = readDcxMarketTopicTurnSourceMetadata(props.turnMetadata)
  const showSourceIcon = !isAssistant && sourceMetadata.channel !== "app"

  return (
    <article
      className={cn(
        "rounded-lg border px-4 py-3",
        isAssistant ? "border-sky-100 bg-sky-50/60" : "border-slate-200 bg-white",
        props.isPending ? "border-dashed text-slate-500" : "",
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <p className="flex min-w-0 items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
          {showSourceIcon ? (
            <span
              className={cn(
                "inline-flex size-5 shrink-0 items-center justify-center rounded-full border",
                sourceMetadata.className,
              )}
              title={sourceMetadata.label}
              aria-label={sourceMetadata.label}
            >
              <sourceMetadata.Icon className="size-3" aria-hidden="true" />
            </span>
          ) : null}
          <span className="truncate">{roleLabel}</span>
        </p>
        <p className="text-xs text-slate-400">
          {formatDcxAppAccountTimestampLabel(
            props.createdAtTsMs,
            props.languageCode,
            props.timezoneIanaName,
            "—",
          )}
        </p>
      </div>
      <DcxSimpleMarkdownText
        value={props.text}
        className={props.isPending ? "text-slate-500" : "text-slate-900"}
      />
    </article>
  )
}

function readDcxMarketTopicReferenceCode(marketTopicId: number): string {
  return `T${marketTopicId}`
}

function DcxSourceMessageImagePreview(props: {
  apiBaseUrl: string
  attachment: { attachment_url_path: string; original_filename: string }
}) {
  const attachmentUrl = new URL(props.attachment.attachment_url_path, props.apiBaseUrl).toString()
  return (
    <div className="mt-4 overflow-hidden rounded-lg border border-slate-200 bg-slate-50">
      <img
        src={attachmentUrl}
        alt={props.attachment.original_filename || "Source message image"}
        className="block max-h-[360px] w-full object-contain"
      />
    </div>
  )
}

function navigateDcxAppToPath(nextPathname: string) {
  window.history.pushState({}, "", nextPathname)
  window.dispatchEvent(new PopStateEvent("popstate"))
}

function readDcxMarketTopicTurnSourceMetadata(turnMetadata: Record<string, unknown>): {
  channel: "app" | "email" | "whatsapp"
  label: string
  Icon: typeof MonitorIcon
  className: string
} {
  const rawSourceChannelType = turnMetadata.source_channel_type
  const normalizedSourceChannelType =
    typeof rawSourceChannelType === "string" ? rawSourceChannelType.trim().toLowerCase() : "app"
  if (normalizedSourceChannelType === "whatsapp") {
    return {
      channel: "whatsapp",
      label: "WhatsApp",
      Icon: MessageCircleIcon,
      className: "border-emerald-200 bg-emerald-50 text-emerald-700",
    }
  }
  if (normalizedSourceChannelType === "email") {
    return {
      channel: "email",
      label: "Email",
      Icon: MailIcon,
      className: "border-sky-200 bg-sky-50 text-sky-700",
    }
  }
  return {
    channel: "app",
    label: "DCX app",
    Icon: MonitorIcon,
    className: "border-slate-200 bg-slate-50 text-slate-500",
  }
}

type DcxSimpleMarkdownBlock =
  | { kind: "heading"; text: string }
  | { kind: "paragraph"; lines: string[] }
  | { kind: "ordered_list"; items: string[] }
  | { kind: "unordered_list"; items: string[] }

function DcxSimpleMarkdownText(props: { value: string; className?: string }) {
  const markdownBlocks = readDcxSimpleMarkdownBlocks(props.value)

  return (
    <div className={cn("mt-2 space-y-3 text-sm leading-6", props.className)}>
      {markdownBlocks.map((block, blockIndex) => {
        if (block.kind === "heading") {
          return (
            <p key={`heading-${blockIndex}`} className="font-semibold text-inherit">
              <DcxSimpleMarkdownInlineText value={block.text} />
            </p>
          )
        }

        if (block.kind === "ordered_list") {
          return (
            <ol key={`ordered-${blockIndex}`} className="list-decimal space-y-2 pl-5 marker:text-slate-500">
              {block.items.map((item, itemIndex) => (
                <li key={`${itemIndex}-${item}`}>
                  <DcxSimpleMarkdownInlineText value={item} />
                </li>
              ))}
            </ol>
          )
        }

        if (block.kind === "unordered_list") {
          return (
            <ul key={`unordered-${blockIndex}`} className="list-disc space-y-2 pl-5 marker:text-slate-500">
              {block.items.map((item, itemIndex) => (
                <li key={`${itemIndex}-${item}`}>
                  <DcxSimpleMarkdownInlineText value={item} />
                </li>
              ))}
            </ul>
          )
        }

        return (
          <p key={`paragraph-${blockIndex}`} className="whitespace-pre-wrap">
            <DcxSimpleMarkdownInlineText value={block.lines.join(" ")} />
          </p>
        )
      })}
    </div>
  )
}

function DcxSimpleMarkdownInlineText(props: { value: string }) {
  const inlineParts = readDcxSimpleMarkdownInlineParts(props.value)

  return (
    <>
      {inlineParts.map((part, partIndex) => {
        if (part.kind === "link") {
          return (
            <a
              key={`${partIndex}-${part.href}`}
              href={part.href}
              target="_blank"
              rel="noreferrer"
              className="break-all text-sky-700 underline decoration-sky-300 underline-offset-2 hover:text-sky-900"
            >
              {part.text}
            </a>
          )
        }
        if (part.kind === "strong") {
          return (
            <strong key={`${partIndex}-${part.text}`} className="font-semibold text-inherit">
              {part.text}
            </strong>
          )
        }
        return <span key={`${partIndex}-${part.text}`}>{part.text}</span>
      })}
    </>
  )
}

type DcxSimpleMarkdownInlinePart =
  | { kind: "text"; text: string }
  | { kind: "strong"; text: string }
  | { kind: "link"; text: string; href: string }

function readDcxSimpleMarkdownInlineParts(value: string): DcxSimpleMarkdownInlinePart[] {
  const inlineParts: DcxSimpleMarkdownInlinePart[] = []
  let remainingText = value

  while (remainingText.length > 0) {
    const linkStartIndex = remainingText.indexOf("[")
    const strongStartIndex = remainingText.indexOf("**")
    const candidateIndexes = [linkStartIndex, strongStartIndex].filter((index) => index >= 0)
    const nextTokenIndex = candidateIndexes.length > 0 ? Math.min(...candidateIndexes) : -1

    if (nextTokenIndex < 0) {
      inlineParts.push({ kind: "text", text: remainingText })
      break
    }

    if (nextTokenIndex > 0) {
      inlineParts.push({ kind: "text", text: remainingText.slice(0, nextTokenIndex) })
      remainingText = remainingText.slice(nextTokenIndex)
      continue
    }

    if (remainingText.startsWith("[")) {
      const closingLabelIndex = remainingText.indexOf("]")
      if (closingLabelIndex > 1 && remainingText.slice(closingLabelIndex, closingLabelIndex + 2) === "](") {
        const closingHrefIndex = remainingText.indexOf(")", closingLabelIndex + 2)
        if (closingHrefIndex > closingLabelIndex + 2) {
          inlineParts.push({
            kind: "link",
            text: remainingText.slice(1, closingLabelIndex),
            href: remainingText.slice(closingLabelIndex + 2, closingHrefIndex),
          })
          remainingText = remainingText.slice(closingHrefIndex + 1)
          continue
        }
      }
    }

    if (remainingText.startsWith("**")) {
      const closingStrongIndex = remainingText.indexOf("**", 2)
      if (closingStrongIndex > 2) {
        inlineParts.push({ kind: "strong", text: remainingText.slice(2, closingStrongIndex) })
        remainingText = remainingText.slice(closingStrongIndex + 2)
        continue
      }
    }

    inlineParts.push({ kind: "text", text: remainingText[0] })
    remainingText = remainingText.slice(1)
  }

  return inlineParts
}

function readDcxSimpleMarkdownBlocks(value: string): DcxSimpleMarkdownBlock[] {
  const normalizedLines = value
    .replace(/\\r\\n/g, "\n")
    .replace(/\\n/g, "\n")
    .split(/\r?\n/)

  const blocks: DcxSimpleMarkdownBlock[] = []
  let pendingParagraphLines: string[] = []
  let pendingOrderedListItems: string[] = []
  let pendingUnorderedListItems: string[] = []

  function flushPendingBlocks(): void {
    if (pendingParagraphLines.length > 0) {
      blocks.push({ kind: "paragraph", lines: pendingParagraphLines })
      pendingParagraphLines = []
    }
    if (pendingOrderedListItems.length > 0) {
      blocks.push({ kind: "ordered_list", items: pendingOrderedListItems })
      pendingOrderedListItems = []
    }
    if (pendingUnorderedListItems.length > 0) {
      blocks.push({ kind: "unordered_list", items: pendingUnorderedListItems })
      pendingUnorderedListItems = []
    }
  }

  for (const rawLine of normalizedLines) {
    const line = rawLine.trim()
    if (line === "") {
      flushPendingBlocks()
      continue
    }

    const headingMatch = line.match(/^#{1,6}\s+(.+)$/)
    if (headingMatch) {
      flushPendingBlocks()
      blocks.push({ kind: "heading", text: headingMatch[1].trim() })
      continue
    }

    const orderedListMatch = line.match(/^\d+[.)]\s+(.+)$/)
    if (orderedListMatch) {
      if (pendingParagraphLines.length > 0 || pendingUnorderedListItems.length > 0) {
        flushPendingBlocks()
      }
      pendingOrderedListItems.push(orderedListMatch[1].trim())
      continue
    }

    const unorderedListMatch = line.match(/^[-*]\s+(.+)$/)
    if (unorderedListMatch) {
      if (pendingParagraphLines.length > 0 || pendingOrderedListItems.length > 0) {
        flushPendingBlocks()
      }
      pendingUnorderedListItems.push(unorderedListMatch[1].trim())
      continue
    }

    if (pendingOrderedListItems.length > 0 || pendingUnorderedListItems.length > 0) {
      flushPendingBlocks()
    }
    pendingParagraphLines.push(line)
  }

  flushPendingBlocks()
  return blocks.length > 0 ? blocks : [{ kind: "paragraph", lines: [value] }]
}

function DcxTopicSortableHeader<TData>(props: {
  column: Column<TData, unknown>
  title: string
}) {
  const isSorted = props.column.getIsSorted()

  return (
    <button
      type="button"
      onClick={() => props.column.toggleSorting(isSorted === "asc")}
      className="inline-flex items-center gap-1 text-left"
    >
      <span>{props.title}</span>
      <span className="text-[0.8rem] text-slate-400">
        {isSorted ? (isSorted === "asc" ? "↑" : "↓") : "↕"}
      </span>
    </button>
  )
}

function DcxTopicStatusBadge(props: { label: string; tone: "neutral" | "success" | "warning" }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md border px-2 py-1 text-[11px] font-semibold uppercase",
        props.tone === "success" && "border-emerald-200 bg-emerald-50 text-emerald-700",
        props.tone === "warning" && "border-amber-200 bg-amber-50 text-amber-700",
        props.tone === "neutral" && "border-slate-200 bg-slate-50 text-slate-700",
      )}
    >
      {props.label}
    </span>
  )
}

function readDcxTopicSourceFilterOptions(
  topics: DcxAppAuthenticatedUserMarketTopicCatalogRow[],
): Array<{ value: string; label: string }> {
  const seenSources = new Set<string>()

  return topics
    .map((topic) => topic.source_channel_type.trim().toLowerCase())
    .filter((sourceType) => {
      if (sourceType === "" || seenSources.has(sourceType)) {
        return false
      }
      seenSources.add(sourceType)
      return true
    })
    .sort((leftSource, rightSource) => leftSource.localeCompare(rightSource))
    .map((sourceType) => ({
      value: sourceType,
      label: readDcxTopicFriendlyLabel(sourceType),
    }))
}

function readDcxTopicsMatchingFilters(params: {
  topics: DcxAppAuthenticatedUserMarketTopicCatalogRow[]
  searchQuery: string
  statusFilter: DcxTopicStatusFilter
  sourceFilter: string
}): DcxAppAuthenticatedUserMarketTopicCatalogRow[] {
  const normalizedSearchQuery = params.searchQuery.trim().toLowerCase()

  return params.topics.filter((topic) => {
    if (params.statusFilter !== "all" && topic.topic_status !== params.statusFilter) {
      return false
    }
    if (params.sourceFilter !== "all" && topic.source_channel_type.trim().toLowerCase() !== params.sourceFilter) {
      return false
    }
    if (normalizedSearchQuery === "") {
      return true
    }

    const searchableText = [
      topic.topic_title,
      topic.topic_summary_text,
      topic.topic_scope_text,
      topic.topic_status,
      topic.source_channel_type,
      String(topic.source_message_id),
      ...topic.topic_tags_json,
    ]
      .join(" ")
      .toLowerCase()

    return searchableText.includes(normalizedSearchQuery)
  })
}

function readDcxTopicFriendlyLabel(value: string): string {
  const normalizedValue = value.trim()
  return normalizedValue ? normalizedValue.replaceAll("_", " ") : "Not specified"
}

function readDcxTopicStatusLabel(statusValue: string, ux: Record<string, string>): string {
  const normalizedStatusValue = statusValue.trim().toLowerCase()
  if (normalizedStatusValue === "open") {
    return ux.topics_status_open ?? "Open"
  }
  if (normalizedStatusValue === "closed") {
    return ux.topics_status_closed ?? "Closed"
  }
  if (normalizedStatusValue === "archived") {
    return ux.topics_status_archived ?? "Archived"
  }
  return readDcxTopicFriendlyLabel(statusValue)
}

function readDcxTopicVisibilityLabel(visibilityStatus: string, ux: Record<string, string>): string {
  const normalizedVisibilityStatus = visibilityStatus.trim().toLowerCase()
  if (normalizedVisibilityStatus === "private") {
    return ux.topics_visibility_private ?? "Private"
  }
  if (normalizedVisibilityStatus === "shareable") {
    return ux.topics_visibility_shareable ?? "Shareable"
  }
  if (normalizedVisibilityStatus === "public") {
    return ux.topics_visibility_public ?? "Public"
  }
  return ux.topics_visibility_private ?? "Private"
}

function readDcxTopicTagsPreview(tags: string[]): string {
  const normalizedTags = tags
    .map((tag) => tag.trim())
    .filter((tag) => tag !== "")

  if (normalizedTags.length === 0) {
    return "—"
  }
  return normalizedTags.slice(0, 3).join(", ")
}

function readDcxTopicStatusTone(statusValue: string): "neutral" | "success" | "warning" {
  const normalizedStatusValue = statusValue.trim().toLowerCase()
  if (normalizedStatusValue === "open") {
    return "success"
  }
  if (normalizedStatusValue === "closed" || normalizedStatusValue === "archived") {
    return "warning"
  }
  return "neutral"
}
