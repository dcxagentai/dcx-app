/**
 * CONTEXT:
 * Shared browser helpers for DCX app password challenge-token handoff.
 * They exist so the password-set page can safely read one fragment token, move it into session
 * storage, and keep it out of the visible URL after the first load.
 */

const DCX_PASSWORD_CHALLENGE_TOKEN_HASH_PREFIX = "#password_challenge_token="
const DCX_PASSWORD_CHALLENGE_TOKEN_STORAGE_KEY = "dcx_password_challenge_token"

export function captureDcxPasswordChallengeTokenFromLocationHash(): string | null {
  const currentHash = window.location.hash ?? ""
  if (!currentHash.startsWith(DCX_PASSWORD_CHALLENGE_TOKEN_HASH_PREFIX)) {
    return null
  }

  const rawToken = currentHash.slice(DCX_PASSWORD_CHALLENGE_TOKEN_HASH_PREFIX.length).trim()
  if (rawToken === "") {
    return null
  }

  window.sessionStorage.setItem(DCX_PASSWORD_CHALLENGE_TOKEN_STORAGE_KEY, rawToken)
  window.history.replaceState({}, "", `${window.location.pathname}${window.location.search}`)
  return rawToken
}

export function readStoredDcxPasswordChallengeToken(): string | null {
  const storedToken = window.sessionStorage.getItem(DCX_PASSWORD_CHALLENGE_TOKEN_STORAGE_KEY)
  return storedToken && storedToken.trim() !== "" ? storedToken.trim() : null
}

export function clearStoredDcxPasswordChallengeToken(): void {
  window.sessionStorage.removeItem(DCX_PASSWORD_CHALLENGE_TOKEN_STORAGE_KEY)
}
