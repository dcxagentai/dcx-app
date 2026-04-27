## 2026-04-22 Messages Multimedia First Pass Surface

### Context
- The app Messages page already showed text intake from app, email, and WhatsApp.
- This pass upgrades the user surface so attachments are visible and app-authored file uploads flow through the same backend system.

### What Changed
- The composer now sends multipart form data with:
  - `message_text`
  - repeated `message_files`
- The page now keeps a selected-file list before submit.
- The right-hand detail pane now loads the real detail endpoint instead of relying only on inbox row data.
- Attachment cards now render in the detail pane with:
  - image preview
  - audio player
  - open-attachment link

### UX Copy
- Updated UX strings to explain:
  - file attachments are available
  - 5 MB per file limit
  - first supported types are image/audio/document

### Verification
- Production build passed:
  - `npm run build`

### Known Gaps
- No drag/drop uploader yet.
- No per-file remove button before submit yet.
- No inline PDF/docx viewer yet beyond open-link behavior.
- No real attachment derivation or classification yet.
