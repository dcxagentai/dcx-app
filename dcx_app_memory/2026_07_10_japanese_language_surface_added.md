CONTEXT:
On 2026-07-10, the user app gained Japanese route and language-flag support.

CHANGE:
- Added `ja -> JP` to `src/lib/dcx_app_language_flag_options.ts`.
- Expanded `src/lib/dcx_app_language_preference.ts` supported auth route codes from the original
  four-language auth set to the current core multilingual set:
  `en`, `fr`, `de`, `es`, `pt`, `ru`, `tr`, `ar`, `hi`, `ur`, `id`, `zh`, `ja`, `vi`.
- Added locale formatting mappings for the expanded language set, including `ja-JP`.

WHY:
- Public Japanese pages should be able to link to `/ja/t/login` without the app treating the
  language as unsupported.
- The authenticated user language dropdown remains database-driven through `available_languages`,
  so adding the backend language row makes Japanese appear there once the API is deployed and seeded.

CHECKS:
- `npm run build` passed for `dcx_app`.
