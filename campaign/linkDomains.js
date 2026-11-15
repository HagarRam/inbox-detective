// linkDomains.js
// Finds which domains share pivots, and how strongly they are linked.

const { extractPivots, pivotWeight } = require("./pivots");

// A pivot shared by more domains than this is not rare by definition; skip it.
const MAX_SHARED = 25;

// pivot "ip:203.0.113.25" -> ["a.example", "b.example", ...]
function indexPivots(intelList) {
  const index = new Map();
  for (const item of intelList) {
    for (const pivot of extractPivots(item)) {
      const key = pivot.type + ":" + pivot.value;
      if (!index.has(key)) index.set(key, { pivot, domains: [] });
      const entry = index.get(key);
      if (!entry.domains.includes(item.domain)) entry.domains.push(item.domain);
    }
  }
  return index;
}

// Add the weight of one shared pivot to the link between two domains.
function addToLink(links, a, b, pivot) {
  const key = a < b ? a + "|" + b : b + "|" + a; // same key for (a,b) and (b,a)
  if (!links.has(key)) links.set(key, { a, b, weight: 0, reasons: [] });
  const link = links.get(key);
  const weight = pivotWeight(pivot);
  link.weight += weight;
  // e.g. "nameServer ns1.quiet-dns.example (+3)" or "asn AS13335 (+0.1, common)"
  const note = weight < 1 ? " (+" + weight + ", common)" : " (+" + weight + ")";
  link.reasons.push(pivot.type + " " + pivot.value + note);
}

// Returns a list of { a, b, weight, reasons } for every pair that shares something.
function linkDomains(intelList) {
  const links = new Map();
  for (const { pivot, domains } of indexPivots(intelList).values()) {
    if (domains.length < 2 || domains.length > MAX_SHARED) continue;
    for (let i = 0; i < domains.length; i++) {
      for (let j = i + 1; j < domains.length; j++) {
        addToLink(links, domains[i], domains[j], pivot);
      }
    }
  }
  return [...links.values()];
}

module.exports = { linkDomains };
