// provider.js
// The "provider interface": the rest of the code only calls getDomainIntel(domain)
// and does not care whether the answer comes from the internet or from saved files.
//
// Choose with the INTEL_MODE environment variable:
//   INTEL_MODE=replay  (default) saved files, fast, works offline
//   INTEL_MODE=live    real passive lookups (DNS, RDAP, crt.sh, ASN)

const live = require("./liveProvider");
const replay = require("./replayProvider");
const { isValidDomain } = require("./domainCheck");

const CACHE_MS = 60 * 60 * 1000; // remember answers for 1 hour
const cache = new Map(); // domain -> { time, data }

function getMode() {
  return process.env.INTEL_MODE === "live" ? "live" : "replay";
}

async function getDomainIntel(domain) {
  if (!isValidDomain(domain)) return null; // never look up something that is not a clean domain

  const saved = cache.get(domain);
  if (saved && Date.now() - saved.time < CACHE_MS) return saved.data;

  let data;
  if (getMode() === "live") data = await live.lookupDomain(domain);
  else data = replay.lookupDomain(domain);

  cache.set(domain, { time: Date.now(), data });
  return data;
}

module.exports = { getDomainIntel, getMode };
