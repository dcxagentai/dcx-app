# Cross-Surface Trade Thread Routing

Date: 2026-05-01

## What changed

The app settings screen now includes a trader default interaction channel for trade chat notifications. This is the user-facing control that lets a trader decide where private trade chat notifications should go while the web app remains the canonical full conversation view.

Choices:

- App only
- Email
- WhatsApp

## Frontend files

- `src/lib/read_dcx_app_authenticated_user_account_summary.ts`
  - added `default_interaction_channel`
  - added `available_default_interaction_channels`

- `src/lib/save_dcx_app_authenticated_user_account_settings.ts`
  - sends `default_interaction_channel` to the account settings API

- `src/components/dcx_app_user_settings_page.tsx`
  - renders the trade chat notification channel selector
  - saves it with the existing settings save flow

## Current product behavior

Web trade chats continue to be visible and persistent in the app. Email/WhatsApp are now notification and reply surfaces for private trade threads, using explicit `#C...` references in outbound messages and inbound replies.

## Smoke tests

1. Open Settings.
2. Change Trade chat notifications to Email or WhatsApp.
3. Save settings and reload to confirm persistence.
4. In a private trade thread, have the other participant send a message.
5. Confirm the notification arrives on the selected channel.
6. Reply with the `#C...` reference.
7. Confirm the reply appears in the web app conversation.
