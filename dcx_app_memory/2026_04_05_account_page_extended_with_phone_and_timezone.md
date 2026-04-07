The first `dcx_app` account page now shows phone and timezone in addition to email, language, and communication preference. Phone is currently read-only and displays the stored E.164 number with the channel suffix when present, or `Not set yet` when the account has no verified phone on file.

Timezone is now an inline autosave dropdown using the same border/status progression as the existing editable account rows. The page save helper sends `preferred_timezone_id`, and the account-summary reader now expects `preferred_timezone` plus `available_timezones` in the backend payload.

The account timeline on the right-hand side now formats timestamps with the selected account timezone by passing the IANA timezone into `Intl.DateTimeFormat`, rather than relying on the browser-local timezone. Verification for this frontend step was a successful `npm run build` in `dcx_site/dcx_app`.
