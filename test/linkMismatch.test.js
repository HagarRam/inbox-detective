// linkMismatch.test.js
// Run all tests with:  node --test

const test = require("node:test");
const assert = require("node:assert");
const { checkLinkMismatch } = require("../analyzers/linkMismatch");

test("flags a link that shows one site but goes to another", () => {
  const email = { links: [{ text: "mybank.com", href: "http://evil.example/login" }] };
  const findings = checkLinkMismatch(email);
  assert.strictEqual(findings.length, 1);
  assert.strictEqual(findings[0].detail, "shows mybank.com but goes to evil.example");
});

test("does not flag an email address link (mailto:)", () => {
  // Real case from Google's welcome email: it showed "goes to " with nothing after it.
  const email = { links: [{ text: "someone@gmail.com", href: "mailto:someone@gmail.com" }] };
  assert.deepStrictEqual(checkLinkMismatch(email), []);
});

test("does not flag a mailto: link even when its text looks like a site", () => {
  const email = { links: [{ text: "gmail.com", href: "mailto:someone@gmail.com" }] };
  assert.deepStrictEqual(checkLinkMismatch(email), []);
});

test("does not flag a link whose text matches its destination", () => {
  const email = { links: [{ text: "www.github.com", href: "https://github.com/settings" }] };
  assert.deepStrictEqual(checkLinkMismatch(email), []);
});
