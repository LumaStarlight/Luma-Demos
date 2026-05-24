window.BizumPayReady = window.BizumPayReady || {};

window.BizumPayReady.app = {
  init() {
    var ns = window.BizumPayReady;
    var input = document.getElementById("terminal-search");
    var form = document.querySelector(".search-panel");
    var dropdown = document.getElementById("terminal-autocomplete");
    var faqButtons = document.querySelectorAll(".faq-question");

    if (ns.search && input && form && dropdown) {
      ns.search.init(input, form, dropdown);
      ns.search._onSelect = function (selection) {
        if (ns.results && selection && selection.terminal) {
          ns.results.show(selection.terminal);
        }
      };
    }

    if (ns.calculator && ns.calculator.ensureRates) {
      ns.calculator.ensureRates();
    }

    faqButtons.forEach(function (button) {
      button.addEventListener("click", function () {
        var item = button.closest(".faq-item");
        if (!item) return;
        var expanded = item.classList.toggle("expanded");
        button.setAttribute("aria-expanded", String(expanded));
        var indicator = button.querySelector(".faq-indicator");

        if (indicator) {
          indicator.textContent = expanded ? "−" : "+";
        }
      });
    });

    document.documentElement.dataset.appReady = "true";
  }
};

window.addEventListener("DOMContentLoaded", () => {
  window.BizumPayReady.app.init();
});
