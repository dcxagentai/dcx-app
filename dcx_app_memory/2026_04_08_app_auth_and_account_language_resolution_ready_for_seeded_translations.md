The app frontend is now ready to render multilingual auth and account UX through the shared backend UX-string system once the DB seed is applied.

Frontend language resolution behavior now is:

- auth pages:
  - prefer `language_code` query param
  - else use stored app language from local storage
  - else default to English
- account page:
  - uses authenticated user `preferred_language`
  - persists that language to local storage for later unauthenticated auth flows

Important auth/app route behavior:

- `/password/reset/request` and `/password/set` preserve language
- password reset/setup links carry `language_code`
- `/login` redirects preserve the resolved language
- account-page dates format using the selected language locale instead of hardcoded English

Remaining operational step after this note:

- run `dcx_site/dcx_api/storage/dcx_seed_app_auth_and_account_multilingual_ux_strings_2026_04_08.sql`
  on local and live databases

Once seeded, the app should show localized UX for:

- login
- forgot-password request
- password-set/reset page
- `/me/account`
