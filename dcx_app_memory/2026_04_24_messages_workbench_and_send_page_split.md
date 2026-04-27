CONTEXT:
This note records the UX restructuring pass for the DCX app Messages surface after multichannel
multimedia ingest was proven across app, WhatsApp, and email.

WHAT CHANGED:
- The sidebar no longer exposes message-format subroutes as nested menu items.
- The sidebar now treats `Messages` and `Send` as separate destinations.
- The Messages page is now an inbox/workbench:
  - format filters remain as in-page chips: all, text, images, audio, documents
  - channel filters were added as in-page chips: all channels, app, WhatsApp, email
  - verified identity filtering was added as an in-page dropdown
  - row search remains inside the table workbench
  - refresh moved into the message table toolbar
  - the old explanatory top block was removed
- The app-originated message composer moved to a dedicated Send page.

BACKEND SUPPORT ADDED:
- The authenticated messages inbox payload now includes lightweight attachment summaries so row
  search can match filenames without fetching every message detail.
- The inbox payload also includes linked contact-method and source/target handle information so the
  app can filter/search by the user's verified email addresses and phone numbers.

WHY:
- Sidebar navigation should answer "which app module am I in?"
- In-page controls should answer "how am I slicing this inbox right now?"
- Message type, channel, identity, filename, subject, body, and status are filters over one inbox,
  not separate product destinations.

FILES CHANGED:
- `src/App.tsx`
- `src/components/app-sidebar.tsx`
- `src/components/dcx_app_messages_page.tsx`
- `src/components/dcx_app_send_message_page.tsx`
- `src/components/dcx_app_user_account_shared.tsx`
- `src/components/ui/dcx_app_data_table.tsx`
- `src/lib/read_dcx_app_authenticated_user_messages_inbox.ts`
- `../dcx_api/messages/read_authenticated_dcx_user_messages_inbox.py`
- `../dcx_api/messages/read_authenticated_dcx_user_messages_inbox_test.py`

VERIFICATION:
- App build:
  `npm run build`
  Result: passed, with the existing Vite large chunk warning.
- Backend focused inbox test:
  `.\\.venv\\Scripts\\python.exe -m pytest messages\\read_authenticated_dcx_user_messages_inbox_test.py -q`
  Result: `2 passed in 0.06s`

NEXT:
- Smoke test `/me/messages` and `/me/send` in the browser.
- Consider backend query parameters for channel and identity once the inbox grows large enough that
  client-side filtering is no longer sufficient.
- Later add filename/body/subject search to a server-side full-text search path when message volume
  demands it.
