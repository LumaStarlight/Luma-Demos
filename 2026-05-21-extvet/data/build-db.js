"use strict";

const fs = require("fs");
const path = require("path");

const DB_PATH = path.join(__dirname, "extensions-db.json");
const REQUIRED_FACTORS = new Set([
  "excessive-permissions",
  "recent-publisher-change",
  "unknown-publisher",
  "flagged-execute",
  "publisher-history",
  "low-downloads",
  "no-updates",
]);

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function readDatabase() {
  return JSON.parse(fs.readFileSync(DB_PATH, "utf8"));
}

function validateExtension(extension, index) {
  const prefix = `extensions[${index}]`;

  assert(typeof extension.id === "string" && /^[a-z0-9][a-z0-9-]*\.[a-z0-9][a-z0-9-]*$/.test(extension.id), `${prefix}.id must be publisher.extension`);
  assert(typeof extension.displayName === "string" && extension.displayName.length > 0, `${prefix}.displayName is required`);
  assert(typeof extension.knownMalicious === "boolean", `${prefix}.knownMalicious must be boolean`);
  assert(Array.isArray(extension.riskFactors) && extension.riskFactors.length > 0, `${prefix}.riskFactors must be a non-empty array`);
  assert(extension.riskFactors.every((factor) => REQUIRED_FACTORS.has(factor)), `${prefix}.riskFactors contains an unsupported value`);
  assert(Array.isArray(extension.permissions), `${prefix}.permissions must be an array`);
  assert(typeof extension.scoreImpact === "number" && extension.scoreImpact <= 0, `${prefix}.scoreImpact must be a negative number or zero`);
  assert(typeof extension.mitigation === "string" && extension.mitigation.length > 0, `${prefix}.mitigation is required`);

  if (extension.incident !== undefined) {
    assert(typeof extension.incident === "string" && extension.incident.length > 0, `${prefix}.incident must be a non-empty string when present`);
  }

  if (extension.incidentUrl !== undefined) {
    assert(typeof extension.incidentUrl === "string" && /^https?:\/\//.test(extension.incidentUrl), `${prefix}.incidentUrl must be a URL when present`);
  }
}

function validateDatabase(db) {
  assert(db && typeof db === "object", "database must be an object");
  assert(db.version === "1.0.0", "version must be 1.0.0");
  assert(typeof db.updated === "string" && /^\d{4}-\d{2}-\d{2}$/.test(db.updated), "updated must be YYYY-MM-DD");
  assert(Array.isArray(db.sources) && db.sources.length >= 2, "sources must list at least two references");
  assert(Array.isArray(db.extensions), "extensions must be an array");
  assert(db.extensions.length >= 60, "database must contain at least 60 extensions");

  const ids = new Set();
  const factorCounts = {};
  let maliciousCount = 0;
  let excessivePermissionsCount = 0;

  db.extensions.forEach((extension, index) => {
    validateExtension(extension, index);
    assert(!ids.has(extension.id), `duplicate extension id: ${extension.id}`);
    ids.add(extension.id);

    if (extension.knownMalicious) {
      maliciousCount += 1;
    }

    if (extension.riskFactors.includes("excessive-permissions")) {
      excessivePermissionsCount += 1;
    }

    extension.riskFactors.forEach((factor) => {
      factorCounts[factor] = (factorCounts[factor] || 0) + 1;
    });
  });

  assert(maliciousCount >= 10, "database must contain at least 10 confirmed malicious extensions");
  assert(excessivePermissionsCount >= 20, "database must contain at least 20 excessive-permissions entries");

  return {
    total: db.extensions.length,
    malicious: maliciousCount,
    riskFactors: factorCounts,
  };
}

if (require.main === module) {
  const summary = validateDatabase(readDatabase());
  console.log("ExtVet DB valid");
  console.log(JSON.stringify(summary, null, 2));
}

module.exports = {
  readDatabase,
  validateDatabase,
};
