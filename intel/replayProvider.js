// replayProvider.js
// "Replay" mode: answers from saved files in fixtures/intel/<domain>.json
// instead of the internet. The demo then works without network, the same way
// every time, and without hitting the limits of the free services.

const fs = require("fs");
const path = require("path");

const FIXTURE_DIR = path.join(__dirname, "..", "fixtures", "intel");

// The domain was already checked by isValidDomain (only a-z, 0-9, "-" and "."),
// so it cannot contain "/" or ".." and cannot reach files outside FIXTURE_DIR.
function lookupDomain(domain) {
  const file = path.join(FIXTURE_DIR, domain + ".json");
  if (!fs.existsSync(file)) {
    return { domain, notInReplay: true };
  }
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

module.exports = { lookupDomain, FIXTURE_DIR };
