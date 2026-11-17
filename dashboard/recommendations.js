// recommendations.js
// Protection advice based on what was actually found in this mailbox.
// Each tip says who should act (user, admin, organization) and why.

const TIPS = [
  { ids: ["display_name_spoof", "url_lookalike"], who: "User", text: "Check the real sender address, not only the name. Brands are being imitated in your mailbox." },
  { ids: ["link_mismatch", "url_userinfo", "url_raw_ip"], who: "User", text: "Hover over links before clicking, and type important addresses yourself." },
  { ids: ["sensitive_request"], who: "User", text: "Never send passwords or payment details by email. Real companies do not ask for them." },
  { ids: ["attachment_double_ext", "attachment_risky"], who: "Admin", text: "Block executable attachments (.exe, .js, .scr, ...) at the mail gateway." },
  { ids: ["dmarc_fail", "spf_fail"], who: "Admin", text: "Quarantine mail that fails DMARC, and publish DMARC p=reject for your own domains." },
  { ids: ["reply_to_mismatch"], who: "Organization", text: "Show a warning banner when Reply-To differs from the sender, and verify payment requests by phone." },
  { ids: ["new_domain"], who: "Organization", text: "Hold or flag mail from domains registered in the last 30 days." },
];

// How many risky emails had any of these finding ids.
function countEmails(records, ids) {
  let count = 0;
  for (const record of records) {
    if (record.findings.some((f) => ids.includes(f.id))) count++;
  }
  return count;
}

function buildRecommendations(riskyRecords, campaigns) {
  const tips = [];
  for (const tip of TIPS) {
    const count = countEmails(riskyRecords, tip.ids);
    if (count > 0) tips.push({ who: tip.who, text: tip.text, because: count + " risky emails showed this" });
  }
  if (campaigns.length > 0) {
    tips.push({ who: "Organization", text: "Block the shared infrastructure of the campaigns below (name servers, IPs), not only single domains.", because: campaigns.length + " campaigns found" });
  }
  return tips;
}

module.exports = { buildRecommendations };
