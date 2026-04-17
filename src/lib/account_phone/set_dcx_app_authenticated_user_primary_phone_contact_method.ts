/**
 * CONTEXT:
 * Sets one verified phone contact method as the authenticated DCX app user's primary phone.
 * It exists so primary-phone selection is an explicit account-management action rather than an
 * automatic side effect of verification.
 */
import type { DcxAppAuthenticatedUserAccountSummary } from "../read_dcx_app_authenticated_user_account_summary"

type DcxAppAccountPhoneSetPrimarySuccessResponse = {
  ok: true
  data: DcxAppAuthenticatedUserAccountSummary
  context?: {
    surface?: string
    view?: string
    operation?: string
    identity_resolution_mode?: string
  }
}

type DcxAppAccountPhoneSetPrimaryErrorResponse = {
  ok: false
  error: {
    code: string
    message: string
    suggested_action: string
  }
}

export async function setDcxAppAuthenticatedUserPrimaryPhoneContactMethod(params: {
  apiBaseUrl: string
  phoneContactMethodId: number
}): Promise<DcxAppAccountPhoneSetPrimarySuccessResponse> {
  const requestUrl = new URL("/users/me/account-phone/set-primary", params.apiBaseUrl)

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
    | DcxAppAccountPhoneSetPrimarySuccessResponse
    | DcxAppAccountPhoneSetPrimaryErrorResponse

  if (!response.ok || payload.ok !== true) {
    const errorPayload =
      payload && payload.ok === false
        ? payload.error
        : {
            code: "DCX_APP_ACCOUNT_PHONE_PRIMARY_SET_FAILED",
            message: "We could not update the primary phone.",
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
