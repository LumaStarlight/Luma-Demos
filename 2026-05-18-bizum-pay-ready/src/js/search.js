/**
 * search.js — Búsqueda con autocompletado para Bizum Pay Ready
 * Fase: DEVELOP — T-03
 *
 * Expone:
 *   BizumPayReady.search.autocomplete(query) → Array≤8
 *   BizumPayReady.search.lookup(terminalId)    → Object|null
 *   BizumPayReady.search.getBrands()           → string[]
 *   BizumPayReady.search.init(inputEl, formEl, dropdownEl)
 */
(function () {
  var ns = window.BizumPayReady || {};
  window.BizumPayReady = ns;

  var _terminals = [];
  var _ready = false;
  var _debounceTimer = null;
  var _selectedIndex = -1;
  var _currentResults = [];
  var _inputEl = null;
  var _dropdownEl = null;
  var _formEl = null;
  var _submitBtn = null;

  /* ── API pública ─────────────────────────────────────────────── */

  /**
   * Autocompletado: filtra case-insensitive en brand, model, bank.
   * @param {string} query — mínimo 2 caracteres
   * @returns {Array} ≤8 coincidencias
   */
  ns.search = ns.search || {};
  ns.search.autocomplete = function (query) {
    if (!query || query.length < 2) return [];
    var q = query.toLowerCase();
    var seen = {};
    var results = [];
    for (var i = 0; i < _terminals.length && results.length < 8; i++) {
      var t = _terminals[i];
      var key = t.brand + " " + t.model + " " + (t.bank || "");
      if (key.toLowerCase().indexOf(q) === -1) continue;
      var display = t.brand + " " + t.model + (t.bank ? " — " + t.bank : "");
      if (seen[display]) continue;
      seen[display] = true;
      results.push({ id: t.id, display: display, terminal: t });
    }
    return results;
  };

  /**
   * Busca un terminal por su id exacto.
   * @param {string} terminalId
   * @returns {Object|null}
   */
  ns.search.lookup = function (terminalId) {
    for (var i = 0; i < _terminals.length; i++) {
      if (_terminals[i].id === terminalId) return _terminals[i];
    }
    return null;
  };

  /**
   * Devuelve lista de marcas únicas, ordenadas alfabéticamente.
   * @returns {string[]}
   */
  ns.search.getBrands = function () {
    var brands = [];
    var seen = {};
    for (var i = 0; i < _terminals.length; i++) {
      var b = _terminals[i].brand;
      if (!seen[b]) { seen[b] = true; brands.push(b); }
    }
    brands.sort();
    return brands;
  };

  /* ── Inicialización ──────────────────────────────────────────── */

  ns.search.init = function (inputEl, formEl, dropdownEl) {
    _inputEl = inputEl;
    _formEl = formEl;
    _dropdownEl = dropdownEl;
    _submitBtn = formEl.querySelector('button[type="submit"]');

    // Cargar datos y luego enlazar eventos
    ns.loadTerminals().then(function (data) {
      _terminals = data;
      _ready = true;
    });

    _inputEl.addEventListener("input", function () { _onInput(); });
    _inputEl.addEventListener("keydown", function (e) { _onKeydown(e); });
    _inputEl.addEventListener("focus", function () {
      if (_inputEl.value.length >= 2) _onInput();
    });
    document.addEventListener("click", function (e) {
      if (_dropdownEl && !_dropdownEl.contains(e.target) && e.target !== _inputEl) {
        _hideDropdown();
      }
    });

    if (_formEl) {
      _formEl.addEventListener("submit", function (e) {
        e.preventDefault();
        if (_selectedIndex >= 0 && _currentResults[_selectedIndex]) {
          var sel = _currentResults[_selectedIndex];
          _inputEl.value = sel.display;
          _hideDropdown();
          ns.search._onSelect && ns.search._onSelect(sel);
        }
      });
    }
  };

  /* ── UI del dropdown ─────────────────────────────────────────── */

  function _onInput() {
    clearTimeout(_debounceTimer);
    _debounceTimer = setTimeout(function () {
      var q = _inputEl.value.trim();
      if (q.length < 2) { _hideDropdown(); _submitBtn && (_submitBtn.disabled = true); return; }
      _currentResults = ns.search.autocomplete(q);
      _selectedIndex = -1;
      _renderDropdown(_currentResults);
      _submitBtn && (_submitBtn.disabled = false);
    }, 150);
  }

  function _renderDropdown(results) {
    if (!_dropdownEl) return;
    _dropdownEl.innerHTML = "";
    if (results.length === 0) {
      _dropdownEl.innerHTML = '<div class="autocomplete-item no-results">No encontramos coincidencias</div>';
      _dropdownEl.style.display = "block";
      _submitBtn && (_submitBtn.disabled = true);
      return;
    }
    for (var i = 0; i < results.length; i++) {
      var item = document.createElement("div");
      item.className = "autocomplete-item";
      if (i === _selectedIndex) item.classList.add("highlighted");
      item.textContent = results[i].display;
      item.setAttribute("data-index", i);
      item.addEventListener("mousedown", function (idx) {
        return function (e) {
          e.preventDefault();
          _selectResult(idx);
        };
      }(i));
      _dropdownEl.appendChild(item);
    }
    _dropdownEl.style.display = "block";
    _submitBtn && (_submitBtn.disabled = false);
  }

  function _selectResult(idx) {
    if (idx < 0 || idx >= _currentResults.length) return;
    var sel = _currentResults[idx];
    _inputEl.value = sel.display;
    _hideDropdown();
    if (ns.search._onSelect) ns.search._onSelect(sel);
  }

  function _hideDropdown() {
    if (_dropdownEl) _dropdownEl.style.display = "none";
    _selectedIndex = -1;
  }

  function _onKeydown(e) {
    if (!_dropdownEl || _dropdownEl.style.display === "none") return;
    var items = _dropdownEl.querySelectorAll(".autocomplete-item:not(.no-results)");
    if (e.key === "ArrowDown") {
      e.preventDefault();
      _selectedIndex = Math.min(_selectedIndex + 1, items.length - 1);
      _highlightItem(items);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      _selectedIndex = Math.max(_selectedIndex - 1, 0);
      _highlightItem(items);
    } else if (e.key === "Enter") {
      e.preventDefault();
      _selectResult(_selectedIndex >= 0 ? _selectedIndex : 0);
    } else if (e.key === "Escape") {
      e.preventDefault();
      _hideDropdown();
    }
  }

  function _highlightItem(items) {
    for (var i = 0; i < items.length; i++) {
      items[i].classList.toggle("highlighted", i === _selectedIndex);
    }
  }
})();
