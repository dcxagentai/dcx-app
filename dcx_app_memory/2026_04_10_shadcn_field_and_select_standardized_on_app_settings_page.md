CONTEXT:
The DCX app settings page now uses the real shadcn `Field` and `Select`
components instead of the temporary custom inline select row. This keeps the
new app shell aligned with the actual shadcn component system we want to reuse
 across app and admin.

WHAT CHANGED:
- Installed real shadcn components in `dcx_app`:
  - `src/components/ui/field.tsx`
  - `src/components/ui/select.tsx`
  - `src/components/ui/label.tsx`
- Removed the temporary `DcxAppEditableInlineSelectRow` helper from
  `src/components/dcx_app_user_account_shared.tsx`
- Rebuilt the settings page controls in
  `src/components/dcx_app_user_settings_page.tsx` using:
  - `Field`
  - `FieldLabel`
  - `FieldDescription`
  - `FieldError`
  - `FieldGroup`
  - `FieldSet`
  - `Select`
  - `SelectTrigger`
  - `SelectContent`
  - `SelectItem`
  - `SelectValue`

UI / STATE MODEL:
- The form still preserves DCX visual state semantics:
  - blue = editable / idle
  - orange = editing / saving
  - green = saved
  - red = failed save
- The status/help text now renders through shadcn field description / error slots
  rather than the old bespoke row layout.
- Save behavior is unchanged for these app settings:
  - selecting a new value still saves immediately
  - state text and border colors still come from the existing shared helper
    functions

VALIDATION / CHECKS:
- Local direct TypeScript compile passed with:
  - `node_modules/.bin/tsc.cmd -b`
- Local Vite production build still hits the existing environment-specific
  `esbuild spawn EPERM` issue, which is unrelated to this form refactor.

NEXT USEFUL STEP:
- Use this settings page as the pattern for standardizing editable controls on
  the admin surface, especially where select / field compositions currently use
  older custom markup.
