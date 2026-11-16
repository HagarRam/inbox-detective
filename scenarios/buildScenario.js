// buildScenario.js
// "If you had clicked": a short, likely story for a flagged email.
//
// Rules:
// - Facts come ONLY from the findings (what we really saw in this email).
// - The steps are an ESTIMATE based on common patterns, never a fact. No statistics.
// - Before opening (headers only) the steps say that links were not checked.

const stories = require("./stories");

const ESTIMATE_NOTE = "Estimate based on common patterns, not a fact.";
const MAX_FACTS = 5;

const ATTACHMENT_IDS = ["attachment_double_ext", "attachment_risky"];
const LINK_IDS = ["link_mismatch", "url_lookalike", "url_punycode", "url_userinfo", "url_raw_ip", "url_shortener"];
const MONEY_IDS = ["reply_to_mismatch", "sensitive_request"];

// Does any finding have one of these ids?
function hasAny(findings, ids) {
  return findings.some((f) => ids.includes(f.id));
}

// Pick the story. The strongest kind of danger first: a file, then a link, then money.
function pickStory(findings, mode) {
  if (mode === "headers-only") return stories.HEADERS_ONLY;
  if (hasAny(findings, ATTACHMENT_IDS)) return stories.ATTACHMENT;
  if (hasAny(findings, LINK_IDS)) return stories.CREDENTIALS;
  if (hasAny(findings, MONEY_IDS)) return stories.MONEY;
  return stories.GENERAL;
}

// The warning signs we really found, e.g. "DMARC failed: The sender's domain says ...".
function factsFrom(findings) {
  const facts = [];
  for (const f of findings) {
    if (f.points > 0 && facts.length < MAX_FACTS) facts.push(f.title + ": " + f.detail);
  }
  return facts;
}

// findings + mode ("full" or "headers-only") -> { estimateNote, facts, steps, protections }
function buildScenario(findings, mode) {
  const story = pickStory(findings, mode);
  return {
    estimateNote: ESTIMATE_NOTE,
    facts: factsFrom(findings),
    steps: story.steps,
    protections: story.protections,
  };
}

module.exports = { buildScenario, ESTIMATE_NOTE };
