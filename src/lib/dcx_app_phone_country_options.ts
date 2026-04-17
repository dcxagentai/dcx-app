/**
 * CONTEXT:
 * Shared phone-country utility helpers for the DCX app.
 * They exist so country bundles fetched from the backend can drive phone-entry UIs while the app
 * still keeps one clean place for E.164 composition and display splitting logic.
 */

export type DcxAppPhoneCountryOption = {
  countryId: number
  regionCode: string
  displayName: string
  flagAssetKey: string
  callingCode: string
  isPrimaryCallingCode: boolean
  countrySortOrder: number
  callingCodeSortOrder: number
}

export function readDcxAppPhoneCountryOptionByRegionCode(
  countryOptions: DcxAppPhoneCountryOption[],
  regionCode: string,
): DcxAppPhoneCountryOption | null {
  return countryOptions.find((option) => option.regionCode === regionCode) ?? null
}

export function buildDcxAppPhoneE164FromCountrySelection(params: {
  countryOption: DcxAppPhoneCountryOption
  nationalNumberInput: string
}): string {
  const normalizedNationalNumber = params.nationalNumberInput.replace(/[^0-9]/g, "")
  return `${params.countryOption.callingCode}${normalizedNationalNumber}`
}

export function splitDcxAppPhoneE164ForDisplay(params: {
  phoneE164: string
  countryOptions: DcxAppPhoneCountryOption[]
}): {
  countryOption: DcxAppPhoneCountryOption | null
  callingCode: string | null
  nationalNumber: string
  isAmbiguousCallingCode: boolean
} {
  const normalizedPhoneE164 = params.phoneE164.trim()
  const matchingOptions = params.countryOptions
    .filter((option) => normalizedPhoneE164.startsWith(option.callingCode))
    .sort((left, right) => right.callingCode.length - left.callingCode.length)

  const bestOption = matchingOptions[0] ?? null
  if (!bestOption) {
    return {
      countryOption: null,
      callingCode: null,
      nationalNumber: normalizedPhoneE164,
      isAmbiguousCallingCode: false,
    }
  }

  const longestCallingCodeMatches = matchingOptions.filter(
    (option) => option.callingCode === bestOption.callingCode,
  )

  return {
    countryOption: longestCallingCodeMatches.length === 1 ? bestOption : null,
    callingCode: bestOption.callingCode,
    nationalNumber: normalizedPhoneE164.slice(bestOption.callingCode.length),
    isAmbiguousCallingCode: longestCallingCodeMatches.length > 1,
  }
}
