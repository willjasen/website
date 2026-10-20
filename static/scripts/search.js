(() => {
  const search = document.querySelector("[data-search-engine]");
  if (!search) return;

  const input = search.querySelector("#search-box");
  const status = search.querySelector("#search-status");
  const resultsList = search.querySelector("#search-results");
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();
  const resultLimit = 100;
  const isSafari = /Safari/.test(navigator.userAgent) &&
    !/Chrome|Chromium|CriOS|Edg|OPR|FxiOS|Android/.test(navigator.userAgent);
  const timingPrecision = isSafari ? 0 : 1;

  const setStatus = (message) => {
    status.textContent = message;
  };

  const clearResults = () => {
    resultsList.replaceChildren();
  };

  const createSearchEngine = async () => {
    const response = await fetch(search.dataset.searchEngine);
    if (!response.ok) {
      throw new Error(`Search engine request failed: ${response.status}`);
    }

    const bytes = await response.arrayBuffer();
    const { instance } = await WebAssembly.instantiate(bytes, {});
    const { memory, search: searchWasm, free_search_result: freeSearchResult } = instance.exports;

    if (!memory || !searchWasm || !freeSearchResult) {
      throw new Error("Tinysearch WASM exports are incomplete.");
    }

    const queryBufferPointer = memory.buffer.byteLength;
    memory.grow(1);

    return {
      search(query) {
        const encodedQuery = encoder.encode(`${query}\0`);
        if (encodedQuery.length > 65536) {
          throw new Error("Search query is too long.");
        }

        new Uint8Array(memory.buffer, queryBufferPointer, encodedQuery.length).set(encodedQuery);
        const resultPointer = searchWasm(queryBufferPointer, resultLimit);
        if (!resultPointer) return [];

        try {
          const wasmMemory = new Uint8Array(memory.buffer);
          let resultEnd = resultPointer;
          while (resultEnd < wasmMemory.length && wasmMemory[resultEnd] !== 0) resultEnd += 1;
          if (resultEnd === wasmMemory.length) {
            throw new Error("Tinysearch returned an invalid result.");
          }

          return JSON.parse(decoder.decode(wasmMemory.subarray(resultPointer, resultEnd)));
        } finally {
          freeSearchResult(resultPointer);
        }
      },
    };
  };

  const renderResults = (results) => {
    clearResults();
    let renderedCount = 0;

    for (const result of results) {
      const resultUrl = new URL(result.url, window.location.origin);
      if (resultUrl.origin !== window.location.origin) continue;

      const item = document.createElement("li");
      const link = document.createElement("a");
      link.href = `${resultUrl.pathname}${resultUrl.search}${resultUrl.hash}`;
      link.textContent = result.title;
      item.append(link);

      const metadata = JSON.parse(result.meta || "{}");
      if (metadata.date) {
        const date = document.createElement("time");
        date.dateTime = metadata.date;
        date.textContent = ` (${metadata.date})`;
        item.append(date);
      }

      if (metadata.description) {
        const description = document.createElement("p");
        description.textContent = metadata.description;
        item.append(description);
      }

      resultsList.append(item);
      renderedCount += 1;
    }

    return renderedCount;
  };

  const runSearch = (engine) => {
    const query = input.value.trim();
    clearResults();

    if (!query) {
      setStatus("");
      return;
    }

    try {
      const startTime = performance.now();
      const results = engine.search(query);
      const duration = Math.max(1, performance.now() - startTime);
      const count = renderResults(results);
      setStatus(count
        ? `${count} results found in ${duration.toFixed(timingPrecision)} ms.`
        : `No results found in ${duration.toFixed(timingPrecision)} ms.`);
    } catch {
      setStatus("Search could not be completed. Try a different query.");
    }
  };

  createSearchEngine()
    .then((engine) => {
      input.disabled = false;
      input.addEventListener("input", () => runSearch(engine));
      setStatus("");
    })
    .catch(() => {
      setStatus("Search is unavailable because its engine could not be loaded.");
    });
})();
