// analyze.js
// The full pipeline:
//   raw email -> parseEmail -> intel lookups -> all checks -> score -> result
// Both demo.js and server.js use this file.

const { parseEmail } = require("./parseEmail");
const { ALL_CHECKS } = require("./analyzers");
const { checkNewDomains, checkPrivateIps } = require("./analyzers/intelChecks");
const { enrichEmail } = require("./intel/enrichEmail");
const { scoreFindings } = require("./score");

// Runs every check on an already parsed email and its intel. No network, easy to test.
function analyzeParsed(email, intel = []) {
  const findings = [];
  for (const check of ALL_CHECKS) {
    for (const f of check(email)) {
      findings.push(f);
    }
  }
  findings.push(...checkNewDomains(intel), ...checkPrivateIps(intel));

  // Strongest signals first (largest points, good or bad).
  findings.sort((a, b) => Math.abs(b.points) - Math.abs(a.points));

  const { score, verdict } = scoreFindings(findings);
  return { score, verdict, findings, subject: email.subject, from: email.from, date: email.date, intel };
}

// Raw .eml text in, result out.
async function analyzeRaw(raw) {
  const email = await parseEmail(raw);
  const intel = await enrichEmail(email);
  return analyzeParsed(email, intel);
}

module.exports = { analyzeRaw, analyzeParsed };
