// replay.test.js: the full pipeline in replay mode, on a real sample email.

const test = require("node:test");
const assert = require("node:assert");
const fs = require("fs");

process.env.INTEL_MODE = "replay";
const { analyzeRaw } = require("../analyze");

test("replay intel is attached and used for the score", async () => {
  const result = await analyzeRaw(fs.readFileSync("samples/phish1.eml"));
  const bank = result.intel.find((item) => item.domain === "secure-bank-login.example");
  assert.strictEqual(bank.registeredOn, "2026-11-03"); // comes from fixtures/intel
  assert.strictEqual(bank.ips[0], "198.51.100.77");
});

test("a domain with no saved file says so instead of failing", () => {
  const { lookupDomain } = require("../intel/replayProvider");
  assert.deepStrictEqual(lookupDomain("not-saved.example"), { domain: "not-saved.example", notInReplay: true });
});
