# Architecture

## Overview

This repository builds a static personal website with Hugo and the DoIt theme.
Netlify publishes the generated files at <https://willjasen.com/>. There is no
application server or search API: search runs locally in the browser using a
Tinysearch WebAssembly (WASM) engine built from the site's published content.

The build has two ordered stages:

```text
Markdown + Hugo templates + DoIt theme + static assets
    |
    v
Hugo: HTML, CSS, JavaScript, RSS, sitemap, index.json, tinysearch.toml
    |
    v
Tinysearch: index.json + tinysearch.toml -> wasm/tinysearch_engine.wasm
    |
    v
Netlify: publish the complete public/ directory
```

## Source layout

| Path | Responsibility |
| --- | --- |
| `config.toml` | Site URL, navigation, theme settings, analytics, and home HTML/JSON/RSS outputs. |
| `content/` | Markdown pages, posts, front matter, and shortcode calls. |
| `themes/DoIt/` | Git submodule providing the base theme. |
| `layouts/` | Site-specific templates, theme overrides, feeds, sitemap, and shortcodes. |
| `assets/css/_override.scss` | Custom styling, including the search field and results. |
| `static/` | Files copied to the output unchanged, including search JavaScript, icons, redirects, and the Tinysearch schema. |
| `scripts/build-search.sh` | Installs the search toolchain as needed and generates the WASM engine after Hugo. |
| `tests/search.test.js` | Hugo index, real WASM search, browser timing, and output-wiring regression tests. |
| `netlify.toml` | Production build command, Hugo version, and publish directory. |
| `.github/workflows/netlify-daily-rebuild.yml` | Scheduled and manual triggers for the Netlify build hook. |
| `public/`, `resources/_gen/` | Generated output and Hugo asset cache, not implementation sources. |

Make site changes in source files, not by editing generated files under
`public/`. Some generated artifacts are tracked; local builds can change them
even when building into an alternate destination.

## Search index and build

`content/search.md` publishes `/search/` and invokes the search shortcode. Its
`noindex: true` flag excludes it from the local search index.
`layouts/index.json` selects Hugo's regular pages, excluding pages with that
flag. Normal production builds also omit drafts and future-dated content.
Taxonomy and section list pages are not regular pages.

Each document has these fields:

| Field | Purpose |
| --- | --- |
| `title` | Searchable title and result label. |
| `url` | Unique, site-relative result URL from Hugo's `RelPermalink`. |
| `body` | Searchable plain text from Hugo's rendered page content. |
| `description` | Searchable front-matter description; also present in display metadata. |
| `date` | Publication date as `YYYY-MM-DD`, or an empty string. |
| `metadata` | JSON-encoded string containing `description` and `date`. |

`static/tinysearch.toml` becomes `public/tinysearch.toml`. It indexes `title`,
`body`, and `description`, sets `url` as the URL field, and stores `metadata`
in each result. Tinysearch returns metadata as a string rather than a structured
object, so encoding it as JSON preserves named display fields. The browser
decodes that string to render dates and descriptions.

After Hugo, `scripts/build-search.sh` reads the generated JSON and schema. It
uses Rust 1.89.0 with the `wasm32-unknown-unknown` target and installs Tinysearch
0.11.1 with its `bin` feature and `--locked`. It bootstraps rustup if missing and
uses the user's Cargo installation directory. The script accepts an optional
output directory; otherwise it uses `public/`.

The CLI's release mode generates `wasm/tinysearch_engine.wasm` without its demo
HTML or JavaScript loader. The script removes stale engine/demo files before
generation and fails the build if required input files are missing or a build
step fails. An initial build requires network access to Rust and Cargo package
registries; the generated engine also resolves Rust dependencies during its
build. The CLI installation uses a lockfile, but the generated engine's
transitive dependencies are not locked in this repository.

Tinysearch uses its default exact index backend. Prefix matching begins at
three characters; shorter terms require exact matches. Query behavior is
Tinysearch's, not Lunr's query syntax or stemming.

## Browser search lifecycle

`layouts/shortcodes/search.html` supplies the labeled input, live status region,
results list, and engine URL generated with Hugo's `relURL`. It loads
`static/scripts/search.js` only on the search page.

1. The input starts disabled while JavaScript fetches and instantiates the WASM
   engine. The browser does not fetch `index.json` to construct a runtime index.
2. The bridge checks for WASM exports `memory`, `search`, and
   `free_search_result`, and reserves one 64 KiB memory page as a reusable
   UTF-8, null-terminated query buffer.
3. Once ready, an `input` listener runs synchronous searches as the user types.
   Queries are trimmed, the field has a 200-character limit, and the bridge
   guards against encoded queries larger than its buffer.
4. The engine returns at most 100 results. JavaScript decodes the
   null-terminated JSON result and frees the engine-allocated result string
   in a `finally` block.
5. Results use DOM text APIs, not HTML interpolation. Only same-origin URLs are
   rendered, with titles, optional dates, and optional descriptions.

The status region uses `role="status"` and `aria-live="polite"`. Blank queries
clear results and status. No matches show an explicit message. Engine-load
failure leaves the input disabled and announces that search is unavailable;
query or rendering errors announce that the search could not be completed.

### Timing display

The duration uses `performance.now()` around the single JavaScript-to-WASM
search call, including query encoding and result JSON decoding, but excluding
network loading and DOM rendering. It is not an average or a benchmark.

Displayed durations have a minimum of 1 ms, even if the measured value is zero
or below 1 ms. Safari shows whole milliseconds; Chrome and other browsers show
one decimal place. Safari detection uses its user-agent string and excludes
known alternate browser identifiers. The formatting does not increase the
browser timer's underlying precision.

## Deployment and external dependencies

Netlify runs:

```sh
git submodule update --init --recursive && hugo --minify && sh scripts/build-search.sh
```

`netlify.toml` pins Hugo to 0.166.0 and publishes `public/`. Use Hugo Extended for
the theme's SCSS processing. Hugo alone does not produce the search engine;
changes to indexed content require rerunning both build stages.

Serve the JS and WASM from the same deployment as the page. WASM should have
the `application/wasm` content type. The bridge fetches bytes before calling
`WebAssembly.instantiate`, rather than relying on streaming compilation.
Preview and production hosts must support JavaScript and WebAssembly.

The daily GitHub Actions workflow posts to the Netlify hook stored in the
`NETLIFY_BUILD_HOOK_URL` secret at 08:00 UTC; it also supports manual runs.
It triggers a build rather than building or deploying the site itself.

Other site integrations include configured Google/Cloudflare analytics and a
GitHub README shortcode that fetches remote Markdown at build time. Hugo's
remote-resource cache is configured for ten minutes. These are separate from
search: search queries are processed locally and require no external search
service. `static/_redirects` redirects the configured `.net` and `.org`
alternate hosts to the canonical `.com` host.

## Local development and checks

Initialize `themes/DoIt` before building if the submodule is not populated.
Build into a temporary destination to avoid overwriting checked-in `public/`
files:

```sh
git submodule update --init --recursive
OUTPUT_DIR=$(mktemp -d /tmp/website-preview.XXXXXX)
hugo --minify --destination "$OUTPUT_DIR"
sh scripts/build-search.sh "$OUTPUT_DIR"
```

With OrbStack running, serve this build using its Docker context:

```sh
docker --context orbstack run --detach --rm \
  --name website-search-preview \
  --publish 127.0.0.1:8765:80 \
  --volume "$OUTPUT_DIR:/usr/share/nginx/html:ro" \
  nginx:alpine
```

Open <http://127.0.0.1:8765/search/>. Confirm the engine loads, known searches
return working links and metadata, blank input clears results, unmatched input
shows a message, and timing uses the expected browser format. The preview is a
static snapshot: rebuild both stages after content changes. Stop the named
container with `docker --context orbstack stop website-search-preview` when
finished; remove only the specific temporary output directory created above.
If simulating a missing engine, restore the valid output and reload the browser
before handing the preview back.

Run the automated regression suite with:

```sh
node --test tests/search.test.js
```

The suite builds into its own temporary destination, compiles and executes the
real WASM engine, and exercises browser-script timing with simulated Safari and
Chrome user agents, including zero and sub-millisecond durations. It also
checks generated markup, navigation, assets, and metadata. It does not automate
a full browser session or prove that a deployed Netlify build succeeded.
