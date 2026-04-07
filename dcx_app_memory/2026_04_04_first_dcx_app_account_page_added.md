The first real `dcx_app` surface now replaces the old hello-world shell.

Files added:
- `src/lib/read_dcx_app_authenticated_user_account_summary.ts`
- `src/components/dcx_app_user_account_summary_page.tsx`
- `public/_redirects`

Files updated:
- `src/App.tsx`

What the first app page does:
- Renders the first read-only account page for the user app
- Uses TanStack Query to fetch `GET /users/me/account-summary`
- Reads an optional temporary local debug `?user_id=` from the browser URL
- Displays compact account information:
  - primary email
  - confirmation state
  - user UUID
  - account status
  - preferred language
  - email communication preference
  - created / updated / last seen timestamps

Design direction used:
- minimalist
- compact
- business / premium
- closer to a professional internal tool than to a marketing page

Routing note:
- No full client router was introduced yet because this first slice only needs one meaningful surface.
- `public/_redirects` now contains:
  - `/* /index.html 200`
- This ensures static hosting can serve `/me/account` cleanly instead of only working through local Vite dev fallback behavior.

Local test path:
- `http://localhost:5173/me/account?user_id=1`

Verification:
- `npm run build` passed in `dcx_app`
- packaged `dist/` contains `_redirects`

Why this shape was chosen:
- It is the smallest credible app surface using the agreed stack:
  - React
  - TanStack Query
  - shadcn
  - Tailwind
- It avoids overbuilding routing, settings editing, or auth UI before the auth layer exists.
- It gives the next auth phase a real protected destination page instead of a speculative placeholder.

Next most natural app step:
- connect the same page to real authenticated identity instead of temporary `?user_id=`
- then add a lightweight app navigation shell around it
