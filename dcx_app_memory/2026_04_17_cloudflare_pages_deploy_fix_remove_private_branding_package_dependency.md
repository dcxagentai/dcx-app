Cloudflare Pages production deploys for `dcx_app` were failing before the build step because `npm clean-install` could not authenticate to GitHub Packages for the private dependency `@prompteoai/dcx-branding@0.0.6`. The failure happened consistently across multiple commits and surfaced as `npm ERR! code E401` when Pages tried to fetch `https://npm.pkg.github.com/...`.

To remove the deployment dependency on private package registry auth, the app was made self-contained:

- removed `@prompteoai/dcx-branding` from `dcx_app/package.json`
- updated `package-lock.json` via `npm uninstall`
- removed the app-level `.npmrc` that pointed the `@prompteoai` scope to GitHub Packages
- copied `dcx_logo.png` into `dcx_app/src/assets/dcx_logo.png`
- added `src/styles/dcx_app_local_branding_theme.css` mirroring the shared branding package theme tokens
- changed `src/index.css` to import the local branding theme
- changed all app logo imports to use the local asset alias path

This keeps the deployed app visually identical enough for now while allowing Cloudflare Pages to install only public npm dependencies. The shared branding repo still exists as the upstream source of branding decisions, but `dcx_app` no longer requires GitHub Packages auth just to build in production.

Local verification after the fix:

- `npx tsc -b` passed in `dcx_app`
- searching the app repo no longer finds `@prompteoai/dcx-branding` or `npm.pkg.github.com` references in tracked files that affect install/build

If later we want to restore shared-package branding in CI/CD, we can do that properly by configuring Cloudflare Pages with registry tokens and a Pages-compatible `.npmrc`. For now, removing the private install dependency is the safer route to unblock production deploys quickly.
