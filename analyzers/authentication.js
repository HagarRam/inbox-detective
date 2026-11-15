// authentication.js
// Looks at SPF / DKIM / DMARC (already read from Gmail's header by authResults.js).
//   SPF   = was the sending server allowed to send for this domain?
//   DKIM  = does the email carry a valid digital signature of the domain?
//   DMARC = the domain's policy: what to do when SPF/DKIM do not match.

const { finding } = require("./finding");

function checkAuthentication(email) {
  const auth = email.auth;
  if (!auth.trusted) {
    return [finding("auth_unknown", 0, "No authentication result from Gmail",
      "We found no SPF/DKIM/DMARC result added by Gmail, so we cannot confirm the sender.")];
  }

  if (auth.spf === "pass" && auth.dkim === "pass" && auth.dmarc === "pass") {
    return [finding("auth_pass", -20, "Sender is authenticated",
      "SPF, DKIM and DMARC all passed: the email really came from the sender's domain.")];
  }

  const findings = [];
  if (auth.dmarc === "fail") {
    findings.push(finding("dmarc_fail", 25, "DMARC failed", "The sender's domain says: do not trust mail like this one."));
  }
  if (auth.spf === "fail" || auth.spf === "softfail") {
    findings.push(finding("spf_fail", 15, "SPF " + auth.spf, "The sending server is not allowed to send for this domain."));
  }
  if (auth.dkim === "fail" || auth.dkim === "none") {
    findings.push(finding("dkim_missing", 10, "DKIM " + auth.dkim, "The email has no valid signature from the sender's domain."));
  }
  return findings;
}

module.exports = { checkAuthentication };
