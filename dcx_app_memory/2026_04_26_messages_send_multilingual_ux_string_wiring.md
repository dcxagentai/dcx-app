CONTEXT:
Wired the remaining Messages and Send surface strings onto the shared UX-string bundle and extended the multilingual SQL seed for the MVP languages.

SUMMARY:
- Removed the last meaningful frontend hardcoded labels from the Messages and Send surfaces for:
  - language/channel/filter labels
  - show/hide toggles
  - download label
  - attachment analysis section labels
  - format labels
  - send progress commentary
  - selected-file count labels
  - send attachment status labels
  - message/attachment fallback titles
- Extended the SQL seed file with the corresponding `app_account_page` keys for:
  - `en`
  - `es`
  - `fr`
  - `de`

FILES:
- `C:\Users\Usuario\Documents\matthew\building\forothers\stephen\dcx\dcx_site\dcx_app\src\components\dcx_app_messages_page.tsx`
- `C:\Users\Usuario\Documents\matthew\building\forothers\stephen\dcx\dcx_site\dcx_app\src\components\dcx_app_send_message_page.tsx`
- `C:\Users\Usuario\Documents\matthew\building\forothers\stephen\dcx\dcx_site\dcx_app\src\components\dcx_app_user_account_shared.tsx`
- `C:\Users\Usuario\Documents\matthew\building\forothers\stephen\dcx\dcx_site\dcx_api\storage\dcx_seed_app_messages_and_send_multilingual_ux_strings_2026_04_26.sql`

VERIFICATION:
- `npm run build` passed for `dcx_site/dcx_app`
- Same existing Vite large chunk warning only

NEXT:
- Rerun the SQL seed locally and live via `psql`
- Refresh the app with each MVP language to confirm no remaining English strings on the Messages/Send slice
