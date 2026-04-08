/**
 * CONTEXT:
 * Shared DCX app password setup/reset page.
 * It exists so signup-completion and forgotten-password reset can both land on one token-driven
 * password form before redirecting back to the shared login page.
 */
import { type FormEvent, useEffect, useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
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
      <section className="mx-auto flex min-h-[80vh] max-w-5xl items-center">
        <div className="grid w-full gap-6 lg:grid-cols-[1.15fr_0.85fr]">
          <article className="rounded-[1.75rem] border border-black/6 bg-white px-6 py-8 shadow-[0_20px_60px_-48px_rgba(15,23,42,0.45)] sm:px-8">
            <div className="flex items-center gap-4">
              <img src={dcxLogo} alt="DCX logo" className="h-11 w-11 rounded-xl bg-[#fbfaf7] p-1.5" />
              <div className="space-y-1">
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
                  {props.ux.surface_label}
                </p>
                <h1 className="text-3xl font-semibold tracking-tight text-slate-950">
                  {props.ux.page_title}
                </h1>
              </div>
            </div>

            <div className="mt-10 max-w-xl space-y-4">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                {props.ux.hero_eyebrow}
              </p>
              <h2 className="text-4xl font-semibold tracking-tight text-slate-950">
                {title}
              </h2>
              <p className="max-w-lg text-base leading-7 text-slate-600">
                {body}
              </p>
            </div>
          </article>

          <article className="rounded-[1.75rem] border border-black/6 bg-[#0f172a] px-6 py-8 text-white shadow-[0_20px_60px_-48px_rgba(15,23,42,0.45)] sm:px-8">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">
              {props.ux.rule_eyebrow}
            </p>
            <h2 className="mt-3 text-2xl font-semibold tracking-tight">
              {props.ux.rule_title}
            </h2>
            <p className="mt-3 text-sm leading-6 text-slate-300">
              {props.ux.rule_body}
            </p>

            <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
              <label className="block space-y-2">
                <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                  {props.ux.field_password}
                </span>
                <input
                  type="password"
                  autoComplete="new-password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="h-11 w-full rounded-2xl border border-white/10 bg-white/5 px-4 text-sm text-white outline-none transition placeholder:text-slate-400 focus:border-sky-300"
                  placeholder={props.ux.field_password_placeholder}
                  disabled={props.isPending || props.isSuccess || !passwordChallengeToken}
                />
              </label>

              <label className="block space-y-2">
                <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                  {props.ux.field_confirm_password}
                </span>
                <input
                  type="password"
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  className="h-11 w-full rounded-2xl border border-white/10 bg-white/5 px-4 text-sm text-white outline-none transition placeholder:text-slate-400 focus:border-sky-300"
                  placeholder={props.ux.field_confirm_password_placeholder}
                  disabled={props.isPending || props.isSuccess || !passwordChallengeToken}
                />
              </label>

              {!passwordChallengeToken ? (
                <p className="text-sm leading-6 text-red-300">
                  {props.ux.token_missing_error}
                </p>
              ) : props.errorMessage ? (
                <p className="text-sm leading-6 text-red-300">{props.errorMessage}</p>
              ) : props.isSuccess ? (
                <p className="text-sm leading-6 text-emerald-300">
                  {props.ux.success_message}
                </p>
              ) : localValidationError ? (
                <p className="text-sm leading-6 text-amber-300">{localValidationError}</p>
              ) : (
                <p className="text-sm leading-6 text-slate-400">
                  {props.ux.help_idle}
                </p>
              )}

              <div className="flex flex-col gap-3">
                <Button
                  type="submit"
                  className="h-11 w-full rounded-2xl bg-white text-slate-950 hover:bg-slate-100"
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
                  className="h-11 w-full rounded-2xl border border-white/15 bg-white/5 text-white hover:bg-white/10"
                  onClick={props.onBackToLogin}
                >
                  {props.ux.back_to_login_button}
                </Button>
              </div>
            </form>
          </article>
        </div>
      </section>
    </main>
  )
}
