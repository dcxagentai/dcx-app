# Send Outcome Flow Polish

Date: 2026-04-30

Slice 1 UX polish added a post-send outcome receipt on the authenticated app Send surface.

Implemented behavior:
- The Send progress trail now includes workflow routing and output readiness after the initial message processing pass.
- Successful send outcomes remain visible instead of clearing after a few seconds, so traders and investors can click through.
- The Send success panel links directly to the created message, plus any created trade candidates or market topics.
- Added clean app routes for direct message and topic inspection:
  - `/me/messages/:messageId`
  - `/me/topics/:marketTopicId`
- Existing clean trade route remains:
  - `/me/trades/:tradeId`

Files touched:
- `src/components/dcx_app_send_message_page.tsx`
- `src/App.tsx`
- `src/components/dcx_app_messages_page.tsx`
- `src/components/dcx_app_market_topics_page.tsx`

Verification:
- `tsc -b` passed.
- `npm run build` passed outside the sandbox after Vite/esbuild hit a sandbox spawn permission error.

Notes:
- The next polish pass should judge the human labels during smoke tests for trade, market topic, other, prohibited, and mixed messages.
- Attachment-only routing context still needs the backend workflow prompt context improvement discussed in the Slice 1 thread.
