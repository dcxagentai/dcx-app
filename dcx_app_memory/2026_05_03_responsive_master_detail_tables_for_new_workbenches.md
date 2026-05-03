# 2026-05-03 - Responsive Master Detail Tables For New Workbenches

## Context
After testing the new app menu surfaces on real devices, we aligned the newer master-detail pages
with the Messages workbench pattern.

## What Changed
- Added shared layout hooks for DCX app master-detail screens:
  - `useDcxAppDetailSheetMode`
  - `useDcxAppBalancedDesktopSplitMode`
- Applied the Messages-style responsive pattern to:
  - Market Topics
  - Trade Chats
  - Trades
  - Market Deals
  - Market Forum
- Narrow and tablet widths now keep the TanStack/shadcn table as the primary surface and open the
  selected detail panel in a shadcn Sheet.
- Detail Sheets for Messages and the new workbench pages now open at 90vw on narrow/tablet widths
  so trade forms and detail inspectors have more room on real devices.
- Desktop widths keep the resizable split layout, with balanced halves on medium desktop widths and
  the existing wider table/detail proportions on larger desktop widths.

## Files Changed
- `src/components/use_dcx_app_master_detail_layout_mode.ts`
- `src/components/dcx_app_market_topics_page.tsx`
- `src/components/dcx_app_trade_threads_page.tsx`
- `src/components/dcx_app_trades_page.tsx`
- `src/components/dcx_app_market_deals_page.tsx`
- `src/components/dcx_app_market_forum_page.tsx`
- `src/components/dcx_app_messages_page.tsx`

## Verification
- `node .\node_modules\typescript\bin\tsc -b`
- `node .\node_modules\vite\bin\vite.js build`

## Local Device Test Server
The Vite dev server is running at:

- Local: `http://localhost:5175/`
- Network: `http://192.168.1.59:5175/`

Vite selected port `5175` because `5173` and `5174` were already occupied.
