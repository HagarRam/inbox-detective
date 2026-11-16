// Summary.gs
// One plain-English sentence at the top of the card, e.g.
// "This email pretends to be Microsoft and has links that go somewhere other than they show."
// It is built from FIXED phrases below (never from email text), strongest first.

const SUMMARY_PHRASES = [
  ["attachment_double_ext", "hides the real type of its attachment"],
  ["attachment_risky", "carries a risky attachment"],
  ["display_name_spoof", "pretends to be a known brand"], // replaced by the brand name below
  ["link_mismatch", "has links that go somewhere other than they show"],
  ["url_lookalike", "links to a look-alike of a known brand"],
  ["url_userinfo", "hides where its links really go"],
  ["url_punycode", "uses look-alike letters in a link"],
  ["url_raw_ip", "links to a bare IP address"],
  ["dmarc_fail", "fails the sender's own anti-forgery check (DMARC)"],
  ["reply_to_mismatch", "sends your replies to a different domain"],
  ["sensitive_request", "asks for passwords, payment or identity details"],
  ["new_domain", "comes from a domain registered only days ago"],
  ["pressure_language", "pushes you to act fast"],
  ["spf_fail", "comes from a server that may not send for that domain"],
  ["url_shortener", "hides a link behind a URL shortener"],
];

// "Pretends to be paypal" -> "pretends to be Paypal" (the brand comes from our own brand list).
function brandPhrase(finding) {
  const brand = finding.title.replace("Pretends to be ", "");
  return "pretends to be " + brand.charAt(0).toUpperCase() + brand.slice(1);
}

// The phrases for the findings this email has, in the order of the list above.
function matchingPhrases(findings) {
  const phrases = [];
  for (const [id, phrase] of SUMMARY_PHRASES) {
    const finding = findings.find((f) => f.id === id);
    if (finding) phrases.push(id === "display_name_spoof" ? brandPhrase(finding) : phrase);
  }
  return phrases;
}

function summarySentence(result) {
  const phrases = matchingPhrases(result.findings);
  if (result.verdict === "likely safe") {
    const authenticated = result.findings.some((f) => f.id === "auth_pass");
    return "No strong warning signs found." + (authenticated ? " The sender is authenticated." : "");
  }
  if (phrases.length === 0) return "Several small warning signs add up.";
  if (phrases.length === 1) return "This email " + phrases[0] + ".";
  return "This email " + phrases[0] + " and " + phrases[1] + ".";
}
