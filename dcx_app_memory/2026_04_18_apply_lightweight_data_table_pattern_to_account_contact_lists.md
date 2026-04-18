# 2026_04_18_apply_lightweight_data_table_pattern_to_account_contact_lists

## Summary
- Added a lightweight app-side TanStack-plus-shadcn table pattern for compact user-facing lists.
- Applied that pattern to the `/me/account` email and phone contact-method sections.

## Files
- `src/components/ui/table.tsx`
- `src/components/ui/dcx_app_data_table.tsx`
- `src/components/dcx_app_user_account_summary_page.tsx`
- `package.json`
- `package-lock.json`

## Implementation notes
- Installed `@tanstack/react-table` in `dcx_app`.
- Created app-local table primitives instead of importing the admin shell directly.
- The app table wrapper intentionally omits:
  - filter bars
  - columns menus
  - pagination footer
- This keeps the user surface lighter while still sharing the same visual table family.

## Account page changes
- Email contact methods now render as a compact table:
  - email
  - status badges
- Phone contact methods now render as a compact table:
  - phone number
  - status badges
  - actions
- The existing add/edit/set-primary behavior remains the same.

## Why this shape
- The account lists are not true admin catalogs, but they should still feel structurally related to the rest of the product.
- This gives us one reusable user-surface list pattern we can later reuse for trades, files, contacts, or notifications.

## What to judge next
- Whether the app tables want slightly softer header styling than admin.
- Whether compact user-facing tables should eventually support optional mobile collapse behavior.
