The first sidebar-based shell has been added to `dcx_app` as a low-risk UX polish starting point before applying the same pattern to `dcx_admin`.

Files:
- `src/components/dcx_app_shell.tsx`
- `src/App.tsx`
- `src/components/dcx_app_user_account_summary_page.tsx`

What changed:
- authenticated app routes now render inside a dedicated shell component instead of directly into the old full-page account layout
- the shell includes:
  - desktop sidebar
  - mobile slide-in navigation
  - top header bar
  - simple workspace hero strip
  - current user badge
  - logout controls
- navigation is intentionally minimal for now:
  - Account (active)
  - Payments (coming soon)
  - Security (coming soon)
- the account page was trimmed so it behaves like page content inside the shell rather than a second nested full-screen app
- existing account data/edit logic was intentionally left intact

Verification:
- TypeScript build passed with `tsc -b`
- full `npm run build` could not be completed in this environment because the local Vite/esbuild process hit the same existing `spawn EPERM` issue seen earlier

Intent:
- prove the shell, spacing, density, sidebar behavior, and general layout language on the simpler `dcx_app` surface first
- if the user likes the direction, adapt the same shell pattern into `dcx_admin` next
