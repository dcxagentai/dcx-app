/**
 * CONTEXT:
 * Language selection helpers for the DCX app frontend.
 * They let user-facing settings controls use the same flag-plus-language combobox
 * pattern as the account phone country picker without inventing ad hoc mappings.
 */
export type DcxAppLanguageComboboxOption = {
  value: string
  label: string
  subtitle: string
  searchLabel: string
  regionCode?: string
}

const DCX_APP_LANGUAGE_TO_REGION_CODE: Record<string, string> = {
  ar: "AE",
  de: "DE",
  en: "GB",
  es: "ES",
  fr: "FR",
  hi: "IN",
  id: "ID",
  pt: "BR",
  ru: "RU",
  tr: "TR",
  ur: "PK",
  vi: "VN",
  zh: "CN",
}

export function readDcxAppLanguageFlagRegionCode(languageCode: string): string {
  const normalizedLanguageCode = languageCode.trim().toLowerCase()
  const primaryLanguageCode = normalizedLanguageCode.split("-")[0] ?? normalizedLanguageCode

  return (
    DCX_APP_LANGUAGE_TO_REGION_CODE[normalizedLanguageCode] ??
    DCX_APP_LANGUAGE_TO_REGION_CODE[primaryLanguageCode] ??
    primaryLanguageCode.toUpperCase()
  )
}
