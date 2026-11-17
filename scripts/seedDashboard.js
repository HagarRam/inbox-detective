// seedDashboard.js
// Fills the dashboard with the sample emails, without Gmail (for a demo or testing).
// Like the real mailbox scan, it sends ONLY the headers, never the body.
// Run:  node scripts/seedDashboard.js

const fs = require("fs");
const { analyzeRaw } = require("../analyze");
const { toRecord, saveRecords } = require("../dashboard/scanStore");

// The headers are everything before the first empty line of the .eml file.
function headersOnly(raw) {
  const end = raw.search(/\r?\n\r?\n/); // position of the first empty line
  return end === -1 ? raw : raw.slice(0, end);
}

async function main() {
  const records = [];
  for (const file of fs.readdirSync("samples")) {
    if (!file.endsWith(".eml")) continue;
    const raw = fs.readFileSync("samples/" + file, "utf8");
    records.push(toRecord("sample-" + file, await analyzeRaw(headersOnly(raw))));
  }
  console.log("Saved " + records.length + " records. Total in store: " + saveRecords(records));
}

main();
