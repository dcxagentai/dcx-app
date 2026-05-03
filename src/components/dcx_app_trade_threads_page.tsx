/**
 * CONTEXT:
 * This page is the first MVP web surface for private trader-to-trader conversations about trades.
 * It reads only threads the authenticated user participates in, shows the trade spine beside the
 * message history, and lets either participant append plain app-surface replies.
 */
import { useEffect, useMemo, useRef, useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import type { Column, ColumnDef, SortingState } from "@tanstack/react-table"
import { MailIcon, MessageCircleIcon, MonitorIcon, RefreshCwIcon, SearchIcon, SendIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { DcxAppDataTable } from "@/components/ui/dcx_app_data_table"
import { Input } from "@/components/ui/input"
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"

import {
  DCX_APP_ACCOUNT_PAGE_DEFAULT_UX_STRINGS,
  formatDcxAppAccountTimestampLabel,
} from "./dcx_app_user_account_shared"
import { appendDcxAppAuthenticatedUserTradeThreadMessage } from "../lib/append_dcx_app_authenticated_user_trade_thread_message"
import { readDcxAppAuthenticatedUserAccountSummary } from "../lib/read_dcx_app_authenticated_user_account_summary"
import {
  readDcxAppAuthenticatedUserTradeThreadDetail,
  type DcxAppTradeThreadDetail,
  type DcxAppTradeThreadMessage,
} from "../lib/read_dcx_app_authenticated_user_trade_thread_detail"
import {
  readDcxAppAuthenticatedUserTradeThreadsCatalog,
  type DcxAppTradeThreadCatalogRow,
} from "../lib/read_dcx_app_authenticated_user_trade_threads_catalog"

type Props = {
  apiBaseUrl: string
  routeTradeThreadId?: number | null
}

type PendingTradeThreadMessage = {
  tradeThreadId: number
  messageText: string
  createdAtTsMs: number
}

export function DcxAppTradeThreadsPage(props: Props) {
  const queryClient = useQueryClient()
  const lastAppliedRouteTradeThreadIdRef = useRef<number | null>(null)
  const [selectedTradeThreadId, setSelectedTradeThreadId] = useState<number | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [draftMessageText, setDraftMessageText] = useState("")
  const [pendingMessage, setPendingMessage] = useState<PendingTradeThreadMessage | null>(null)
  const [sorting, setSorting] = useState<SortingState>([{ id: "updated", desc: true }])

  const accountSummaryQuery = useQuery({
    queryKey: ["dcx_app_authenticated_user_account_summary"],
    queryFn: async () => readDcxAppAuthenticatedUserAccountSummary({ apiBaseUrl: props.apiBaseUrl }),
  })
  const catalogQuery = useQuery({
    queryKey: ["dcx_app_authenticated_user_trade_threads_catalog"],
    queryFn: async () => readDcxAppAuthenticatedUserTradeThreadsCatalog({ apiBaseUrl: props.apiBaseUrl }),
    refetchInterval: 5000,
    refetchIntervalInBackground: false,
  })

  const accountSummary = accountSummaryQuery.data?.data ?? null
  const ux = accountSummary?.ux_strings ?? DCX_APP_ACCOUNT_PAGE_DEFAULT_UX_STRINGS
  const selectedLanguageCode = accountSummary?.preferred_language?.language_code ?? "en"
  const selectedTimezoneIanaName = accountSummary?.preferred_timezone?.iana_name ?? null
  const tradeThreads = catalogQuery.data?.data.trade_threads ?? []

  useEffect(() => {
    if (
      props.routeTradeThreadId &&
      props.routeTradeThreadId !== lastAppliedRouteTradeThreadIdRef.current
    ) {
      lastAppliedRouteTradeThreadIdRef.current = props.routeTradeThreadId
      setSelectedTradeThreadId(props.routeTradeThreadId)
      setDraftMessageText("")
      setPendingMessage(null)
    }
  }, [props.routeTradeThreadId])

  useEffect(() => {
    if (props.routeTradeThreadId) {
      return
    }
    if (selectedTradeThreadId !== null) {
      return
    }
    if (tradeThreads[0]) {
      setSelectedTradeThreadId(tradeThreads[0].trade_thread_id)
    }
  }, [props.routeTradeThreadId, selectedTradeThreadId, tradeThreads])

  const filteredTradeThreads = useMemo(() => {
    const normalizedSearchQuery = searchQuery.trim().toLowerCase()
    if (!normalizedSearchQuery) {
      return tradeThreads
    }
    return tradeThreads.filter((thread) =>
      [
        thread.thread_reference_code,
        thread.trade_summary_text,
        thread.normalized_trade_side,
        thread.normalized_material_name,
        thread.normalized_origin_location,
        thread.normalized_destination_location,
        thread.owner_public_identity_label,
        thread.counterparty_public_identity_label,
        thread.other_participant_public_identity_label,
        thread.latest_message_text,
      ]
        .join(" ")
        .toLowerCase()
        .includes(normalizedSearchQuery),
    )
  }, [searchQuery, tradeThreads])

  const selectedTradeThreadDetailQuery = useQuery({
    queryKey: ["dcx_app_authenticated_user_trade_thread_detail", selectedTradeThreadId],
    enabled: typeof selectedTradeThreadId === "number",
    queryFn: async () =>
      readDcxAppAuthenticatedUserTradeThreadDetail({
        apiBaseUrl: props.apiBaseUrl,
        tradeThreadId: selectedTradeThreadId as number,
      }),
    refetchInterval: 2000,
    refetchIntervalInBackground: false,
  })
  const appendMessageMutation = useMutation({
    mutationFn: async (params: { tradeThreadId: number; messageText: string }) =>
      appendDcxAppAuthenticatedUserTradeThreadMessage({
        apiBaseUrl: props.apiBaseUrl,
        tradeThreadId: params.tradeThreadId,
        messageText: params.messageText,
        languageCode: selectedLanguageCode,
      }),
    onMutate: (variables) => {
      setPendingMessage({
        tradeThreadId: variables.tradeThreadId,
        messageText: variables.messageText,
        createdAtTsMs: Date.now(),
      })
      setDraftMessageText("")
    },
    onSuccess: async (payload, variables) => {
      queryClient.setQueryData(
        ["dcx_app_authenticated_user_trade_thread_detail", variables.tradeThreadId],
        payload,
      )
      setPendingMessage(null)
      await queryClient.invalidateQueries({ queryKey: ["dcx_app_authenticated_user_trade_threads_catalog"] })
    },
    onError: (_error, variables) => {
      setPendingMessage(null)
      setDraftMessageText((currentDraftText) => currentDraftText || variables.messageText)
    },
  })

  const columns = useMemo<Array<ColumnDef<DcxAppTradeThreadCatalogRow>>>(
    () => [
      {
        id: "thread",
        accessorFn: (thread) => thread.thread_reference_code,
        header: ({ column }) => <DcxTradeThreadSortableHeader column={column} title="Thread" />,
        cell: ({ row }) => (
          <div className="min-w-0">
            <p className="line-clamp-1 font-medium text-slate-950">{row.original.thread_reference_code}</p>
          </div>
        ),
      },
      {
        id: "trade",
        accessorFn: (thread) => thread.trade_summary_text || thread.normalized_material_name || "Trade",
        header: ({ column }) => <DcxTradeThreadSortableHeader column={column} title="Trade" />,
        cell: ({ row }) => <span className="line-clamp-1">{row.original.trade_summary_text || "Trade"}</span>,
      },
      {
        id: "with",
        accessorFn: (thread) => thread.other_participant_public_identity_label,
        header: ({ column }) => <DcxTradeThreadSortableHeader column={column} title="With" />,
        cell: ({ row }) => <span className="line-clamp-1">{row.original.other_participant_public_identity_label}</span>,
      },
      {
        id: "messages",
        accessorFn: (thread) => thread.message_count,
        header: ({ column }) => <DcxTradeThreadSortableHeader column={column} title="Msgs" />,
        cell: ({ row }) => row.original.message_count,
      },
      {
        id: "status",
        accessorFn: (thread) => thread.thread_status,
        header: ({ column }) => <DcxTradeThreadSortableHeader column={column} title="State" />,
        cell: ({ row }) => (
          <span className="rounded-md border border-emerald-200 bg-emerald-50 px-2 py-1 text-xs font-semibold uppercase text-emerald-700">
            {row.original.thread_status}
          </span>
        ),
      },
      {
        id: "updated",
        accessorFn: (thread) => thread.updated_at_ts_ms,
        header: ({ column }) => <DcxTradeThreadSortableHeader column={column} title="Updated" />,
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

  const selectedTradeThread = selectedTradeThreadDetailQuery.data?.data ?? null
  const threadErrorText =
    appendMessageMutation.isError ? (appendMessageMutation.error as Error).message : null

  return (
    <div className="flex h-full min-h-0 flex-col gap-4">
      <ResizablePanelGroup orientation="horizontal" className="min-h-0 flex-1 rounded-lg border bg-white">
        <ResizablePanel defaultSize={54} minSize={36}>
          <div className="h-full overflow-hidden p-4">
            <section className="overflow-hidden border border-black/6 bg-white shadow-[0_18px_55px_-48px_rgba(15,23,42,0.45)]">
              <div className="flex flex-col gap-3 border-b border-black/6 px-4 py-3 lg:flex-row lg:items-center lg:justify-between">
                <label className="relative block w-full lg:flex-1">
                  <SearchIcon className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                  <Input
                    value={searchQuery}
                    onChange={(event) => setSearchQuery(event.target.value)}
                    placeholder="Search trade chats..."
                    className="pl-9"
                  />
                </label>
                <div className="flex items-center justify-between gap-3 lg:justify-end">
                  <p className="text-xs text-slate-500">
                    {filteredTradeThreads.length} of {catalogQuery.data?.data.total_trade_thread_count ?? tradeThreads.length}
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => void queryClient.invalidateQueries({ queryKey: ["dcx_app_authenticated_user_trade_threads_catalog"] })}
                  >
                    <RefreshCwIcon />
                    {ux.refresh_button_label ?? "Refresh"}
                  </Button>
                </div>
              </div>
              <DcxAppDataTable
                columns={columns}
                data={filteredTradeThreads}
                tableClassName="[&_td]:py-3"
                sorting={sorting}
                onSortingChange={setSorting}
                pageSize={25}
                onRowClick={(row) => {
                  setSelectedTradeThreadId(row.trade_thread_id)
                  setDraftMessageText("")
                  setPendingMessage(null)
                  window.history.replaceState({}, "", `/me/trade-threads/${row.trade_thread_id}`)
                }}
                readColumnWidthClassName={(columnId) => {
                  if (columnId === "thread") return "w-[86px]"
                  if (columnId === "messages") return "w-[70px]"
                  if (columnId === "status") return "w-[90px]"
                  if (columnId === "updated") return "w-[150px]"
                  return ""
                }}
                readRowClassName={(row) => row.trade_thread_id === selectedTradeThreadId ? "bg-sky-50 hover:bg-sky-50 ring-1 ring-inset ring-sky-200" : ""}
                emptyLabel="No private trade chats yet."
              />
            </section>
          </div>
        </ResizablePanel>
        <ResizableHandle withHandle />
        <ResizablePanel defaultSize={46} minSize={34}>
          <div className="h-full overflow-y-auto border-l p-6">
            {!selectedTradeThread ? (
              <p className="text-sm text-slate-500">Choose a trade chat to inspect.</p>
            ) : (
              <DcxTradeThreadDetailPanel
                tradeThread={selectedTradeThread}
                pendingMessage={pendingMessage}
                draftMessageText={draftMessageText}
                selectedLanguageCode={selectedLanguageCode}
                selectedTimezoneIanaName={selectedTimezoneIanaName}
                isSendingMessage={appendMessageMutation.isPending}
                errorText={threadErrorText}
                onDraftMessageTextChange={setDraftMessageText}
                onSendMessage={() => {
                  const trimmedDraftMessageText = draftMessageText.trim()
                  if (!trimmedDraftMessageText) {
                    return
                  }
                  appendMessageMutation.mutate({
                    tradeThreadId: selectedTradeThread.trade_thread_id,
                    messageText: trimmedDraftMessageText,
                  })
                }}
              />
            )}
          </div>
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  )
}

function DcxTradeThreadDetailPanel(props: {
  tradeThread: DcxAppTradeThreadDetail
  pendingMessage: PendingTradeThreadMessage | null
  draftMessageText: string
  selectedLanguageCode: string
  selectedTimezoneIanaName: string | null
  isSendingMessage: boolean
  errorText: string | null
  onDraftMessageTextChange: (value: string) => void
  onSendMessage: () => void
}) {
  const messages = props.tradeThread.messages
  const matchingPendingMessage =
    props.pendingMessage?.tradeThreadId === props.tradeThread.trade_thread_id ? props.pendingMessage : null

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Trade chat</p>
        <h2 className="mt-2 text-xl font-semibold text-slate-950">
          {props.tradeThread.thread_reference_code}: {props.tradeThread.trade_summary_text || "Trade conversation"}
        </h2>
        <p className="mt-2 text-sm text-slate-500">
          With {props.tradeThread.other_participant_public_identity_label}
        </p>
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-4">
        <div className="grid gap-3 text-sm sm:grid-cols-2">
          <DcxThreadTradeField label="Side" value={props.tradeThread.normalized_trade_side} />
          <DcxThreadTradeField label="Material" value={props.tradeThread.normalized_material_name} />
          <DcxThreadTradeField
            label="Quantity"
            value={`${props.tradeThread.normalized_quantity_value ?? "—"} ${readThreadText(props.tradeThread.normalized_quantity_unit)}`}
          />
          <DcxThreadTradeField label="Unit price" value={readThreadPriceLabel(props.tradeThread)} />
          <DcxThreadTradeField label="Origin" value={props.tradeThread.normalized_origin_location} />
          <DcxThreadTradeField label="Destination" value={props.tradeThread.normalized_destination_location} />
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => navigateDcxAppToPath(`/me/trades/${props.tradeThread.trade_id}`)}
          >
            Open trade
          </Button>
          {props.tradeThread.trade_publication_id ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => navigateDcxAppToPath(`/me/market/deals/${props.tradeThread.trade_publication_id}`)}
            >
              Open market deal
            </Button>
          ) : null}
        </div>
      </div>

      <section className="rounded-lg border border-sky-200 bg-sky-50/30 p-4">
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Conversation</p>
          <span className="rounded-md border border-slate-200 bg-white px-2 py-1 text-xs font-semibold uppercase text-slate-600">
            {props.tradeThread.thread_status}
          </span>
        </div>
        <div className="mt-4 space-y-3">
          {messages.length === 0 && !matchingPendingMessage ? (
            <p className="text-sm text-slate-500">No messages yet.</p>
          ) : null}
          {messages.map((message) => (
            <DcxTradeThreadMessageBubble
              key={message.trade_thread_message_id}
              message={message}
              selectedLanguageCode={props.selectedLanguageCode}
              selectedTimezoneIanaName={props.selectedTimezoneIanaName}
            />
          ))}
          {matchingPendingMessage ? (
            <div className="flex justify-end">
              <div className="w-[82%] rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-slate-950">
                <div className="flex items-center justify-between gap-3 text-[11px] font-semibold uppercase leading-4 tracking-[0.08em] text-emerald-700">
                  <span>You</span>
                  <span>Sending...</span>
                </div>
                <p className="mt-2 whitespace-pre-wrap">{matchingPendingMessage.messageText}</p>
              </div>
            </div>
          ) : null}
        </div>
      </section>

      <section className="rounded-lg border border-sky-200 bg-white p-4">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Reply</p>
        <Textarea
          value={props.draftMessageText}
          onChange={(event) => props.onDraftMessageTextChange(event.target.value)}
          placeholder="Write a private message about this trade..."
          className="mt-3 min-h-28"
          disabled={props.tradeThread.thread_status !== "open"}
        />
        {props.errorText ? <p className="mt-2 text-sm text-red-600">{props.errorText}</p> : null}
        <div className="mt-3 flex justify-end">
          <Button
            type="button"
            onClick={props.onSendMessage}
            disabled={props.isSendingMessage || props.tradeThread.thread_status !== "open" || !props.draftMessageText.trim()}
          >
            <SendIcon />
            {props.isSendingMessage ? "Sending..." : "Send"}
          </Button>
        </div>
      </section>
    </div>
  )
}

function DcxTradeThreadMessageBubble(props: {
  message: DcxAppTradeThreadMessage
  selectedLanguageCode: string
  selectedTimezoneIanaName: string | null
}) {
  const [hasCopiedOriginalText, setHasCopiedOriginalText] = useState(false)
  const sourceMetadata = readDcxTradeThreadMessageSourceMetadata(props.message.source_channel_type)
  const showReceivedSourceIcon = !props.message.is_sent_by_authenticated_user && sourceMetadata.channel !== "app"
  const originalMessageText = props.message.canonical_message_text.trim()
  const hasTranslatedDisplayText =
    Boolean(props.message.displayed_translation_language_code)
    && originalMessageText !== ""
    && originalMessageText !== (props.message.display_message_text ?? "").trim()

  async function copyOriginalMessageText() {
    if (!hasTranslatedDisplayText) {
      return
    }
    try {
      await navigator.clipboard.writeText(originalMessageText)
      setHasCopiedOriginalText(true)
      window.setTimeout(() => setHasCopiedOriginalText(false), 1800)
    } catch {
      setHasCopiedOriginalText(false)
    }
  }

  return (
    <div className={cn("flex", props.message.is_sent_by_authenticated_user ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "w-[82%] rounded-lg border px-4 py-3 text-sm text-slate-950",
          props.message.is_sent_by_authenticated_user
            ? "border-emerald-200 bg-emerald-50"
            : "border-slate-200 bg-white",
        )}
      >
        <div className="flex items-center justify-between gap-3 text-[11px] font-semibold uppercase leading-4 tracking-[0.08em] text-slate-500">
          <span className="flex min-w-0 items-center gap-1.5">
            {showReceivedSourceIcon ? (
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
            <span className="truncate">
              {props.message.is_sent_by_authenticated_user ? "You" : props.message.sender_public_identity_label}
            </span>
          </span>
          <span>
            {formatDcxAppAccountTimestampLabel(
              props.message.created_at_ts_ms,
              props.selectedLanguageCode,
              props.selectedTimezoneIanaName,
              "",
            )}
          </span>
        </div>
        <p className="mt-2 whitespace-pre-wrap">{props.message.display_message_text ?? props.message.canonical_message_text}</p>
        {hasTranslatedDisplayText ? (
          <button
            type="button"
            onClick={() => void copyOriginalMessageText()}
            className="mt-3 w-full rounded-md border border-slate-200 bg-white/70 px-3 py-2 text-left text-xs leading-5 text-slate-500 transition hover:border-sky-200 hover:bg-sky-50/70 hover:text-slate-700"
            title="Copy original message"
          >
            <span className="line-clamp-2 whitespace-pre-wrap">
              <span className="font-semibold text-slate-500">
                Original ({(props.message.translated_from_language_code ?? props.message.language_code).toUpperCase()}):
              </span>{" "}
              {originalMessageText}
              {hasCopiedOriginalText ? <span className="font-semibold text-slate-500"> · Copied</span> : null}
            </span>
          </button>
        ) : null}
      </div>
    </div>
  )
}

function readDcxTradeThreadMessageSourceMetadata(sourceChannelType: string): {
  channel: "app" | "email" | "whatsapp"
  label: string
  Icon: typeof MonitorIcon
  className: string
} {
  const normalizedSourceChannelType = sourceChannelType.trim().toLowerCase()
  if (normalizedSourceChannelType === "whatsapp") {
    return {
      channel: "whatsapp",
      label: "Received from WhatsApp",
      Icon: MessageCircleIcon,
      className: "border-emerald-200 bg-emerald-50 text-emerald-700",
    }
  }
  if (normalizedSourceChannelType === "email") {
    return {
      channel: "email",
      label: "Received from email",
      Icon: MailIcon,
      className: "border-sky-200 bg-sky-50 text-sky-700",
    }
  }
  return {
    channel: "app",
    label: "Received from DCX app",
    Icon: MonitorIcon,
    className: "border-slate-200 bg-slate-50 text-slate-500",
  }
}

function DcxThreadTradeField(props: { label: string; value: string | number | null | undefined }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">{props.label}</p>
      <p className="mt-1 text-sm text-slate-950">{readThreadText(props.value)}</p>
    </div>
  )
}

function DcxTradeThreadSortableHeader<TData>(props: { column: Column<TData, unknown>; title: string }) {
  const isSorted = props.column.getIsSorted()
  return (
    <button type="button" onClick={() => props.column.toggleSorting(isSorted === "asc")} className="inline-flex items-center gap-1 text-left">
      <span>{props.title}</span>
      <span className="text-[0.8rem] text-slate-400">{isSorted ? (isSorted === "asc" ? "↑" : "↓") : "↕"}</span>
    </button>
  )
}

function readThreadText(value: string | number | null | undefined): string {
  if (typeof value === "number") {
    return Number.isInteger(value) ? String(value) : String(value)
  }
  const normalizedValue = typeof value === "string" ? value.trim() : ""
  return normalizedValue && normalizedValue.toLowerCase() !== "not specified" ? normalizedValue : "—"
}

function readThreadPriceLabel(
  trade: Pick<DcxAppTradeThreadCatalogRow, "normalized_price_value" | "normalized_currency_code" | "normalized_price_unit_basis">,
): string {
  if (trade.normalized_price_value === null) {
    return "Price not specified"
  }
  const currencyCode = readThreadText(trade.normalized_currency_code)
  const unitBasis = readThreadText(trade.normalized_price_unit_basis)
  return `${trade.normalized_price_value}${currencyCode !== "—" ? ` ${currencyCode}` : ""}${unitBasis !== "—" ? ` / ${unitBasis}` : ""}`
}

function navigateDcxAppToPath(nextPathname: string) {
  window.history.pushState({}, "", nextPathname)
  window.dispatchEvent(new PopStateEvent("popstate"))
}
