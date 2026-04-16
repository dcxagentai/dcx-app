/**
 * CONTEXT:
 * Shared DCX app password setup/reset page.
 * It exists so signup-completion and forgotten-password reset can both land on one token-driven
 * password form before redirecting back to the shared login page.
 */
import { type FormEvent, useEffect, useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { DcxAppPasswordInputWithVisibilityToggle } from "@/components/dcx_app_password_input_with_visibility_toggle"
import dcxLogo from "@prompteoai/dcx-branding/assets/dcx_logo.png"
import {
  captureDcxPasswordChallengeTokenFromLocationHash,
  clearStoredDcxPasswordChallengeToken,
  readStoredDcxPasswordChallengeToken,
} from "@/lib/dcx_app_password_challenge_flow"

type Props = {
  isPending: boolean
  isSuccess: boolean
  errorMessage: string | null
  ux: Record<string, string>
  onSubmit: (token: string, password: string, confirmPassword: string) => void
  onBackToLogin: () => void
}

export function DcxAppAuthPasswordSetPage(props: Props) {
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [passwordChallengeToken, setPasswordChallengeToken] = useState<string | null>(null)

  useEffect(() => {
    const capturedToken =
      captureDcxPasswordChallengeTokenFromLocationHash() ?? readStoredDcxPasswordChallengeToken()
    setPasswordChallengeToken(capturedToken)
  }, [])

  useEffect(() => {
    if (props.isSuccess) {
      clearStoredDcxPasswordChallengeToken()
    }
  }, [props.isSuccess])

  const currentMode = useMemo(() => {
    const searchParams = new URLSearchParams(window.location.search)
    return searchParams.get("mode") === "password_reset" ? "password_reset" : "password_setup"
  }, [])

  const localValidationError = useMemo(() => {
    if (password === "" && confirmPassword === "") {
      return null
    }

    if (password.length < 12) {
      return props.ux.validation_min_length
    }

    if (password !== confirmPassword) {
      return props.ux.validation_confirmation_mismatch
    }

    return null
  }, [
    confirmPassword,
    password,
    props.ux.validation_confirmation_mismatch,
    props.ux.validation_min_length,
  ])

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!passwordChallengeToken || localValidationError) {
      return
    }

    props.onSubmit(passwordChallengeToken, password, confirmPassword)
  }

  const title =
    currentMode === "password_reset" ? props.ux.hero_title_reset : props.ux.hero_title_setup
  const body =
    currentMode === "password_reset" ? props.ux.hero_body_reset : props.ux.hero_body_setup

  return (
    <main className="min-h-screen bg-[#f4f6f8] px-4 py-6 text-slate-950 sm:px-6 lg:px-8">
      <section className="mx-auto flex min-h-[calc(100vh-3rem)] max-w-xl items-center justify-center">
        <article className="w-full border border-black/6 bg-[#0f172a] px-6 py-8 text-white shadow-[0_20px_60px_-48px_rgba(15,23,42,0.45)] sm:px-8">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <img src={dcxLogo} alt="DCX logo" className="h-11 w-11 bg-[#fbfaf7] p-1.5" />
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-300">
                {props.ux.surface_label}
              </p>
            </div>
            <h1 className="text-2xl font-semibold tracking-tight text-white">{props.ux.page_title}</h1>
          </div>

          <div className="mt-8 space-y-2">
            <h2 className="text-2xl font-semibold tracking-tight text-white">{title}</h2>
            <p className="text-sm leading-6 text-slate-300">{body}</p>
          </div>

          <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
            <label className="block space-y-2">
              <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                {props.ux.field_password}
              </span>
              <DcxAppPasswordInputWithVisibilityToggle
                autoComplete="new-password"
                value={password}
                onChange={setPassword}
                placeholder={props.ux.field_password_placeholder}
                disabled={props.isPending || props.isSuccess || !passwordChallengeToken}
              />
            </label>

            <label className="block space-y-2">
              <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                {props.ux.field_confirm_password}
              </span>
              <DcxAppPasswordInputWithVisibilityToggle
                autoComplete="new-password"
                value={confirmPassword}
                onChange={setConfirmPassword}
                placeholder={props.ux.field_confirm_password_placeholder}
                disabled={props.isPending || props.isSuccess || !passwordChallengeToken}
              />
            </label>

            {!passwordChallengeToken ? (
              <p className="text-sm leading-6 text-red-300">{props.ux.token_missing_error}</p>
            ) : props.errorMessage ? (
              <p className="text-sm leading-6 text-red-300">{props.errorMessage}</p>
            ) : props.isSuccess ? (
              <p className="text-sm leading-6 text-emerald-300">{props.ux.success_message}</p>
            ) : localValidationError ? (
              <p className="text-sm leading-6 text-amber-300">{localValidationError}</p>
            ) : null}

            <div className="flex flex-col gap-3 pt-1">
              <Button
                type="submit"
                className="h-11 w-full bg-white text-slate-950 hover:bg-slate-100"
                disabled={
                  props.isPending ||
                  props.isSuccess ||
                  !passwordChallengeToken ||
                  password === "" ||
                  confirmPassword === "" ||
                  localValidationError !== null
                }
              >
                {props.isPending ? props.ux.submit_pending : props.ux.submit_idle}
              </Button>
              <Button
                type="button"
                className="h-11 w-full border border-white/15 bg-white/5 text-white hover:bg-white/10"
                onClick={props.onBackToLogin}
              >
                {props.ux.back_to_login_button}
              </Button>
            </div>
          </form>
        </article>
      </section>
    </main>
  )
}
