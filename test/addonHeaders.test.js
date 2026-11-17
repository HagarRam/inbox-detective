// addonHeaders.test.js: the add-on's pickHeaders() (addon/GmailApi.gs).
// Apps Script files are plain JavaScript, so we load the file into a small
// sandbox ("vm") and call the function, without Google's servers.

const test = require("node:test");
const assert = require("node:assert");
const fs = require("fs");
const vm = require("vm");

const sandbox = {};
vm.createContext(sandbox);
vm.runInContext(fs.readFileSync("addon/GmailApi.gs", "utf8"), sandbox);
const { pickHeaders } = sandbox;

const GMAIL_AUTH = "mx.google.com; spf=fail smtp.mailfrom=x.example; dkim=none; dmarc=fail";
const FAKE_AUTH = "mx.google.com; spf=pass; dkim=pass; dmarc=pass";

test("keeps the FIRST Authentication-Results (Gmail's), not a later fake one", () => {
  const headers = pickHeaders([
    { name: "Authentication-Results", value: GMAIL_AUTH },
    { name: "Authentication-Results", value: FAKE_AUTH },
  ]);
  assert.strictEqual(headers["Authentication-Results"], GMAIL_AUTH);
});

test("a fake copy in lower case cannot replace Gmail's either", () => {
  const headers = pickHeaders([
    { name: "Authentication-Results", value: GMAIL_AUTH },
    { name: "authentication-results", value: FAKE_AUTH },
  ]);
  assert.strictEqual(headers["Authentication-Results"], GMAIL_AUTH);
});

test("drops Authentication-Results when the first one is not from mx.google.com", () => {
  const headers = pickHeaders([
    { name: "Authentication-Results", value: "evil.example; spf=pass" },
    { name: "From", value: "a@b.example" },
  ]);
  assert.strictEqual(headers["Authentication-Results"], undefined);
  assert.strictEqual(headers.From, "a@b.example");
});

test("keeps only the headers in our list, under their official names", () => {
  const headers = pickHeaders([
    { name: "reply-to", value: "x@y.example" },
    { name: "X-Mailer", value: "something" },
  ]);
  // (the copy turns the sandbox object into a normal one, so the comparison works)
  assert.deepStrictEqual(JSON.parse(JSON.stringify(headers)), { "Reply-To": "x@y.example" });
});
