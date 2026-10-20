# Website roadmap

## Replace Lunr.js with Tinysearch

**Status:** Implemented and verified with the Node regression suite and a local
OrbStack browser preview.

The Hugo build creates `public/index.json`, then
`scripts/build-search.sh` installs the pinned Tinysearch CLI and builds its
production WebAssembly engine into `public/wasm/`. The search page loads that
engine in the browser and renders results with DOM text APIs.

The JSON template uses Tinysearch's `title`, `url`, and `body` fields. The
`description` is indexed, while the serialized `metadata` field carries the
description and date back to the browser for display. The search page itself is
excluded from the index.

The Netlify build runs the same Tinysearch build script after Hugo. Rust 1.89.0
and Tinysearch 0.11.1 are pinned by that script; the Rust WebAssembly target is
installed as part of the build when needed.

`node --test tests/search.test.js` builds the Hugo output and Tinysearch engine,
then verifies the index schema, expected search matches, result metadata, page
wiring, and generated assets.
