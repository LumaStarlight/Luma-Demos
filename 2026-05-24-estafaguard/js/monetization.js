(function () {
  "use strict";

  window.EstafaGuard = window.EstafaGuard || {};

  var ADSENSE_SRC = "https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js";
  var hasLoadedAds = false;
  var hasInitialized = false;

  function getAdClient() {
    var slot = document.querySelector(".adsbygoogle[data-ad-client]");
    return slot ? slot.getAttribute("data-ad-client") : "";
  }

  function isPlaceholderClient(client) {
    return !client || client.indexOf("XXXX") !== -1;
  }

  function markDevelopmentAds() {
    var slots = document.querySelectorAll(".adsbygoogle");
    Array.prototype.forEach.call(slots, function (slot) {
      slot.setAttribute("data-ad-placeholder", "true");
      if (!slot.textContent.trim()) {
        slot.textContent = "Anuncio";
      }
    });
  }

  function loadAdsense() {
    if (hasLoadedAds) {
      return;
    }

    var client = getAdClient();
    if (isPlaceholderClient(client)) {
      markDevelopmentAds();
      return;
    }

    hasLoadedAds = true;

    (function () {
      var warmup = new Image();
      warmup.src = ADSENSE_SRC + "?client=" + encodeURIComponent(client);

      var script = document.createElement("script");
      script.async = true;
      script.src = ADSENSE_SRC + "?client=" + encodeURIComponent(client);
      script.crossOrigin = "anonymous";
      document.head.appendChild(script);

      script.addEventListener("load", function () {
        var slots = document.querySelectorAll(".adsbygoogle");
        Array.prototype.forEach.call(slots, function () {
          try {
            (window.adsbygoogle = window.adsbygoogle || []).push({});
          } catch (error) {
            markDevelopmentAds();
          }
        });
      });
    })();
  }

  function bindLazyLoad() {
    ["click", "touchstart", "scroll"].forEach(function (eventName) {
      window.addEventListener(eventName, loadAdsense, { once: true, passive: true });
    });
  }

  function initAffiliateTracking() {
    var links = document.querySelectorAll('[data-affiliate="true"]');
    Array.prototype.forEach.call(links, function (link) {
      link.addEventListener("click", function () {
        try {
          localStorage.setItem("estafaguard_last_affiliate_click", JSON.stringify({
            name: link.textContent.trim(),
            href: link.href,
            clicked_at: new Date().toISOString()
          }));
        } catch (error) {
          // Affiliate links remain regular links if storage is unavailable.
        }
      });
    });
  }

  window.EstafaGuard.monetization = {
    init: function () {
      if (hasInitialized) {
        return;
      }

      hasInitialized = true;
      markDevelopmentAds();
      bindLazyLoad();
      initAffiliateTracking();
    },
    loadAdsense: loadAdsense
  };
})();
