// dnsLookups.js
// Passive DNS lookups: we ASK public DNS about a domain.
// We never connect to the domain's own servers.

const { Resolver } = require("dns").promises;

// A resolver with a short time limit, so a slow domain cannot hang the server.
const resolver = new Resolver({ timeout: 3000, tries: 1 });

// Run one lookup; if it fails (no such record, timeout), return an empty list.
async function tryResolve(fn) {
  try {
    return await fn();
  } catch (err) {
    return [];
  }
}

async function lookupIps(domain) {
  return tryResolve(() => resolver.resolve4(domain));
}

async function lookupNameServers(domain) {
  const list = await tryResolve(() => resolver.resolveNs(domain));
  return list.map((ns) => ns.toLowerCase()).sort();
}

async function lookupMailServers(domain) {
  const list = await tryResolve(() => resolver.resolveMx(domain));
  return list.map((mx) => mx.exchange.toLowerCase()).sort();
}

// Who owns the network of an IP (its "ASN" and provider name).
// Team Cymru answers this over DNS: we ask for "4.3.2.1.origin.asn.cymru.com"
// (the IP backwards) and get back text like "13335 | 104.16.0.0/12 | US | ...".
async function lookupAsn(ip) {
  const reversed = ip.split(".").reverse().join(".");
  const origin = await tryResolve(() => resolver.resolveTxt(reversed + ".origin.asn.cymru.com"));
  if (origin.length === 0) return null;
  const asn = origin[0].join("").split("|")[0].trim();
  // A second question gives the provider name: "13335 | US | arin | ... | CLOUDFLARENET, US"
  const info = await tryResolve(() => resolver.resolveTxt("AS" + asn + ".asn.cymru.com"));
  const name = info.length > 0 ? info[0].join("").split("|").pop().trim() : "unknown";
  return { asn: "AS" + asn, provider: name };
}

module.exports = { lookupIps, lookupNameServers, lookupMailServers, lookupAsn };
