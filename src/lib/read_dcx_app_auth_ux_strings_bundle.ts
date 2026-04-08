/**
 * CONTEXT:
 * Browser request helper for the localized DCX app auth UX-string bundle.
 * It exists so login, password-reset-request, and password-set pages can all render through the
 * shared multilingual backend UX-string system instead of hardcoded English copy.
 */

export type DcxAppAuthUxStringsBundle = {
  language_code: string
  common: Record<string, string>
  login_page: Record<string, string>
  password_reset_request_page: Record<string, string>
  password_set_page: Record<string, string>
}

type DcxAppAuthUxStringsBundleSuccessResponse = {
  ok: true
  data: DcxAppAuthUxStringsBundle
}

type DcxAppAuthUxStringsBundleErrorResponse = {
  ok: false
  error: {
    code: string
    message: string
    suggested_action: string
  }
}

export async function readDcxAppAuthUxStringsBundle(props: {
  apiBaseUrl: string
  languageCode: string
}): Promise<DcxAppAuthUxStringsBundleSuccessResponse> {
  const bundleUrl = new URL("/auth/app-ux-strings-bundle", props.apiBaseUrl)
  bundleUrl.searchParams.set("language_code", props.languageCode)

  const response = await fetch(bundleUrl.toString(), {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
  })

  const payload = (await response.json()) as
    | DcxAppAuthUxStringsBundleSuccessResponse
    | DcxAppAuthUxStringsBundleErrorResponse

  if (!response.ok || payload.ok !== true) {
    const errorPayload =
      payload && payload.ok === false
        ? payload.error
        : {
            code: "DCX_APP_AUTH_UX_STRINGS_READ_FAILED",
            message: "We could not load the app auth copy.",
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
