/**
 * CONTEXT:
 * Basic authenticated Usage page for DCX app users.
 * It shows the MVP token account from provider-returned Gemini usage metadata.
 */
import { useQuery } from "@tanstack/react-query"

import {
  DCX_APP_ACCOUNT_PAGE_DEFAULT_UX_STRINGS,
  formatDcxAppAccountTimestampLabel,
} from "./dcx_app_user_account_shared"
import { readDcxAppAuthenticatedUserAccountSummary } from "../lib/read_dcx_app_authenticated_user_account_summary"
import { readDcxAppAuthenticatedUserUsage } from "../lib/read_dcx_app_authenticated_user_usage"

type Props = {
  apiBaseUrl: string
}

export function DcxAppUserUsagePage(props: Props) {
  const accountSummaryQuery = useQuery({
    queryKey: ["dcx_app_authenticated_user_account_summary"],
    queryFn: async () => readDcxAppAuthenticatedUserAccountSummary({ apiBaseUrl: props.apiBaseUrl }),
  })
  const usageQuery = useQuery({
    queryKey: ["dcx_app_authenticated_user_usage"],
    queryFn: async () => readDcxAppAuthenticatedUserUsage({ apiBaseUrl: props.apiBaseUrl }),
  })

  const accountSummary = accountSummaryQuery.data?.data ?? null
  const ux = accountSummary?.ux_strings ?? DCX_APP_ACCOUNT_PAGE_DEFAULT_UX_STRINGS
  const selectedTimezoneIanaName = accountSummary?.preferred_timezone?.iana_name ?? null
  const selectedLanguageCode = accountSummary?.preferred_language?.language_code ?? "en"
  const usage = usageQuery.data?.data ?? null

  return (
    <section className="flex flex-col gap-6 text-slate-950">
      <article className="rounded-none border border-black/6 bg-white px-6 py-6 shadow-[0_20px_60px_-48px_rgba(15,23,42,0.45)]">
        <div className="mb-5 space-y-2 border-b border-black/6 pb-4">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Usage</p>
          <h2 className="text-2xl font-semibold tracking-tight text-slate-950">Token usage</h2>
          <p className="text-sm text-slate-600">Basic Gemini token totals for this account.</p>
        </div>

        {usageQuery.isLoading ? <p className="text-sm text-slate-500">{ux.loading_account_summary}</p> : null}
        {usageQuery.isError ? (
          <div className="space-y-2 text-sm text-red-700">
            <p>{(usageQuery.error as Error).message}</p>
            <p>{(usageQuery.error as Error & { suggested_action?: string }).suggested_action}</p>
          </div>
        ) : null}

        {usage ? (
          <div className="grid gap-3 sm:grid-cols-3">
            <UsageStat label="Total tokens" value={usage.total_tokens.toLocaleString()} />
            <UsageStat label="Input tokens" value={usage.total_prompt_tokens.toLocaleString()} />
            <UsageStat label="Output tokens" value={usage.total_candidates_tokens.toLocaleString()} />
          </div>
        ) : null}
      </article>

      {usage ? (
        <article className="rounded-none border border-black/6 bg-white px-6 py-6 shadow-[0_20px_60px_-48px_rgba(15,23,42,0.45)]">
          <div className="mb-4 flex items-center justify-between gap-4 border-b border-black/6 pb-4">
            <h3 className="text-lg font-semibold tracking-tight text-slate-950">Recent LLM calls</h3>
            <span className="text-xs font-medium text-slate-500">{usage.total_events} events</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[620px] text-left text-sm">
              <thead className="text-xs uppercase tracking-[0.16em] text-slate-500">
                <tr className="border-b border-slate-200">
                  <th className="py-3 pr-4 font-semibold">Time</th>
                  <th className="py-3 pr-4 font-semibold">Prompt</th>
                  <th className="py-3 pr-4 font-semibold">Model</th>
                  <th className="py-3 pr-4 text-right font-semibold">Tokens</th>
                </tr>
              </thead>
              <tbody>
                {usage.recent_events.map((event) => (
                  <tr key={`${event.usage_source_kind}-${event.usage_source_id}-${event.created_at_ts_ms}`} className="border-b border-slate-100">
                    <td className="py-3 pr-4 text-slate-600">
                      {formatDcxAppAccountTimestampLabel(
                        event.created_at_ts_ms,
                        selectedLanguageCode,
                        selectedTimezoneIanaName,
                        ux.field_not_set,
                      )}
                    </td>
                    <td className="py-3 pr-4 font-medium text-slate-900">{event.usage_source_kind}</td>
                    <td className="py-3 pr-4 text-slate-600">{event.model_name || event.provider_name}</td>
                    <td className="py-3 pr-4 text-right tabular-nums text-slate-900">{event.total_token_count.toLocaleString()}</td>
                  </tr>
                ))}
                {usage.recent_events.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-6 text-sm text-slate-500">No LLM usage recorded yet.</td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </article>
      ) : null}
    </section>
  )
}

function UsageStat(props: { label: string; value: string }) {
  return (
    <div className="border border-slate-200 bg-slate-50 px-4 py-3">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">{props.label}</p>
      <p className="mt-2 text-2xl font-semibold tabular-nums tracking-tight text-slate-950">{props.value}</p>
    </div>
  )
}
