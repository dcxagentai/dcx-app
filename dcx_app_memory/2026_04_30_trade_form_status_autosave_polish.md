# Trade Form Status And Autosave Polish

Date: 2026-04-30

Slice 1 trade-form UX was refined after smoke testing showed that confirming a trade ignored unsaved form edits.

Implemented behavior:
- Trade confirmation status and trade status are now normal form fields.
- Changing confirmation/status participates in dirty-state detection, Save activation, and 30-second autosave.
- The separate Confirm/Reject buttons were removed from the user app trade form.
- The backend trade PATCH capability now accepts:
  - `trade_confirmation_status`
  - `trade_status`
- Previously rejected/confirmed trades can be adjusted through the same versioned form path during Slice 1 testing.

Files touched:
- `src/components/dcx_app_trades_page.tsx`
- `src/lib/update_dcx_app_authenticated_user_trade_candidate.ts`
- `../dcx_api/messages/update_authenticated_dcx_user_trade_candidate_details.py`

Verification:
- Backend `py_compile` passed for the updated PATCH capability.
- App `tsc -b` passed.
- App `npm run build` passed outside the sandbox.

Notes:
- This is intentionally flexible for MVP/investor demos: a trade is a developing object, not a one-shot static form.
- Later slices should split deeper trade lifecycle/status semantics into richer workflow actions once trader-trader interaction flows exist.
