/**
 * CONTEXT:
 * Deactivates one unused phone contact method for the authenticated DCX app user.
 * It exists so account cleanup can happen through the backend guardrails that protect
 * message and trade attribution history.
 */
import type { DcxAppAuthenticatedUserAccountSummary } from "../read_dcx_app_authenticated_user_account_summary"

type DcxAppAccountPhoneRemoveSuccessResponse = {
  ok: true
  data: DcxAppAuthenticatedUserAccountSummary
  context?: {
    surface?: string
    view?: string
    operation?: string
    identity_resolution_mode?: string
  }
}

type DcxAppAccountPhoneRemoveErrorResponse = {
  ok: false
  error: {
    code: string
    message: string
    suggested_action: string
  }
}

export async function removeDcxAppAuthenticatedUserPhoneContactMethod(params: {
  apiBaseUrl: string
  phoneContactMethodId: number
}): Promise<DcxAppAccountPhoneRemoveSuccessResponse> {
  const requestUrl = new URL("/users/me/account-phone/remove", params.apiBaseUrl)

  const response = await fetch(requestUrl.toString(), {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      phone_contact_method_id: params.phoneContactMethodId,
    }),
  })

  const payload = (await response.json()) as
    | DcxAppAccountPhoneRemoveSuccessResponse
    | DcxAppAccountPhoneRemoveErrorResponse

  if (!response.ok || payload.ok !== true) {
    const errorPayload =
      payload && payload.ok === false
        ? payload.error
        : {
            code: "DCX_APP_ACCOUNT_PHONE_REMOVE_FAILED",
            message: "We could not remove the phone number.",
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
