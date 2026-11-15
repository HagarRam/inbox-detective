// score.js
// Turns a list of findings into a score (0-100) and a verdict.
// The score is an ESTIMATE based on simple rules, not a proof.
// Rules are fixed in code, so nothing inside an email can change them.

const THRESHOLDS = {
  malicious: 60, // 60 and above
  suspicious: 25, // 25 to 59
};

function scoreFindings(findings) {
  // Add up all points (bad signals are positive, good signals negative).
  const total = findings.reduce((sum, f) => sum + f.points, 0);

  // Keep the result inside 0..100.
  const score = Math.max(0, Math.min(100, total));

  let verdict = "likely safe";
  if (score >= THRESHOLDS.malicious) verdict = "malicious";
  else if (score >= THRESHOLDS.suspicious) verdict = "suspicious";

  return { score, verdict };
}

module.exports = { scoreFindings, THRESHOLDS };
