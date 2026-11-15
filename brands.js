// brands.js
// A short list of brands that attackers often pretend to be,
// with the real domains each brand sends email from.
// Short on purpose: easy to read, easy to extend.

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
  linkedin: ["linkedin.com"],
  docusign: ["docusign.com", "docusign.net"],
  dropbox: ["dropbox.com"],
  github: ["github.com"],
};

// True if the domain is the brand's real domain, or a subdomain of it.
// "mail.paypal.com" -> true.  "paypal.com.evil.io" -> false.
function isOfficialDomain(brand, domain) {
  if (!domain) return false;
  for (const real of BRANDS[brand]) {
    if (domain === real || domain.endsWith("." + real)) return true;
  }
  return false;
}

module.exports = { BRANDS, isOfficialDomain };
