// authResults.js
// Reads the SPF / DKIM / DMARC results from the email headers.
//
// Why only Gmail's header: anyone can write a fake
// "Authentication-Results: ... spf=pass" into an email before sending it.
// Gmail adds its OWN header (starting with "mx.google.com") at the TOP.
// So we take the first header that starts with "mx.google.com" and ignore the rest.

const TRUSTED_SERVER = "mx.google.com";

// Example header value:
// "mx.google.com; spf=fail smtp.mailfrom=x.com; dkim=none; dmarc=fail header.from=x.com"
// readCheck(value, "spf") returns "fail".
function readCheck(headerValue, checkName) {
  const parts = headerValue.split(";");
  for (const part of parts) {
    const words = part.trim().split(" "); // ["spf=fail", "smtp.mailfrom=x.com"]
    const first = words[0].toLowerCase(); // "spf=fail"
    if (first.startsWith(checkName + "=")) {
      return first.split("=")[1]; // "fail"
    }
  }
  return "none";
}

// headerLines is a list of { key, line } in the order they appear (top first).
function findGmailHeader(headerLines) {
  for (const header of headerLines) {
    if (header.key !== "authentication-results") continue;
    // header.line is "Authentication-Results: mx.google.com; ...". Remove the name.
    const value = header.line.slice("authentication-results:".length).trim();
    if (value.toLowerCase().startsWith(TRUSTED_SERVER)) {
      return value;
    }
  }
  return null;
}

function parseAuthResults(headerLines) {
  const value = findGmailHeader(headerLines);
  if (!value) {
    // No header from Gmail: we do not know anything, so we say so.
    return { trusted: false, spf: "none", dkim: "none", dmarc: "none" };
  }
  return {
    trusted: true,
    spf: readCheck(value, "spf"),
    dkim: readCheck(value, "dkim"),
    dmarc: readCheck(value, "dmarc"),
  };
}

module.exports = { parseAuthResults };
