import { useEffect, useMemo, useState } from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import type { Column, ColumnDef, SortingState } from "@tanstack/react-table"
import {
  RefreshCwIcon,
  SearchIcon,
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

type Props = {
  apiBaseUrl: string
  routeMarketTopicId?: number | null
}

type DcxTopicStatusFilter = "all" | "open" | "closed" | "archived"

export function DcxAppMarketTopicsPage(props: Props) {
  const queryClient = useQueryClient()
  const [selectedMarketTopicId, setSelectedMarketTopicId] = useState<number | null>(null)
  const [topicSearchQuery, setTopicSearchQuery] = useState("")
  const [topicStatusFilter, setTopicStatusFilter] = useState<DcxTopicStatusFilter>("all")
  const [topicSourceFilter, setTopicSourceFilter] = useState("all")
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
    if (props.routeMarketTopicId) {
      setSelectedMarketTopicId(props.routeMarketTopicId)
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

  return (
    <div className="flex h-full min-h-0 flex-col gap-4">
      <ResizablePanelGroup orientation="horizontal" className="min-h-0 flex-1 rounded-lg border bg-white">
        <ResizablePanel defaultSize={50} minSize={38}>
          <div className="h-full overflow-hidden p-4">
            <section className="overflow-hidden border border-black/6 bg-white shadow-[0_18px_55px_-48px_rgba(15,23,42,0.45)]">
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
                    if (typeof window !== "undefined") {
                      window.history.replaceState({}, "", `/me/topics/${row.market_topic_id}`)
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
          </div>
        </ResizablePanel>
        <ResizableHandle withHandle />
        <ResizablePanel defaultSize={50} minSize={30}>
          <div className="h-full overflow-y-auto border-l p-6">
            {!selectedTopic ? (
              <p className="text-sm text-slate-500">{ux.topics_detail_empty ?? "Choose a topic to inspect its seeded AI response."}</p>
            ) : (
              <div className="space-y-6">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">{ux.topics_detail_topic_label ?? "Topic"}</p>
                  <h2 className="mt-2 text-xl font-semibold text-slate-950">{selectedTopic.topic_title || (ux.topics_detail_topic_label ?? "Topic")}</h2>
                  <p className="mt-2 text-sm text-slate-600">{selectedTopic.topic_summary_text}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">{ux.topics_detail_tags_label ?? "Tags"}</p>
                  <p className="mt-1 text-sm text-slate-900">{selectedTopic.topic_tags_json.join(", ") || "—"}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">{ux.topics_detail_opening_ai_response_label ?? "Opening AI response"}</p>
                  <p className="mt-1 whitespace-pre-wrap text-sm text-slate-900">
                    {selectedTopic.turns.find((turn) => turn.turn_role === "assistant")?.turn_text || "—"}
                  </p>
                </div>
              </div>
            )}
          </div>
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  )
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
