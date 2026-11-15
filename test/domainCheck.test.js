// domainCheck.test.js: the safety checks before any lookup.

const test = require("node:test");
const assert = require("node:assert");
const { isValidDomain, isPrivateIp } = require("../intel/domainCheck");

test("accepts normal domains", () => {
  assert.ok(isValidDomain("github.com"));
  assert.ok(isValidDomain("paypal-account-review.example"));
  assert.ok(isValidDomain("xn--gogle-docs-4ib.example"));
});

test("rejects tricks that could reach other places", () => {
  for (const bad of ["evil.com/../x", "evil.com:8080", "192.0.2.1", "localhost", "a@b.com", "-bad.com", "x..com"]) {
    assert.strictEqual(isValidDomain(bad), false, bad);
  }
});

test("knows private, loopback and link-local addresses", () => {
  for (const ip of ["10.0.0.1", "127.0.0.1", "169.254.169.254", "172.16.0.1", "192.168.1.1", "::1", "fd00::1", "fe80::1"]) {
    assert.strictEqual(isPrivateIp(ip), true, ip);
  }
  for (const ip of ["8.8.8.8", "203.0.113.5", "2606:4700::1111"]) {
    assert.strictEqual(isPrivateIp(ip), false, ip);
  }
});
