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
      return "Use a password with at least 12 characters."
    }

    if (password !== confirmPassword) {
      return "The password confirmation must match exactly."
    }

    return null
  }, [confirmPassword, password])

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!passwordChallengeToken || localValidationError) {
      return
    }

    props.onSubmit(passwordChallengeToken, password, confirmPassword)
  }

  const title =
    currentMode === "password_reset" ? "Choose a new password." : "Create your DCX password."
  const body =
    currentMode === "password_reset"
      ? "Use the secure link token from your reset email to choose a new password, then sign in again."
      : "Your email is now verified. Choose the password you will use to enter the private DCX app."

  return (
    <main className="min-h-screen bg-[#f4f6f8] px-4 py-6 text-slate-950 sm:px-6 lg:px-8">
      <section className="mx-auto flex min-h-[80vh] max-w-5xl items-center">
        <div className="grid w-full gap-6 lg:grid-cols-[1.15fr_0.85fr]">
          <article className="rounded-[1.75rem] border border-black/6 bg-white px-6 py-8 shadow-[0_20px_60px_-48px_rgba(15,23,42,0.45)] sm:px-8">
            <div className="flex items-center gap-4">
              <img src={dcxLogo} alt="DCX logo" className="h-11 w-11 rounded-xl bg-[#fbfaf7] p-1.5" />
              <div className="space-y-1">
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
                  DCX App
                </p>
                <h1 className="text-3xl font-semibold tracking-tight text-slate-950">
                  Password
                </h1>
              </div>
            </div>

            <div className="mt-10 max-w-xl space-y-4">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                Shared auth
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
              Password rule
            </p>
            <h2 className="mt-3 text-2xl font-semibold tracking-tight">
              At least 12 characters
            </h2>
            <p className="mt-3 text-sm leading-6 text-slate-300">
              Longer passphrases are welcome. Once saved, return to sign in with the new password.
            </p>

            <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
              <label className="block space-y-2">
                <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                  New password
                </span>
                <input
                  type="password"
                  autoComplete="new-password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="h-11 w-full rounded-2xl border border-white/10 bg-white/5 px-4 text-sm text-white outline-none transition placeholder:text-slate-400 focus:border-sky-300"
                  placeholder="Enter a strong passphrase"
                  disabled={props.isPending || props.isSuccess || !passwordChallengeToken}
                />
              </label>

              <label className="block space-y-2">
                <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                  Confirm password
                </span>
                <input
                  type="password"
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  className="h-11 w-full rounded-2xl border border-white/10 bg-white/5 px-4 text-sm text-white outline-none transition placeholder:text-slate-400 focus:border-sky-300"
                  placeholder="Enter the same password again"
                  disabled={props.isPending || props.isSuccess || !passwordChallengeToken}
                />
              </label>

              {!passwordChallengeToken ? (
                <p className="text-sm leading-6 text-red-300">
                  This password link is missing or has already been cleared. Request a fresh one and
                  retry.
                </p>
              ) : props.errorMessage ? (
                <p className="text-sm leading-6 text-red-300">{props.errorMessage}</p>
              ) : props.isSuccess ? (
                <p className="text-sm leading-6 text-emerald-300">
                  Password saved. Continue back to sign in.
                </p>
              ) : localValidationError ? (
                <p className="text-sm leading-6 text-amber-300">{localValidationError}</p>
              ) : (
                <p className="text-sm leading-6 text-slate-400">
                  This one-time link works only once. If it expires, request another password email.
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
                  {props.isPending ? "Saving..." : "Save password"}
                </Button>
                <Button
                  type="button"
                  className="h-11 w-full rounded-2xl border border-white/15 bg-white/5 text-white hover:bg-white/10"
                  onClick={props.onBackToLogin}
                >
                  Back to sign in
                </Button>
              </div>
            </form>
          </article>
        </div>
      </section>
    </main>
  )
}
