// domainCheck.js
// Safety checks for the network lookups. Domains come from the email,
// so they are attacker-controlled. We check them BEFORE using them in a lookup.

// One part of a domain ("paypal" in "paypal.com"): 1-63 letters, digits or "-",
// and it may not start or end with "-".
function isValidLabel(label) {
  if (label.length < 1 || label.length > 63) return false;
  if (label.startsWith("-") || label.endsWith("-")) return false;
  return /^[a-z0-9-]+$/.test(label); // only a-z, 0-9 and "-"
}

// A normal domain like "paypal-account-review.example": at least two parts,
// every part valid, and the last part (the ending, e.g. "com") only letters.
// This blocks things like "evil.com/../x", "evil.com:8080" or "192.0.2.1".
function isValidDomain(domain) {
  if (typeof domain !== "string" || domain.length > 253) return false;
  const labels = domain.split(".");
  if (labels.length < 2) return false;
  for (const label of labels) {
    if (!isValidLabel(label)) return false;
  }
  return /^[a-z]{2,63}$/.test(labels[labels.length - 1]); // ending: letters only
}

// Private, loopback and link-local IPv4 ranges: addresses inside a home or
// company network, or the machine itself. A public website never uses them.
function isPrivateIPv4(ip) {
  const parts = ip.split(".").map(Number);
  if (parts.length !== 4 || parts.some((n) => Number.isNaN(n))) return false;
  const [a, b] = parts;
  if (a === 10 || a === 127 || a === 0) return true; // private, loopback, "this network"
  if (a === 169 && b === 254) return true; // link-local (also cloud metadata servers)
  if (a === 172 && b >= 16 && b <= 31) return true; // private
  if (a === 192 && b === 168) return true; // private
  if (a === 100 && b >= 64 && b <= 127) return true; // carrier-grade NAT
  return false;
}

// The same idea for IPv6: loopback (::1), private (fc00::/7), link-local (fe80::/10).
function isPrivateIPv6(ip) {
  const lower = ip.toLowerCase();
  if (lower === "::1" || lower === "::") return true;
  if (lower.startsWith("fc") || lower.startsWith("fd")) return true;
  if (lower.startsWith("fe8") || lower.startsWith("fe9") || lower.startsWith("fea") || lower.startsWith("feb")) return true;
  return false;
}

function isPrivateIp(ip) {
  if (ip.includes(":")) return isPrivateIPv6(ip);
  return isPrivateIPv4(ip);
}

module.exports = { isValidDomain, isPrivateIp };
