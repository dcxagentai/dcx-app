/**
 * CONTEXT:
 * Starts or refreshes one WhatsApp phone-link verification flow for the authenticated DCX app user.
 * It exists so the account page can explicitly request a secure verification message without mixing
 * low-risk autosave settings behavior into higher-risk phone ownership checks.
 */
import type { DcxAppAuthenticatedUserAccountSummary } from "../read_dcx_app_authenticated_user_account_summary"

type DcxAppAccountPhoneRequestWhatsappLinkSuccessResponse = {
  ok: true
  data: DcxAppAuthenticatedUserAccountSummary
  context?: {
    surface?: string
    view?: string
    operation?: string
    identity_resolution_mode?: string
    local_debug_verification_link_url?: string | null
  }
}

type DcxAppAccountPhoneRequestWhatsappLinkErrorResponse = {
  ok: false
  error: {
    code: string
    message: string
    suggested_action: string
  }
}

export async function requestDcxAppAuthenticatedUserWhatsappPhoneLink(params: {
  apiBaseUrl: string
  phoneE164: string
  languageCode: string
  confirmationPurpose?: "contact_verification" | "sender_reconfirmation"
  forceSend?: boolean
}): Promise<DcxAppAccountPhoneRequestWhatsappLinkSuccessResponse> {
  const requestUrl = new URL("/users/me/account-phone/request-whatsapp-verification-link", params.apiBaseUrl)

  const response = await fetch(requestUrl.toString(), {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      phone_e164: params.phoneE164,
      language_code: params.languageCode,
      confirmation_purpose: params.confirmationPurpose ?? "contact_verification",
      force_send: params.forceSend === true,
    }),
  })

  const payload = (await response.json()) as
    | DcxAppAccountPhoneRequestWhatsappLinkSuccessResponse
    | DcxAppAccountPhoneRequestWhatsappLinkErrorResponse

  if (!response.ok || payload.ok !== true) {
    const errorPayload =
      payload && payload.ok === false
        ? payload.error
        : {
            code: "DCX_APP_ACCOUNT_PHONE_WHATSAPP_REQUEST_FAILED",
            message: "We could not start WhatsApp phone verification.",
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
