The first `dcx_app` account page now reads its user-facing English copy from the backend `ux_strings` payload when available, rather than relying only on inline literals in the component. The page still keeps a local English fallback map so the UI remains stable while the `app_account_page` group is being seeded and polished.

This means the account page can start iterating on real UX-string keys now, and later translations can slot into `stephen_dcx_ux_strings` without another frontend restructuring step. The inline status labels, section headings, field labels, loading/error copy, and next-step callout all now route through the shared UX-string map.

Verification for this frontend step was a successful `npm run build` in `dcx_site/dcx_app`.
