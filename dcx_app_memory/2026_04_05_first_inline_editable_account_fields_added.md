The first editable `dcx_app` account surface is now in place.

Files added:
- `src/lib/save_dcx_app_authenticated_user_account_settings.ts`

Files updated:
- `src/lib/read_dcx_app_authenticated_user_account_summary.ts`
- `src/components/dcx_app_user_account_summary_page.tsx`

What changed:
- The account page is no longer read-only.
- Two low-risk fields are now inline-editable with autosave:
  - preferred language
  - email communication preference
- Primary email stays read-only for now.

Interaction model implemented:
- blue border:
  - editable / idle
- orange border:
  - editing or saving in progress
- green border:
  - save succeeded
- red border:
  - save failed after retries
- save failure retries automatically up to 3 times before settling into red
- while saving is in progress, the editable controls are disabled
- each editable box shows a small status line:
  - editing
  - saving
  - retrying
  - saved
  - failed

Why this shape was chosen:
- The user wanted the CRUD phase to feel direct and buttonless.
- This proves the field-state feedback model before broader CRUD and auth are added.
- It avoids the complexity of email-change verification while still giving the account page meaningful editable behavior now.

Local testing path:
- `http://localhost:5173/me/account?user_id=5`

What to look for while testing:
- click the preferred-language box:
  - it turns orange and becomes a select
  - choosing a value triggers autosave
  - the box briefly turns green on success
- click the email-preference box:
  - same behavior
- refresh the page:
  - saved values should persist from the backend

Verification:
- `npm run build` passed in `dcx_app`

Next most natural app step:
- judge the inline-save UX locally
- then add the first verified email-change flow and, later, phone capture on top of the same visual save-state model
