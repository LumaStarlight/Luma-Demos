(function (root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
  } else {
    root.ExtVetParser = factory();
  }
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const EXTENSION_ID_PATTERN = /^[a-z0-9][a-z0-9-]*\.[a-z0-9][a-z0-9-]*$/;

  function stripVersion(rawId) {
    return rawId
      .replace(/@\d+(?:\.\d+)*(?:[-+][a-z0-9.-]+)?$/i, "")
      .replace(/\s+\d+(?:\.\d+)*(?:[-+][a-z0-9.-]+)?$/i, "");
  }

  function normalizeLine(line) {
    return stripVersion(String(line || "").trim().toLowerCase());
  }

  function validateSingle(id) {
    return EXTENSION_ID_PATTERN.test(normalizeLine(id));
  }

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function parseExtensions(inputText) {
    const valid = [];
    const duplicates = [];
    const invalid = [];
    const seen = new Set();
    const duplicateSeen = new Set();
    let total = 0;

    String(inputText || "")
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line.length > 0 && !line.startsWith("#"))
      .forEach((line) => {
        total += 1;
        const normalized = normalizeLine(line);

        if (!validateSingle(normalized)) {
          invalid.push(line);
          return;
        }

        if (seen.has(normalized)) {
          if (!duplicateSeen.has(normalized)) {
            duplicates.push(normalized);
            duplicateSeen.add(normalized);
          }
          return;
        }

        seen.add(normalized);
        valid.push(normalized);
      });

    return {
      valid,
      duplicates,
      invalid,
      total,
      unique: valid.length,
    };
  }

  function renderPreview(result) {
    const parsed = result || parseExtensions("");
    const validItems = parsed.valid
      .map((id) => `<li><code>${escapeHtml(id)}</code></li>`)
      .join("");
    const duplicateItems = parsed.duplicates
      .map((id) => `<li><code>${escapeHtml(id)}</code></li>`)
      .join("");
    const invalidItems = parsed.invalid
      .map((line) => `<li><code>${escapeHtml(line)}</code></li>`)
      .join("");

    return `
      <section class="card parser-preview" aria-live="polite">
        <h3>Preview de extensiones</h3>
        <p>${parsed.unique} extensiones únicas detectadas de ${parsed.total} líneas procesadas.</p>
        ${validItems ? `<ul class="preview-list">${validItems}</ul>` : "<p>No hay extensiones válidas todavía.</p>"}
        ${duplicateItems ? `<h4>Duplicadas</h4><ul class="preview-list preview-warning">${duplicateItems}</ul>` : ""}
        ${invalidItems ? `<h4>Formato inválido</h4><ul class="preview-list preview-danger">${invalidItems}</ul>` : ""}
      </section>
    `.trim();
  }

  return {
    parseExtensions,
    renderPreview,
    validateSingle,
  };
});
