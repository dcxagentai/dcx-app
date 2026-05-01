/**
 * CONTEXT:
 * This file saves the first editable-account payload for the DCX user app.
 * It exists so the `/me/account` surface can autosave low-risk account fields through one
 * narrow backend contract while the broader auth and verification system is still evolving.
 *
 * CONTRACT:
 * preconditions: The dcx_app frontend knows the backend base URL and carries one authenticated session cookie.
 * postconditions: Returns the canonical backend account-settings save payload on success.
 * side_effects: Updates mutable account fields over HTTP.
 * idempotent: Yes.
 * retry_safe: Yes.
 * blocking_behavior: Async fetch over HTTP.
 *
 * NARRATIVE:
 * WHY this exists: The first editable app account surface should autosave through one explicit
 * backend contract rather than embedding save logic in the page.
 * WHEN TO USE it: Use it from the inline autosave account settings controls.
 * WHEN NOT TO USE it: Do not use it for primary-email changes or admin-side user edits.
 * WHAT CAN GO WRONG: The backend can reject the session, the request body can be invalid, or the network can fail.
 * WHAT COMES NEXT: Keep this write path stable while more account-edit flows are added.
 *
 * TESTS:
 * No frontend test harness exists in dcx_app yet.
 *
 * ERRORS:
 * - DCX_APP_ACCOUNT_SETTINGS_SAVE_FAILED: The backend returned a non-success wrapper or the fetch failed.
 *   suggested_action: Retry after confirming the backend is reachable and the selected value is supported.
 *   common_causes: Missing session, invalid settings value, backend unavailable.
 *   recovery_steps: Sign in again if needed, keep the selected value supported, then retry after backend health is restored.
 *   retry_safe: Yes.
 *
 * CODE:
 */
import type { DcxAppAuthenticatedUserAccountSummary } from "./read_dcx_app_authenticated_user_account_summary"

type DcxAppAccountSettingsSaveSuccessResponse = {
  ok: true
  data: DcxAppAuthenticatedUserAccountSummary
  context?: {
    surface?: string
    view?: string
    operation?: string
    identity_resolution_mode?: string
  }
}

type DcxAppAccountSettingsSaveErrorResponse = {
  ok: false
  error: {
    code: string
    message: string
    suggested_action: string
  }
}

export async function saveDcxAppAuthenticatedUserAccountSettings(params: {
  apiBaseUrl: string
  preferredLanguageId: number | null
  preferredTimezoneId: number | null
  emailCommunicationPreference: string
  publicDisplayName: string
  publicHandle: string
  publicIdentityMode: string
}): Promise<DcxAppAccountSettingsSaveSuccessResponse> {
  const accountSettingsUrl = new URL("/users/me/account-settings", params.apiBaseUrl)

  const response = await fetch(accountSettingsUrl.toString(), {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      preferred_language_id: params.preferredLanguageId,
      preferred_timezone_id: params.preferredTimezoneId,
      email_communication_preference: params.emailCommunicationPreference,
      public_display_name: params.publicDisplayName,
      public_handle: params.publicHandle,
      public_identity_mode: params.publicIdentityMode,
    }),
  })

  const payload = (await response.json()) as
    | DcxAppAccountSettingsSaveSuccessResponse
    | DcxAppAccountSettingsSaveErrorResponse

  if (!response.ok || payload.ok !== true) {
    const errorPayload =
      payload && payload.ok === false
        ? payload.error
        : {
            code: "DCX_APP_ACCOUNT_SETTINGS_SAVE_FAILED",
            message: "We could not save the DCX account settings.",
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
