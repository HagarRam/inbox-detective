// pivots.js
// A "pivot" is one fingerprint of a domain's infrastructure:
// its IP, its network (ASN), a name server, a mail server, its registration day,
// its registrar, or one of its certificates.
// Two domains that share a RARE pivot are probably run by the same people.

// How strong each kind of pivot is when two domains share it.
const PIVOT_WEIGHTS = {
  cert: 5, // the same certificate: almost surely the same owner
  nameServer: 3,
  mailServer: 3,
  ip: 3,
  registeredOn: 2, // registered on the same day
  registrar: 1,
  asn: 1,
};

// Huge shared services. Millions of unrelated sites use them, so sharing one
// proves almost nothing. A pivot that ends with one of these counts only 10%.
const COMMON_SERVICES = [
  "cloudflare.com", "awsdns", "nsone.net", "domaincontrol.com", "googledomains.com",
  "google.com", "outlook.com", "AS13335", "AS15169", "AS16509", "AS8075", "AS396982",
];
const COMMON_FACTOR = 0.1;

function isCommon(value) {
  for (const service of COMMON_SERVICES) {
    if (value.includes(service)) return true;
  }
  return false;
}

// The weight of one shared pivot: strong if rare, almost nothing if common.
function pivotWeight(pivot) {
  const base = PIVOT_WEIGHTS[pivot.type];
  // Round to one decimal: computers write 3 * 0.1 as 0.30000000000000004.
  if (pivot.common || isCommon(pivot.value)) return Math.round(base * COMMON_FACTOR * 10) / 10;
  return base;
}

// All pivots of one domain's intel, as a list of { type, value }.
function extractPivots(item) {
  const pivots = [];
  // An IP inside a huge shared network (e.g. Cloudflare) is shared by thousands of sites.
  const onCommonNetwork = isCommon(item.asn || "");
  for (const ip of item.ips || []) pivots.push({ type: "ip", value: ip, common: onCommonNetwork });
  for (const ns of item.nameServers || []) pivots.push({ type: "nameServer", value: ns });
  for (const mx of item.mailServers || []) pivots.push({ type: "mailServer", value: mx });
  for (const id of (item.certificates && item.certificates.ids) || []) pivots.push({ type: "cert", value: id });
  if (item.asn) pivots.push({ type: "asn", value: item.asn });
  if (item.registrar) pivots.push({ type: "registrar", value: item.registrar });
  if (item.registeredOn) pivots.push({ type: "registeredOn", value: item.registeredOn });
  return pivots;
}

module.exports = { extractPivots, pivotWeight, isCommon };
