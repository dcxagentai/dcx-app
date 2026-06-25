/**
 * CONTEXT:
 * First app-private DCX Network profile page.
 * It turns the normalized user preference rows into visible trader identity badges.
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { MessageCircleIcon, UserMinusIcon, UserPlusIcon } from "lucide-react"

import { Button } from "./ui/button"
import {
  DCX_APP_ACCOUNT_PAGE_DEFAULT_UX_STRINGS,
  formatDcxAppAccountTimestampLabel,
} from "./dcx_app_user_account_shared"
import { readDcxAppAuthenticatedUserAccountSummary } from "../lib/read_dcx_app_authenticated_user_account_summary"
import {
  readDcxAppNetworkProfile,
  setDcxAppNetworkFollow,
  startDcxAppNetworkDm,
} from "../lib/dcx_app_network_api"
import {
  DcxAppNetworkAvatar,
  DcxAppNetworkBadgeList,
} from "./dcx_app_network_shared"

type Props = {
  apiBaseUrl: string
  networkNickname: string | null
}

export function DcxAppNetworkProfilePage(props: Props) {
  const queryClient = useQueryClient()
  const normalizedNickname = props.networkNickname?.trim().toLowerCase() ?? ""

  const accountSummaryQuery = useQuery({
    queryKey: ["dcx_app_authenticated_user_account_summary"],
    queryFn: async () => readDcxAppAuthenticatedUserAccountSummary({ apiBaseUrl: props.apiBaseUrl }),
  })
  const accountSummary = accountSummaryQuery.data?.data ?? null
  const ux = accountSummary?.ux_strings ?? DCX_APP_ACCOUNT_PAGE_DEFAULT_UX_STRINGS
  const selectedLanguageCode = accountSummary?.preferred_language?.language_code ?? "en"
  const selectedTimezoneIanaName = accountSummary?.preferred_timezone?.iana_name ?? null

  const profileQuery = useQuery({
    queryKey: ["dcx_app_network_profile", normalizedNickname],
    enabled: normalizedNickname !== "",
    queryFn: async () =>
      readDcxAppNetworkProfile({
        apiBaseUrl: props.apiBaseUrl,
        networkNickname: normalizedNickname,
      }),
  })

  const profile = profileQuery.data?.data ?? null
  const followMutation = useMutation({
    mutationFn: async (shouldFollow: boolean) =>
      setDcxAppNetworkFollow({
        apiBaseUrl: props.apiBaseUrl,
        networkNickname: normalizedNickname,
        shouldFollow,
      }),
    onSuccess: async (payload) => {
      queryClient.setQueryData(["dcx_app_network_profile", normalizedNickname], payload)
      await queryClient.invalidateQueries({ queryKey: ["dcx_app_network_feed"] })
    },
  })

  const dmStartMutation = useMutation({
    mutationFn: async () =>
      startDcxAppNetworkDm({
        apiBaseUrl: props.apiBaseUrl,
        networkNickname: normalizedNickname,
      }),
    onSuccess: (payload) => {
      window.location.assign(`/network/dms/${payload.data.dm_thread_id}`)
    },
  })

  if (normalizedNickname === "") {
    return (
      <section className="border border-red-200 bg-white px-6 py-8">
        <p className="text-sm text-red-600">That network profile is not available.</p>
      </section>
    )
  }

  if (profileQuery.isLoading) {
    return (
      <section className="border border-black/6 bg-white px-6 py-8">
        <p className="text-sm text-slate-500">Loading profile...</p>
      </section>
    )
  }

  if (profileQuery.isError || !profile) {
    return (
      <section className="border border-red-200 bg-white px-6 py-8">
        <p className="text-sm text-red-600">{(profileQuery.error as Error | null)?.message ?? "Profile not found."}</p>
      </section>
    )
  }

  return (
    <section className="flex min-h-[calc(100vh-5rem)] flex-col gap-4 text-slate-950">
      <article className="rounded-md border border-black/6 bg-white p-6 shadow-[0_18px_55px_-48px_rgba(15,23,42,0.45)]">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex min-w-0 items-start gap-4">
            <DcxAppNetworkAvatar
              author={{
                public_identity_label: profile.public_identity_label,
                public_handle: profile.public_handle,
                profile_image_url: profile.profile_image_url,
              }}
              size="lg"
            />
            <div className="min-w-0">
              <h2 className="truncate text-2xl font-semibold tracking-tight text-slate-950">
                {profile.public_identity_label}
              </h2>
              <p className="mt-1 text-sm text-slate-500">@{profile.public_handle}</p>
              <p className="mt-2 text-xs text-slate-500">
                Joined {formatDcxAppAccountTimestampLabel(profile.created_at_ts_ms, selectedLanguageCode, selectedTimezoneIanaName, "")}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {!profile.is_self ? (
              <Button
                type="button"
                variant={profile.is_followed_by_authenticated_user ? "outline" : "default"}
                disabled={followMutation.isPending}
                onClick={() => followMutation.mutate(!profile.is_followed_by_authenticated_user)}
              >
                {profile.is_followed_by_authenticated_user ? <UserMinusIcon /> : <UserPlusIcon />}
                {profile.is_followed_by_authenticated_user ? "Following" : "Follow"}
              </Button>
            ) : null}
            {!profile.is_self ? (
              <Button
                type="button"
                variant="outline"
                disabled={!profile.can_dm || dmStartMutation.isPending}
                onClick={() => dmStartMutation.mutate()}
              >
                <MessageCircleIcon />
                DM
              </Button>
            ) : null}
          </div>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          <div className="rounded-md border border-slate-200 px-3 py-2">
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500">Followers</p>
            <p className="mt-1 text-xl font-semibold">{profile.follower_count}</p>
          </div>
          <div className="rounded-md border border-slate-200 px-3 py-2">
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500">Following</p>
            <p className="mt-1 text-xl font-semibold">{profile.following_count}</p>
          </div>
          <div className="rounded-md border border-slate-200 px-3 py-2">
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500">DMs</p>
            <p className="mt-1 text-sm font-medium">{profile.can_dm ? "Available" : profile.is_self ? "Your profile" : "Not available"}</p>
          </div>
        </div>

        <section className="mt-6 space-y-3">
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500">Badges</p>
          <DcxAppNetworkBadgeList
            languages={profile.languages}
            timezones={profile.timezones}
            countries={profile.countries}
            commodities={profile.commodities}
          />
        </section>

        {followMutation.isError || dmStartMutation.isError ? (
          <p className="mt-4 text-sm text-red-600">
            {((followMutation.error ?? dmStartMutation.error) as Error).message}
          </p>
        ) : null}
      </article>

      <section className="rounded-md border border-black/6 bg-white p-6 shadow-[0_18px_55px_-48px_rgba(15,23,42,0.45)]">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h3 className="text-lg font-semibold text-slate-950">Recent posts</h3>
          <Button type="button" variant="outline" size="sm" onClick={() => window.location.assign("/network/feed")}>
            {ux.page_title_market_forum ?? "Feed"}
          </Button>
        </div>
        {profile.recent_posts.length === 0 ? (
          <p className="text-sm text-slate-500">No network posts yet.</p>
        ) : (
          <div className="space-y-3">
            {profile.recent_posts.map((post) => (
              <article key={post.feed_post_id} className="rounded-md border border-slate-200 bg-slate-50 px-4 py-3">
                <p className="whitespace-pre-wrap text-sm leading-6 text-slate-800">{post.post_text}</p>
                <p className="mt-2 text-xs text-slate-500">{post.reply_count} replies</p>
              </article>
            ))}
          </div>
        )}
      </section>
    </section>
  )
}
