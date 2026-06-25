/**
 * CONTEXT:
 * First authenticated Trades page for the DCX app.
 * It exists to turn Slice 1 trade projections into an actionable review surface where traders can
 * inspect, correct, confirm, or reject extracted trade candidates before Slice 2 interaction flows.
 */
import { useEffect, useMemo, useRef, useState } from "react"
import type { ReactNode } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import type { Column, ColumnDef, SortingState } from "@tanstack/react-table"
import {
  CalendarDaysIcon,
  RefreshCwIcon,
  SearchIcon,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { DcxAppDataTable } from "@/components/ui/dcx_app_data_table"
import { Input } from "@/components/ui/input"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable"
import {
  Combobox,
  ComboboxCollection,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxGroup,
  ComboboxGroupLabel,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
  ComboboxTriggerIcon,
} from "@/components/ui/combobox"
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
import { readDcxAppAuthenticatedUserAccountSummary } from "../lib/read_dcx_app_authenticated_user_account_summary"
import {
  readDcxAppAuthenticatedUserTradeDetail,
  type DcxAppAuthenticatedUserTradeDetail,
} from "../lib/read_dcx_app_authenticated_user_trade_detail"
import {
  readDcxAppAuthenticatedUserTradesCatalog,
  type DcxAppAuthenticatedUserTradeCatalogRow,
} from "../lib/read_dcx_app_authenticated_user_trades_catalog"
import {
  updateDcxAppAuthenticatedUserTradeCandidate,
  type DcxAppTradeCandidatePatchPayload,
} from "../lib/update_dcx_app_authenticated_user_trade_candidate"
import { setDcxAppAuthenticatedUserTradeVisibility } from "../lib/set_dcx_app_authenticated_user_trade_visibility"
import {
  useDcxAppBalancedDesktopSplitMode,
  useDcxAppDetailSheetMode,
} from "./use_dcx_app_master_detail_layout_mode"
import {
  readDcxAppFlatTradeMaterialOptions,
  readDcxAppGroupedTradeMaterialOptions,
  type DcxAppGroupedTradeMaterialOption,
  type DcxAppGroupedTradeMaterialOptionGroup,
} from "../lib/dcx_app_trade_material_interest_options"

type Props = {
  apiBaseUrl: string
  routeTradeId?: number | null
}

type DcxTradeEditFormState = {
  trade_confirmation_status: string
  trade_status: string
  normalized_trade_side: string
  normalized_material_name: string
  normalized_material_key: string
  normalized_quantity_value: string
  normalized_quantity_unit: string
  normalized_price_mode: string
  normalized_price_value: string
  normalized_price_unit_basis: string
  normalized_currency_code: string
  normalized_total_price_value: string
  normalized_origin_location: string
  normalized_destination_location: string
  normalized_shipping_method: string
  normalized_incoterm_code: string
  normalized_delivery_window_start_text: string
  normalized_delivery_window_end_text: string
  normalized_quality_summary_text: string
  normalized_payment_terms_summary_text: string
}

type DcxTradeFormVisualState = "idle" | "editing" | "saving" | "saved" | "error"
type DcxTradeSideFilter = "all" | "buy" | "sell"
type DcxTradeStateFilter = "all" | "draft" | "needs_more_detail" | "pending_confirmation" | "confirmed" | "under_revision" | "rejected"
type DcxTradeVisibilityStatus = "private" | "shareable" | "public"

const DCX_TRADE_FORM_AUTOSAVE_DELAY_MS = 30000
const DCX_TRADE_FORM_SAVED_VISIBLE_MS = 10000
const DCX_TRADE_SELECT_BLANK_VALUE = "__dcx_blank__"
const DCX_TRADE_STATE_OPTIONS = [
  { value: "draft", label: "Draft" },
  { value: "needs_more_detail", label: "Needs more detail" },
  { value: "pending_confirmation", label: "Pending confirmation" },
  { value: "confirmed", label: "Confirmed" },
  { value: "under_revision", label: "Under revision" },
  { value: "rejected", label: "Rejected" },
]
const DCX_TRADE_VISIBILITY_OPTIONS: Array<{ value: DcxTradeVisibilityStatus; label: string }> = [
  { value: "private", label: "Private" },
  { value: "shareable", label: "Shareable" },
  { value: "public", label: "Public" },
]
const DCX_TRADE_SIDE_OPTIONS = [
  { value: "sell", label: "Sell" },
  { value: "buy", label: "Buy" },
]
const DCX_TRADE_PRICE_MODE_OPTIONS = [
  { value: "fixed", label: "Fixed" },
  { value: "indicative", label: "Indicative" },
  { value: "negotiable", label: "Negotiable" },
  { value: "index linked", label: "Index linked" },
]
const DCX_TRADE_QUANTITY_UNIT_OPTIONS = [
  { value: "MT", label: "MT" },
  { value: "kg", label: "kg" },
  { value: "lb", label: "lb" },
  { value: "bushel", label: "bushel" },
  { value: "barrel", label: "barrel" },
  { value: "container", label: "container" },
  { value: "containers", label: "containers" },
  { value: "bag", label: "bag" },
  { value: "bags", label: "bags" },
]
const DCX_TRADE_CURRENCY_OPTIONS = [
  { value: "USD", label: "USD" },
  { value: "EUR", label: "EUR" },
  { value: "GBP", label: "GBP" },
  { value: "CNY", label: "CNY" },
  { value: "USDT", label: "USDT" },
  { value: "USDC", label: "USDC" },
]
const DCX_TRADE_INCOTERM_OPTIONS = [
  { value: "EXW", label: "EXW" },
  { value: "FCA", label: "FCA" },
  { value: "FAS", label: "FAS" },
  { value: "FOB", label: "FOB" },
  { value: "CFR", label: "CFR" },
  { value: "CIF", label: "CIF" },
  { value: "CPT", label: "CPT" },
  { value: "CIP", label: "CIP" },
  { value: "DAP", label: "DAP" },
  { value: "DPU", label: "DPU" },
  { value: "DDP", label: "DDP" },
]
const DCX_TRADE_SHIPPING_METHOD_OPTIONS = [
  { value: "bulk vessel", label: "Bulk vessel" },
  { value: "container", label: "Container" },
  { value: "truck", label: "Truck" },
  { value: "rail", label: "Rail" },
  { value: "barge", label: "Barge" },
  { value: "pipeline", label: "Pipeline" },
  { value: "air", label: "Air" },
]

export function DcxAppTradesPage(props: Props) {
  const queryClient = useQueryClient()
  const autosaveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const resetVisualStateTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const preserveSavedVisualStateRef = useRef(false)
  const [selectedTradeId, setSelectedTradeId] = useState<number | null>(null)
  const [editFormState, setEditFormState] = useState<DcxTradeEditFormState>(buildEmptyTradeEditFormState())
  const [lastSavedSnapshot, setLastSavedSnapshot] = useState("")
  const [visualState, setVisualState] = useState<DcxTradeFormVisualState>("idle")
  const [nextAutosaveAtTsMs, setNextAutosaveAtTsMs] = useState<number | null>(null)
  const [autosaveCountdownSeconds, setAutosaveCountdownSeconds] = useState<number | null>(null)
  const [tradeSearchQuery, setTradeSearchQuery] = useState("")
  const [tradeSideFilter, setTradeSideFilter] = useState<DcxTradeSideFilter>("all")
  const [tradeStateFilter, setTradeStateFilter] = useState<DcxTradeStateFilter>("all")
  const [tradeMaterialFilter, setTradeMaterialFilter] = useState("all")
  const [isMobileDetailOpen, setIsMobileDetailOpen] = useState(false)
  const isDetailSheetMode = useDcxAppDetailSheetMode()
  const isBalancedDesktopSplitMode = useDcxAppBalancedDesktopSplitMode()
  const [tradeSorting, setTradeSorting] = useState<SortingState>([
    { id: "updated", desc: true },
  ])

  const accountSummaryQuery = useQuery({
    queryKey: ["dcx_app_authenticated_user_account_summary"],
    queryFn: async () => readDcxAppAuthenticatedUserAccountSummary({ apiBaseUrl: props.apiBaseUrl }),
  })
  const tradesCatalogQuery = useQuery({
    queryKey: ["dcx_app_authenticated_user_trades_catalog"],
    queryFn: async () => readDcxAppAuthenticatedUserTradesCatalog({ apiBaseUrl: props.apiBaseUrl }),
  })

  const trades = tradesCatalogQuery.data?.data.trades ?? []
  const accountSummary = accountSummaryQuery.data?.data ?? null
  const ux = accountSummary?.ux_strings ?? DCX_APP_ACCOUNT_PAGE_DEFAULT_UX_STRINGS
  const selectedTimezoneIanaName = accountSummary?.preferred_timezone?.iana_name ?? null
  const selectedLanguageCode = accountSummary?.preferred_language?.language_code ?? "en"
  const tradeMaterialOptionGroups = readDcxAppGroupedTradeMaterialOptions(
    accountSummary?.available_trade_interest_materials ?? [],
  )
  const tradeStateOptions = useMemo(
    () => DCX_TRADE_STATE_OPTIONS.map((statusOption) => ({
      ...statusOption,
      label: readDcxTradeStateLabel(statusOption.value, ux),
    })),
    [ux],
  )
  const tradeSideOptions = useMemo(
    () => DCX_TRADE_SIDE_OPTIONS.map((sideOption) => ({
      ...sideOption,
      label: readDcxTradeSideLabel(sideOption.value, ux),
    })),
    [ux],
  )
  const tradePriceModeOptions = useMemo(
    () => DCX_TRADE_PRICE_MODE_OPTIONS.map((priceModeOption) => ({
      ...priceModeOption,
      label: readDcxTradePriceModeLabel(priceModeOption.value, ux),
    })),
    [ux],
  )
  const tradeMaterialFilterOptions = useMemo(
    () => readDcxTradeMaterialFilterOptions(trades),
    [trades],
  )
  const filteredTrades = useMemo(
    () =>
      readDcxTradesMatchingFilters({
        trades,
        searchQuery: tradeSearchQuery,
        sideFilter: tradeSideFilter,
        stateFilter: tradeStateFilter,
        materialFilter: tradeMaterialFilter,
      }),
    [tradeMaterialFilter, tradeSearchQuery, tradeSideFilter, tradeStateFilter, trades],
  )

  useEffect(() => {
    if (selectedTradeId !== null) {
      return
    }

    if (props.routeTradeId !== null && props.routeTradeId !== undefined) {
      setSelectedTradeId(props.routeTradeId)
      return
    }

    if (trades[0]) {
      setSelectedTradeId(trades[0].trade_id)
    }
  }, [props.routeTradeId, selectedTradeId, trades])

  const selectedTradeDetailQuery = useQuery({
    queryKey: ["dcx_app_authenticated_user_trade_detail", selectedTradeId],
    enabled: typeof selectedTradeId === "number",
    queryFn: async () =>
      readDcxAppAuthenticatedUserTradeDetail({
        apiBaseUrl: props.apiBaseUrl,
        tradeId: selectedTradeId as number,
      }),
  })

  const selectedTrade = selectedTradeDetailQuery.data?.data ?? null

  useEffect(() => {
    if (!selectedTrade) {
      setLastSavedSnapshot("")
      setVisualState("idle")
      return
    }
    const nextFormState = buildTradeEditFormStateFromTradeDetail(selectedTrade)
    setEditFormState(nextFormState)
    setLastSavedSnapshot(buildTradeFormSnapshot(nextFormState))
    if (preserveSavedVisualStateRef.current) {
      preserveSavedVisualStateRef.current = false
      return
    }
    setVisualState("idle")
  }, [selectedTrade])

  useEffect(() => {
    if (nextAutosaveAtTsMs === null) {
      setAutosaveCountdownSeconds(null)
      return
    }

    const updateCountdown = () => {
      const secondsRemaining = Math.max(0, Math.ceil((nextAutosaveAtTsMs - Date.now()) / 1000))
      setAutosaveCountdownSeconds(secondsRemaining)
    }

    updateCountdown()
    const intervalId = window.setInterval(updateCountdown, 1000)
    return () => window.clearInterval(intervalId)
  }, [nextAutosaveAtTsMs])

  async function refreshTradeRelatedQueries(targetTradeId: number, sourceMessageId: number | null) {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["dcx_app_authenticated_user_trades_catalog"] }),
      queryClient.invalidateQueries({ queryKey: ["dcx_app_authenticated_user_trade_detail", targetTradeId] }),
      queryClient.invalidateQueries({ queryKey: ["dcx_app_authenticated_user_messages_inbox"] }),
      sourceMessageId !== null
        ? queryClient.invalidateQueries({ queryKey: ["dcx_app_authenticated_user_message_detail", sourceMessageId] })
        : Promise.resolve(),
    ])
  }

  const updateTradeMutation = useMutation({
    mutationFn: async (params: { tradeId: number; patchPayload: DcxAppTradeCandidatePatchPayload; sourceMessageId: number | null }) =>
      updateDcxAppAuthenticatedUserTradeCandidate({
        apiBaseUrl: props.apiBaseUrl,
        tradeId: params.tradeId,
        patchPayload: params.patchPayload,
      }),
    onSuccess: async (payload, variables) => {
      queryClient.setQueryData(
        ["dcx_app_authenticated_user_trade_detail", variables.tradeId],
        payload,
      )
      await refreshTradeRelatedQueries(variables.tradeId, variables.sourceMessageId)
    },
  })
  const updateTradeVisibilityMutation = useMutation({
    mutationFn: async (params: { tradeId: number; visibilityStatus: DcxTradeVisibilityStatus; sourceMessageId: number | null }) =>
      setDcxAppAuthenticatedUserTradeVisibility({
        apiBaseUrl: props.apiBaseUrl,
        tradeId: params.tradeId,
        visibilityStatus: params.visibilityStatus,
      }),
    onSuccess: async (payload, variables) => {
      queryClient.setQueryData(
        ["dcx_app_authenticated_user_trade_detail", variables.tradeId],
        payload,
      )
      await Promise.all([
        refreshTradeRelatedQueries(variables.tradeId, variables.sourceMessageId),
        queryClient.invalidateQueries({ queryKey: ["dcx_app_market_trades_catalog"] }),
      ])
    },
  })

  const currentFormSnapshot = buildTradeFormSnapshot(editFormState)
  const isDirty = selectedTrade !== null && currentFormSnapshot !== lastSavedSnapshot
  const effectiveVisualState = readDcxTradeEffectiveFormVisualState({
    visualState,
    isDirty,
    isSaving: updateTradeMutation.isPending || updateTradeVisibilityMutation.isPending,
    hasError: updateTradeMutation.isError || updateTradeVisibilityMutation.isError,
  })

  const mutationErrorText =
    (
      updateTradeMutation.error as (Error & { suggested_action?: string }) | null
    )?.suggested_action ??
    (
      updateTradeVisibilityMutation.error as (Error & { suggested_action?: string }) | null
    )?.suggested_action ??
    (
      updateTradeMutation.error as Error | null
    )?.message ??
    (
      updateTradeVisibilityMutation.error as Error | null
    )?.message ??
    null

  const columns = useMemo<Array<ColumnDef<DcxAppAuthenticatedUserTradeCatalogRow>>>(
    () => [
      {
        id: "trade",
        accessorFn: (trade) => readDcxTradeCatalogTitle(trade),
        header: ({ column }) => <DcxTradeSortableHeader column={column} title={ux.trades_table_column_trade ?? "Trade"} />,
        cell: ({ row }) => (
          <div className="min-w-0">
            <p className="line-clamp-1 font-medium text-slate-950">
              {readDcxTradeCatalogTitle(row.original)}
            </p>
          </div>
        ),
      },
      {
        id: "side",
        accessorFn: (trade) => normalizeDcxTradeTextValue(trade.normalized_trade_side),
        header: ({ column }) => <DcxTradeSortableHeader column={column} title={ux.trades_table_column_side ?? "Side"} />,
        cell: ({ row }) => readDcxTradeSideLabel(row.original.normalized_trade_side, ux),
      },
      {
        id: "amount",
        accessorFn: (trade) => trade.normalized_quantity_value ?? -1,
        header: ({ column }) => <DcxTradeSortableHeader column={column} title={ux.trades_table_column_amount ?? "Amount"} />,
        cell: ({ row }) => formatDcxTradeVersionNumber(row.original.normalized_quantity_value),
      },
      {
        id: "unit",
        accessorFn: (trade) => normalizeDcxTradeTextValue(trade.normalized_quantity_unit),
        header: ({ column }) => <DcxTradeSortableHeader column={column} title={ux.trades_table_column_unit ?? "Unit"} />,
        cell: ({ row }) => readDcxTradeDisplayText(row.original.normalized_quantity_unit),
      },
      {
        id: "material",
        accessorFn: (trade) => normalizeDcxTradeTextValue(trade.normalized_material_name),
        header: ({ column }) => <DcxTradeSortableHeader column={column} title={ux.trades_table_column_thing ?? "Thing"} />,
        cell: ({ row }) => (
          <span className="line-clamp-1 text-sm text-slate-900">
            {readDcxTradeDisplayText(row.original.normalized_material_name)}
          </span>
        ),
      },
      {
        id: "unit_price",
        accessorFn: (trade) => readDcxTradePriceSortValue(trade),
        header: ({ column }) => <DcxTradeSortableHeader column={column} title={ux.trades_table_column_unit_price ?? "Unit price"} />,
        cell: ({ row }) => readDcxTradeCatalogPriceLabel(row.original, ux),
      },
      {
        id: "origin",
        accessorFn: (trade) => normalizeDcxTradeTextValue(trade.normalized_origin_location),
        header: ({ column }) => <DcxTradeSortableHeader column={column} title={ux.trades_table_column_origin ?? "Origin"} />,
        cell: ({ row }) => (
          <span className="line-clamp-1 text-sm text-slate-900">
            {readDcxTradeDisplayText(row.original.normalized_origin_location)}
          </span>
        ),
      },
      {
        id: "status",
        accessorFn: (trade) => readDcxTradeOverallStatusSortValue(trade),
        header: ({ column }) => <DcxTradeSortableHeader column={column} title={ux.trades_table_column_state ?? "State"} />,
        cell: ({ row }) => <DcxTradeOverallStatusIndicator trade={row.original} ux={ux} />,
      },
      {
        id: "updated",
        accessorFn: (trade) => trade.updated_at_ts_ms,
        header: ({ column }) => <DcxTradeSortableHeader column={column} title={ux.trades_table_column_updated ?? "Updated"} />,
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

  const isAnyTradeMutationPending = updateTradeMutation.isPending || updateTradeVisibilityMutation.isPending

  async function updateSelectedTradeVisibility(nextVisibilityStatus: DcxTradeVisibilityStatus): Promise<void> {
    if (!selectedTrade || nextVisibilityStatus === selectedTrade.visibility_status) {
      return
    }
    const savedBeforeVisibilityChange = await persistCurrentTradeForm()
    if (!savedBeforeVisibilityChange) {
      return
    }
    setVisualState("saving")
    try {
      await updateTradeVisibilityMutation.mutateAsync({
        tradeId: selectedTrade.trade_id,
        sourceMessageId: selectedTrade.source_message_id,
        visibilityStatus: nextVisibilityStatus,
      })
      preserveSavedVisualStateRef.current = true
      setVisualState("saved")
      if (resetVisualStateTimeoutRef.current) {
        clearTimeout(resetVisualStateTimeoutRef.current)
      }
      resetVisualStateTimeoutRef.current = setTimeout(() => {
        setVisualState("idle")
      }, DCX_TRADE_FORM_SAVED_VISIBLE_MS)
    } catch {
      setVisualState("error")
    }
  }

  async function persistCurrentTradeForm(): Promise<boolean> {
    if (!selectedTrade || !isDirty) {
      return true
    }
    if (autosaveTimeoutRef.current) {
      clearTimeout(autosaveTimeoutRef.current)
      autosaveTimeoutRef.current = null
    }
    setNextAutosaveAtTsMs(null)
    setAutosaveCountdownSeconds(null)
    setVisualState("saving")

    try {
      const savedSnapshot = buildTradeFormSnapshot(editFormState)
      await updateTradeMutation.mutateAsync({
        tradeId: selectedTrade.trade_id,
        sourceMessageId: selectedTrade.source_message_id,
        patchPayload: buildTradePatchPayloadFromFormState(editFormState),
      })
      preserveSavedVisualStateRef.current = true
      setLastSavedSnapshot(savedSnapshot)
      setVisualState("saved")
      if (resetVisualStateTimeoutRef.current) {
        clearTimeout(resetVisualStateTimeoutRef.current)
      }
      resetVisualStateTimeoutRef.current = setTimeout(() => {
        setVisualState("idle")
      }, DCX_TRADE_FORM_SAVED_VISIBLE_MS)
      return true
    } catch {
      setVisualState("error")
      return false
    }
  }

  useEffect(() => {
    if (!selectedTrade || !isDirty || isAnyTradeMutationPending) {
      setNextAutosaveAtTsMs(null)
      setAutosaveCountdownSeconds(null)
      if (!isDirty && visualState === "editing") {
        setVisualState("idle")
      }
      return
    }

    setVisualState("editing")
    if (autosaveTimeoutRef.current) {
      clearTimeout(autosaveTimeoutRef.current)
    }

    const nextAutosaveTsMs = Date.now() + DCX_TRADE_FORM_AUTOSAVE_DELAY_MS
    setNextAutosaveAtTsMs(nextAutosaveTsMs)
    setAutosaveCountdownSeconds(DCX_TRADE_FORM_AUTOSAVE_DELAY_MS / 1000)
    autosaveTimeoutRef.current = setTimeout(() => {
      void persistCurrentTradeForm()
    }, DCX_TRADE_FORM_AUTOSAVE_DELAY_MS)
    return () => {
      if (autosaveTimeoutRef.current) {
        clearTimeout(autosaveTimeoutRef.current)
        autosaveTimeoutRef.current = null
      }
    }
  }, [currentFormSnapshot, isAnyTradeMutationPending, isDirty, selectedTrade?.trade_id, visualState])

  const tradeListPanel = (
    <section className="min-w-0 overflow-hidden border border-black/6 bg-white shadow-[0_18px_55px_-48px_rgba(15,23,42,0.45)]">
              <div className="flex flex-col gap-4 border-b border-black/6 px-4 py-3">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                  <label className="relative block w-full lg:flex-1">
                    <SearchIcon className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                    <Input
                      value={tradeSearchQuery}
                      onChange={(event) => setTradeSearchQuery(event.target.value)}
                      placeholder={ux.trades_search_placeholder ?? "Search trades..."}
                      className="pl-9"
                    />
                  </label>
                  <div className="flex items-center justify-between gap-3 lg:justify-end">
                    <p className="text-xs text-slate-500">
                      {filteredTrades.length} of {tradesCatalogQuery.data?.data.total_trade_count ?? trades.length}
                    </p>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        void queryClient.invalidateQueries({ queryKey: ["dcx_app_authenticated_user_trades_catalog"] })
                        if (selectedTradeId !== null) {
                          void queryClient.invalidateQueries({
                            queryKey: ["dcx_app_authenticated_user_trade_detail", selectedTradeId],
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
              <div className="grid grid-cols-1 gap-3 border-b border-black/6 px-4 py-3 md:grid-cols-2 2xl:grid-cols-3">
                <Select value={tradeSideFilter} onValueChange={(value) => setTradeSideFilter(value as DcxTradeSideFilter)}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder={ux.trades_filter_all_sides ?? "All sides"} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{ux.trades_filter_all_sides ?? "All sides"}</SelectItem>
                    {tradeSideOptions.map((sideOption) => (
                      <SelectItem key={sideOption.value} value={sideOption.value}>
                        {sideOption.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={tradeStateFilter} onValueChange={(value) => setTradeStateFilter(value as DcxTradeStateFilter)}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder={ux.trades_filter_all_states ?? "All states"} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{ux.trades_filter_all_states ?? "All states"}</SelectItem>
                    {tradeStateOptions.map((statusOption) => (
                      <SelectItem key={statusOption.value} value={statusOption.value}>
                        {statusOption.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={tradeMaterialFilter} onValueChange={setTradeMaterialFilter}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder={ux.trades_filter_all_materials ?? "All materials"} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{ux.trades_filter_all_materials ?? "All materials"}</SelectItem>
                    {tradeMaterialFilterOptions.map((materialOption) => (
                      <SelectItem key={materialOption.value} value={materialOption.value}>
                        {materialOption.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {tradesCatalogQuery.isLoading ? (
                <div className="px-4 py-8">
                  <p className="text-sm text-slate-500">{ux.trades_loading ?? "Loading trades..."}</p>
                </div>
              ) : null}

              {tradesCatalogQuery.isError ? (
                <div className="px-4 py-8">
                  <h3 className="text-base font-semibold text-slate-950">{ux.trades_error_title ?? "Trade Objects could not load"}</h3>
                  <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
                    {(
                      (tradesCatalogQuery.error as Error & { suggested_action?: string })?.suggested_action ??
                      (tradesCatalogQuery.error as Error)?.message
                    ) || (ux.trades_error_suggested_action ?? "Retry after confirming the backend is reachable.")}
                  </p>
                </div>
              ) : null}

              {!tradesCatalogQuery.isLoading && !tradesCatalogQuery.isError ? (
                <DcxAppDataTable
                  columns={columns}
                  data={filteredTrades}
                  tableClassName="[&_td]:py-3"
                  sorting={tradeSorting}
                  onSortingChange={setTradeSorting}
                  pageSize={25}
                  onRowClick={(row) => {
                    setSelectedTradeId(row.trade_id)
                    writeDcxTradeIdToCurrentUrl(row.trade_id)
                    if (isDetailSheetMode) {
                      setIsMobileDetailOpen(true)
                    }
                  }}
                  readRowClassName={(row) => row.trade_id === selectedTradeId ? "bg-sky-50 hover:bg-sky-50 ring-1 ring-inset ring-sky-200" : ""}
                  readColumnWidthClassName={(columnId) => {
                    if (columnId === "trade") {
                      return "w-[30%]"
                    }
                    if (columnId === "material") {
                      return "w-[15%]"
                    }
                    if (columnId === "unit_price" || columnId === "origin") {
                      return "w-[12%]"
                    }
                    if (columnId === "updated") {
                      return "w-[13%]"
                    }
                    if (columnId === "state") {
                      return "w-[7%]"
                    }
                    if (columnId === "side" || columnId === "amount" || columnId === "unit" || columnId === "status") {
                      return "w-[6%]"
                    }
                    return "w-[8%]"
                  }}
                  emptyLabel={ux.trades_empty ?? "No structured trades match these filters."}
                />
              ) : null}
    </section>
  )

  const tradeDetailPanel = (
    <aside className="h-full min-w-0 overflow-y-auto border border-black/6 bg-white p-6 shadow-[0_18px_55px_-48px_rgba(15,23,42,0.45)]">
            {selectedTradeDetailQuery.isError ? (
              <div className="rounded-lg border border-red-200 bg-red-50/70 px-4 py-3 text-sm text-red-700">
                We could not load this trade detail. Apply the latest database migration if this started after the
                commodity selector update, then refresh this trade.
              </div>
            ) : selectedTradeDetailQuery.isLoading || selectedTradeDetailQuery.isFetching ? (
              <p className="text-sm text-slate-500">
                {ux.loading_trade_detail ?? "Loading trade detail..."}
              </p>
            ) : !selectedTrade ? (
              <p className="text-sm text-slate-500">
                {ux.trades_detail_empty ?? "Choose a trade candidate to inspect, confirm, or correct it."}
              </p>
            ) : (
              <div className="space-y-6">
                <div>
                  <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
                    <span>{ux.trades_detail_summary_label ?? "Summary"}</span>
                    <span aria-hidden="true">|</span>
                    <button
                      type="button"
                      onClick={() => navigateDcxAppToPath(`/me/messages/${selectedTrade.source_message_id}`)}
                      className="tracking-[0.18em] text-sky-700 transition-colors hover:text-sky-950"
                    >
                      Message {selectedTrade.source_message_id}
                    </button>
                  </p>
                  <h2 className="mt-2 text-xl font-semibold text-slate-950">
                    {selectedTrade.trade_summary_text || selectedTrade.normalized_material_name || "Trade"}
                  </h2>
                  {readDcxTradeConfirmationNotificationStatus(selectedTrade.trade_metadata_json) ? (
                    <p className="mt-2 text-sm text-slate-600">
                      Notification: {readDcxTradeConfirmationNotificationStatus(selectedTrade.trade_metadata_json)}
                    </p>
                  ) : null}
                  {selectedTrade.source_first_image_attachment ? (
                    <DcxTradeSourceMessageImagePreview
                      apiBaseUrl={props.apiBaseUrl}
                      attachment={selectedTrade.source_first_image_attachment}
                    />
                  ) : null}
                </div>

                {mutationErrorText ? (
                  <div className="rounded-lg border border-red-200 bg-red-50/70 px-4 py-3 text-sm text-red-700">
                    {mutationErrorText}
                  </div>
                ) : null}

                <section className={[
                  "rounded-lg border bg-white px-4 py-3 transition-colors",
                  readDcxTradeFormBorderClass(effectiveVisualState),
                ].join(" ")}>
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                      <p className={["mt-1 text-sm font-medium", readDcxTradeFormStatusTextClass(effectiveVisualState)].join(" ")}>
                        {readDcxTradeFormStatusLabel(effectiveVisualState, ux)}
                        {effectiveVisualState === "editing" && autosaveCountdownSeconds !== null
                          ? ` · ${ux.trades_autosave_prefix ?? "Autosave in"} ${autosaveCountdownSeconds}s`
                          : ""}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-3">
                      <Select
                        value={(selectedTrade.visibility_status || "private") as DcxTradeVisibilityStatus}
                        onValueChange={(nextVisibilityStatus) => {
                          void updateSelectedTradeVisibility(nextVisibilityStatus as DcxTradeVisibilityStatus)
                        }}
                        disabled={isAnyTradeMutationPending}
                      >
                        <SelectTrigger className="h-9 w-[150px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {DCX_TRADE_VISIBILITY_OPTIONS.map((visibilityOption) => (
                            <SelectItem key={visibilityOption.value} value={visibilityOption.value}>
                              {readDcxTradeVisibilityLabel(visibilityOption.value, ux)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button
                        type="button"
                        variant="outline"
                        disabled={isAnyTradeMutationPending || !isDirty}
                        onClick={() => {
                          void persistCurrentTradeForm()
                        }}
                      >
                        {updateTradeMutation.isPending
                          ? (ux.trades_saving_button ?? "Saving...")
                          : isDirty
                            ? (ux.trades_save_details_button ?? "Save details")
                            : (ux.trades_saved_button ?? "Saved")}
                      </Button>
                    </div>
                  </div>
                </section>

                <section className={[
                  "space-y-4 rounded-lg border border-slate-200 bg-white p-4",
                ].join(" ")}>
                  <div className="grid gap-4 md:grid-cols-2">
                    <DcxTradeEditField label={ux.trades_trade_state_label ?? "Trade state"}>
                      <DcxTradeSelect
                        value={readDcxTradeStateValue(editFormState.trade_confirmation_status, editFormState.trade_status)}
                        options={tradeStateOptions}
                        disabled={isAnyTradeMutationPending}
                        allowBlank={false}
                        onChange={(nextStatus) => setEditFormState((current) => ({
                          ...current,
                          ...readDcxTradeStatusFieldsFromStateValue(nextStatus),
                        }))}
                      />
                    </DcxTradeEditField>
                    <DcxTradeEditField label={ux.trades_trade_side_label ?? "Trade side"}>
                      <DcxTradeSelect
                        value={editFormState.normalized_trade_side}
                        options={tradeSideOptions}
                        onChange={(nextValue) => setEditFormState((current) => ({ ...current, normalized_trade_side: nextValue }))}
                      />
                    </DcxTradeEditField>
                    <div className="grid gap-4 md:col-span-2 md:grid-cols-2">
                      <DcxTradeEditField label="Commodity">
                        <DcxTradeMaterialKeyCombobox
                          value={editFormState.normalized_material_key}
                          optionGroups={tradeMaterialOptionGroups}
                          disabled={isAnyTradeMutationPending}
                          onChange={(nextMaterialKey) => setEditFormState((current) => ({
                            ...current,
                            normalized_material_key: nextMaterialKey,
                          }))}
                          onBeginEditing={() => setVisualState("editing")}
                        />
                      </DcxTradeEditField>
                      <DcxTradeEditField label={ux.trades_material_label ?? "Material"}>
                        <Input
                          value={editFormState.normalized_material_name}
                          onChange={(event) => setEditFormState((current) => ({ ...current, normalized_material_name: event.target.value }))}
                        />
                      </DcxTradeEditField>
                    </div>
                    <DcxTradeEditField label={ux.trades_quantity_value_label ?? "Quantity"}>
                      <Input
                        value={editFormState.normalized_quantity_value}
                        onChange={(event) => setEditFormState((current) => ({ ...current, normalized_quantity_value: event.target.value }))}
                      />
                    </DcxTradeEditField>
                    <DcxTradeEditField label={ux.trades_quantity_unit_label ?? "Units"}>
                      <DcxTradeSelect
                        value={editFormState.normalized_quantity_unit}
                        options={DCX_TRADE_QUANTITY_UNIT_OPTIONS}
                        onChange={(nextValue) => setEditFormState((current) => ({
                          ...current,
                          normalized_quantity_unit: nextValue,
                          normalized_price_unit_basis: nextValue,
                        }))}
                      />
                    </DcxTradeEditField>
                    <DcxTradeEditField label={ux.trades_price_mode_label ?? "Price mode"}>
                      <DcxTradeSelect
                        value={editFormState.normalized_price_mode}
                        options={tradePriceModeOptions}
                        onChange={(nextValue) => setEditFormState((current) => ({ ...current, normalized_price_mode: nextValue }))}
                      />
                    </DcxTradeEditField>
                    <DcxTradeEditField label={ux.trades_price_value_label ?? "Price per unit"}>
                      <Input
                        value={editFormState.normalized_price_value}
                        onChange={(event) => setEditFormState((current) => ({ ...current, normalized_price_value: event.target.value }))}
                      />
                    </DcxTradeEditField>
                    <DcxTradeEditField label={ux.trades_currency_code_label ?? "Currency"}>
                      <DcxTradeSelect
                        value={editFormState.normalized_currency_code}
                        options={DCX_TRADE_CURRENCY_OPTIONS}
                        onChange={(nextValue) => setEditFormState((current) => ({ ...current, normalized_currency_code: nextValue }))}
                      />
                    </DcxTradeEditField>
                    <DcxTradeEditField label={ux.trades_total_price_value_label ?? "Total price"}>
                      <Input
                        value={editFormState.normalized_total_price_value}
                        onChange={(event) => setEditFormState((current) => ({ ...current, normalized_total_price_value: event.target.value }))}
                      />
                    </DcxTradeEditField>
                    <DcxTradeEditField label={ux.trades_table_column_origin ?? "Origin"}>
                      <Input
                        value={editFormState.normalized_origin_location}
                        onChange={(event) => setEditFormState((current) => ({ ...current, normalized_origin_location: event.target.value }))}
                      />
                    </DcxTradeEditField>
                    <DcxTradeEditField label={ux.trades_destination_label ?? "Destination"}>
                      <Input
                        value={editFormState.normalized_destination_location}
                        onChange={(event) => setEditFormState((current) => ({ ...current, normalized_destination_location: event.target.value }))}
                      />
                    </DcxTradeEditField>
                    <DcxTradeEditField label={ux.trades_shipping_method_label ?? "Shipping method"}>
                      <DcxTradeSelect
                        value={editFormState.normalized_shipping_method}
                        options={DCX_TRADE_SHIPPING_METHOD_OPTIONS}
                        onChange={(nextValue) => setEditFormState((current) => ({ ...current, normalized_shipping_method: nextValue }))}
                      />
                    </DcxTradeEditField>
                    <DcxTradeEditField label={ux.trades_incoterm_label ?? "Incoterm"}>
                      <DcxTradeSelect
                        value={editFormState.normalized_incoterm_code}
                        options={DCX_TRADE_INCOTERM_OPTIONS}
                        onChange={(nextValue) => setEditFormState((current) => ({ ...current, normalized_incoterm_code: nextValue }))}
                      />
                    </DcxTradeEditField>
                    <DcxTradeEditField label={ux.trades_delivery_window_start_label ?? "Delivery window start"}>
                      <DcxTradeDatePicker
                        value={editFormState.normalized_delivery_window_start_text}
                        selectedLanguageCode={selectedLanguageCode}
                        placeholder={ux.trades_date_not_set_label ?? "Choose date"}
                        onChange={(nextValue) => setEditFormState((current) => ({ ...current, normalized_delivery_window_start_text: nextValue }))}
                      />
                    </DcxTradeEditField>
                    <DcxTradeEditField label={ux.trades_delivery_window_end_label ?? "Delivery window end"}>
                      <DcxTradeDatePicker
                        value={editFormState.normalized_delivery_window_end_text}
                        selectedLanguageCode={selectedLanguageCode}
                        placeholder={ux.trades_date_not_set_label ?? "Choose date"}
                        onChange={(nextValue) => setEditFormState((current) => ({ ...current, normalized_delivery_window_end_text: nextValue }))}
                      />
                    </DcxTradeEditField>
                  </div>

                  <DcxTradeEditField label={ux.trades_quality_summary_label ?? "Quality summary"}>
                    <Textarea
                      value={editFormState.normalized_quality_summary_text}
                      onChange={(event) => setEditFormState((current) => ({ ...current, normalized_quality_summary_text: event.target.value }))}
                      rows={3}
                    />
                  </DcxTradeEditField>
                  <DcxTradeEditField label={ux.trades_payment_terms_summary_label ?? "Payment terms summary"}>
                    <Textarea
                      value={editFormState.normalized_payment_terms_summary_text}
                      onChange={(event) => setEditFormState((current) => ({ ...current, normalized_payment_terms_summary_text: event.target.value }))}
                      rows={3}
                    />
                  </DcxTradeEditField>
                </section>

                {selectedTrade.trade_versions.length > 0 ? (
                  <section className="rounded-lg border bg-slate-50/60 p-4">
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                          {ux.trades_version_history_label ?? "Version history"}
                        </p>
                        <p className="mt-1 text-sm text-slate-600">
                          {selectedTrade.trade_versions.length}{" "}
                          {selectedTrade.trade_versions.length === 1
                            ? (ux.trades_saved_shape_singular ?? "saved trade shape")
                            : (ux.trades_saved_shape_plural ?? "saved trade shapes")}
                        </p>
                      </div>
                    </div>
                    <div className="space-y-3">
                      {selectedTrade.trade_versions.map((tradeVersion) => (
                        <div
                          key={tradeVersion.version_id}
                          className={[
                            "rounded-md border bg-white p-3",
                            tradeVersion.is_live ? "border-emerald-200" : "border-slate-200",
                          ].join(" ")}
                        >
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="text-sm font-semibold text-slate-950">
                                {ux.trades_version_label ?? "Version"} {tradeVersion.version_number}
                              </span>
                              <DcxTradeStatusBadge
                                label={tradeVersion.version_source_type.replaceAll("_", " ")}
                                tone="neutral"
                              />
                              {tradeVersion.is_live ? (
                                <DcxTradeStatusBadge label={ux.trades_current_label ?? "Current"} tone="success" />
                              ) : null}
                            </div>
                            <span className="text-xs text-slate-500">
                              {formatDcxAppAccountTimestampLabel(
                                tradeVersion.updated_at_ts_ms,
                                selectedLanguageCode,
                                selectedTimezoneIanaName,
                                "—",
                              )}
                            </span>
                          </div>
                          <div className="mt-3 grid gap-2 text-sm text-slate-700 md:grid-cols-2">
                            <p>
                              <span className="font-medium text-slate-950">{ux.trades_state_label ?? "State:"}</span>{" "}
                              {readDcxTradeStateLabel(readDcxTradeStateValue(tradeVersion.trade_confirmation_status, tradeVersion.trade_status), ux)}
                            </p>
                            <p>
                              <span className="font-medium text-slate-950">{ux.trades_material_value_label ?? "Material:"}</span>{" "}
                              {tradeVersion.normalized_material_name || "—"}
                            </p>
                            <p>
                              <span className="font-medium text-slate-950">{ux.trades_quantity_value_summary_label ?? "Quantity:"}</span>{" "}
                              {formatDcxTradeVersionNumber(tradeVersion.normalized_quantity_value)} {tradeVersion.normalized_quantity_unit}
                            </p>
                            <p>
                              <span className="font-medium text-slate-950">{ux.trades_price_value_summary_label ?? "Price:"}</span>{" "}
                              {formatDcxTradeVersionNumber(tradeVersion.normalized_price_value)} {tradeVersion.normalized_currency_code}
                            </p>
                            <p>
                              <span className="font-medium text-slate-950">{ux.trades_total_value_summary_label ?? "Total:"}</span>{" "}
                              {formatDcxTradeVersionNumber(tradeVersion.normalized_total_price_value)}
                            </p>
                            <p>
                              <span className="font-medium text-slate-950">{ux.trades_route_label ?? "Route:"}</span>{" "}
                              {formatDcxTradeVersionRoute(tradeVersion.normalized_origin_location, tradeVersion.normalized_destination_location)}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </section>
                ) : null}

                <section className="rounded-lg border bg-slate-50/60 p-4">
                  <div className="grid gap-4">
                    <DcxTradeField label={ux.trades_raw_material_label ?? "Raw material"} value={selectedTrade.raw_material_text} />
                    <DcxTradeField label={ux.trades_raw_quantity_label ?? "Raw quantity"} value={selectedTrade.raw_quantity_text} />
                    <DcxTradeField label={ux.trades_raw_price_label ?? "Raw price"} value={selectedTrade.raw_price_text} />
                    <DcxTradeField label={ux.trades_raw_origin_label ?? "Raw origin"} value={selectedTrade.raw_origin_text} />
                    <DcxTradeField label={ux.trades_raw_destination_label ?? "Raw destination"} value={selectedTrade.raw_destination_text} />
                    <DcxTradeField label={ux.trades_trade_notes_label ?? "Trade notes"} value={selectedTrade.trade_extraction_notes_text} />
                  </div>
                </section>
              </div>
            )}
    </aside>
  )

  const selectedTradeTitle =
    selectedTrade?.trade_summary_text || selectedTrade?.normalized_material_name || "Trade"

  return (
    <section className="flex min-h-[calc(100vh-5rem)] min-w-0 flex-col gap-4 overflow-x-hidden">
      {isDetailSheetMode ? (
        <main className="min-w-0 overflow-x-hidden">{tradeListPanel}</main>
      ) : (
        <ResizablePanelGroup
          key={isBalancedDesktopSplitMode ? "balanced-desktop-split" : "wide-desktop-split"}
          orientation="horizontal"
          className="min-h-0 w-full max-w-full flex-1 overflow-hidden"
        >
          <ResizablePanel
            className="min-w-0 overflow-hidden"
            defaultSize={isBalancedDesktopSplitMode ? "50%" : "56%"}
            minSize="42%"
          >
            <div className="h-full min-w-0 overflow-x-hidden pr-2">{tradeListPanel}</div>
          </ResizablePanel>
          <ResizableHandle withHandle className="mx-1 bg-transparent" />
          <ResizablePanel
            className="min-w-0 overflow-hidden"
            defaultSize={isBalancedDesktopSplitMode ? "50%" : "44%"}
            minSize={isBalancedDesktopSplitMode ? "50%" : "34%"}
            maxSize="58%"
          >
            <div className="h-full min-w-0 overflow-x-hidden pl-2">{tradeDetailPanel}</div>
          </ResizablePanel>
        </ResizablePanelGroup>
      )}

      {isDetailSheetMode ? (
        <Sheet open={isMobileDetailOpen && selectedTradeId !== null} onOpenChange={setIsMobileDetailOpen}>
          <SheetContent className="overflow-x-hidden overflow-y-auto p-0 data-[side=right]:w-[90vw] data-[side=right]:max-w-[90vw] data-[side=right]:sm:max-w-[90vw]">
            <SheetHeader className="sr-only">
              <SheetTitle>{selectedTradeTitle}</SheetTitle>
              <SheetDescription>Trade detail</SheetDescription>
            </SheetHeader>
            {tradeDetailPanel}
          </SheetContent>
        </Sheet>
      ) : null}
    </section>
  )
}

function DcxTradeField(props: { label: string; value: string }) {
  return (
    <div className="space-y-1">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">{props.label}</p>
      <p className="text-sm text-slate-900">{readDcxTradeDisplayText(props.value)}</p>
    </div>
  )
}

function DcxTradeEditField(props: { label: string; children: ReactNode }) {
  return (
    <div className="space-y-1">
      <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">{props.label}</span>
      {props.children}
    </div>
  )
}

function DcxTradeSelect(props: {
  value: string
  options: Array<{ value: string; label: string }>
  disabled?: boolean
  allowBlank?: boolean
  onChange: (value: string) => void
}) {
  const normalizedValue = normalizeDcxTradeTextValue(props.value)
  const knownOptions = props.options.some((option) => option.value.toLowerCase() === normalizedValue.toLowerCase())
  const effectiveOptions = [
    ...(props.allowBlank === false ? [] : [{ value: DCX_TRADE_SELECT_BLANK_VALUE, label: "Not specified" }]),
    ...(normalizedValue && !knownOptions ? [{ value: normalizedValue, label: normalizedValue }] : []),
    ...props.options,
  ]
  const selectedOption = effectiveOptions.find((option) => option.value.toLowerCase() === normalizedValue.toLowerCase())
  const selectedValue = selectedOption?.value ?? effectiveOptions[0]?.value ?? DCX_TRADE_SELECT_BLANK_VALUE

  return (
    <Select
      value={selectedValue}
      disabled={props.disabled}
      onValueChange={(nextValue) => props.onChange(nextValue === DCX_TRADE_SELECT_BLANK_VALUE ? "" : nextValue)}
    >
      <SelectTrigger className="w-full bg-white">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {effectiveOptions.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

function DcxTradeMaterialKeyCombobox(props: {
  value: string
  optionGroups: DcxAppGroupedTradeMaterialOptionGroup[]
  disabled?: boolean
  onChange: (value: string) => void
  onBeginEditing?: () => void
}) {
  const normalizedValue = normalizeDcxTradeTextValue(props.value).toLowerCase()
  const flatOptions = readDcxAppFlatTradeMaterialOptions(props.optionGroups)
  const selectedOption = flatOptions.find((option) => option.value === normalizedValue) ??
    (normalizedValue
      ? {
          value: normalizedValue,
          label: formatDcxTradeMaterialKeyFallbackLabel(normalizedValue),
          searchLabel: normalizedValue,
          groupLabel: "",
          sortOrder: 0,
        }
      : null)

  return (
    <div className="relative">
      <Combobox
        key={`${normalizedValue}:${flatOptions.length}`}
        items={props.optionGroups}
        value={selectedOption ?? undefined}
        itemToStringLabel={(option) => option.label}
        itemToStringValue={(option) => option.searchLabel}
        isItemEqualToValue={(left, right) => left.value === right.value}
        disabled={props.disabled}
        onValueChange={(nextOption) => {
          props.onBeginEditing?.()
          props.onChange(nextOption?.value ?? "")
        }}
        autoHighlight
        openOnInputClick
      >
        <ComboboxInput className="h-9 bg-white pr-10" placeholder="Commodity" disabled={props.disabled} />
        <ComboboxTriggerIcon />
        <ComboboxContent>
          <ComboboxEmpty>No options found.</ComboboxEmpty>
          <ComboboxList>
            {props.optionGroups.map((optionGroup) => (
              <ComboboxGroup key={optionGroup.label} items={optionGroup.items}>
                <ComboboxGroupLabel>{optionGroup.label}</ComboboxGroupLabel>
                <ComboboxCollection>
                  {(option: DcxAppGroupedTradeMaterialOption) => (
                    <ComboboxItem
                      key={option.value}
                      value={option}
                      onClick={() => {
                        props.onBeginEditing?.()
                        props.onChange(option.value)
                      }}
                    >
                      <span className="truncate font-medium text-slate-950">{option.label}</span>
                    </ComboboxItem>
                  )}
                </ComboboxCollection>
              </ComboboxGroup>
            ))}
          </ComboboxList>
        </ComboboxContent>
      </Combobox>
    </div>
  )
}

function formatDcxTradeMaterialKeyFallbackLabel(materialKey: string): string {
  return materialKey
    .split("_")
    .filter(Boolean)
    .map((materialKeyPart) => materialKeyPart.charAt(0).toUpperCase() + materialKeyPart.slice(1))
    .join(" ")
}

function DcxTradeDatePicker(props: {
  value: string
  selectedLanguageCode: string
  placeholder: string
  onChange: (value: string) => void
}) {
  const selectedDate = readDcxTradeDateFromIsoLikeValue(props.value)

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          className="h-9 w-full justify-between bg-white px-3 text-left font-normal"
        >
          <span className={selectedDate ? "text-slate-950" : "text-slate-500"}>
            {selectedDate
              ? formatDcxTradeCalendarDateLabel(selectedDate, props.selectedLanguageCode)
              : (normalizeDcxTradeTextValue(props.value) || props.placeholder)}
          </span>
          <CalendarDaysIcon className="size-4 text-slate-500" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={selectedDate}
          onSelect={(nextDate) => {
            if (!nextDate) {
              return
            }
            props.onChange(formatDcxTradeIsoDateValue(nextDate))
          }}
        />
      </PopoverContent>
    </Popover>
  )
}

function DcxTradeSortableHeader<TData>(props: {
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

function DcxTradeStatusBadge(props: { label: string; tone: "neutral" | "warning" | "success" | "danger" }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md border px-2 py-1 text-[11px] font-semibold uppercase",
        props.tone === "success" && "border-emerald-200 bg-emerald-50 text-emerald-700",
        props.tone === "warning" && "border-amber-200 bg-amber-50 text-amber-700",
        props.tone === "danger" && "border-red-200 bg-red-50 text-red-700",
        props.tone === "neutral" && "border-slate-200 bg-slate-50 text-slate-700",
      )}
    >
      {props.label}
    </span>
  )
}

function DcxTradeOverallStatusIndicator(props: {
  trade: DcxAppAuthenticatedUserTradeCatalogRow
  ux: Record<string, string>
}) {
  const isReady = readDcxTradeOverallStatusSortValue(props.trade) === "ready"
  const title = isReady
    ? (props.ux.trades_ready_label ?? "Ready")
    : (props.ux.trades_action_needed_label ?? "Action needed")

  return (
    <span
      title={title}
      aria-label={title}
      className={cn(
        "inline-flex h-[1.125rem] w-[1.125rem] items-center justify-center rounded-full border text-[11px] font-semibold",
        isReady
          ? "border-emerald-500 bg-emerald-500 text-white"
          : "border-amber-400 bg-white text-amber-500",
      )}
    >
      {isReady ? "✓" : "!"}
    </span>
  )
}

function readDcxTradeFormBorderClass(visualState: DcxTradeFormVisualState): string {
  if (visualState === "editing" || visualState === "saving") {
    return "border-amber-300"
  }
  if (visualState === "saved") {
    return "border-emerald-300"
  }
  if (visualState === "error") {
    return "border-red-300"
  }
  return "border-sky-300"
}

function readDcxTradeFormStatusTextClass(visualState: DcxTradeFormVisualState): string {
  if (visualState === "editing" || visualState === "saving") {
    return "text-amber-700"
  }
  if (visualState === "saved") {
    return "text-emerald-700"
  }
  if (visualState === "error") {
    return "text-red-700"
  }
  return "text-sky-700"
}

function readDcxTradeFormStatusLabel(visualState: DcxTradeFormVisualState, ux: Record<string, string>): string {
  if (visualState === "editing") {
    return ux.editable_status_compact_changed_unsaved ?? "Changed, unsaved"
  }
  if (visualState === "saving") {
    return ux.editable_status_saving ?? "Saving..."
  }
  if (visualState === "saved") {
    return ux.editable_status_compact_saved ?? "Saved"
  }
  if (visualState === "error") {
    return ux.editable_status_compact_save_failed ?? "Save failed"
  }
  return ux.editable_status_compact_idle ?? "Editable"
}

function readDcxTradeEffectiveFormVisualState(params: {
  visualState: DcxTradeFormVisualState
  isDirty: boolean
  isSaving: boolean
  hasError: boolean
}): DcxTradeFormVisualState {
  if (params.hasError) {
    return "error"
  }
  if (params.isSaving) {
    return "saving"
  }
  if (params.visualState === "saved") {
    return "saved"
  }
  if (params.isDirty) {
    return "editing"
  }
  return "idle"
}

function writeDcxTradeIdToCurrentUrl(tradeId: number): void {
  if (typeof window === "undefined") {
    return
  }
  window.history.pushState({}, "", `/trades/objects/${tradeId}`)
  window.dispatchEvent(new PopStateEvent("popstate"))
}

function navigateDcxAppToPath(nextPathname: string) {
  window.history.pushState({}, "", nextPathname)
  window.dispatchEvent(new PopStateEvent("popstate"))
}

function DcxTradeSourceMessageImagePreview(props: {
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

function buildEmptyTradeEditFormState(): DcxTradeEditFormState {
  return {
    trade_confirmation_status: "",
    trade_status: "",
    normalized_trade_side: "",
    normalized_material_name: "",
    normalized_material_key: "",
    normalized_quantity_value: "",
    normalized_quantity_unit: "",
    normalized_price_mode: "",
    normalized_price_value: "",
    normalized_price_unit_basis: "",
    normalized_currency_code: "",
    normalized_total_price_value: "",
    normalized_origin_location: "",
    normalized_destination_location: "",
    normalized_shipping_method: "",
    normalized_incoterm_code: "",
    normalized_delivery_window_start_text: "",
    normalized_delivery_window_end_text: "",
    normalized_quality_summary_text: "",
    normalized_payment_terms_summary_text: "",
  }
}

function buildTradeEditFormStateFromTradeDetail(trade: DcxAppAuthenticatedUserTradeDetail): DcxTradeEditFormState {
  return {
    trade_confirmation_status: normalizeDcxTradeTextValue(trade.trade_confirmation_status),
    trade_status: normalizeDcxTradeTextValue(trade.trade_status),
    normalized_trade_side: normalizeDcxTradeTextValue(trade.normalized_trade_side),
    normalized_material_name: normalizeDcxTradeTextValue(trade.normalized_material_name),
    normalized_material_key: normalizeDcxTradeTextValue(trade.normalized_material_key).toLowerCase(),
    normalized_quantity_value: trade.normalized_quantity_value === null ? "" : String(trade.normalized_quantity_value),
    normalized_quantity_unit: normalizeDcxTradeTextValue(trade.normalized_quantity_unit),
    normalized_price_mode: normalizeDcxTradeTextValue(trade.normalized_price_mode),
    normalized_price_value: trade.normalized_price_value === null ? "" : String(trade.normalized_price_value),
    normalized_price_unit_basis: normalizeDcxTradeTextValue(trade.normalized_price_unit_basis) || normalizeDcxTradeTextValue(trade.normalized_quantity_unit),
    normalized_currency_code: normalizeDcxTradeTextValue(trade.normalized_currency_code),
    normalized_total_price_value: trade.normalized_total_price_value === null ? "" : String(trade.normalized_total_price_value),
    normalized_origin_location: normalizeDcxTradeTextValue(trade.normalized_origin_location),
    normalized_destination_location: normalizeDcxTradeTextValue(trade.normalized_destination_location),
    normalized_shipping_method: normalizeDcxTradeTextValue(trade.normalized_shipping_method),
    normalized_incoterm_code: normalizeDcxTradeTextValue(trade.normalized_incoterm_code),
    normalized_delivery_window_start_text: normalizeDcxTradeTextValue(trade.normalized_delivery_window_start_text),
    normalized_delivery_window_end_text: normalizeDcxTradeTextValue(trade.normalized_delivery_window_end_text),
    normalized_quality_summary_text: normalizeDcxTradeTextValue(trade.normalized_quality_summary_text),
    normalized_payment_terms_summary_text: normalizeDcxTradeTextValue(trade.normalized_payment_terms_summary_text),
  }
}

function buildTradePatchPayloadFromFormState(formState: DcxTradeEditFormState): DcxAppTradeCandidatePatchPayload {
  return {
    trade_confirmation_status: formState.trade_confirmation_status.trim(),
    trade_status: formState.trade_status.trim(),
    normalized_trade_side: formState.normalized_trade_side.trim(),
    normalized_material_name: formState.normalized_material_name.trim(),
    normalized_material_key: formState.normalized_material_key.trim().toLowerCase(),
    normalized_quantity_value: readOptionalNumberFromTradeFormValue(formState.normalized_quantity_value),
    normalized_quantity_unit: formState.normalized_quantity_unit.trim(),
    normalized_price_mode: formState.normalized_price_mode.trim(),
    normalized_price_value: readOptionalNumberFromTradeFormValue(formState.normalized_price_value),
    normalized_price_unit_basis: (formState.normalized_price_unit_basis.trim() || formState.normalized_quantity_unit.trim()),
    normalized_currency_code: formState.normalized_currency_code.trim(),
    normalized_total_price_value: readOptionalNumberFromTradeFormValue(formState.normalized_total_price_value),
    normalized_origin_location: formState.normalized_origin_location.trim(),
    normalized_destination_location: formState.normalized_destination_location.trim(),
    normalized_shipping_method: formState.normalized_shipping_method.trim(),
    normalized_incoterm_code: formState.normalized_incoterm_code.trim(),
    normalized_delivery_window_start_text: formState.normalized_delivery_window_start_text.trim(),
    normalized_delivery_window_end_text: formState.normalized_delivery_window_end_text.trim(),
    normalized_quality_summary_text: formState.normalized_quality_summary_text.trim(),
    normalized_payment_terms_summary_text: formState.normalized_payment_terms_summary_text.trim(),
  }
}

function readOptionalNumberFromTradeFormValue(value: string): number | null {
  const normalizedValue = value.trim()
  if (normalizedValue === "") {
    return null
  }
  const parsedValue = Number.parseFloat(normalizedValue)
  return Number.isFinite(parsedValue) ? parsedValue : null
}

function readDcxTradeDateFromIsoLikeValue(value: string): Date | undefined {
  const normalizedValue = normalizeDcxTradeTextValue(value)
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(normalizedValue)
  if (!match) {
    return undefined
  }

  const year = Number.parseInt(match[1] ?? "", 10)
  const monthIndex = Number.parseInt(match[2] ?? "", 10) - 1
  const day = Number.parseInt(match[3] ?? "", 10)
  if (!Number.isInteger(year) || !Number.isInteger(monthIndex) || !Number.isInteger(day)) {
    return undefined
  }

  const dateValue = new Date(year, monthIndex, day)
  if (
    dateValue.getFullYear() !== year ||
    dateValue.getMonth() !== monthIndex ||
    dateValue.getDate() !== day
  ) {
    return undefined
  }
  return dateValue
}

function formatDcxTradeIsoDateValue(dateValue: Date): string {
  const year = dateValue.getFullYear()
  const month = String(dateValue.getMonth() + 1).padStart(2, "0")
  const day = String(dateValue.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

function formatDcxTradeCalendarDateLabel(dateValue: Date, selectedLanguageCode: string): string {
  return new Intl.DateTimeFormat(selectedLanguageCode || "en", { dateStyle: "medium" }).format(dateValue)
}

function buildTradeFormSnapshot(formState: DcxTradeEditFormState): string {
  return JSON.stringify(buildTradePatchPayloadFromFormState(formState))
}

function normalizeDcxTradeTextValue(value: string | null | undefined): string {
  if (typeof value !== "string") {
    return ""
  }
  const normalizedValue = value.trim()
  if (
    normalizedValue === "" ||
    normalizedValue.toLowerCase() === "null" ||
    normalizedValue.toLowerCase() === "none" ||
    normalizedValue.toLowerCase() === "not specified" ||
    normalizedValue.toUpperCase() === "NOT SPECIFIED"
  ) {
    return ""
  }
  return normalizedValue
}

function readDcxTradeDisplayText(value: string | null | undefined): string {
  const normalizedValue = normalizeDcxTradeTextValue(value)
  return normalizedValue || "—"
}

function readDcxTradeConfirmationNotificationStatus(tradeMetadataJson: Record<string, unknown>): string {
  const rawStatus = tradeMetadataJson["confirmation_notification_status"]
  return typeof rawStatus === "string" && rawStatus.trim() !== "" ? rawStatus.replaceAll("_", " ") : ""
}

function formatDcxTradeVersionNumber(value: number | null): string {
  if (value === null) {
    return "—"
  }
  return Number.isInteger(value) ? String(value) : String(value)
}

function formatDcxTradeVersionRoute(origin: string, destination: string): string {
  const normalizedOrigin = normalizeDcxTradeTextValue(origin)
  const normalizedDestination = normalizeDcxTradeTextValue(destination)
  if (normalizedOrigin && normalizedDestination) {
    return `${normalizedOrigin} -> ${normalizedDestination}`
  }
  if (normalizedOrigin) {
    return normalizedOrigin
  }
  if (normalizedDestination) {
    return normalizedDestination
  }
  return "—"
}

function readDcxTradeMaterialFilterOptions(
  trades: DcxAppAuthenticatedUserTradeCatalogRow[],
): Array<{ value: string; label: string }> {
  const seenMaterials = new Set<string>()

  return trades
    .map((trade) => normalizeDcxTradeTextValue(trade.normalized_material_name))
    .filter((materialName) => {
      const normalizedMaterialName = materialName.toLowerCase()
      if (normalizedMaterialName === "" || seenMaterials.has(normalizedMaterialName)) {
        return false
      }
      seenMaterials.add(normalizedMaterialName)
      return true
    })
    .sort((leftMaterial, rightMaterial) => leftMaterial.localeCompare(rightMaterial))
    .map((materialName) => ({
      value: materialName.toLowerCase(),
      label: materialName,
    }))
}

function readDcxTradesMatchingFilters(params: {
  trades: DcxAppAuthenticatedUserTradeCatalogRow[]
  searchQuery: string
  sideFilter: DcxTradeSideFilter
  stateFilter: DcxTradeStateFilter
  materialFilter: string
}): DcxAppAuthenticatedUserTradeCatalogRow[] {
  const normalizedSearchQuery = params.searchQuery.trim().toLowerCase()

  return params.trades.filter((trade) => {
    if (params.sideFilter !== "all" && normalizeDcxTradeTextValue(trade.normalized_trade_side).toLowerCase() !== params.sideFilter) {
      return false
    }
    if (
      params.stateFilter !== "all" &&
      readDcxTradeStateValue(trade.trade_confirmation_status, trade.trade_status) !== params.stateFilter
    ) {
      return false
    }
    if (
      params.materialFilter !== "all" &&
      normalizeDcxTradeTextValue(trade.normalized_material_name).toLowerCase() !== params.materialFilter
    ) {
      return false
    }
    if (normalizedSearchQuery === "") {
      return true
    }

    const searchableText = [
      readDcxTradeCatalogTitle(trade),
      trade.normalized_trade_side,
      trade.normalized_material_name,
      trade.normalized_quantity_unit,
      trade.normalized_price_mode,
      trade.normalized_price_unit_basis,
      trade.normalized_currency_code,
      trade.normalized_origin_location,
      trade.normalized_destination_location,
      trade.trade_confirmation_status,
      trade.trade_status,
      trade.source_channel_type,
      String(trade.source_message_id),
      String(trade.normalized_quantity_value ?? ""),
      String(trade.normalized_price_value ?? ""),
      String(trade.normalized_total_price_value ?? ""),
    ]
      .join(" ")
      .toLowerCase()

    return searchableText.includes(normalizedSearchQuery)
  })
}

function readDcxTradeCatalogTitle(trade: DcxAppAuthenticatedUserTradeCatalogRow): string {
  return normalizeDcxTradeTextValue(trade.trade_summary_text) ||
    normalizeDcxTradeTextValue(trade.normalized_material_name) ||
    "Trade"
}

function readDcxTradeCatalogPriceLabel(
  trade: DcxAppAuthenticatedUserTradeCatalogRow,
  ux: Record<string, string>,
): string {
  const priceValue = formatDcxTradeVersionNumber(trade.normalized_price_value)
  const currencyCode = normalizeDcxTradeTextValue(trade.normalized_currency_code)
  const unitBasis = normalizeDcxTradeTextValue(trade.normalized_price_unit_basis)

  if (priceValue === "—") {
    return ux.trades_price_not_specified_label ?? "Price not specified"
  }

  return `${priceValue}${currencyCode ? ` ${currencyCode}` : ""}${unitBasis ? ` / ${unitBasis}` : ""}`
}

function readDcxTradePriceSortValue(trade: DcxAppAuthenticatedUserTradeCatalogRow): number {
  return trade.normalized_price_value ?? -1
}

function readDcxTradeStateValue(confirmationStatusValue: string, tradeStatusValue: string): DcxTradeStateFilter {
  const normalizedConfirmationValue = normalizeDcxTradeTextValue(confirmationStatusValue).toLowerCase()
  const normalizedTradeStatusValue = normalizeDcxTradeTextValue(tradeStatusValue).toLowerCase()

  if (normalizedConfirmationValue === "confirmed") {
    return "confirmed"
  }
  if (normalizedConfirmationValue === "rejected") {
    return "rejected"
  }
  if (normalizedConfirmationValue === "under_revision") {
    return "under_revision"
  }
  if (normalizedConfirmationValue === "pending_confirmation") {
    return "pending_confirmation"
  }
  if (normalizedConfirmationValue === "needs_more_detail") {
    return "needs_more_detail"
  }
  if (normalizedConfirmationValue === "draft" || normalizedTradeStatusValue === "draft") {
    return "draft"
  }
  return "needs_more_detail"
}

function readDcxTradeStatusFieldsFromStateValue(stateValue: string): Pick<DcxTradeEditFormState, "trade_confirmation_status" | "trade_status"> {
  if (stateValue === "confirmed") {
    return { trade_confirmation_status: "confirmed", trade_status: "open" }
  }
  if (stateValue === "rejected") {
    return { trade_confirmation_status: "rejected", trade_status: "archived" }
  }
  if (stateValue === "under_revision") {
    return { trade_confirmation_status: "under_revision", trade_status: "draft" }
  }
  if (stateValue === "pending_confirmation") {
    return { trade_confirmation_status: "pending_confirmation", trade_status: "draft" }
  }
  if (stateValue === "draft") {
    return { trade_confirmation_status: "draft", trade_status: "draft" }
  }
  return { trade_confirmation_status: "needs_more_detail", trade_status: "draft" }
}

function readDcxTradeStateLabel(statusValue: string, ux: Record<string, string>): string {
  const normalizedStatusValue = normalizeDcxTradeTextValue(statusValue).toLowerCase()
  if (normalizedStatusValue === "draft") {
    return ux.trades_state_draft ?? "Draft"
  }
  if (normalizedStatusValue === "needs_more_detail") {
    return ux.trades_state_needs_more_detail ?? "Needs details"
  }
  if (normalizedStatusValue === "pending_confirmation") {
    return ux.trades_state_pending_confirmation ?? "Pending confirmation"
  }
  if (normalizedStatusValue === "confirmed") {
    return ux.trades_state_confirmed ?? "Confirmed"
  }
  if (normalizedStatusValue === "under_revision") {
    return ux.trades_state_under_revision ?? "Under revision"
  }
  if (normalizedStatusValue === "rejected") {
    return ux.trades_state_rejected ?? "Rejected"
  }
  return normalizedStatusValue ? normalizedStatusValue.replaceAll("_", " ") : (ux.trades_not_specified_label ?? "Not specified")
}

function readDcxTradeSideLabel(sideValue: string, ux: Record<string, string>): string {
  const normalizedSideValue = normalizeDcxTradeTextValue(sideValue).toLowerCase()
  if (normalizedSideValue === "sell") {
    return ux.trades_side_sell ?? "Sell"
  }
  if (normalizedSideValue === "buy") {
    return ux.trades_side_buy ?? "Buy"
  }
  return normalizedSideValue ? normalizedSideValue.replaceAll("_", " ") : (ux.trades_not_specified_label ?? "Not specified")
}

function readDcxTradePriceModeLabel(priceModeValue: string, ux: Record<string, string>): string {
  const normalizedPriceModeValue = normalizeDcxTradeTextValue(priceModeValue).toLowerCase()
  if (normalizedPriceModeValue === "fixed") {
    return ux.trades_price_mode_fixed ?? "Fixed"
  }
  if (normalizedPriceModeValue === "indicative") {
    return ux.trades_price_mode_indicative ?? "Indicative"
  }
  if (normalizedPriceModeValue === "negotiable") {
    return ux.trades_price_mode_negotiable ?? "Negotiable"
  }
  if (normalizedPriceModeValue === "index linked") {
    return ux.trades_price_mode_index_linked ?? "Index linked"
  }
  return normalizedPriceModeValue ? normalizedPriceModeValue.replaceAll("_", " ") : (ux.trades_not_specified_label ?? "Not specified")
}

function readDcxTradeVisibilityLabel(visibilityStatus: string, ux: Record<string, string>): string {
  const normalizedVisibilityStatus = normalizeDcxTradeTextValue(visibilityStatus).toLowerCase()
  if (normalizedVisibilityStatus === "private") {
    return ux.trades_visibility_private ?? "Private"
  }
  if (normalizedVisibilityStatus === "shareable") {
    return ux.trades_visibility_shareable ?? "Shareable"
  }
  if (normalizedVisibilityStatus === "public") {
    return ux.trades_visibility_public ?? "Public"
  }
  return ux.trades_visibility_private ?? "Private"
}

function readDcxTradeOverallStatusSortValue(trade: DcxAppAuthenticatedUserTradeCatalogRow): "ready" | "attention" {
  if (trade.requires_user_attention) {
    return "attention"
  }
  if (trade.trade_confirmation_status === "confirmed" && trade.trade_status === "open") {
    return "ready"
  }
  return "attention"
}
