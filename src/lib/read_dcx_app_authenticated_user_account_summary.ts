/**
 * CONTEXT:
 * This file reads the first authenticated-account payload for the DCX user app.
 * It exists so the `/me/account` surface can stay thin and let TanStack Query own
 * the fetch lifecycle while the backend route contract stabilizes ahead of real auth.
 *
 * CONTRACT:
 * preconditions: The dcx_app frontend knows the backend base URL and carries one authenticated session cookie.
 * postconditions: Returns the canonical backend account-summary payload on success.
 * side_effects: None.
 * idempotent: Yes.
 * retry_safe: Yes.
 * blocking_behavior: Async fetch over HTTP.
 *
 * NARRATIVE:
 * WHY this exists: The first app account page should consume one narrow backend contract instead
 * of embedding fetch details throughout the component tree.
 * WHEN TO USE it: Use it from TanStack Query in the first read-only account screen.
 * WHEN NOT TO USE it: Do not use it for admin user lists or future write/update flows.
 * WHAT CAN GO WRONG: The backend can reject the current session, the user can be missing, or the network can fail.
 * WHAT COMES NEXT: Keep this read path stable while more protected app surfaces are added.
 *
 * TESTS:
 * No frontend test harness exists in dcx_app yet.
 *
 * ERRORS:
 * - DCX_APP_ACCOUNT_SUMMARY_READ_FAILED: The backend returned a non-success wrapper or the fetch failed.
 *   suggested_action: Confirm the API is reachable and the browser still has a valid DCX session.
 *   common_causes: Missing session cookie, expired session, backend unavailable.
 *   recovery_steps: Sign in again, then retry after backend health is restored.
 *   retry_safe: Yes.
 *
 * CODE:
 */
export type DcxAppAuthenticatedUserAccountSummary = {
  user_id: number
  user_uuid: string
  primary_email: string
  primary_email_confirmed: boolean
  primary_email_confirmed_at_ts_ms: number | null
  primary_phone_e164: string | null
  primary_phone_confirmed: boolean
  primary_phone_confirmed_at_ts_ms: number | null
  primary_phone_channel: string | null
  account_status: string
  email_communication_preference: string
  last_seen_at_ts_ms: number | null
  created_at_ts_ms: number
  updated_at_ts_ms: number
  preferred_language: {
    id: number
    language_code: string
    language_name_en: string
    language_name_native: string
    is_rtl: boolean
  } | null
  preferred_timezone: {
    id: number
    iana_name: string
    display_label: string
    region_label: string
  } | null
  available_languages: Array<{
    id: number
    language_code: string
    language_name_en: string
    language_name_native: string
    is_rtl: boolean
  }>
  available_timezones: Array<{
    id: number
    iana_name: string
    display_label: string
    region_label: string
  }>
  ux_strings: Record<string, string>
  available_email_communication_preferences: Array<{
    value: string
    label: string
  }>
}

type DcxAppAccountSummarySuccessResponse = {
  ok: true
  data: DcxAppAuthenticatedUserAccountSummary
  context?: {
    surface?: string
    view?: string
    identity_resolution_mode?: string
  }
}

type DcxAppAccountSummaryErrorResponse = {
  ok: false
  error: {
    code: string
    message: string
    suggested_action: string
  }
}

export async function readDcxAppAuthenticatedUserAccountSummary(params: {
  apiBaseUrl: string
}): Promise<DcxAppAccountSummarySuccessResponse> {
  const accountSummaryUrl = new URL("/users/me/account-summary", params.apiBaseUrl)

  const response = await fetch(accountSummaryUrl.toString(), {
    method: "GET",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
    },
  })

  const payload = (await response.json()) as
    | DcxAppAccountSummarySuccessResponse
    | DcxAppAccountSummaryErrorResponse

  if (!response.ok || payload.ok !== true) {
    const errorPayload =
      payload && payload.ok === false
        ? payload.error
        : {
            code: "DCX_APP_ACCOUNT_SUMMARY_READ_FAILED",
            message: "We could not load the DCX account summary.",
            suggested_action: "Retry after confirming the backend is reachable.",
          }

    const error = new Error(errorPayload.message) as Error & {
      code?: string
      suggested_action?: string
    }
    error.code = errorPayload.code
    error.suggested_action = errorPayload.suggested_action
    throw error
  }

  return payload
}
