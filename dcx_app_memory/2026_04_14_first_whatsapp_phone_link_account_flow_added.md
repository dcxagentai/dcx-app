First WhatsApp phone-link UX flow added to the app account page.

What changed:
- `/me/account` now treats phone as an explicit verification flow, not a passive read-only line.
- User can:
  - enter phone number
  - send WhatsApp code
  - resend WhatsApp code
  - enter OTP
  - verify phone
- Existing four-colour field language is reused:
  - editable
  - changed, unsaved
  - saved
  - save failed
- Added confirmed green tick badge helper for identity confirmation states.
- Account summary type now includes:
  - `pending_whatsapp_phone_link`

UX choices:
- Phone editing stays on `Account`, not `Settings`
- No autosave for phone or OTP
- Explicit actions only:
  - `Send code`
  - `Resend code`
  - `Verify`
- Confirmed email and confirmed phone can both show the green tick pattern

Build/verification:
- `tsc -b` passed in `dcx_app`
- full Vite build still hits the known local `esbuild spawn EPERM` issue from this environment

Next likely step:
- light visual polish once the live WhatsApp env/template are in place
- then start surfacing first inbound WhatsApp messages in app screens for the linked user
