`dcx_app` now has its first real auth-aware shell.

What changed:
- added `GET /auth/session` bootstrap from the app shell
- added app login page
- added shared login mutation
- added shared logout mutation
- account-summary/account-settings fetches now send cookies with `credentials: "include"`
- local debug `?user_id=` still works only as a local fallback when no session exists
- the account page header now shows the authenticated email/role and exposes logout

Current behavior:
- authenticated session -> render `/me/account`
- no session and no local debug fallback -> render `/login`
- local debug `?user_id=` in local/development -> still allows testing the account surface without full login

Verification completed:
- `dcx_app` build passed after the auth shell changes

Still missing:
- password setup/reset UX
- friendlier auth copy
- full route expansion beyond `/me/account`

Immediate next step:
- seed a password credential for a confirmed user and test real app login against the new backend auth routes.
