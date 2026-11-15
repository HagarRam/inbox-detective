// impersonation.js
// "Who pretends to be whom": for each brand, the fake domains that used its name.

const { BRANDS, isOfficialDomain } = require("../brands");

// Letters and digits only: "Microsoft 365 Admin" -> "microsoft365admin".
function squash(text) {
  return (text || "").toLowerCase().replace(/[^a-z0-9]/g, ""); // drop everything that is not a-z or 0-9
}

// The brands an email claims to be (in the sender name or the sender domain),
// when the email does NOT really come from that brand.
function claimedBrands(record) {
  const from = record.from || {};
  const text = squash(from.name) + " " + squash(from.domain);
  const brands = [];
  for (const brand of Object.keys(BRANDS)) {
    if (text.includes(brand) && !isOfficialDomain(brand, from.domain)) brands.push(brand);
  }
  return brands;
}

// Returns [{ brand, domains: [...], emails: n }], most used brand first.
function buildImpersonationMap(records) {
  const map = new Map();
  for (const record of records) {
    for (const brand of claimedBrands(record)) {
      if (!map.has(brand)) map.set(brand, { brand, domains: [], emails: 0 });
      const entry = map.get(brand);
      entry.emails++;
      if (!entry.domains.includes(record.from.domain)) entry.domains.push(record.from.domain);
    }
  }
  return [...map.values()].sort((a, b) => b.emails - a.emails);
}

module.exports = { buildImpersonationMap };
