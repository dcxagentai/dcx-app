Account inline-edit polish for `dcx_app` now keeps editable fields in their natural table rows inside the identity card rather than in separate top-level cards. This matches the intended compact premium account surface and keeps the read/write affordance attached to the actual account fields.

Preferred language no longer exposes a "No preference" UI path. If a legacy user record has `preferred_language_id = null`, the page now auto-selects the default language from the backend-provided ordered language list and autosaves it immediately. The row control itself only offers concrete languages from `available_languages`.

Verification for this polish was a successful `npm run build` in `dcx_site/dcx_app` after the cleanup pass.
