Context
- We upgraded the user settings page from basic select dropdowns to searchable comboboxes.
- The immediate trigger was the preferred-language field, where flags now help the language choice feel aligned with the new phone country picker pattern.

What changed
- `dcx_app_user_settings_page.tsx` now uses combobox controls for:
  - preferred language
  - timezone
  - email communication preference
- Preferred language options now show flags plus language-code subtitles.
- Timezone and email-preference fields use the same combobox pattern without flags, so the three controls now feel like one family.
- Added a small app-side language-to-flag mapping helper to keep the language field explicit and reusable.

Why this matters
- The settings page now feels more intentional and globally aware.
- Users can search long lists more easily, especially on timezones.
- The app and admin surfaces now share a stronger visual language around language selection instead of mixing multiple dropdown styles.

What to judge next in-browser
- Whether the timezone combobox needs tighter search hints once more timezones appear.
- Whether the language field should display the flag in the closed state more prominently.
- Whether any other app settings or account-management surfaces now want the same combobox treatment.
