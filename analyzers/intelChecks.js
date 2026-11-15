// intelChecks.js
// Checks that use the network intel (not the email itself).
// Pure functions: intel in, findings out. No network here, so easy to test.

const { finding } = require("./finding");
const { isPrivateIp } = require("../intel/domainCheck");

const NEW_DOMAIN_DAYS = 30; // phishing domains are often only days old
const DAY_MS = 24 * 60 * 60 * 1000;

// How many whole days between "2026-11-08" and today.
function daysSince(dateText, today) {
  return Math.floor((today.getTime() - new Date(dateText).getTime()) / DAY_MS);
}

function checkNewDomains(intel, today = new Date()) {
  const young = [];
  for (const item of intel) {
    if (!item.registeredOn) continue;
    const days = daysSince(item.registeredOn, today);
    if (days >= 0 && days < NEW_DOMAIN_DAYS) young.push(item.domain + " (" + days + " days old)");
  }
  if (young.length === 0) return [];
  return [finding("new_domain", 20, "Domain was registered very recently", "Registered in the last " + NEW_DOMAIN_DAYS + " days: " + young.join(", "))];
}

// A public website never points into a private network. If it does, something is off.
function checkPrivateIps(intel) {
  const odd = [];
  for (const item of intel) {
    for (const ip of item.ips || []) {
      if (isPrivateIp(ip)) odd.push(item.domain + " -> " + ip);
    }
  }
  if (odd.length === 0) return [];
  return [finding("private_ip", 10, "Domain points into a private network", odd.join(", "))];
}

module.exports = { checkNewDomains, checkPrivateIps, daysSince };
