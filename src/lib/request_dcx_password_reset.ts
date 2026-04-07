/**
 * CONTEXT:
 * Browser request helper for the first DCX forgot-password email flow.
 * It exists so the app-side reset-request page can call the shared backend contract with one
 * narrow, reusable function.
 */

export async function requestDcxPasswordReset(props: {
  apiBaseUrl: string
  email: string
}): Promise<void> {
  const response = await fetch(new URL("/auth/password/request-reset", props.apiBaseUrl).toString(), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email: props.email,
    }),
  })

  const payload = await response.json().catch(() => null)
  if (!response.ok || payload?.ok !== true) {
    throw new Error(
      payload?.error?.message ?? "We could not start the password reset flow."
    )
  }
}
