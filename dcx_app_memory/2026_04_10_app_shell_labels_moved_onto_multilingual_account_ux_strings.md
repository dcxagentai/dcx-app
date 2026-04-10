# Context

The refreshed shadcn-based `dcx_app` shell now reads its sidebar, lower user popup, protected page titles, and compact editable-field status labels from the same authenticated `app_account_page` UX-string bundle already used by the account/settings/activity pages.

# What changed

- Extended `src/components/dcx_app_user_account_shared.tsx` with new default keys for:
  - sidebar group and menu labels
  - lower user popup labels
  - protected page titles
  - compact field-state labels
- Updated `src/App.tsx` to read the authenticated account summary in the shell layer and pass `uxStrings` into `DcxAppShell`.
- Updated `src/components/dcx_app_shell.tsx`, `src/components/app-sidebar.tsx`, `src/components/nav-main.tsx`, and `src/components/nav-user.tsx` to consume those strings instead of hardcoded English.
- Updated `src/components/nav-main.tsx` to persist open/closed state by stable internal ids rather than translated titles, so language changes do not reset folder state.
- Updated `src/components/dcx_app_user_settings_page.tsx` so the compact field-state labels come from UX strings too.

# SQL seed

Additive seed file created:

- `dcx_site/dcx_api/storage/dcx_seed_app_shell_multilingual_ux_strings_2026_04_10.sql`

This file seeds the missing `app_account_page` keys in English, Spanish, French, and German without overwriting existing rows.

# Verification

- `dcx_app`: `node_modules/.bin/tsc.cmd -b` passed locally.

# Next

- Paste the new SQL on local and live.
- Confirm the app sidebar, lower popup, page titles, and compact `Editable / Changed, unsaved / Saved / Save failed` labels switch immediately when the user changes preferred language.
- Reuse the same pattern for the `dcx_admin` shadcn shell refit.
