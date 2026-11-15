// campaign.test.js: linking domains by shared RARE infrastructure.

const test = require("node:test");
const assert = require("node:assert");
const { pivotWeight } = require("../campaign/pivots");
const { buildCampaigns } = require("../campaign/buildCampaigns");
const { buildImpersonationMap } = require("../campaign/impersonation");
const { findSenderDrift } = require("../campaign/senderDrift");

function record(id, fromName, domain, intel) {
  return { id, subject: id, date: "2026-11-1" + id.length, from: { name: fromName, domain }, intel: [{ domain, ...intel }] };
}

test("a rare shared name server counts a lot, a huge shared one almost nothing", () => {
  assert.strictEqual(pivotWeight({ type: "nameServer", value: "ns1.quiet-dns.example" }), 3);
  assert.ok(pivotWeight({ type: "nameServer", value: "ada.ns.cloudflare.com" }) < 1);
});

test("two different-looking emails on the same rare infrastructure are one campaign", () => {
  const shared = { nameServers: ["ns1.rare.example"], registeredOn: "2026-11-03" };
  const records = [record("bank", "Bank", "bank-login.example", shared), record("pay", "PayPal", "pay-review.example", shared)];
  const { campaigns } = buildCampaigns(records);
  assert.strictEqual(campaigns.length, 1);
  assert.deepStrictEqual(campaigns[0].domains, ["bank-login.example", "pay-review.example"]);
});

test("sharing only Cloudflare does NOT make a campaign", () => {
  const cloud = { asn: "AS13335", nameServers: ["ada.ns.cloudflare.com"] };
  const records = [record("a", "A", "a.example", cloud), record("b", "B", "b.example", cloud)];
  assert.strictEqual(buildCampaigns(records).campaigns.length, 0);
});

test("impersonation map lists the fake domains per brand", () => {
  const map = buildImpersonationMap([record("x", "PayPal Service", "paypal-review.example", {})]);
  assert.deepStrictEqual(map, [{ brand: "paypal", domains: ["paypal-review.example"], emails: 1 }]);
});

test("sender drift: same name, new infrastructure", () => {
  const records = [
    record("old", "GitHub", "github.com", { asn: "AS8075" }),
    record("newer", "GitHub", "github-notice.example", { asn: "AS64502" }),
  ];
  const drift = findSenderDrift(records);
  assert.strictEqual(drift.length, 1);
  assert.strictEqual(drift[0].history[1].domain, "github-notice.example");
});
