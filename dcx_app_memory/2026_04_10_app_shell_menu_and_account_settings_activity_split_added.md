The `dcx_app` shell polish pass moved from the first generic sidebar experiment into a more DCX-shaped client-demo layout.

What changed:
- kept the direct shadcn sidebar block structure
- replaced the temporary workspace menu with a more DCX-specific placeholder menu:
  - Chats
    - Inbox
    - Humans
    - Agents
  - Trades
    - Market Watch
    - My Trades
  - Contacts
  - Files
    - Documents
    - Images
    - Audio
- updated the lower user popup menu to:
  - Account
  - Subscription
  - Settings
  - Privacy & Security
  - Activity Log

Content split:
- `Account` page now shows identity/account facts only
- `Settings` page now owns:
  - preferred language
  - timezone
  - email communication preference
- `Activity Log` page now owns the former account timeline card

Shell cleanup:
- removed the breadcrumb line
- removed the slug/route pill in the header
- removed the top chip row from the page content
- removed the black "next" card from the old account page

Files:
- `src/components/app-sidebar.tsx`
- `src/components/nav-user.tsx`
- `src/components/dcx_app_shell.tsx`
- `src/components/dcx_app_user_account_summary_page.tsx`
- `src/components/dcx_app_user_settings_page.tsx`
- `src/components/dcx_app_user_activity_log_page.tsx`
- `src/components/dcx_app_user_account_shared.tsx`
- `src/App.tsx`

Verification:
- `npm run build` completed successfully in `dcx_site/dcx_app`
