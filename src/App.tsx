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
import { DcxAppWhatsappPhoneVerifyPage } from "./components/dcx_app_whatsapp_phone_verify_page"
import { DcxAppShell } from "./components/dcx_app_shell"
import { DcxAppMessagesPage } from "./components/dcx_app_messages_page"
import { DcxAppMarketTopicsPage } from "./components/dcx_app_market_topics_page"
import { DcxAppSendMessagePage } from "./components/dcx_app_send_message_page"
import { DcxAppTradesPage } from "./components/dcx_app_trades_page"
import { DcxAppUserActivityLogPage } from "./components/dcx_app_user_activity_log_page"
import { DCX_APP_ACCOUNT_PAGE_DEFAULT_UX_STRINGS } from "./components/dcx_app_user_account_shared"
import { DcxAppUserAccountSummaryPage } from "./components/dcx_app_user_account_summary_page"
import { DcxAppUserSettingsPage } from "./components/dcx_app_user_settings_page"
import { completeDcxPasswordSet } from "./lib/complete_dcx_password_set"
import {
  buildDcxAppPathWithLanguageCode,
  normalizeDcxAppLanguageCode,
  readDcxAppAuthRoutePath,
  readDcxAppLanguageCodeFromCurrentSearch,
  readResolvedDcxAppLanguageCode,
} from "./lib/dcx_app_language_preference"
import { loginDcxUserWithEmailAndPassword } from "./lib/login_dcx_user_with_email_and_password"
import { logoutAuthenticatedDcxUser } from "./lib/logout_authenticated_dcx_user"
import { readDcxAppAuthUxStringsBundle } from "./lib/read_dcx_app_auth_ux_strings_bundle"
import { readDcxAppAuthenticatedUserAccountSummary } from "./lib/read_dcx_app_authenticated_user_account_summary"
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
  const targetLocation = buildDcxAppPathWithLanguageCode("/login", "en")
  if (`${window.location.pathname}${window.location.search}` === targetLocation) {
    return
  }

  window.location.replace(targetLocation)
}

function redirectToLocalizedLoginScreen(languageCode: string): void {
  const targetLocation = buildDcxAppPathWithLanguageCode("/login", languageCode)
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

function navigateWithinProtectedApp(nextPathname: string, setPathname: (pathname: string) => void): void {
  navigateToPathname(nextPathname)
  setPathname(nextPathname)
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

function readDcxAdminSurfaceUrl(): string {
  const currentProtocol = window.location.protocol
  const currentHostname = window.location.hostname

  if (currentHostname === "localhost") {
    return `${currentProtocol}//localhost:5174`
  }

  if (currentHostname === "127.0.0.1") {
    return `${currentProtocol}//127.0.0.1:5174`
  }

  const hostnameParts = currentHostname.split(".")
  if (hostnameParts.length >= 2) {
    return `${currentProtocol}//admin.${hostnameParts.slice(-2).join(".")}`
  }

  return `${currentProtocol}//admin.${currentHostname}`
}

function App() {
  const queryClient = useQueryClient()
  const apiBaseUrl = readDcxAppApiBaseUrl()
  const adminSurfaceUrl = readDcxAdminSurfaceUrl()
  const [pathname, setPathname] = useState(window.location.pathname || "/me/account")
  const [authLanguageCode, setAuthLanguageCode] = useState(readResolvedDcxAppLanguageCode(window.location.pathname))

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
      const cachedAccountSummary = queryClient.getQueryData<{
        data?: {
          preferred_language?: { language_code?: string | null } | null
        }
      }>(["dcx_app_authenticated_user_account_summary"])
      const logoutLanguageCode = normalizeDcxAppLanguageCode(
        cachedAccountSummary?.data?.preferred_language?.language_code ?? "en",
      )
      localStorage.setItem(DCX_AUTH_LOGOUT_SYNC_STORAGE_KEY, String(Date.now()))
      queryClient.removeQueries({ queryKey: ["dcx_authenticated_session"] })
      queryClient.removeQueries({ queryKey: ["dcx_app_authenticated_user_account_summary"] })
      redirectToLocalizedLoginScreen(logoutLanguageCode)
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
      window.history.replaceState({}, "", buildDcxAppPathWithLanguageCode("/login", authLanguageCode))
      setPathname(window.location.pathname)
    },
  })

  useEffect(() => {
    const currentSearchParams = new URLSearchParams(window.location.search)
    const legacyAuthRoutePath = readDcxAppAuthRoutePath(window.location.pathname)
    const queryLanguageCode = readDcxAppLanguageCodeFromCurrentSearch()

    if (currentSearchParams.has("user_id")) {
      currentSearchParams.delete("user_id")
    }

    if (currentSearchParams.has("admin_user_id")) {
      currentSearchParams.delete("admin_user_id")
    }

    if (currentSearchParams.has("language_code")) {
      currentSearchParams.delete("language_code")
    }

    if (
      legacyAuthRoutePath &&
      (window.location.pathname === legacyAuthRoutePath || queryLanguageCode !== null)
    ) {
      const nextSearch = currentSearchParams.toString()
      const canonicalAuthPath = buildDcxAppPathWithLanguageCode(
        legacyAuthRoutePath,
        queryLanguageCode ?? "en",
      )
      const nextSearchSuffix = nextSearch === "" ? "" : `?${nextSearch}`
      window.history.replaceState(
        {},
        "",
        `${canonicalAuthPath}${nextSearchSuffix}${window.location.hash}`,
      )
      setPathname(window.location.pathname)
      setAuthLanguageCode(readResolvedDcxAppLanguageCode(window.location.pathname))
      return
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
      const nextLanguageCode = readResolvedDcxAppLanguageCode(window.location.pathname)
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
    setAuthLanguageCode(readResolvedDcxAppLanguageCode(pathname))
  }, [pathname])

  const sessionRequiredErrorCode =
    (authenticatedSessionQuery.error as Error & { code?: string } | null)?.code ?? null
  const isSessionExplicitlyMissing = sessionRequiredErrorCode === "API_DCX_AUTH_SESSION_REQUIRED"
  const authenticatedSessionSummary = isSessionExplicitlyMissing
    ? null
    : authenticatedSessionQuery.data?.data ?? null
  const authUxStringsBundle = appAuthUxStringsBundleQuery.data?.data ?? DCX_APP_AUTH_UX_DEFAULTS
  const appAccountSummaryQuery = useQuery({
    queryKey: ["dcx_app_authenticated_user_account_summary"],
    queryFn: async () =>
      readDcxAppAuthenticatedUserAccountSummary({
        apiBaseUrl,
      }),
    enabled: authenticatedSessionSummary !== null,
    retry: false,
  })
  const protectedAppUxStrings =
    appAccountSummaryQuery.data?.data?.ux_strings ?? DCX_APP_ACCOUNT_PAGE_DEFAULT_UX_STRINGS

  const authRoutePath = readDcxAppAuthRoutePath(pathname)
  const isPasswordRoute = authRoutePath === "/password/reset/request" || authRoutePath === "/password/set"
  const isWhatsappPhoneVerifyRoute = authRoutePath === "/verify-whatsapp-phone"
  const isAuthSurfaceRoute = authRoutePath === "/login" || isPasswordRoute || isWhatsappPhoneVerifyRoute
  const protectedAppPathname = readProtectedAppPathname(pathname)
  const protectedAppMessageFilter = readProtectedAppMessageFilter(pathname)
  const protectedAppMessageId = readProtectedAppMessageId(pathname)
  const protectedAppTradeId = readProtectedAppTradeId(pathname)
  const protectedAppMarketTopicId = readProtectedAppMarketTopicId(pathname)

  useEffect(() => {
    if (authenticatedSessionSummary && (authRoutePath === "/login" || isPasswordRoute)) {
      navigateToPathname("/me/account")
      setPathname("/me/account")
      return
    }

    if (
      !authenticatedSessionSummary &&
      !authenticatedSessionQuery.isLoading &&
      authRoutePath !== "/login" &&
      !isPasswordRoute &&
      !isWhatsappPhoneVerifyRoute
    ) {
      queryClient.removeQueries({ queryKey: ["dcx_app_authenticated_user_account_summary"] })
      redirectToLoginScreen()
    }
  }, [
    authenticatedSessionQuery.isLoading,
    authenticatedSessionSummary,
    isPasswordRoute,
    isWhatsappPhoneVerifyRoute,
    authRoutePath,
    queryClient,
  ])

  if (authenticatedSessionQuery.isLoading && !authenticatedSessionSummary && !isAuthSurfaceRoute) {
    return (
      <main className="min-h-screen bg-[#f4f6f8] px-4 py-6 text-slate-950 sm:px-6 lg:px-8">
        <section className="mx-auto max-w-4xl rounded-[1.75rem] border border-black/6 bg-white px-6 py-8 shadow-[0_20px_60px_-48px_rgba(15,23,42,0.45)]">
          <p className="text-sm text-slate-500">{authUxStringsBundle.common.checking_session}</p>
        </section>
      </main>
    )
  }

  if (!authenticatedSessionSummary) {
    const loginSurfaceErrorMessage = loginMutation.isError
      ? (loginMutation.error as Error & { suggested_action?: string }).message
      : null

    if (authRoutePath === "/password/reset/request") {
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
            const nextLanguageCode = authLanguageCode
            window.history.pushState({}, "", buildDcxAppPathWithLanguageCode("/login", nextLanguageCode))
            setPathname(window.location.pathname)
          }}
        />
      )
    }

    if (authRoutePath === "/password/set") {
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
            const nextLanguageCode = authLanguageCode
            window.history.pushState({}, "", buildDcxAppPathWithLanguageCode("/login", nextLanguageCode))
            setPathname(window.location.pathname)
          }}
        />
      )
    }

    if (authRoutePath === "/verify-whatsapp-phone") {
      return (
        <DcxAppWhatsappPhoneVerifyPage
          apiBaseUrl={apiBaseUrl}
          languageCode={authLanguageCode}
          hasAuthenticatedSession={false}
        />
      )
    }

    return (
      <DcxAppAuthLoginPage
        isPending={loginMutation.isPending}
        ux={authUxStringsBundle.login_page}
        errorMessage={loginSurfaceErrorMessage}
        onSubmit={(email, password) => loginMutation.mutate({ email, password })}
        onForgotPassword={() => {
          loginMutation.reset()
          const nextLanguageCode = authLanguageCode
          window.history.pushState(
            {},
            "",
            buildDcxAppPathWithLanguageCode("/password/reset/request", nextLanguageCode),
          )
          setPathname(window.location.pathname)
        }}
      />
    )
  }

  if (authRoutePath === "/verify-whatsapp-phone") {
    return (
      <DcxAppWhatsappPhoneVerifyPage
        apiBaseUrl={apiBaseUrl}
        languageCode={authLanguageCode}
        hasAuthenticatedSession
      />
    )
  }

  return (
    <DcxAppShell
      title={readProtectedAppPageTitle(protectedAppPathname, protectedAppUxStrings)}
      currentPathname={pathname}
      userEmail={authenticatedSessionSummary?.primary_email ?? null}
      userRole={authenticatedSessionSummary?.user_role ?? null}
      adminHref={
        authenticatedSessionSummary?.user_role === "admin" ||
        authenticatedSessionSummary?.user_role === "dev"
          ? adminSurfaceUrl
          : null
      }
      uxStrings={protectedAppUxStrings}
      onNavigateWithinApp={(nextPathname) => navigateWithinProtectedApp(nextPathname, setPathname)}
      onLogout={authenticatedSessionSummary ? () => logoutMutation.mutate() : null}
      isLogoutPending={logoutMutation.isPending}
    >
      {protectedAppPathname === "/me/settings" ? (
        <DcxAppUserSettingsPage apiBaseUrl={apiBaseUrl} />
      ) : null}
      {protectedAppPathname === "/me/activity-log" ? (
        <DcxAppUserActivityLogPage apiBaseUrl={apiBaseUrl} />
      ) : null}
      {protectedAppPathname === "/me/account" ? (
        <DcxAppUserAccountSummaryPage apiBaseUrl={apiBaseUrl} />
      ) : null}
      {protectedAppPathname === "/me/messages" ? (
        <DcxAppMessagesPage
          apiBaseUrl={apiBaseUrl}
          filter={protectedAppMessageFilter}
          routeMessageId={protectedAppMessageId}
        />
      ) : null}
      {protectedAppPathname === "/me/other" ? (
        <DcxAppMessagesPage apiBaseUrl={apiBaseUrl} filter="all" workflowKindFilter="other" />
      ) : null}
      {protectedAppPathname === "/me/trades" ? (
        <DcxAppTradesPage apiBaseUrl={apiBaseUrl} routeTradeId={protectedAppTradeId} />
      ) : null}
      {protectedAppPathname === "/me/topics" ? (
        <DcxAppMarketTopicsPage apiBaseUrl={apiBaseUrl} routeMarketTopicId={protectedAppMarketTopicId} />
      ) : null}
      {protectedAppPathname === "/me/send" ? (
        <DcxAppSendMessagePage apiBaseUrl={apiBaseUrl} />
      ) : null}
    </DcxAppShell>
  )
}

export default App

function readProtectedAppPathname(
  pathname: string,
): "/me/account" | "/me/settings" | "/me/activity-log" | "/me/messages" | "/me/trades" | "/me/topics" | "/me/other" | "/me/send" {
  if (pathname === "/me/settings") {
    return "/me/settings"
  }

  if (pathname === "/me/activity-log") {
    return "/me/activity-log"
  }

  if (
    pathname === "/me/messages" ||
    /^\/me\/messages\/\d+$/.test(pathname) ||
    pathname === "/me/messages/text" ||
    pathname === "/me/messages/images" ||
    pathname === "/me/messages/audio" ||
    pathname === "/me/messages/documents"
  ) {
    return "/me/messages"
  }

  if (pathname === "/me/trades" || /^\/me\/trades\/\d+$/.test(pathname)) {
    return "/me/trades"
  }

  if (pathname === "/me/topics" || /^\/me\/topics\/\d+$/.test(pathname)) {
    return "/me/topics"
  }

  if (pathname === "/me/other") {
    return "/me/other"
  }

  if (pathname === "/me/send") {
    return "/me/send"
  }

  return "/me/account"
}

function readProtectedAppPageTitle(
  pathname: "/me/account" | "/me/settings" | "/me/activity-log" | "/me/messages" | "/me/trades" | "/me/topics" | "/me/other" | "/me/send",
  uxStrings: Record<string, string>,
): string {
  if (pathname === "/me/settings") {
    return uxStrings.page_title_settings ?? "Settings"
  }

  if (pathname === "/me/activity-log") {
    return uxStrings.page_title_activity_log ?? "Activity Log"
  }

  if (pathname === "/me/messages") {
    return uxStrings.page_title_messages ?? "Messages"
  }

  if (pathname === "/me/trades") {
    return uxStrings.page_title_trades ?? "Trades"
  }

  if (pathname === "/me/topics") {
    return uxStrings.page_title_topics ?? "Topics"
  }

  if (pathname === "/me/other") {
    return uxStrings.page_title_other ?? "Other"
  }

  if (pathname === "/me/send") {
    return uxStrings.page_title_send ?? "Send"
  }

  return uxStrings.page_title_account ?? "Account"
}

function readProtectedAppMessageFilter(
  pathname: string,
): "all" | "text" | "image" | "audio" | "document" {
  if (pathname === "/me/messages/text") {
    return "text"
  }
  if (pathname === "/me/messages/images") {
    return "image"
  }
  if (pathname === "/me/messages/audio") {
    return "audio"
  }
  if (pathname === "/me/messages/documents") {
    return "document"
  }
  return "all"
}

function readProtectedAppTradeId(pathname: string): number | null {
  const match = pathname.match(/^\/me\/trades\/(\d+)$/)
  if (!match) {
    return null
  }
  const parsedTradeId = Number.parseInt(match[1], 10)
  return Number.isFinite(parsedTradeId) && parsedTradeId > 0 ? parsedTradeId : null
}

function readProtectedAppMessageId(pathname: string): number | null {
  const match = pathname.match(/^\/me\/messages\/(\d+)$/)
  if (!match) {
    return null
  }
  const parsedMessageId = Number.parseInt(match[1], 10)
  return Number.isFinite(parsedMessageId) && parsedMessageId > 0 ? parsedMessageId : null
}

function readProtectedAppMarketTopicId(pathname: string): number | null {
  const match = pathname.match(/^\/me\/topics\/(\d+)$/)
  if (!match) {
    return null
  }
  const parsedMarketTopicId = Number.parseInt(match[1], 10)
  return Number.isFinite(parsedMarketTopicId) && parsedMarketTopicId > 0 ? parsedMarketTopicId : null
}

