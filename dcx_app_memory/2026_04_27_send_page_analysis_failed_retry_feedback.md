CONTEXT:
- The Messages page already had a good failed-analysis recovery path:
  - explicit `Analysis failed` status
  - detail warning panel
  - retry-analysis button
  - minor model note
- The Send page still looked like a pure success when the underlying message had been stored but the LLM pass had failed.

WHAT CHANGED:
- `dcx_app_send_message_page.tsx` now tracks the last created message detail returned from the backend create route.
- The Send flow now treats `payload.context.operation === "message_created_failed"` or `payload.data.analysis_status === "failed"` as a dedicated `analysis_failed` state.
- The Send progress panel now supports:
  - amber failed-analysis presentation
  - `LLM call failed` message
  - retry-analysis button
  - pending retry label
  - small analysis-model note when available
- The Send page reuses the existing retry client:
  - `retry_dcx_app_authenticated_user_message_analysis.ts`
- No new UX string keys were needed for this pass because the Send screen reuses the same analysis-failure strings already introduced for the Messages detail pane.

WHY:
- A stored message and a failed analysis are different outcomes, and the UI now tells the truth about that distinction.
- This makes the app much more legible during transient provider failures such as Gemini 503s.

VERIFICATION:
- `npm run build` passed after the Send-state refactor.
- Live user feedback already confirmed the retry path in Messages works; this pass extends the same recovery semantics to Send.

FOLLOW-UP IDEA:
- If desired later, Send can get dedicated compose-specific analysis-failure copy instead of reusing the Messages-detail strings, but that was intentionally deferred to keep this pass small.
