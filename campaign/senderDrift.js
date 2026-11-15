// senderDrift.js
// "Sender drift": the same sender NAME suddenly arrives from a different domain
// that runs on different infrastructure. Example: "Microsoft 365 Admin" first from
// one network, later from another. A real company rarely changes like that.

// The infrastructure fingerprint of a sender domain: its network and name servers.
function fingerprint(intel, domain) {
  const item = (intel || []).find((i) => i.domain === domain);
  if (!item) return "unknown";
  return (item.asn || "no-asn") + " / " + (item.nameServers || []).join(",");
}

// sender name -> list of { domain, infrastructure, firstSeen }
function groupByName(records) {
  const byName = new Map();
  for (const record of records) {
    if (!record.from || !record.from.name) continue;
    const name = record.from.name.trim();
    if (!byName.has(name)) byName.set(name, []);
    const seen = byName.get(name);
    if (!seen.some((s) => s.domain === record.from.domain)) {
      seen.push({ domain: record.from.domain, infrastructure: fingerprint(record.intel, record.from.domain), firstSeen: record.date });
    }
  }
  return byName;
}

// Names seen with 2+ different infrastructures, oldest first.
function findSenderDrift(records) {
  const drift = [];
  for (const [name, seen] of groupByName(records)) {
    const infrastructures = new Set(seen.map((s) => s.infrastructure));
    if (infrastructures.size < 2) continue;
    seen.sort((a, b) => String(a.firstSeen).localeCompare(String(b.firstSeen)));
    drift.push({ name, history: seen });
  }
  return drift;
}

module.exports = { findSenderDrift };
