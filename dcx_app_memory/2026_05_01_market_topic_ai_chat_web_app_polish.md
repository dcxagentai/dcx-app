CONTEXT:
On 2026-05-01, after the first working web-app market topic AI chat mini-slice, we polished two interaction issues found during local testing.

WHAT CHANGED:
- The Topics table selection no longer gets blocked after loading a clean topic route such as `/me/topics/9`.
- The route topic id is now applied only when the route id changes, instead of being re-applied on every render.
- The topic AI chat composer now renders the user's submitted turn immediately.
- While the backend/Gemini response is pending, the UI displays a temporary `DCX AI is thinking...` assistant turn.
- If the append request fails, the submitted text is restored to the textarea so the trader can retry without losing it.

CURRENT BOUNDARY:
- This chat mini-slice is web-app only.
- WhatsApp and email can create topics and send users to topic links, but they do not yet continue the topic AI chat by replying to an email or WhatsApp thread.

VERIFICATION:
- `node node_modules/typescript/bin/tsc -b` passed in `dcx_site/dcx_app`.
- `npm run build` passed in `dcx_site/dcx_app` with the existing large bundle warning.

NEXT:
- Wire email and WhatsApp inbound replies to existing topics using explicit topic/thread references and the same stored turn model.
- Add cross-surface routing and outbound response formatting once the web-app chat behavior is stable.
