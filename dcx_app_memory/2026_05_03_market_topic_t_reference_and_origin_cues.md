CONTEXT:
Added app-side cues for the cross-surface market-topic AI chat mini slice.

CHANGES:
- `src/components/dcx_app_market_topics_page.tsx` now shows the private topic reference `#T{id}`
  beside the topic title.
- Topic chat user turns now show email/WhatsApp origin icons when their turn metadata carries an
  external `source_channel_type`.

VERIFICATION:
- `node .\node_modules\typescript\bin\tsc -b`
- `node .\node_modules\vite\bin\vite.js build`
