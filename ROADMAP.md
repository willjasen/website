# Website roadmap

## Restore Lunr.js search

Bring client-side search back to the website using Lunr.js. The existing
implementation is an unfinished draft, so treat it as a reference rather than
assuming it can be enabled as-is.

### Work plan

1. **Define the search index**
   - Review `layouts/_default/list.json` and choose which published pages should
     be searchable.
   - Make the JSON fields and URLs consistent with the search UI. The current
     template emits `title`, `permalink`, and `content`, while the old shortcode
     expects `title`, `uri`, and `date`.
   - Exclude drafts and irrelevant pages; confirm how dates and non-post pages
     should be represented.
2. **Rebuild the search page and client behavior**
   - Replace the unfinished `layouts/shortcodes/search.html` implementation
     with a page using the site's normal Hugo layout.
   - Load the locally bundled `static/scripts/lunr.min.js` and the generated
     index; remove debug logging and avoid unsafe HTML insertion.
   - Handle empty queries, no matches, index-loading failures, and malformed
     search input without breaking the page.
   - Provide accessible labels, keyboard-friendly results, and useful result
     links; add a clear way for visitors to reach search from the site.
3. **Verify generation and deployment**
   - Build the site and confirm the published search page and JSON index are
     generated at stable URLs.
   - Test representative queries, result links, empty/no-result states, and
     index-loading failures in a browser.
   - Confirm the implementation works with the Netlify Hugo build and does not
     require generated files under `public/` to be edited by hand.

### Completion criteria

- Search is reachable from the website and searches the intended published
  content.
- Results link to valid pages and show useful context, including dates where
  applicable.
- Empty, unmatched, and failed searches have clear, accessible behavior.
- The Hugo build and deployed site generate and serve the index correctly.

### Existing starting points

- `content/search.md` is a draft page and currently says the search is not
  working.
- `layouts/shortcodes/search.html` contains the unfinished Lunr.js UI.
- `layouts/partials/lunr-script.html` loads the local Lunr.js library.
- `layouts/_default/list.json` defines the current JSON output fields.
- `static/scripts/lunr.min.js` is the bundled Lunr.js library.
