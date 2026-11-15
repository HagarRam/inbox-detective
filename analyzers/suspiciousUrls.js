// suspiciousUrls.js
// Looks at where each link goes and flags common phishing tricks.
// Each trick has its own small function. Each returns at most ONE finding,
// so 10 bad links do not add 10 times the points.

const { finding } = require("./finding");
const { normalizeHost, getWebUrls, addOnce } = require("./urlHelpers");
const { BRANDS, isOfficialDomain } = require("../brands");

const SHORTENERS = ["bit.ly", "tinyurl.com", "t.co", "goo.gl", "ow.ly", "is.gd", "buff.ly", "cutt.ly", "rb.gy", "shorturl.at"];

// Four numbers with dots between them, like 192.0.2.15
function isIpAddress(host) {
  return /^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(host);
}

// Punycode: domains with foreign letters are written as "xn--...".
// Attackers use it for look-alikes (Cyrillic "а" instead of Latin "a").
function isPunycode(host) {
  return host.startsWith("xn--") || host.includes(".xn--");
}

// Contains a brand name, but is not the brand's real domain ("paypal-login.example").
function isBrandLookalike(host) {
  for (const brand of Object.keys(BRANDS)) {
    if (host.includes(brand) && !isOfficialDomain(brand, host)) return true;
  }
  return false;
}

// Goes over all links and collects the hosts that match each trick.
function collectHosts(email) {
  const hosts = { ip: [], shortener: [], punycode: [], lookalike: [], atSign: [], http: [] };
  for (const url of getWebUrls(email)) {
    const host = normalizeHost(url.hostname);
    if (isIpAddress(host)) addOnce(hosts.ip, host);
    if (SHORTENERS.includes(host)) addOnce(hosts.shortener, host);
    if (isPunycode(host)) addOnce(hosts.punycode, host);
    if (isBrandLookalike(host)) addOnce(hosts.lookalike, host);
    // "https://paypal.com@evil.io": the browser ignores everything before "@".
    if (url.username) addOnce(hosts.atSign, host);
    if (url.protocol === "http:") addOnce(hosts.http, host);
  }
  return hosts;
}

function checkSuspiciousUrls(email) {
  const hosts = collectHosts(email);
  const findings = [];
  if (hosts.ip.length) findings.push(finding("url_raw_ip", 20, "Link points to a raw IP address", "Real sites use names, not numbers: " + hosts.ip.join(", ")));
  if (hosts.shortener.length) findings.push(finding("url_shortener", 10, "Link uses a URL shortener", "The real destination is hidden behind: " + hosts.shortener.join(", ")));
  if (hosts.punycode.length) findings.push(finding("url_punycode", 20, "Link uses look-alike characters (punycode)", "May imitate a real domain with foreign letters: " + hosts.punycode.join(", ")));
  if (hosts.lookalike.length) findings.push(finding("url_lookalike", 25, "Link domain imitates a known brand", "Contains a brand name but is not the real domain: " + hosts.lookalike.join(", ")));
  if (hosts.atSign.length) findings.push(finding("url_userinfo", 20, "Link hides its real domain with '@'", "The real destination is: " + hosts.atSign.join(", ")));
  if (hosts.http.length) findings.push(finding("url_http", 5, "Link is not encrypted (http)", "Plain http links: " + hosts.http.join(", ")));
  return findings;
}

module.exports = { checkSuspiciousUrls };
