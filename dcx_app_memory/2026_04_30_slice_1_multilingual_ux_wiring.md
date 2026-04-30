CONTEXT:
Slice 1 message workflow, trades, and topics surfaces were polished for investor presentation and then wired through the existing `app_account_page` UX-string bundle.

WHAT CHANGED:
- The Send progress trail now uses a separate final prohibited label: `messages_compose_progress_message_blocked_title` = "Message blocked".
- Send workflow routing labels, outcome links, and routed summaries now read from `ux_strings`.
- Messages workflow item panel labels now read from `ux_strings`.
- Trades table, trade form, save-state block, version history, and common trade dropdown labels now read from `ux_strings`.
- Topics table, topic filters, and topic detail labels now read from `ux_strings`.
- Frontend fallback defaults were added in `dcx_app_user_account_shared.tsx`.
- Backend fallback defaults were added in `users/account/read_dcx_app_account_page_ux_strings.py`.

VERIFICATION:
- `npm run build` passed for `dcx_site/dcx_app` after allowing Vite/esbuild to spawn outside the sandbox.
- `py_compile users/account/read_dcx_app_account_page_ux_strings.py` passed after allowing the repo-local Python interpreter outside the sandbox.

NOTES:
- The SQL seed for the new keys should be run locally and live before investor demos so non-English users do not fall back to English on the new Slice 1 surfaces.
- Existing domain values extracted by the LLM, such as material names, tags, locations, and raw trade text, remain data rather than UX strings.
