/**
 * CONTEXT:
 * Root app composition for the first DCX user account surface.
 * It now bootstraps the shared browser session, routes unauthenticated users to `/login`,
 * and renders the first protected `/me/account` surface once access is resolved cleanly.
 */
import { useEffect, useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import { DcxAppAuthLoginPage } from "./components/dcx_app_auth_login_page"
import { DcxAppAuthPasswordRequestResetPage } from "./components/dcx_app_auth_password_request_reset_page"
import { DcxAppAuthPasswordSetPage } from "./components/dcx_app_auth_password_set_page"
import { DcxAppUserAccountSummaryPage } from "./components/dcx_app_user_account_summary_page"
import { completeDcxPasswordSet } from "./lib/complete_dcx_password_set"
import {
  buildDcxAppPathWithLanguageCode,
  persistDcxAppLanguageCode,
  readDcxAppLanguageCodeFromCurrentSearch,
  readResolvedDcxAppLanguageCode,
} from "./lib/dcx_app_language_preference"
import { loginDcxUserWithEmailAndPassword } from "./lib/login_dcx_user_with_email_and_password"
import { logoutAuthenticatedDcxUser } from "./lib/logout_authenticated_dcx_user"
import { readDcxAppAuthUxStringsBundle } from "./lib/read_dcx_app_auth_ux_strings_bundle"
import { readDcxAuthenticatedSession } from "./lib/read_dcx_authenticated_session"
import { requestDcxPasswordReset } from "./lib/request_dcx_password_reset"

const DCX_AUTH_LOGOUT_SYNC_STORAGE_KEY = "dcx_auth_logout_at_ts_ms"
const DCX_APP_AUTH_UX_DEFAULTS = {
  common: {
    checking_session: "Checking DCX session...",
  },
  login_page: {
    surface_label: "DCX App",
    page_title: "Sign in",
    hero_eyebrow: "Account access",
    hero_title: "Continue into the private DCX app.",
    hero_body: "Use the same shared DCX session for both the app and internal admin surfaces.",
    auth_eyebrow: "Shared auth",
    auth_title: "Email and password",
    auth_body: "Confirmed users with a password can enter the app immediately. Admin access stays role-gated on top of the same browser session.",
    field_email: "Email",
    field_email_placeholder: "you@company.com",
    field_password: "Password",
    field_password_placeholder: "Enter your password",
    help_idle: "Use your confirmed email and current password. If you lost access, request a new password link.",
    submit_idle: "Sign in",
    submit_pending: "Signing in...",
    forgot_password_button: "Forgot password?",
  },
  password_reset_request_page: {
    surface_label: "DCX App",
    page_title: "Reset password",
    hero_eyebrow: "Recovery",
    hero_title: "Send a secure password link to your confirmed email.",
    hero_body: "If the account exists and is already confirmed, DCX will send a one-time password link to the email address you enter here.",
    auth_eyebrow: "Shared auth",
    auth_title: "Password reset email",
    auth_body: "The response stays generic for security. Use the newest email link only once.",
    field_email: "Email",
    field_email_placeholder: "you@company.com",
    help_idle: "We will send a one-time link to the confirmed account email if it exists.",
    success_message: "If that email belongs to a confirmed DCX account, a secure password link is on the way.",
    submit_idle: "Send password link",
    submit_pending: "Sending...",
    back_to_login_button: "Back to sign in",
  },
  password_set_page: {
    surface_label: "DCX App",
    page_title: "Password",
    hero_eyebrow: "Shared auth",
    hero_title_setup: "Create your DCX password.",
    hero_body_setup: "Your email is now verified. Choose the password you will use to enter the private DCX app.",
    hero_title_reset: "Choose a new password.",
    hero_body_reset: "Use the secure link token from your reset email to choose a new password, then sign in again.",
    rule_eyebrow: "Password rule",
    rule_title: "At least 12 characters",
    rule_body: "Longer passphrases are welcome. Once saved, return to sign in with the new password.",
    field_password: "New password",
    field_password_placeholder: "Enter a strong passphrase",
    field_confirm_password: "Confirm password",
    field_confirm_password_placeholder: "Enter the same password again",
    validation_min_length: "Use a password with at least 12 characters.",
    validation_confirmation_mismatch: "The password confirmation must match exactly.",
    token_missing_error: "This password link is missing or has already been cleared. Request a fresh one and retry.",
    help_idle: "This one-time link works only once. If it expires, request another password email.",
    success_message: "Password saved. Continue back to sign in.",
    submit_idle: "Save password",
    submit_pending: "Saving...",
    back_to_login_button: "Back to sign in",
  },
}

function redirectToLoginScreen(): void {
  const targetLocation = buildDcxAppPathWithLanguageCode("/login", readResolvedDcxAppLanguageCode())
  if (`${window.location.pathname}${window.location.search}` === targetLocation) {
    return
  }

  window.location.replace(targetLocation)
}

function navigateToPathname(nextPathname: string, options?: { preserveSearch?: boolean }): void {
  const nextSearch = options?.preserveSearch ? window.location.search : ""

  if (window.location.pathname === nextPathname && window.location.search === nextSearch) {
    return
  }

  window.history.pushState({}, "", `${nextPathname}${nextSearch}`)
}

function readDcxAppApiBaseUrl(): string {
  if (import.meta.env.VITE_API_BASE_URL) {
    return import.meta.env.VITE_API_BASE_URL
  }

  if (window.location.hostname === "127.0.0.1") {
    return "http://127.0.0.1:8000"
  }

  return "http://localhost:8000"
}

function App() {
  const queryClient = useQueryClient()
  const apiBaseUrl = readDcxAppApiBaseUrl()
  const [pathname, setPathname] = useState(window.location.pathname || "/me/account")
  const [authLanguageCode, setAuthLanguageCode] = useState(readResolvedDcxAppLanguageCode())

  const appAuthUxStringsBundleQuery = useQuery({
    queryKey: ["dcx_app_auth_ux_strings_bundle", authLanguageCode],
    queryFn: async () =>
      readDcxAppAuthUxStringsBundle({
        apiBaseUrl,
        languageCode: authLanguageCode,
      }),
    retry: false,
  })

  const authenticatedSessionQuery = useQuery({
    queryKey: ["dcx_authenticated_session"],
    queryFn: async () =>
      readDcxAuthenticatedSession({
        apiBaseUrl,
      }),
    retry: false,
    refetchOnWindowFocus: true,
    refetchInterval: 15000,
    refetchIntervalInBackground: false,
  })

  const loginMutation = useMutation({
    mutationFn: async (credentials: { email: string; password: string }) =>
      loginDcxUserWithEmailAndPassword({
        apiBaseUrl,
        email: credentials.email,
        password: credentials.password,
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["dcx_authenticated_session"] })
      navigateToPathname("/me/account")
      setPathname("/me/account")
    },
  })

  const logoutMutation = useMutation({
    mutationFn: async () =>
      logoutAuthenticatedDcxUser({
        apiBaseUrl,
      }),
    onSuccess: async () => {
      localStorage.setItem(DCX_AUTH_LOGOUT_SYNC_STORAGE_KEY, String(Date.now()))
      queryClient.removeQueries({ queryKey: ["dcx_authenticated_session"] })
      queryClient.removeQueries({ queryKey: ["dcx_app_authenticated_user_account_summary"] })
      redirectToLoginScreen()
    },
  })
  const passwordResetRequestMutation = useMutation({
    mutationFn: async (email: string) =>
      requestDcxPasswordReset({
        apiBaseUrl,
        email,
      }),
  })
  const completePasswordSetMutation = useMutation({
    mutationFn: async (payload: {
      passwordChallengeToken: string
      password: string
      confirmPassword: string
    }) =>
      completeDcxPasswordSet({
        apiBaseUrl,
        passwordChallengeToken: payload.passwordChallengeToken,
        password: payload.password,
        confirmPassword: payload.confirmPassword,
      }),
    onSuccess: () => {
      persistDcxAppLanguageCode(authLanguageCode)
      navigateToPathname("/login", { preserveSearch: false })
      window.history.replaceState({}, "", buildDcxAppPathWithLanguageCode("/login", authLanguageCode))
      setPathname("/login")
    },
  })

  useEffect(() => {
    const currentSearchParams = new URLSearchParams(window.location.search)
    if (currentSearchParams.has("user_id")) {
      currentSearchParams.delete("user_id")
    }

    if (currentSearchParams.has("admin_user_id")) {
      currentSearchParams.delete("admin_user_id")
    }

    const normalizedSearch = currentSearchParams.toString()
    const currentSearch = window.location.search.startsWith("?")
      ? window.location.search.slice(1)
      : window.location.search
    if (normalizedSearch !== currentSearch) {
      const nextSearch = normalizedSearch === "" ? "" : `?${normalizedSearch}`
      window.history.replaceState({}, "", `${window.location.pathname}${nextSearch}${window.location.hash}`)
    }

    const handlePopState = () => {
      setPathname(window.location.pathname || "/me/account")
      const nextLanguageCode = readResolvedDcxAppLanguageCode()
      persistDcxAppLanguageCode(nextLanguageCode)
      setAuthLanguageCode(nextLanguageCode)
    }

    const handleVisibilityOrFocusChange = () => {
      void queryClient.invalidateQueries({ queryKey: ["dcx_authenticated_session"] })
    }

    const handleStorageEvent = (event: StorageEvent) => {
      if (event.key !== DCX_AUTH_LOGOUT_SYNC_STORAGE_KEY) {
        return
      }

      queryClient.removeQueries({ queryKey: ["dcx_authenticated_session"] })
      queryClient.removeQueries({ queryKey: ["dcx_app_authenticated_user_account_summary"] })
      redirectToLoginScreen()
    }

    window.addEventListener("popstate", handlePopState)
    window.addEventListener("focus", handleVisibilityOrFocusChange)
    window.addEventListener("storage", handleStorageEvent)
    document.addEventListener("visibilitychange", handleVisibilityOrFocusChange)
    return () => {
      window.removeEventListener("popstate", handlePopState)
      window.removeEventListener("focus", handleVisibilityOrFocusChange)
      window.removeEventListener("storage", handleStorageEvent)
      document.removeEventListener("visibilitychange", handleVisibilityOrFocusChange)
    }
  }, [queryClient])

  useEffect(() => {
    const explicitLanguageCode = readDcxAppLanguageCodeFromCurrentSearch()
    if (explicitLanguageCode) {
      persistDcxAppLanguageCode(explicitLanguageCode)
      setAuthLanguageCode(explicitLanguageCode)
      return
    }

    setAuthLanguageCode(readResolvedDcxAppLanguageCode())
  }, [pathname])

  const sessionRequiredErrorCode =
    (authenticatedSessionQuery.error as Error & { code?: string } | null)?.code ?? null
  const isSessionExplicitlyMissing = sessionRequiredErrorCode === "API_DCX_AUTH_SESSION_REQUIRED"
  const authenticatedSessionSummary = isSessionExplicitlyMissing
    ? null
    : authenticatedSessionQuery.data?.data ?? null
  const authUxStringsBundle = appAuthUxStringsBundleQuery.data?.data ?? DCX_APP_AUTH_UX_DEFAULTS

  const isPasswordRoute = pathname === "/password/reset/request" || pathname === "/password/set"

  useEffect(() => {
    if (authenticatedSessionSummary && (pathname === "/login" || isPasswordRoute)) {
      navigateToPathname("/me/account")
      setPathname("/me/account")
      return
    }

    if (
      !authenticatedSessionSummary &&
      !authenticatedSessionQuery.isLoading &&
      pathname !== "/login" &&
      !isPasswordRoute
    ) {
      queryClient.removeQueries({ queryKey: ["dcx_app_authenticated_user_account_summary"] })
      redirectToLoginScreen()
    }
  }, [
    authenticatedSessionQuery.isLoading,
    authenticatedSessionSummary,
    isPasswordRoute,
    pathname,
    queryClient,
  ])

  if (authenticatedSessionQuery.isLoading && !authenticatedSessionSummary) {
    return (
      <main className="min-h-screen bg-[#f4f6f8] px-4 py-6 text-slate-950 sm:px-6 lg:px-8">
        <section className="mx-auto max-w-4xl rounded-[1.75rem] border border-black/6 bg-white px-6 py-8 shadow-[0_20px_60px_-48px_rgba(15,23,42,0.45)]">
          <p className="text-sm text-slate-500">{authUxStringsBundle.common.checking_session}</p>
        </section>
      </main>
    )
  }

  if (!authenticatedSessionSummary) {
    if (pathname === "/password/reset/request") {
      return (
        <DcxAppAuthPasswordRequestResetPage
          isPending={passwordResetRequestMutation.isPending}
          isSuccess={passwordResetRequestMutation.isSuccess}
          ux={authUxStringsBundle.password_reset_request_page}
          errorMessage={
            passwordResetRequestMutation.isError
              ? (passwordResetRequestMutation.error as Error).message
              : null
          }
          onSubmit={(email) => passwordResetRequestMutation.mutate(email)}
          onBackToLogin={() => {
            passwordResetRequestMutation.reset()
            const nextLanguageCode = readResolvedDcxAppLanguageCode()
            persistDcxAppLanguageCode(nextLanguageCode)
            window.history.pushState({}, "", buildDcxAppPathWithLanguageCode("/login", nextLanguageCode))
            setPathname("/login")
          }}
        />
      )
    }

    if (pathname === "/password/set") {
      return (
        <DcxAppAuthPasswordSetPage
          isPending={completePasswordSetMutation.isPending}
          isSuccess={completePasswordSetMutation.isSuccess}
          ux={authUxStringsBundle.password_set_page}
          errorMessage={
            completePasswordSetMutation.isError
              ? (completePasswordSetMutation.error as Error).message
              : null
          }
          onSubmit={(passwordChallengeToken, password, confirmPassword) =>
            completePasswordSetMutation.mutate({
              passwordChallengeToken,
              password,
              confirmPassword,
            })
          }
          onBackToLogin={() => {
            completePasswordSetMutation.reset()
            const nextLanguageCode = readResolvedDcxAppLanguageCode()
            persistDcxAppLanguageCode(nextLanguageCode)
            window.history.pushState({}, "", buildDcxAppPathWithLanguageCode("/login", nextLanguageCode))
            setPathname("/login")
          }}
        />
      )
    }

    return (
      <DcxAppAuthLoginPage
        isPending={loginMutation.isPending}
        ux={authUxStringsBundle.login_page}
        errorMessage={
          loginMutation.isError
            ? (loginMutation.error as Error & { suggested_action?: string }).message
            : authenticatedSessionQuery.isError
              ? (authenticatedSessionQuery.error as Error & { suggested_action?: string }).message
              : null
        }
        onSubmit={(email, password) => loginMutation.mutate({ email, password })}
        onForgotPassword={() => {
          loginMutation.reset()
          const nextLanguageCode = readResolvedDcxAppLanguageCode()
          persistDcxAppLanguageCode(nextLanguageCode)
          window.history.pushState(
            {},
            "",
            buildDcxAppPathWithLanguageCode("/password/reset/request", nextLanguageCode),
          )
          setPathname("/password/reset/request")
        }}
      />
    )
  }

  return (
    <DcxAppUserAccountSummaryPage
      apiBaseUrl={apiBaseUrl}
      authenticatedSessionSummary={
        authenticatedSessionSummary
          ? {
              primary_email: authenticatedSessionSummary.primary_email,
              user_role: authenticatedSessionSummary.user_role,
            }
          : null
      }
      onLogout={authenticatedSessionSummary ? () => logoutMutation.mutate() : null}
      isLogoutPending={logoutMutation.isPending}
    />
  )
}

export default App

