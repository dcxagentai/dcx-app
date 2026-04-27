Context
- We refined the authenticated DCX app Send page so in-flight message work no longer appears as one changing spinner line.
- The goal was to make progress feel real and legible for traders sending text-only or mixed-media messages, especially when AI analysis later succeeds, fails, or is retried.

What changed
- Updated `dcx_app_send_message_page.tsx`.
- Added a persistent progress-step trail to the existing Send progress panel.
- The trail uses existing stage state (`preparing`, `uploading`, `processing`, `success`, `analysis_failed`, `prohibited`, `error`) instead of inventing deeper backend progress we do not truly track.
- Each step remains visible as the send progresses, with `1/n` indexing, matching the user request for a small sequence of useful, cumulative status markers.

Behavior shape
- Text-only sends now show:
  - preparing
  - processing
  - final outcome
- Sends with attachments now show:
  - preparing
  - uploading
  - processing
  - final outcome
- Final outcome can render as:
  - success
  - prohibited content
  - analysis failed
  - generic send error
- While retry-analysis is pending, the trail shifts focus back onto the processing step instead of leaving the final step stuck in a failed visual state.

Design choices
- Reused existing UX strings rather than adding another batch of translation keys for this pass.
- Kept the progression honest: no per-file upload counts or fake micro-steps.
- Left the top commentary card in place and layered the persistent checklist under it, so we improve confidence without blowing up the existing layout.

Verification
- `npm run build` passed after rerunning outside the sandbox because `esbuild` hit the usual Windows `spawn EPERM` sandbox limitation.
- Same existing Vite large-chunk warning only.

Likely next follow-up
- If we later classify Gemini/provider errors more specifically, the final progress step can distinguish:
  - provider overloaded / retryable
  - auth/config problem
  - parse/output failure
  - generic analysis failure
- That would fit naturally into this new step-trail UI without another structural refactor.
