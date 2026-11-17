// liveProvider.js
// "Live" mode: real, passive lookups on the internet for one domain.

const { lookupIps, lookupNameServers, lookupMailServers, lookupAsn } = require("./dnsLookups");
const { lookupRegistration } = require("./rdap");
const { lookupCertificates } = require("./certs");

async function lookupDomain(domain) {
  // Run the independent lookups at the same time, to save waiting time.
  const [ips, nameServers, mailServers, registration, certificates] = await Promise.all([
    lookupIps(domain),
    lookupNameServers(domain),
    lookupMailServers(domain),
    lookupRegistration(domain),
    lookupCertificates(domain),
  ]);
  const network = ips.length > 0 ? await lookupAsn(ips[0]) : null;
  return {
    domain,
    ips,
    asn: network ? network.asn : null,
    provider: network ? network.provider : null,
    nameServers,
    mailServers,
    registrar: registration.registrar,
    registeredOn: registration.registeredOn,
    certificates,
  };
}

module.exports = { lookupDomain };
