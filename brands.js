// brands.js
// A small list of brands that attackers often pretend to be,
// with the real domains each brand actually sends email from.
// Used to catch "PayPal" in the display name coming from a random domain,
// and look-alike domains such as "paypal-secure-login.com".
// This list is short on purpose: easy to read, easy to extend.

const BRANDS = {
  paypal: ["paypal.com"],
  microsoft: ["microsoft.com", "office.com", "outlook.com", "live.com"],
  office365: ["microsoft.com", "office.com"],
  google: ["google.com", "gmail.com", "youtube.com"],
  apple: ["apple.com", "icloud.com"],
  amazon: ["amazon.com", "amazon.co.uk", "amazon.de"],
  netflix: ["netflix.com"],
  dhl: ["dhl.com"],
  fedex: ["fedex.com"],
  facebook: ["facebook.com", "facebookmail.com", "meta.com"],
  instagram: ["instagram.com", "mail.instagram.com"],
  linkedin: ["linkedin.com"],
  docusign: ["docusign.com", "docusign.net"],
  dropbox: ["dropbox.com"],
};

// True if "domain" is the brand's real domain or a subdomain of it
// (mail.paypal.com is fine, paypal.com.evil.io is NOT).
function isOfficialDomain(brand, domain) {
  if (!domain) return false;
  return BRANDS[brand].some((d) => domain === d || domain.endsWith("." + d));
}

module.exports = { BRANDS, isOfficialDomain };
