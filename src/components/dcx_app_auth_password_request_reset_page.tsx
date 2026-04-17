/**
 * CONTEXT:
 * First DCX app forgot-password request page.
 * It exists so users can request the reset email through the shared auth backend before the full
 * auth surface is polished further.
 */
import { type FormEvent, useState } from "react"
import { Button } from "@/components/ui/button"
import dcxLogo from "@/assets/dcx_logo.png"

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
                className="h-11 w-full border border-white/10 bg-white/5 px-4 text-sm text-white outline-none transition placeholder:text-slate-400 focus:border-sky-300"
                placeholder={props.ux.field_email_placeholder}
                disabled={props.isPending || props.isSuccess}
              />
            </label>

            {props.errorMessage ? (
              <p className="text-sm leading-6 text-red-300">{props.errorMessage}</p>
            ) : props.isSuccess ? (
              <p className="text-sm leading-6 text-emerald-300">{props.ux.success_message}</p>
            ) : null}

            <div className="flex flex-col gap-3 pt-1">
              <Button
                type="submit"
                className="h-11 w-full bg-white text-slate-950 hover:bg-slate-100"
                disabled={props.isPending || props.isSuccess || email.trim() === ""}
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
