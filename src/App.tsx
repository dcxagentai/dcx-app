/**
 * CONTEXT:
 * Root app composition for the first DCX user account surface.
 * It now bootstraps the shared browser session, routes unauthenticated users to `/login`,
 * and renders the first protected `/me/account` surface once access is resolved.
 */
import { useEffect, useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import { DcxAppAuthLoginPage } from "./components/dcx_app_auth_login_page"
import { DcxAppAuthPasswordRequestResetPage } from "./components/dcx_app_auth_password_request_reset_page"
import { DcxAppAuthPasswordSetPage } from "./components/dcx_app_auth_password_set_page"
import { DcxAppUserAccountSummaryPage } from "./components/dcx_app_user_account_summary_page"
import { completeDcxPasswordSet } from "./lib/complete_dcx_password_set"
import { loginDcxUserWithEmailAndPassword } from "./lib/login_dcx_user_with_email_and_password"
import { logoutAuthenticatedDcxUser } from "./lib/logout_authenticated_dcx_user"
import { readDcxAuthenticatedSession } from "./lib/read_dcx_authenticated_session"
import { requestDcxPasswordReset } from "./lib/request_dcx_password_reset"

const DCX_AUTH_LOGOUT_SYNC_STORAGE_KEY = "dcx_auth_logout_at_ts_ms"

function redirectToLoginScreen(): void {
  if (window.location.pathname === "/login" && window.location.search === "") {
    return
  }

  window.location.replace("/login")
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
      navigateToPathname("/login")
      setPathname("/login")
    },
  })

  useEffect(() => {
    if (window.location.pathname !== "/password/set" && window.location.search !== "") {
      window.history.replaceState({}, "", window.location.pathname)
    }

    const handlePopState = () => {
      setPathname(window.location.pathname || "/me/account")
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

  const sessionRequiredErrorCode =
    (authenticatedSessionQuery.error as Error & { code?: string } | null)?.code ?? null
  const isSessionExplicitlyMissing = sessionRequiredErrorCode === "API_DCX_AUTH_SESSION_REQUIRED"
  const authenticatedSessionSummary = isSessionExplicitlyMissing
    ? null
    : authenticatedSessionQuery.data?.data ?? null

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
          <p className="text-sm text-slate-500">Checking DCX session...</p>
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
          errorMessage={
            passwordResetRequestMutation.isError
              ? (passwordResetRequestMutation.error as Error).message
              : null
          }
          onSubmit={(email) => passwordResetRequestMutation.mutate(email)}
          onBackToLogin={() => {
            passwordResetRequestMutation.reset()
            navigateToPathname("/login")
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
            navigateToPathname("/login")
            setPathname("/login")
          }}
        />
      )
    }

    return (
      <DcxAppAuthLoginPage
        isPending={loginMutation.isPending}
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
          navigateToPathname("/password/reset/request")
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

