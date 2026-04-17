/**
 * CONTEXT:
 * Shared browser helpers for DCX app WhatsApp phone-link token handoff.
 * They exist so the verification page can safely read one fragment token, move it into session
 * storage, and keep it out of the visible URL after the first load.
 */

const DCX_WHATSAPP_PHONE_LINK_TOKEN_HASH_PREFIX = "#whatsapp_phone_link_token="
const DCX_WHATSAPP_PHONE_LINK_TOKEN_STORAGE_KEY = "dcx_whatsapp_phone_link_token"

export function captureDcxWhatsappPhoneLinkTokenFromLocationHash(): string | null {
  const currentHash = window.location.hash ?? ""
  if (!currentHash.startsWith(DCX_WHATSAPP_PHONE_LINK_TOKEN_HASH_PREFIX)) {
    return null
  }

  const rawToken = currentHash.slice(DCX_WHATSAPP_PHONE_LINK_TOKEN_HASH_PREFIX.length).trim()
  if (rawToken === "") {
    return null
  }

  window.sessionStorage.setItem(DCX_WHATSAPP_PHONE_LINK_TOKEN_STORAGE_KEY, rawToken)
  window.history.replaceState({}, "", `${window.location.pathname}${window.location.search}`)
  return rawToken
}

export function readStoredDcxWhatsappPhoneLinkToken(): string | null {
  const storedToken = window.sessionStorage.getItem(DCX_WHATSAPP_PHONE_LINK_TOKEN_STORAGE_KEY)
  return storedToken && storedToken.trim() !== "" ? storedToken.trim() : null
}

export function clearStoredDcxWhatsappPhoneLinkToken(): void {
  window.sessionStorage.removeItem(DCX_WHATSAPP_PHONE_LINK_TOKEN_STORAGE_KEY)
}
