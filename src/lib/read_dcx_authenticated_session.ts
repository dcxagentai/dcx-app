/**
 * CONTEXT:
 * This file reads the shared authenticated DCX browser session for the user app.
 * It exists so dcx_app can bootstrap protected routes from one canonical backend auth contract
 * while still preserving the temporary local debug fallback during development.
 *
 * CONTRACT:
 * preconditions: The frontend knows the backend base URL and may or may not already have a valid
 * shared DCX session cookie.
 * postconditions: Returns the canonical backend session payload on success.
 * side_effects: None.
 * idempotent: Yes.
 * retry_safe: Yes.
 * blocking_behavior: Async fetch over HTTP.
 *
 * NARRATIVE:
 * WHY this exists: The app shell needs one narrow session-check capability before deciding whether
 * to render `/login` or the protected account page.
 * WHEN TO USE it: Use it during app bootstrap and after login/logout mutations.
 * WHEN NOT TO USE it: Do not use it for route-level authorization on the backend.
 * WHAT CAN GO WRONG: The browser may not have a valid session cookie or the backend can be unreachable.
 * WHAT COMES NEXT: The same session bootstrap can later guard broader app routes beyond `/me/account`.
 *
 * TESTS:
 * No frontend test harness exists in dcx_app yet.
 *
 * ERRORS:
 * - DCX_AUTH_SESSION_REQUIRED: No valid shared session exists.
 *   suggested_action: Sign in first or use the local debug fallback while auth is being connected.
 *   common_causes: No session cookie, expired session, revoked session.
 *   recovery_steps: Sign in again, then retry.
 *   retry_safe: Yes.
 *
 * CODE:
 */
export type DcxAuthenticatedSessionSummary = {
  user_id: number
  user_uuid: string
  primary_email: string
  user_role: string
  account_status: string
  allowed_surfaces: {
    app: boolean
    admin: boolean
  }
  session: {
    session_id: number
    issued_at_ts_ms: number
    expires_at_ts_ms: number
    last_seen_at_ts_ms: number | null
  }
}

type DcxAuthenticatedSessionSuccessResponse = {
  ok: true
  data: DcxAuthenticatedSessionSummary
  context?: {
    surface?: string
    view?: string
    auth_mode?: string
  }
}

type DcxAuthenticatedSessionErrorResponse = {
  ok: false
  error: {
    code: string
    message: string
    suggested_action: string
  }
}

export async function readDcxAuthenticatedSession(params: {
  apiBaseUrl: string
}): Promise<DcxAuthenticatedSessionSuccessResponse> {
  const sessionUrl = new URL("/auth/session", params.apiBaseUrl)
  const response = await fetch(sessionUrl.toString(), {
    method: "GET",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
    },
  })

  const payload = (await response.json()) as
    | DcxAuthenticatedSessionSuccessResponse
    | DcxAuthenticatedSessionErrorResponse

  if (!response.ok || payload.ok !== true) {
    const errorPayload =
      payload && payload.ok === false
        ? payload.error
        : {
            code: "DCX_AUTH_SESSION_READ_FAILED",
            message: "We could not read the current DCX session.",
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
