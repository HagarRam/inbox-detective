// analyze.js
// The full pipeline in one place:
//   raw email -> parseEmail -> every analyzer -> score -> result
// Both the demo script and the server call this function.

const { parseEmail } = require("./parseEmail");
const { ALL_ANALYZERS } = require("./analyzers");
const { scoreFindings } = require("./score");

// Pure part: takes an already parsed email. Easy to test.
function analyzeParsed(email) {
  const findings = ALL_ANALYZERS.flatMap((check) => check(email));

  // Show the strongest signals first (bad ones, then good ones).
  findings.sort((a, b) => Math.abs(b.points) - Math.abs(a.points));

  const { score, verdict } = scoreFindings(findings);
  return {
    score,
    verdict,
    findings,
    summary: {
      from: email.from ? email.from.address : null,
      subject: email.subject,
      linkCount: email.links.length,
      attachmentCount: email.attachments.length,
    },
  };
}

// Full version: raw .eml text or Buffer in, result out.
async function analyzeRaw(raw) {
  const email = await parseEmail(raw);
  return analyzeParsed(email);
}

module.exports = { analyzeRaw, analyzeParsed };
