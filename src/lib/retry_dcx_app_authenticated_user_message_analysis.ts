/**
 * CONTEXT:
 * This file retries one authenticated DCX app message analysis pass.
 * It exists so failed message-analysis attempts can be retried from the Messages detail pane
 * without forcing the user to resend the underlying message.
 *
 * CONTRACT:
 * preconditions: The app knows the API base URL, the browser carries one authenticated DCX session cookie, and the selected message id belongs to the current user.
 * postconditions: Returns the canonical backend message-detail wrapper on success.
 * side_effects: Triggers one backend analysis retry for the selected message.
 * idempotent: No.
 * retry_safe: Yes.
 * blocking_behavior: Async fetch over HTTP.
 *
 * NARRATIVE:
 * WHY this exists: A stored message can exist even when the LLM analysis step failed under provider load. The trader needs one explicit retry action.
 * WHEN TO USE it: Use it when one failed message is selected in the authenticated Messages surface.
 * WHEN NOT TO USE it: Do not use it to create new messages or for admin cross-user replay tools.
 * WHAT CAN GO WRONG: The session can be missing, the message can be stale, or the backend/model provider can still be unhealthy.
 * WHAT COMES NEXT: Later retries can move to queued background jobs and richer retry-state UX.
 *
 * TESTS:
 * No frontend test harness exists in dcx_app yet.
 *
 * ERRORS:
 * - DCX_APP_MESSAGE_ANALYSIS_RETRY_FAILED: The backend returned a non-success wrapper or the fetch failed.
 *   suggested_action: Confirm the backend is healthy and retry the analysis in a moment.
 *   common_causes: Missing session cookie, stale message id, backend unavailable, transient model-provider failure.
 *   recovery_steps: Refresh the inbox, sign in again if needed, and retry once backend health is restored.
 *   retry_safe: Yes.
 *
 * CODE:
 */
import type { DcxAppAuthenticatedUserMessageDetail } from "./read_dcx_app_authenticated_user_message_detail"

type DcxAppMessageAnalysisRetrySuccessResponse = {
  ok: true
  data: DcxAppAuthenticatedUserMessageDetail
  context?: {
    surface?: string
    view?: string
    operation?: string
    identity_resolution_mode?: string
  }
}

type DcxAppMessageAnalysisRetryErrorResponse = {
  ok: false
  error: {
    code: string
    message: string
    suggested_action: string
  }
}

export async function retryDcxAppAuthenticatedUserMessageAnalysis(params: {
  apiBaseUrl: string
  messageId: number
}): Promise<DcxAppMessageAnalysisRetrySuccessResponse> {
  const retryUrl = new URL(`/users/me/messages/${params.messageId}/retry-analysis`, params.apiBaseUrl)

  const response = await fetch(retryUrl.toString(), {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
    },
  })

  const payload = (await response.json()) as
    | DcxAppMessageAnalysisRetrySuccessResponse
    | DcxAppMessageAnalysisRetryErrorResponse

  if (!response.ok || payload.ok !== true) {
    const errorPayload =
      payload && payload.ok === false
        ? payload.error
        : {
            code: "DCX_APP_MESSAGE_ANALYSIS_RETRY_FAILED",
            message: "We could not retry that LLM call.",
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
