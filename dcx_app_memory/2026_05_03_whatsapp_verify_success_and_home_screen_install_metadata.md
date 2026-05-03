# 2026-05-03 - WhatsApp Verify Success And Home Screen Install Metadata

## Context
Investor device testing surfaced two small app polish issues:

- The WhatsApp phone-link landing page still looked like it was verifying after the phone had been
  confirmed.
- Adding the app to a phone home screen used the old bootstrap title and a default-looking icon.

## What Changed
- Updated the WhatsApp phone verification page so states are explicit:
  - loading: `Connect WhatsApp phone`
  - success: `WhatsApp phone verified`
  - error: `WhatsApp phone not verified`
- Success now shows a confirmed message and waits 3 seconds before redirecting:
  - authenticated users return to `/me/account`
  - unauthenticated users return to localized sign-in
- Updated app install metadata:
  - title/application name/apple mobile web app title now use `DCX`
  - manifest added at `/manifest.webmanifest`
  - home-screen icon uses the DCX logo at `/dcx-home-icon.png`

## Files Changed
- `index.html`
- `public/dcx-home-icon.png`
- `public/manifest.webmanifest`
- `src/components/dcx_app_whatsapp_phone_verify_page.tsx`

## Verification
- `node .\node_modules\typescript\bin\tsc -b`
- `node .\node_modules\vite\bin\vite.js build`

