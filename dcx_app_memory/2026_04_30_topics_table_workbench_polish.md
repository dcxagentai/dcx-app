CONTEXT:
On 2026-04-30 we aligned the authenticated app Topics list with the Messages and Trades workbench table pattern for Slice 1 investor presentation polish.

SUMMARY:
- Updated `src/components/dcx_app_market_topics_page.tsx`.
- Removed the repetitive page-level intro block above the Topics split view.
- Added a Messages-style table control stack:
  - search
  - result count
  - refresh
  - status filter
  - source filter
  - tag filter
  - sortable TanStack headers
  - selected-row highlighting
- Expanded the topic table from raw `Topic / Status / Updated` columns to:
  - Topic
  - Tags
  - Status
  - Source
  - Updated

VERIFICATION:
- Ran `npm run build` from `dcx_site/dcx_app` using the installed Node/npm path.
- Build completed successfully. Vite still reports the existing large chunk warning.

WHAT COMES NEXT:
- Review in browser with the current smoke-test topic data.
- If forum-style Slice 3 metadata needs richer filtering, extend the topics catalog API with public/private status and participant/thread counts.
