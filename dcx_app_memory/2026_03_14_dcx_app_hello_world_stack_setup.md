## 2026-03-14 DCX App Hello World Stack Setup

### Summary
Set up the first working `dcx_app` frontend hello-world inside the repo root while preserving:
- `.git`
- `AGENTS.md`
- `dcx_app_memory/`
- `dcx_app_scratchpads/`

The repo root is now the actual user app root.

### What Was Installed
- React via Vite
- TypeScript
- TanStack Query
- shadcn
- Tailwind CSS

### Practical Outcome
The user app frontend now has:
- `package.json`
- `src/`
- `public/`
- Vite config
- Tailwind / shadcn configuration
- one minimal hello-world app screen
- one shadcn button component
- TanStack Query provider wiring

### Verification
Confirmed working with:
- `npm run build`

Successful build result was produced on 2026-03-14 in `dcx_app/dist/`.

### Notes
- The frontend was aligned directly to the working `dcx_admin` hello-world toolchain pattern: Vite 7 + Tailwind 4 + shadcn.
- A temporary scaffold folder was used to bootstrap the app because the repo root was non-empty; that temporary folder was removed after merge.
- The Codex sandbox still has issues with the plain `npm` shim, so package operations were executed through the bundled Node npm CLI path during setup.

### Next Likely Step
Run locally from `dcx_site/dcx_app` with:
- `npm run dev`

Then begin replacing the hello-world screen with the first real user-facing app flow.
