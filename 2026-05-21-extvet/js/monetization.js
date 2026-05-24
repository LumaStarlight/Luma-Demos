(function (root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
  } else {
    root.ExtVetMonetization = factory(root);
  }
})(typeof globalThis !== "undefined" ? globalThis : this, function (root) {
  "use strict";

  var doc = (root && root.document) || (typeof document !== "undefined" ? document : null);

  /**
   * Reads a <meta name="extvet:KEY" content="VALUE"> tag.
   */
  function readMeta(name) {
    if (!doc) return "";
    var meta = doc.querySelector('meta[name="extvet:' + name + '"]');
    return meta ? (meta.getAttribute("content") || "") : "";
  }

  /**
   * Returns true when AdSense identifiers look configured.
   */
  function isAdConfigured() {
    var client = readMeta("ad-client");
    var bannerSlot = readMeta("ad-banner-slot");
    var sidebarSlot = readMeta("ad-sidebar-slot");
    return !!(client && (bannerSlot || sidebarSlot));
  }

  /**
   * Activates a single ad slot element: if AdSense IDs are set, replace the
   * placeholder content with a real <ins> element.
   */
  function activateSlot(el, adClient, adSlot) {
    if (!el || !adClient || !adSlot) return;
    // If the slot already has a real <ins> child, skip.
    if (el.querySelector("ins.adsbygoogle")) return;

    el.innerHTML = "";
    var ins = doc.createElement("ins");
    ins.className = "adsbygoogle";
    ins.style.display = "block";
    ins.setAttribute("data-ad-client", adClient);
    ins.setAttribute("data-ad-slot", adSlot);
    ins.setAttribute("data-ad-format", "auto");
    ins.setAttribute("data-full-width-responsive", "true");
    el.setAttribute("data-ad-client", adClient);
    el.setAttribute("data-ad-slot", adSlot);
    el.appendChild(ins);

    // Trigger AdSense if the library is loaded
    try {
      if ((root.adsbygoogle = root.adsbygoogle || []).push) {
        root.adsbygoogle.push({});
      }
    } catch (_) { /* AdSense not loaded – placeholder stays functional */ }
  }

  /**
   * Returns the HTML string for affiliate tool links injected into the
   * recommendations section after results are rendered.
   */
  function affiliateToolsHtml() {
    var tools = [
      { name: "Snyk", url: "https://snyk.io/ide/vs-code/", desc: "Escaneo de vulnerabilidades en dependencias" },
      { name: "GitGuardian", url: "https://www.gitguardian.com/", desc: "Detección de secretos en repositorios" },
      { name: "Socket", url: "https://socket.dev/", desc: "Análisis de paquetes y dependencias" },
    ];
    return tools.map(function (t) {
      return '<li><a class="affiliate-link" href="' +
        t.url.replace(/&/g, "&amp;").replace(/"/g, "&quot;") +
        '" target="_blank" rel="sponsored nofollow noopener">' +
        t.name.replace(/&/g, "&amp;") +
        '</a> <span aria-hidden="true">🔗</span> — ' +
        t.desc.replace(/&/g, "&amp;") +
        '</li>';
    }).join("");
  }

  /**
   * Injects affiliate tool recommendations into the recommendations container.
   * Safe to call after renderer produces results (idempotent – won't duplicate).
   */
  function injectAffiliateTools() {
    if (!doc) return;
    var recommendations = doc.querySelector("#recommendations");
    if (!recommendations) return;

    // Only inject once
    if (recommendations.querySelector(".affiliate-tools")) return;

    var div = doc.createElement("div");
    div.className = "affiliate-tools card fade-in";
    div.innerHTML =
      '<h4>🔧 Herramientas de seguridad recomendadas</h4>' +
      '<ul class="recommendation-list">' + affiliateToolsHtml() + '</ul>' +
      '<p class="affiliate-disclosure">Enlaces patrocinados —podemos recibir una comisión sin coste para ti.</p>';
    recommendations.appendChild(div);
  }

  /**
   * Initialises ad slots: reads meta tags, activates banner + sidebar.
   */
  function initAdSlots() {
    if (!doc) return;
    var client = readMeta("ad-client");
    var bannerSlot = readMeta("ad-banner-slot");
    var sidebarSlot = readMeta("ad-sidebar-slot");

    if (!client) return; // No AdSense configured — leave placeholders visible

    var bannerEl = doc.getElementById("ad-banner");
    var sidebarEl = doc.getElementById("ad-sidebar");

    if (bannerEl && bannerSlot) activateSlot(bannerEl, client, bannerSlot);
    if (sidebarEl && sidebarSlot) activateSlot(sidebarEl, client, sidebarSlot);
  }

  /* ──────────────── Premium Gate ──────────────── */

  var PREMIUM_EMAIL_KEY = "extvet_premium_email";

  function showPremiumButtons() {
    var el = doc && doc.getElementById("premium-actions");
    if (el) el.hidden = false;
  }

  function hidePremiumButtons() {
    var el = doc && doc.getElementById("premium-actions");
    if (el) el.hidden = true;
  }

  function openPremiumModal() {
    if (!doc) return;
    var modal = doc.getElementById("premium-modal");
    if (!modal) return;

    var savedEmail = null;
    try { savedEmail = localStorage.getItem(PREMIUM_EMAIL_KEY); } catch (_) {}

    var form = doc.getElementById("premium-form");
    var confirmation = doc.getElementById("premium-confirmation");
    var registered = doc.getElementById("premium-registered");
    var emailInput = doc.getElementById("premium-email");
    var error = doc.getElementById("premium-email-error");
    var stripeBtn = doc.getElementById("premium-stripe-btn");

    // Reset state
    if (form) form.hidden = false;
    if (confirmation) confirmation.hidden = true;
    if (registered) registered.hidden = true;
    if (emailInput) { emailInput.value = ""; emailInput.disabled = false; }
    if (error) error.textContent = "";

    // Update Stripe URL
    if (stripeBtn) {
      var stripeUrl = readMeta("stripe-url");
      if (stripeUrl) {
        stripeBtn.href = stripeUrl;
        stripeBtn.style.display = "";
      } else {
        stripeBtn.style.display = "none";
      }
    }

    if (savedEmail) {
      if (form) form.hidden = true;
      if (registered) registered.hidden = false;
    }

    modal.hidden = false;
    doc.body.classList.add("modal-open");
  }

  function closePremiumModal() {
    if (!doc) return;
    var modal = doc.getElementById("premium-modal");
    if (modal) modal.hidden = true;
    doc.body.classList.remove("modal-open");
  }

  function handlePremiumSubmit(event) {
    event.preventDefault();
    if (!doc) return;

    var emailInput = doc.getElementById("premium-email");
    var error = doc.getElementById("premium-email-error");
    var form = doc.getElementById("premium-form");
    var confirmation = doc.getElementById("premium-confirmation");

    var email = (emailInput && emailInput.value || "").trim();

    // Validate
    if (!email || email.indexOf("@") === -1 || email.indexOf(".") === -1) {
      if (error) error.textContent = "Introduce un email válido (ej. tu@email.com).";
      if (emailInput) emailInput.focus();
      return;
    }

    if (error) error.textContent = "";

    // Save
    try { localStorage.setItem(PREMIUM_EMAIL_KEY, email); } catch (_) { /* quota */ }

    // Show confirmation
    if (form) form.hidden = true;
    if (confirmation) {
      confirmation.hidden = false;
      confirmation.textContent = "¡Registrado! Te avisaremos cuando el servicio esté listo.";
    }

    // Close after 2s
    setTimeout(closePremiumModal, 2000);
  }

  function initPremiumGate() {
    if (!doc) return;

    // Premium buttons click → open modal
    var monitorBtn = doc.getElementById("premium-monitor");
    var exportBtn = doc.getElementById("premium-export");
    if (monitorBtn) monitorBtn.addEventListener("click", openPremiumModal);
    if (exportBtn) exportBtn.addEventListener("click", openPremiumModal);

    // Close button
    var closeBtn = doc.getElementById("premium-modal-close");
    if (closeBtn) closeBtn.addEventListener("click", closePremiumModal);

    // Click outside modal → close
    var modal = doc.getElementById("premium-modal");
    if (modal) {
      modal.addEventListener("click", function (e) {
        if (e.target === modal) closePremiumModal();
      });
    }

    // Escape key → close
    doc.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && modal && !modal.hidden) closePremiumModal();
    });

    // Form submit
    var form = doc.getElementById("premium-form");
    if (form) form.addEventListener("submit", handlePremiumSubmit);

    // Watch summary-card → show premium buttons when populated
    var summary = doc.getElementById("summary-card");
    if (summary) {
      var premiumObserver = new MutationObserver(function () {
        if (summary.classList.contains("summary-card")) {
          showPremiumButtons();
          premiumObserver.disconnect();
        }
      });
      premiumObserver.observe(summary, { attributes: true, attributeFilter: ["class"] });
      // Also check immediately
      if (summary.classList.contains("summary-card")) showPremiumButtons();
    }
  }

  /* ──────────────── Entry Point ──────────────── */

  /**
   * Public entry point.  Called once on DOMContentLoaded.
   *  1. Initialise ad slots (activate if configured, else show placeholder).
   *  2. Register a MutationObserver to inject affiliate tools after results render.
   *  3. Initialise premium gate (modal, buttons, email capture).
   */
  function initMonetization() {
    if (!doc) return;

    initAdSlots();
    initPremiumGate();

    // Inject affiliate tools when the recommendations section gets content
    var recommendations = doc.querySelector("#recommendations");
    if (recommendations) {
      // First check: if already populated, inject now
      if (recommendations.children.length > 0) {
        injectAffiliateTools();
      }
      // Otherwise watch for changes
      var observer = new MutationObserver(function () {
        if (recommendations.children.length > 0) {
          injectAffiliateTools();
          observer.disconnect();
        }
      });
      observer.observe(recommendations, { childList: true, subtree: false });
    }

    // Update copyright year and bind config details (idempotent)
    var yearEl = doc.getElementById("current-year");
    if (yearEl && !yearEl.textContent.match(/^\d{4}$/)) {
      yearEl.textContent = String(new Date().getFullYear());
    }
  }

  // Auto-init on DOMContentLoaded
  if (doc) {
    if (doc.readyState === "loading") {
      doc.addEventListener("DOMContentLoaded", initMonetization);
    } else {
      // DOM already ready
      initMonetization();
    }
  }

  return {
    initMonetization: initMonetization,
    injectAffiliateTools: injectAffiliateTools,
    initAdSlots: initAdSlots,
    isAdConfigured: isAdConfigured,
    initPremiumGate: initPremiumGate,
    openPremiumModal: openPremiumModal,
    closePremiumModal: closePremiumModal,
    showPremiumButtons: showPremiumButtons,
    hidePremiumButtons: hidePremiumButtons,
  };
});
