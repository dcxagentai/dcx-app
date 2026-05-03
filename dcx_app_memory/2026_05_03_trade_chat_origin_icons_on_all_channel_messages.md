CONTEXT:
Added symmetric channel-origin cues in the app trade-chat message timeline during mixed
email/WhatsApp/web-app testing.

CHANGES:
- `src/components/dcx_app_trade_threads_page.tsx` now shows email and WhatsApp origin icons on
  both own and received messages when `source_channel_type` is external.
- Web-app-origin messages remain visually plain so the cue is reserved for cross-surface traffic.

VERIFICATION:
- `node .\node_modules\typescript\bin\tsc -b`
- `node .\node_modules\vite\bin\vite.js build`
