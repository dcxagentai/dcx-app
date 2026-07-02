/**
 * CONTEXT:
 * Reads the authenticated user's basic DCX token usage summary for the app Usage screen.
 */

export type DcxAppUsageEvent = {
  provider_name: string
  model_name: string
  prompt_version: string
  usage_source_kind: string
  usage_source_id: number | null
  prompt_token_count: number
  candidates_token_count: number
  total_token_count: number
  created_at_ts_ms: number
}

export type DcxAppUsageDailyTotal = {
  usage_day: string
  prompt_token_count: number
  candidates_token_count: number
  total_token_count: number
  event_count: number
}

export type DcxAppAuthenticatedUserUsage = {
  total_prompt_tokens: number
  total_candidates_tokens: number
  total_tokens: number
  total_events: number
  daily_window_days: number
  recent_events: DcxAppUsageEvent[]
  daily_totals: DcxAppUsageDailyTotal[]
}

type DcxAppUsageSuccessResponse = {
  ok: true
  data: DcxAppAuthenticatedUserUsage
  context?: Record<string, unknown>
}

type DcxAppUsageErrorResponse = {
  ok: false
  error: {
    code: string
    message: string
    suggested_action: string
  }
}

export async function readDcxAppAuthenticatedUserUsage(params: {
  apiBaseUrl: string
  days?: number
}): Promise<DcxAppUsageSuccessResponse> {
  const normalizedDays =
    typeof params.days === "number" && Number.isFinite(params.days)
      ? Math.max(1, Math.min(Math.trunc(params.days), 365))
      : 30
  const usageUrl = new URL(`/users/me/usage/days/${normalizedDays}`, params.apiBaseUrl)

  const response = await fetch(usageUrl.toString(), {
    credentials: "include",
  })
  const payload = (await response.json()) as DcxAppUsageSuccessResponse | DcxAppUsageErrorResponse
  if (!response.ok || !payload.ok) {
    const errorPayload = payload as DcxAppUsageErrorResponse
    const error = new Error(errorPayload.error?.message ?? "We could not load DCX usage.") as Error & {
      suggested_action?: string
    }
    error.suggested_action = errorPayload.error?.suggested_action
    throw error
  }
  return payload
}
