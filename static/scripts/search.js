(() => {
  const search = document.querySelector("[data-search-index]");
  if (!search) return;

  const input = search.querySelector("#search-box");
  const status = search.querySelector("#search-status");
  const resultsList = search.querySelector("#search-results");
  const documentsByUrl = new Map();

  const setStatus = (message) => {
    status.textContent = message;
  };

  const clearResults = () => {
    resultsList.replaceChildren();
  };

  const renderResults = (results) => {
    clearResults();

    for (const result of results) {
      const page = documentsByUrl.get(result.ref);
      if (!page) continue;

      const item = document.createElement("li");
      const link = document.createElement("a");
      link.href = page.url;
      link.textContent = page.title;
      item.append(link);

      if (page.date) {
        const date = document.createElement("time");
        date.dateTime = page.date;
        date.textContent = ` (${page.date})`;
        item.append(date);
      }

      if (page.description) {
        const description = document.createElement("p");
        description.textContent = page.description;
        item.append(description);
      }

      resultsList.append(item);
    }
  };

  const runSearch = (index) => {
    const query = input.value.trim();
    clearResults();

    if (!query) {
      setStatus("Enter a search term to find pages.");
      return;
    }

    try {
      const results = index.search(query);
      renderResults(results);
      setStatus(results.length ? `${results.length} results found.` : "No results found.");
    } catch {
      setStatus("That search query is invalid. Try simpler terms.");
    }
  };

  fetch(search.dataset.searchIndex)
    .then((response) => {
      if (!response.ok) throw new Error(`Search index request failed: ${response.status}`);
      return response.json();
    })
    .then((documents) => {
      if (!Array.isArray(documents)) throw new Error("Search index must be an array.");

      const index = lunr(function () {
        this.ref("url");
        this.field("title");
        this.field("content");
        this.field("description");

        for (const document of documents) {
          if (document.url && document.title) {
            this.add(document);
            documentsByUrl.set(document.url, document);
          }
        }
      });

      input.disabled = false;
      input.addEventListener("input", () => runSearch(index));
      setStatus("Enter a search term to find pages.");
    })
    .catch(() => {
      setStatus("Search is unavailable because its index could not be loaded.");
    });
})();
