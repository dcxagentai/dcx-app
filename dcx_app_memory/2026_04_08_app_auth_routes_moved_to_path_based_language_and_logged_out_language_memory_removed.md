App auth routing was moved from query-based language selection such as:

- `/login?language_code=fr`
- `/password/reset/request?language_code=fr`
- `/password/set?mode=password_reset&language_code=fr`

to canonical path-based localized routes:

- `/fr/t/login`
- `/fr/t/password/reset/request`
- `/fr/t/password/set?mode=password_reset`

Why this change was made:

- logged-out language should come from the visible route, not remembered browser state
- this better matches the public site's language-routing style
- it reduces the privacy/trust concern of retaining user language after logout in local storage

Behavior now:

- auth routes resolve language from the path first
- legacy query-based auth links are normalized into the new path format on page load
- logout no longer depends on persisted language storage
- password reset/setup email links now point to the path-based localized auth routes
- account page still localizes from authenticated user `preferred_language`

What remains intentionally unchanged:

- cross-tab logout sync still uses a tiny local-storage timestamp key only for logout propagation
- authenticated account route remains `/me/account`

Verification completed in this pass:

- focused backend password-link challenge tests passed
- `dcx_app` production build passed
