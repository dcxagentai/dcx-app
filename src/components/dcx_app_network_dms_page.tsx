/**
 * CONTEXT:
 * First DCX Network DM page.
 * DMs are lightweight person-to-person trust-building messages, separate from structured Trade Chats.
 */

import { useEffect, useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { SendHorizontalIcon } from "lucide-react"

import { Button } from "./ui/button"
import { Textarea } from "./ui/textarea"
import {
  formatDcxAppAccountTimestampLabel,
} from "./dcx_app_user_account_shared"
import { readDcxAppAuthenticatedUserAccountSummary } from "../lib/read_dcx_app_authenticated_user_account_summary"
import {
  appendDcxAppNetworkDmMessage,
  readDcxAppNetworkDms,
  readDcxAppNetworkDmThread,
} from "../lib/dcx_app_network_api"
import {
  DcxAppNetworkAvatar,
  DcxAppNetworkProfileLink,
} from "./dcx_app_network_shared"

type Props = {
  apiBaseUrl: string
  routeDmThreadId?: number | null
}

export function DcxAppNetworkDmsPage(props: Props) {
  const queryClient = useQueryClient()
  const [selectedDmThreadId, setSelectedDmThreadId] = useState<number | null>(props.routeDmThreadId ?? null)
  const [messageText, setMessageText] = useState("")

  const accountSummaryQuery = useQuery({
    queryKey: ["dcx_app_authenticated_user_account_summary"],
    queryFn: async () => readDcxAppAuthenticatedUserAccountSummary({ apiBaseUrl: props.apiBaseUrl }),
  })
  const accountSummary = accountSummaryQuery.data?.data ?? null
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

  return (
    <section className="grid min-h-[calc(100vh-5rem)] min-w-0 gap-4 text-slate-950 lg:grid-cols-[20rem_minmax(0,1fr)]">
      <aside className="min-w-0 rounded-md border border-black/6 bg-white shadow-[0_18px_55px_-48px_rgba(15,23,42,0.45)]">
        <div className="border-b border-slate-100 px-4 py-3">
          <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">DMs</h2>
        </div>
        <div className="max-h-[calc(100vh-11rem)] overflow-y-auto">
          {dmThreads.length === 0 && !threadsQuery.isLoading ? (
            <p className="px-4 py-5 text-sm text-slate-500">No DMs yet.</p>
          ) : null}
          {threadsQuery.isLoading ? <p className="px-4 py-5 text-sm text-slate-500">Loading DMs...</p> : null}
          {dmThreads.map((thread) => (
            <button
              key={thread.dm_thread_id}
              type="button"
              className={[
                "flex w-full items-start gap-3 border-b border-slate-100 px-4 py-3 text-left hover:bg-slate-50",
                selectedDmThreadId === thread.dm_thread_id ? "bg-sky-50" : "",
              ].join(" ")}
              onClick={() => {
                setSelectedDmThreadId(thread.dm_thread_id)
                window.history.replaceState({}, "", `/network/dms/${thread.dm_thread_id}`)
              }}
            >
              <DcxAppNetworkAvatar author={thread.other_participant} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-slate-950">{thread.other_participant.public_identity_label}</p>
                <p className="mt-1 line-clamp-2 text-xs text-slate-500">
                  {thread.latest_message?.message_text ?? "No messages yet."}
                </p>
              </div>
            </button>
          ))}
        </div>
      </aside>

      <main className="min-w-0 rounded-md border border-black/6 bg-white shadow-[0_18px_55px_-48px_rgba(15,23,42,0.45)]">
        {!selectedThread ? (
          <div className="px-6 py-8">
            <p className="text-sm text-slate-500">
              {threadQuery.isLoading ? "Loading conversation..." : "Choose a DM to read."}
            </p>
          </div>
        ) : (
          <div className="flex min-h-[calc(100vh-5rem)] flex-col">
            <header className="flex items-center gap-3 border-b border-slate-100 px-5 py-4">
              <DcxAppNetworkAvatar author={selectedThread.other_participant} />
              <div className="min-w-0">
                <DcxAppNetworkProfileLink author={selectedThread.other_participant} />
                <p className="text-xs text-slate-500">@{selectedThread.other_participant.public_handle}</p>
              </div>
            </header>
            <div className="flex-1 space-y-3 overflow-y-auto px-5 py-4">
              {selectedThread.messages.length === 0 ? (
                <p className="text-sm text-slate-500">No messages yet.</p>
              ) : null}
              {selectedThread.messages.map((message) => (
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
                      selectedLanguageCode,
                      selectedTimezoneIanaName,
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
                if (messageText.trim() && selectedDmThreadId) {
                  sendMessageMutation.mutate()
                }
              }}
            >
              <div className="flex flex-col gap-2 sm:flex-row">
                <Textarea
                  value={messageText}
                  rows={2}
                  maxLength={2000}
                  placeholder="Write a DM..."
                  onChange={(event) => setMessageText(event.target.value)}
                />
                <Button
                  type="submit"
                  className="sm:self-end"
                  disabled={messageText.trim() === "" || sendMessageMutation.isPending}
                >
                  <SendHorizontalIcon />
                  Send
                </Button>
              </div>
              {sendMessageMutation.isError ? (
                <p className="mt-2 text-sm text-red-600">{(sendMessageMutation.error as Error).message}</p>
              ) : null}
              <p className="mt-2 text-xs text-slate-500">{messageText.trim().length}/2000</p>
            </form>
          </div>
        )}
      </main>
    </section>
  )
}
