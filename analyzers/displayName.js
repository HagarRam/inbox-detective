// displayName.js
// Catches a sender NAME that says "PayPal" while the address is not PayPal's.
// Many phone mail apps show only the name, so this trick works well for attackers.

const { finding } = require("./finding");
const { BRANDS, isOfficialDomain } = require("../brands");

function checkDisplayNameSpoof(email) {
  if (!email.from) return [];
  // "PayPal Service" -> "paypalservice", so "Pay Pal" is caught too.
  const name = email.from.name.toLowerCase().split(" ").join("");

  for (const brand of Object.keys(BRANDS)) {
    if (name.includes(brand) && !isOfficialDomain(brand, email.from.domain)) {
      return [finding("display_name_spoof", 25, "Pretends to be " + brand,
        'The sender name says "' + email.from.name + '", but the email comes from ' +
        email.from.domain + ", which is not a " + brand + " domain.")];
    }
  }
  return [];
}

module.exports = { checkDisplayNameSpoof };
