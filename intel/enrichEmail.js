// enrichEmail.js
// Email in -> intel about each of its domains out.

const { collectDomains } = require("./collectDomains");
const { getDomainIntel } = require("./provider");

async function enrichEmail(email) {
  const domains = collectDomains(email);
  const answers = await Promise.all(domains.map(getDomainIntel)); // all domains at the same time
  const intel = [];
  for (const answer of answers) {
    if (answer) intel.push(answer);
  }
  return intel;
}

module.exports = { enrichEmail };
