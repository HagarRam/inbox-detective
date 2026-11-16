// dashboard.test.js: one-time tokens, metadata-only records, dashboard data.

const test = require("node:test");
const assert = require("node:assert");
const tokens = require("../dashboard/tokens");
const { toRecord } = require("../dashboard/scanStore");
const { buildDashboard } = require("../dashboard/buildDashboard");

test("a dashboard token works exactly once", () => {
  const token = tokens.createToken();
  assert.strictEqual(tokens.useToken(token), true);
  assert.strictEqual(tokens.useToken(token), false);
  assert.strictEqual(tokens.useToken("made-up-token"), false);
});

test("a session is valid only if the server created it", () => {
  assert.strictEqual(tokens.isValidSession(tokens.createSession()), true);
  assert.strictEqual(tokens.isValidSession("guess"), false);
});

test("a stored record keeps only metadata, never the body or finding details", () => {
  const result = { score: 80, verdict: "malicious", subject: "Hi", date: "2026-11-10", from: { domain: "x.example" }, intel: [],
    findings: [{ id: "pressure_language", points: 15, title: "Uses pressure", detail: "Phrases found: urgent" }], text: "secret body" };
  const record = toRecord("id1", result);
  assert.strictEqual(JSON.stringify(record).includes("secret body"), false);
  assert.deepStrictEqual(record.findings, [{ id: "pressure_language", title: "Uses pressure", points: 15 }]);
});

test("dashboard counts verdicts and days", () => {
  const records = [
    { id: "a", date: "2026-11-10T08:00:00Z", verdict: "malicious", score: 90, from: { name: "PayPal", domain: "pp.example" }, findings: [{ id: "display_name_spoof" }], intel: [] },
    { id: "b", date: "2026-11-10T09:00:00Z", verdict: "likely safe", score: 0, from: { name: "Dana", domain: "ok.example" }, findings: [], intel: [] },
  ];
  const data = buildDashboard(records);
  assert.strictEqual(data.summary.total, 2);
  assert.strictEqual(data.summary.malicious, 1);
  assert.deepStrictEqual(data.timeline, [{ day: "2026-11-10", malicious: 1, suspicious: 0, "likely safe": 1 }]);
  assert.deepStrictEqual(data.scamTypes, { "Brand impersonation": 1 });
});

test("graph nodes and riskiest senders carry the verdict for the page colors", () => {
  const shared = { nameServers: ["ns1.rare.example"], registeredOn: "2026-11-03" };
  const make = (id, domain, verdict, score) => ({ id, date: "2026-11-10", verdict, score, from: { name: id, domain }, findings: [], intel: [{ domain, ...shared }] });
  const data = buildDashboard([make("a", "a.example", "malicious", 90), make("b", "b.example", "suspicious", 40)]);
  const verdicts = data.graph.nodes.map((n) => n.id + ":" + n.verdict).sort();
  assert.deepStrictEqual(verdicts, ["a.example:malicious", "b.example:suspicious"]);
  assert.deepStrictEqual(data.riskiestSenders.map((s) => s.verdict), ["malicious", "suspicious"]);
});
