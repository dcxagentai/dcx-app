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
  ux: Record<string, string>
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
                {props.ux.hero_title}
              </h2>
              <p className="max-w-lg text-base leading-7 text-slate-600">
                {props.ux.hero_body}
              </p>
            </div>
          </article>

          <article className="rounded-[1.75rem] border border-black/6 bg-[#0f172a] px-6 py-8 text-white shadow-[0_20px_60px_-48px_rgba(15,23,42,0.45)] sm:px-8">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">
              {props.ux.auth_eyebrow}
            </p>
            <h2 className="mt-3 text-2xl font-semibold tracking-tight">
              {props.ux.auth_title}
            </h2>
            <p className="mt-3 text-sm leading-6 text-slate-300">
              {props.ux.auth_body}
            </p>

            <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
              <label className="block space-y-2">
                <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                  {props.ux.field_email}
                </span>
                <input
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className="h-11 w-full rounded-2xl border border-white/10 bg-white/5 px-4 text-sm text-white outline-none transition placeholder:text-slate-400 focus:border-sky-300"
                  placeholder={props.ux.field_email_placeholder}
                  disabled={props.isPending || props.isSuccess}
                />
              </label>

              {props.errorMessage ? (
                <p className="text-sm leading-6 text-red-300">{props.errorMessage}</p>
              ) : props.isSuccess ? (
                <p className="text-sm leading-6 text-emerald-300">
                  {props.ux.success_message}
                </p>
              ) : (
                <p className="text-sm leading-6 text-slate-400">
                  {props.ux.help_idle}
                </p>
              )}

              <div className="flex flex-col gap-3">
                <Button
                  type="submit"
                  className="h-11 w-full rounded-2xl bg-white text-slate-950 hover:bg-slate-100"
                  disabled={props.isPending || props.isSuccess || email.trim() === ""}
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
