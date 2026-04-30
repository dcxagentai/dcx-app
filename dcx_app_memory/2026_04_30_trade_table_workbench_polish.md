CONTEXT:
On 2026-04-30 we polished the authenticated app Trades list so Slice 1 structured trade candidates read as a trader workbench rather than a raw row dump.

SUMMARY:
- Updated `src/components/dcx_app_trades_page.tsx`.
- Mirrored the Messages table control stack: search, count, refresh, dropdown filters, TanStack sorting arrows, row highlighting, paging, and shadcn controls.
- Reframed table columns around useful trade snapshots:
  - Trade
  - Terms
  - Route
  - State
  - Updated
- Added filters for side, confirmation status, trade status, and material.
- Kept the trade detail/edit/version panel logic unchanged.

VERIFICATION:
- Ran `npm run build` from `dcx_site/dcx_app` using the installed Node/npm path.
- Build completed successfully. Vite still reports the existing large chunk warning.

WHAT COMES NEXT:
- Review in the browser with live local data to tune column widths and label wording.
- If the table needs incoterm/shipping/source-channel filtering, add those fields to the trades catalog API rather than guessing from detail-only data.
