/**
 * CONTEXT:
 * DCX Network DM page.
 * DMs are lightweight person-to-person trust-building messages, separate from structured Trade Chats.
 */

import { useEffect, useMemo, useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import type { ColumnDef, SortingState } from "@tanstack/react-table"
import { RefreshCwIcon, SearchIcon, SendHorizontalIcon } from "lucide-react"

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
import { Textarea } from "@/components/ui/textarea"

import {
  DCX_APP_ACCOUNT_PAGE_DEFAULT_UX_STRINGS,
  formatDcxAppAccountTimestampLabel,
} from "./dcx_app_user_account_shared"
import { readDcxAppAuthenticatedUserAccountSummary } from "../lib/read_dcx_app_authenticated_user_account_summary"
import {
  appendDcxAppNetworkDmMessage,
  readDcxAppNetworkDms,
  readDcxAppNetworkDmThread,
  type DcxAppNetworkDmThreadCatalogRow,
  type DcxAppNetworkDmThreadDetail,
} from "../lib/dcx_app_network_api"
import {
  DcxAppNetworkAvatar,
  DcxAppNetworkProfileLink,
} from "./dcx_app_network_shared"
import {
  useDcxAppBalancedDesktopSplitMode,
  useDcxAppDetailSheetMode,
} from "./use_dcx_app_master_detail_layout_mode"

type Props = {
  apiBaseUrl: string
  routeDmThreadId?: number | null
}

type DcxNetworkDmStatusFilter = "all" | "open" | "archived"

export function DcxAppNetworkDmsPage(props: Props) {
  const queryClient = useQueryClient()
  const [selectedDmThreadId, setSelectedDmThreadId] = useState<number | null>(props.routeDmThreadId ?? null)
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState<DcxNetworkDmStatusFilter>("all")
  const [messageText, setMessageText] = useState("")
  const [isMobileDetailOpen, setIsMobileDetailOpen] = useState(false)
  const [sorting, setSorting] = useState<SortingState>([{ id: "updated", desc: true }])
  const isDetailSheetMode = useDcxAppDetailSheetMode()
  const isBalancedDesktopSplitMode = useDcxAppBalancedDesktopSplitMode()

  const accountSummaryQuery = useQuery({
    queryKey: ["dcx_app_authenticated_user_account_summary"],
    queryFn: async () => readDcxAppAuthenticatedUserAccountSummary({ apiBaseUrl: props.apiBaseUrl }),
  })
  const accountSummary = accountSummaryQuery.data?.data ?? null
  const ux = accountSummary?.ux_strings ?? DCX_APP_ACCOUNT_PAGE_DEFAULT_UX_STRINGS
  const selectedLanguageCode = accountSummary?.preferred_language?.language_code ?? "en"
  const selectedTimezoneIanaName = accountSummary?.preferred_timezone?.iana_name ?? null

  const threadsQuery = useQuery({
    queryKey: ["dcx_app_network_dms"],
    queryFn: async () => readDcxAppNetworkDms({ apiBaseUrl: props.apiBaseUrl }),
  })
  const dmThreads = threadsQuery.data?.data.dm_threads ?? []

  useEffect(() => {
    if (props.routeDmThreadId) {
      setSelectedDmThreadId(props.routeDmThreadId)
      return
    }
    if (selectedDmThreadId === null && dmThreads[0]) {
      setSelectedDmThreadId(dmThreads[0].dm_thread_id)
    }
  }, [dmThreads, props.routeDmThreadId, selectedDmThreadId])

  const filteredDmThreads = useMemo(() => {
    const normalizedSearchQuery = searchQuery.trim().toLowerCase()
    if (!normalizedSearchQuery) {
      return dmThreads.filter((thread) => statusFilter === "all" || thread.thread_status === statusFilter)
    }
    return dmThreads.filter((thread) =>
      (statusFilter === "all" || thread.thread_status === statusFilter) &&
        [
          thread.other_participant.public_identity_label,
          thread.other_participant.public_handle,
          thread.thread_status,
          thread.latest_message?.message_text ?? "",
        ]
          .join(" ")
          .toLowerCase()
          .includes(normalizedSearchQuery),
    )
  }, [dmThreads, searchQuery, statusFilter])

  const threadQuery = useQuery({
    queryKey: ["dcx_app_network_dm_thread", selectedDmThreadId],
    enabled: typeof selectedDmThreadId === "number",
    queryFn: async () =>
      readDcxAppNetworkDmThread({
        apiBaseUrl: props.apiBaseUrl,
        dmThreadId: selectedDmThreadId as number,
      }),
  })
  const selectedThread = threadQuery.data?.data ?? null

  const sendMessageMutation = useMutation({
    mutationFn: async () =>
      appendDcxAppNetworkDmMessage({
        apiBaseUrl: props.apiBaseUrl,
        dmThreadId: selectedDmThreadId as number,
        messageText,
        languageCode: selectedLanguageCode,
      }),
    onSuccess: async (payload) => {
      setMessageText("")
      queryClient.setQueryData(["dcx_app_network_dm_thread", selectedDmThreadId], payload)
      await queryClient.invalidateQueries({ queryKey: ["dcx_app_network_dms"] })
    },
  })

  const columns = useMemo<Array<ColumnDef<DcxAppNetworkDmThreadCatalogRow>>>(
    () => [
      {
        id: "contact",
        accessorFn: (thread) => thread.other_participant.public_identity_label,
        header: "Contact",
        cell: ({ row }) => (
          <div className="flex min-w-0 items-center gap-2">
            <DcxAppNetworkAvatar author={row.original.other_participant} size="sm" />
            <div className="min-w-0">
              <p className="truncate font-medium text-slate-950">{row.original.other_participant.public_identity_label}</p>
              <p className="truncate text-xs text-slate-500">@{row.original.other_participant.public_handle}</p>
            </div>
          </div>
        ),
      },
      {
        id: "latest",
        accessorFn: (thread) => thread.latest_message?.message_text ?? "",
        header: "Latest",
        cell: ({ row }) => (
          <span className="line-clamp-1 text-sm text-slate-600">
            {row.original.latest_message?.message_text ?? "No messages yet."}
          </span>
        ),
      },
      {
        id: "status",
        accessorFn: (thread) => thread.thread_status,
        header: "Status",
        cell: ({ row }) => <span className="capitalize text-slate-600">{row.original.thread_status}</span>,
      },
      {
        id: "updated",
        accessorFn: (thread) => thread.updated_at_ts_ms,
        header: "Updated",
        cell: ({ row }) =>
          formatDcxAppAccountTimestampLabel(
            row.original.updated_at_ts_ms,
            selectedLanguageCode,
            selectedTimezoneIanaName,
            "",
          ),
      },
    ],
    [selectedLanguageCode, selectedTimezoneIanaName],
  )

  const dmsListPanel = (
    <section className="min-w-0 overflow-hidden border border-black/6 bg-white shadow-[0_18px_55px_-48px_rgba(15,23,42,0.45)]">
      <div className="space-y-3 border-b border-black/6 px-4 py-3">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <label className="relative block w-full lg:flex-1">
            <SearchIcon className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
            <Input
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search DMs..."
              className="pl-9"
            />
          </label>
          <div className="flex items-center justify-between gap-3 lg:justify-end">
            <p className="text-xs text-slate-500">{filteredDmThreads.length} of {dmThreads.length}</p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => void queryClient.invalidateQueries({ queryKey: ["dcx_app_network_dms"] })}
            >
              <RefreshCwIcon />
              {ux.refresh_button_label ?? "Refresh"}
            </Button>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {(["all", "open", "archived"] as DcxNetworkDmStatusFilter[]).map((nextStatusFilter) => (
            <Button
              key={nextStatusFilter}
              type="button"
              variant={statusFilter === nextStatusFilter ? "default" : "outline"}
              size="sm"
              onClick={() => setStatusFilter(nextStatusFilter)}
            >
              {nextStatusFilter === "all" ? "All" : nextStatusFilter[0].toUpperCase() + nextStatusFilter.slice(1)}
            </Button>
          ))}
        </div>
      </div>
      <DcxAppDataTable
        columns={columns}
        data={filteredDmThreads}
        tableClassName="[&_td]:py-3"
        sorting={sorting}
        onSortingChange={setSorting}
        pageSize={25}
        onRowClick={(row) => {
          setSelectedDmThreadId(row.dm_thread_id)
          window.history.replaceState({}, "", `/network/dms/${row.dm_thread_id}`)
          if (isDetailSheetMode) {
            setIsMobileDetailOpen(true)
          }
        }}
        readRowClassName={(row) => row.dm_thread_id === selectedDmThreadId ? "bg-sky-50 hover:bg-sky-50 ring-1 ring-inset ring-sky-200" : ""}
        emptyLabel={threadsQuery.isLoading ? "Loading DMs..." : "No DMs yet."}
      />
      {threadsQuery.isError ? (
        <p className="px-4 pb-4 text-sm text-red-600">{(threadsQuery.error as Error).message}</p>
      ) : null}
    </section>
  )

  const dmsDetailPanel = (
    <aside className="h-full min-w-0 overflow-hidden border border-black/6 bg-white shadow-[0_18px_55px_-48px_rgba(15,23,42,0.45)]">
      <DcxNetworkDmDetailPanel
        selectedThread={selectedThread}
        isLoading={threadQuery.isLoading}
        selectedLanguageCode={selectedLanguageCode}
        selectedTimezoneIanaName={selectedTimezoneIanaName}
        messageText={messageText}
        setMessageText={setMessageText}
        isSending={sendMessageMutation.isPending}
        errorText={(sendMessageMutation.error as Error | null)?.message ?? null}
        onSubmit={() => {
          if (messageText.trim() && selectedDmThreadId) {
            sendMessageMutation.mutate()
          }
        }}
      />
    </aside>
  )

  const selectedThreadTitle = selectedThread?.other_participant.public_identity_label ?? "DM"

  return (
    <section className="flex min-h-[calc(100vh-5rem)] min-w-0 flex-col gap-4 overflow-x-hidden text-slate-950">
      {isDetailSheetMode ? (
        <main className="min-w-0 overflow-x-hidden">{dmsListPanel}</main>
      ) : (
        <ResizablePanelGroup
          key={isBalancedDesktopSplitMode ? "balanced-desktop-split" : "wide-desktop-split"}
          orientation="horizontal"
          className="min-h-0 w-full max-w-full flex-1 overflow-hidden"
        >
          <ResizablePanel className="min-w-0 overflow-hidden" defaultSize={isBalancedDesktopSplitMode ? "50%" : "52%"} minSize="42%">
            <div className="h-full min-w-0 overflow-x-hidden pr-2">{dmsListPanel}</div>
          </ResizablePanel>
          <ResizableHandle withHandle className="mx-1 bg-transparent" />
          <ResizablePanel className="min-w-0 overflow-hidden" defaultSize={isBalancedDesktopSplitMode ? "50%" : "48%"} minSize="34%" maxSize="58%">
            <div className="h-full min-w-0 overflow-x-hidden pl-2">{dmsDetailPanel}</div>
          </ResizablePanel>
        </ResizablePanelGroup>
      )}

      {isDetailSheetMode ? (
        <Sheet open={isMobileDetailOpen && selectedDmThreadId !== null} onOpenChange={setIsMobileDetailOpen}>
          <SheetContent className="overflow-x-hidden overflow-y-auto p-0 data-[side=right]:w-[90vw] data-[side=right]:max-w-[90vw] data-[side=right]:sm:max-w-[90vw]">
            <SheetHeader className="sr-only">
              <SheetTitle>{selectedThreadTitle}</SheetTitle>
              <SheetDescription>DM detail</SheetDescription>
            </SheetHeader>
            {dmsDetailPanel}
          </SheetContent>
        </Sheet>
      ) : null}
    </section>
  )
}

function DcxNetworkDmDetailPanel(props: {
  selectedThread: DcxAppNetworkDmThreadDetail | null
  isLoading: boolean
  selectedLanguageCode: string
  selectedTimezoneIanaName: string | null
  messageText: string
  setMessageText: (nextValue: string) => void
  isSending: boolean
  errorText: string | null
  onSubmit: () => void
}) {
  if (!props.selectedThread) {
    return (
      <div className="px-6 py-8">
        <p className="text-sm text-slate-500">
          {props.isLoading ? "Loading conversation..." : "Choose a DM to read."}
        </p>
      </div>
    )
  }

  return (
    <div className="flex h-full min-h-[calc(100vh-5rem)] flex-col">
      <header className="flex items-center gap-3 border-b border-slate-100 px-5 py-4">
        <DcxAppNetworkAvatar author={props.selectedThread.other_participant} />
        <div className="min-w-0">
          <DcxAppNetworkProfileLink author={props.selectedThread.other_participant} />
          <p className="text-xs text-slate-500">@{props.selectedThread.other_participant.public_handle}</p>
        </div>
      </header>
      <div className="flex-1 space-y-3 overflow-y-auto px-5 py-4">
        {props.selectedThread.messages.length === 0 ? (
          <p className="text-sm text-slate-500">No messages yet.</p>
        ) : null}
        {props.selectedThread.messages.map((message) => (
          <div
            key={message.dm_message_id}
            className={[
              "max-w-[80%] rounded-md px-3 py-2",
              message.is_owned_by_authenticated_user
                ? "ml-auto bg-sky-50 text-slate-950"
                : "mr-auto bg-slate-100 text-slate-800",
            ].join(" ")}
          >
            <p className="whitespace-pre-wrap text-sm leading-6">{message.message_text}</p>
            <p className="mt-1 text-right text-[0.68rem] text-slate-500">
              {formatDcxAppAccountTimestampLabel(
                message.created_at_ts_ms,
                props.selectedLanguageCode,
                props.selectedTimezoneIanaName,
                "",
              )}
            </p>
          </div>
        ))}
      </div>
      <form
        className="border-t border-slate-100 p-4"
        onSubmit={(event) => {
          event.preventDefault()
          props.onSubmit()
        }}
      >
        <div className="flex flex-col gap-2 sm:flex-row">
          <Textarea
            value={props.messageText}
            rows={2}
            maxLength={2000}
            placeholder="Write a DM..."
            onChange={(event) => props.setMessageText(event.target.value)}
          />
          <Button
            type="submit"
            className="sm:self-end"
            disabled={props.messageText.trim() === "" || props.isSending}
          >
            <SendHorizontalIcon />
            Send
          </Button>
        </div>
        {props.errorText ? (
          <p className="mt-2 text-sm text-red-600">{props.errorText}</p>
        ) : null}
        <p className="mt-2 text-xs text-slate-500">{props.messageText.trim().length}/2000</p>
      </form>
    </div>
  )
}
