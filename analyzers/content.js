// content.js
// Looks at the words in the subject and body.
// Phishing usually (1) creates pressure and (2) asks for something sensitive.

const { finding } = require("./finding");

const PRESSURE_PHRASES = [
  "urgent", "immediately", "within 24 hours", "within 48 hours", "account will be closed",
  "account has been suspended", "account will be suspended", "final notice", "last warning",
  "act now", "unusual activity", "unauthorized login", "limited time",
];

const SENSITIVE_PHRASES = [
  "verify your account", "confirm your password", "enter your password", "update your payment",
  "confirm your identity", "credit card", "bank details", "wire transfer", "gift card", "login credentials",
];

// Returns the phrases from the list that appear in the text.
function findPhrases(text, phrases) {
  const lower = text.toLowerCase();
  const found = [];
  for (const phrase of phrases) {
    if (lower.includes(phrase)) found.push(phrase);
  }
  return found;
}

function checkContent(email) {
  const text = email.subject + "\n" + email.text;
  const findings = [];

  const pressure = findPhrases(text, PRESSURE_PHRASES);
  if (pressure.length > 0) {
    findings.push(finding("pressure_language", 15, "Uses pressure or urgency", "Phrases found: " + pressure.join(", ")));
  }
  const sensitive = findPhrases(text, SENSITIVE_PHRASES);
  if (sensitive.length > 0) {
    findings.push(finding("sensitive_request", 20, "Asks for passwords, payment or identity", "Phrases found: " + sensitive.join(", ")));
  }
  return findings;
}

module.exports = { checkContent };
