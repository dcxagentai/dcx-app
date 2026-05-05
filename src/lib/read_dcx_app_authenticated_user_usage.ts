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
  total_token_count: number
  event_count: number
}

export type DcxAppAuthenticatedUserUsage = {
  total_prompt_tokens: number
  total_candidates_tokens: number
  total_tokens: number
  total_events: number
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
}): Promise<DcxAppUsageSuccessResponse> {
  const response = await fetch(new URL("/users/me/usage", params.apiBaseUrl).toString(), {
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
