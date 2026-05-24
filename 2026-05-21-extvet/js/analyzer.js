(function (root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
  } else {
    root.ExtVetAnalyzer = factory();
  }
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const DB_URL = "data/extensions-db.json";
  const LOAD_ERROR = "No se pudo cargar la base de datos. Verifica tu conexión.";

  const RISK_MESSAGES = {
    "excessive-permissions": "Permisos amplios sobre repositorio o workspace.",
    "recent-publisher-change": "Publisher con cambio reciente o señal de transferencia.",
    "unknown-publisher": "Publisher no encontrado en la base de reputación local.",
    "flagged-execute": "Puede ejecutar comandos o tareas locales.",
    "publisher-history": "Publisher asociado a incidentes o extensiones sospechosas.",
    "low-downloads": "Baja adopción pública, revisar antes de instalar.",
    "no-updates": "Sin mantenimiento reciente conocido.",
  };

  const FACTOR_IMPACT = {
    "excessive-permissions": -15,
    "recent-publisher-change": -20,
    "unknown-publisher": -10,
    "flagged-execute": -15,
    "publisher-history": -20,
    "low-downloads": -5,
    "no-updates": -5,
  };

  function normalizeId(id) {
    return String(id || "").trim().toLowerCase();
  }

  function getPublisher(id) {
    return normalizeId(id).split(".")[0] || "";
  }

  function unique(values) {
    return Array.from(new Set(values.filter(Boolean)));
  }

  function scoreToTier(score) {
    if (score <= 25) return "critical";
    if (score <= 50) return "high";
    if (score <= 75) return "medium";
    return "low";
  }

  function statusFromScore(score) {
    if (score <= 25) return "critical";
    if (score <= 75) return "warning";
    return "clean";
  }

  function calculateScore(entry, riskFactors) {
    if (entry && entry.knownMalicious) {
      return 0;
    }

    if (entry && typeof entry.scoreImpact === "number") {
      return Math.max(0, Math.min(100, 100 + entry.scoreImpact));
    }

    const impact = unique(riskFactors).reduce((total, factor) => {
      return total + (FACTOR_IMPACT[factor] || 0);
    }, 0);

    return Math.max(0, Math.min(100, 100 + impact));
  }

  function buildIndexes(db) {
    const byId = new Map();
    const byPublisher = new Map();

    (db.extensions || []).forEach((entry) => {
      const id = normalizeId(entry.id);
      const publisher = getPublisher(id);
      const normalizedEntry = Object.assign({}, entry, { id });

      byId.set(id, normalizedEntry);

      if (!byPublisher.has(publisher)) {
        byPublisher.set(publisher, []);
      }
      byPublisher.get(publisher).push(normalizedEntry);
    });

    return { byId, byPublisher };
  }

  function permissionsToRisks(permissions) {
    const normalized = (permissions || []).map((permission) => String(permission).toLowerCase());
    const risks = [];

    if (
      normalized.includes("repository:*") ||
      normalized.includes("repo:*") ||
      (normalized.includes("repository") && (normalized.includes("*") || normalized.includes("network")))
    ) {
      risks.push("excessive-permissions");
    }

    if (normalized.includes("execute") || normalized.includes("commands") || normalized.includes("terminal")) {
      risks.push("flagged-execute");
    }

    return risks;
  }

  class Analyzer {
    constructor(options) {
      this.dbUrl = (options && options.dbUrl) || DB_URL;
      this.lastResults = new Map();
    }

    async loadDatabase() {
      if (typeof fetch !== "function") {
        throw new Error(LOAD_ERROR);
      }

      try {
        const response = await fetch(this.dbUrl);
        if (!response || !response.ok) {
          throw new Error(LOAD_ERROR);
        }
        return await response.json();
      } catch (error) {
        throw new Error(LOAD_ERROR);
      }
    }

    analyzeExtension(id, indexes) {
      const normalizedId = normalizeId(id);
      const publisher = getPublisher(normalizedId);
      const exact = indexes.byId.get(normalizedId);
      const publisherMatches = indexes.byPublisher.get(publisher) || [];
      const fuzzy = exact ? null : publisherMatches[0] || null;
      const source = exact || fuzzy;

      const riskFactors = unique([
        ...(source && Array.isArray(source.riskFactors) ? source.riskFactors : []),
        ...(source ? permissionsToRisks(source.permissions) : []),
        ...(source ? [] : ["unknown-publisher"]),
        ...(!exact && fuzzy ? ["publisher-history"] : []),
      ]);

      const score = calculateScore(source, riskFactors);
      const status = source && source.knownMalicious
        ? "critical"
        : riskFactors.length > 0
          ? statusFromScore(Math.min(score, 75))
          : statusFromScore(score);
      const warnings = riskFactors.map((factor) => RISK_MESSAGES[factor] || factor);

      if (!exact && fuzzy) {
        warnings.unshift(`Publisher relacionado con una entrada de riesgo: ${fuzzy.id}`);
      }

      const result = {
        id: normalizedId,
        status,
        score,
        tier: scoreToTier(score),
        matchType: exact ? "exact" : fuzzy ? "publisher" : "unknown",
        warnings,
        riskFactors,
        mitigation: source ? source.mitigation : "Verifica el publisher, descargas y repositorio antes de mantenerla instalada.",
      };

      if (source) {
        result.displayName = source.displayName;
        result.knownMalicious = Boolean(source.knownMalicious);
        if (source.incident) result.incident = source.incident;
        if (source.incidentUrl) result.incidentUrl = source.incidentUrl;
      }

      return result;
    }

    async analyze(extensions, db) {
      const database = db || await this.loadDatabase();
      const indexes = buildIndexes(database);
      const ids = unique((extensions || []).map(normalizeId));
      const perExtension = ids.map((id) => this.analyzeExtension(id, indexes));
      const totalExtensions = perExtension.length;
      const score = totalExtensions
        ? Math.round(perExtension.reduce((sum, item) => sum + item.score, 0) / totalExtensions)
        : 100;
      const criticalExtensions = perExtension.filter((item) => item.status === "critical").length;
      const warningExtensions = perExtension.filter((item) => item.status === "warning").length;
      const cleanExtensions = perExtension.filter((item) => item.status === "clean").length;
      const recommendations = perExtension
        .filter((item) => item.status !== "clean")
        .map((item) => `${item.id}: ${item.mitigation}`);

      this.lastResults = new Map(perExtension.map((item) => [item.id, item]));

      return {
        overall: {
          score,
          tier: scoreToTier(score),
          totalExtensions,
          cleanExtensions,
          warningExtensions,
          criticalExtensions,
          recommendations,
        },
        perExtension,
      };
    }

    getRiskDetails(extId) {
      const result = this.lastResults.get(normalizeId(extId));
      return result ? result.warnings.slice() : [];
    }
  }

  return {
    Analyzer,
    LOAD_ERROR,
    scoreToTier,
  };
});
