const assert = require("node:assert/strict");
const { execFileSync } = require("node:child_process");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const vm = require("node:vm");
const { after, before, test } = require("node:test");

const repositoryRoot = path.join(__dirname, "..");
let outputDirectory;
let pages;
let wasmInstance;

before(async () => {
  outputDirectory = fs.mkdtempSync(path.join(os.tmpdir(), "willjasen-search-test-"));
  execFileSync("hugo", ["--minify", "--destination", outputDirectory], {
    cwd: repositoryRoot,
    stdio: "pipe",
  });
  execFileSync("sh", [path.join(repositoryRoot, "scripts", "build-search.sh"), outputDirectory], {
    cwd: repositoryRoot,
    stdio: "pipe",
  });
  pages = JSON.parse(fs.readFileSync(path.join(outputDirectory, "index.json"), "utf8"));
  const wasm = fs.readFileSync(path.join(outputDirectory, "wasm", "tinysearch_engine.wasm"));
  ({ instance: wasmInstance } = await WebAssembly.instantiate(wasm, {}));
});

after(() => {
  if (outputDirectory) fs.rmSync(outputDirectory, { recursive: true, force: true });
});

const search = (query, limit = 100) => {
  const { memory } = wasmInstance.exports;
  const encodedQuery = new TextEncoder().encode(`${query}\0`);
  const pointer = memory.buffer.byteLength;
  memory.grow(1);
  new Uint8Array(memory.buffer, pointer, encodedQuery.length).set(encodedQuery);

  const resultPointer = wasmInstance.exports.search(pointer, limit);
  if (!resultPointer) return [];

  try {
    const wasmMemory = new Uint8Array(memory.buffer);
    let resultEnd = resultPointer;
    while (resultEnd < wasmMemory.length && wasmMemory[resultEnd] !== 0) resultEnd += 1;
    assert.notEqual(resultEnd, wasmMemory.length, "Tinysearch should return a null-terminated result.");
    return JSON.parse(new TextDecoder().decode(wasmMemory.subarray(resultPointer, resultEnd)));
  } finally {
    wasmInstance.exports.free_search_result(resultPointer);
  }
};

test("Hugo generates Tinysearch documents for published pages", () => {
  assert.ok(pages.length > 0);
  assert.ok(pages.every((page) =>
    page.title &&
    page.url.startsWith("/") &&
    typeof page.body === "string" &&
    typeof page.description === "string" &&
    typeof page.date === "string" &&
    typeof page.metadata === "string"
  ));
  assert.equal(new Set(pages.map((page) => page.url)).size, pages.length);
  assert.ok(!pages.some((page) => page.url === "/search/"));
  assert.ok(pages.every((page) => {
    const metadata = JSON.parse(page.metadata);
    return metadata.description === page.description && metadata.date === page.date;
  }));
});

test("Tinysearch WASM returns pages, metadata, and local URLs", () => {
  for (const [query, expectedUrl] of [
    ["entropy", "/posts/entropy/"],
    ["tailsca", "/posts/tailmox/"],
  ]) {
    const results = search(query);
    const result = results.find((entry) => entry.url === expectedUrl);

    assert.ok(result, `${query} should find ${expectedUrl}`);
    assert.ok(pages.some((page) => page.url === result.url));
    assert.equal(JSON.parse(result.meta).date, pages.find((page) => page.url === expectedUrl).date);
  }
  assert.deepEqual(search("zzznomatchterm"), []);
});

test("search timing uses whole milliseconds in Safari and tenths in Chrome", async () => {
  const script = fs.readFileSync(path.join(repositoryRoot, "static", "scripts", "search.js"), "utf8");
  for (const [userAgent, elapsed, expectedDuration] of [
    ["Mozilla/5.0 AppleWebKit/605.1.15 Version/26.0 Safari/605.1.15", 1.25, "1"],
    ["Mozilla/5.0 AppleWebKit/537.36 Chrome/141.0.0.0 Safari/537.36", 1.25, "1.3"],
    ["Mozilla/5.0 AppleWebKit/605.1.15 Version/26.0 Safari/605.1.15", 0, "1"],
    ["Mozilla/5.0 AppleWebKit/537.36 Chrome/141.0.0.0 Safari/537.36", 0, "1.0"],
    ["Mozilla/5.0 AppleWebKit/605.1.15 Version/26.0 Safari/605.1.15", 0.25, "1"],
    ["Mozilla/5.0 AppleWebKit/537.36 Chrome/141.0.0.0 Safari/537.36", 0.25, "1.0"],
  ]) {
    let onInput;
    let clock = 0;
    const input = {
      value: "entropy",
      addEventListener: (_, handler) => { onInput = handler; },
    };
    const status = {};
    const results = { replaceChildren() {}, append() {} };
    const elements = { "#search-box": input, "#search-status": status, "#search-results": results };
    const container = {
      dataset: { searchEngine: "/wasm/tinysearch_engine.wasm" },
      querySelector: (selector) => elements[selector],
    };

    vm.runInNewContext(script, {
      document: {
        querySelector: () => container,
        createElement: () => ({ append() {} }),
      },
      navigator: { userAgent },
      window: { location: { origin: "https://example.com" } },
      performance: { now: () => { clock += elapsed; return clock; } },
      fetch: async () => ({ ok: true, arrayBuffer: async () => new ArrayBuffer(0) }),
      WebAssembly: { instantiate: async () => ({ instance: wasmInstance }) },
      TextEncoder,
      TextDecoder,
      URL,
    });

    await new Promise((resolve) => setImmediate(resolve));
    assert.equal(typeof onInput, "function");
    onInput();
    assert.match(status.textContent, new RegExp(`results found in ${expectedDuration.replace(".", "\\.")} ms\\.$`));
    input.value = "zzznomatchterm";
    onInput();
    assert.equal(status.textContent, `No results found in ${expectedDuration} ms.`);
  }
});

test("search page, navigation, and Tinysearch assets are generated", () => {
  const searchPage = fs.readFileSync(path.join(outputDirectory, "search", "index.html"), "utf8");
  const homePage = fs.readFileSync(path.join(outputDirectory, "index.html"), "utf8");
  const stylesheet = fs.readFileSync(path.join(outputDirectory, "css", "style.min.css"), "utf8");
  const searchScript = fs.readFileSync(path.join(outputDirectory, "scripts", "search.js"), "utf8");

  assert.match(searchPage, /id=["']?search-box/);
  assert.match(searchPage, /data-search-engine=["']?\/wasm\/tinysearch_engine\.wasm/);
  assert.match(searchPage, /site-search-field/);
  assert.match(searchPage, /<svg aria-hidden/);
  assert.match(searchPage, /Search this site/);
  assert.match(searchPage, /scripts\/search\.js/);
  assert.match(homePage, /href=["']?\/search\//);
  assert.match(stylesheet, /site-search-field:focus-within/);
  assert.match(searchScript, /WebAssembly\.instantiate/);
  assert.match(searchScript, /results found in \$\{duration\.toFixed\(timingPrecision\)\} ms/);
  assert.doesNotMatch(searchScript, /innerHTML|lunr/);
  assert.ok(fs.existsSync(path.join(outputDirectory, "tinysearch.toml")));
  assert.ok(fs.existsSync(path.join(outputDirectory, "wasm", "tinysearch_engine.wasm")));
});
