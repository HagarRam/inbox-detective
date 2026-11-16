// addonList.test.js: the pure parts of the email list on the home screen.
// Loads all the add-on files (plain JavaScript) into one sandbox.

const test = require("node:test");
const assert = require("node:assert");
const fs = require("fs");
const vm = require("vm");

const sandbox = {};
vm.createContext(sandbox);
for (const file of fs.readdirSync("addon").filter((f) => f.endsWith(".gs"))) {
  vm.runInContext(fs.readFileSync("addon/" + file, "utf8"), sandbox);
}
const LTR = "‎";
const plain = (text) => text.split(LTR).join(""); // remove the invisible left-to-right marks

test("the row shows the display name only, or the address when there is no name", () => {
  assert.strictEqual(sandbox.senderName('"Bank Security" <alerts@secure-bank-login.example>'), "Bank Security");
  assert.strictEqual(sandbox.senderName("Dana Levi <dana@example.org>"), "Dana Levi");
  assert.strictEqual(sandbox.senderName("<noreply@github.com>"), "noreply@github.com");
  assert.strictEqual(sandbox.senderName("noreply@github.com"), "noreply@github.com");
});

test("the tag after a scan is short and never says 'safe'", () => {
  assert.strictEqual(sandbox.chipText(undefined), "Not scanned yet");
  assert.strictEqual(sandbox.chipText({ verdict: "malicious", score: 95 }), "🔴 Dangerous · 95");
  assert.strictEqual(sandbox.chipText({ verdict: "suspicious", score: 55 }), "🟠 Suspicious · 55");
  assert.strictEqual(sandbox.chipText({ verdict: "likely safe", score: 0 }), "⚪ No strong red flags · 0");
});

test("only Suspicious and Malicious rows open with a tap", () => {
  assert.strictEqual(sandbox.isFlagged(undefined), false);
  assert.strictEqual(sandbox.isFlagged({ verdict: "likely safe" }), false);
  assert.strictEqual(sandbox.isFlagged({ verdict: "suspicious" }), true);
});

test("progress: 5 per click, then done; a server problem becomes a friendly sentence", () => {
  assert.strictEqual(sandbox.progressText({ scanned: 5, left: 7, error: "" }), "Scanned 5 emails. 7 more are ticked: click Scan again.");
  assert.strictEqual(sandbox.progressText({ scanned: 1, left: 0, error: "" }), "Scanned 1 email.");
  assert.strictEqual(sandbox.progressText({ scanned: 5, left: 0, error: "The backend answered with status 404." }), "Could not reach the analysis server. Is it running?");
});

test("only rows that were really ticked are scanned", () => {
  const e = { commonEventObject: { formInputs: {
    pick_aaa: { stringInputs: { value: ["aaa"] } },
    pick_bbb: { stringInputs: { value: [] } }, // not ticked
    query: { stringInputs: { value: ["from:paypal"] } }, // the search box, not a row
  } } };
  assert.deepStrictEqual(Array.from(sandbox.pickedIds(e)), ["aaa"]);
});

test("the list and the search show unread inbox emails only", () => {
  assert.strictEqual(sandbox.listQuery({ query: "" }), "in:inbox is:unread");
  assert.strictEqual(sandbox.listQuery({ query: "from:paypal" }), "in:inbox is:unread from:paypal");
});

test("the warning box: red for Malicious, orange for Suspicious, none otherwise", () => {
  // A tiny stand-in for Google's CardService: it only remembers the text of the box.
  let shown = "";
  sandbox.CardService = {
    newTextParagraph: () => ({ setText: (text) => { shown = text; return {}; } }),
    newCardSection: () => ({ addWidget: () => "section" }),
  };
  assert.strictEqual(sandbox.warningSection({ verdict: "malicious" }), "section");
  assert.ok(plain(shown).includes("⛔ DANGEROUS EMAIL") && shown.includes("#c5221f"));
  assert.strictEqual(sandbox.warningSection({ verdict: "suspicious" }), "section");
  assert.ok(plain(shown).includes("⚠ BE CAREFUL") && shown.includes("#b06000"));
  assert.strictEqual(sandbox.warningSection({ verdict: "likely safe" }), null);
});
