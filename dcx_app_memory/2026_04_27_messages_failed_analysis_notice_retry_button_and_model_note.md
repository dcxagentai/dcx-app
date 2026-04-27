Context
- The Messages surface could show rows with `processing_status = failed` / `analysis_status = failed` after the app message itself had already been accepted and stored.
- That created an awkward UX gap: the message existed, but the user only saw a generic failed badge with no direct recovery action.

What changed
- Added a failed-analysis notice block to the message detail pane in:
  - `src/components/dcx_app_messages_page.tsx`
- The notice explains that the LLM/AI analysis step did not complete and exposes a retry button.
- Added frontend retry client:
  - `src/lib/retry_dcx_app_authenticated_user_message_analysis.ts`
- The retry button calls:
  - `POST /users/me/messages/{message_id}/retry-analysis`
- Added a small analysis model note in the message detail header when `analysis_model_name` is present.
- Adjusted failed status labeling so `analysis_status = failed` reads more explicitly as `Analysis failed` instead of only the broader `Failed`.

UX string additions
- Added new defaults (frontend and backend) plus SQL seed rows for:
  - `messages_detail_analysis_model_label`
  - `messages_detail_analysis_failed_title`
  - `messages_detail_analysis_failed_body`
  - `messages_detail_retry_analysis_button`
  - `messages_detail_retry_analysis_pending`
  - `messages_status_analysis_failed`

Verification
- App build passed after wiring the new retry props through both desktop and mobile detail inspector paths.

Follow-up
- The Send page still treats `ok: true` create responses as success even when `context.operation = message_created_failed`.
- If we want a fuller polish pass later, we can add an amber post-send warning on the Send page for “message stored, analysis failed” without changing the transport contract again.
