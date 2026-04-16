/**
 * CONTEXT:
 * Verifies one WhatsApp phone-link OTP for the authenticated DCX app user.
 * It exists so the account page can promote one pending WhatsApp phone into the
 * confirmed account profile only after the user proves phone possession.
 */
import type { DcxAppAuthenticatedUserAccountSummary } from "../read_dcx_app_authenticated_user_account_summary"

type DcxAppAccountPhoneVerifyWhatsappOtpSuccessResponse = {
  ok: true
  data: DcxAppAuthenticatedUserAccountSummary
  context?: {
    surface?: string
    view?: string
    operation?: string
    identity_resolution_mode?: string
  }
}

type DcxAppAccountPhoneVerifyWhatsappOtpErrorResponse = {
  ok: false
  error: {
    code: string
    message: string
    suggested_action: string
  }
}

export async function verifyDcxAppAuthenticatedUserWhatsappPhoneLinkOtp(params: {
  apiBaseUrl: string
  otpCode: string
}): Promise<DcxAppAccountPhoneVerifyWhatsappOtpSuccessResponse> {
  const requestUrl = new URL("/users/me/account-phone/verify-whatsapp-otp", params.apiBaseUrl)

  const response = await fetch(requestUrl.toString(), {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      otp_code: params.otpCode,
    }),
  })

  const payload = (await response.json()) as
    | DcxAppAccountPhoneVerifyWhatsappOtpSuccessResponse
    | DcxAppAccountPhoneVerifyWhatsappOtpErrorResponse

  if (!response.ok || payload.ok !== true) {
    const errorPayload =
      payload && payload.ok === false
        ? payload.error
        : {
            code: "DCX_APP_ACCOUNT_PHONE_WHATSAPP_VERIFY_FAILED",
            message: "We could not verify the WhatsApp code.",
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
