/**
 * CONTEXT:
 * First shared auth login page for the DCX user app.
 * It exists so confirmed users with passwords can establish the shared DCX browser session before
 * accessing the protected app account surface.
 */
import { type FormEvent, useState } from "react"
import { Button } from "@/components/ui/button"
import dcxLogo from "@prompteoai/dcx-branding/assets/dcx_logo.png"

type Props = {
  isPending: boolean
  errorMessage: string | null
  onSubmit: (email: string, password: string) => void
  onForgotPassword: () => void
}

export function DcxAppAuthLoginPage(props: Props) {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    props.onSubmit(email.trim(), password)
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
                  Sign in
                </h1>
              </div>
            </div>

            <div className="mt-10 max-w-xl space-y-4">
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">
                Account access
              </p>
              <h2 className="text-4xl font-semibold tracking-tight text-slate-950">
                Continue into the private DCX app.
              </h2>
              <p className="max-w-lg text-base leading-7 text-slate-600">
                Use the same shared DCX session for both the app and internal admin surfaces. Password
                setup and reset can come in the next pass once the session loop is proven.
              </p>
            </div>
          </article>

          <article className="rounded-[1.75rem] border border-black/6 bg-[#0f172a] px-6 py-8 text-white shadow-[0_20px_60px_-48px_rgba(15,23,42,0.45)] sm:px-8">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">
              Shared auth
            </p>
            <h2 className="mt-3 text-2xl font-semibold tracking-tight">
              Email and password
            </h2>
            <p className="mt-3 text-sm leading-6 text-slate-300">
              Confirmed users with a password can enter the app immediately. Admin access stays
              role-gated on top of the same browser session.
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
                  disabled={props.isPending}
                />
              </label>

              <label className="block space-y-2">
                <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                  Password
                </span>
                <input
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="h-11 w-full rounded-2xl border border-white/10 bg-white/5 px-4 text-sm text-white outline-none transition placeholder:text-slate-400 focus:border-sky-300"
                  placeholder="Enter your password"
                  disabled={props.isPending}
                />
              </label>

              {props.errorMessage ? (
                <p className="text-sm leading-6 text-red-300">{props.errorMessage}</p>
              ) : (
                <p className="text-sm leading-6 text-slate-400">
                  Use your confirmed email and current password. If you lost access, request a new
                  password link.
                </p>
              )}

              <div className="flex flex-col gap-3">
                <Button
                  type="submit"
                  className="h-11 w-full rounded-2xl bg-white text-slate-950 hover:bg-slate-100"
                  disabled={props.isPending || email.trim() === "" || password === ""}
                >
                  {props.isPending ? "Signing in..." : "Sign in"}
                </Button>
                <button
                  type="button"
                  className="text-left text-sm font-medium text-sky-300 transition hover:text-sky-200"
                  onClick={props.onForgotPassword}
                >
                  Forgot password?
                </button>
              </div>
            </form>
          </article>
        </div>
      </section>
    </main>
  )
}
