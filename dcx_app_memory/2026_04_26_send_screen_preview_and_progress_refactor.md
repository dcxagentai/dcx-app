CONTEXT:
This note records the first substantial UX refactor of the authenticated DCX app Send page after the Messages inbox/detail surface became client-presentable.

SUMMARY:
- The old Send screen was functional but visually bare: raw textarea, file chips only, minimal success/error text, and little reassurance while uploads and analysis were in flight.
- The refactor moved the screen toward the same product language as the Messages page without changing the underlying POST contract.

WHAT CHANGED:
- Added a shared shadcn-style textarea component:
  - `dcx_site/dcx_app/src/components/ui/textarea.tsx`
- Refactored:
  - `dcx_site/dcx_app/src/components/dcx_app_send_message_page.tsx`

SEND PAGE IMPROVEMENTS:
- Full-width compose textarea using the shared `Textarea` component.
- Larger, calmer vertical rhythm for message input and action row.
- Selected files now render as stacked attachment cards instead of chips.
- Attachment cards show:
  - filename
  - format label
  - file size
  - per-file status label
  - remove action
- Preview support:
  - image thumbnail preview
  - native audio player preview
  - document/text files remain metadata-only for now
- All controls lock while send is pending:
  - textarea
  - attach button
  - remove buttons
  - file input
  - send button

PROGRESS / COMMENTARY:
- Added a lightweight staged send-state model:
  - `idle`
  - `preparing`
  - `uploading`
  - `processing`
  - `success`
  - `error`
- Added a visible progress/status panel with calm user-facing commentary.
- Added simple per-file status labels:
  - `Ready to send`
  - `Queued`
  - `Uploading`
  - `Attached`
  - `Sent`
  - `Retry needed`
- This is intentionally not byte-accurate upload progress; the current transport is still one `fetch(FormData)` call.

IMPORTANT IMPLEMENTATION NOTES:
- The backend/browser contract is unchanged:
  - `create_dcx_app_authenticated_user_contact_message.ts`
  - still submits one `FormData` payload to `POST /users/me/messages`
- Preview URLs are created with `URL.createObjectURL(...)` and revoked in cleanup.
- The send progress stages are timed UI narration, not backend-reported milestones.

VERIFICATION:
- Frontend build passed:
  - `npm run build`
- Existing Vite large-chunk warning remains unchanged.

NEXT LIKELY POLISH:
- tune card spacing and preview sizing after visual smoke test
- decide whether send success should offer a direct “View in Messages” handoff
- consider whether the status panel should persist slightly longer or reset only on next input
