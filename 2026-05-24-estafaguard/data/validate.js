#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

const root = __dirname;
const errors = [];

function readJson(fileName) {
  const filePath = path.join(root, fileName);
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch (error) {
    errors.push(`${fileName}: no se pudo leer o parsear JSON (${error.message})`);
    return null;
  }
}

function isIsoDate(value) {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(value));
}

function hasText(value, minLength = 1) {
  return typeof value === "string" && value.trim().length >= minLength;
}

function hasArray(value, minLength = 1) {
  return Array.isArray(value) && value.length >= minLength;
}

function requireFields(item, fields, label) {
  fields.forEach((field) => {
    if (!(field in item)) {
      errors.push(`${label}: falta campo obligatorio "${field}"`);
    }
  });
}

function validateScams(scams) {
  if (!scams || !Array.isArray(scams.entries)) {
    errors.push("scams.json: entries debe ser un array");
    return;
  }

  const required = [
    "id",
    "category",
    "title",
    "description",
    "severity",
    "patterns",
    "urls",
    "phones",
    "emails",
    "reported_at",
    "active",
    "source_url",
    "source_label",
    "tips"
  ];
  const categories = new Set(["sms", "email", "phone", "web", "whatsapp", "other"]);
  const severities = new Set(["high", "medium", "low"]);
  const seen = new Set();
  const categoryCounts = Object.fromEntries(Array.from(categories).map((category) => [category, 0]));
  let activeCount = 0;
  let highCount = 0;

  if (scams.entries.length < 20) {
    errors.push("scams.json: debe contener al menos 20 entradas");
  }

  scams.entries.forEach((entry, index) => {
    const label = `scams[${index}]`;
    requireFields(entry, required, label);

    if (!/^scam-\d{3}$/.test(entry.id || "")) errors.push(`${label}: id debe usar formato scam-NNN`);
    if (seen.has(entry.id)) errors.push(`${label}: id duplicado ${entry.id}`);
    seen.add(entry.id);

    if (!categories.has(entry.category)) errors.push(`${label}: categoria invalida ${entry.category}`);
    else categoryCounts[entry.category] += 1;

    if (!hasText(entry.title)) errors.push(`${label}: title vacio`);
    if (!hasText(entry.description, 50)) errors.push(`${label}: description debe tener al menos 50 caracteres`);
    if (!severities.has(entry.severity)) errors.push(`${label}: severity invalida ${entry.severity}`);
    if (!hasArray(entry.patterns, 5)) errors.push(`${label}: patterns debe tener al menos 5 elementos`);
    ["urls", "phones", "emails"].forEach((field) => {
      if (!Array.isArray(entry[field])) errors.push(`${label}: ${field} debe ser array`);
    });
    if (!isIsoDate(entry.reported_at)) errors.push(`${label}: reported_at debe ser fecha ISO YYYY-MM-DD`);
    if (typeof entry.active !== "boolean") errors.push(`${label}: active debe ser boolean`);
    if (!hasText(entry.source_url)) errors.push(`${label}: source_url vacio`);
    if (!hasText(entry.source_label)) errors.push(`${label}: source_label vacio`);
    if (!hasArray(entry.tips, 2)) errors.push(`${label}: tips debe tener al menos 2 elementos`);

    if (entry.active) activeCount += 1;
    if (entry.severity === "high") highCount += 1;
  });

  const minimums = { sms: 4, email: 4, phone: 3, web: 3, whatsapp: 3, other: 3 };
  Object.entries(minimums).forEach(([category, minimum]) => {
    if (categoryCounts[category] < minimum) {
      errors.push(`scams.json: categoria ${category} requiere al menos ${minimum} entradas`);
    }
  });
  if (activeCount < 8) errors.push("scams.json: requiere al menos 8 entradas activas");
  if (highCount < 5) errors.push("scams.json: requiere al menos 5 entradas high");
}

function validateAlerts(alerts) {
  if (!alerts || !Array.isArray(alerts.alerts)) {
    errors.push("alerts.json: alerts debe ser un array");
    return;
  }

  const required = ["id", "title", "message", "severity", "active_from", "active_until", "icon", "tags", "cta_url", "cta_label"];
  const severities = new Set(["high", "medium", "low"]);
  const seen = new Set();

  if (alerts.alerts.length < 5) {
    errors.push("alerts.json: debe contener al menos 5 alertas");
  }

  alerts.alerts.forEach((alert, index) => {
    const label = `alerts[${index}]`;
    requireFields(alert, required, label);

    if (!hasText(alert.id)) errors.push(`${label}: id vacio`);
    if (seen.has(alert.id)) errors.push(`${label}: id duplicado ${alert.id}`);
    seen.add(alert.id);
    if (!hasText(alert.title)) errors.push(`${label}: title vacio`);
    if (!hasText(alert.message, 80)) errors.push(`${label}: message debe tener al menos 80 caracteres`);
    if (!severities.has(alert.severity)) errors.push(`${label}: severity invalida ${alert.severity}`);
    if (!isIsoDate(alert.active_from)) errors.push(`${label}: active_from debe ser fecha ISO YYYY-MM-DD`);
    if (!isIsoDate(alert.active_until)) errors.push(`${label}: active_until debe ser fecha ISO YYYY-MM-DD`);
    if (Date.parse(alert.active_from) > Date.parse(alert.active_until)) {
      errors.push(`${label}: active_from no puede ser posterior a active_until`);
    }
    if (!hasText(alert.icon)) errors.push(`${label}: icon vacio`);
    if (!hasArray(alert.tags, 2)) errors.push(`${label}: tags debe tener al menos 2 elementos`);
    if (!hasText(alert.cta_url)) errors.push(`${label}: cta_url vacio`);
    if (!hasText(alert.cta_label)) errors.push(`${label}: cta_label vacio`);
  });
}

validateScams(readJson("scams.json"));
validateAlerts(readJson("alerts.json"));

if (errors.length > 0) {
  console.error("Validacion fallida:");
  errors.forEach((error) => console.error(`- ${error}`));
  process.exit(1);
}

console.log("Datos de EstafaGuard validos: scams.json y alerts.json cumplen el contrato.");
