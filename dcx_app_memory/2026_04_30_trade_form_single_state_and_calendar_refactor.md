CONTEXT:
Slice 1 trade form polish collapsed the trader-facing status controls into one visible trade state and added shadcn-style calendar pickers for delivery window fields.

WHAT CHANGED:
- `src/components/dcx_app_trades_page.tsx` now shows a single `Trade state` dropdown with: draft, needs details, pending confirmation, confirmed, under revision, rejected.
- The visible state maps onto the existing backend fields:
  - confirmed -> `trade_confirmation_status=confirmed`, `trade_status=open`
  - rejected -> `trade_confirmation_status=rejected`, `trade_status=archived`
  - all other visible states -> `trade_status=draft`
- The trade form now shows one `Units` field. Saving mirrors it into both `normalized_quantity_unit` and `normalized_price_unit_basis` for the current MVP data model.
- Delivery window start/end now use the app copies of the shadcn calendar and popover components.
- `react-day-picker` was added to the app package to support the calendar component.

FOLLOW-UP:
- Local/live DBs need `dcx_update_trade_single_visible_state_constraints_2026_04_30.sql` before users can save the new `draft` or `under_revision` state.
- Local/live UX strings need `dcx_seed_app_slice_1_workflow_trades_topics_multilingual_ux_strings_2026_04_30.sql` rerun after the migration.
