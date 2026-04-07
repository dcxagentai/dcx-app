/**
 * CONTEXT:
 * This file logs the current shared DCX browser session out from the user app.
 * It exists so dcx_app can clear the shared session cookie through one explicit backend contract.
 *
 * CONTRACT:
 * preconditions: The frontend knows the backend base URL and may or may not have a current session.
 * postconditions: Returns the canonical backend logout payload on success.
 * side_effects: May revoke one backend session and clears the auth cookie through HTTP.
 * idempotent: Yes.
 * retry_safe: Yes.
 * blocking_behavior: Async fetch over HTTP.
 *
 * NARRATIVE:
 * WHY this exists: The protected app shell needs a stable logout operation.
 * WHEN TO USE it: Use it from the app header logout action.
 * WHEN NOT TO USE it: Do not use it for global password-reset session revocation.
 * WHAT CAN GO WRONG: The backend can be unavailable.
 * WHAT COMES NEXT: The same helper can be used from more app routes as they appear.
 *
 * TESTS:
 * No frontend test harness exists in dcx_app yet.
 *
 * ERRORS:
 * - DCX_AUTH_LOGOUT_FAILED: The backend logout request failed.
 *   suggested_action: Retry after confirming the backend is reachable.
 *   common_causes: Backend unavailable.
 *   recovery_steps: Retry once backend health is restored.
 *   retry_safe: Yes.
 *
 * CODE:
 */
type DcxAuthLogoutSuccessResponse = {
  ok: true
  data: {
    logged_out: boolean
    session_revoked: boolean
  }
  context?: {
    surface?: string
    view?: string
    auth_mode?: string
  }
}

export async function logoutAuthenticatedDcxUser(params: {
  apiBaseUrl: string
}): Promise<DcxAuthLogoutSuccessResponse> {
  const logoutUrl = new URL("/auth/logout", params.apiBaseUrl)
  const response = await fetch(logoutUrl.toString(), {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
    },
  })

  if (!response.ok) {
    throw new Error("We could not log out of the DCX session.")
  }

  return (await response.json()) as DcxAuthLogoutSuccessResponse
}
