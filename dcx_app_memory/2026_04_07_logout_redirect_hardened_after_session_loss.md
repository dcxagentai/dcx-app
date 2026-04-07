Follow-up auth UX hardening for `dcx_app`.

What changed
- Removed the last frontend parsing/use of `?user_id=`.
- When the app learns the session is gone, it now clears the protected account query and hard-redirects to `/login` instead of only showing an inline error state.
- Logout now broadcasts a local logout timestamp and then forces a redirect to `/login`.
- The account page no longer renders stale protected account content when the session query has failed.

Why
- The prior behavior could show a red "account read blocked" banner while stale account data was still visible underneath.
- The target behavior is that once a tab knows the session is invalid, protected UI disappears and the tab returns to the login screen.

Verification
- `dcx_app` production build passed after the change.

Limit
- Same-origin tabs react immediately through storage events.
- Cross-origin/subdomain tabs still depend on focus/visibility/poll rechecks because there is no shared instant browser event across origins in this MVP setup.
