// analyze.js
// The full pipeline:  raw email -> parseEmail -> all checks -> score -> result
// Both demo.js and server.js use this file.

const { parseEmail } = require("./parseEmail");
const { ALL_CHECKS } = require("./analyzers");
const { scoreFindings } = require("./score");

// Runs every check on an already parsed email. No network, easy to test.
function analyzeParsed(email) {
  const findings = [];
  for (const check of ALL_CHECKS) {
    for (const f of check(email)) {
      findings.push(f);
    }
  }

  // Strongest signals first (largest points, good or bad).
  findings.sort((a, b) => Math.abs(b.points) - Math.abs(a.points));

  const { score, verdict } = scoreFindings(findings);
  return { score, verdict, findings, subject: email.subject };
}

// Raw .eml text in, result out.
async function analyzeRaw(raw) {
  const email = await parseEmail(raw);
  return analyzeParsed(email);
}

module.exports = { analyzeRaw, analyzeParsed };
