(function (root) {
  "use strict";

  var PAGE_SIZE = 10;
  var CATEGORY_LABELS = {
    all: "Todos",
    sms: "SMS",
    email: "Email",
    web: "Web",
    phone: "Teléfono",
    whatsapp: "WhatsApp",
    other: "Otro"
  };

  var state = {
    entries: [],
    filter: "all",
    page: 1
  };

  function escapeHtml(value) {
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function truncate(value, maxLength) {
    var text = String(value || "").trim();
    if (text.length <= maxLength) return text;
    return text.slice(0, maxLength - 1).trimEnd() + "…";
  }

  function relativeDate(dateString) {
    var date = new Date(dateString + "T00:00:00Z");
    if (Number.isNaN(date.getTime())) return "fecha no disponible";

    var today = new Date();
    var todayUtc = Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate());
    var diffDays = Math.max(0, Math.round((todayUtc - date.getTime()) / 86400000));
    if (diffDays === 0) return "hoy";
    if (diffDays === 1) return "hace 1 día";
    return "hace " + diffDays + " días";
  }

  function severityDot(severity) {
    if (severity === "high") return "🔴";
    if (severity === "medium") return "🟡";
    return "⚪";
  }

  function getFilteredEntries() {
    return state.entries.filter(function (entry) {
      return state.filter === "all" || entry.category === state.filter;
    });
  }

  function renderFilters(filtersNode) {
    var categories = ["all", "sms", "email", "web", "phone", "whatsapp", "other"];
    filtersNode.innerHTML = categories.map(function (category) {
      var active = state.filter === category;
      return [
        '<button class="filter-pill' + (active ? " active" : "") + '" type="button"',
        ' data-category="' + category + '"',
        ' aria-pressed="' + String(active) + '">',
        escapeHtml(CATEGORY_LABELS[category]),
        "</button>"
      ].join("");
    }).join("");
  }

  function renderCard(entry) {
    var description = escapeHtml(entry.description || "");
    var shortDescription = escapeHtml(truncate(entry.description || "", 120));
    var isLong = String(entry.description || "").length > 120;

    return [
      '<article class="card feed-card" data-category="' + escapeHtml(entry.category) + '">',
      '<div class="feed-card-meta">',
      '<span class="badge badge-' + escapeHtml(entry.severity || "low") + '">',
      severityDot(entry.severity) + " " + escapeHtml(entry.severity || "low"),
      "</span>",
      '<span class="badge category-badge">' + escapeHtml(CATEGORY_LABELS[entry.category] || "Otro") + "</span>",
      "</div>",
      "<h3>" + escapeHtml(entry.title) + "</h3>",
      '<p class="feed-description" data-short="' + shortDescription + '" data-full="' + description + '">',
      shortDescription,
      "</p>",
      isLong ? '<button class="feed-expand" type="button">Ver más</button>' : "",
      '<div class="feed-card-footer">',
      '<span>Reportado: ' + escapeHtml(relativeDate(entry.reported_at)) + "</span>",
      entry.source_url
        ? '<a href="' + escapeHtml(entry.source_url) + '" target="_blank" rel="noopener">' + escapeHtml(entry.source_label || "Fuente") + "</a>"
        : "",
      "</div>",
      "</article>"
    ].join("");
  }

  function renderPagination(paginationNode, totalPages) {
    if (totalPages <= 1) {
      paginationNode.innerHTML = "";
      return;
    }

    paginationNode.innerHTML = [
      '<button class="btn btn-outline" type="button" data-page-action="prev" aria-label="Página anterior"' + (state.page === 1 ? " disabled" : "") + ">← Anterior</button>",
      '<span>Página ' + state.page + " de " + totalPages + "</span>",
      '<button class="btn btn-outline" type="button" data-page-action="next" aria-label="Página siguiente"' + (state.page === totalPages ? " disabled" : "") + ">Siguiente →</button>"
    ].join("");
  }

  function render() {
    var filtersNode = document.querySelector("#feed-filters");
    var listNode = document.querySelector("#feed-list");
    var paginationNode = document.querySelector("#feed-pagination");
    if (!filtersNode || !listNode || !paginationNode) return;

    var entries = getFilteredEntries();
    var totalPages = Math.max(1, Math.ceil(entries.length / PAGE_SIZE));
    state.page = Math.min(state.page, totalPages);

    renderFilters(filtersNode);

    if (!entries.length) {
      listNode.innerHTML = '<div class="card empty-state">No hay estafas reportadas en esta categoría.</div>';
      paginationNode.innerHTML = "";
      return;
    }

    var start = (state.page - 1) * PAGE_SIZE;
    listNode.innerHTML = entries.slice(start, start + PAGE_SIZE).map(renderCard).join("");
    renderPagination(paginationNode, totalPages);
  }

  function bindEvents() {
    var filtersNode = document.querySelector("#feed-filters");
    var listNode = document.querySelector("#feed-list");
    var paginationNode = document.querySelector("#feed-pagination");

    if (filtersNode) {
      filtersNode.addEventListener("click", function (event) {
        var button = event.target.closest("[data-category]");
        if (!button) return;
        state.filter = button.getAttribute("data-category") || "all";
        state.page = 1;
        render();
      });
    }

    if (listNode) {
      listNode.addEventListener("click", function (event) {
        var button = event.target.closest(".feed-expand");
        if (!button) return;
        var description = button.previousElementSibling;
        var expanded = button.getAttribute("aria-expanded") === "true";
        if (!description) return;
        description.textContent = expanded ? description.dataset.short : description.dataset.full;
        button.textContent = expanded ? "Ver más" : "Ver menos";
        button.setAttribute("aria-expanded", String(!expanded));
      });
    }

    if (paginationNode) {
      paginationNode.addEventListener("click", function (event) {
        var button = event.target.closest("[data-page-action]");
        if (!button || button.disabled) return;
        state.page += button.getAttribute("data-page-action") === "next" ? 1 : -1;
        render();
      });
    }
  }

  function setFeedData(payload) {
    var entries = Array.isArray(payload) ? payload : (payload && payload.entries) || [];
    state.entries = entries.slice().sort(function (a, b) {
      return String(b.reported_at || "").localeCompare(String(a.reported_at || ""));
    });
    render();
  }

  function loadJson(path) {
    return fetch(path).then(function (response) {
      if (!response.ok) throw new Error("No se pudo cargar " + path);
      return response.json();
    });
  }

  function init() {
    bindEvents();
    return loadJson("data/scams.json")
      .then(setFeedData)
      .catch(function () {
        var listNode = document.querySelector("#feed-list");
        if (listNode) {
          listNode.innerHTML = '<div class="card empty-state">Error al cargar las estafas reportadas. Inténtalo de nuevo.</div>';
        }
      });
  }

  var api = {
    init: init,
    render: render,
    setFeedData: setFeedData,
    _state: state,
    _internal: {
      relativeDate: relativeDate,
      truncate: truncate
    }
  };

  root.EstafaGuard = Object.assign(root.EstafaGuard || {}, { feed: api });
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);
