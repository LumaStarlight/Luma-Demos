(function () {
  "use strict";

  var searchForm;
  var searchInput;
  var searchResults;
  var themeToggle;
  var darkModeMedia = window.matchMedia ? window.matchMedia("(prefers-color-scheme: dark)") : null;

  function getStoredDarkMode() {
    try {
      return localStorage.getItem("estafaguard_dark_mode");
    } catch (error) {
      return null;
    }
  }

  function saveDarkMode(isDark) {
    try {
      localStorage.setItem("estafaguard_dark_mode", String(isDark));
    } catch (error) {
      // Storage can fail in private browsing; the visual toggle still works.
    }
  }

  function prefersDarkMode() {
    return Boolean(darkModeMedia && darkModeMedia.matches);
  }

  function setTheme(isDark, shouldPersist) {
    if (isDark) {
      document.documentElement.setAttribute("data-theme", "dark");
    } else {
      document.documentElement.removeAttribute("data-theme");
    }

    if (themeToggle) {
      var label = isDark ? "Activar modo claro" : "Activar modo oscuro";
      themeToggle.setAttribute("aria-label", label);
      themeToggle.innerHTML = '<span aria-hidden="true">' + (isDark ? "☀️" : "🌙") + "</span>";
    }

    if (shouldPersist) {
      saveDarkMode(isDark);
    }
  }

  function initThemeToggle() {
    themeToggle = document.querySelector("#theme-toggle");
    var stored = getStoredDarkMode();
    var initialDarkMode = stored === null ? prefersDarkMode() : stored === "true";

    setTheme(initialDarkMode, false);

    if (!themeToggle) {
      return;
    }

    themeToggle.addEventListener("click", function () {
      setTheme(document.documentElement.getAttribute("data-theme") !== "dark", true);
    });
  }

  function escapeHtml(value) {
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function renderSearchResult(result) {
    var tips = result.tips && result.tips.length
      ? "<ul>" + result.tips.map(function (tip) {
        return "<li>" + escapeHtml(tip) + "</li>";
      }).join("") + "</ul>"
      : "";
    return [
      '<article class="search-result">',
      '<div class="result-heading">',
      '<span class="badge badge-' + escapeHtml(result.severity || "low") + '">' + escapeHtml(result.severity || "low") + "</span>",
      "<strong>" + escapeHtml(result.title) + "</strong>",
      '<span class="result-confidence">' + result.confidence + "%</span>",
      "</div>",
      "<p>" + escapeHtml(result.description) + "</p>",
      tips,
      result.source_url
        ? '<a href="' + escapeHtml(result.source_url) + '" target="_blank" rel="noopener">' + escapeHtml(result.source_label || "Fuente") + "</a>"
        : "",
      "</article>"
    ].join("");
  }

  function renderSearchResponse(response) {
    if (!searchResults) {
      return;
    }

    if (!response.found) {
      searchResults.innerHTML = [
        '<div class="empty-state">',
        "<p>" + escapeHtml(response.warnings[0]) + "</p>",
        response.suggestion ? '<a class="btn btn-outline" href="' + response.suggestion + '">Reportar esta estafa</a>' : "",
        "</div>"
      ].join("");
      return;
    }

    var warnings = response.warnings.length
      ? '<div class="search-warnings">' + response.warnings.map(function (warning) {
        return '<p class="banner banner-danger">' + escapeHtml(warning) + "</p>";
      }).join("") + "</div>"
      : "";

    searchResults.innerHTML = [
      '<div class="results-summary">',
      "<strong>Coincidencia principal: " + response.confidence + "%</strong>",
      "<span>Tipo detectado: " + escapeHtml(response.query_type) + "</span>",
      "</div>",
      warnings,
      response.results.map(renderSearchResult).join("")
    ].join("");
  }

  function bindSearchForm() {
    searchForm = document.querySelector(".search-shell");
    searchInput = document.querySelector("#scam-input");
    searchResults = document.querySelector("#search-results");

    if (!searchForm || !searchInput || !window.EstafaGuard || !window.EstafaGuard.search) {
      return;
    }

    searchForm.addEventListener("submit", function (event) {
      event.preventDefault();
      renderSearchResponse(window.EstafaGuard.search(searchInput.value));
    });
  }

  function loadJson(path) {
    return fetch(path).then(function (response) {
      if (!response.ok) {
        throw new Error("No se pudo cargar " + path);
      }

      return response.json();
    });
  }

  function initSearchData() {
    return Promise.all([
      loadJson("data/scams.json"),
      loadJson("data/alerts.json")
    ]).then(function (payload) {
      if (window.EstafaGuard && window.EstafaGuard.configureSearch) {
        window.EstafaGuard.configureSearch(payload[0], payload[1]);
      }
    }).catch(function () {
      if (searchResults) {
        searchResults.textContent = "Error al cargar la base de datos de estafas. Intentalo de nuevo.";
      }
    });
  }

  document.addEventListener("DOMContentLoaded", function () {
    initThemeToggle();
    bindSearchForm();
    initSearchData();
    if (window.EstafaGuard && window.EstafaGuard.feed) {
      window.EstafaGuard.feed.init();
    }
    if (window.EstafaGuard && window.EstafaGuard.alerts) {
      window.EstafaGuard.alerts.init();
    }
    if (window.EstafaGuard && window.EstafaGuard.report) {
      window.EstafaGuard.report.init();
    }
    if (window.EstafaGuard && window.EstafaGuard.monetization) {
      window.EstafaGuard.monetization.init();
    }
    console.log("EstafaGuard v1.0.0 initialized");
  });
})();
