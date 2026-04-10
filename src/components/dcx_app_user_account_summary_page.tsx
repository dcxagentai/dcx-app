/**
 * CONTEXT:
 * Identity-focused account overview page for the DCX app.
 * It keeps the core user identity fields together in one calm surface while
 * settings and activity move into their own pages in the new sidebar shell.
 */
import { useQuery } from "@tanstack/react-query"

import { DcxAppAccountFieldRow, DCX_APP_ACCOUNT_PAGE_DEFAULT_UX_STRINGS } from "./dcx_app_user_account_shared"
import { readDcxAppAuthenticatedUserAccountSummary } from "../lib/read_dcx_app_authenticated_user_account_summary"

type Props = {
  apiBaseUrl: string
}

export function DcxAppUserAccountSummaryPage(props: Props) {
  const accountSummaryQuery = useQuery({
    queryKey: ["dcx_app_authenticated_user_account_summary"],
    queryFn: async () =>
      readDcxAppAuthenticatedUserAccountSummary({
        apiBaseUrl: props.apiBaseUrl,
      }),
  })

  const accountSummary = accountSummaryQuery.data?.data ?? null
  const ux = accountSummary?.ux_strings ?? DCX_APP_ACCOUNT_PAGE_DEFAULT_UX_STRINGS
  const phoneDisplayValue = accountSummary?.primary_phone_e164
    ? `${accountSummary.primary_phone_e164}${accountSummary.primary_phone_channel ? ` (${accountSummary.primary_phone_channel})` : ""}`
    : ux.field_phone_not_set_yet

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
            <p className="text-sm text-slate-500">
              {(accountSummaryQuery.error as Error & { suggested_action?: string }).suggested_action ??
                ux.error_account_load_suggested_action}
            </p>
          </div>
        </section>
      ) : null}

      {accountSummary && !accountSummaryQuery.isError ? (
        <article className="rounded-none border border-black/6 bg-white px-6 py-6 shadow-[0_20px_60px_-48px_rgba(15,23,42,0.45)]">
          <div className="mb-6 flex items-start justify-between gap-4 border-b border-black/6 pb-5">
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                {ux.identity_eyebrow}
              </p>
              <h2 className="text-2xl font-semibold tracking-tight text-slate-950">
                {accountSummary.primary_email}
              </h2>
              <p className="text-sm text-slate-600">
                {ux.identity_subtitle}
              </p>
            </div>
            <div
              className={[
                "rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em]",
                accountSummary.primary_email_confirmed
                  ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200"
                  : "bg-amber-50 text-amber-700 ring-1 ring-amber-200",
              ].join(" ")}
            >
              {accountSummary.primary_email_confirmed ? ux.account_state_confirmed : ux.account_state_pending}
            </div>
          </div>

          <dl>
            <DcxAppAccountFieldRow label={ux.field_primary_email} value={accountSummary.primary_email} />
            <DcxAppAccountFieldRow label={ux.field_primary_phone} value={phoneDisplayValue} />
            <DcxAppAccountFieldRow label={ux.field_user_uuid} value={accountSummary.user_uuid} />
            <DcxAppAccountFieldRow label={ux.field_account_status} value={accountSummary.account_status} compact />
          </dl>
        </article>
      ) : null}
    </section>
  )
}
