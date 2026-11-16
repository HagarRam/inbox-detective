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

test("(a) the list works like a queue: scanned emails leave, the next ones move up", () => {
  const all = [];
  for (let i = 0; i < 30; i++) all.push("m" + i);
  props.SCAN_CHIPS = JSON.stringify({ m0: { verdict: "malicious", score: 95 }, m1: { verdict: "likely safe", score: 0 } });
  sandbox.listPage = () => ({ ids: all, nextPageToken: "" });
  sandbox.getRows = (ids) => ids.map((id) => ({ id, sender: "s", subject: "x", date: "" }));
  props.LIST_STATE = JSON.stringify({ query: "", page: 0, next: "" });
  const page1 = sandbox.loadPageRows();
  assert.strictEqual(page1.length, 25); // still 25: m25 and m26 moved up
  assert.strictEqual(page1[0].id, "m2");
  assert.strictEqual(JSON.parse(props.LIST_STATE).next, "more");
  props.LIST_STATE = JSON.stringify({ query: "", page: 1, next: "" });
  const page2 = sandbox.loadPageRows();
  assert.deepStrictEqual(page2.map((r) => r.id), ["m27", "m28", "m29"]);
  assert.strictEqual(JSON.parse(props.LIST_STATE).next, ""); // the last page
});

test("an opened email is matched to its pre-open result by the message's own id", () => {
  props.SCAN_CHIPS = JSON.stringify({ abc123: { verdict: "malicious", score: 95 } });
  sandbox.console = { log() {}, error() {} };
  sandbox.GmailApp = {
    setCurrentMessageAccessToken() {},
    getMessageById: () => ({ getId: () => "abc123", getRawContent: () => "raw" }), // the event id looks different
  };
  sandbox.callBackend = () => ({ verdict: "malicious", score: 100, subject: "Hi", from: { address: "a@b.example" }, findings: [], scenario: null });
  const card = sandbox.onGmailMessageOpen({ gmail: { messageId: "msg-f:1784", accessToken: "t" } });
  const first = card.calls.find((c) => c[0] === "addSection")[1][0];
  assert.ok(plain(last(first.calls[0][1][0], "setText")).includes("⛔ WARNING: you were warned before opening this email"));
});

test("(b) the alert counts: zero counts are left out, and fine emails are not ignored", () => {
  const r = (verdict) => ({ verdict });
  assert.strictEqual(sandbox.alertText([r("malicious"), r("malicious"), r("suspicious"), r("likely safe")]), "⛔ 2 dangerous, 1 suspicious need attention");
  assert.strictEqual(sandbox.alertText([r("suspicious"), r("likely safe")]), "⛔ 1 suspicious needs attention");
  assert.strictEqual(sandbox.cleanText([r("suspicious"), r("likely safe")]), "⚪ 1 email: no strong red flags");
  assert.strictEqual(sandbox.alertText([r("likely safe"), r("likely safe")]), "2 emails checked: no strong red flags");
  assert.strictEqual(sandbox.cleanText([r("likely safe")]), ""); // already said in the first line
  assert.ok(!/safe/i.test(sandbox.cleanText([r("malicious"), r("likely safe")])));
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
  assert.deepStrictEqual(looks(sandbox.dashboardButton()), ["📊  Open dashboard", "FILLED", "#673ab7", false]);
  assert.deepStrictEqual(looks(sandbox.viewResultsButton()), ["View results", "FILLED", "#c5221f", false]);
  assert.deepStrictEqual(looks(sandbox.scanRestButton()), ["Scan the rest", "FILLED", "#1a73e8", false]);
  assert.deepStrictEqual(looks(sandbox.backToListButton()), ["Back to list", "TEXT", undefined, false]);
  const [prev, next] = sandbox.pagerWidgets({ page: 0, next: "t" })[0].calls.map((c) => c[1][0]);
  assert.deepStrictEqual([looks(prev).slice(0, 2), looks(next).slice(0, 2)], [["Previous", "TEXT"], ["Next", "TEXT"]]);
});

// ---- The Scan overview card ----

// Every piece of text the card would show (labels, headers, buttons), as plain strings.
function allText(widget, out = []) {
  for (const [, args] of widget.calls || []) {
    for (const arg of args) {
      if (typeof arg === "string") out.push(plain(arg));
      else if (arg && arg.calls) allText(arg, out);
    }
  }
  return out;
}
const sectionsOf = (card) => card.calls.filter((c) => c[0] === "addSection").map((c) => c[1][0]);
const headerOf = (section) => plain(last(section, "setHeader") || "");
const rowsOf = (section) => section.calls.filter((c) => c[0] === "addWidget").map((c) => c[1][0]).filter((w) => w.kind === "newDecoratedText");

function overviewWith(results) {
  props.LAST_SCAN = JSON.stringify(results);
  props.PAGE_ROWS = "[]";
  return sandbox.buildOverviewCard();
}
const entry = (id, verdict, score, top) => ({ id, verdict, score, sender: "S " + id, subject: "Subject " + id, top: top || "" });

test("overview (a): sections in order, only for groups that have emails", () => {
  const card = overviewWith([entry("a", "likely safe", 0), entry("b", "malicious", 95, "DMARC failed"), entry("c", "suspicious", 55, "Pretends to be microsoft")]);
  assert.deepStrictEqual(sectionsOf(card).map(headerOf), ["", "🔴 Dangerous. Do not open", "🟠 Suspicious. Be careful", "🟢 No strong red flags", "How to read this", ""]);
  const onlyBad = overviewWith([entry("b", "malicious", 95, "DMARC failed")]);
  assert.deepStrictEqual(sectionsOf(onlyBad).map(headerOf), ["", "🔴 Dangerous. Do not open", "How to read this", ""]);
  const counts = allText(sectionsOf(onlyBad)[0]).join(" | ");
  for (const line of ["1 email checked", "🔴 1 Dangerous", "🟠 0 Suspicious", "🟢 0 No strong red flags"]) assert.ok(counts.includes(line), line);
});

test("overview (b): emails that were not flagged get green rows too", () => {
  const card = overviewWith([entry("a", "likely safe", 0), entry("b", "malicious", 95)]);
  const green = sectionsOf(card).find((s) => headerOf(s) === "🟢 No strong red flags");
  assert.strictEqual(rowsOf(green).length, 1);
  assert.strictEqual(plain(last(rowsOf(green)[0], "setText")), "<b>Subject a</b>");
});

test("overview (c): the bottom line has the score and the strongest warning sign", () => {
  const card = overviewWith([entry("b", "malicious", 95, "Replies go to a different domain"), entry("a", "likely safe", 0), entry("d", "likely safe", 20, "Domain was registered very recently"), entry("e", "suspicious", 40)]);
  const groups = sectionsOf(card).slice(1, -2); // the email groups, between the summary and "How to read this"
  const labels = groups.flatMap(rowsOf).map((row) => plain(last(row, "setBottomLabel")));
  assert.deepStrictEqual(labels, ["Score 95 · Replies go to a different domain", "Score 40", "Score 20 · Domain was registered very recently", "Score 0 · Sender checks passed"]);
});

test("overview (d): the word 'safe' never appears in the card", () => {
  const card = overviewWith([entry("a", "likely safe", 0), entry("b", "malicious", 95, "DMARC failed"), entry("c", "suspicious", 55)]);
  const text = allText(card).join(" ");
  assert.ok(!/safe/i.test(text), "found 'safe' in: " + text);
});

test("overview (e): more than 10 emails in a group adds '+N more in the dashboard'", () => {
  const many = [];
  for (let i = 0; i < 13; i++) many.push(entry("m" + i, "malicious", 60 + i, "DMARC failed"));
  const red = sectionsOf(overviewWith(many))[1];
  assert.strictEqual(rowsOf(red).length, 10);
  assert.ok(allText(red).includes("+3 more in the dashboard"));
  assert.strictEqual(plain(last(rowsOf(red)[0], "setBottomLabel")), "Score 72 · DMARC failed"); // highest score first
});

// ---- Progress and "Already scanned" ----

test("progress: 'Checked 2 of 30 unread emails', and the scanned ones go to 'Already scanned'", () => {
  const all = [];
  for (let i = 0; i < 30; i++) all.push("m" + i);
  props.SCAN_CHIPS = JSON.stringify({ m0: { verdict: "malicious", score: 95 }, m5: { verdict: "likely safe", score: 0 } });
  props.LIST_STATE = JSON.stringify({ query: "", page: 0, next: "" });
  sandbox.listPage = () => ({ ids: all, nextPageToken: "" });
  sandbox.getRows = (ids) => ids.map((id) => ({ id, sender: "S " + id, subject: "Subject " + id, date: "" }));
  const page = sandbox.loadPageRows();
  assert.strictEqual(page.length, 25);
  assert.strictEqual(sandbox.progressLine(JSON.parse(props.LIST_STATE)), "Checked 2 of 30 unread emails");
  assert.deepStrictEqual(JSON.parse(props.SCANNED_ROWS).map((r) => r.id), ["m0", "m5"]);
  assert.strictEqual(sandbox.progressLine({ total: 0 }), "");
});

test("'Already scanned' rows show their tag and open the details with a tap", () => {
  const rows = [{ id: "m0", sender: "Bank", subject: "Urgent" }];
  const chips = { m0: { verdict: "malicious", score: 95 } };
  const section = sandbox.alreadyScannedSection(rows, chips, { checked: 3 });
  assert.strictEqual(plain(last(section, "setHeader")), "Already scanned");
  const row = rowsOf(section)[0];
  assert.strictEqual(plain(last(row, "setBottomLabel")), "🔴 Dangerous · 95");
  assert.strictEqual(last(last(row, "setOnClickAction"), "setFunctionName"), "onRowClick");
  assert.ok(allText(section).join(" ").includes("+2 more"));
});
