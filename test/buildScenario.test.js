// buildScenario.test.js: the "If you had clicked" scenarios.

const test = require("node:test");
const assert = require("node:assert");
const { buildScenario, ESTIMATE_NOTE } = require("../scenarios/buildScenario");
const { MITRE } = require("../scenarios/stories");

const finding = (id, points, title) => ({ id, points, title, detail: "detail of " + id });

test("a hidden link in a full check -> the fake login page story", () => {
  const s = buildScenario([finding("link_mismatch", 30, "Link goes elsewhere")], "full");
  assert.strictEqual(s.estimateNote, "Estimate based on common patterns, not a fact.");
  assert.ok(s.steps[1].text.includes("fake login page"));
  assert.ok(s.steps.length >= 3 && s.steps.length <= 4);
});

test("a risky attachment wins over a link (the stronger danger first)", () => {
  const s = buildScenario([finding("link_mismatch", 30, "Link"), finding("attachment_double_ext", 35, "File")], "full");
  assert.strictEqual(s.steps[1].mitre, "T1204.002 User Execution: Malicious File");
});

test("replies to another domain, no link -> the money story", () => {
  const s = buildScenario([finding("reply_to_mismatch", 20, "Replies go elsewhere")], "full");
  assert.strictEqual(s.steps[3].mitre, "T1657 Financial Theft");
  assert.ok(s.protections.organization.length > 0);
});

test("before opening (headers only) the steps say links were not checked", () => {
  const s = buildScenario([finding("dmarc_fail", 25, "DMARC failed")], "headers-only");
  assert.ok(s.steps.some((step) => step.text.includes("not checked")));
});

test("facts come ONLY from the findings (bad signs only, at most 5)", () => {
  const findings = [finding("auth_pass", -20, "Authenticated"), finding("dmarc_fail", 25, "DMARC failed")];
  for (let i = 0; i < 6; i++) findings.push(finding("x" + i, 5, "Sign " + i));
  const s = buildScenario(findings, "full");
  assert.strictEqual(s.facts[0], "DMARC failed: detail of dmarc_fail");
  assert.strictEqual(s.facts.length, 5);
  assert.ok(!s.facts.some((f) => f.startsWith("Authenticated")));
});

test("every MITRE technique used is one of the checked ones; no numbers or statistics", () => {
  const checked = Object.values(MITRE);
  for (const mode of ["full", "headers-only"]) {
    for (const ids of [["attachment_risky"], ["url_lookalike"], ["sensitive_request"], ["dmarc_fail"]]) {
      const s = buildScenario(ids.map((id) => finding(id, 20, id)), mode);
      for (const step of s.steps) {
        assert.ok(step.mitre === "" || checked.includes(step.mitre), step.mitre);
        assert.ok(!/%|\d+ (out of|in) \d+/.test(step.text), "statistic in: " + step.text);
      }
    }
  }
  assert.strictEqual(ESTIMATE_NOTE, "Estimate based on common patterns, not a fact.");
});
