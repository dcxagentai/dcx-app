/**
 * CONTEXT:
 * Basic activity log page for the DCX app.
 * It surfaces the account-timeline concept in its own route so the client can
 * see how user-level operational history will live in the shell.
 */
import { useQuery } from "@tanstack/react-query"

import {
  DcxAppAccountFieldRow,
  DCX_APP_ACCOUNT_PAGE_DEFAULT_UX_STRINGS,
  formatDcxAppAccountTimestampLabel,
} from "./dcx_app_user_account_shared"
import { readDcxAppAuthenticatedUserAccountSummary } from "../lib/read_dcx_app_authenticated_user_account_summary"

type Props = {
  apiBaseUrl: string
}

export function DcxAppUserActivityLogPage(props: Props) {
  const accountSummaryQuery = useQuery({
    queryKey: ["dcx_app_authenticated_user_account_summary"],
    queryFn: async () =>
      readDcxAppAuthenticatedUserAccountSummary({
        apiBaseUrl: props.apiBaseUrl,
      }),
  })

  const accountSummary = accountSummaryQuery.data?.data ?? null
  const ux = accountSummary?.ux_strings ?? DCX_APP_ACCOUNT_PAGE_DEFAULT_UX_STRINGS
  const selectedTimezoneIanaName = accountSummary?.preferred_timezone?.iana_name ?? null
  const selectedLanguageCode = accountSummary?.preferred_language?.language_code ?? "en"

  return (
    <section className="flex flex-col gap-6 text-slate-950">
      {accountSummaryQuery.isLoading ? (
        <section className="rounded-none border border-black/6 bg-white px-6 py-8 shadow-[0_20px_60px_-48px_rgba(15,23,42,0.45)]">
          <p className="text-sm text-slate-500">{ux.loading_account_summary}</p>
        </section>
      ) : null}

      {accountSummaryQuery.isError ? (
        <section className="rounded-none border border-red-200 bg-white px-6 py-8 shadow-[0_20px_60px_-48px_rgba(15,23,42,0.45)]">
          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-red-500">
              {ux.error_account_read_blocked}
            </p>
            <h2 className="text-xl font-semibold tracking-tight text-slate-950">
              {ux.error_account_load_title}
            </h2>
            <p className="max-w-2xl text-sm leading-6 text-slate-600">
              {(accountSummaryQuery.error as Error & { suggested_action?: string }).message}
            </p>
          </div>
        </section>
      ) : null}

      {accountSummary && !accountSummaryQuery.isError ? (
        <article className="rounded-none border border-black/6 bg-white px-6 py-6 shadow-[0_20px_60px_-48px_rgba(15,23,42,0.45)]">
          <div className="mb-5 space-y-2 border-b border-black/6 pb-4">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
              {ux.activity_eyebrow}
            </p>
            <h2 className="text-2xl font-semibold tracking-tight text-slate-950">
              {ux.activity_title}
            </h2>
            <p className="text-sm text-slate-600">
              {ux.activity_subtitle}
            </p>
          </div>

          <dl>
            <DcxAppAccountFieldRow
              label={ux.field_email_confirmed_at}
              value={formatDcxAppAccountTimestampLabel(
                accountSummary.primary_email_confirmed_at_ts_ms,
                selectedLanguageCode,
                selectedTimezoneIanaName,
                ux.field_not_set,
              )}
            />
            <DcxAppAccountFieldRow
              label={ux.field_phone_confirmed_at}
              value={formatDcxAppAccountTimestampLabel(
                accountSummary.primary_phone_confirmed_at_ts_ms,
                selectedLanguageCode,
                selectedTimezoneIanaName,
                ux.field_not_set,
              )}
            />
            <DcxAppAccountFieldRow
              label={ux.field_last_seen_at}
              value={formatDcxAppAccountTimestampLabel(
                accountSummary.last_seen_at_ts_ms,
                selectedLanguageCode,
                selectedTimezoneIanaName,
                ux.field_not_set,
              )}
            />
            <DcxAppAccountFieldRow
              label={ux.field_created_at}
              value={formatDcxAppAccountTimestampLabel(
                accountSummary.created_at_ts_ms,
                selectedLanguageCode,
                selectedTimezoneIanaName,
                ux.field_not_set,
              )}
            />
            <DcxAppAccountFieldRow
              label={ux.field_updated_at}
              value={formatDcxAppAccountTimestampLabel(
                accountSummary.updated_at_ts_ms,
                selectedLanguageCode,
                selectedTimezoneIanaName,
                ux.field_not_set,
              )}
            />
          </dl>
        </article>
      ) : null}
    </section>
  )
}
