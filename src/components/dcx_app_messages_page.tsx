/**
 * CONTEXT:
 * First authenticated Messages page for the DCX app.
 * It exists to make the shared contact-message intake pipeline visible to traders across app,
 * WhatsApp, and email messages while keeping the UX compact enough for repeated daily use.
 */
import { useEffect, useMemo, useState } from "react"
import type { ReactNode } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import type { Column, ColumnDef, SortingState } from "@tanstack/react-table"
import {
  ChevronRightIcon,
  LoaderCircleIcon,
  RefreshCwIcon,
  SearchIcon,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { DcxAppDataTable } from "@/components/ui/dcx_app_data_table"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { cn } from "@/lib/utils"
import { DcxCountryFlagIcon } from "./ui/dcx_country_flag_icon"

import { DCX_APP_ACCOUNT_PAGE_DEFAULT_UX_STRINGS, formatDcxAppAccountTimestampLabel } from "./dcx_app_user_account_shared"
import {
  readDcxAppAuthenticatedUserMessageDetail,
  type DcxAppAuthenticatedUserMessageAttachment,
} from "../lib/read_dcx_app_authenticated_user_message_detail"
import {
  readDcxAppAuthenticatedUserMessagesInbox,
  type DcxAppAuthenticatedUserMessage,
} from "../lib/read_dcx_app_authenticated_user_messages_inbox"
import {
  readDcxAppAuthenticatedUserAccountSummary,
  type DcxAppAuthenticatedUserAccountSummary,
} from "../lib/read_dcx_app_authenticated_user_account_summary"
import { readDcxAppLanguageFlagRegionCode } from "../lib/dcx_app_language_flag_options"
import { retryDcxAppAuthenticatedUserMessageAnalysis } from "../lib/retry_dcx_app_authenticated_user_message_analysis"

type DcxMessageFilter = "all" | "text" | "image" | "audio" | "document"
type DcxMessageChannelFilter = "all" | "app" | "whatsapp" | "email"
const DCX_MESSAGE_SUMMARY_DISPLAY_WORD_COUNT_THRESHOLD = 100
const DCX_MESSAGE_ORIGINAL_COLLAPSE_WORD_COUNT_THRESHOLD = 100
type DcxSelectedMessageDetail = Awaited<
  ReturnType<typeof readDcxAppAuthenticatedUserMessageDetail>
>["data"]

type Props = {
  apiBaseUrl: string
  filter: DcxMessageFilter
  workflowKindFilter?: "all" | "trade" | "market_topic" | "other"
  routeMessageId?: number | null
}

export function DcxAppMessagesPage(props: Props) {
  const queryClient = useQueryClient()
  const [selectedMessageId, setSelectedMessageId] = useState<number | null>(null)
  const [messageSearchQuery, setMessageSearchQuery] = useState("")
  const [channelFilter, setChannelFilter] = useState<DcxMessageChannelFilter>("all")
  const [identityFilter, setIdentityFilter] = useState("all")
  const [languageFilter, setLanguageFilter] = useState("all")
  const [isMobileDetailOpen, setIsMobileDetailOpen] = useState(false)
  const isDetailSheetMode = useDcxMessageDetailSheetMode()
  const isBalancedDesktopSplitMode = useDcxMessageBalancedDesktopSplitMode()

  const [messageSorting, setMessageSorting] = useState<SortingState>([
    { id: "received", desc: true },
  ])

  const accountSummaryQuery = useQuery({
    queryKey: ["dcx_app_authenticated_user_account_summary"],
    queryFn: async () =>
      readDcxAppAuthenticatedUserAccountSummary({
        apiBaseUrl: props.apiBaseUrl,
      }),
  })

  const messagesInboxQuery = useQuery({
    queryKey: ["dcx_app_authenticated_user_messages_inbox", props.filter, props.workflowKindFilter ?? "all"],
    queryFn: async () =>
      readDcxAppAuthenticatedUserMessagesInbox({
        apiBaseUrl: props.apiBaseUrl,
        messageFormatFilter: props.filter,
        workflowKindFilter: props.workflowKindFilter ?? "all",
      }),
    refetchInterval: (query) => {
      const inboxMessages = query.state.data?.data.messages ?? []
      return inboxMessages.some((message) => readDcxMessageShouldPoll(message.processing_status, message.analysis_status))
        ? 3000
        : false
    },
  })

  const messages = messagesInboxQuery.data?.data.messages ?? []
  const accountSummary = accountSummaryQuery.data?.data ?? null
  const ux = accountSummary?.ux_strings ?? DCX_APP_ACCOUNT_PAGE_DEFAULT_UX_STRINGS
  const allIdentitiesLabel = readDcxMessageIdentityFilterAllLabel(ux)
  const allFormatsLabel = readDcxMessageFormatFilterAllLabel(ux)
  const selectedTimezoneIanaName = accountSummary?.preferred_timezone?.iana_name ?? null
  const selectedLanguageCode = accountSummary?.preferred_language?.language_code ?? "en"
  const identityFilterOptions = useMemo(
    () => readDcxMessageIdentityFilterOptions(accountSummary),
    [accountSummary],
  )
  const languageFilterOptions = useMemo(
    () => readDcxMessageLanguageFilterOptions(messages),
    [messages],
  )
  const filteredMessages = useMemo(
    () =>
      readDcxMessagesMatchingFilters({
        messages,
        searchQuery: messageSearchQuery,
        channelFilter,
        identityFilter,
        languageFilter,
      }),
    [channelFilter, identityFilter, languageFilter, messageSearchQuery, messages],
  )
  const firstVisibleMessageId = filteredMessages[0]?.message_id ?? null

  useEffect(() => {
    if (!props.routeMessageId) {
      return
    }
    setSelectedMessageId(props.routeMessageId)
  }, [props.routeMessageId])

  const selectedMessageIsVisible =
    selectedMessageId !== null && filteredMessages.some((message) => message.message_id === selectedMessageId)
  const effectiveSelectedMessageId = selectedMessageIsVisible ? selectedMessageId : firstVisibleMessageId

  const selectedMessageDetailQuery = useQuery({
    queryKey: ["dcx_app_authenticated_user_message_detail", effectiveSelectedMessageId],
    enabled: typeof effectiveSelectedMessageId === "number",
    queryFn: async () =>
      readDcxAppAuthenticatedUserMessageDetail({
        apiBaseUrl: props.apiBaseUrl,
        messageId: effectiveSelectedMessageId as number,
      }),
    refetchInterval: (query) => {
      const messageDetail = query.state.data?.data ?? null
      if (!messageDetail) {
        return false
      }
      return readDcxMessageShouldPoll(messageDetail.processing_status, messageDetail.analysis_status)
        ? 3000
        : false
    },
  })

  const retryMessageAnalysisMutation = useMutation({
    mutationFn: async (messageId: number) =>
      retryDcxAppAuthenticatedUserMessageAnalysis({
        apiBaseUrl: props.apiBaseUrl,
        messageId,
      }),
    onSuccess: async (payload, messageId) => {
      queryClient.setQueryData(
        ["dcx_app_authenticated_user_message_detail", messageId],
        payload,
      )
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: ["dcx_app_authenticated_user_messages_inbox"],
        }),
        queryClient.invalidateQueries({
          queryKey: ["dcx_app_authenticated_user_message_detail", messageId],
        }),
        queryClient.invalidateQueries({
          queryKey: ["dcx_app_authenticated_user_trades_catalog"],
        }),
        queryClient.invalidateQueries({
          queryKey: ["dcx_app_authenticated_user_market_topics_catalog"],
        }),
      ])
    },
  })

  const selectedMessage = selectedMessageDetailQuery.data?.data ?? null
  const selectedMessageReceivedLabel = selectedMessage
    ? formatDcxAppAccountTimestampLabel(
        selectedMessage.received_at_ts_ms ?? selectedMessage.created_at_ts_ms,
        selectedLanguageCode,
        selectedTimezoneIanaName,
        "—",
      )
    : "—"
  const selectedMessageTitle = selectedMessage
    ? readDcxSelectedMessageTitle(selectedMessage, ux)
    : ux.messages_detail_title

  const columns = useMemo<Array<ColumnDef<DcxAppAuthenticatedUserMessage>>>(
    () => [
      {
        id: "summary",
        accessorFn: (message) => readDcxInboxMessageTitle(message, ux),
        header: ({ column }) => <DcxMessageSortableHeader column={column} title={ux.messages_table_column_summary} />,
        cell: ({ row }) => {
          return (
            <div className="min-w-0">
              <p className="line-clamp-1 font-medium text-slate-950">
                {readDcxInboxMessageTitle(row.original, ux)}
              </p>
            </div>
          )
        },
      },
      {
        id: "channel",
        accessorFn: (message) => message.channel_type,
        header: ({ column }) => <DcxMessageSortableHeader column={column} title={ux.messages_table_column_channel} />,
        cell: ({ row }) => <DcxInlinePill label={row.original.channel_type} tone="neutral" />,
      },
      {
        id: "format",
        accessorFn: (message) => message.message_format,
        header: ({ column }) => <DcxMessageSortableHeader column={column} title={ux.messages_table_column_format} />,
        cell: ({ row }) => (
          <DcxInlinePill
            label={readDcxMessageFormatLabel(row.original.message_format, ux)}
            tone="neutral"
          />
        ),
      },
      {
        id: "status",
        accessorFn: (message) =>
          readDcxMessageRowStatusSortValue(message),
        header: ({ column }) => <DcxMessageSortableHeader column={column} title={ux.messages_table_column_status} />,
        cell: ({ row }) => (
          <DcxMessageOverallStatusBadge
            processingStatus={row.original.processing_status}
            analysisStatus={row.original.analysis_status}
            analysisMetadataJson={row.original.analysis_metadata_json}
            requiresAttention={readDcxMessageRowNeedsAttention(row.original)}
            uxStrings={ux}
          />
        ),
      },
      {
        id: "received",
        accessorFn: (message) => message.received_at_ts_ms ?? message.created_at_ts_ms,
        header: ({ column }) => <DcxMessageSortableHeader column={column} title={ux.messages_table_column_received} />,
        cell: ({ row }) =>
          formatDcxMessageTableDateLabel(
            row.original.received_at_ts_ms ?? row.original.created_at_ts_ms,
            selectedLanguageCode,
            selectedTimezoneIanaName,
          ),
      },
    ],
    [selectedLanguageCode, selectedTimezoneIanaName, ux],
  )

  const messageErrorText = messagesInboxQuery.isError
    ? (
        (messagesInboxQuery.error as Error & { suggested_action?: string }).suggested_action ??
        (messagesInboxQuery.error as Error).message
      )
    : null
  const selectedMessageDetailErrorText = selectedMessageDetailQuery.isError
    ? (
        (selectedMessageDetailQuery.error as Error & { suggested_action?: string }).suggested_action ??
        (selectedMessageDetailQuery.error as Error).message
      )
    : null

    const messageListPanel = (
      <main className="flex min-w-0 flex-col gap-4 overflow-x-hidden">
      <section className="overflow-hidden border border-black/6 bg-white shadow-[0_18px_55px_-48px_rgba(15,23,42,0.45)]">
        <div className="flex flex-col gap-4 border-b border-black/6 px-4 py-3">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <label className="relative block w-full lg:flex-1">
              <SearchIcon className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
              <Input
                value={messageSearchQuery}
                onChange={(event) => setMessageSearchQuery(event.target.value)}
                placeholder={ux.messages_search_placeholder ?? "Search messages..."}
                className="pl-9"
              />
            </label>
            <div className="flex items-center justify-between gap-3 lg:justify-end">
              <p className="text-xs text-slate-500">
                {filteredMessages.length} of {messagesInboxQuery.data?.data.total_message_count ?? messages.length}
              </p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  void queryClient.invalidateQueries({ queryKey: ["dcx_app_authenticated_user_messages_inbox"] })
                  if (effectiveSelectedMessageId !== null) {
                    void queryClient.invalidateQueries({
                      queryKey: ["dcx_app_authenticated_user_message_detail", effectiveSelectedMessageId],
                    })
                  }
                }}
              >
                <RefreshCwIcon />
                {ux.refresh_button_label}
              </Button>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-1 gap-3 border-b border-black/6 px-4 py-3 md:grid-cols-2 2xl:grid-cols-4">
          <Select value={identityFilter} onValueChange={setIdentityFilter}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder={allIdentitiesLabel} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{allIdentitiesLabel}</SelectItem>
              {identityFilterOptions.map((identityOption) => (
                <SelectItem key={identityOption.value} value={identityOption.value}>
                  {identityOption.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={languageFilter} onValueChange={setLanguageFilter}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder={ux.messages_language_filter_all ?? "All languages"} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{ux.messages_language_filter_all ?? "All languages"}</SelectItem>
              {languageFilterOptions.map((languageOption) => (
                <SelectItem key={languageOption.value} value={languageOption.value}>
                  <span className="inline-flex items-center gap-2">
                    <DcxCountryFlagIcon
                      regionCode={readDcxAppLanguageFlagRegionCode(languageOption.value)}
                      fallbackLabel={languageOption.label}
                      className="h-3 w-5 min-w-5"
                    />
                    <span>{languageOption.label}</span>
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={channelFilter} onValueChange={(value) => setChannelFilter(value as DcxMessageChannelFilter)}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder={ux.messages_channel_filter_all ?? "All channels"} />
            </SelectTrigger>
            <SelectContent>
              {readDcxMessageChannelFilterOptions(ux).map((channelOption) => (
                <SelectItem key={channelOption.value} value={channelOption.value}>
                  {channelOption.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={props.filter} onValueChange={(value) => navigateToDcxMessagesFilter(value as DcxMessageFilter)}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder={allFormatsLabel} />
            </SelectTrigger>
            <SelectContent>
              {readDcxMessageFormatFilterOptions(ux).map((formatOption) => (
                <SelectItem key={formatOption.value} value={formatOption.value}>
                  {formatOption.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {messagesInboxQuery.isLoading ? (
          <div className="px-4 py-8">
            <p className="text-sm text-slate-500">{ux.messages_loading}</p>
          </div>
        ) : null}

        {messagesInboxQuery.isError ? (
          <div className="px-4 py-8">
            <h3 className="text-base font-semibold text-slate-950">{ux.messages_error_title}</h3>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
              {messageErrorText ?? ux.messages_error_suggested_action}
            </p>
          </div>
        ) : null}

        {!messagesInboxQuery.isLoading && !messagesInboxQuery.isError ? (
          <DcxAppDataTable
            columns={columns}
            data={filteredMessages}
            emptyLabel={ux.messages_empty}
            tableClassName="[&_td]:py-3"
            sorting={messageSorting}
            onSortingChange={setMessageSorting}
            pageSize={25}
            onRowClick={(message) => {
              setSelectedMessageId(message.message_id)
              navigateToDcxAppPath(`/me/messages/${message.message_id}`, { replace: true })
              if (isDetailSheetMode) {
                setIsMobileDetailOpen(true)
              }
            }}
            readRowClassName={(message) =>
              message.message_id === effectiveSelectedMessageId
                ? "bg-sky-50/80 hover:bg-sky-50 ring-1 ring-inset ring-sky-200"
                : ""
            }
            readColumnWidthClassName={(columnId) => {
              if (columnId === "summary") {
                return "w-[46%]"
              }
              if (columnId === "received") {
                return "w-[18%]"
              }
              return "w-[12%]"
            }}
          />
        ) : null}
      </section>
    </main>
  )

    const messageDetailPanel = (
    <aside className="w-full max-w-full min-w-0 overflow-x-hidden border border-black/6 bg-white shadow-[0_18px_55px_-48px_rgba(15,23,42,0.45)] xl:max-h-[calc(100vh-6rem)] xl:overflow-y-auto">
      <DcxMessageDetailInspector
        apiBaseUrl={props.apiBaseUrl}
        effectiveSelectedMessageId={effectiveSelectedMessageId}
        isLoading={selectedMessageDetailQuery.isLoading}
        errorText={selectedMessageDetailErrorText}
        retryAnalysisErrorText={
          retryMessageAnalysisMutation.isError
            ? (
                (retryMessageAnalysisMutation.error as Error & { suggested_action?: string }).suggested_action ??
                (retryMessageAnalysisMutation.error as Error).message
              )
            : null
        }
        isRetryAnalysisPending={retryMessageAnalysisMutation.isPending}
        onRetryAnalysis={(messageId) => retryMessageAnalysisMutation.mutate(messageId)}
        selectedMessage={selectedMessage}
        selectedMessageTitle={selectedMessageTitle}
        selectedMessageReceivedLabel={selectedMessageReceivedLabel}
        ux={ux}
      />
    </aside>
  )

    return (
      <section className="flex min-h-[calc(100vh-5rem)] min-w-0 flex-col gap-4 overflow-x-hidden text-slate-950">
      {isDetailSheetMode ? (
        messageListPanel
      ) : (
          <ResizablePanelGroup
            key={isBalancedDesktopSplitMode ? "balanced-desktop-split" : "wide-desktop-split"}
            orientation="horizontal"
            className="min-h-0 w-full max-w-full flex-1 overflow-hidden"
          >
            <ResizablePanel
              className="min-w-0 overflow-hidden"
              defaultSize={isBalancedDesktopSplitMode ? "50%" : "72%"}
              minSize="50%"
            >
              <div className="h-full min-w-0 overflow-x-hidden pr-2">
                {messageListPanel}
              </div>
            </ResizablePanel>
            <ResizableHandle withHandle className="mx-1 bg-transparent" />
            <ResizablePanel
              className="min-w-0 overflow-hidden"
              defaultSize={isBalancedDesktopSplitMode ? "50%" : "28%"}
              minSize={isBalancedDesktopSplitMode ? "50%" : "22%"}
              maxSize="50%"
            >
              <div className="h-full min-w-0 overflow-x-hidden pl-2">
                {messageDetailPanel}
              </div>
            </ResizablePanel>
        </ResizablePanelGroup>
      )}

      {isDetailSheetMode ? (
        <Sheet open={isMobileDetailOpen && effectiveSelectedMessageId !== null} onOpenChange={setIsMobileDetailOpen}>
          <SheetContent className="overflow-x-hidden overflow-y-auto p-0 data-[side=right]:w-[90vw] data-[side=right]:max-w-[90vw] data-[side=right]:sm:max-w-[90vw]">
            <SheetHeader className="sr-only">
              <SheetTitle>{selectedMessageTitle}</SheetTitle>
              <SheetDescription>{ux.messages_detail_empty}</SheetDescription>
            </SheetHeader>
              <DcxMessageDetailInspector
                apiBaseUrl={props.apiBaseUrl}
                effectiveSelectedMessageId={effectiveSelectedMessageId}
                isLoading={selectedMessageDetailQuery.isLoading}
                errorText={selectedMessageDetailErrorText}
                retryAnalysisErrorText={
                  retryMessageAnalysisMutation.isError
                    ? (
                        (retryMessageAnalysisMutation.error as Error & { suggested_action?: string }).suggested_action ??
                        (retryMessageAnalysisMutation.error as Error).message
                      )
                    : null
                }
                isRetryAnalysisPending={retryMessageAnalysisMutation.isPending}
                onRetryAnalysis={(messageId) => retryMessageAnalysisMutation.mutate(messageId)}
                selectedMessage={selectedMessage}
                selectedMessageTitle={selectedMessageTitle}
                selectedMessageReceivedLabel={selectedMessageReceivedLabel}
                ux={ux}
              />
          </SheetContent>
        </Sheet>
      ) : null}
    </section>
  )
}

function useDcxMessageDetailSheetMode(): boolean {
  const [isSheetMode, setIsSheetMode] = useState(() => {
    if (typeof window === "undefined") {
      return false
    }
    return window.matchMedia("(max-width: 1279px)").matches
  })

  useEffect(() => {
    if (typeof window === "undefined") {
      return
    }

    const mediaQuery = window.matchMedia("(max-width: 1279px)")
    const updateSheetMode = () => setIsSheetMode(mediaQuery.matches)

    updateSheetMode()
    mediaQuery.addEventListener("change", updateSheetMode)

    return () => mediaQuery.removeEventListener("change", updateSheetMode)
  }, [])

  return isSheetMode
}

function useDcxMessageBalancedDesktopSplitMode(): boolean {
  const [isBalancedSplitMode, setIsBalancedSplitMode] = useState(() => {
    if (typeof window === "undefined") {
      return false
    }
    return window.matchMedia("(min-width: 1280px) and (max-width: 1599px)").matches
  })

  useEffect(() => {
    if (typeof window === "undefined") {
      return
    }

    const mediaQuery = window.matchMedia("(min-width: 1280px) and (max-width: 1599px)")
    const updateBalancedSplitMode = () => setIsBalancedSplitMode(mediaQuery.matches)

    updateBalancedSplitMode()
    mediaQuery.addEventListener("change", updateBalancedSplitMode)

    return () => mediaQuery.removeEventListener("change", updateBalancedSplitMode)
  }, [])

  return isBalancedSplitMode
}

function formatDcxMessageTableDateLabel(
  timestampMs: number | null,
  languageCode: string,
  preferredTimezoneIanaName: string | null,
): string {
  if (typeof timestampMs !== "number") {
    return "—"
  }

  return new Intl.DateTimeFormat(readDcxMessagesTableDateLocale(languageCode), {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
    timeZone: preferredTimezoneIanaName ?? undefined,
  }).format(new Date(timestampMs))
}

function readDcxMessagesTableDateLocale(languageCode: string): string {
  if (languageCode.toLowerCase().startsWith("en")) {
    return "en-GB"
  }

  return languageCode
}

function readDcxMessageFormatFilterOptions(
  uxStrings: Record<string, string>,
): Array<{ value: DcxMessageFilter; label: string }> {
  return [
    { value: "all", label: readDcxMessageFormatFilterAllLabel(uxStrings) },
    { value: "text", label: uxStrings.messages_filter_text },
    { value: "image", label: uxStrings.messages_filter_image },
    { value: "audio", label: uxStrings.messages_filter_audio },
    { value: "document", label: uxStrings.messages_filter_document },
  ]
}

function readDcxMessageChannelFilterOptions(
  uxStrings: Record<string, string>,
): Array<{ value: DcxMessageChannelFilter; label: string }> {
  return [
    { value: "all", label: uxStrings.messages_channel_filter_all ?? "All channels" },
    { value: "app", label: uxStrings.messages_channel_filter_app ?? "Web app" },
    { value: "whatsapp", label: uxStrings.messages_channel_filter_whatsapp ?? "WhatsApp" },
    { value: "email", label: uxStrings.messages_channel_filter_email ?? "Email" },
  ]
}

function DcxMessageDetailInspector(props: {
  apiBaseUrl: string
  effectiveSelectedMessageId: number | null
  isLoading: boolean
  errorText: string | null
  retryAnalysisErrorText: string | null
  isRetryAnalysisPending: boolean
  onRetryAnalysis: (messageId: number) => void
  selectedMessage: DcxSelectedMessageDetail | null
  selectedMessageTitle: string
  selectedMessageReceivedLabel: string
  ux: Record<string, string>
}) {
  const hasProhibitedContent = Boolean(
    props.selectedMessage &&
      readDcxMessageHasProhibitedContent(props.selectedMessage.analysis_metadata_json),
  )
  const selectedMessageRawWordCount = props.selectedMessage
    ? countDcxWords(props.selectedMessage.raw_text_content)
    : 0
  const shouldShowMessageSummary = Boolean(
    props.selectedMessage &&
      !hasProhibitedContent &&
      props.selectedMessage.analysis_summary_text.trim() !== "" &&
      (
        props.selectedMessage.attachments.length > 0 ||
        props.selectedMessage.message_subject.trim() !== "" ||
        selectedMessageRawWordCount >= DCX_MESSAGE_SUMMARY_DISPLAY_WORD_COUNT_THRESHOLD
      ),
  )
  const shouldShowMessageRawText = Boolean(
    props.selectedMessage &&
      !hasProhibitedContent &&
      props.selectedMessage.raw_text_content.trim() !== "",
  )
  const shouldShowMessageSynthesis = Boolean(
    props.selectedMessage &&
      !hasProhibitedContent &&
      props.selectedMessage.derived_text_content.trim() !== "",
  )
  const shouldShowAttachments = Boolean(
    props.selectedMessage &&
      !hasProhibitedContent &&
      props.selectedMessage.attachments.length > 0,
  )
  const hasFailedAnalysis = Boolean(
    props.selectedMessage &&
      !hasProhibitedContent &&
      readDcxMessageHasFailedAnalysis(
        props.selectedMessage.processing_status,
        props.selectedMessage.analysis_status,
      ),
  )
  const hasIncompleteWorkflowProjection = Boolean(
    props.selectedMessage &&
      !hasProhibitedContent &&
      props.selectedMessage.workflow_classification_status !== "completed",
  )

  const detailStatusBadge = props.selectedMessage
    ? readDcxMessageOverallStatusVisual(
        props.selectedMessage.processing_status,
        props.selectedMessage.analysis_status,
        props.selectedMessage.analysis_metadata_json,
        props.ux,
      )
    : null

  return (
    <div className="w-full max-w-full min-w-0 overflow-x-hidden">
      <div className="border-b border-black/6 px-5 py-4">
        <div className="flex flex-col gap-2 pr-8 xl:pr-0">
          <div className="min-w-0">
            <h3 className="line-clamp-2 break-words text-lg font-semibold text-slate-950">{props.selectedMessageTitle}</h3>
          </div>
          <div className="min-w-0">
            {props.selectedMessage ? (
              <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-xs text-slate-500">
                <span>{props.selectedMessageReceivedLabel}</span>
                <DcxCompactMetaPill label={props.selectedMessage.channel_type} />
                <DcxCompactMetaPill
                  label={readDcxMessageFormatLabel(props.selectedMessage.message_format, props.ux)}
                />
                {detailStatusBadge ? (
                  <DcxMessageOverallStatusBadge
                    processingStatus={props.selectedMessage.processing_status}
                    analysisStatus={props.selectedMessage.analysis_status}
                    analysisMetadataJson={props.selectedMessage.analysis_metadata_json}
                    uxStrings={props.ux}
                  />
                ) : null}
                {props.selectedMessage.detected_language_code ? (
                  <DcxLanguageFlagBadge
                    languageCode={props.selectedMessage.detected_language_code}
                    showLabel={false}
                  />
                ) : null}
              </div>
            ) : null}
            {props.selectedMessage?.analysis_model_name.trim() ? (
              <p className="mt-2 text-xs text-slate-500">
                {props.ux.messages_detail_analysis_model_label ?? "Analysis model"}:{" "}
                <span className="font-medium text-slate-700">
                  {props.selectedMessage.analysis_model_name}
                </span>
              </p>
            ) : null}
          </div>
        </div>
      </div>

      <div className="px-5 py-4">
        {!props.effectiveSelectedMessageId ? (
          <p className="text-sm text-slate-500">{props.ux.messages_detail_empty}</p>
        ) : null}

        {props.isLoading && props.effectiveSelectedMessageId ? (
          <p className="text-sm text-slate-500">{props.ux.messages_loading}</p>
        ) : null}

        {props.errorText ? (
          <p className="text-sm text-red-600">
            {props.errorText ?? props.ux.messages_error_suggested_action}
          </p>
        ) : null}

        {props.selectedMessage ? (
          <div className="space-y-5">
            {hasProhibitedContent ? (
              <div className="rounded-lg border border-red-200 bg-red-50/70 px-4 py-3">
                <p className="text-sm font-medium text-red-950">
                  {props.ux.messages_detail_prohibited_title ?? "Prohibited content"}
                </p>
                <p className="mt-1 text-sm leading-6 text-red-900">
                  {readDcxProhibitedContentReasonSummary(
                    props.selectedMessage.analysis_metadata_json,
                    props.ux,
                  )}
                </p>
                {readDcxProhibitedContentReasonCodes(props.selectedMessage.analysis_metadata_json).length > 0 ? (
                  <div className="mt-3 space-y-2">
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-red-900/80">
                      {props.ux.messages_detail_prohibited_reasons_label ?? "Reasons"}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {readDcxProhibitedContentReasonCodes(props.selectedMessage.analysis_metadata_json).map((reasonCode) => (
                        <DcxInlinePill key={reasonCode} label={reasonCode} tone="danger" />
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>
            ) : null}

            {hasFailedAnalysis ? (
              <div className="rounded-lg border border-amber-200 bg-amber-50/70 px-4 py-3">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-amber-950">
                      {props.ux.messages_detail_analysis_failed_title ?? "LLM call failed."}
                    </p>
                    <p className="mt-1 text-sm leading-6 text-amber-900">
                      {props.ux.messages_detail_analysis_failed_body ??
                        "The message was received, but the AI analysis step did not complete. Please retry."}
                    </p>
                    {props.retryAnalysisErrorText ? (
                      <p className="mt-2 text-sm text-red-700">
                        {props.retryAnalysisErrorText}
                      </p>
                    ) : null}
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="border-amber-300 bg-white text-amber-950 hover:bg-amber-100"
                    disabled={props.isRetryAnalysisPending}
                    onClick={() => props.onRetryAnalysis(props.selectedMessage!.message_id)}
                  >
                    {props.isRetryAnalysisPending ? (
                      <LoaderCircleIcon className="size-4 animate-spin" />
                    ) : null}
                    {props.isRetryAnalysisPending
                      ? (props.ux.messages_detail_retry_analysis_pending ?? "Retrying...")
                      : (props.ux.messages_detail_retry_analysis_button ?? "Retry analysis")}
                  </Button>
                </div>
              </div>
            ) : null}

            {hasIncompleteWorkflowProjection && !hasFailedAnalysis ? (
              <div className="rounded-lg border border-amber-200 bg-amber-50/70 px-4 py-3">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-amber-950">
                      Workflow review needed.
                    </p>
                    <p className="mt-1 text-sm leading-6 text-amber-900">
                      This message is stored, but it still needs to be reviewed through the new trade/topic workflow pass.
                    </p>
                    {props.retryAnalysisErrorText ? (
                      <p className="mt-2 text-sm text-red-700">
                        {props.retryAnalysisErrorText}
                      </p>
                    ) : null}
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="border-amber-300 bg-white text-amber-950 hover:bg-amber-100"
                    disabled={props.isRetryAnalysisPending}
                    onClick={() => props.onRetryAnalysis(props.selectedMessage!.message_id)}
                  >
                    {props.isRetryAnalysisPending ? (
                      <LoaderCircleIcon className="size-4 animate-spin" />
                    ) : null}
                    {props.isRetryAnalysisPending
                      ? (props.ux.messages_detail_retry_analysis_pending ?? "Retrying...")
                      : (props.ux.messages_workflow_retry_button ?? "Retry workflow processing")}
                  </Button>
                </div>
              </div>
            ) : null}

            {props.selectedMessage.workflow_items.length > 0 ? (
              <DcxMessageWorkflowItemsPanel
                workflowItems={props.selectedMessage.workflow_items}
                linkedTrades={props.selectedMessage.linked_trades}
                linkedMarketTopics={props.selectedMessage.linked_market_topics}
                ux={props.ux}
              />
            ) : null}

            {shouldShowMessageSummary ? (
              <DcxMessageDetailBlock
                label={props.ux.messages_detail_summary}
                value={props.selectedMessage.analysis_summary_text}
              />
            ) : null}

            {shouldShowMessageSynthesis ? (
              <DcxCollapsibleMessageDetailBlock
                label={readDcxMessageSynthesisLabel(props.ux)}
                value={props.selectedMessage.derived_text_content}
                collapseWordCountThreshold={0}
                uxStrings={props.ux}
              />
            ) : null}

            {shouldShowMessageRawText ? (
              <DcxCollapsibleMessageDetailBlock
                label={readDcxMessageOriginalLabel(props.ux)}
                value={props.selectedMessage.raw_text_content}
                collapseWordCountThreshold={
                  shouldShowMessageSummary
                    ? 0
                    : DCX_MESSAGE_ORIGINAL_COLLAPSE_WORD_COUNT_THRESHOLD
                }
                uxStrings={props.ux}
              />
            ) : null}

            {!hasProhibitedContent && shouldShowAttachments ? (
              <DcxMessageAttachmentsPanel
                apiBaseUrl={props.apiBaseUrl}
                attachments={props.selectedMessage.attachments}
                emptyLabel={props.ux.messages_detail_attachments_empty}
                label={props.ux.messages_detail_attachments}
                defaultOpen={false}
                uxStrings={props.ux}
              />
            ) : !hasProhibitedContent ? (
              <DcxMessageAttachmentsPanel
                apiBaseUrl={props.apiBaseUrl}
                attachments={props.selectedMessage.attachments}
                emptyLabel={props.ux.messages_detail_attachments_empty}
                label={props.ux.messages_detail_attachments}
                defaultOpen
                uxStrings={props.ux}
              />
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  )
}

function DcxMessageSortableHeader<TData>(props: {
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

function DcxInlinePill(props: {
  label: string
  tone: "neutral" | "success" | "warning" | "danger"
  icon?: ReactNode
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-md border px-2 py-1 text-[11px] font-semibold uppercase",
        props.tone === "success" && "border-emerald-200 bg-emerald-50 text-emerald-700",
        props.tone === "warning" && "border-amber-200 bg-amber-50 text-amber-700",
        props.tone === "danger" && "border-red-200 bg-red-50 text-red-700",
        props.tone === "neutral" && "border-slate-200 bg-slate-50 text-slate-700",
      )}
    >
      {props.icon}
      {props.label}
    </span>
  )
}

function DcxCompactMetaPill(props: {
  label: string
  icon?: ReactNode
}) {
  return (
    <span className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-700">
      {props.icon}
      {props.label}
    </span>
  )
}

function DcxMessageOverallStatusBadge(props: {
  processingStatus: string
  analysisStatus: string
  analysisMetadataJson: Record<string, unknown>
  requiresAttention?: boolean
  uxStrings: Record<string, string>
}) {
  const visual = readDcxMessageOverallStatusVisual(
    props.processingStatus,
    props.analysisStatus,
    props.analysisMetadataJson,
    props.uxStrings,
  )

  if (visual.kind === "success" && props.requiresAttention) {
    return (
      <span
        title="Action needed"
        aria-label="Action needed"
        className="inline-flex h-[1.125rem] w-[1.125rem] items-center justify-center rounded-full border border-amber-400 bg-white text-[11px] font-semibold text-amber-500"
      >
        !
      </span>
    )
  }

  if (visual.kind === "success") {
    return (
      <span
        title={visual.title}
        aria-label={visual.title}
        className="inline-flex h-[1.125rem] w-[1.125rem] items-center justify-center rounded-full border border-emerald-500 bg-emerald-500 text-[11px] font-semibold text-white"
      >
        ✓
      </span>
    )
  }

  if (visual.kind === "processing") {
    return (
      <span
        title={visual.title}
        aria-label={visual.title}
        className="inline-flex h-[1.125rem] w-[1.125rem] items-center justify-center rounded-full border border-amber-400 bg-white text-amber-500"
      >
        <LoaderCircleIcon className="size-3 animate-spin" />
      </span>
    )
  }

  return (
    <span
      title={visual.title}
      aria-label={visual.title}
      className="inline-flex h-[1.125rem] w-[1.125rem] items-center justify-center rounded-full border border-red-400 bg-white text-[11px] font-semibold text-red-500"
    >
      ×
    </span>
  )
}

function DcxMessageDetailBlock(props: { label: string; value: string }) {
  const markdownListItems = readDcxSimpleMarkdownBulletItems(props.value)

  return (
    <section className="w-full max-w-full min-w-0 border-t border-black/6 pt-4">
      <h4 className="text-xs font-semibold uppercase text-slate-500">{props.label}</h4>
      <DcxMessageDetailValue value={props.value} markdownListItems={markdownListItems} />
    </section>
  )
}

function DcxCollapsibleMessageDetailBlock(props: {
  label: string
  value: string
  collapseWordCountThreshold: number
  defaultOpen?: boolean
  uxStrings?: Record<string, string>
}) {
  const valueWordCount = countDcxWords(props.value)
  const isCollapsible = valueWordCount > props.collapseWordCountThreshold
  const [isOpen, setIsOpen] = useState(props.defaultOpen ?? !isCollapsible)
  const markdownListItems = readDcxSimpleMarkdownBulletItems(props.value)

  if (!isCollapsible) {
    return <DcxMessageDetailBlock label={props.label} value={props.value} />
  }

  return (
    <section className="min-w-0 border-t border-black/6 pt-4">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <button
            type="button"
            className="flex w-full items-center justify-between gap-3 text-left"
          >
            <h4 className="text-xs font-semibold uppercase text-slate-500">{props.label}</h4>
            <span className="inline-flex items-center gap-1 text-xs text-slate-400">
              <span>{isOpen ? (props.uxStrings?.messages_toggle_hide ?? "Hide") : (props.uxStrings?.messages_toggle_show ?? "Show")}</span>
              <ChevronRightIcon className={cn("size-4 transition-transform", isOpen && "rotate-90")} />
            </span>
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <DcxMessageDetailValue value={props.value} markdownListItems={markdownListItems} />
        </CollapsibleContent>
      </Collapsible>
    </section>
  )
}

function DcxMessageDetailValue(props: {
  value: string
  markdownListItems?: string[]
}) {
  if (props.markdownListItems && props.markdownListItems.length > 0) {
    return (
      <ul className="mt-2 list-disc space-y-2 pl-5 text-sm leading-6 text-slate-900 marker:text-slate-500">
        {props.markdownListItems.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    )
  }

  return (
    <p className="mt-2 w-full whitespace-pre-wrap break-words text-sm leading-6 text-slate-900">
      {props.value}
    </p>
  )
}

function DcxMessageWorkflowItemsPanel(props: {
  workflowItems: DcxSelectedMessageDetail["workflow_items"]
  linkedTrades: DcxSelectedMessageDetail["linked_trades"]
  linkedMarketTopics: DcxSelectedMessageDetail["linked_market_topics"]
  ux: Record<string, string>
}) {
  return (
    <section className="w-full max-w-full min-w-0 border-t border-black/6 pt-4">
      <h4 className="text-xs font-semibold uppercase text-slate-500">
        {props.ux.messages_workflow_items_label ?? "Workflow items"}
      </h4>
      <div className="mt-3 space-y-3">
        {props.workflowItems.map((workflowItem) => {
          const linkedTrade = props.linkedTrades.find(
            (trade) => trade.source_workflow_item_id === workflowItem.workflow_item_id,
          )
          const linkedMarketTopic = props.linkedMarketTopics.find(
            (marketTopic) => marketTopic.source_workflow_item_id === workflowItem.workflow_item_id,
          )

          return (
            <div key={workflowItem.workflow_item_id} className="rounded-lg border border-slate-200 bg-slate-50/70 px-4 py-3">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-slate-950">
                    {workflowItem.item_title || (props.ux.messages_workflow_item_fallback ?? "Workflow item")}
                  </p>
                  <p className="mt-1 text-sm leading-6 text-slate-600">
                    {workflowItem.item_summary_text || workflowItem.source_excerpt_text || "—"}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <DcxInlinePill
                      label={workflowItem.item_kind.replaceAll("_", " ")}
                      tone={workflowItem.requires_user_attention ? "warning" : "neutral"}
                    />
                    <DcxInlinePill
                      label={workflowItem.item_status.replaceAll("_", " ")}
                      tone={workflowItem.item_status === "failed" ? "danger" : "neutral"}
                    />
                    {workflowItem.requires_user_attention ? (
                      <DcxInlinePill label={props.ux.messages_workflow_action_needed_label ?? "Action needed"} tone="warning" />
                    ) : null}
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {linkedTrade ? (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => navigateToDcxAppPath(`/trades/objects/${linkedTrade.trade_id}`)}
                    >
                      {props.ux.messages_workflow_open_trade ?? "Open trade"}
                    </Button>
                  ) : null}
                  {linkedMarketTopic ? (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => navigateToDcxAppPath(`/me/topics/${linkedMarketTopic.market_topic_id}`)}
                    >
                      {props.ux.messages_workflow_open_topic ?? "Open topic"}
                    </Button>
                  ) : null}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}

function readDcxMessageSynthesisLabel(uxStrings: Record<string, string>): string {
  const configuredLabel = uxStrings.messages_detail_derived_text
  if (!configuredLabel || configuredLabel === "Derived text") {
    return "Synthesis"
  }
  return configuredLabel
}

function readDcxMessageOriginalLabel(uxStrings: Record<string, string>): string {
  const configuredLabel = uxStrings.messages_detail_raw_text
  if (!configuredLabel || configuredLabel === "Raw text") {
    return "Original"
  }
  return configuredLabel
}

function readDcxMessageIdentityFilterAllLabel(uxStrings: Record<string, string>): string {
  const configuredLabel = uxStrings.messages_identity_filter_all
  if (
    !configuredLabel ||
    configuredLabel === "All verified identities" ||
    configuredLabel === "All origins"
  ) {
    return "All identities"
  }
  return configuredLabel
}

function readDcxMessageFormatFilterAllLabel(uxStrings: Record<string, string>): string {
  const configuredLabel = uxStrings.messages_filter_all
  if (!configuredLabel || configuredLabel === "All") {
    return "All formats"
  }
  return configuredLabel
}

function DcxMessageAttachmentsPanel(props: {
  apiBaseUrl: string
  attachments: DcxAppAuthenticatedUserMessageAttachment[]
  defaultOpen: boolean
  emptyLabel: string
  label: string
  uxStrings: Record<string, string>
}) {
  const [isOpen, setIsOpen] = useState(props.defaultOpen)

  return (
    <section className="min-w-0 border-t border-black/6 pt-4">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <button
            type="button"
            className="flex w-full items-center justify-between gap-3 text-left"
          >
            <h4 className="text-xs font-semibold uppercase text-slate-500">
              {props.attachments.length > 0 ? `${props.label} (${props.attachments.length})` : props.label}
            </h4>
            <span className="inline-flex items-center gap-1 text-xs text-slate-400">
              {props.attachments.length > 0 ? (
                <span>{isOpen ? props.uxStrings.messages_toggle_hide ?? "Hide" : props.uxStrings.messages_toggle_show ?? "Show"}</span>
              ) : null}
              {props.attachments.length > 0 ? (
                <ChevronRightIcon className={cn("size-4 transition-transform", isOpen && "rotate-90")} />
              ) : null}
            </span>
          </button>
        </CollapsibleTrigger>
          <CollapsibleContent className="w-full max-w-full overflow-x-hidden">
            {props.attachments.length === 0 ? (
              <p className="mt-2 text-sm leading-6 text-slate-500">{props.emptyLabel}</p>
            ) : (
              <div className="mt-3 w-full max-w-full min-w-0 overflow-x-hidden space-y-3 border-l border-slate-200 pl-3">
                {props.attachments.map((attachment) => (
                  <DcxMessageAttachmentCard
                  key={attachment.attachment_id}
                  apiBaseUrl={props.apiBaseUrl}
                  attachment={attachment}
                  uxStrings={props.uxStrings}
                />
              ))}
            </div>
          )}
        </CollapsibleContent>
      </Collapsible>
    </section>
  )
}

function DcxMessageAttachmentCard(props: {
  apiBaseUrl: string
  attachment: DcxAppAuthenticatedUserMessageAttachment
  uxStrings: Record<string, string>
}) {
  const attachmentUrl = new URL(props.attachment.attachment_url_path, props.apiBaseUrl).toString()
  const [isOpen, setIsOpen] = useState(false)
  const attachmentDisplayTitle = readDcxAttachmentDisplayTitle({
    originalFilename: props.attachment.original_filename,
    analysisSummaryText: props.attachment.analysis_summary_text,
    fileKind: props.attachment.file_kind,
    uxStrings: props.uxStrings,
  })
  const attachmentCollapsedCardTitle = readDcxAttachmentCollapsedCardTitle(
    attachmentDisplayTitle,
  )
  const attachmentLanguageCode = props.attachment.detected_language_code?.trim().toLowerCase() ?? ""
  const attachmentLanguageLabel = attachmentLanguageCode !== ""
    ? attachmentLanguageCode.toUpperCase()
    : null

  return (
    <article className="w-full max-w-full min-w-0 overflow-hidden rounded-lg border border-slate-200 bg-slate-100/70 shadow-[0_8px_24px_-22px_rgba(15,23,42,0.35)]">
        <Collapsible open={isOpen} onOpenChange={setIsOpen}>
          <CollapsibleTrigger asChild>
            <button
              type="button"
              className="flex w-full min-w-0 items-start justify-between gap-3 px-3 py-2 text-left transition-colors hover:bg-slate-50/70"
            >
              <div className="min-w-0 flex-1">
                <p className="max-w-full truncate text-sm font-medium text-slate-950">
                  {attachmentCollapsedCardTitle}
                </p>
                <div className="mt-1 flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
                <DcxCompactMetaPill
                  label={readDcxMessageFormatLabel(props.attachment.file_kind, props.uxStrings)}
                />
                {typeof props.attachment.file_size_bytes === "number" ? (
                  <span>{formatDcxFileSizeLabel(props.attachment.file_size_bytes)}</span>
                ) : null}
                <a
                  href={attachmentUrl}
                  target="_blank"
                  rel="noreferrer"
                  onClick={(event) => event.stopPropagation()}
                  className="font-medium text-slate-700 transition-colors hover:text-slate-950"
                >
                  {props.uxStrings.messages_download_label ?? "Download"}
                </a>
                {attachmentLanguageLabel ? (
                  <DcxLanguageFlagBadge languageCode={attachmentLanguageCode} showLabel={false} />
                ) : null}
              </div>
            </div>
            <span className="mt-0.5 inline-flex shrink-0 items-center gap-1 text-xs text-slate-400">
              <span>{isOpen ? props.uxStrings.messages_toggle_hide ?? "Hide" : props.uxStrings.messages_toggle_show ?? "Show"}</span>
              <ChevronRightIcon className={cn("size-4 transition-transform", isOpen && "rotate-90")} />
            </span>
          </button>
        </CollapsibleTrigger>
          <CollapsibleContent className="w-full max-w-full overflow-x-hidden">
            {props.attachment.file_kind === "image" ? (
            <div className="flex w-full max-w-full overflow-hidden justify-center border-t border-slate-200 bg-slate-50/80">
                <img
                  src={attachmentUrl}
                  alt={attachmentDisplayTitle}
                className="block h-auto max-w-full"
              />
            </div>
          ) : null}

          {props.attachment.file_kind === "audio" ? (
            <div className="border-t border-slate-200 bg-slate-50/80 px-3 py-3">
              <audio controls className="w-full">
                <source src={attachmentUrl} type={props.attachment.content_type} />
              </audio>
            </div>
          ) : null}

          <DcxMessageAttachmentAnalysis attachment={props.attachment} uxStrings={props.uxStrings} />
        </CollapsibleContent>
      </Collapsible>
    </article>
  )
}

function DcxMessageAttachmentAnalysis(props: {
  attachment: DcxAppAuthenticatedUserMessageAttachment
  uxStrings: Record<string, string>
}) {
  const analysisItems = readDcxAttachmentAnalysisItems(props.attachment, props.uxStrings)

  if (analysisItems.length === 0) {
    return null
  }

  return (
    <div className="space-y-3 border-t border-slate-200 bg-slate-50/80 px-3 py-3">
      {analysisItems.map((item) => (
        <DcxAttachmentAnalysisCollapsibleBlock
          key={item.label}
          label={item.label}
          value={item.value}
          uxStrings={props.uxStrings}
        />
      ))}
    </div>
  )
}

function readDcxAttachmentAnalysisItems(
  attachment: DcxAppAuthenticatedUserMessageAttachment,
  uxStrings: Record<string, string>,
): Array<{
  label: string
  value: string
}> {
  const normalizedFileKind = attachment.file_kind.trim().toLowerCase()
  const commonItems = [
    { label: uxStrings.messages_detail_summary ?? "Summary", value: attachment.analysis_summary_text },
    { label: uxStrings.messages_detail_context ?? "Context", value: attachment.context_within_message },
  ]

  if (normalizedFileKind === "image") {
    return [
      { label: uxStrings.messages_detail_summary ?? "Summary", value: attachment.analysis_summary_text },
      { label: uxStrings.messages_detail_description ?? "Description", value: attachment.analysis_description_text },
      { label: uxStrings.messages_detail_context ?? "Context", value: attachment.context_within_message },
    ].filter((item) => item.value.trim() !== "")
  }

  if (normalizedFileKind === "audio") {
    return [
      { label: uxStrings.messages_detail_summary ?? "Summary", value: attachment.analysis_summary_text },
      { label: readDcxMessageSynthesisLabel(uxStrings), value: attachment.analysis_synthesis_text },
      { label: uxStrings.messages_detail_transcription ?? "Transcription", value: attachment.analysis_transcription_text },
      { label: uxStrings.messages_detail_context ?? "Context", value: attachment.context_within_message },
    ].filter((item) => item.value.trim() !== "")
  }

  if (normalizedFileKind === "document") {
    return [
      { label: uxStrings.messages_detail_summary ?? "Summary", value: attachment.analysis_summary_text },
      { label: readDcxMessageSynthesisLabel(uxStrings), value: attachment.analysis_synthesis_text },
      { label: uxStrings.messages_detail_context ?? "Context", value: attachment.context_within_message },
    ].filter((item) => item.value.trim() !== "")
  }

  return commonItems.filter((item) => item.value.trim() !== "")
}

function DcxAttachmentAnalysisCollapsibleBlock(props: {
  label: string
  value: string
  uxStrings: Record<string, string>
}) {
  const [isOpen, setIsOpen] = useState(false)
  const markdownListItems =
    props.label === readDcxMessageSynthesisLabel(props.uxStrings)
      ? readDcxSimpleMarkdownBulletItems(props.value)
      : []

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger asChild>
        <button
          type="button"
          className="flex w-full items-center justify-between gap-3 text-left"
        >
          <h5 className="text-[11px] font-semibold uppercase text-slate-500">{props.label}</h5>
          <span className="inline-flex items-center gap-1 text-xs text-slate-400">
            <span>{isOpen ? props.uxStrings.messages_toggle_hide ?? "Hide" : props.uxStrings.messages_toggle_show ?? "Show"}</span>
            <ChevronRightIcon className={cn("size-4 transition-transform", isOpen && "rotate-90")} />
          </span>
        </button>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <DcxMessageDetailValue value={props.value} markdownListItems={markdownListItems} />
      </CollapsibleContent>
    </Collapsible>
  )
}

function readDcxSimpleMarkdownBulletItems(value: string): string[] {
  const normalizedValue = value
    .replace(/\\r\\n/g, "\n")
    .replace(/\\n/g, "\n")
    .trim()

  const bulletItems = normalizedValue
    .split(/\r?\n+/)
    .map((line) => line.trim())
    .filter((line) => /^[-*]\s+/.test(line))
    .map((line) => line.replace(/^[-*]\s+/, "").trim())
    .filter((line) => line !== "")

  return bulletItems.length >= 2 ? bulletItems : []
}

function DcxLanguageFlagBadge(props: { languageCode: string; showLabel?: boolean }) {
  const normalizedLanguageCode = props.languageCode.trim().toLowerCase()
  const shouldShowLabel = props.showLabel ?? true

  return (
    <span className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-2 py-1 text-[11px] font-semibold uppercase text-slate-700">
      <DcxCountryFlagIcon
        regionCode={readDcxAppLanguageFlagRegionCode(normalizedLanguageCode)}
        fallbackLabel={normalizedLanguageCode.toUpperCase()}
        className="h-3 w-5 min-w-5"
      />
      {shouldShowLabel ? (
        <span>{normalizedLanguageCode.toUpperCase()}</span>
      ) : null}
    </span>
  )
}

function navigateToDcxAppPath(pathnameWithSearch: string, options?: { replace?: boolean }): void {
  if (typeof window === "undefined") {
    return
  }
  if (options?.replace) {
    window.history.replaceState({}, "", pathnameWithSearch)
  } else {
    window.history.pushState({}, "", pathnameWithSearch)
  }
  window.dispatchEvent(new PopStateEvent("popstate"))
}

function readDcxMessageShouldPoll(processingStatus: string, analysisStatus: string): boolean {
  const normalizedProcessingStatus = processingStatus.trim().toLowerCase()
  const normalizedAnalysisStatus = analysisStatus.trim().toLowerCase()

  if (normalizedProcessingStatus === "failed" || normalizedAnalysisStatus === "failed") {
    return false
  }

  if (normalizedProcessingStatus !== "ready") {
    return true
  }

  return ["queued", "pending", "processing", "partial"].includes(normalizedAnalysisStatus)
}

function readDcxMessageHasFailedAnalysis(processingStatus: string, analysisStatus: string): boolean {
  const normalizedProcessingStatus = processingStatus.trim().toLowerCase()
  const normalizedAnalysisStatus = analysisStatus.trim().toLowerCase()
  return normalizedProcessingStatus === "failed" || normalizedAnalysisStatus === "failed"
}

function readDcxMessageHasProhibitedContent(analysisMetadataJson: Record<string, unknown> | null | undefined): boolean {
  return readDcxMessageModerationStatus(analysisMetadataJson) === "prohibited"
}

function readDcxMessageModerationStatus(analysisMetadataJson: Record<string, unknown> | null | undefined): string {
  if (!analysisMetadataJson || typeof analysisMetadataJson !== "object") {
    return "not_reviewed"
  }

  const moderationStatus = analysisMetadataJson["moderation_status"]
  if (typeof moderationStatus !== "string") {
    return "not_reviewed"
  }

  const normalizedModerationStatus = moderationStatus.trim().toLowerCase()
  if (normalizedModerationStatus === "allowed" || normalizedModerationStatus === "prohibited") {
    return normalizedModerationStatus
  }
  return "not_reviewed"
}

function readDcxProhibitedContentReasonCodes(
  analysisMetadataJson: Record<string, unknown> | null | undefined,
): string[] {
  if (!analysisMetadataJson || typeof analysisMetadataJson !== "object") {
    return []
  }

  const reasonCodesValue = analysisMetadataJson["moderation_reason_codes"]
  if (!Array.isArray(reasonCodesValue)) {
    return []
  }

  return reasonCodesValue
    .map((reasonCode) => typeof reasonCode === "string" ? reasonCode.trim() : "")
    .filter((reasonCode) => reasonCode !== "")
}

function readDcxProhibitedContentReasonSummary(
  analysisMetadataJson: Record<string, unknown> | null | undefined,
  uxStrings: Record<string, string>,
): string {
  if (!analysisMetadataJson || typeof analysisMetadataJson !== "object") {
    return uxStrings.messages_detail_prohibited_body ??
      "This message was received but blocked by content policy."
  }

  const reasonSummary = analysisMetadataJson["moderation_reason_summary"]
  if (typeof reasonSummary === "string" && reasonSummary.trim() !== "") {
    return reasonSummary.trim()
  }

  return uxStrings.messages_detail_prohibited_body ??
    "This message was received but blocked by content policy."
}

function readDcxMessageOverallStatusSortValue(
  processingStatus: string,
  analysisStatus: string,
  analysisMetadataJson: Record<string, unknown>,
): string {
  const visual = readDcxMessageOverallStatusVisual(processingStatus, analysisStatus, analysisMetadataJson, {})

  if (visual.kind === "failed") {
    return "failed"
  }
  if (visual.kind === "processing") {
    return "processing"
  }
  return "ready"
}

function readDcxMessageRowStatusSortValue(message: DcxAppAuthenticatedUserMessage): string {
  const baseStatus = readDcxMessageOverallStatusSortValue(
    message.processing_status,
    message.analysis_status,
    message.analysis_metadata_json,
  )
  if (baseStatus !== "ready") {
    return baseStatus
  }
  return readDcxMessageRowNeedsAttention(message) ? "attention" : "ready"
}

function readDcxMessageRowNeedsAttention(message: DcxAppAuthenticatedUserMessage): boolean {
  if (message.requires_user_attention) {
    return true
  }
  return ["partial", "failed", "not_started"].includes(message.workflow_classification_status)
}

function readDcxMessageOverallStatusVisual(
  processingStatus: string,
  analysisStatus: string,
  analysisMetadataJson: Record<string, unknown>,
  uxStrings: Record<string, string>,
): {
  kind: "success" | "processing" | "failed"
  label: string
  tone: "success" | "warning" | "danger"
  title: string
} {
  if (readDcxMessageHasProhibitedContent(analysisMetadataJson)) {
    const prohibitedLabel = uxStrings.messages_status_prohibited ?? "Prohibited"
    return {
      kind: "failed",
      label: prohibitedLabel,
      tone: "danger" as const,
      title: prohibitedLabel,
    }
  }

  const normalizedProcessingStatus = processingStatus.trim().toLowerCase()
  const normalizedAnalysisStatus = analysisStatus.trim().toLowerCase()

  if (normalizedAnalysisStatus === "failed") {
    const failedLabel =
      uxStrings.messages_status_analysis_failed ??
      uxStrings.messages_status_failed ??
      "Analysis failed"
    return {
      kind: "failed",
      label: failedLabel,
      tone: "danger" as const,
      title: failedLabel,
    }
  }

  if (normalizedProcessingStatus === "failed") {
    const failedLabel =
      uxStrings.messages_derivation_failed ??
      uxStrings.messages_status_failed ??
      "Failed"

    return {
      kind: "failed",
      label: failedLabel,
      tone: "danger",
      title: failedLabel,
    }
  }

  if (
    normalizedProcessingStatus !== "ready" ||
    ["queued", "pending", "processing", "partial"].includes(normalizedAnalysisStatus)
  ) {
    return {
      kind: "processing",
      label: uxStrings.messages_status_analysing ?? "Analysing",
      tone: "warning",
      title: uxStrings.messages_status_analysing ?? "Analysing",
    }
  }

  return {
    kind: "success",
    label: uxStrings.messages_status_ready ?? "Ready",
    tone: "success",
    title: uxStrings.messages_status_ready ?? "Ready",
  }
}

function countDcxWords(value: string): number {
  return value
    .trim()
    .split(/\s+/)
    .filter((word) => word !== "").length
}

function readDcxMessageFormatLabel(messageFormat: string, uxStrings: Record<string, string>): string {
  const normalizedFormat = messageFormat.trim().toLowerCase()
  if (normalizedFormat === "document") {
    return uxStrings.messages_format_label_document ?? "doc"
  }
  if (normalizedFormat === "image") {
    return uxStrings.messages_format_label_image ?? "image"
  }
  if (normalizedFormat === "audio") {
    return uxStrings.messages_format_label_audio ?? "audio"
  }
  if (normalizedFormat === "text") {
    return uxStrings.messages_format_label_text ?? "text"
  }
  if (normalizedFormat === "mixed") {
    return uxStrings.messages_format_label_mixed ?? "mixed"
  }
  return normalizedFormat || (uxStrings.messages_format_label_text ?? "text")
}

function readDcxMessagesFilterPath(filter: DcxMessageFilter): string {
  if (filter === "text") {
    return "/me/messages/text"
  }
  if (filter === "image") {
    return "/me/messages/images"
  }
  if (filter === "audio") {
    return "/me/messages/audio"
  }
  if (filter === "document") {
    return "/me/messages/documents"
  }
  return "/me/messages"
}

function navigateToDcxMessagesFilter(filter: DcxMessageFilter): void {
  const nextPathname = readDcxMessagesFilterPath(filter)
  if (window.location.pathname === nextPathname) {
    return
  }
  window.history.pushState({}, "", `${nextPathname}${window.location.search}`)
  window.dispatchEvent(new PopStateEvent("popstate"))
}

function readDcxMessagesMatchingFilters(params: {
  messages: DcxAppAuthenticatedUserMessage[]
  searchQuery: string
  channelFilter: DcxMessageChannelFilter
  identityFilter: string
  languageFilter: string
}): DcxAppAuthenticatedUserMessage[] {
  const normalizedSearchQuery = params.searchQuery.trim().toLowerCase()

  return params.messages.filter((message) => {
    if (params.channelFilter !== "all" && message.channel_type !== params.channelFilter) {
      return false
    }

    if (params.identityFilter !== "all" && !readDcxMessageMatchesIdentityFilter(message, params.identityFilter)) {
      return false
    }

    if (params.languageFilter !== "all" && (message.detected_language_code ?? "").trim().toLowerCase() !== params.languageFilter) {
      return false
    }

    if (normalizedSearchQuery === "") {
      return true
    }

    const searchableText = [
      message.analysis_summary_text,
      message.raw_text_content,
      message.derived_text_content,
      message.message_subject,
      ...message.attachment_summaries.map((attachmentSummary) => attachmentSummary.original_filename),
      message.channel_type,
      message.provider_type,
      message.message_format,
      message.processing_status,
      message.derivation_status,
      message.detected_language_code ?? "",
      message.contact_method?.contact_value ?? "",
      message.contact_method?.normalized_value ?? "",
      message.contact_method?.display_label ?? "",
      message.source_handle_normalized ?? "",
      message.target_handle_normalized ?? "",
    ]
      .join(" ")
      .toLowerCase()

    return searchableText.includes(normalizedSearchQuery)
  })
}

function readDcxInboxMessageTitle(message: DcxAppAuthenticatedUserMessage, uxStrings: Record<string, string> = DCX_APP_ACCOUNT_PAGE_DEFAULT_UX_STRINGS): string {
  if (readDcxMessageHasProhibitedContent(message.analysis_metadata_json)) {
    return uxStrings.messages_title_fallback_prohibited ?? "Prohibited content"
  }

  const messageSubject = message.message_subject.trim()
  if (messageSubject !== "") {
    return messageSubject
  }

  const firstAttachmentTitle =
    message.attachment_summaries
      .map((attachmentSummary) =>
        readDcxAttachmentDisplayTitle({
          originalFilename: attachmentSummary.original_filename,
          analysisSummaryText: attachmentSummary.analysis_summary_text,
          fileKind: attachmentSummary.file_kind,
          uxStrings,
        }),
      )
      .find((attachmentTitle) => attachmentTitle.trim() !== "") ?? ""
  if (firstAttachmentTitle !== "") {
    return firstAttachmentTitle
  }

  const messageText = (message.raw_text_content || message.derived_text_content).trim()
  if (messageText !== "") {
    return messageText
  }

  if (message.message_format === "audio") {
    return uxStrings.messages_title_fallback_audio ?? "Audio message"
  }
  if (message.message_format === "image") {
    return uxStrings.messages_title_fallback_image ?? "Image"
  }
  if (message.message_format === "document") {
    return uxStrings.messages_title_fallback_document ?? "Document"
  }

  return uxStrings.messages_title_fallback_message ?? "Message"
}

function readDcxSelectedMessageTitle(message: DcxSelectedMessageDetail, uxStrings: Record<string, string> = DCX_APP_ACCOUNT_PAGE_DEFAULT_UX_STRINGS): string {
  if (readDcxMessageHasProhibitedContent(message.analysis_metadata_json)) {
    return uxStrings.messages_title_fallback_prohibited ?? "Prohibited content"
  }

  const messageSubject = message.message_subject.trim()
  if (messageSubject !== "") {
    return messageSubject
  }

  const firstAttachmentTitle =
    message.attachments
      .map((attachment) =>
        readDcxAttachmentDisplayTitle({
          originalFilename: attachment.original_filename,
          analysisSummaryText: attachment.analysis_summary_text,
          fileKind: attachment.file_kind,
          uxStrings,
        }),
      )
      .find((attachmentTitle) => attachmentTitle.trim() !== "") ?? ""
  if (firstAttachmentTitle !== "") {
    return firstAttachmentTitle
  }

  const messageText = (message.raw_text_content || message.derived_text_content).trim()
  if (messageText !== "") {
    return messageText
  }

  if (message.message_format === "audio") {
    return uxStrings.messages_title_fallback_audio ?? "Audio message"
  }
  if (message.message_format === "image") {
    return uxStrings.messages_title_fallback_image ?? "Image"
  }
  if (message.message_format === "document") {
    return uxStrings.messages_title_fallback_document ?? "Document"
  }

  return uxStrings.messages_title_fallback_message ?? "Message"
}

function readDcxAttachmentDisplayTitle(params: {
  originalFilename: string
  analysisSummaryText: string
  fileKind: string
  uxStrings: Record<string, string>
}): string {
  const normalizedFilename = params.originalFilename.trim()
  const normalizedSummaryText = params.analysisSummaryText.trim()

  if (!readDcxAttachmentHasGenericFilename(normalizedFilename)) {
    return normalizedFilename
  }

  const summaryDrivenTitle = readDcxAttachmentSummaryDrivenTitle(normalizedSummaryText)
  if (summaryDrivenTitle !== "") {
    return summaryDrivenTitle
  }

  if (normalizedFilename !== "") {
    return normalizedFilename
  }

  if (params.fileKind.trim().toLowerCase() === "image") {
    return params.uxStrings.messages_title_fallback_image ?? "Image"
  }
  if (params.fileKind.trim().toLowerCase() === "audio") {
    return params.uxStrings.messages_title_fallback_audio ?? "Audio message"
  }
  if (params.fileKind.trim().toLowerCase() === "document") {
    return params.uxStrings.messages_title_fallback_document ?? "Document"
  }

  return params.uxStrings.messages_title_fallback_attachment ?? "Attachment"
}

function readDcxAttachmentCollapsedCardTitle(attachmentDisplayTitle: string): string {
  const normalizedTitle = attachmentDisplayTitle.trim()
  if (normalizedTitle.length <= 92) {
    return normalizedTitle
  }

  return `${normalizedTitle.slice(0, 89).trimEnd()}...`
}

function readDcxAttachmentHasGenericFilename(originalFilename: string): boolean {
  const normalizedFilename = originalFilename.trim().toLowerCase()
  if (normalizedFilename === "") {
    return true
  }

  return [
    "attachment",
    "image",
    "audio",
    "document",
  ].includes(normalizedFilename)
}

function readDcxAttachmentSummaryDrivenTitle(analysisSummaryText: string): string {
  if (analysisSummaryText === "") {
    return ""
  }

  const normalizedSummaryText = analysisSummaryText
    .replace(/^(this|the)\s+(image|audio|document)\s+(shows|displays|depicts|captures|is|provides)\s+/i, "")
    .replace(/^this\s+(audio|document)\s+file\s+(shows|describes|captures|contains)\s+/i, "")
    .trim()

  if (normalizedSummaryText === "") {
    return ""
  }

  const firstSentence = normalizedSummaryText.split(/[.!?](?:\s|$)/)[0]?.trim() ?? ""
  if (firstSentence === "") {
    return ""
  }

  return firstSentence.charAt(0).toUpperCase() + firstSentence.slice(1)
}

function readDcxMessageMatchesIdentityFilter(
  message: DcxAppAuthenticatedUserMessage,
  identityFilter: string,
): boolean {
  const normalizedIdentityFilter = identityFilter.trim().toLowerCase()
  const identityValues = [
    message.contact_method?.normalized_value ?? "",
    message.contact_method?.contact_value ?? "",
    message.source_handle_normalized ?? "",
    message.target_handle_normalized ?? "",
  ].map((value) => value.trim().toLowerCase())

  return identityValues.includes(normalizedIdentityFilter)
}

function readDcxMessageIdentityFilterOptions(
  accountSummary: DcxAppAuthenticatedUserAccountSummary | null,
): Array<{ value: string; label: string }> {
  if (!accountSummary) {
    return []
  }

  const verifiedEmailOptions = accountSummary.email_contact_methods
    .filter((contactMethod) => contactMethod.is_verified && contactMethod.is_active)
    .map((contactMethod) => ({
      value: contactMethod.normalized_value,
      label: contactMethod.contact_value || contactMethod.normalized_value,
    }))
  const verifiedPhoneOptions = accountSummary.phone_contact_methods
    .filter((contactMethod) => contactMethod.is_verified && contactMethod.is_active)
    .map((contactMethod) => ({
      value: contactMethod.normalized_value,
      label: contactMethod.contact_value || contactMethod.normalized_value,
    }))

  const seenValues = new Set<string>()
  return [...verifiedEmailOptions, ...verifiedPhoneOptions].filter((option) => {
    const normalizedValue = option.value.trim().toLowerCase()
    if (normalizedValue === "" || seenValues.has(normalizedValue)) {
      return false
    }
    seenValues.add(normalizedValue)
    return true
  })
}

function readDcxMessageLanguageFilterOptions(
  messages: DcxAppAuthenticatedUserMessage[],
): Array<{ value: string; label: string }> {
  const seenLanguageCodes = new Set<string>()

  return messages
    .map((message) => (message.detected_language_code ?? "").trim().toLowerCase())
    .filter((languageCode) => {
      if (languageCode === "" || seenLanguageCodes.has(languageCode)) {
        return false
      }
      seenLanguageCodes.add(languageCode)
      return true
    })
    .sort((leftLanguageCode, rightLanguageCode) => leftLanguageCode.localeCompare(rightLanguageCode))
    .map((languageCode) => ({
      value: languageCode,
      label: languageCode.toUpperCase(),
    }))
}

function formatDcxFileSizeLabel(fileSizeBytes: number): string {
  if (fileSizeBytes < 1024) {
    return `${fileSizeBytes} B`
  }
  if (fileSizeBytes < 1024 * 1024) {
    return `${(fileSizeBytes / 1024).toFixed(1)} KB`
  }
  return `${(fileSizeBytes / (1024 * 1024)).toFixed(1)} MB`
}
