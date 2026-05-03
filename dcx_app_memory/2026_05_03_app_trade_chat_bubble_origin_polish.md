# 2026-05-03 - App Trade Chat Bubble Origin Polish

## Context
We polished the trade chat conversation view while testing cross-surface web and WhatsApp replies on
real devices.

## What Changed
- Reduced the message meta row visual weight by using a smaller 11px uppercase line with tighter
  letter spacing.
- Changed sent, received, and optimistic pending message bubbles from content-sized `max-w-[82%]`
  cards to fixed `w-[82%]` cards, so message blobs on the same side line up consistently.
- Added a compact received-message source icon in the meta row for provider-origin replies:
  - WhatsApp replies use a green message-circle icon.
  - Email replies use a blue mail icon.
  - App-origin messages stay visually quiet.

## Files Changed
- `src/components/dcx_app_trade_threads_page.tsx`

## Verification
- `node .\node_modules\typescript\bin\tsc -b`
- `node .\node_modules\vite\bin\vite.js build`

The normal `npm run build` command could not be used in this local shell because the global npm shim
points to a missing `npm-cli.js`; direct TypeScript and Vite execution passed.

