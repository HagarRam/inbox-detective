// addonWording.test.js: a headers-only result must never sound "safe".
// Loads the add-on files (plain JavaScript) into a sandbox, like addonHeaders.test.js.

const test = require("node:test");
const assert = require("node:assert");
const fs = require("fs");
const vm = require("vm");

const sandbox = {};
vm.createContext(sandbox);
for (const file of ["Cards.gs", "Summary.gs"]) {
  vm.runInContext(fs.readFileSync("addon/" + file, "utf8"), sandbox);
}
const { verdictText, summarySentence, fullCheckText } = sandbox;

const CLEAN_HEADERS = { mode: "headers-only", verdict: "likely safe", score: 0, findings: [{ id: "auth_pass", points: -20 }] };
const CLEAN_FULL = { verdict: "likely safe", score: 0, findings: [{ id: "auth_pass", points: -20 }] };

test("headers only + low score: 'No strong sender red flags', never 'safe'", () => {
  assert.strictEqual(verdictText(CLEAN_HEADERS), "⚪ No strong sender red flags");
  const sentence = summarySentence(CLEAN_HEADERS);
  assert.strictEqual(sentence, "No strong sender red flags (headers only; links and attachments were not checked).");
  assert.ok(!/safe/i.test(verdictText(CLEAN_HEADERS) + sentence));
});

test("a full check of an opened email still says 'Likely safe'", () => {
  assert.strictEqual(verdictText(CLEAN_FULL), "🟢 Likely safe");
});

test("headers only + high score keeps the normal warning", () => {
  const bad = { mode: "headers-only", verdict: "malicious", score: 95, findings: [] };
  assert.strictEqual(verdictText(bad), "🔴 Dangerous");
});

test("malicious from headers alone: tell the user NOT to open it", () => {
  assert.strictEqual(fullCheckText({ mode: "headers-only", verdict: "malicious" }), "Do not open this email.");
  assert.strictEqual(fullCheckText(CLEAN_HEADERS), "Open the email and run the add-on for a full check.");
  assert.strictEqual(fullCheckText({ mode: "headers-only", verdict: "suspicious" }), "Open the email and run the add-on for a full check.");
});
