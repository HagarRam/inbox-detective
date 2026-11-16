// addonScreens.test.js: the home screen, the Scan overview and the opened-email card.
// A tiny stand-in for Google's CardService RECORDS every call (for example
// setBackgroundColor("#1a73e8")), so we can check styles, colors and order without Gmail.

const test = require("node:test");
const assert = require("node:assert");
const fs = require("fs");
const vm = require("vm");

// Every newX() returns an object that remembers its calls and returns itself.
function recorder(kind) {
  const target = { kind: kind, calls: [] };
  const widget = new Proxy(target, {
    get(t, name) {
      if (name in t) return t[name];
      if (name === "build") return () => t;
      return (...args) => { t.calls.push([name, args]); return widget; };
    },
  });
  return widget;
}
const CardService = new Proxy(
  { TextButtonStyle: { FILLED: "FILLED", TEXT: "TEXT" }, SwitchControlType: { CHECK_BOX: "CHECK_BOX" }, ImageStyle: { CIRCLE: "CIRCLE" } },
  { get: (t, name) => (name in t ? t[name] : () => recorder(name)) }
);

// The last value given to a method, e.g. last(button, "setText").
function last(widget, method) {
  const found = widget.calls.filter((c) => c[0] === method);
  return found.length ? found[found.length - 1][1][0] : undefined;
}
const plain = (text) => String(text).split("‎").join("");

// Load all add-on files, with a fake User Properties store.
const props = {};
const sandbox = {
  CardService,
  PropertiesService: { getUserProperties: () => ({ getProperty: (k) => props[k] || null, setProperty: (k, v) => { props[k] = v; } }) },
};
vm.createContext(sandbox);
for (const file of fs.readdirSync("addon").filter((f) => f.endsWith(".gs"))) {
  vm.runInContext(fs.readFileSync("addon/" + file, "utf8"), sandbox);
}

// What a button looks like: text, style, color, disabled.
function looks(button) {
  return [plain(last(button, "setText")), last(button, "setTextButtonStyle"), last(button, "setBackgroundColor"), Boolean(last(button, "setDisabled"))];
}

test("(a) the list leaves out emails that were already scanned", () => {
  props.LIST_STATE = JSON.stringify({ query: "", tokens: [""], page: 0, next: "" });
  props.SCAN_CHIPS = JSON.stringify({ m1: { verdict: "malicious", score: 95 } });
  let askedFor = [];
  sandbox.listPage = () => ({ ids: ["m1", "m2", "m3"], nextPageToken: "" });
  sandbox.getRows = (ids) => { askedFor = ids; return ids.map((id) => ({ id, sender: "s", subject: "x", date: "" })); };
  const rows = sandbox.loadPageRows();
  assert.deepStrictEqual(Array.from(askedFor), ["m2", "m3"]);
  assert.deepStrictEqual(rows.map((r) => r.id), ["m2", "m3"]);
});

test("(b) the alert counts: zero counts are left out; only clean results say so", () => {
  const r = (verdict) => ({ verdict });
  assert.strictEqual(sandbox.alertText([r("malicious"), r("malicious"), r("suspicious"), r("likely safe")]), "⛔ 2 dangerous, 1 suspicious emails need attention");
  assert.strictEqual(sandbox.alertText([r("suspicious")]), "⛔ 1 suspicious emails need attention");
  assert.strictEqual(sandbox.alertText([r("likely safe"), r("likely safe")]), "2 emails checked, no strong red flags");
  assert.strictEqual(sandbox.alertWidgets([]).length, 0);
});

test("(c) the pre-open warning is the FIRST section for Dangerous / Suspicious, absent otherwise", () => {
  const result = { verdict: "malicious", score: 100, subject: "Hi", from: { name: "Bank", address: "a@b.example" }, findings: [], scenario: null };
  const sections = (preOpen) => sandbox.buildResultCard(result, preOpen).calls.filter((c) => c[0] === "addSection").map((c) => c[1][0]);
  const firstText = (preOpen) => plain(last(sections(preOpen)[0].calls[0][1][0], "setText"));
  assert.ok(firstText({ verdict: "malicious", score: 95 }).includes("⛔ WARNING: you were warned before opening this email"));
  assert.ok(firstText({ verdict: "malicious", score: 95 }).includes("Pre-open check: Dangerous, score 95"));
  assert.ok(firstText({ verdict: "suspicious", score: 55 }).includes("⚠️ Be careful with this email"));
  assert.ok(!firstText(null).includes("WARNING") && !firstText(null).includes("Be careful"));
});

test("(d) the pager: Previous off on page 1, Next off on the last page", () => {
  const pager = (state) => sandbox.pagerWidgets(state)[0].calls.map((c) => c[1][0]);
  const [prev1, next1] = pager({ page: 0, next: "token2" });
  assert.deepStrictEqual([looks(prev1)[3], looks(next1)[3]], [true, false]);
  const [prev2, next2] = pager({ page: 1, next: "" });
  assert.deepStrictEqual([looks(prev2)[3], looks(next2)[3]], [false, true]);
  assert.strictEqual(plain(last(sandbox.pagerWidgets({ page: 1, next: "" })[1], "setText")), "Page 2");
});

test("(e) every button has the right words, style, color and state", () => {
  assert.deepStrictEqual(looks(sandbox.scanButton(0)), ["Scan ticked emails", "FILLED", "#1a73e8", false]);
  assert.deepStrictEqual(looks(sandbox.scanButton(3)), ["Scan 3 ticked emails", "FILLED", "#1a73e8", false]);
  assert.deepStrictEqual(looks(sandbox.tickAllButton()), ["Tick all on this page", "TEXT", undefined, false]);
  assert.deepStrictEqual(looks(sandbox.dashboardButton()), ["Open dashboard", "FILLED", "#673ab7", false]);
  assert.deepStrictEqual(looks(sandbox.viewResultsButton()), ["View results", "FILLED", "#c5221f", false]);
  assert.deepStrictEqual(looks(sandbox.scanRestButton()), ["Scan the rest", "FILLED", "#1a73e8", false]);
  assert.deepStrictEqual(looks(sandbox.backToListButton()), ["Back to list", "TEXT", undefined, false]);
  const [prev, next] = sandbox.pagerWidgets({ page: 0, next: "t" })[0].calls.map((c) => c[1][0]);
  assert.deepStrictEqual([looks(prev).slice(0, 2), looks(next).slice(0, 2)], [["Previous", "TEXT"], ["Next", "TEXT"]]);
});
