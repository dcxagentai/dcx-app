Messages Surface First Vertical Slice

Date
- 2026-04-21

What shipped
- Replaced the old placeholder `Chats`/`Files` idea with a real `Messages` navigation family:
  - `Messages`
  - `Text`
  - `Images`
  - `Audio`
  - `Documents`
- Added the first authenticated `Messages` page and wired it into `App.tsx`.
- Added app request libs for:
  - authenticated Messages inbox read
  - authenticated message create

First UX scope
- This is the first real intake surface, not a full messaging product yet.
- The page currently supports:
  - composing one text message in-app
  - seeing that message persist
  - seeing the first derivation pass
  - seeing message status and detected language
  - seeing a selected-message detail pane with raw and derived text
- The sub-routes already exist for:
  - `/me/messages`
  - `/me/messages/text`
  - `/me/messages/images`
  - `/me/messages/audio`
  - `/me/messages/documents`
- For now the underlying backend content is text-first, so the other filters are structurally present but mostly placeholders for future channel/media work.

Design/system choices
- Kept the list surface on the existing shared TanStack + shadcn-style table shell (`DcxAppDataTable`) rather than inventing a second layout pattern.
- Used simple inline filter pills inside the page instead of introducing new tab primitives, because the app workspace does not currently have shared `tabs`/`badge` primitives committed.
- Kept the overall presentation aligned with the current account/activity pages:
  - white panel cards
  - light shadows
  - compact uppercase section labels
  - narrow, deliberate copy

What this proves
- Traders can now see the beginning of the real omnichannel intake idea on the app surface.
- The app is no longer only an account/settings shell; it now exposes the first trading-adjacent workflow boundary:
  - send a message
  - store it
  - derive text/language
  - inspect it immediately

What comes next
- Make the filter pills route-aware/clickable inside the page if we want tighter local navigation.
- Add richer message detail once attachments land.
- Add WhatsApp/email-originated messages to the same inbox.
- Add image/audio/document rendering once the backend ingest is wired.
- Add the next classification layer only after the raw/derived intake pipeline is stable.
