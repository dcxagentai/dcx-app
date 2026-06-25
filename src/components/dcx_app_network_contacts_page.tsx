/**
 * CONTEXT:
 * DCX Network Contacts page.
 * It turns app-private users with public handles into a searchable trader directory with
 * follow state, profile badges, recent posts, and a quick DM action.
 */

import { useEffect, useMemo, useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import type { ColumnDef, SortingState } from "@tanstack/react-table"
import { MessageCircleIcon, RefreshCwIcon, SearchIcon, UserMinusIcon, UserPlusIcon } from "lucide-react"

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
  readDcxAppNetworkContacts,
  readDcxAppNetworkProfile,
  setDcxAppNetworkFollow,
  startDcxAppNetworkDm,
  type DcxAppNetworkContact,
  type DcxAppNetworkContactScope,
  type DcxAppNetworkProfile,
} from "../lib/dcx_app_network_api"
import {
  DcxAppNetworkAvatar,
  DcxAppNetworkBadgeList,
} from "./dcx_app_network_shared"
import {
  useDcxAppBalancedDesktopSplitMode,
  useDcxAppDetailSheetMode,
} from "./use_dcx_app_master_detail_layout_mode"

type Props = {
  apiBaseUrl: string
}

const DCX_NETWORK_CONTACT_SCOPES: Array<{ key: DcxAppNetworkContactScope; label: string }> = [
  { key: "all", label: "All" },
  { key: "following", label: "Following" },
  { key: "followers", label: "Followers" },
  { key: "mutual", label: "Mutual" },
]

export function DcxAppNetworkContactsPage(props: Props) {
  const queryClient = useQueryClient()
  const [scope, setScope] = useState<DcxAppNetworkContactScope>("all")
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedContactHandle, setSelectedContactHandle] = useState<string | null>(null)
  const [isMobileDetailOpen, setIsMobileDetailOpen] = useState(false)
  const [sorting, setSorting] = useState<SortingState>([{ id: "active", desc: true }])
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

  const contactsQuery = useQuery({
    queryKey: ["dcx_app_network_contacts", scope, searchQuery.trim()],
    queryFn: async () =>
      readDcxAppNetworkContacts({
        apiBaseUrl: props.apiBaseUrl,
        scope,
        searchQuery,
      }),
  })
  const contacts = contactsQuery.data?.data.contacts ?? []

  useEffect(() => {
    if (selectedContactHandle !== null) {
      return
    }
    if (contacts[0]) {
      setSelectedContactHandle(contacts[0].public_handle)
    }
  }, [contacts, selectedContactHandle])

  const profileQuery = useQuery({
    queryKey: ["dcx_app_network_profile", selectedContactHandle],
    enabled: !!selectedContactHandle,
    queryFn: async () =>
      readDcxAppNetworkProfile({
        apiBaseUrl: props.apiBaseUrl,
        networkNickname: selectedContactHandle as string,
      }),
  })
  const selectedProfile = profileQuery.data?.data ?? null

  const followMutation = useMutation({
    mutationFn: async (params: { networkNickname: string; shouldFollow: boolean }) =>
      setDcxAppNetworkFollow({
        apiBaseUrl: props.apiBaseUrl,
        networkNickname: params.networkNickname,
        shouldFollow: params.shouldFollow,
      }),
    onSuccess: async (payload) => {
      queryClient.setQueryData(["dcx_app_network_profile", payload.data.public_handle], payload)
      await queryClient.invalidateQueries({ queryKey: ["dcx_app_network_contacts"] })
      await queryClient.invalidateQueries({ queryKey: ["dcx_app_network_feed"] })
    },
  })

  const dmStartMutation = useMutation({
    mutationFn: async (networkNickname: string) =>
      startDcxAppNetworkDm({
        apiBaseUrl: props.apiBaseUrl,
        networkNickname,
      }),
    onSuccess: (payload) => {
      window.location.assign(`/network/dms/${payload.data.dm_thread_id}`)
    },
  })

  const columns = useMemo<Array<ColumnDef<DcxAppNetworkContact>>>(
    () => [
      {
        id: "contact",
        accessorFn: (contact) => contact.public_identity_label,
        header: "Contact",
        cell: ({ row }) => (
          <div className="flex min-w-0 items-center gap-2">
            <DcxAppNetworkAvatar author={row.original} size="sm" />
            <div className="min-w-0">
              <p className="truncate font-medium text-slate-950">{row.original.public_identity_label}</p>
              <p className="truncate text-xs text-slate-500">@{row.original.public_handle}</p>
            </div>
          </div>
        ),
      },
      {
        id: "relation",
        accessorFn: (contact) => readDcxContactRelationLabel(contact),
        header: "Relation",
        cell: ({ row }) => <span className="text-sm text-slate-600">{readDcxContactRelationLabel(row.original)}</span>,
      },
      {
        id: "followers",
        accessorFn: (contact) => contact.follower_count,
        header: "Followers",
        cell: ({ row }) => row.original.follower_count,
      },
      {
        id: "posts",
        accessorFn: (contact) => contact.post_count,
        header: "Posts",
        cell: ({ row }) => row.original.post_count,
      },
      {
        id: "active",
        accessorFn: (contact) => contact.latest_post_at_ts_ms ?? contact.created_at_ts_ms,
        header: "Active",
        cell: ({ row }) =>
          formatDcxAppAccountTimestampLabel(
            row.original.latest_post_at_ts_ms ?? row.original.created_at_ts_ms,
            selectedLanguageCode,
            selectedTimezoneIanaName,
            "",
          ),
      },
    ],
    [selectedLanguageCode, selectedTimezoneIanaName],
  )

  const contactsListPanel = (
    <section className="min-w-0 overflow-hidden border border-black/6 bg-white shadow-[0_18px_55px_-48px_rgba(15,23,42,0.45)]">
      <div className="space-y-3 border-b border-black/6 px-4 py-3">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <label className="relative block w-full lg:flex-1">
            <SearchIcon className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
            <Input
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search contacts..."
              className="pl-9"
            />
          </label>
          <div className="flex items-center justify-between gap-3 lg:justify-end">
            <p className="text-xs text-slate-500">
              {contacts.length} of {contactsQuery.data?.data.total_contact_count ?? contacts.length}
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => void queryClient.invalidateQueries({ queryKey: ["dcx_app_network_contacts"] })}
            >
              <RefreshCwIcon />
              {ux.refresh_button_label ?? "Refresh"}
            </Button>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {DCX_NETWORK_CONTACT_SCOPES.map((scopeOption) => (
            <Button
              key={scopeOption.key}
              type="button"
              variant={scope === scopeOption.key ? "default" : "outline"}
              size="sm"
              onClick={() => {
                setScope(scopeOption.key)
                setSelectedContactHandle(null)
              }}
            >
              {scopeOption.label}
            </Button>
          ))}
        </div>
      </div>
      <DcxAppDataTable
        columns={columns}
        data={contacts}
        tableClassName="[&_td]:py-3"
        sorting={sorting}
        onSortingChange={setSorting}
        pageSize={25}
        onRowClick={(row) => {
          setSelectedContactHandle(row.public_handle)
          if (isDetailSheetMode) {
            setIsMobileDetailOpen(true)
          }
        }}
        readRowClassName={(row) => row.public_handle === selectedContactHandle ? "bg-sky-50 hover:bg-sky-50 ring-1 ring-inset ring-sky-200" : ""}
        emptyLabel={contactsQuery.isLoading ? "Loading contacts..." : "No contacts found."}
      />
      {contactsQuery.isError ? (
        <p className="px-4 pb-4 text-sm text-red-600">{(contactsQuery.error as Error).message}</p>
      ) : null}
    </section>
  )

  const contactsDetailPanel = (
    <aside className="h-full min-w-0 overflow-y-auto border border-black/6 bg-white p-6 shadow-[0_18px_55px_-48px_rgba(15,23,42,0.45)]">
      {!selectedProfile ? (
        <p className="text-sm text-slate-500">
          {profileQuery.isLoading ? "Loading profile..." : "Choose a contact to view."}
        </p>
      ) : (
        <DcxNetworkContactDetailPanel
          profile={selectedProfile}
          selectedLanguageCode={selectedLanguageCode}
          selectedTimezoneIanaName={selectedTimezoneIanaName}
          isSavingFollow={followMutation.isPending}
          isStartingDm={dmStartMutation.isPending}
          errorText={((followMutation.error ?? dmStartMutation.error) as Error | null)?.message ?? null}
          onToggleFollow={() =>
            followMutation.mutate({
              networkNickname: selectedProfile.public_handle,
              shouldFollow: !selectedProfile.is_followed_by_authenticated_user,
            })}
          onStartDm={() => dmStartMutation.mutate(selectedProfile.public_handle)}
        />
      )}
    </aside>
  )

  return (
    <section className="flex min-h-[calc(100vh-5rem)] min-w-0 flex-col gap-4 overflow-x-hidden text-slate-950">
      {isDetailSheetMode ? (
        <main className="min-w-0 overflow-x-hidden">{contactsListPanel}</main>
      ) : (
        <ResizablePanelGroup
          key={isBalancedDesktopSplitMode ? "balanced-desktop-split" : "wide-desktop-split"}
          orientation="horizontal"
          className="min-h-0 w-full max-w-full flex-1 overflow-hidden"
        >
          <ResizablePanel className="min-w-0 overflow-hidden" defaultSize={isBalancedDesktopSplitMode ? "50%" : "54%"} minSize="42%">
            <div className="h-full min-w-0 overflow-x-hidden pr-2">{contactsListPanel}</div>
          </ResizablePanel>
          <ResizableHandle withHandle className="mx-1 bg-transparent" />
          <ResizablePanel className="min-w-0 overflow-hidden" defaultSize={isBalancedDesktopSplitMode ? "50%" : "46%"} minSize="34%" maxSize="58%">
            <div className="h-full min-w-0 overflow-x-hidden pl-2">{contactsDetailPanel}</div>
          </ResizablePanel>
        </ResizablePanelGroup>
      )}

      {isDetailSheetMode ? (
        <Sheet open={isMobileDetailOpen && selectedContactHandle !== null} onOpenChange={setIsMobileDetailOpen}>
          <SheetContent className="overflow-x-hidden overflow-y-auto p-0 data-[side=right]:w-[90vw] data-[side=right]:max-w-[90vw] data-[side=right]:sm:max-w-[90vw]">
            <SheetHeader className="sr-only">
              <SheetTitle>Contact profile</SheetTitle>
              <SheetDescription>Network contact detail</SheetDescription>
            </SheetHeader>
            {contactsDetailPanel}
          </SheetContent>
        </Sheet>
      ) : null}
    </section>
  )
}

function DcxNetworkContactDetailPanel(props: {
  profile: DcxAppNetworkProfile
  selectedLanguageCode: string
  selectedTimezoneIanaName: string | null
  isSavingFollow: boolean
  isStartingDm: boolean
  errorText: string | null
  onToggleFollow: () => void
  onStartDm: () => void
}) {
  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 items-start gap-4">
          <DcxAppNetworkAvatar
            author={{
              public_identity_label: props.profile.public_identity_label,
              public_handle: props.profile.public_handle,
              profile_image_url: props.profile.profile_image_url,
            }}
            size="lg"
          />
          <div className="min-w-0">
            <h2 className="truncate text-xl font-semibold text-slate-950">{props.profile.public_identity_label}</h2>
            <a href={`/network/${props.profile.public_handle}`} className="mt-1 block text-sm text-slate-500 hover:text-sky-700">
              @{props.profile.public_handle}
            </a>
            <p className="mt-2 text-xs text-slate-500">
              Joined {formatDcxAppAccountTimestampLabel(props.profile.created_at_ts_ms, props.selectedLanguageCode, props.selectedTimezoneIanaName, "")}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant={props.profile.is_followed_by_authenticated_user ? "outline" : "default"}
            disabled={props.profile.is_self || props.isSavingFollow}
            onClick={props.onToggleFollow}
          >
            {props.profile.is_followed_by_authenticated_user ? <UserMinusIcon /> : <UserPlusIcon />}
            {props.profile.is_followed_by_authenticated_user ? "Following" : "Follow"}
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={props.profile.is_self || !props.profile.can_dm || props.isStartingDm}
            onClick={props.onStartDm}
          >
            <MessageCircleIcon />
            DM
          </Button>
        </div>
      </header>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="border border-slate-200 px-3 py-2">
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500">Followers</p>
          <p className="mt-1 text-xl font-semibold">{props.profile.follower_count}</p>
        </div>
        <div className="border border-slate-200 px-3 py-2">
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500">Following</p>
          <p className="mt-1 text-xl font-semibold">{props.profile.following_count}</p>
        </div>
        <div className="border border-slate-200 px-3 py-2">
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500">DMs</p>
          <p className="mt-1 text-sm font-medium">{props.profile.can_dm ? "Available" : props.profile.is_self ? "Your profile" : "Not available"}</p>
        </div>
      </div>

      <section className="space-y-3">
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500">Badges</p>
        <DcxAppNetworkBadgeList
          languages={props.profile.languages}
          timezones={props.profile.timezones}
          countries={props.profile.countries}
          commodities={props.profile.commodities}
          maxItems={28}
        />
      </section>

      <section className="space-y-3">
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500">Latest public posts</p>
        {props.profile.recent_posts.length === 0 ? (
          <p className="text-sm text-slate-500">No network posts yet.</p>
        ) : (
          <div className="space-y-3">
            {props.profile.recent_posts.map((post) => (
              <article key={post.feed_post_id} className="border border-slate-200 bg-slate-50 px-4 py-3">
                <p className="whitespace-pre-wrap text-sm leading-6 text-slate-800">{post.post_text}</p>
                <p className="mt-2 text-xs text-slate-500">{post.reply_count} replies</p>
              </article>
            ))}
          </div>
        )}
      </section>

      {props.errorText ? <p className="text-sm text-red-600">{props.errorText}</p> : null}
    </div>
  )
}

function readDcxContactRelationLabel(contact: DcxAppNetworkContact): string {
  if (contact.is_followed_by_authenticated_user && contact.is_following_authenticated_user) {
    return "Mutual"
  }
  if (contact.is_followed_by_authenticated_user) {
    return "Following"
  }
  if (contact.is_following_authenticated_user) {
    return "Follower"
  }
  return "Contact"
}
