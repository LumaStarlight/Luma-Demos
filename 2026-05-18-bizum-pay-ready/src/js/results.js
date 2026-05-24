/**
 * results.js — Motor de compatibilidad y vista de resultados para Bizum Pay Ready
 * Fase: DEVELOP — T-04
 *
 * Expone:
 *   BizumPayReady.results.render(terminal, savings)
 *   BizumPayReady.results.show(terminal)
 *   BizumPayReady.results.reset()
 */
(function () {
  var ns = window.BizumPayReady || {};
  window.BizumPayReady = ns;
  ns.results = ns.results || {};

  var _currentTerminal = null;

  /**
   * Renderiza la tarjeta de resultado completo en #results-content.
   * @param {Object} terminal — entrada de terminals.json (o null para genérico)
   * @param {Object} savings  — resultado de calculator.js (opcional al llamar)
   */
  ns.results.render = function (terminal, savings) {
    _currentTerminal = terminal;
    var container = document.getElementById("results-content");
    if (!container) return;

    if (!terminal) {
      container.innerHTML = _renderGeneric();
    } else if (terminal.compatible) {
      container.innerHTML = _renderCompatible(terminal, savings);
    } else {
      container.innerHTML = _renderNotCompatible(terminal);
    }
  };

  /**
   * Muestra la vista de resultados con transición.
   * @param {Object} terminal
   */
  ns.results.show = function (terminal) {
    var landing = document.getElementById("landing");
    var results = document.getElementById("results");

    // Calcular ahorro
    var savings = null;
    if (ns.calculator && ns.calculator.calculate) {
      savings = ns.calculator.calculate(30000, 35);
    }

    ns.results.render(terminal, savings);

    if (landing) {
      landing.hidden = true;
      landing.style.display = "none";
    }
    if (results) {
      results.hidden = false;
      results.style.display = "block";
      results.style.opacity = "0";
      results.style.transition = "opacity 300ms ease";
      // Force reflow
      results.offsetHeight;
      results.style.opacity = "1";
    }
  };

  /**
   * Vuelve a la landing.
   */
  ns.results.reset = function () {
    var landing = document.getElementById("landing");
    var results = document.getElementById("results");
    var input = document.getElementById("terminal-search");
    if (results) { results.hidden = true; results.style.display = "none"; results.style.opacity = ""; }
    if (landing) { landing.hidden = false; landing.style.display = "block"; }
    if (input) input.value = "";
    _currentTerminal = null;
  };

  /* ── Render helpers ───────────────────────────────────────────── */

  function _renderCompatible(t, savings) {
    setTimeout(function () {
      if (ns.calculator && ns.calculator.render) ns.calculator.render("calculator-slot");
      if (ns.badge && ns.badge.renderControls) {
        ns.badge.renderControls("badge-slot", {
          businessName: t.bank ? "Comercio " + t.bank : "Mi comercio",
          url: window.location.origin || window.location.href
        });
      }
    }, 0);

    return [
      '<div class="result-card compatible">',
        '<div class="result-header">',
          '<span class="result-icon" aria-hidden="true">✅</span>',
          '<div>',
            '<h3 class="result-status compatible">Compatible</h3>',
            '<p class="result-terminal-name">' + _esc(t.brand) + ' ' + _esc(t.model) + (t.bank ? ' — ' + _esc(t.bank) : '') + '</p>',
          '</div>',
        '</div>',
        '<div class="result-body">',
          '<p class="result-detail">' + _esc(t.detail) + '</p>',
          '<div class="result-meta">',
            '<span class="result-category">' + _categoryLabel(t.category) + '</span>',
            t.source ? '<a class="result-source" href="' + _esc(t.source) + '" target="_blank" rel="noopener">Ver fuente oficial →</a>' : '',
            '<span class="result-updated">Actualizado: ' + _esc(t.last_updated) + '</span>',
          '</div>',
        '</div>',
      '</div>',
      '<div id="calculator-slot"></div>',
      '<div id="badge-slot"></div>',
      _renderMonetization(),
      '<div class="results-actions">',
        '<button class="btn-new-search" onclick="BizumPayReady.results.reset()">← Nueva consulta</button>',
      '</div>'
    ].join("");
  }

  function _renderNotCompatible(t) {
    return [
      '<div class="result-card not-compatible">',
        '<div class="result-header">',
          '<span class="result-icon" aria-hidden="true">❌</span>',
          '<div>',
            '<h3 class="result-status not-compatible">No compatible</h3>',
            '<p class="result-terminal-name">' + _esc(t.brand) + ' ' + _esc(t.model) + (t.bank ? ' — ' + _esc(t.bank) : '') + '</p>',
          '</div>',
        '</div>',
        '<div class="result-body">',
          '<p class="result-detail">' + _esc(t.detail) + '</p>',
          '<div class="result-meta">',
            '<span class="result-category">' + _categoryLabel(t.category) + '</span>',
            t.source ? '<a class="result-source" href="' + _esc(t.source) + '" target="_blank" rel="noopener">Ver fuente oficial →</a>' : '',
            '<span class="result-updated">Actualizado: ' + _esc(t.last_updated) + '</span>',
          '</div>',
        '</div>',
        '<div class="result-alternatives">',
          '<p><strong>Alternativas:</strong> Considera actualizar a un terminal SmartPOS con NFC. Consulta nuestra sección de <a href="#afiliados">terminales recomendados</a>.</p>',
        '</div>',
      '</div>',
      _renderMonetization(),
      '<div class="results-actions">',
        '<button class="btn-new-search" onclick="BizumPayReady.results.reset()">← Nueva consulta</button>',
      '</div>'
    ].join("");
  }

  function _renderGeneric() {
    return [
      '<div class="result-card unknown">',
        '<div class="result-header">',
          '<span class="result-icon" aria-hidden="true">⚠️</span>',
          '<div>',
            '<h3 class="result-status unknown">Terminal no encontrado</h3>',
          '</div>',
        '</div>',
        '<div class="result-body">',
          '<p class="result-detail">No tenemos información sobre este terminal en nuestra base de datos. La compatibilidad con Bizum Pay depende de si tu terminal tiene NFC y de si tu banco o entidad adquirente ha activado el servicio.</p>',
          '<p><strong>Recomendación:</strong> Contacta con tu banco para confirmar si tu datáfono acepta Bizum Pay. Mientras tanto, puedes explorar nuestros <a href="#afiliados">terminales recomendados</a>.</p>',
        '</div>',
      '</div>',
      _renderMonetization(),
      '<div class="results-actions">',
        '<button class="btn-new-search" onclick="BizumPayReady.results.reset()">← Nueva consulta</button>',
      '</div>'
    ].join("");
  }

  function _renderMonetization() {
    return [
      '<section id="premium" class="monetization-section premium-panel" aria-labelledby="premium-title">',
        '<div>',
          '<p class="eyebrow">Para comercios con varias ubicaciones</p>',
          '<h3 id="premium-title">Mejora a Premium</h3>',
          '<p class="premium-price">Desde 4,99 €/mes</p>',
          '<ul class="premium-benefits">',
            '<li>Badge personalizado con tu logo y colores.</li>',
            '<li>Analytics de consultas y clics en el QR.</li>',
            '<li>Múltiples ubicaciones y equipos de tienda.</li>',
            '<li>Sin marca de agua en materiales descargados.</li>',
          '</ul>',
        '</div>',
        '<a class="premium-cta" href="https://checkout.stripe.com/c/pay/test-price-id" target="_blank" rel="noopener noreferrer">Activar Premium</a>',
      '</section>',
      '<section id="afiliados" class="monetization-section affiliate-panel" aria-labelledby="affiliate-title">',
        '<div>',
          '<p class="eyebrow">Compatibles con NFC</p>',
          '<h3 id="affiliate-title">Terminales recomendados</h3>',
        '</div>',
        '<div class="affiliate-grid">',
          _affiliateCard("SumUp Solo", "Desde 39 € + comisión por operación", "https://www.sumup.com/es-es/?utm_source=bizumpayready&utm_medium=afiliado"),
          _affiliateCard("myPOS Go 2", "Desde 39 € sin cuota mensual", "https://www.mypos.com/es-es?utm_source=bizumpayready&utm_medium=afiliado"),
          _affiliateCard("Square Terminal", "Desde 165 € pago único orientativo", "https://squareup.com/es/es?utm_source=bizumpayready&utm_medium=afiliado"),
        '</div>',
      '</section>'
    ].join("");
  }

  function _affiliateCard(name, price, url) {
    return [
      '<article class="affiliate-card">',
        '<h4>' + _esc(name) + '</h4>',
        '<p>' + _esc(price) + '</p>',
        '<a href="' + _esc(url) + '" target="_blank" rel="noopener noreferrer">Ver oferta</a>',
      '</article>'
    ].join("");
  }

  function _categoryLabel(cat) {
    var labels = {
      smartpos: "SmartPOS",
      tradicional: "Tradicional",
      tap2phone: "Tap to Phone",
      app: "App"
    };
    var cssClass = cat === "tradicional" ? "cat-tradicional" : "cat-smartpos";
    return '<span class="category-tag ' + cssClass + '">' + (labels[cat] || cat) + '</span>';
  }

  function _esc(s) {
    if (!s) return "";
    return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }
})();
