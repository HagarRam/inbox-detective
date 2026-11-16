// server.test.js: the server's own protections, tested on a real (local) server.

const test = require("node:test");
const assert = require("node:assert");

process.env.API_SECRET = "test-secret"; // set before loading the server (.env does not override it)
const { app } = require("../server");
const { readAll } = require("../dashboard/scanStore");

let server;
let base;
test.before(() => new Promise((resolve) => {
  server = app.listen(0, "127.0.0.1", () => {
    base = "http://127.0.0.1:" + server.address().port;
    resolve();
  });
}));
test.after(() => server.close());

function post(path, body, key) {
  const headers = { "Content-Type": "application/json" };
  if (key) headers["X-API-Key"] = key;
  return fetch(base + path, { method: "POST", headers, body });
}

test("refuses a wrong API key", async () => {
  const res = await post("/analyze", JSON.stringify({ raw: "x" }), "wrong");
  assert.strictEqual(res.status, 401);
});

test("broken JSON gets a short answer, with no internal details", async () => {
  const res = await post("/analyze", "{ not json", "test-secret");
  assert.strictEqual(res.status, 400);
  assert.deepStrictEqual(await res.json(), { error: "Bad request" });
});

test("a strange id is not saved to the dashboard, but the email is still analyzed", async () => {
  const before = readAll().length;
  const res = await post("/analyze", JSON.stringify({ raw: "Subject: hi", id: "../../etc" }), "test-secret");
  assert.strictEqual(res.status, 200);
  assert.strictEqual(readAll().length, before);
});

test("/analyze-headers needs the API key", async () => {
  const res = await post("/analyze-headers", JSON.stringify({ headers: { From: "a@b.com" } }), "wrong");
  assert.strictEqual(res.status, 401);
});

test("/analyze-headers refuses a body that is not { headers: {...} }", async () => {
  const res = await post("/analyze-headers", JSON.stringify({ headers: "From: a@b.com" }), "test-secret");
  assert.strictEqual(res.status, 400);
});

test("/analyze-headers refuses a body over 64 KB", async () => {
  const big = JSON.stringify({ headers: { Subject: "x".repeat(70 * 1024) } });
  const res = await post("/analyze-headers", big, "test-secret");
  assert.strictEqual(res.status, 413); // 413 = "too large"
  assert.deepStrictEqual(await res.json(), { error: "Bad request" });
});

test("sends safe headers and hides that it runs Express", async () => {
  const res = await fetch(base + "/");
  assert.strictEqual(res.headers.get("x-content-type-options"), "nosniff");
  assert.strictEqual(res.headers.get("x-frame-options"), "DENY");
  assert.strictEqual(res.headers.get("x-powered-by"), null);
});

test("blocks a client that sends too many requests", async () => {
  let last;
  for (let i = 0; i < 125; i++) last = await fetch(base + "/", { headers: { "X-Forwarded-For": "203.0.113.9" } });
  assert.strictEqual(last.status, 429);
  const other = await fetch(base + "/", { headers: { "X-Forwarded-For": "203.0.113.10" } });
  assert.strictEqual(other.status, 200); // a different client is not affected
});
