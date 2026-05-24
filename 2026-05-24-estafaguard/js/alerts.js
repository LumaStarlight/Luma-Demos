(function (root) {
  "use strict";

  var STORAGE_KEY = "estafaguard_dismissed_alerts";
  var DISMISS_TTL_MS = 24 * 60 * 60 * 1000;
  var ROTATION_MS = 8000;

  var state = {
    alerts: [],
    visibleAlerts: [],
    currentIndex: 0,
    timer: null
  };

  function escapeHtml(value) {
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function todayIso() {
    var now = new Date();
    return new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()))
      .toISOString()
      .slice(0, 10);
  }

  function readDismissed() {
    try {
      var parsed = JSON.parse(root.localStorage.getItem(STORAGE_KEY) || "[]");
      var now = Date.now();
      if (!Array.isArray(parsed)) return [];
      return parsed.filter(function (item) {
        return item && item.id && item.dismissed_at && now - Date.parse(item.dismissed_at) < DISMISS_TTL_MS;
      });
    } catch (error) {
      return [];
    }
  }

  function writeDismissed(items) {
    try {
      root.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch (error) {
      // localStorage can be unavailable in private modes; the banner still works.
    }
  }

  function isActiveAlert(alert, today) {
    return alert && alert.active_from <= today && today <= alert.active_until;
  }

  function getVisibleAlerts(payload) {
    var alerts = Array.isArray(payload) ? payload : (payload && payload.alerts) || [];
    var dismissedIds = new Set(readDismissed().map(function (item) { return item.id; }));
    var today = todayIso();
    return alerts.filter(function (alert) {
      return isActiveAlert(alert, today) && !dismissedIds.has(alert.id);
    });
  }

  function rootNode() {
    return document.querySelector("#alert-banner-root");
  }

  function severityClass(severity) {
    if (severity === "high") return "alert-banner-high";
    if (severity === "medium") return "alert-banner-medium";
    return "alert-banner-low";
  }

  function renderAlert(alert) {
    var rootEl = rootNode();
    if (!rootEl || !alert) return;

    rootEl.innerHTML = [
      '<section class="alert-banner ' + severityClass(alert.severity) + '" data-alert-id="' + escapeHtml(alert.id) + '">',
      '<div class="alert-banner-content">',
      '<span class="alert-banner-icon" aria-hidden="true">' + escapeHtml(alert.icon || "!") + "</span>",
      "<div>",
      '<strong class="alert-banner-title">' + escapeHtml(alert.title) + "</strong>",
      '<p class="alert-banner-message">' + escapeHtml(alert.message) + "</p>",
      "</div>",
      "</div>",
      '<a class="btn btn-outline alert-banner-cta" href="' + escapeHtml(alert.cta_url) + '" target="_blank" rel="noopener">' + escapeHtml(alert.cta_label || "Ver consejo") + "</a>",
      '<button class="alert-banner-close" type="button" aria-label="Cerrar alerta">&times;</button>',
      "</section>"
    ].join("");
  }

  function stopRotation() {
    if (state.timer) {
      root.clearInterval(state.timer);
      state.timer = null;
    }
  }

  function rotate() {
    if (state.visibleAlerts.length <= 1) return;
    state.currentIndex = (state.currentIndex + 1) % state.visibleAlerts.length;
    renderAlert(state.visibleAlerts[state.currentIndex]);
  }

  function startRotation() {
    stopRotation();
    if (state.visibleAlerts.length > 1) {
      state.timer = root.setInterval(rotate, ROTATION_MS);
    }
  }

  function dismissCurrent() {
    var current = state.visibleAlerts[state.currentIndex];
    var rootEl = rootNode();
    if (!current || !rootEl) return;

    var banner = rootEl.querySelector(".alert-banner");
    if (banner) banner.classList.add("is-dismissing");

    var dismissed = readDismissed();
    dismissed = dismissed.filter(function (item) { return item.id !== current.id; });
    dismissed.push({ id: current.id, dismissed_at: new Date().toISOString() });
    writeDismissed(dismissed);

    state.visibleAlerts = state.visibleAlerts.filter(function (alert) { return alert.id !== current.id; });
    state.currentIndex = Math.min(state.currentIndex, Math.max(0, state.visibleAlerts.length - 1));

    root.setTimeout(function () {
      if (!state.visibleAlerts.length) {
        stopRotation();
        rootEl.innerHTML = "";
        return;
      }
      renderAlert(state.visibleAlerts[state.currentIndex]);
      startRotation();
    }, 220);
  }

  function bindEvents() {
    var rootEl = rootNode();
    if (!rootEl) return;
    rootEl.addEventListener("click", function (event) {
      if (event.target.closest(".alert-banner-close")) dismissCurrent();
    });
  }

  function setAlertsData(payload) {
    state.alerts = Array.isArray(payload) ? payload : (payload && payload.alerts) || [];
    state.visibleAlerts = getVisibleAlerts(state.alerts);
    state.currentIndex = 0;
    if (!state.visibleAlerts.length) {
      var rootEl = rootNode();
      if (rootEl) rootEl.innerHTML = "";
      stopRotation();
      return;
    }
    renderAlert(state.visibleAlerts[0]);
    startRotation();
  }

  function loadJson(path) {
    return fetch(path).then(function (response) {
      if (!response.ok) throw new Error("No se pudo cargar " + path);
      return response.json();
    });
  }

  function init() {
    bindEvents();
    return loadJson("data/alerts.json").then(setAlertsData);
  }

  var api = {
    init: init,
    setAlertsData: setAlertsData,
    getVisibleAlerts: getVisibleAlerts,
    _state: state
  };

  root.EstafaGuard = Object.assign(root.EstafaGuard || {}, { alerts: api });
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);
