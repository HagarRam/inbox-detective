// urlHelpers.js
// Small helpers shared by the link checks.

// Turn text into a URL object. A broken URL gives null instead of crashing.
function parseUrl(text) {
  try {
    return new URL(text);
  } catch (err) {
    return null;
  }
}

// "WWW.PayPal.com" and "paypal.com" should count as the same site.
function normalizeHost(host) {
  let clean = host.toLowerCase();
  if (clean.startsWith("www.")) clean = clean.slice(4);
  return clean;
}

// All web links (http/https) in the email, as URL objects.
// mailto:, tel: and broken links are skipped.
function getWebUrls(email) {
  const urls = [];
  for (const link of email.links) {
    const url = parseUrl(link.href);
    if (url && (url.protocol === "http:" || url.protocol === "https:")) {
      urls.push(url);
    }
  }
  return urls;
}

// Add an item to a list only if it is not there yet (no duplicates).
function addOnce(list, item) {
  if (!list.includes(item)) list.push(item);
}

module.exports = { parseUrl, normalizeHost, getWebUrls, addOnce };
