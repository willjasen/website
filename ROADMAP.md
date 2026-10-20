# Website roadmap

## Restore Lunr.js search

**Status:** Implemented and verified locally. `node --test tests/search.test.js`
passes, and browser checks passed against the site served through OrbStack.

Restore the site's client-side search using the earlier implementation as a
known-working baseline, then correct its regressions before making it public.

### What Git history shows

- `61de988` introduced the search page, the home JSON output, and a JSON
  template with `title`, `permalink`, and `content`.
- `4991a06` is titled "minimum searching works". Its key change was using
  `title` as Lunr's document reference; the prior implementation used
  `permalink` as the reference and did not return results.
- `fbf3d5c` changed result rendering to read `item.uri`, even though the index
  field is named `permalink`. That mismatch leaves result links undefined.
- `15ece00` added the notice that search was not working. `a0afb59` made the
  search page a draft, and `4af4c75` removed it from the navigation.
- When this roadmap was written, the shortcode still had the `uri`/`permalink`
  mismatch and debug logging, and the search page was still a draft.

### Implementation plan

1. **Re-establish a working baseline**
   - Compare the current shortcode and JSON template with their versions at
     `4991a06`; use that commit as a behavioral reference, not a blind rollback.
   - Keep the local Lunr.js asset and the generated home JSON index.
   - Agree on one index schema. Use a unique stable document reference (the
     permalink is a better key than title), and ensure Lunr's configured `ref`,
     index fields, result lookup, and anchor URL all use that schema.
2. **Build the index for the intended content**
   - Confirm the Hugo home JSON output includes the intended published pages,
     and excludes drafts and non-searchable taxonomy/list pages.
   - Include the fields the interface will actually display: title, URL,
     searchable plain text, and date where it applies.
   - Keep the JSON template valid for empty and single-item collections;
     inspect the generated JSON rather than relying on hand-edited `public/`
     output.
3. **Make the search page production-ready**
   - Replace the shortcode's standalone nested HTML document with markup and
     behavior that fit the site's Hugo theme page.
   - Preserve the previously working search behavior, then remove console
     debugging and use DOM text APIs rather than interpolating result data into
     HTML.
   - Handle blank input, no results, failed index loads, and invalid queries;
     provide an accessible input label and result/status announcements.
   - Remove the draft flag and restore a navigation link only after the page
     and index pass the checks below.
4. **Verify locally and in deployment**
   - Initialize the DoIt submodule if needed, then run the same Hugo build
     configured by Netlify.
   - Verify `public/index.json` parses and contains expected published entries,
     and that `/search/` and its local script are generated/reachable.
   - Test a known query, a no-match query, blank input, valid result URLs, and
     an index-load failure in a browser.
   - Confirm the Netlify build does not depend on manually editing generated
     files.

### Completion criteria

- Search is published and reachable through site navigation.
- Queries return expected results with working links and useful metadata.
- The index schema agrees end-to-end: generated JSON, Lunr configuration,
  result lookup, and displayed URL.
- Empty, unmatched, and failed searches have clear, accessible behavior.
- The Hugo/Netlify build produces the page and index without manual generated
  file changes.

### Relevant files

- `content/search.md` - published search page, excluded from the index.
- `layouts/shortcodes/search.html` - theme-native Lunr search UI.
- `layouts/partials/lunr-script.html` - local Lunr script include.
- `layouts/index.json` - generated home search index fields.
- `static/scripts/lunr.min.js` - bundled Lunr.js.
- `static/scripts/search.js` - search initialization, query handling, and result
  rendering.
- `tests/search.test.js` - index generation and Lunr regression tests.
