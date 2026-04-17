/**
 * CONTEXT:
 * This file reads the public countries reference bundle for the DCX app.
 * It exists so global country-aware UX controls can use one backend-backed source of truth
 * rather than duplicating country lists in each frontend.
 *
 * CONTRACT:
 * preconditions: The dcx_app frontend knows the backend base URL.
 * postconditions: Returns the canonical backend countries reference bundle on success.
 * side_effects: None.
 * idempotent: Yes.
 * retry_safe: Yes.
 * blocking_behavior: Async fetch over HTTP.
 *
 * NARRATIVE:
 * WHY this exists: Global UX now needs a reusable countries contract for phone, trade, and later
 * geography-aware surfaces.
 * WHEN TO USE it: Use it from frontend country pickers and reference-data reads.
 * WHEN NOT TO USE it: Do not use it for user-specific account writes or auth checks.
 * WHAT CAN GO WRONG: The backend can fail, the route can be unavailable, or the network can fail.
 * WHAT COMES NEXT: More global surfaces can reuse the same countries bundle instead of re-embedding metadata.
 *
 * TESTS:
 * No frontend test harness exists in dcx_app yet.
 *
 * ERRORS:
 * - DCX_APP_REFERENCE_COUNTRIES_READ_FAILED: The backend returned a non-success wrapper or the fetch failed.
 *   suggested_action: Retry after confirming the API is reachable.
 *   common_causes: Backend unavailable, network error, route not deployed yet.
 *   recovery_steps: Confirm backend health, then retry.
 *   retry_safe: Yes.
 *
 * CODE:
 */
import type { DcxAppPhoneCountryOption } from "./dcx_app_phone_country_options"

type DcxAppReferenceCountriesSuccessResponse = {
  ok: true
  data: {
    countries: Array<{
      id: number
      country_code_alpha2: string
      default_display_name: string
      flag_asset_key: string
      sort_order: number
      calling_codes: Array<{
        id: number
        calling_code: string
        is_primary: boolean
        sort_order: number
      }>
    }>
    total_country_count: number
  }
  context?: {
    surface?: string
    view?: string
  }
}

type DcxAppReferenceCountriesErrorResponse = {
  ok: false
  error: {
    code: string
    message: string
    suggested_action: string
  }
}

export async function readDcxAppReferenceCountriesBundle(params: {
  apiBaseUrl: string
}): Promise<DcxAppReferenceCountriesSuccessResponse> {
  const countriesBundleUrl = new URL("/public/reference/countries-bundle", params.apiBaseUrl)

  const response = await fetch(countriesBundleUrl.toString(), {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
  })

  const payload = (await response.json()) as
    | DcxAppReferenceCountriesSuccessResponse
    | DcxAppReferenceCountriesErrorResponse

  if (!response.ok || payload.ok !== true) {
    const errorPayload =
      payload && payload.ok === false
        ? payload.error
        : {
            code: "DCX_APP_REFERENCE_COUNTRIES_READ_FAILED",
            message: "We could not load the countries reference bundle.",
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

export function readDcxAppPhoneCountryOptionsFromCountriesBundle(
  countriesBundle: DcxAppReferenceCountriesSuccessResponse["data"],
): DcxAppPhoneCountryOption[] {
  return countriesBundle.countries.flatMap((country) =>
    country.calling_codes.map((callingCodeRow) => ({
      countryId: country.id,
      regionCode: country.country_code_alpha2,
      displayName: country.default_display_name,
      flagAssetKey: country.flag_asset_key,
      callingCode: callingCodeRow.calling_code,
      isPrimaryCallingCode: callingCodeRow.is_primary,
      countrySortOrder: country.sort_order,
      callingCodeSortOrder: callingCodeRow.sort_order,
    })),
  )
}
