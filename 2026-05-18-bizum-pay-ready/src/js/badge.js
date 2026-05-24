/**
 * badge.js — Generador de badge imprimible para Bizum Pay Ready
 * Fase: DEVELOP — T-06
 */
(function () {
  var ns = window.BizumPayReady || {};
  window.BizumPayReady = ns;
  ns.badge = ns.badge || {};

  var _canvas = null;
  var _options = null;

  ns.badge.render = function (containerId, options) {
    var container = document.getElementById(containerId);
    if (!container) return null;

    _options = _normaliseOptions(options);
    container.innerHTML = "";

    if (!_supportsCanvas()) {
      container.innerHTML = [
        '<div class="badge-fallback">',
          '<p>Tu navegador no soporta la generación de badges</p>',
          '<p class="badge-url">' + _esc(_options.url) + '</p>',
        '</div>'
      ].join("");
      return null;
    }

    _canvas = document.createElement("canvas");
    _canvas.className = "bizum-badge-canvas";
    _drawBadge(_canvas, _options, 1200, 630);
    container.appendChild(_canvas);
    return _canvas;
  };

  ns.badge.downloadPNG = function (filename) {
    if (!_canvas || !_canvas.toDataURL) return;
    var link = document.createElement("a");
    link.download = filename || "badge-bizum-pay.png";
    link.href = _canvas.toDataURL("image/png");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  ns.badge.preparePrint = function () {
    if (!_options) return;
    var printSlot = document.getElementById("badge-output");
    var printView = document.getElementById("print");
    if (!printSlot) return;
    printSlot.innerHTML = "";
    if (_supportsCanvas()) {
      var printCanvas = document.createElement("canvas");
      printCanvas.className = "bizum-badge-canvas print-badge-canvas";
      _drawBadge(printCanvas, _options, 800, 600);
      printSlot.appendChild(printCanvas);
    } else {
      printSlot.textContent = _options.url;
    }
    if (printView) printView.hidden = false;
    document.body.classList.add("print-ready");
  };

  ns.badge.renderControls = function (containerId, options) {
    var slot = document.getElementById(containerId);
    if (!slot) return;
    slot.innerHTML = [
      '<div class="badge-widget">',
        '<div class="badge-copy">',
          '<h3>Badge listo para tu comercio</h3>',
          '<p>Genera una imagen PNG o imprime un cartel con QR para que tus clientes paguen con Bizum Pay.</p>',
        '</div>',
        '<label class="badge-field" for="badge-business-name">Nombre del comercio</label>',
        '<input id="badge-business-name" class="badge-input" value="' + _esc(options.businessName) + '" maxlength="42">',
        '<div id="badge-preview" class="badge-preview"></div>',
        '<div class="badge-actions">',
          '<button type="button" id="badge-download">Descargar PNG</button>',
          '<button type="button" id="badge-print">Imprimir</button>',
        '</div>',
      '</div>'
    ].join("");

    var input = document.getElementById("badge-business-name");
    var renderCurrent = function () {
      ns.badge.render("badge-preview", {
        businessName: input.value || options.businessName,
        url: options.url,
        freeMode: true
      });
    };
    renderCurrent();
    input.addEventListener("input", renderCurrent);
    document.getElementById("badge-download").addEventListener("click", function () {
      ns.badge.downloadPNG(_slug(input.value || options.businessName) + "-bizum-pay.png");
    });
    document.getElementById("badge-print").addEventListener("click", function () {
      ns.badge.preparePrint();
      window.print();
    });
  };

  function _drawBadge(canvas, options, width, height) {
    var ctx = canvas.getContext("2d");
    var scale = width / 1200;
    var qrSize = Math.round((height === 600 ? 188 : 220) * scale);
    var qrCanvas = document.createElement("canvas");
    var qrX = width - qrSize - Math.round(70 * scale);
    var qrY = height - qrSize - Math.round(70 * scale);

    canvas.width = width;
    canvas.height = height;
    ctx.fillStyle = options.colorTheme === "dark" ? "#101820" : "#ffffff";
    ctx.fillRect(0, 0, width, height);
    _roundRect(ctx, 32 * scale, 32 * scale, width - 64 * scale, height - 64 * scale, 38 * scale, "#f4f9ff");
    _drawLogo(ctx, 78 * scale, 72 * scale, scale);

    ctx.fillStyle = "#17202a";
    ctx.font = "800 " + Math.round(70 * scale) + "px system-ui, sans-serif";
    ctx.fillText("Aceptamos Bizum Pay", 78 * scale, 220 * scale);
    ctx.font = "500 " + Math.round(34 * scale) + "px system-ui, sans-serif";
    ctx.fillStyle = "#4f6071";
    ctx.fillText("Paga con tu móvil, sin tarjeta", 82 * scale, 280 * scale);
    ctx.font = "700 " + Math.round(42 * scale) + "px system-ui, sans-serif";
    ctx.fillStyle = "#0072ce";
    ctx.fillText(options.businessName, 82 * scale, height - 128 * scale);

    if (ns.qrcode && ns.qrcode.draw) ns.qrcode.draw(qrCanvas, options.url, { size: qrSize });
    ctx.drawImage(qrCanvas, qrX, qrY);
    ctx.font = "600 " + Math.round(20 * scale) + "px system-ui, sans-serif";
    ctx.fillStyle = "rgba(23,32,42,0.62)";
    ctx.fillText("Escanea para pagar", qrX + Math.round(26 * scale), qrY - Math.round(18 * scale));

    if (options.freeMode !== false) {
      ctx.font = "500 " + Math.round(18 * scale) + "px system-ui, sans-serif";
      ctx.fillStyle = "rgba(23,32,42,0.35)";
      ctx.fillText("Generado con bizumpayready.es", width - Math.round(365 * scale), height - Math.round(32 * scale));
    }
  }

  function _drawLogo(ctx, x, y, s) {
    _roundRect(ctx, x, y, 260 * s, 68 * s, 18 * s, "#0072ce");
    ctx.fillStyle = "#fff";
    ctx.font = "800 " + Math.round(38 * s) + "px system-ui, sans-serif";
    ctx.fillText("bizum", x + 28 * s, y + 46 * s);
    ctx.fillStyle = "#e6007e";
    ctx.fillRect(x + 168 * s, y + 18 * s, 8 * s, 32 * s);
    ctx.fillStyle = "#fff";
    ctx.font = "800 " + Math.round(26 * s) + "px system-ui, sans-serif";
    ctx.fillText("Pay", x + 188 * s, y + 44 * s);
  }

  function _roundRect(ctx, x, y, w, h, r, fill) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
    ctx.fillStyle = fill;
    ctx.fill();
  }

  function _normaliseOptions(options) {
    options = options || {};
    if (!options.businessName) throw new Error("badge.render requiere options.businessName");
    return {
      businessName: String(options.businessName).slice(0, 42),
      colorTheme: options.colorTheme || "light",
      customLogo: options.customLogo || null,
      url: options.url || window.location.origin || window.location.href,
      freeMode: options.freeMode !== false
    };
  }

  function _supportsCanvas() {
    var c = document.createElement("canvas");
    return !!(c.getContext && c.getContext("2d"));
  }

  function _esc(value) {
    return String(value || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }

  function _slug(value) {
    return String(value || "comercio").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "comercio";
  }
})();
