/**
 * data-loader.js — Cargador de datos estáticos para Bizum Pay Ready
 * Fase: DEVELOP — T-02
 *
 * Expone:
 *   BizumPayReady.loadTerminals() → Promise<Array>
 *   BizumPayReady.loadCommissions() → Promise<Object>
 *
 * Ambos cargan mediante fetch() con ruta relativa.
 * Si fetch falla (offline/servidor local), carga desde copia inline.
 */
(function () {
  var ns = window.BizumPayReady || {};
  window.BizumPayReady = ns;

  // ── Fallback inline — si el fetch falla ──────────────────────────
  // Se generan al minificar/embeber datos; para desarrollo basta con el fetch.

  /**
   * Carga los terminales, con fallback inline.
   * @returns {Promise<Array>}
   */
  ns.loadTerminals = function () {
    return fetch("src/data/terminals.json")
      .then(function (r) {
        if (!r.ok) throw new Error("HTTP " + r.status);
        return r.json();
      })
      .catch(function () {
        // Fallback inline
        if (window.__TERMINALS__) return Promise.resolve(window.__TERMINALS__);
        console.warn("BizumPayReady: no se pudieron cargar los datos de terminales.");
        return Promise.resolve([]);
      });
  };

  /**
   * Carga las comisiones, con fallback inline.
   * @returns {Promise<Object>}
   */
  ns.loadCommissions = function () {
    return fetch("src/data/commissions.json")
      .then(function (r) {
        if (!r.ok) throw new Error("HTTP " + r.status);
        return r.json();
      })
      .catch(function () {
        if (window.__COMMISSIONS__) return Promise.resolve(window.__COMMISSIONS__);
        console.warn("BizumPayReady: no se pudieron cargar las comisiones.");
        return Promise.resolve({
          debito: { pct: 0.35, min_fixed: 0 },
          credito: { pct: 0.65, min_fixed: 0 },
          bizum_pay: { pct: 0, min_fixed: 0 },
          monthly_tpv_rental: 15,
          notes: "Datos por defecto offline."
        });
      });
  };
})();
