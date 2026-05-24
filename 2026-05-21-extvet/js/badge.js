(function (root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
  } else {
    root.ExtVetBadge = factory();
  }
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const TIER_META = {
    critical: { label: "Critical", color: "#dc2626" },
    high: { label: "High", color: "#fb923c" },
    medium: { label: "Medium", color: "#facc15" },
    low: { label: "Low", color: "#15803d" },
  };

  function normalizeTier(tier) {
    return TIER_META[tier] ? tier : "low";
  }

  function escapeXml(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&apos;");
  }

  function scoreText(score) {
    const safeScore = Number.isFinite(Number(score))
      ? Math.max(0, Math.min(100, Math.round(Number(score))))
      : 100;
    return String(safeScore);
  }

  function generateBadgeSVG(score, tier) {
    const safeTier = normalizeTier(tier);
    const meta = TIER_META[safeTier];
    const scoreLabel = scoreText(score);
    const rightText = scoreLabel + " / 100 " + meta.label;

    return [
      '<svg xmlns="http://www.w3.org/2000/svg" width="200" height="20" role="img" aria-label="ExtVet Score: ',
      escapeXml(scoreLabel),
      " - ",
      escapeXml(meta.label),
      '">',
      '<title>ExtVet Score: ',
      escapeXml(scoreLabel),
      " - ",
      escapeXml(meta.label),
      "</title>",
      '<linearGradient id="s" x2="0" y2="100%">',
      '<stop offset="0" stop-color="#fff" stop-opacity=".18"/>',
      '<stop offset="1" stop-color="#000" stop-opacity=".12"/>',
      "</linearGradient>",
      '<clipPath id="r"><rect width="200" height="20" rx="4" fill="#fff"/></clipPath>',
      '<g clip-path="url(#r)">',
      '<rect width="70" height="20" fill="#1f2937"/>',
      '<rect x="70" width="130" height="20" fill="',
      meta.color,
      '"/>',
      '<rect width="200" height="20" fill="url(#s)"/>',
      "</g>",
      '<g fill="#fff" text-anchor="middle" font-family="Verdana,Geneva,sans-serif" font-size="11">',
      '<text x="35" y="15" fill="#010101" fill-opacity=".3">ExtVet</text>',
      '<text x="35" y="14">ExtVet</text>',
      '<text x="135" y="15" fill="#010101" fill-opacity=".24">',
      escapeXml(rightText),
      "</text>",
      '<text x="135" y="14">',
      escapeXml(rightText),
      "</text>",
      "</g>",
      "</svg>",
    ].join("");
  }

  function badgeDataUri(score, tier) {
    return "data:image/svg+xml," + encodeURIComponent(generateBadgeSVG(score, tier));
  }

  function markdownBadge(score, tier) {
    const safeTier = normalizeTier(tier);
    const label = TIER_META[safeTier].label;
    return "[![ExtVet Score: " + scoreText(score) + " - " + label + "](" + badgeDataUri(score, safeTier) + ")](#)";
  }

  function htmlBadge(score, tier) {
    const safeTier = normalizeTier(tier);
    const label = TIER_META[safeTier].label;
    return '<img src="' + badgeDataUri(score, safeTier) + '" alt="ExtVet Score: ' + scoreText(score) + " - " + label + '" />';
  }

  async function copyText(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }

    const input = document.createElement("textarea");
    input.value = text;
    input.setAttribute("readonly", "");
    input.style.position = "fixed";
    input.style.left = "-9999px";
    document.body.appendChild(input);
    input.select();
    const ok = document.execCommand("copy");
    input.remove();
    return ok;
  }

  function currentUrl() {
    return window.location.href.split("#")[0];
  }

  function shareUrls(score, tier) {
    const text = "Analiza la seguridad de tus extensiones de VS Code en ExtVet";
    const url = currentUrl();
    return {
      x: "https://twitter.com/intent/tweet?text=" + encodeURIComponent(text) + "&url=" + encodeURIComponent(url),
      linkedin: "https://www.linkedin.com/sharing/share-offsite/?url=" + encodeURIComponent(url),
      reddit: "https://www.reddit.com/submit?url=" + encodeURIComponent(url) + "&title=" + encodeURIComponent(text + " — score " + scoreText(score) + " " + normalizeTier(tier)),
    };
  }

  function renderBadgeTools(container, options) {
    if (!container) return;
    const score = options && options.score;
    const tier = normalizeTier(options && options.tier);
    const urls = shareUrls(score, tier);

    container.innerHTML = [
      '<section class="card result-section badge-tools fade-in" aria-labelledby="badge-title">',
      '<div class="badge-tools-heading">',
      '<div><h3 id="badge-title">Badge compartible</h3>',
      '<p>Publica el score de seguridad en README, issues o redes.</p></div>',
      '<div class="badge-preview" aria-hidden="true">',
      generateBadgeSVG(score, tier),
      "</div>",
      "</div>",
      '<div class="badge-actions">',
      '<div class="badge-copy-menu">',
      '<button class="btn" type="button" data-badge-toggle>Copiar Badge</button>',
      '<div class="badge-menu" hidden>',
      '<button type="button" data-copy-badge="markdown">Copiar Markdown</button>',
      '<button type="button" data-copy-badge="html">Copiar HTML</button>',
      "</div>",
      "</div>",
      '<a class="btn" href="' + urls.x + '" target="_blank" rel="noopener">X/Twitter</a>',
      '<a class="btn" href="' + urls.linkedin + '" target="_blank" rel="noopener">LinkedIn</a>',
      '<a class="btn" href="' + urls.reddit + '" target="_blank" rel="noopener">Reddit</a>',
      '<button class="btn" type="button" data-copy-link>Copiar link</button>',
      '<span class="copy-feedback" aria-live="polite"></span>',
      "</div>",
      "</section>",
    ].join("");

    bindBadgeTools(container, score, tier);
  }

  function bindBadgeTools(container, score, tier) {
    const menu = container.querySelector(".badge-menu");
    const feedback = container.querySelector(".copy-feedback");
    const showFeedback = (message) => {
      if (!feedback) return;
      feedback.textContent = message;
      feedback.classList.add("is-visible");
      setTimeout(() => {
        feedback.classList.remove("is-visible");
        feedback.textContent = "";
      }, 2000);
    };

    const toggle = container.querySelector("[data-badge-toggle]");
    if (toggle && menu) {
      toggle.addEventListener("click", () => {
        menu.hidden = !menu.hidden;
      });
    }

    container.querySelectorAll("[data-copy-badge]").forEach((button) => {
      button.addEventListener("click", async () => {
        const type = button.getAttribute("data-copy-badge");
        const value = type === "html" ? htmlBadge(score, tier) : markdownBadge(score, tier);
        await copyText(value);
        if (menu) menu.hidden = true;
        showFeedback("Copiado");
      });
    });

    const copyLink = container.querySelector("[data-copy-link]");
    if (copyLink) {
      copyLink.addEventListener("click", async () => {
        await copyText(currentUrl());
        showFeedback("Copiado");
      });
    }
  }

  return {
    badgeDataUri,
    generateBadgeSVG,
    htmlBadge,
    markdownBadge,
    renderBadgeTools,
  };
});
