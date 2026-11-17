// score.js
// Turns the findings into a score (0-100) and a verdict.
// The score is an ESTIMATE from simple fixed rules, not a proof.
// The rules live in code, so nothing written inside an email can change them.

const MALICIOUS_FROM = 60; // 60 and above
const SUSPICIOUS_FROM = 25; // 25 to 59

function scoreFindings(findings) {
  // Add up all points: bad signals are positive, good signals negative.
  let total = 0;
  for (const f of findings) {
    total += f.points;
  }

  // Keep the score between 0 and 100.
  let score = total;
  if (score < 0) score = 0;
  if (score > 100) score = 100;

  let verdict = "likely safe";
  if (score >= MALICIOUS_FROM) verdict = "malicious";
  else if (score >= SUSPICIOUS_FROM) verdict = "suspicious";

  return { score, verdict };
}

module.exports = { scoreFindings };
