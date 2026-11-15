// campaignDemo.js
// Analyzes every sample email, then prints the campaigns, the impersonation map
// and sender drift. Run:  node scripts/campaignDemo.js

const fs = require("fs");
const { analyzeRaw } = require("../analyze");
const { buildCampaigns } = require("../campaign/buildCampaigns");
const { buildImpersonationMap } = require("../campaign/impersonation");
const { findSenderDrift } = require("../campaign/senderDrift");

async function loadRecords() {
  const records = [];
  for (const file of fs.readdirSync("samples")) {
    if (!file.endsWith(".eml")) continue;
    const result = await analyzeRaw(fs.readFileSync("samples/" + file));
    records.push({ id: file, ...result });
  }
  return records;
}

async function main() {
  const records = await loadRecords();
  for (const c of buildCampaigns(records).campaigns) {
    console.log("\nCampaign " + c.id + ": " + c.emails.length + " emails, " + c.domains.length + " domains");
    for (const e of c.emails) console.log("  email:  " + e.subject + "  (" + e.from.domain + ")");
    console.log("  shared: " + c.sharedInfrastructure.join("; "));
  }
  console.log("\nImpersonation map:");
  for (const i of buildImpersonationMap(records)) console.log("  " + i.brand + " <- " + i.domains.join(", "));
  console.log("\nSender drift:");
  for (const d of findSenderDrift(records)) {
    console.log("  \"" + d.name + "\": " + d.history.map((h) => h.domain + " [" + h.infrastructure + "]").join("  ->  "));
  }
}

main();
