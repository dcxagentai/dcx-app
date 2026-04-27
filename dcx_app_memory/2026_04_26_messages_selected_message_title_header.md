CONTEXT:
- The Messages detail panel was still showing the generic heading `Selected message` even after the inbox and detail surfaces became polished enough for client review.
- The immediate goal was to replace that placeholder with the actual chosen message title/subject string before the user runs WhatsApp and email smoke tests.

WHAT CHANGED:
- Updated `dcx_app_messages_page.tsx` so both desktop and mobile detail panels derive a real selected-message title from the loaded message detail payload.
- Added `readDcxSelectedMessageTitle(...)` for detail payloads, mirroring the existing inbox title logic:
  - prefer `message_subject`
  - then first attachment filename
  - then raw/derived message text
  - then sensible format fallback labels
- Wired the computed title into:
  - the desktop detail header
  - the mobile sheet title
  - the shared detail inspector props

WHY THIS SHAPE:
- The generic placeholder was still reading like an internal tool label.
- Using the actual title/subject gives immediate human orientation and makes the Messages slice feel more product-real during demos and smoke tests.

VERIFICATION:
- `npm run build` passed for `dcx_site/dcx_app`
- Existing Vite large-chunk warning remains unchanged

FILES:
- `C:\Users\Usuario\Documents\matthew\building\forothers\stephen\dcx\dcx_site\dcx_app\src\components\dcx_app_messages_page.tsx`
