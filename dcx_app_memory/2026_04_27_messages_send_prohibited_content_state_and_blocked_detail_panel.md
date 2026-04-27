DCX App prohibited-content MVP surface

Date: 2026-04-27

Summary
- Added a first prohibited-content UI state for Messages and Send.
- The goal is to show clients that hostile/unstructured inbound content is already considered in the message flow.

Messages surface changes
- Inbox rows now read moderation metadata from `analysis_metadata_json`.
- Prohibited messages:
  - show a dedicated prohibited status badge instead of generic failed-analysis
  - use a safe fallback title (`Prohibited content`)
  - do not show original text, synthesis, or attachments
  - render a blocked-content panel with:
    - prohibited title/body
    - any matched prohibited reason codes
- Analysis-failed retry behavior remains separate from prohibited behavior.

Send surface changes
- Added a `prohibited` send stage distinct from:
  - `success`
  - `analysis_failed`
  - `error`
- If create returns a detail payload whose moderation metadata is prohibited:
  - Send shows prohibited-content feedback instead of a clean success panel
  - no retry-analysis button is shown in that state

Strings added
- `messages_compose_progress_prohibited_title`
- `messages_compose_progress_prohibited_body`
- `messages_detail_prohibited_title`
- `messages_detail_prohibited_body`
- `messages_detail_prohibited_reasons_label`
- `messages_status_prohibited`
- `messages_title_fallback_prohibited`

Seed file updated
- `dcx_api/storage/dcx_seed_app_messages_and_send_multilingual_ux_strings_2026_04_26.sql`

Verification
- App build passed after the changes.
