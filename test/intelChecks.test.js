// intelChecks.test.js: findings that come from the network intel.

const test = require("node:test");
const assert = require("node:assert");
const { checkNewDomains, checkPrivateIps } = require("../analyzers/intelChecks");

const today = new Date("2026-11-15");

test("flags a domain registered a few days ago", () => {
  const intel = [{ domain: "fresh.example", registeredOn: "2026-11-10" }];
  const findings = checkNewDomains(intel, today);
  assert.strictEqual(findings.length, 1);
  assert.match(findings[0].detail, /fresh.example \(5 days old\)/);
});

test("does not flag an old domain or an unknown date", () => {
  const intel = [{ domain: "github.com", registeredOn: "2007-10-09" }, { domain: "x.example", registeredOn: null }];
  assert.deepStrictEqual(checkNewDomains(intel, today), []);
});

test("flags a domain that points into a private network", () => {
  const findings = checkPrivateIps([{ domain: "odd.example", ips: ["10.0.0.5"] }]);
  assert.strictEqual(findings[0].detail, "odd.example -> 10.0.0.5");
  assert.deepStrictEqual(checkPrivateIps([{ domain: "ok.example", ips: ["203.0.113.1"] }]), []);
});
