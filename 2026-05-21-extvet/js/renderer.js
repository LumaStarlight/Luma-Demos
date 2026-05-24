(function (root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
  } else {
    root.ExtVetRenderer = factory();
  }
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const STATUS_ORDER = { critical: 0, warning: 1, clean: 2 };
  const STATUS_ICON = { critical: "🔴", warning: "🟡", clean: "🟢" };
  const TIER_ICON = { critical: "🔴", high: "🟠", medium: "🟡", low: "🟢" };
  const TIER_LABEL = {
    critical: "Crítico",
    high: "Alto",
    medium: "Medio",
    low: "Bajo",
  };

  function escapeHtml(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function tierInfo(overall) {
    const fromResult = overall && overall.tierInfo;
    const tier = (fromResult && fromResult.tier) || (overall && overall.tier) || "low";
      return {
      tier,
      emoji: (fromResult && fromResult.emoji) || TIER_ICON[tier] || "🟢",
      label: (fromResult && fromResult.label) || TIER_LABEL[tier] || "Bajo",
    };
  }

  function asArray(value) {
    return Array.isArray(value) ? value : [];
  }

  function sortExtensions(items) {
    return asArray(items).slice().sort((a, b) => {
      const byStatus = (STATUS_ORDER[a.status] ?? 3) - (STATUS_ORDER[b.status] ?? 3);
      if (byStatus !== 0) return byStatus;
      return (a.score || 100) - (b.score || 100);
    });
  }

  function commandFor(id) {
    return "code --uninstall-extension " + id;
  }

  class Renderer {
    constructor(options) {
      const rootElement = (options && options.root) || document;
      this.summary = rootElement.querySelector("#summary-card");
      this.badgeTools = rootElement.querySelector("#badge-tools");
      this.table = rootElement.querySelector("#extensions-table");
      this.recommendations = rootElement.querySelector("#recommendations");
      this.mitigation = rootElement.querySelector("#mitigation");
    }

    renderEmpty() {
      if (this.summary) {
        this.summary.className = "results-empty card";
        this.summary.textContent = "Analiza tus extensiones para ver resultados aquí.";
      }
      if (this.badgeTools) this.badgeTools.innerHTML = "";
      if (this.table) this.table.innerHTML = "";
      if (this.recommendations) this.recommendations.innerHTML = "";
      if (this.mitigation) this.mitigation.innerHTML = "";
    }

    renderResults(scoredResult) {
      const result = scoredResult || {};
      const overall = result.overall || {};
      const extensions = sortExtensions(result.perExtension);

      if (!extensions.length) {
        this.renderEmpty();
        return;
      }

      this.renderSummary(overall);
      this.renderBadge(overall);
      this.renderTable(extensions);
      this.renderRecommendations(overall.recommendations, extensions);
      this.renderMitigation();
      this.animateScore(overall.score || 0);
    }

    renderBadge(overall) {
      if (!this.badgeTools || !root.ExtVetBadge) return;
      const info = tierInfo(overall);
      root.ExtVetBadge.renderBadgeTools(this.badgeTools, {
        score: overall.score,
        tier: info.tier,
      });
    }

    renderSummary(overall) {
      if (!this.summary) return;
      const info = tierInfo(overall);
      const score = Number.isFinite(overall.score) ? overall.score : 100;
      const circumference = 2 * Math.PI * 54;

      this.summary.className = "summary-card card fade-in tier-" + info.tier;
      this.summary.innerHTML = `
        <div class="score-ring" aria-label="Puntuación global de seguridad">
          <svg viewBox="0 0 140 140" role="img" aria-hidden="true">
            <circle class="score-track" cx="70" cy="70" r="54"></circle>
            <circle class="score-progress" cx="70" cy="70" r="54"
              stroke-dasharray="${circumference}"
              stroke-dashoffset="${circumference}"></circle>
          </svg>
          <div class="score-value" data-score-target="${score}">0<span>/100</span></div>
        </div>
        <div class="summary-content">
          <span class="summary-tier"><span>${escapeHtml(info.emoji)} Riesgo ${escapeHtml(info.label)}</span></span>
          <h3>Resumen del análisis</h3>
          <div class="summary-stats">
            <div class="summary-stat"><strong>${overall.totalExtensions || 0}</strong><span>Total</span></div>
            <div class="summary-stat"><strong>${overall.cleanExtensions || 0}</strong><span>Limpias</span></div>
            <div class="summary-stat"><strong>${overall.warningExtensions || 0}</strong><span>Avisos</span></div>
            <div class="summary-stat"><strong>${overall.criticalExtensions || 0}</strong><span>Críticas</span></div>
          </div>
        </div>
      `;
    }

    renderTable(extensions) {
      if (!this.table) return;
      const rows = extensions.map((item, index) => {
        const risks = asArray(item.warnings).length ? item.warnings : asArray(item.riskFactors);
        const riskList = risks.length
          ? `<ul class="risk-list">${risks.map((risk) => `<li>${escapeHtml(risk)}</li>`).join("")}</ul>`
          : "Sin señales conocidas";
        const tier = item.tier || (item.tierInfo && item.tierInfo.tier) || "low";
        const rowStatus = item.status === "critical" ? "critical" : item.status === "clean" ? "clean" : "warning";
        const alternative = item.alternativeUrl
          ? `<a href="${escapeHtml(item.alternativeUrl)}" target="_blank" rel="noopener">Alternativa segura</a>`
          : "";

        return `
          <tr class="extension-row-${rowStatus} fade-in" style="animation-delay: ${index * 35}ms">
            <td data-label="ID"><code>${escapeHtml(item.id)}</code></td>
            <td data-label="Estado">${STATUS_ICON[rowStatus]} ${escapeHtml(rowStatus)}</td>
            <td data-label="Score"><strong>${item.score ?? 100}</strong>/100</td>
            <td data-label="Tier"><span class="badge-${tier}">${escapeHtml(TIER_LABEL[tier] || tier)}</span></td>
            <td data-label="Riesgos">${riskList}</td>
            <td data-label="Mitigación">
              ${escapeHtml(item.mitigation || "Mantener vigilancia y revisar publisher antes de actualizar.")}
              ${alternative}
              ${rowStatus !== "clean" ? `<button class="btn uninstall-copy" data-command="${escapeHtml(commandFor(item.id))}">Copiar desinstalación</button>` : ""}
            </td>
          </tr>
        `;
      }).join("");

      this.table.innerHTML = `
        <section class="card result-section fade-in" aria-labelledby="extensions-title">
          <h3 id="extensions-title">Extensiones analizadas</h3>
          <div class="results-table-wrap">
            <table class="results-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Estado</th>
                  <th>Score</th>
                  <th>Tier</th>
                  <th>Riesgos</th>
                  <th>Mitigación</th>
                </tr>
              </thead>
              <tbody>${rows}</tbody>
            </table>
          </div>
        </section>
      `;
      this.bindCopyButtons();
    }

    renderRecommendations(recommendations, extensions) {
      if (!this.recommendations) return;
      const generated = asArray(recommendations);
      const fallback = extensions
        .filter((item) => item.status !== "clean")
        .map((item) => `${item.id}: ${item.mitigation || "revisar antes de mantener instalada."}`);
      const items = generated.length ? generated : fallback;

      this.recommendations.innerHTML = `
        <section class="card result-section fade-in" aria-labelledby="recommendations-title">
          <h3 id="recommendations-title">Recomendaciones</h3>
          ${items.length
            ? `<ol class="recommendation-list">${items.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ol>`
            : "<p>No hay acciones urgentes. Mantén tus extensiones actualizadas y revisa permisos tras cada instalación.</p>"}
          <p class="safe-alternatives">
            Para sustituciones, prioriza extensiones verificadas en el
            <a href="https://marketplace.visualstudio.com/vscode" target="_blank" rel="noopener">Marketplace oficial</a>
            y revisa señales de reputación con
            <a href="https://socket.dev/" target="_blank" rel="noopener">Socket</a>.
          </p>
        </section>
      `;
    }

    renderMitigation() {
      if (!this.mitigation) return;
      this.mitigation.innerHTML = `
        <section class="card result-section fade-in" aria-labelledby="mitigation-title">
          <h3 id="mitigation-title">Guía de mitigación</h3>
          <ol class="mitigation-list">
            <li>Desinstala las extensiones críticas y reinicia VS Code.</li>
            <li>Revoca tokens o credenciales usadas en repositorios abiertos recientemente.</li>
            <li>Ejecuta <code>code --list-extensions</code> de nuevo y vuelve a analizar.</li>
            <li>Consulta la <a href="https://code.visualstudio.com/docs/editor/extension-marketplace#_extension-marketplace" target="_blank" rel="noopener">documentación oficial de VS Code Marketplace</a>.</li>
          </ol>
        </section>
      `;
    }

    bindCopyButtons() {
      if (!this.table) return;
      this.table.querySelectorAll("[data-command]").forEach((button) => {
        button.addEventListener("click", async () => {
          const command = button.getAttribute("data-command") || "";
          try {
            if (navigator.clipboard && navigator.clipboard.writeText) {
              await navigator.clipboard.writeText(command);
              button.textContent = "Copiado";
            } else {
              button.textContent = command;
            }
          } catch (error) {
            button.textContent = command;
          }
          setTimeout(() => {
            button.textContent = "Copiar desinstalación";
          }, 1800);
        });
      });
    }

    animateScore(score) {
      if (!this.summary) return;
      const progress = this.summary.querySelector(".score-progress");
      const value = this.summary.querySelector(".score-value");
      if (!progress || !value) return;

      const circumference = 2 * Math.PI * 54;
      const target = Math.max(0, Math.min(100, Math.round(score)));
      const start = performance.now();
      const duration = 800;

      requestAnimationFrame(() => {
        progress.style.strokeDashoffset = String(circumference * (1 - target / 100));
      });

      const tick = (now) => {
        const elapsed = Math.min(1, (now - start) / duration);
        const current = Math.round(target * elapsed);
        value.innerHTML = `${current}<span>/100</span>`;
        if (elapsed < 1) requestAnimationFrame(tick);
      };

      requestAnimationFrame(tick);
    }
  }

  return { Renderer };
});
