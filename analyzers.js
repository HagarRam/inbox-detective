// analyzers.js
// Each function here looks at ONE kind of signal and returns a list of
// "findings". A finding is: { id, points, title, detail }
//   - points > 0  means "this looks bad"
//   - points < 0  means "this looks good" (a reassuring signal)
//   - points = 0  means "worth knowing, but does not change the score"
// These functions are pure: no network, no files. That makes them easy
// to test and easy to explain.

const { BRANDS, isOfficialDomain } = require("./brands");

// Small helper so every finding has the same shape.
function finding(id, points, title, detail) {
  return { id, points, title, detail };
}

// "www.paypal.com" and "paypal.com" should count as the same site.
function normalizeHost(host) {
  return (host || "").toLowerCase().replace(/^www\./, "");
}

// Safe URL parsing: a broken URL returns null instead of crashing.
function parseUrl(href) {
  try {
    return new URL(href);
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------
// 1. Sender authentication (SPF / DKIM / DMARC)
// ---------------------------------------------------------------------
function checkAuthentication(email) {
  const { auth } = email;
  if (!auth.trusted) {
    return [
      finding(
        "auth_unknown",
        0,
        "No authentication result from Gmail",
        "We could not find SPF/DKIM/DMARC results added by Gmail, so we cannot tell if the sender is real."
      ),
    ];
  }

  const findings = [];
  if (auth.dmarc === "fail") {
    findings.push(finding("dmarc_fail", 25, "DMARC failed", "The sender's domain says: do not trust mail like this one."));
  }
  if (auth.spf === "fail" || auth.spf === "softfail") {
    findings.push(finding("spf_fail", 15, `SPF ${auth.spf}`, "The server that sent this email is not allowed to send for this domain."));
  }
  if (auth.dkim === "fail" || auth.dkim === "none") {
    findings.push(finding("dkim_missing", 10, `DKIM ${auth.dkim}`, "The email has no valid digital signature from the sender's domain."));
  }

  // All three passed: a real reassuring signal.
  if (auth.spf === "pass" && auth.dkim === "pass" && auth.dmarc === "pass") {
    findings.push(finding("auth_pass", -20, "Sender is authenticated", "SPF, DKIM and DMARC all passed, so the email really came from the sender's domain."));
  }
  return findings;
}

// ---------------------------------------------------------------------
// 2. Reply-To / Return-Path do not match the From domain
// ---------------------------------------------------------------------
function checkReplyTo(email) {
  if (!email.from) return [];
  const fromDomain = email.from.domain;
  const other = email.replyTo.find((r) => r.domain !== fromDomain);
  if (!other) return [];
  return [
    finding(
      "reply_to_mismatch",
      20,
      "Replies go to a different domain",
      `The email is from ${fromDomain}, but if you press Reply it goes to ${other.domain}.`
    ),
  ];
}

function checkReturnPath(email) {
  if (!email.from || !email.returnPath) return [];
  const fromDomain = email.from.domain;
  const rpDomain = email.returnPath.domain;
  // Subdomains are normal (bounces.example.com for example.com).
  if (rpDomain === fromDomain || rpDomain.endsWith("." + fromDomain)) return [];
  // Low points: mailing services (newsletters) do this legitimately.
  return [
    finding(
      "return_path_mismatch",
      5,
      "Bounce address uses a different domain",
      `Return-Path is ${rpDomain}, From is ${fromDomain}. Common for mailing services, but also for spoofed mail.`
    ),
  ];
}

// ---------------------------------------------------------------------
// 3. Display name pretends to be a known brand
// ---------------------------------------------------------------------
function checkDisplayNameSpoof(email) {
  if (!email.from) return [];
  const name = email.from.name.toLowerCase().replace(/\s+/g, "");
  for (const brand of Object.keys(BRANDS)) {
    if (name.includes(brand) && !isOfficialDomain(brand, email.from.domain)) {
      return [
        finding(
          "display_name_spoof",
          25,
          `Pretends to be ${brand}`,
          `The sender name says "${email.from.name}", but the email comes from ${email.from.domain}, which is not a ${brand} domain.`
        ),
      ];
    }
  }
  return [];
}

// ---------------------------------------------------------------------
// 4. Links: what you see vs where it really goes
// ---------------------------------------------------------------------
function checkLinkMismatch(email) {
  const details = [];
  for (const { href, text } of email.links) {
    // Only compare when the visible text itself looks like a web address.
    const shownText = text.trim();
    const looksLikeUrl = /^(https?:\/\/)?[a-z0-9-]+(\.[a-z0-9-]+)+(\/\S*)?$/i.test(shownText);
    if (!looksLikeUrl) continue;

    const shown = parseUrl(/^https?:\/\//i.test(shownText) ? shownText : "https://" + shownText);
    const real = parseUrl(href);
    if (!shown || !real) continue;

    if (normalizeHost(shown.hostname) !== normalizeHost(real.hostname)) {
      details.push(`shows ${shown.hostname} but goes to ${real.hostname}`);
    }
  }
  if (details.length === 0) return [];
  return [finding("link_mismatch", 30, "Link text does not match its real destination", details.join("; "))];
}

// ---------------------------------------------------------------------
// 5. Suspicious URLs (shorteners, raw IPs, punycode, http, look-alikes)
// ---------------------------------------------------------------------
const SHORTENERS = ["bit.ly", "tinyurl.com", "t.co", "goo.gl", "ow.ly", "is.gd", "buff.ly", "cutt.ly", "rb.gy", "shorturl.at"];

function checkSuspiciousUrls(email) {
  // Collect problems per type, so 10 bad links give one clear finding each.
  const found = { ip: new Set(), shortener: new Set(), punycode: new Set(), http: new Set(), lookalike: new Set(), atSign: new Set() };

  for (const { href } of email.links) {
    const url = parseUrl(href);
    if (!url || !/^https?:$/.test(url.protocol)) continue;
    const host = normalizeHost(url.hostname);

    if (/^\d{1,3}(\.\d{1,3}){3}$/.test(host) || host.startsWith("[")) found.ip.add(host);
    if (SHORTENERS.includes(host)) found.shortener.add(host);
    if (host.split(".").some((part) => part.startsWith("xn--"))) found.punycode.add(host);
    if (url.protocol === "http:") found.http.add(host);
    if (url.username) found.atSign.add(host); // https://paypal.com@evil.io
    for (const brand of Object.keys(BRANDS)) {
      if (host.includes(brand) && !isOfficialDomain(brand, host)) found.lookalike.add(host);
    }
  }

  const list = (set) => [...set].join(", ");
  const findings = [];
  if (found.ip.size) findings.push(finding("url_raw_ip", 20, "Link points to a raw IP address", `Real sites use names, not numbers: ${list(found.ip)}`));
  if (found.shortener.size) findings.push(finding("url_shortener", 10, "Link uses a URL shortener", `The real destination is hidden behind: ${list(found.shortener)}`));
  if (found.punycode.size) findings.push(finding("url_punycode", 20, "Link uses look-alike characters (punycode)", `These domains may imitate a real one with foreign letters: ${list(found.punycode)}`));
  if (found.lookalike.size) findings.push(finding("url_lookalike", 25, "Link domain imitates a known brand", `Contains a brand name but is not the brand's real domain: ${list(found.lookalike)}`));
  if (found.atSign.size) findings.push(finding("url_userinfo", 20, "Link hides its real domain with '@'", `Everything before '@' is ignored by the browser. Real host: ${list(found.atSign)}`));
  if (found.http.size) findings.push(finding("url_http", 5, "Link is not encrypted (http)", `Plain http links: ${list(found.http)}`));
  return findings;
}

// ---------------------------------------------------------------------
// 6. Attachments (we only look at name and type, never open them)
// ---------------------------------------------------------------------
const RISKY_EXTENSIONS = ["exe", "scr", "js", "vbs", "bat", "cmd", "ps1", "jar", "msi", "hta", "lnk", "iso", "img", "docm", "xlsm", "pptm", "html", "htm"];
const DECOY_EXTENSIONS = ["pdf", "doc", "docx", "xls", "xlsx", "jpg", "png", "txt", "zip"];

function checkAttachments(email) {
  const findings = [];
  for (const att of email.attachments) {
    const parts = att.filename.toLowerCase().split(".");
    const ext = parts.length > 1 ? parts[parts.length - 1] : "";
    const prevExt = parts.length > 2 ? parts[parts.length - 2] : "";

    if (RISKY_EXTENSIONS.includes(ext) && DECOY_EXTENSIONS.includes(prevExt)) {
      findings.push(finding("attachment_double_ext", 35, "Attachment hides its real type", `"${att.filename}" looks like a .${prevExt} but is really a .${ext} file.`));
    } else if (RISKY_EXTENSIONS.includes(ext)) {
      findings.push(finding("attachment_risky", 25, "Risky attachment type", `"${att.filename}" is a .${ext} file, which can run code or open a fake page.`));
    }
  }
  return findings;
}

// ---------------------------------------------------------------------
// 7. Content: pressure language and sensitive requests
// ---------------------------------------------------------------------
const PRESSURE_PHRASES = [
  "urgent", "immediately", "within 24 hours", "within 48 hours", "account will be closed",
  "account has been suspended", "account will be suspended", "final notice", "last warning",
  "act now", "unusual activity", "unauthorized login", "limited time",
];
const SENSITIVE_PHRASES = [
  "verify your account", "confirm your password", "enter your password", "update your payment",
  "confirm your identity", "credit card", "bank details", "wire transfer", "gift card", "login credentials",
];

function findPhrases(text, phrases) {
  const lower = text.toLowerCase();
  return phrases.filter((p) => lower.includes(p));
}

function checkContent(email) {
  const text = `${email.subject}\n${email.text}`;
  const findings = [];
  const pressure = findPhrases(text, PRESSURE_PHRASES);
  const sensitive = findPhrases(text, SENSITIVE_PHRASES);
  if (pressure.length) {
    findings.push(finding("pressure_language", 15, "Uses pressure or urgency", `Phrases found: "${pressure.join('", "')}"`));
  }
  if (sensitive.length) {
    findings.push(finding("sensitive_request", 20, "Asks for passwords, payment or identity", `Phrases found: "${sensitive.join('", "')}"`));
  }
  return findings;
}

// The list of all checks. analyze.js runs every one of them.
const ALL_ANALYZERS = [
  checkAuthentication,
  checkReplyTo,
  checkReturnPath,
  checkDisplayNameSpoof,
  checkLinkMismatch,
  checkSuspiciousUrls,
  checkAttachments,
  checkContent,
];

module.exports = {
  ALL_ANALYZERS,
  checkAuthentication,
  checkReplyTo,
  checkReturnPath,
  checkDisplayNameSpoof,
  checkLinkMismatch,
  checkSuspiciousUrls,
  checkAttachments,
  checkContent,
};
