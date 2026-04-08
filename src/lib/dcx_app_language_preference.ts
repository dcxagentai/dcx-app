/**
 * CONTEXT:
 * Shared language-preference helpers for the DCX app browser surface.
 * They exist so logged-in account pages, logged-out auth pages, and emailed password links can all
 * converge on one consistent language choice without requiring a session first.
 */

const DCX_APP_LANGUAGE_CODE_STORAGE_KEY = "dcx_app_language_code"

export function normalizeDcxAppLanguageCode(candidateLanguageCode: string | null | undefined): string {
  const normalizedLanguageCode = candidateLanguageCode?.trim().toLowerCase() ?? ""
  return normalizedLanguageCode === "es" ||
    normalizedLanguageCode === "fr" ||
    normalizedLanguageCode === "de"
    ? normalizedLanguageCode
    : "en"
}

export function readStoredDcxAppLanguageCode(): string {
  return normalizeDcxAppLanguageCode(window.localStorage.getItem(DCX_APP_LANGUAGE_CODE_STORAGE_KEY))
}

export function persistDcxAppLanguageCode(languageCode: string): void {
  window.localStorage.setItem(
    DCX_APP_LANGUAGE_CODE_STORAGE_KEY,
    normalizeDcxAppLanguageCode(languageCode),
  )
}

export function readDcxAppLanguageCodeFromCurrentSearch(): string | null {
  const currentSearchParams = new URLSearchParams(window.location.search)
  const explicitLanguageCode = currentSearchParams.get("language_code")
  if (!explicitLanguageCode) {
    return null
  }

  return normalizeDcxAppLanguageCode(explicitLanguageCode)
}

export function readResolvedDcxAppLanguageCode(): string {
  return readDcxAppLanguageCodeFromCurrentSearch() ?? readStoredDcxAppLanguageCode()
}

export function buildDcxAppPathWithLanguageCode(pathname: string, languageCode: string): string {
  const normalizedLanguageCode = normalizeDcxAppLanguageCode(languageCode)
  return `${pathname}?language_code=${normalizedLanguageCode}`
}

export function readDcxLocaleForLanguageCode(languageCode: string): string {
  const normalizedLanguageCode = normalizeDcxAppLanguageCode(languageCode)
  if (normalizedLanguageCode === "es") {
    return "es-ES"
  }

  if (normalizedLanguageCode === "fr") {
    return "fr-FR"
  }

  if (normalizedLanguageCode === "de") {
    return "de-DE"
  }

  return "en-GB"
}
