/**
 * CONTEXT:
 * Reads content-free authenticated user activity events for the app Activity screen.
 */

export type DcxAppActivityEvent = {
  activity_event_id: number
  activity_kind: string
  surface: string
  entity_kind: string
  entity_id: number | null
  event_status: string
  activity_summary: string
  activity_metadata: Record<string, unknown>
  actor_user_id: number | null
  created_at_ts_ms: number
}

export type DcxAppAuthenticatedUserActivity = {
  events: DcxAppActivityEvent[]
  event_count: number
}

type DcxAppActivitySuccessResponse = {
  ok: true
  data: DcxAppAuthenticatedUserActivity
  context?: Record<string, unknown>
}

type DcxAppActivityErrorResponse = {
  ok: false
  error: {
    code: string
    message: string
    suggested_action: string
  }
}

export async function readDcxAppAuthenticatedUserActivity(params: {
  apiBaseUrl: string
}): Promise<DcxAppActivitySuccessResponse> {
  const response = await fetch(new URL("/users/me/activity", params.apiBaseUrl).toString(), {
    credentials: "include",
  })
  const payload = (await response.json()) as DcxAppActivitySuccessResponse | DcxAppActivityErrorResponse
  if (!response.ok || !payload.ok) {
    const errorPayload = payload as DcxAppActivityErrorResponse
    const error = new Error(errorPayload.error?.message ?? "We could not load DCX activity.") as Error & {
      suggested_action?: string
    }
    error.suggested_action = errorPayload.error?.suggested_action
    throw error
  }
  return payload
}
