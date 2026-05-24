(function (root) {
  "use strict";

  var STORAGE_KEY = "last_reported";
  var form;
  var submitButton;
  var statusNode;
  var modal;
  var fallbackTextarea;

  function field(name) {
    return form ? form.elements[name] : null;
  }

  function setError(input, message) {
    if (!input) return;
    var id = input.id + "-error";
    var error = document.getElementById(id);
    input.classList.toggle("input-error", Boolean(message));
    input.setAttribute("aria-invalid", String(Boolean(message)));

    if (!error) {
      error = document.createElement("p");
      error.id = id;
      error.className = "field-error";
      input.insertAdjacentElement("afterend", error);
    }

    error.textContent = message || "";
    error.hidden = !message;
  }

  function isValidEmail(value) {
    return !value || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
  }

  function isValidPhone(value) {
    return !value || /^\+?[0-9\s().-]{7,20}$/.test(value);
  }

  function validate() {
    var valid = true;
    var type = field("type");
    var content = field("content");
    var phone = field("sender_phone");
    var senderEmail = field("sender_email");
    var contact = field("contact");

    if (!type.value) {
      setError(type, "Selecciona el tipo de estafa.");
      valid = false;
    } else {
      setError(type, "");
    }

    if (content.value.trim().length < 20) {
      setError(content, "El contenido debe tener al menos 20 caracteres.");
      valid = false;
    } else {
      setError(content, "");
    }

    if (!isValidPhone(phone.value.trim())) {
      setError(phone, "Introduce un teléfono válido o deja el campo vacío.");
      valid = false;
    } else {
      setError(phone, "");
    }

    if (!isValidEmail(senderEmail.value.trim())) {
      setError(senderEmail, "Introduce un email válido o deja el campo vacío.");
      valid = false;
    } else {
      setError(senderEmail, "");
    }

    if (!isValidEmail(contact.value.trim())) {
      setError(contact, "Introduce un email válido o deja el campo vacío.");
      valid = false;
    } else {
      setError(contact, "");
    }

    return valid;
  }

  function buildSubmission() {
    return {
      type: field("type").value,
      content: field("content").value.trim(),
      source_url: "",
      sender_phone: field("sender_phone").value.trim(),
      sender_email: field("sender_email").value.trim(),
      contact: field("contact").value.trim(),
      submitted_at: new Date().toISOString(),
      user_agent: root.navigator ? root.navigator.userAgent : ""
    };
  }

  function saveRecentReport(payload) {
    try {
      root.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    } catch (error) {
      // Ignore storage failures; the submitted JSON is still shown/copied.
    }
  }

  function postToFormspree(payload) {
    var formspreeId = form.getAttribute("data-formspree-id");
    if (!formspreeId || !root.fetch) return;

    root.fetch("https://formspree.io/f/" + encodeURIComponent(formspreeId), {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(payload)
    }).catch(function () {
      // Formspree is optional; reporting still succeeds locally.
    });
  }

  function openModal(jsonText, copied) {
    if (!modal) return;
    if (fallbackTextarea) {
      fallbackTextarea.value = jsonText;
      fallbackTextarea.hidden = copied;
    }
    modal.classList.add("is-open");
    modal.setAttribute("aria-hidden", "false");
    var first = modal.querySelector("button, a, textarea");
    if (first) first.focus();
  }

  function closeModal() {
    if (!modal) return;
    modal.classList.remove("is-open");
    modal.setAttribute("aria-hidden", "true");
    if (submitButton) submitButton.focus();
  }

  function copyJson(jsonText) {
    if (root.navigator && root.navigator.clipboard && root.navigator.clipboard.writeText) {
      return root.navigator.clipboard.writeText(jsonText).then(function () { return true; }).catch(function () { return false; });
    }
    return Promise.resolve(false);
  }

  function setSubmitting(isSubmitting) {
    submitButton.disabled = isSubmitting;
    submitButton.textContent = isSubmitting ? "Enviando..." : "Reportar";
    if (statusNode) statusNode.textContent = isSubmitting ? "Preparando reporte..." : "";
  }

  function handleSubmit(event) {
    event.preventDefault();
    if (!validate()) {
      if (statusNode) statusNode.textContent = "Revisa los campos marcados antes de enviar.";
      return;
    }

    setSubmitting(true);
    root.setTimeout(function () {
      var payload = buildSubmission();
      var jsonText = JSON.stringify(payload, null, 2);
      saveRecentReport(payload);
      postToFormspree(payload);

      copyJson(jsonText).then(function (copied) {
        form.reset();
        setSubmitting(false);
        if (statusNode) statusNode.textContent = "Estafa reportada correctamente.";
        openModal(jsonText, copied);
      });
    }, 500);
  }

  function bindModal() {
    if (!modal) return;
    modal.addEventListener("click", function (event) {
      if (event.target === modal || event.target.closest("[data-modal-close]")) closeModal();
    });
    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape" && modal.classList.contains("is-open")) closeModal();
    });
  }

  function init() {
    form = document.querySelector("#report-form");
    submitButton = document.querySelector("#report-submit");
    statusNode = document.querySelector("#report-status");
    modal = document.querySelector("#report-success-modal");
    fallbackTextarea = document.querySelector("#report-json-fallback");

    if (!form || !submitButton) return;
    form.addEventListener("submit", handleSubmit);
    form.addEventListener("input", function (event) {
      if (event.target.classList.contains("input-error")) validate();
    });
    bindModal();
  }

  root.EstafaGuard = Object.assign(root.EstafaGuard || {}, {
    report: {
      init: init,
      validate: validate,
      buildSubmission: buildSubmission
    }
  });
})(typeof window !== "undefined" ? window : globalThis);
