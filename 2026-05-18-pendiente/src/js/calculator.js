/**
 * calculator.js — Calculadora de ahorro en comisiones para Bizum Pay Ready
 * Fase: DEVELOP — T-05
 *
 * Expone:
 *   BizumPayReady.calculator.calculate(monthlyVolume, avgTicket) → Object
 *   BizumPayReady.calculator.getRates()                           → Object
 *   BizumPayReady.calculator.render(containerId)                  → inyecta el widget
 */
(function () {
  var ns = window.BizumPayReady || {};
  window.BizumPayReady = ns;
  ns.calculator = ns.calculator || {};

  var _rates = null;
  var _fmt = new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR", maximumFractionDigits: 0 });

  /* ── API pública ─────────────────────────────────────────────── */

  /**
   * Calcula costes mensuales y ahorro.
   * @param {number} monthlyVolume — volumen mensual en €
   * @param {number} avgTicket     — ticket medio en €
   * @returns {{ debito_cost, credito_cost, bizum_cost, monthly_savings_vs_debito, monthly_savings_vs_credito, annual_savings_vs_debito, annual_savings_vs_credito }}
   */
  ns.calculator.calculate = function (monthlyVolume, avgTicket) {
    var v = Math.max(0, Number(monthlyVolume) || 0);
    // avgTicket available for future granular calculations
    var r = _rates || { debito: { pct: 0.35 }, credito: { pct: 0.65 }, bizum_pay: { pct: 0 } };

    var debitoCost = v * (r.debito.pct / 100);
    var creditoCost = v * (r.credito.pct / 100);
    var bizumCost = v * (r.bizum_pay.pct / 100);

    return {
      debito_cost: debitoCost,
      credito_cost: creditoCost,
      bizum_cost: bizumCost,
      monthly_savings_vs_debito: debitoCost - bizumCost,
      monthly_savings_vs_credito: creditoCost - bizumCost,
      annual_savings_vs_debito: (debitoCost - bizumCost) * 12,
      annual_savings_vs_credito: (creditoCost - bizumCost) * 12
    };
  };

  /**
   * Devuelve las tasas cargadas.
   * @returns {Object}
   */
  ns.calculator.getRates = function () {
    return _rates;
  };

  /**
   * Renderiza el widget de calculadora en un contenedor.
   * @param {string} containerId
   */
  ns.calculator.render = function (containerId) {
    var el = document.getElementById(containerId);
    if (!el) return;

    el.innerHTML = _widgetHTML();
    _bindSliders(el);

    // Calcular inicial
    _updateDisplay(el);
  };

  /* ── Inicialización diferida ─────────────────────────────────── */

  ns.calculator.ensureRates = function () {
    if (_rates) return Promise.resolve(_rates);
    return ns.loadCommissions().then(function (r) {
      _rates = r;
      return r;
    });
  };

  /* ── Widget HTML ─────────────────────────────────────────────── */

  function _widgetHTML() {
    return [
      '<div class="calculator-widget">',
        '<h3 class="calculator-title">💶 Calcula tu ahorro con Bizum Pay</h3>',
        '<div class="calculator-controls">',
          '<div class="slider-group">',
            '<label for="calc-volume">Facturación mensual: <strong class="calc-val" id="calc-volume-val">30.000 €</strong></label>',
            '<input type="range" id="calc-volume" min="1000" max="200000" step="500" value="30000" aria-label="Facturación mensual en euros" aria-valuemin="1000" aria-valuemax="200000" aria-valuenow="30000">',
          '</div>',
          '<div class="slider-group">',
            '<label for="calc-ticket">Ticket medio: <strong class="calc-val" id="calc-ticket-val">35 €</strong></label>',
            '<input type="range" id="calc-ticket" min="5" max="500" step="1" value="35" aria-label="Ticket medio en euros" aria-valuemin="5" aria-valuemax="500" aria-valuenow="35">',
          '</div>',
        '</div>',
        '<div class="calculator-results">',
          '<div class="calc-row">',
            '<span>Comisión tarjeta débito</span>',
            '<span class="calc-cost" id="calc-debito-cost">105 €/mes</span>',
          '</div>',
          '<div class="calc-row">',
            '<span>Comisión tarjeta crédito</span>',
            '<span class="calc-cost" id="calc-credito-cost">195 €/mes</span>',
          '</div>',
          '<div class="calc-row calc-bizum">',
            '<span>Comisión Bizum Pay</span>',
            '<span class="calc-cost calc-savings" id="calc-bizum-cost">0 €/mes</span>',
          '</div>',
          '<div class="calc-savings-highlight">',
            '<span class="calc-savings-label">Ahorras al año con Bizum Pay:</span>',
            '<span class="calc-savings-big" id="calc-annual-savings">2.340 €</span>',
            '<span class="calc-savings-vs">vs tarjeta de crédito</span>',
          '</div>',
        '</div>',
        '<p class="calculator-note">Cálculo orientativo basado en tasas medias de mercado. Las comisiones reales dependen de tu contrato.</p>',
      '</div>'
    ].join("");
  }

  function _bindSliders(el) {
    var volSlider = el.querySelector("#calc-volume");
    var ticketSlider = el.querySelector("#calc-ticket");

    function onChange() {
      _updateDisplay(el);
    }

    if (volSlider) volSlider.addEventListener("input", onChange);
    if (ticketSlider) ticketSlider.addEventListener("input", onChange);
  }

  function _updateDisplay(el) {
    var volSlider = el.querySelector("#calc-volume");
    var ticketSlider = el.querySelector("#calc-ticket");

    var vol = Number(volSlider ? volSlider.value : 30000);
    var ticket = Number(ticketSlider ? ticketSlider.value : 35);

    // Update label displays
    var volVal = el.querySelector("#calc-volume-val");
    var ticketVal = el.querySelector("#calc-ticket-val");
    if (volVal) volVal.textContent = _fmt.format(vol);
    if (ticketVal) ticketVal.textContent = _fmt.format(ticket);

    // Update ARIA
    if (volSlider) volSlider.setAttribute("aria-valuenow", vol);
    if (ticketSlider) ticketSlider.setAttribute("aria-valuenow", ticket);

    var s = ns.calculator.calculate(vol, ticket);

    var debitoEl = el.querySelector("#calc-debito-cost");
    var creditoEl = el.querySelector("#calc-credito-cost");
    var bizumEl = el.querySelector("#calc-bizum-cost");
    var annualEl = el.querySelector("#calc-annual-savings");

    if (debitoEl) debitoEl.textContent = _fmt.format(s.debito_cost) + "/mes";
    if (creditoEl) creditoEl.textContent = _fmt.format(s.credito_cost) + "/mes";
    if (bizumEl) bizumEl.textContent = "0 €/mes";
    if (annualEl) annualEl.textContent = _fmt.format(s.annual_savings_vs_credito);
  }
})();
