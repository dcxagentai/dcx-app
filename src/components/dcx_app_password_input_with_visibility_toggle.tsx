/**
 * CONTEXT:
 * Shared password input with one temporary reveal toggle for the DCX user app.
 * It exists so login and password setup/reset pages can let users sanity-check what they typed
 * without each form reimplementing the same visibility-toggle mechanics.
 */
import { useId, useState } from "react"
import { EyeIcon, EyeOffIcon } from "lucide-react"

import { cn } from "@/lib/utils"

type Props = {
  value: string
  onChange: (value: string) => void
  autoComplete: string
  placeholder: string
  disabled?: boolean
  className?: string
}

export function DcxAppPasswordInputWithVisibilityToggle(props: Props) {
  const [isPasswordVisible, setIsPasswordVisible] = useState(false)
  const inputId = useId()

  return (
    <div className="relative">
      <input
        id={inputId}
        type={isPasswordVisible ? "text" : "password"}
        autoComplete={props.autoComplete}
        value={props.value}
        onChange={(event) => props.onChange(event.target.value)}
        className={cn(
          "h-11 w-full border border-white/10 bg-white/5 px-4 pr-12 text-sm text-white outline-none transition placeholder:text-slate-400 focus:border-sky-300 disabled:pointer-events-none disabled:opacity-60",
          props.className
        )}
        placeholder={props.placeholder}
        disabled={props.disabled}
      />
      <button
        type="button"
        className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-slate-400 transition hover:text-white disabled:pointer-events-none disabled:opacity-40"
        onClick={() => setIsPasswordVisible((currentValue) => !currentValue)}
        aria-label={isPasswordVisible ? "Hide password" : "Show password"}
        title={isPasswordVisible ? "Hide password" : "Show password"}
        disabled={props.disabled}
      >
        {isPasswordVisible ? <EyeOffIcon className="size-4" /> : <EyeIcon className="size-4" />}
      </button>
    </div>
  )
}
