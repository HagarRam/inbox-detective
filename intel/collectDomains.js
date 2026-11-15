// collectDomains.js
// Which domains of an email are worth investigating:
// the sender, Reply-To, Return-Path, and every web link.

const { getWebUrls } = require("../analyzers/urlHelpers");
const { isValidDomain } = require("./domainCheck");

// Look up at most this many domains per email, to keep it fast and polite.
const MAX_DOMAINS = 8;

function addDomain(list, domain) {
  if (!domain) return;
  const clean = domain.toLowerCase();
  // Skip IP addresses and anything strange; skip duplicates.
  if (isValidDomain(clean) && !list.includes(clean)) list.push(clean);
}

function collectDomains(email) {
  const domains = [];
  if (email.from) addDomain(domains, email.from.domain);
  for (const reply of email.replyTo || []) addDomain(domains, reply.domain);
  if (email.returnPath) addDomain(domains, email.returnPath.domain);
  for (const url of getWebUrls(email)) addDomain(domains, url.hostname);
  return domains.slice(0, MAX_DOMAINS);
}

module.exports = { collectDomains };
