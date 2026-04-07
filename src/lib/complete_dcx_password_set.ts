/**
 * CONTEXT:
 * Browser request helper for completing one DCX password setup/reset token.
 * It exists so the app-side password-set page can submit the token plus password fields through
 * one shared API wrapper.
 */

export async function completeDcxPasswordSet(props: {
  apiBaseUrl: string
  passwordChallengeToken: string
  password: string
  confirmPassword: string
}): Promise<void> {
  const response = await fetch(new URL("/auth/password/complete-set", props.apiBaseUrl).toString(), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      password_challenge_token: props.passwordChallengeToken,
      password: props.password,
      confirm_password: props.confirmPassword,
    }),
  })

  const payload = await response.json().catch(() => null)
  if (!response.ok || payload?.ok !== true) {
    const error = new Error(
      payload?.error?.message ?? "We could not set the DCX password."
    ) as Error & { code?: string }
    error.code = payload?.error?.code
    throw error
  }
}
