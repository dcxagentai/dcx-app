CONTEXT:
- Email smoke tests showed that long-text synthesis output could be improved by asking Gemini for markdown-style bullet lists.
- The Messages panel was still rendering those list-shaped syntheses as plain text, including literal markdown markers.

WHAT CHANGED:
- Updated `dcx_app_messages_page.tsx` to detect simple markdown bullet lists and render them as actual HTML unordered lists.
- The lightweight parser:
  - converts escaped `\\n` and `\\r\\n` sequences into real line breaks
  - detects lines beginning with `- ` or `* `
  - renders two or more detected bullets as a list
  - falls back to normal prose rendering otherwise
- Reused the same display helper for:
  - message-level detail blocks
  - attachment analysis blocks

WHY THIS SHAPE:
- It improves readability immediately for synthesis content without introducing a full markdown renderer.
- It preserves current prose behavior for non-list values.

VERIFICATION:
- `npm run build` passed for `dcx_site/dcx_app`
- Existing Vite large-chunk warning remains unchanged

FILES:
- `C:\Users\Usuario\Documents\matthew\building\forothers\stephen\dcx\dcx_site\dcx_app\src\components\dcx_app_messages_page.tsx`
