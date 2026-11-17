// linkMismatch.js
// Catches a link whose visible text is one address, but which really
// goes to another one. Example: shows "mybank.com", goes to "evil.example".

const { finding } = require("./finding");
const { parseUrl, normalizeHost, addOnce } = require("./urlHelpers");

// Does the visible text look like a web address? ("Click here" does not.)
// "name@gmail.com" is an email address, not a web address, so it does not count.
function textLooksLikeAddress(text) {
  return text.includes(".") && !text.includes(" ") && !text.includes("@");
}

// Only real web links (http/https) can "go" to a website.
// mailto: and tel: links have no website, so we skip them.
function isWebUrl(url) {
  return url.protocol === "http:" || url.protocol === "https:";
}

function checkLinkMismatch(email) {
  const problems = [];
  for (const link of email.links) {
    const shownText = link.text.trim();
    if (!textLooksLikeAddress(shownText)) continue;

    // "mybank.com/secure" has no "https://", so we add it to be able to read it.
    let fullText = shownText;
    if (!fullText.startsWith("http://") && !fullText.startsWith("https://")) {
      fullText = "https://" + fullText;
    }
    const shown = parseUrl(fullText);
    const real = parseUrl(link.href);
    if (!shown || !real || !isWebUrl(real)) continue;

    if (normalizeHost(shown.hostname) !== normalizeHost(real.hostname)) {
      addOnce(problems, "shows " + shown.hostname + " but goes to " + real.hostname);
    }
  }
  if (problems.length === 0) return [];
  return [finding("link_mismatch", 30, "Link text does not match its real destination", problems.join("; "))];
}

module.exports = { checkLinkMismatch };
