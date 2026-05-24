(function (root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
  } else {
    root.ExtVetScorer = factory();
  }
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const DEDUCTIONS = {
    knownMalicious: 100,
    suspiciousPattern: 40,
    "excessive-permissions": 15,
    "unknown-publisher": 10,
    "recent-publisher-change": 20,
    "low-downloads": 5,
    "no-updates": 5,
    "flagged-execute": 15,
    "publisher-history": 20,
  };

  const TIER_INFO = {
    critical: {
      tier: "critical",
      emoji: "🔴",
      label: "Crítico",
      color: "#dc2626",
    },
    high: {
      tier: "high",
      emoji: "🟠",
      label: "Alto",
      color: "#ea580c",
    },
    medium: {
      tier: "medium",
      emoji: "🟡",
      label: "Medio",
      color: "#ca8a04",
    },
    low: {
      tier: "low",
      emoji: "🟢",
      label: "Bajo",
      color: "#16a34a",
    },
  };

  function clampScore(value) {
    const numeric = Number.isFinite(value) ? value : 100;
    return Math.max(0, Math.min(100, Math.round(numeric)));
  }

  function getTierInfo(score) {
    const normalized = clampScore(score);

    if (normalized <= 25) return Object.assign({}, TIER_INFO.critical);
    if (normalized <= 50) return Object.assign({}, TIER_INFO.high);
    if (normalized <= 75) return Object.assign({}, TIER_INFO.medium);
    return Object.assign({}, TIER_INFO.low);
  }

  function unique(values) {
    return Array.from(new Set((values || []).filter(Boolean)));
  }

  function normalizeId(id) {
    return String(id || "").trim().toLowerCase();
  }

  function buildDbIndex(db) {
    const index = new Map();

    (db && Array.isArray(db.extensions) ? db.extensions : []).forEach((entry) => {
      const id = normalizeId(entry.id);
      if (id) {
        index.set(id, entry);
      }
    });

    return index;
  }

  function getEntry(extension, dbIndex) {
    const id = normalizeId(extension && extension.id);
    return id ? dbIndex.get(id) || null : null;
  }

  function getRiskFactors(extension, entry) {
    const fromAnalysis = Array.isArray(extension && extension.riskFactors)
      ? extension.riskFactors
      : [];
    const fromDb = Array.isArray(entry && entry.riskFactors) ? entry.riskFactors : [];
    const factors = unique(fromAnalysis.concat(fromDb));

    if ((extension && extension.knownMalicious) || (entry && entry.knownMalicious)) {
      factors.unshift("knownMalicious");
    }

    if (
      (extension && extension.suspiciousPattern) ||
      (entry && entry.suspiciousPattern)
    ) {
      factors.push("suspiciousPattern");
    }

    return unique(factors);
  }

  function scoreExtension(extension, dbIndex) {
    const source = extension || {};
    const entry = getEntry(source, dbIndex);
    const riskFactors = getRiskFactors(source, entry);
    const deduction = riskFactors.reduce((total, factor) => {
      return total + (DEDUCTIONS[factor] || 0);
    }, 0);
    const score = clampScore(100 - deduction);
    const tierInfo = getTierInfo(score);

    // Preserve analyzer semantics: any extension with active risk factors
    // should show at least "warning", even if the numerical score is > 75.
    // This matches the logic in analyzer.js statusFromScore(Math.min(score, 75))
    // for the non-critical case.
    const hasActiveRisks = riskFactors.length > 0 && !riskFactors.includes("no-updates") && !riskFactors.includes("low-downloads");
    const status = (tierInfo.tier === "critical")
      ? "critical"
      : (hasActiveRisks && tierInfo.tier === "low")
        ? "warning"
        : tierInfo.tier === "low"
          ? "clean"
          : "warning";

    return Object.assign({}, source, {
      id: normalizeId(source.id),
      status,
      score,
      tier: tierInfo.tier,
      tierInfo,
      riskFactors,
      scoreBreakdown: {
        base: 100,
        deduction,
        factors: riskFactors.map((factor) => ({
          factor,
          impact: -(DEDUCTIONS[factor] || 0),
        })),
      },
    });
  }

  function getRecommendations(perExtension) {
    return (perExtension || []).reduce((recommendations, item) => {
      if (!item || item.status === "clean") {
        return recommendations;
      }

      if (item.status === "critical") {
        recommendations.push(
          `Desinstalar ${item.id} inmediatamente${item.mitigation ? `: ${item.mitigation}` : "."}`
        );
      } else if ((item.riskFactors || []).includes("unknown-publisher")) {
        recommendations.push(
          `Revisar ${item.id}: publisher no verificado en la base local.`
        );
      } else if ((item.riskFactors || []).includes("flagged-execute")) {
        recommendations.push(
          `Auditar ${item.id}: declara permisos de ejecución de comandos o terminal.`
        );
      } else {
        recommendations.push(
          `Revisar ${item.id}: presenta señales de riesgo antes de mantenerla instalada.`
        );
      }

      return recommendations;
    }, []);
  }

  function scoreExtensions(analysisResult, db) {
    const result = analysisResult || {};
    const dbIndex = buildDbIndex(db);
    const perExtension = (result.perExtension || []).map((extension) => {
      return scoreExtension(extension, dbIndex);
    });
    const totalExtensions = perExtension.length;
    const globalScore = totalExtensions
      ? clampScore(perExtension.reduce((sum, item) => sum + item.score, 0) / totalExtensions)
      : 100;
    const globalTier = getTierInfo(globalScore);
    const criticalExtensions = perExtension.filter((item) => item.status === "critical").length;
    const warningExtensions = perExtension.filter((item) => item.status === "warning").length;
    const cleanExtensions = perExtension.filter((item) => item.status === "clean").length;
    const recommendations = getRecommendations(perExtension);

    return Object.assign({}, result, {
      overall: Object.assign({}, result.overall || {}, {
        score: globalScore,
        tier: globalTier.tier,
        tierInfo: globalTier,
        totalExtensions,
        cleanExtensions,
        warningExtensions,
        criticalExtensions,
        recommendations,
      }),
      perExtension,
    });
  }

  return {
    DEDUCTIONS,
    getRecommendations,
    getTierInfo,
    scoreExtensions,
  };
});
