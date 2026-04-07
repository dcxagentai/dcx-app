/**
 * CONTEXT:
 * First DCX app forgot-password request page.
 * It exists so users can request the reset email through the shared auth backend before the full
 * auth surface is polished further.
 */
import { type FormEvent, useState } from "react"
import { Button } from "@/components/ui/button"
import dcxLogo from "@prompteoai/dcx-branding/assets/dcx_logo.png"

type Props = {
  isPending: boolean
  isSuccess: boolean
  errorMessage: string | null
  onSubmit: (email: string) => void
  onBackToLogin: () => void
}

export function DcxAppAuthPasswordRequestResetPage(props: Props) {
  const [email, setEmail] = useState("")

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    props.onSubmit(email.trim())
  }

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
                  Reset password
                </h1>
              </div>
            </div>

            <div className="mt-10 max-w-xl space-y-4">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                Recovery
              </p>
              <h2 className="text-4xl font-semibold tracking-tight text-slate-950">
                Send a secure password link to your confirmed email.
              </h2>
              <p className="max-w-lg text-base leading-7 text-slate-600">
                If the account exists and is already confirmed, DCX will send a one-time password
                link to the email address you enter here.
              </p>
            </div>
          </article>

          <article className="rounded-[1.75rem] border border-black/6 bg-[#0f172a] px-6 py-8 text-white shadow-[0_20px_60px_-48px_rgba(15,23,42,0.45)] sm:px-8">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">
              Shared auth
            </p>
            <h2 className="mt-3 text-2xl font-semibold tracking-tight">
              Password reset email
            </h2>
            <p className="mt-3 text-sm leading-6 text-slate-300">
              The response stays generic for security. Use the newest email link only once.
            </p>

            <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
              <label className="block space-y-2">
                <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                  Email
                </span>
                <input
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className="h-11 w-full rounded-2xl border border-white/10 bg-white/5 px-4 text-sm text-white outline-none transition placeholder:text-slate-400 focus:border-sky-300"
                  placeholder="you@company.com"
                  disabled={props.isPending || props.isSuccess}
                />
              </label>

              {props.errorMessage ? (
                <p className="text-sm leading-6 text-red-300">{props.errorMessage}</p>
              ) : props.isSuccess ? (
                <p className="text-sm leading-6 text-emerald-300">
                  If that email belongs to a confirmed DCX account, a secure password link is on the
                  way.
                </p>
              ) : (
                <p className="text-sm leading-6 text-slate-400">
                  We will send a one-time link to the confirmed account email if it exists.
                </p>
              )}

              <div className="flex flex-col gap-3">
                <Button
                  type="submit"
                  className="h-11 w-full rounded-2xl bg-white text-slate-950 hover:bg-slate-100"
                  disabled={props.isPending || props.isSuccess || email.trim() === ""}
                >
                  {props.isPending ? "Sending..." : "Send password link"}
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
