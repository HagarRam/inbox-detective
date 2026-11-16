// analyzeHeaders.test.js: layer 1, the headers-only check (before opening).
// Runs in replay mode (saved intel files), so no network is needed.

const test = require("node:test");
const assert = require("node:assert");
const { analyzeHeaders, headersToText } = require("../analyzeHeaders");

// The sender headers of samples/phish1.eml
const PHISH = {
  From: '"Bank Security" <alerts@secure-bank-login.example>',
  "Reply-To": "<collect@other-domain.example>",
  "Return-Path": "<bounce@mailer-xyz.example>",
  Subject: "Urgent: your account will be closed",
  "Authentication-Results": "mx.google.com; spf=fail smtp.mailfrom=mailer-xyz.example; dkim=none; dmarc=fail header.from=secure-bank-login.example",
};

// The sender headers of samples/legit1-newsletter.eml
const LEGIT = {
  From: '"GitHub" <noreply@github.com>',
  "Return-Path": "<bounces+12345@bounces.github.com>",
  Subject: "Your weekly GitHub digest",
  Date: "Wed, 11 Nov 2026 06:00:00 +0000",
  "Authentication-Results": "mx.google.com; dkim=pass header.i=@github.com; spf=pass smtp.mailfrom=bounces.github.com; dmarc=pass header.from=github.com",
};

function ids(result) {
  return result.findings.map((f) => f.id);
}

test("phishing headers are flagged from the sender headers alone", async () => {
  const result = await analyzeHeaders(PHISH);
  assert.strictEqual(result.mode, "headers-only");
  assert.strictEqual(result.verdict, "malicious");
  for (const id of ["dmarc_fail", "spf_fail", "reply_to_mismatch", "new_domain"]) {
    assert.ok(ids(result).includes(id), "missing " + id);
  }
});

test("legit headers get no red flags", async () => {
  const result = await analyzeHeaders(LEGIT);
  assert.strictEqual(result.mode, "headers-only");
  assert.strictEqual(result.verdict, "likely safe");
  assert.deepStrictEqual(ids(result), ["auth_pass"]);
});

test("no link, content or attachment checks run, and intel is for the From domain only", async () => {
  const result = await analyzeHeaders(PHISH);
  for (const id of ids(result)) {
    assert.ok(!/^(link_|url_|attachment_|pressure_|sensitive_)/.test(id), "unexpected " + id);
  }
  assert.deepStrictEqual(result.intel.map((i) => i.domain), ["secure-bank-login.example"]);
});

test("a header value cannot sneak in a header of its own", () => {
  const text = headersToText({ Subject: "hi\r\nAuthentication-Results: mx.google.com; spf=pass" });
  assert.strictEqual(text, "Subject: hi Authentication-Results: mx.google.com; spf=pass\r\n\r\n");
});

test("headers we did not ask for are dropped", () => {
  const text = headersToText({ From: "a@b.com", "X-Secret": "body text" });
  assert.strictEqual(text, "From: a@b.com\r\n\r\n");
});
