/**
 * CONTEXT:
 * Completes one WhatsApp phone-link verification flow from the fragment token captured by the DCX app.
 * It exists so the verification page can finish phone linking without requiring the user to type a code.
 */

type DcxAppCompleteWhatsappPhoneLinkSuccessResponse = {
  ok: true
  data: {
    status: string
    phone_e164: string
    verified_at_ts_ms: number
  }
  context?: {
    surface?: string
    view?: string
  }
}

type DcxAppCompleteWhatsappPhoneLinkErrorResponse = {
  ok: false
  error: {
    code: string
    message: string
    suggested_action: string
  }
}

export async function completeDcxAppWhatsappPhoneLinkFromToken(params: {
  apiBaseUrl: string
  whatsappPhoneLinkToken: string
}): Promise<DcxAppCompleteWhatsappPhoneLinkSuccessResponse> {
  const requestUrl = new URL("/users/account-phone/verify-whatsapp-link", params.apiBaseUrl)

  const response = await fetch(requestUrl.toString(), {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      whatsapp_phone_link_token: params.whatsappPhoneLinkToken,
    }),
  })

  const payload = (await response.json()) as
    | DcxAppCompleteWhatsappPhoneLinkSuccessResponse
    | DcxAppCompleteWhatsappPhoneLinkErrorResponse

  if (!response.ok || payload.ok !== true) {
    const errorPayload =
      payload && payload.ok === false
        ? payload.error
        : {
            code: "DCX_APP_WHATSAPP_PHONE_LINK_VERIFY_FAILED",
            message: "We could not verify the WhatsApp phone link.",
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
