The app surface now owns the password setup/reset UX for the shared DCX auth model.

What was added:
- `src/components/dcx_app_auth_password_request_reset_page.tsx`
- `src/components/dcx_app_auth_password_set_page.tsx`
- supporting libs for:
  - password challenge token capture/normalization
  - reset request submit
  - password completion submit

Routing:
- unauthenticated app routes now include:
  - `/login`
  - `/password/reset/request`
  - `/password/set`
- authenticated users are redirected away from the password/login routes back to `/me/account`

Behavior:
- Forgot-password flow starts from the app login page.
- Password-set page supports both:
  - signup-completion setup
  - forgotten-password reset
- App page does basic password validation before submit:
  - minimum 12 chars
  - confirmation required
- On successful completion the user is redirected back to `/login`

Design choice:
- All password UX lives on app, even for admin users, so there is one canonical password flow and one shared session model.

Verification completed:
- `npm run build` in `dcx_app` passed after the new password pages and route logic were added.
