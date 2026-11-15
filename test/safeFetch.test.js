// safeFetch.test.js: the SSRF guard blocks unsafe addresses BEFORE any request.
// (These cases need no internet: they are refused before anything is sent.)

const test = require("node:test");
const assert = require("node:assert");
const { fetchJson } = require("../intel/safeFetch");

test("refuses plain http", async () => {
  await assert.rejects(fetchJson("http://example.com/x"), /Only https/);
});

test("refuses the machine itself and the cloud metadata server", async () => {
  await assert.rejects(fetchJson("https://localhost/x"), /Blocked private address/);
  await assert.rejects(fetchJson("https://127.0.0.1/x"), /Blocked private address/);
  await assert.rejects(fetchJson("https://169.254.169.254/latest/meta-data"), /Blocked private address/);
});
