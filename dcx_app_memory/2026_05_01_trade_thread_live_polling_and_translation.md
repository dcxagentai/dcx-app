# 2026-05-01 Trade Thread Live Polling And Translation

## What changed
- Trade Chats detail now refetches every 2 seconds while selected, so the other participant's replies appear quickly without a manual reload.
- Trade Chats catalog now refetches every 5 seconds.
- The message bubble renders `display_message_text`, which lets the backend choose the authenticated user's translated display variant.
- The sidebar item under My was shortened from `Trade Chats` to `Chats`.

## Current behavior
- Sender still gets an immediate optimistic bubble.
- Recipient sees new messages on the next detail refetch.
- Translated messages show a small "Translated from ..." note.

## Verification
- `npm run build` passed with the existing Vite large chunk warning only.
