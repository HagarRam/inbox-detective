// rdap.js
// RDAP is the modern, public "whois": who registered a domain, and when.
// rdap.org forwards us to the right registry for each domain ending.

const { fetchJson } = require("./safeFetch");

// The registration date, e.g. "2007-10-09" (or null if unknown).
function findRegistrationDate(data) {
  for (const event of data.events || []) {
    if (event.eventAction === "registration") return event.eventDate.slice(0, 10);
  }
  return null;
}

// The registrar's name. RDAP keeps it in a "vcard": a list like ["fn", {}, "text", "Name"].
function findRegistrar(data) {
  for (const entity of data.entities || []) {
    if (!(entity.roles || []).includes("registrar")) continue;
    const vcard = entity.vcardArray ? entity.vcardArray[1] : [];
    for (const field of vcard) {
      if (field[0] === "fn") return field[3];
    }
  }
  return null;
}

async function lookupRegistration(domain) {
  try {
    const data = await fetchJson("https://rdap.org/domain/" + domain);
    return { registrar: findRegistrar(data), registeredOn: findRegistrationDate(data) };
  } catch (err) {
    return { registrar: null, registeredOn: null };
  }
}

module.exports = { lookupRegistration };
