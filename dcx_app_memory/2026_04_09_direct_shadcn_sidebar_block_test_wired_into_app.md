We replaced the earlier custom exploratory `dcx_app` shell with a direct shadcn sidebar block test.

What changed:
- installed the real shadcn `sidebar-08` block structure into `dcx_app`
- rewired the app shell to use:
  - `src/components/ui/sidebar.tsx`
  - `src/components/app-sidebar.tsx`
  - `src/components/nav-main.tsx`
  - `src/components/nav-user.tsx`
- removed the earlier custom shell implementation and replaced it with a wrapper that uses:
  - `SidebarProvider`
  - `AppSidebar`
  - `SidebarInset`
  - `SidebarTrigger`
- adapted the block minimally for DCX:
  - DCX logo in the top-left brand slot
  - app route labels and current account route
  - account / payments / security nav items
  - account/logout user footer menu

Intent:
- compare the real shadcn block feel against the earlier custom-adapted shell
- keep the existing account content and app plumbing intact
- give tomorrow's UX polish a clearer directional choice

Verification:
- `npm run build` completed successfully in `dcx_site/dcx_app`
