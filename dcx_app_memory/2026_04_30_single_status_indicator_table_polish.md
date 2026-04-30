CONTEXT:
On 2026-04-30 we simplified Messages and Trades table rows so each row has one clear status indicator.

SUMMARY:
- Updated `src/components/dcx_app_messages_page.tsx`.
- Updated `src/components/dcx_app_trades_page.tsx`.
- Removed row-body `Action needed`, `Needs review`, `Review failed`, and `Needs routing` style pills from the Messages table summary badges.
- Kept Messages row badges for classification metadata only: trade, topic, other, item count.
- Changed Messages table status logic so ready messages with workflow attention show one amber circular `!` instead of a green tick.
- Removed the Trades table row-body `Action needed` pill.
- Changed Trades `State` column to one circular status indicator:
  - green tick when the trade is confirmed and open
  - amber exclamation when attention is needed or the trade is not yet fully ready

VERIFICATION:
- Ran `npm run build` from `dcx_site/dcx_app` using the installed Node/npm path.
- Build completed successfully. Vite still reports the existing large chunk warning.

WHAT COMES NEXT:
- Browser-review Messages and Trades with smoke-test data to confirm the status semantics match trader expectations.
