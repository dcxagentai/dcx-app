/**
 * CONTEXT:
 * This file creates one authenticated app-originated DCX message.
 * It exists so the Messages composer can submit one text message and receive the canonical
 * backend detail payload in the same roundtrip.
 *
 * CONTRACT:
 * preconditions: The app knows the API base URL, the browser carries one authenticated DCX session cookie, and the user has typed one message.
 * postconditions: Returns the canonical backend message-detail wrapper on success.
 * side_effects: Writes one contact message through the authenticated API boundary.
 * idempotent: No.
 * retry_safe: No.
 * blocking_behavior: Async fetch over HTTP.
 *
 * NARRATIVE:
 * WHY this exists: The first Messages slice needs a dedicated write contract instead of borrowing account settings patterns.
 * WHEN TO USE it: Use it when the authenticated user submits the text-only composer.
 * WHEN NOT TO USE it: Do not use it yet for image, audio, document, WhatsApp, or inbound email flows.
 * WHAT CAN GO WRONG: The message can be blank, the session can be missing, or one file can be unsupported or too large.
 * WHAT COMES NEXT: Later message composition can grow into richer multimodal uploads while keeping this same narrow browser contract.
 *
 * TESTS:
 * No frontend test harness exists in dcx_app yet.
 *
 * ERRORS:
 * - DCX_APP_MESSAGE_CREATE_FAILED: The backend returned a non-success wrapper or the fetch failed.
 *   suggested_action: Confirm the API is reachable, the session is valid, and the message has text.
 *   common_causes: Blank input, missing session cookie, backend unavailable.
 *   recovery_steps: Enter text, sign in again if needed, and retry after backend health is restored.
 *   retry_safe: No.
 *
 * CODE:
 */
import type { DcxAppAuthenticatedUserMessageDetail } from "./read_dcx_app_authenticated_user_message_detail"

type DcxAppMessageCreateSuccessResponse = {
  ok: true
  data: DcxAppAuthenticatedUserMessageDetail
  context?: {
    surface?: string
    view?: string
    operation?: string
    identity_resolution_mode?: string
  }
}

type DcxAppMessageCreateErrorResponse = {
  ok: false
  error: {
    code: string
    message: string
    suggested_action: string
  }
}

export async function createDcxAppAuthenticatedUserContactMessage(params: {
  apiBaseUrl: string
  messageText: string
  messageFiles?: File[]
}): Promise<DcxAppMessageCreateSuccessResponse> {
  const createUrl = new URL("/users/me/messages", params.apiBaseUrl)
  const formData = new FormData()
  formData.append("message_text", params.messageText)
  for (const messageFile of params.messageFiles ?? []) {
    formData.append("message_files", messageFile)
  }

  const response = await fetch(createUrl.toString(), {
    method: "POST",
    credentials: "include",
    body: formData,
  })

  const payload = (await response.json()) as
    | DcxAppMessageCreateSuccessResponse
    | DcxAppMessageCreateErrorResponse

  if (!response.ok || payload.ok !== true) {
    const errorPayload =
      payload && payload.ok === false
        ? payload.error
        : {
            code: "DCX_APP_MESSAGE_CREATE_FAILED",
            message: "We could not send that message.",
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
