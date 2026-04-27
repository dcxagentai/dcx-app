Context
- We saw a mid-width desktop overflow bug on the Messages screen detail pane.
- The bug appeared when opening the attachments section for some WhatsApp image-derived messages.
- Very wide desktop and mobile sheet layouts were fine.

What we learned
- The problem was not the image preview itself.
- It was not the selected-message title `h3`.
- It was the long AI-generated fallback title being used in the collapsed attachment-card header row.
- The issue reproduced most obviously on WhatsApp image messages because generic filenames like `Image` triggered our summary-derived title fallback.
- The user confirmed in DevTools that shortening the attachment-card header `<p>` text removed the overflow.

Fix
- Added `readDcxAttachmentCollapsedCardTitle(...)` in:
  - `C:\Users\Usuario\Documents\matthew\building\forothers\stephen\dcx\dcx_site\dcx_app\src\components\dcx_app_messages_page.tsx`
- The helper truncates the attachment-card header title to a compact length before render.
- Kept the fuller attachment display title for the rest of the UI, including image alt text.
- Removed the temporary page-level `document.body/documentElement overflowX = "hidden"` effect because it was only a bandage.

Why this was the right fix
- The attachment-card header is effectively a filename slot, not a full semantic summary block.
- Truncating at the string level is more reliable than trying to force the browser to ignore intrinsic width from a very long generated string.
- This is a local fix for the actual cause, rather than more global overflow containment.

Verification
- Frontend build passed with:
  - `npm run build`
- Existing Vite large chunk warning still present and unchanged.
