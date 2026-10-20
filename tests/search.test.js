const assert = require("node:assert/strict");
const { execFileSync } = require("node:child_process");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { after, before, test } = require("node:test");
const lunr = require("../static/scripts/lunr.min.js");

const repositoryRoot = path.join(__dirname, "..");
let outputDirectory;
let pages;

before(() => {
  outputDirectory = fs.mkdtempSync(path.join(os.tmpdir(), "willjasen-search-test-"));
  execFileSync("hugo", ["--minify", "--destination", outputDirectory], {
    cwd: repositoryRoot,
    stdio: "pipe",
  });
  pages = JSON.parse(fs.readFileSync(path.join(outputDirectory, "index.json"), "utf8"));
});

after(() => {
  if (outputDirectory) fs.rmSync(outputDirectory, { recursive: true, force: true });
});

test("Hugo generates a valid index for published pages", () => {
  assert.ok(pages.length > 0);
  assert.ok(pages.every((page) =>
    page.title &&
    page.url.startsWith("/") &&
    typeof page.content === "string" &&
    typeof page.description === "string" &&
    typeof page.date === "string"
  ));
  assert.equal(new Set(pages.map((page) => page.url)).size, pages.length);
  assert.ok(!pages.some((page) => page.url === "/search/"));
});

test("Lunr returns pages with valid local result URLs", () => {
  const index = lunr(function () {
    this.ref("url");
    this.field("title");
    this.field("content");
    this.field("description");
    pages.forEach((page) => this.add(page));
  });

  for (const [query, expectedUrl] of [
    ["entropy", "/posts/entropy/"],
    ["tailscale", "/posts/tailmox/"],
  ]) {
    const results = index.search(query);
    assert.ok(results.some((result) => result.ref === expectedUrl), `${query} should find ${expectedUrl}`);
    assert.ok(results.every((result) => pages.some((page) => page.url === result.ref)));
  }
  assert.equal(index.search("zzznomatchterm").length, 0);
});

test("search page and site navigation are generated", () => {
  const searchPage = fs.readFileSync(path.join(outputDirectory, "search", "index.html"), "utf8");
  const homePage = fs.readFileSync(path.join(outputDirectory, "index.html"), "utf8");
  const stylesheet = fs.readFileSync(path.join(outputDirectory, "css", "style.min.css"), "utf8");
  const searchScript = fs.readFileSync(path.join(outputDirectory, "scripts", "search.js"), "utf8");

  assert.match(searchPage, /id=["']?search-box/);
  assert.match(searchPage, /site-search-field/);
  assert.match(searchPage, /<svg aria-hidden/);
  assert.match(searchPage, /Search this site/);
  assert.match(searchPage, /scripts\/search\.js/);
  assert.match(homePage, /href=["']?\/search\//);
  assert.ok(fs.existsSync(path.join(outputDirectory, "scripts", "search.js")));
  assert.match(stylesheet, /site-search-field:focus-within/);
  assert.doesNotMatch(searchScript, /Enter a search term to find pages\./);
});
