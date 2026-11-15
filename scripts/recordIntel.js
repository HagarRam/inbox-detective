// recordIntel.js
// Runs the LIVE lookups for some domains and saves the answers as replay files.
// Run:  node scripts/recordIntel.js github.com bit.ly
// Then INTEL_MODE=replay gives the same answers without the internet.

const fs = require("fs");
const path = require("path");
const { lookupDomain } = require("../intel/liveProvider");
const { FIXTURE_DIR } = require("../intel/replayProvider");
const { isValidDomain } = require("../intel/domainCheck");

async function record(domain) {
  if (!isValidDomain(domain)) {
    console.log("Skipped (not a clean domain): " + domain);
    return;
  }
  const data = await lookupDomain(domain);
  data.source = "recorded live on " + new Date().toISOString().slice(0, 10);
  fs.writeFileSync(path.join(FIXTURE_DIR, domain + ".json"), JSON.stringify(data, null, 2) + "\n");
  console.log("Saved " + domain);
}

async function main() {
  for (const domain of process.argv.slice(2)) {
    await record(domain.toLowerCase());
  }
}

main();
