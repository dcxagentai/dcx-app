The app settings surface is now aligned with the new backend email preference model.

Summary:
- the editable settings page now initializes newsletter preference state with `newsletters` instead of the retired `announcements` value
- shared settings copy now refers to newsletters and promotional email rather than announcement preferences

Why this matters:
- the backend schema and account-settings capability now use `no_email`, `newsletters`, and `all_email`
- leaving the app UI on the old value would have caused failed saves or stale state as soon as users edited the field

Files changed:
- `src/components/dcx_app_user_settings_page.tsx`
- `src/components/dcx_app_user_account_shared.tsx`

Recommended next step:
- once unsubscribe routes and sequence sends exist, expand the settings copy/options descriptions so the three levels read more explicitly from a user point of view
