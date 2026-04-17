/**
 * CONTEXT:
 * Shared DCX app page for completing a WhatsApp phone-link verification from a secure URL fragment token.
 * It exists so a Meta template button can land on the app domain, capture the token safely, and
 * finish the verification through the API before redirecting the user onward.
 */
import { useEffect, useRef, useState } from "react"

import { Button } from "@/components/ui/button"
import dcxLogo from "@prompteoai/dcx-branding/assets/dcx_logo.png"
import { completeDcxAppWhatsappPhoneLinkFromToken } from "@/lib/account_phone/complete_dcx_app_whatsapp_phone_link_from_token"
import {
  captureDcxWhatsappPhoneLinkTokenFromLocationHash,
  clearStoredDcxWhatsappPhoneLinkToken,
  readStoredDcxWhatsappPhoneLinkToken,
} from "@/lib/dcx_app_whatsapp_phone_link_flow"
import { buildDcxAppPathWithLanguageCode } from "@/lib/dcx_app_language_preference"

type Props = {
  apiBaseUrl: string
  languageCode: string
  hasAuthenticatedSession: boolean
}

export function DcxAppWhatsappPhoneVerifyPage(props: Props) {
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading")
  const [message, setMessage] = useState("Verifying WhatsApp phone link...")
  const [suggestedAction, setSuggestedAction] = useState<string | null>(null)
  const verificationAttemptStartedRef = useRef(false)

  useEffect(() => {
    if (verificationAttemptStartedRef.current) {
      return
    }
    verificationAttemptStartedRef.current = true

    const capturedToken =
      captureDcxWhatsappPhoneLinkTokenFromLocationHash() ?? readStoredDcxWhatsappPhoneLinkToken()

    if (!capturedToken) {
      setStatus("error")
      setMessage("This WhatsApp verification link is missing or has already been cleared.")
      setSuggestedAction("Open the newest WhatsApp verification message or request another link.")
      return
    }

    let isActive = true
    void completeDcxAppWhatsappPhoneLinkFromToken({
      apiBaseUrl: props.apiBaseUrl,
      whatsappPhoneLinkToken: capturedToken,
    })
      .then(() => {
        if (!isActive) {
          return
        }
        clearStoredDcxWhatsappPhoneLinkToken()
        setStatus("success")
        setMessage("Phone verified. Your DCX WhatsApp number is now linked.")
        setSuggestedAction(null)

        const nextPath = props.hasAuthenticatedSession
          ? "/me/account"
          : buildDcxAppPathWithLanguageCode("/login", props.languageCode)
        window.setTimeout(() => {
          window.location.replace(nextPath)
        }, 900)
      })
      .catch((error: Error & { suggested_action?: string; code?: string }) => {
        if (!isActive) {
          return
        }
        if (
          error.code === "API_DCX_WHATSAPP_PHONE_LINK_TOKEN_INVALID"
          && props.hasAuthenticatedSession
        ) {
          setStatus("success")
          setMessage("This WhatsApp phone is already verified for your DCX account.")
          setSuggestedAction(null)
          window.setTimeout(() => {
            window.location.replace("/me/account")
          }, 900)
          return
        }
        setStatus("error")
        setMessage(error.message)
        setSuggestedAction(
          error.suggested_action ?? "Request another WhatsApp verification link and retry.",
        )
      })

    return () => {
      isActive = false
    }
  }, [props.apiBaseUrl, props.hasAuthenticatedSession, props.languageCode])

  return (
    <main className="min-h-screen bg-[#f4f6f8] px-4 py-6 text-slate-950 sm:px-6 lg:px-8">
      <section className="mx-auto flex min-h-[calc(100vh-3rem)] max-w-xl items-center justify-center">
        <article className="w-full border border-black/6 bg-[#0f172a] px-6 py-8 text-white shadow-[0_20px_60px_-48px_rgba(15,23,42,0.45)] sm:px-8">
          <div className="flex items-center gap-4">
            <img src={dcxLogo} alt="DCX logo" className="h-11 w-11 bg-[#fbfaf7] p-1.5" />
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-300">
              DCX App
            </p>
          </div>

          <div className="mt-8 space-y-2">
            <h1 className="text-2xl font-semibold tracking-tight text-white">
              Verify WhatsApp phone
            </h1>
            <p
              className={[
                "text-sm leading-6",
                status === "success" ? "text-emerald-300" : "text-slate-300",
              ].join(" ")}
            >
              {message}
            </p>
            {suggestedAction ? <p className="text-sm leading-6 text-slate-400">{suggestedAction}</p> : null}
          </div>

          <div className="mt-8">
            {status === "loading" ? (
              <p className="text-sm text-slate-300">Please wait while we confirm this phone number.</p>
            ) : (
              <Button
                type="button"
                className="h-11 w-full border border-white/15 bg-white/5 text-white hover:bg-white/10"
                onClick={() => {
                  const nextPath = props.hasAuthenticatedSession
                    ? "/me/account"
                    : buildDcxAppPathWithLanguageCode("/login", props.languageCode)
                  window.location.replace(nextPath)
                }}
              >
                {props.hasAuthenticatedSession ? "Back to account" : "Back to sign in"}
              </Button>
            )}
          </div>
        </article>
      </section>
    </main>
  )
}
