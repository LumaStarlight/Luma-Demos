(function (root) {
  "use strict";

  var STOPWORDS = new Set([
    "el", "la", "de", "que", "y", "a", "en", "un", "por", "con", "no", "su",
    "para", "es", "lo", "como", "mas", "más", "al", "este", "esta"
  ]);
  var MIN_CONFIDENCE = 40;
  var state = {
    scams: [],
    alerts: []
  };

  function stripAccents(value) {
    return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  }

  function normalizeText(value) {
    return stripAccents(String(value || "").trim().toLowerCase());
  }

  function detectType(raw, normalized) {
    if (/^https?:\/\//.test(normalized)) return "url";
    if (/^\+?[0-9]{7,15}$/.test(raw.trim())) return "phone";
    if (normalized.indexOf("@") !== -1) return "email";
    return "text";
  }

  function tokenize(value) {
    return normalizeText(value)
      .split(/[^a-z0-9]+/i)
      .map(function (token) { return token.trim(); })
      .filter(function (token) { return token.length > 1 && !STOPWORDS.has(token); });
  }

  function digitsOnly(value) {
    return String(value || "").replace(/\D/g, "");
  }

  function extractDomain(value) {
    var normalized = normalizeText(value);
    try {
      if (/^https?:\/\//.test(normalized)) {
        return new URL(normalized).hostname.replace(/^www\./, "");
      }
    } catch (error) {
      return normalized.replace(/^https?:\/\//, "").split(/[/?#]/)[0].replace(/^www\./, "");
    }

    if (normalized.indexOf("@") !== -1) {
      return normalized.split("@").pop().split(/[>\s]/)[0].replace(/^www\./, "");
    }

    return normalized.split(/[/?#\s]/)[0].replace(/^www\./, "");
  }

  function levenshtein(a, b) {
    if (a === b) return 0;
    if (!a.length) return b.length;
    if (!b.length) return a.length;

    var previous = Array.from({ length: b.length + 1 }, function (_, index) { return index; });
    for (var i = 0; i < a.length; i += 1) {
      var current = [i + 1];
      for (var j = 0; j < b.length; j += 1) {
        var cost = a[i] === b[j] ? 0 : 1;
        current[j + 1] = Math.min(
          current[j] + 1,
          previous[j + 1] + 1,
          previous[j] + cost
        );
      }
      previous = current;
    }
    return previous[b.length];
  }

  function activeScams() {
    return state.scams.filter(function (entry) { return entry && entry.active === true; });
  }

  function buildResult(entry, score, maxScore, matchedTokens) {
    var confidence = Math.min(100, Math.round((score / Math.max(maxScore, 25)) * 100));
    return {
      scam_id: entry.id,
      title: entry.title,
      match_type: confidence >= 75 ? "high" : "medium",
      matched_tokens: Array.from(new Set(matchedTokens)),
      severity: entry.severity,
      description: entry.description,
      tips: entry.tips || [],
      source_label: entry.source_label,
      source_url: entry.source_url,
      category: entry.category,
      confidence: confidence,
      tags: (entry.patterns || []).concat(entry.category || [])
    };
  }

  function scoreTextEntry(entry, tokens) {
    var score = 0;
    var matched = [];
    var patterns = (entry.patterns || []).map(normalizeText);

    tokens.forEach(function (token) {
      var tokenMatched = false;
      patterns.forEach(function (pattern) {
        var patternTokens = tokenize(pattern);
        if (pattern === token || patternTokens.indexOf(token) !== -1) {
          score += 25;
          tokenMatched = true;
        } else if (pattern.indexOf(token) !== -1 || token.indexOf(pattern) !== -1) {
          score += 15;
          tokenMatched = true;
        } else if (patternTokens.some(function (patternToken) {
          return Math.max(token.length, patternToken.length) >= 4 && levenshtein(token, patternToken) <= 2;
        })) {
          score += 10;
          tokenMatched = true;
        }
      });
      if (tokenMatched) matched.push(token);
    });

    return { score: score, matched: matched, maxScore: tokens.length * 25 };
  }

  function scoreUrlEntry(entry, domain) {
    var matched = [];
    (entry.urls || []).forEach(function (url) {
      var candidate = extractDomain(url);
      if (candidate && (domain.indexOf(candidate) !== -1 || candidate.indexOf(domain) !== -1)) {
        matched.push(candidate);
      }
    });
    return { score: matched.length ? 100 : 0, matched: matched, maxScore: 100 };
  }

  function scorePhoneEntry(entry, queryDigits) {
    var matched = [];
    (entry.phones || []).forEach(function (phone) {
      var candidate = digitsOnly(phone);
      if (candidate && candidate === queryDigits) matched.push(phone);
    });
    return { score: matched.length ? 100 : 0, matched: matched, maxScore: 100 };
  }

  function scoreEmailEntry(entry, domain) {
    var matched = [];
    (entry.emails || []).forEach(function (email) {
      var candidate = extractDomain(email);
      if (candidate && (domain === candidate || domain.indexOf(candidate) !== -1 || candidate.indexOf(domain) !== -1)) {
        matched.push(email);
      }
    });
    return { score: matched.length ? 100 : 0, matched: matched, maxScore: 100 };
  }

  function collectWarnings(results) {
    var warningSet = new Set();
    var today = new Date().toISOString().slice(0, 10);
    var matchedTags = new Set();

    results.forEach(function (result) {
      (result.tags || []).forEach(function (tag) { matchedTags.add(normalizeText(tag)); });
      matchedTags.add(normalizeText(result.category));
    });

    state.alerts.forEach(function (alert) {
      if (!alert || today < alert.active_from || today > alert.active_until) return;
      var hasTag = (alert.tags || []).some(function (tag) { return matchedTags.has(normalizeText(tag)); });
      if (hasTag) warningSet.add(alert.message);
    });

    return Array.from(warningSet);
  }

  function noMatch(query, queryType, warning) {
    return {
      query: query,
      query_type: queryType,
      found: false,
      confidence: 0,
      results: [],
      warnings: [warning || "No hemos encontrado esta estafa en la base actual. Si te parece sospechosa, repórtala para revisarla."],
      suggestion: "#report-section"
    };
  }

  function search(input) {
    if (input === null || input === undefined || String(input).trim() === "") {
      return noMatch("", "text", "Introduce un texto, URL, email o teléfono para verificarlo.");
    }

    var raw = String(input).trim();
    var normalized = normalizeText(raw);
    var queryType = detectType(raw, normalized);
    var results = [];

    activeScams().forEach(function (entry) {
      var scored;
      if (queryType === "url") scored = scoreUrlEntry(entry, extractDomain(raw));
      else if (queryType === "phone") scored = scorePhoneEntry(entry, digitsOnly(raw));
      else if (queryType === "email") scored = scoreEmailEntry(entry, extractDomain(raw));
      else scored = scoreTextEntry(entry, tokenize(raw));

      if (scored.score <= 0) return;
      var result = buildResult(entry, scored.score, scored.maxScore, scored.matched);
      if (result.confidence >= MIN_CONFIDENCE) results.push(result);
    });

    results.sort(function (a, b) { return b.confidence - a.confidence; });
    if (!results.length) return noMatch(raw, queryType);

    return {
      query: raw,
      query_type: queryType,
      found: true,
      confidence: results[0].confidence,
      results: results,
      warnings: collectWarnings(results)
    };
  }

  function setSearchData(scamsPayload, alertsPayload) {
    state.scams = Array.isArray(scamsPayload) ? scamsPayload : (scamsPayload && scamsPayload.entries) || [];
    state.alerts = Array.isArray(alertsPayload) ? alertsPayload : (alertsPayload && alertsPayload.alerts) || [];
  }

  var api = {
    search: search,
    configureSearch: setSearchData,
    setSearchData: setSearchData,
    _internal: {
      tokenize: tokenize,
      detectType: detectType,
      extractDomain: extractDomain,
      levenshtein: levenshtein
    }
  };

  root.EstafaGuard = Object.assign(root.EstafaGuard || {}, api);
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);
