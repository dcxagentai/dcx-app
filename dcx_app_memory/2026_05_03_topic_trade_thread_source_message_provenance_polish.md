CONTEXT:
Polished source-message provenance on Topics, Trades, and Trade Chats.

CHANGES:
- Topic detail headers now read like `Topic | Message 123` and link back to the originating
  message. They show the first source image when the source message has an image attachment.
- Trade detail headers now include `Message 123` at the top instead of burying the source-message
  link in the raw fields section. They show the first source image when present.
- Trade-chat headers now include `Trade chat | Message 123` and show the first source image when
  present.
- Trade chats hide the owner-only `Open trade` edit link from non-owner counterparties while
  leaving the public market deal link visible when available.

VERIFICATION:
- `node .\node_modules\typescript\bin\tsc -b`
- `node .\node_modules\vite\bin\vite.js build`
