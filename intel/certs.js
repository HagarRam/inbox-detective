// certs.js
// Certificate Transparency: every public HTTPS certificate is written in a
// public log. crt.sh lets us search it. Attackers often get a certificate for
// several fake domains at once, so a shared certificate links them together.

const { fetchJson } = require("./safeFetch");

// Keep only a small summary: how many certificates, the IDs of the newest few,
// and who issued them. (A huge site has thousands; that answer is too large.)
async function lookupCertificates(domain) {
  try {
    const list = await fetchJson("https://crt.sh/?output=json&q=" + domain);
    const ids = [];
    const issuers = [];
    for (const cert of list.slice(0, 5)) {
      ids.push(String(cert.id));
      if (!issuers.includes(cert.issuer_name)) issuers.push(cert.issuer_name);
    }
    return { count: list.length, ids, issuers };
  } catch (err) {
    return { count: null, ids: [], issuers: [], note: "not available: " + err.message };
  }
}

module.exports = { lookupCertificates };
