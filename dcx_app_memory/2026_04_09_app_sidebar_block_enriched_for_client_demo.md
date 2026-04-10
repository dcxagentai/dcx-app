We expanded the direct shadcn sidebar block test in `dcx_app` so tomorrow's client review can see a more interesting workspace shell instead of a flat one-link sidebar.

Changes:
- kept the real shadcn sidebar block structure
- added nested workspace navigation in `nav-main.tsx`
  - Account
    - Overview
    - Preferences
    - Communication
  - Operations (soon)
    - Inbox
    - Deal rooms
    - Tasks
  - Security (soon)
    - Sessions
    - Devices
    - Alerts
- enabled the generated `NavProjects` block as a DCX-flavored "Workstreams" section
  - Physical trading
  - Counterparties
  - Compliance
- enabled the generated `NavSecondary` block as utility navigation
  - Inbox
  - Release notes
  - Help

Intent:
- show the client a more mature SaaS-style shell
- preserve the current real route and plumbing
- keep unreleased sections clearly placeholder-level while still demonstrating the layout system

Verification:
- `npm run build` completed successfully in `dcx_site/dcx_app`
