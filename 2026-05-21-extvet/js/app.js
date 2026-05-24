(function (root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
  } else {
    root.ExtVetApp = factory(root);
  }
})(typeof globalThis !== "undefined" ? globalThis : this, function (root) {
  "use strict";

  const SAMPLE_INPUT = [
    "ms-python.python",
    "github.copilot",
    "ms-vscode.cpptools",
    "fakepublisher.theme-pro",
    "acme-ai.autopilot-helper",
  ].join("\n");

  function getModules(scope) {
    const target = scope || root || {};
    return {
      parser: target.ExtVetParser,
      analyzer: target.ExtVetAnalyzer,
      scorer: target.ExtVetScorer,
      renderer: target.ExtVetRenderer,
    };
  }

  function setStatus(element, message, tone) {
    if (!element) return;
    element.textContent = message || "";
    element.dataset.tone = tone || "";
  }

  function initDarkMode(doc) {
    const button = doc.querySelector("#dark-mode-toggle");
    const storageKey = "extvet_darkmode";
    const rootEl = (doc.documentElement || doc.body);

    function preferredDark() {
      return root && root.matchMedia && root.matchMedia("(prefers-color-scheme: dark)").matches;
    }

    function readPreference() {
      try {
        return root.localStorage && root.localStorage.getItem(storageKey);
      } catch (error) {
        return null;
      }
    }

    function writePreference(enabled) {
      try {
        if (root.localStorage) root.localStorage.setItem(storageKey, enabled ? "dark" : "light");
      } catch (error) {
        // Storage can be unavailable in private or embedded contexts.
      }
    }

    function apply(enabled) {
      doc.body.classList.toggle("dark", enabled);
      // Override prefers-color-scheme media query by setting a data-attribute
      // on <html>. The CSS uses body.dark + this attribute to win over the
      // media query via specificity.
      rootEl.dataset.extvetDarkmode = enabled ? "forced" : "forced";
      if (!button) return;
      button.textContent = enabled ? "☀️" : "🌙";
      button.setAttribute("aria-pressed", enabled ? "true" : "false");
      button.setAttribute("aria-label", enabled ? "Cambiar a modo claro" : "Cambiar a modo oscuro");
    }

    const stored = readPreference();
    apply(stored ? stored === "dark" : preferredDark());

    if (button) {
      button.addEventListener("click", () => {
        const enabled = !doc.body.classList.contains("dark");
        apply(enabled);
        writePreference(enabled);
      });
    }

    // Also listen for OS-level changes when no user preference is stored
    if (root && root.matchMedia) {
      const mq = root.matchMedia("(prefers-color-scheme: dark)");
      if (mq.addEventListener) {
        mq.addEventListener("change", function () {
          // Only auto-apply if user hasn't manually set a preference
          if (!readPreference()) {
            apply(mq.matches);
          }
        });
      }
    }
  }

  function createApp(options) {
    const doc = (options && options.document) || (root && root.document);
    const modules = Object.assign(getModules(root), (options && options.modules) || {});

    if (!doc) {
      throw new Error("ExtVet necesita un documento HTML para inicializarse.");
    }

    const input = doc.querySelector("#extension-input");
    const analyzeButton = doc.querySelector("#analyze-button");
    const clearButton = doc.querySelector("#clear-button");
    const sampleButton = doc.querySelector("#sample-input");
    const preview = doc.querySelector("#parser-preview");
    const status = doc.querySelector("#app-status");
    const renderer = new modules.renderer.Renderer({ root: doc });
    const analyzer = new modules.analyzer.Analyzer();

    function renderPreview() {
      if (!preview || !modules.parser) return null;
      const parsed = modules.parser.parseExtensions(input ? input.value : "");
      preview.innerHTML = modules.parser.renderPreview(parsed);
      return parsed;
    }

    async function analyze() {
      const parsed = renderPreview();

      if (!parsed || parsed.valid.length === 0) {
        renderer.renderEmpty();
        setStatus(status, "Añade al menos una extensión válida.", "error");
        if (input) input.focus();
        return null;
      }

      setStatus(status, "Analizando...", "loading");
      if (analyzeButton) analyzeButton.disabled = true;

      try {
        const rawResult = await analyzer.analyze(parsed.valid);
        const scoredResult = modules.scorer.scoreExtensions(rawResult);
        renderer.renderResults(scoredResult);
        setStatus(status, parsed.invalid.length ? "Análisis completado con líneas ignoradas." : "Análisis completado.", "success");
        return scoredResult;
      } catch (error) {
        renderer.renderEmpty();
        setStatus(status, error && error.message ? error.message : "No se pudo completar el análisis.", "error");
        return null;
      } finally {
        if (analyzeButton) analyzeButton.disabled = false;
      }
    }

    function clear() {
      if (input) input.value = "";
      if (preview) preview.innerHTML = "";
      renderer.renderEmpty();
      setStatus(status, "", "");
      if (input) input.focus();
    }

    function useSample() {
      if (input) input.value = SAMPLE_INPUT;
      renderPreview();
      setStatus(status, "Ejemplo cargado.", "success");
      if (input) input.focus();
    }

    function init() {
      if (!input || !analyzeButton) return;
      initDarkMode(doc);
      input.addEventListener("input", renderPreview);
      input.addEventListener("keydown", (event) => {
        if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
          event.preventDefault();
          analyze();
        }
      });
      analyzeButton.addEventListener("click", analyze);
      if (clearButton) clearButton.addEventListener("click", clear);
      if (sampleButton) sampleButton.addEventListener("click", useSample);
      renderer.renderEmpty();
      renderPreview();
    }

    return {
      analyze,
      clear,
      init,
      renderPreview,
      useSample,
    };
  }

  function init(options) {
    const app = createApp(options);
    app.init();
    return app;
  }

  return {
    SAMPLE_INPUT,
    createApp,
    init,
  };
});

if (typeof window !== "undefined") {
  window.addEventListener("DOMContentLoaded", function () {
    window.ExtVetApp.init();
  });
}
