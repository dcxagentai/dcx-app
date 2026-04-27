CONTEXT:
This note records the Messages-app title fallback improvement made alongside the WhatsApp multi-image cleanup.

SUMMARY:
- Inbox rows and detail headers previously fell back to generic labels such as `Image`, `Document`, `Message`, or `Attachment`.
- For WhatsApp image messages this made individually-processed image rows feel vague and slightly broken.
- We now include attachment summary text in the inbox payload and use it as a title fallback when the filename is empty or generic.

FILES CHANGED:
- `C:\Users\Usuario\Documents\matthew\building\forothers\stephen\dcx\dcx_site\dcx_app\src\lib\read_dcx_app_authenticated_user_messages_inbox.ts`
- `C:\Users\Usuario\Documents\matthew\building\forothers\stephen\dcx\dcx_site\dcx_app\src\components\dcx_app_messages_page.tsx`

TITLE FALLBACK ORDER NOW:
1. `message_subject`
2. first attachment display title
   - real filename if non-generic
   - otherwise a summary-driven title from `analysis_summary_text`
3. message raw/derived text
4. format fallback (`Audio message`, `Image`, `Document`, `Message`)

ATTACHMENT CARD TOP LINE NOW:
- Uses the same attachment display-title logic.
- If WhatsApp gives us no original filename, the card can still show a human-readable title derived from the attachment summary.

NOTES:
- This pass intentionally did not add a new prompt field for image title.
- We reused the existing attachment summary/description contract instead of widening the schema again.
- The summary-driven title stripper currently removes simple boilerplate such as:
  - `This image shows ...`
  - `This image displays ...`
  - `The image depicts ...`
- If needed later, this can be tuned further for better short titles.

TEST / VERIFY:
- App build passed after the title fallback changes.
- The main user-facing goal is that WhatsApp image rows no longer just read as `Image` unless there is genuinely nothing else to use.
