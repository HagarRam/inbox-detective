// scamTypes.js
// Puts each risky email into ONE simple "type", for the dashboard chart.
// The first rule that matches wins, strongest kind first.

const RULES = [
  { type: "Malware attachment", ids: ["attachment_double_ext", "attachment_risky"] },
  { type: "Brand impersonation", ids: ["display_name_spoof", "url_lookalike", "url_punycode"] },
  { type: "Credential phishing link", ids: ["link_mismatch", "url_raw_ip", "url_userinfo", "url_shortener"] },
  { type: "Reply-to / CEO fraud", ids: ["reply_to_mismatch"] },
  { type: "Forged sender", ids: ["dmarc_fail", "spf_fail"] },
];

function scamType(record) {
  const ids = record.findings.map((f) => f.id);
  for (const rule of RULES) {
    if (rule.ids.some((id) => ids.includes(id))) return rule.type;
  }
  return "Other suspicious";
}

module.exports = { scamType };
