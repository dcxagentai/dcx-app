/**
 * CONTEXT:
 * Shared language and auth-route helpers for the DCX app browser surface.
 * They exist so unauthenticated auth pages can use explicit path-based language routing such as
 * `/fr/t/login`, while authenticated surfaces can still format dates and route handoffs consistently.
 */

const DCX_APP_SUPPORTED_LANGUAGE_CODES = ["en", "es", "fr", "de"] as const

type DcxAppSupportedLanguageCode = (typeof DCX_APP_SUPPORTED_LANGUAGE_CODES)[number]
type DcxAppAuthRoutePath =
  | "/login"
  | "/password/reset/request"
  | "/password/set"
  | "/verify-whatsapp-phone"

export function normalizeDcxAppLanguageCode(candidateLanguageCode: string | null | undefined): string {
  const normalizedLanguageCode = candidateLanguageCode?.trim().toLowerCase() ?? ""
  return DCX_APP_SUPPORTED_LANGUAGE_CODES.includes(
    normalizedLanguageCode as DcxAppSupportedLanguageCode,
  )
    ? normalizedLanguageCode
    : "en"
}

export function readDcxAppLanguageCodeFromCurrentPathname(pathname: string = window.location.pathname): string | null {
  const pathnameSegments = pathname.split("/").filter((segment) => segment !== "")
  if (pathnameSegments.length < 3 || pathnameSegments[1] !== "t") {
    return null
  }

  return normalizeDcxAppLanguageCode(pathnameSegments[0])
}

export function readDcxAppLanguageCodeFromCurrentSearch(): string | null {
  const currentSearchParams = new URLSearchParams(window.location.search)
  const explicitLanguageCode = currentSearchParams.get("language_code")
  if (!explicitLanguageCode) {
    return null
  }

  return normalizeDcxAppLanguageCode(explicitLanguageCode)
}

export function readResolvedDcxAppLanguageCode(pathname: string = window.location.pathname): string {
  return (
    readDcxAppLanguageCodeFromCurrentPathname(pathname) ??
    readDcxAppLanguageCodeFromCurrentSearch() ??
    "en"
  )
}

export function readDcxAppAuthRoutePath(pathname: string = window.location.pathname): DcxAppAuthRoutePath | null {
  const pathnameSegments = pathname.split("/").filter((segment) => segment !== "")

  if (
    pathnameSegments.length === 3 &&
    DCX_APP_SUPPORTED_LANGUAGE_CODES.includes(pathnameSegments[0] as DcxAppSupportedLanguageCode) &&
    pathnameSegments[1] === "t" &&
    pathnameSegments[2] === "login"
  ) {
    return "/login"
  }

  if (
    pathnameSegments.length === 5 &&
    DCX_APP_SUPPORTED_LANGUAGE_CODES.includes(pathnameSegments[0] as DcxAppSupportedLanguageCode) &&
    pathnameSegments[1] === "t" &&
    pathnameSegments[2] === "password" &&
    pathnameSegments[3] === "reset" &&
    pathnameSegments[4] === "request"
  ) {
    return "/password/reset/request"
  }

  if (
    pathnameSegments.length === 4 &&
    DCX_APP_SUPPORTED_LANGUAGE_CODES.includes(pathnameSegments[0] as DcxAppSupportedLanguageCode) &&
    pathnameSegments[1] === "t" &&
    pathnameSegments[2] === "password" &&
    pathnameSegments[3] === "set"
  ) {
    return "/password/set"
  }

  if (
    pathnameSegments.length === 3 &&
    DCX_APP_SUPPORTED_LANGUAGE_CODES.includes(pathnameSegments[0] as DcxAppSupportedLanguageCode) &&
    pathnameSegments[1] === "t" &&
    pathnameSegments[2] === "verify-whatsapp-phone"
  ) {
    return "/verify-whatsapp-phone"
  }

  if (
    pathname === "/login" ||
    pathname === "/password/reset/request" ||
    pathname === "/password/set" ||
    pathname === "/verify-whatsapp-phone"
  ) {
    return pathname
  }

  return null
}

export function buildDcxAppPathWithLanguageCode(pathname: DcxAppAuthRoutePath, languageCode: string): string {
  const normalizedLanguageCode = normalizeDcxAppLanguageCode(languageCode)

  if (pathname === "/login") {
    return `/${normalizedLanguageCode}/t/login`
  }

  if (pathname === "/password/reset/request") {
    return `/${normalizedLanguageCode}/t/password/reset/request`
  }

  if (pathname === "/verify-whatsapp-phone") {
    return `/${normalizedLanguageCode}/t/verify-whatsapp-phone`
  }

  return `/${normalizedLanguageCode}/t/password/set`
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
