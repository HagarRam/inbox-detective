// buildCampaigns.js
// Input: analyzed emails ("records"), each with its intel.
// Output: campaigns = groups of DIFFERENT emails that come from the same
// infrastructure, even when they look unrelated (a "bank" and a "PayPal" email).

const { linkDomains } = require("./linkDomains");
const { findClusters, LINK_THRESHOLD } = require("./clusters");

// One intel item per domain (the same domain may appear in many emails).
function uniqueIntel(records) {
  const byDomain = new Map();
  for (const record of records) {
    for (const item of record.intel || []) byDomain.set(item.domain, item);
  }
  return [...byDomain.values()];
}

// The emails that use at least one of the domains.
function emailsUsing(domains, records) {
  const result = [];
  for (const record of records) {
    const used = (record.intel || []).some((item) => domains.includes(item.domain));
    if (used) result.push({ id: record.id, subject: record.subject, from: record.from, date: record.date });
  }
  return result;
}

// The reasons that tie the group together, strongest links first, no duplicates.
function sharedReasons(domains, links) {
  const reasons = [];
  const inside = links.filter((l) => domains.includes(l.a) && domains.includes(l.b) && l.weight >= LINK_THRESHOLD);
  inside.sort((x, y) => y.weight - x.weight);
  for (const link of inside) {
    for (const reason of link.reasons) {
      if (!reasons.includes(reason)) reasons.push(reason);
    }
  }
  return reasons;
}

function buildCampaigns(records) {
  const links = linkDomains(uniqueIntel(records));
  const campaigns = [];
  for (const domains of findClusters(links)) {
    const emails = emailsUsing(domains, records);
    if (emails.length < 2) continue; // one email alone is not a campaign
    campaigns.push({ id: "C" + (campaigns.length + 1), domains, emails, sharedInfrastructure: sharedReasons(domains, links) });
  }
  return { campaigns, links };
}

module.exports = { buildCampaigns };
