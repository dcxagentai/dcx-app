import { useEffect, useMemo, useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import type { Column, ColumnDef, SortingState } from "@tanstack/react-table"
import { CheckCircle2Icon, RefreshCwIcon, SearchIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { DcxAppDataTable } from "@/components/ui/dcx_app_data_table"
import { Input } from "@/components/ui/input"
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"

import {
  DCX_APP_ACCOUNT_PAGE_DEFAULT_UX_STRINGS,
  formatDcxAppAccountTimestampLabel,
} from "./dcx_app_user_account_shared"
import { readDcxAppAuthenticatedUserAccountSummary } from "../lib/read_dcx_app_authenticated_user_account_summary"
import {
  readDcxAppMarketTradeDetail,
  type DcxAppMarketTradeDetail,
} from "../lib/read_dcx_app_market_trade_detail"
import {
  readDcxAppMarketTradesCatalog,
  type DcxAppMarketTradeCatalogRow,
} from "../lib/read_dcx_app_market_trades_catalog"
import { startDcxAppMarketTradeThread } from "../lib/start_dcx_app_market_trade_thread"
import {
  useDcxAppBalancedDesktopSplitMode,
  useDcxAppDetailSheetMode,
} from "./use_dcx_app_master_detail_layout_mode"

type Props = {
  apiBaseUrl: string
  routeTradePublicationId?: number | null
}

export function DcxAppMarketDealsPage(props: Props) {
  const queryClient = useQueryClient()
  const [selectedTradePublicationId, setSelectedTradePublicationId] = useState<number | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [isMobileDetailOpen, setIsMobileDetailOpen] = useState(false)
  const isDetailSheetMode = useDcxAppDetailSheetMode()
  const isBalancedDesktopSplitMode = useDcxAppBalancedDesktopSplitMode()
  const [sorting, setSorting] = useState<SortingState>([{ id: "updated", desc: true }])
  const [startedThreadByPublicationId, setStartedThreadByPublicationId] = useState<Record<number, { threadReferenceCode: string }>>({})

  const accountSummaryQuery = useQuery({
    queryKey: ["dcx_app_authenticated_user_account_summary"],
    queryFn: async () => readDcxAppAuthenticatedUserAccountSummary({ apiBaseUrl: props.apiBaseUrl }),
  })
  const catalogQuery = useQuery({
    queryKey: ["dcx_app_market_trades_catalog"],
    queryFn: async () => readDcxAppMarketTradesCatalog({ apiBaseUrl: props.apiBaseUrl }),
  })
  const marketTrades = catalogQuery.data?.data.market_trades ?? []
  const accountSummary = accountSummaryQuery.data?.data ?? null
  const ux = accountSummary?.ux_strings ?? DCX_APP_ACCOUNT_PAGE_DEFAULT_UX_STRINGS
  const selectedLanguageCode = accountSummary?.preferred_language?.language_code ?? "en"
  const selectedTimezoneIanaName = accountSummary?.preferred_timezone?.iana_name ?? null

  useEffect(() => {
    if (props.routeTradePublicationId) {
      setSelectedTradePublicationId(props.routeTradePublicationId)
      return
    }
    if (selectedTradePublicationId !== null) {
      return
    }
    if (marketTrades[0]) {
      setSelectedTradePublicationId(marketTrades[0].trade_publication_id)
    }
  }, [marketTrades, props.routeTradePublicationId, selectedTradePublicationId])

  const detailQuery = useQuery({
    queryKey: ["dcx_app_market_trade_detail", selectedTradePublicationId],
    enabled: typeof selectedTradePublicationId === "number",
    queryFn: async () =>
      readDcxAppMarketTradeDetail({
        apiBaseUrl: props.apiBaseUrl,
        tradePublicationId: selectedTradePublicationId as number,
      }),
  })
  const threadMutation = useMutation({
    mutationFn: async (tradePublicationId: number) =>
      startDcxAppMarketTradeThread({
        apiBaseUrl: props.apiBaseUrl,
        tradePublicationId,
      }),
    onSuccess: (payload) => {
      setStartedThreadByPublicationId((currentByPublicationId) => ({
        ...currentByPublicationId,
        [payload.data.trade_publication_id]: {
          threadReferenceCode: payload.data.thread_reference_code,
        },
      }))
      window.history.pushState({}, "", `/me/trade-threads/${payload.data.trade_thread_id}`)
      window.dispatchEvent(new PopStateEvent("popstate"))
    },
  })

  const filteredTrades = useMemo(() => {
    const normalizedSearchQuery = searchQuery.trim().toLowerCase()
    if (!normalizedSearchQuery) {
      return marketTrades
    }
    return marketTrades.filter((trade) =>
      [
        trade.trade_summary_text,
        trade.normalized_trade_side,
        trade.normalized_material_name,
        trade.normalized_quantity_unit,
        trade.normalized_currency_code,
        trade.normalized_origin_location,
        trade.normalized_destination_location,
        trade.public_reference_code,
        trade.owner_public_identity_label,
      ]
        .join(" ")
        .toLowerCase()
        .includes(normalizedSearchQuery),
    )
  }, [marketTrades, searchQuery])

  const columns = useMemo<Array<ColumnDef<DcxAppMarketTradeCatalogRow>>>(
    () => [
      {
        id: "trade",
        accessorFn: (trade) => trade.trade_summary_text || trade.normalized_material_name || "Trade",
        header: ({ column }) => <DcxMarketSortableHeader column={column} title="Deal" />,
        cell: ({ row }) => <span className="line-clamp-1 font-medium text-slate-950">{row.original.trade_summary_text || "Market deal"}</span>,
      },
      {
        id: "side",
        accessorFn: (trade) => trade.normalized_trade_side,
        header: ({ column }) => <DcxMarketSortableHeader column={column} title="Side" />,
        cell: ({ row }) => readMarketText(row.original.normalized_trade_side),
      },
      {
        id: "amount",
        accessorFn: (trade) => trade.normalized_quantity_value ?? -1,
        header: ({ column }) => <DcxMarketSortableHeader column={column} title="Amount" />,
        cell: ({ row }) => row.original.normalized_quantity_value ?? "—",
      },
      {
        id: "unit",
        accessorFn: (trade) => trade.normalized_quantity_unit,
        header: ({ column }) => <DcxMarketSortableHeader column={column} title="Unit" />,
        cell: ({ row }) => readMarketText(row.original.normalized_quantity_unit),
      },
      {
        id: "thing",
        accessorFn: (trade) => trade.normalized_material_name,
        header: ({ column }) => <DcxMarketSortableHeader column={column} title="Thing" />,
        cell: ({ row }) => <span className="line-clamp-1">{readMarketText(row.original.normalized_material_name)}</span>,
      },
      {
        id: "price",
        accessorFn: (trade) => trade.normalized_price_value ?? -1,
        header: ({ column }) => <DcxMarketSortableHeader column={column} title="Unit price" />,
        cell: ({ row }) => readMarketPriceLabel(row.original),
      },
      {
        id: "origin",
        accessorFn: (trade) => trade.normalized_origin_location,
        header: ({ column }) => <DcxMarketSortableHeader column={column} title="Origin" />,
        cell: ({ row }) => readMarketText(row.original.normalized_origin_location),
      },
      {
        id: "trader",
        accessorFn: (trade) => trade.owner_public_identity_label,
        header: ({ column }) => <DcxMarketSortableHeader column={column} title="Trader" />,
        cell: ({ row }) => <span className="line-clamp-1 text-slate-700">{row.original.owner_public_identity_label}</span>,
      },
      {
        id: "updated",
        accessorFn: (trade) => trade.updated_at_ts_ms,
        header: ({ column }) => <DcxMarketSortableHeader column={column} title="Updated" />,
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

  const selectedTrade = detailQuery.data?.data ?? null

  const dealListPanel = (
    <section className="min-w-0 overflow-hidden border border-black/6 bg-white shadow-[0_18px_55px_-48px_rgba(15,23,42,0.45)]">
              <div className="flex flex-col gap-3 border-b border-black/6 px-4 py-3 lg:flex-row lg:items-center lg:justify-between">
                <label className="relative block w-full lg:flex-1">
                  <SearchIcon className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                  <Input value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} placeholder="Search market deals..." className="pl-9" />
                </label>
                <div className="flex items-center justify-between gap-3 lg:justify-end">
                  <p className="text-xs text-slate-500">{filteredTrades.length} of {catalogQuery.data?.data.total_market_trade_count ?? marketTrades.length}</p>
                  <Button type="button" variant="outline" size="sm" onClick={() => void queryClient.invalidateQueries({ queryKey: ["dcx_app_market_trades_catalog"] })}>
                    <RefreshCwIcon />
                    {ux.refresh_button_label ?? "Refresh"}
                  </Button>
                </div>
              </div>
              <DcxAppDataTable
                columns={columns}
                data={filteredTrades}
                tableClassName="[&_td]:py-3"
                sorting={sorting}
                onSortingChange={setSorting}
                pageSize={25}
                onRowClick={(row) => {
                  setSelectedTradePublicationId(row.trade_publication_id)
                  window.history.replaceState({}, "", `/me/market/deals/${row.trade_publication_id}`)
                  if (isDetailSheetMode) {
                    setIsMobileDetailOpen(true)
                  }
                }}
                readRowClassName={(row) => row.trade_publication_id === selectedTradePublicationId ? "bg-sky-50 hover:bg-sky-50 ring-1 ring-inset ring-sky-200" : ""}
                emptyLabel="No public market deals yet."
              />
    </section>
  )

  const dealDetailPanel = (
    <aside className="h-full min-w-0 overflow-y-auto border border-black/6 bg-white p-6 shadow-[0_18px_55px_-48px_rgba(15,23,42,0.45)]">
            {!selectedTrade ? (
              <p className="text-sm text-slate-500">Choose a market deal to inspect.</p>
            ) : (
              <DcxMarketTradeDetailPanel
                trade={selectedTrade}
                startedThread={startedThreadByPublicationId[selectedTrade.trade_publication_id] ?? null}
                threadErrorText={(threadMutation.error as Error | null)?.message ?? null}
                isStartingThread={threadMutation.isPending}
                onStartThread={() => threadMutation.mutate(selectedTrade.trade_publication_id)}
              />
            )}
    </aside>
  )

  const selectedDealTitle = selectedTrade?.trade_summary_text || "Market deal"

  return (
    <section className="flex min-h-[calc(100vh-5rem)] min-w-0 flex-col gap-4 overflow-x-hidden">
      {isDetailSheetMode ? (
        <main className="min-w-0 overflow-x-hidden">{dealListPanel}</main>
      ) : (
        <ResizablePanelGroup
          key={isBalancedDesktopSplitMode ? "balanced-desktop-split" : "wide-desktop-split"}
          orientation="horizontal"
          className="min-h-0 w-full max-w-full flex-1 overflow-hidden"
        >
          <ResizablePanel
            className="min-w-0 overflow-hidden"
            defaultSize={isBalancedDesktopSplitMode ? "50%" : "58%"}
            minSize="42%"
          >
            <div className="h-full min-w-0 overflow-x-hidden pr-2">{dealListPanel}</div>
          </ResizablePanel>
          <ResizableHandle withHandle className="mx-1 bg-transparent" />
          <ResizablePanel
            className="min-w-0 overflow-hidden"
            defaultSize={isBalancedDesktopSplitMode ? "50%" : "42%"}
            minSize={isBalancedDesktopSplitMode ? "50%" : "34%"}
            maxSize="58%"
          >
            <div className="h-full min-w-0 overflow-x-hidden pl-2">{dealDetailPanel}</div>
          </ResizablePanel>
        </ResizablePanelGroup>
      )}

      {isDetailSheetMode ? (
        <Sheet open={isMobileDetailOpen && selectedTradePublicationId !== null} onOpenChange={setIsMobileDetailOpen}>
          <SheetContent className="overflow-x-hidden overflow-y-auto p-0 data-[side=right]:w-[90vw] data-[side=right]:max-w-[90vw] data-[side=right]:sm:max-w-[90vw]">
            <SheetHeader className="sr-only">
              <SheetTitle>{selectedDealTitle}</SheetTitle>
              <SheetDescription>Market deal detail</SheetDescription>
            </SheetHeader>
            {dealDetailPanel}
          </SheetContent>
        </Sheet>
      ) : null}
    </section>
  )
}

function DcxMarketTradeDetailPanel(props: {
  trade: DcxAppMarketTradeDetail
  startedThread: { threadReferenceCode: string } | null
  threadErrorText: string | null
  isStartingThread: boolean
  onStartThread: () => void
}) {
  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Market deal</p>
        <h2 className="mt-2 text-xl font-semibold text-slate-950">{props.trade.trade_summary_text || "Market deal"}</h2>
        <p className="mt-2 text-sm text-slate-500">Posted by {props.trade.owner_public_identity_label}</p>
      </div>
      <div className="rounded-lg border border-slate-200 bg-white p-4">
        <div className="grid gap-3 text-sm sm:grid-cols-2">
          <DcxMarketField label="Side" value={props.trade.normalized_trade_side} />
          <DcxMarketField label="Material" value={props.trade.normalized_material_name} />
          <DcxMarketField label="Quantity" value={`${props.trade.normalized_quantity_value ?? "—"} ${readMarketText(props.trade.normalized_quantity_unit)}`} />
          <DcxMarketField label="Unit price" value={readMarketPriceLabel(props.trade)} />
          <DcxMarketField label="Origin" value={props.trade.normalized_origin_location} />
          <DcxMarketField label="Destination" value={props.trade.normalized_destination_location} />
          <DcxMarketField label="Incoterm" value={props.trade.normalized_incoterm_code} />
          <DcxMarketField label="Shipping" value={props.trade.normalized_shipping_method} />
        </div>
      </div>
      {props.startedThread ? (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-950">
          <div className="flex items-start gap-2">
            <CheckCircle2Icon className="mt-0.5 size-4 shrink-0 text-emerald-600" />
            <div>
              <p className="font-medium">Discussion started.</p>
              <p className="mt-1 text-emerald-800">Private trade thread {props.startedThread.threadReferenceCode} is ready.</p>
            </div>
          </div>
        </div>
      ) : null}
      {props.threadErrorText ? <p className="text-sm text-red-600">{props.threadErrorText}</p> : null}
      {props.trade.is_owned_by_authenticated_user ? (
        <Button type="button" variant="outline" onClick={() => { window.location.href = `/me/trades/${props.trade.trade_id}` }}>
          Open my trade
        </Button>
      ) : (
        <Button type="button" onClick={props.onStartThread} disabled={props.isStartingThread || Boolean(props.startedThread)}>
          {props.isStartingThread ? "Starting..." : props.startedThread ? "Discussion started" : "Discuss this deal"}
        </Button>
      )}
    </div>
  )
}

function DcxMarketField(props: { label: string; value: string | number | null | undefined }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">{props.label}</p>
      <p className="mt-1 text-sm text-slate-950">{readMarketText(props.value)}</p>
    </div>
  )
}

function DcxMarketSortableHeader<TData>(props: { column: Column<TData, unknown>; title: string }) {
  const isSorted = props.column.getIsSorted()
  return (
    <button type="button" onClick={() => props.column.toggleSorting(isSorted === "asc")} className="inline-flex items-center gap-1 text-left">
      <span>{props.title}</span>
      <span className="text-[0.8rem] text-slate-400">{isSorted ? (isSorted === "asc" ? "↑" : "↓") : "↕"}</span>
    </button>
  )
}

function readMarketText(value: string | number | null | undefined): string {
  if (typeof value === "number") {
    return Number.isInteger(value) ? String(value) : String(value)
  }
  const normalizedValue = typeof value === "string" ? value.trim() : ""
  return normalizedValue && normalizedValue.toLowerCase() !== "not specified" ? normalizedValue : "—"
}

function readMarketPriceLabel(trade: Pick<DcxAppMarketTradeCatalogRow, "normalized_price_value" | "normalized_currency_code" | "normalized_price_unit_basis">): string {
  if (trade.normalized_price_value === null) {
    return "Price not specified"
  }
  const currencyCode = readMarketText(trade.normalized_currency_code)
  const unitBasis = readMarketText(trade.normalized_price_unit_basis)
  return `${trade.normalized_price_value}${currencyCode !== "—" ? ` ${currencyCode}` : ""}${unitBasis !== "—" ? ` / ${unitBasis}` : ""}`
}
