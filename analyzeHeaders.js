// analyzeHeaders.js
// Layer 1 of protection: check an email BEFORE it is opened, from its
// sender headers only. No body, no links, no attachments reach the server.
//
// What we can check from headers: SPF / DKIM / DMARC, From vs Reply-To vs
// Return-Path, display-name spoofing, and passive intel on the From domain.
// What we can NOT check: links, attachments, the text of the email.

const { parseEmail } = require("./parseEmail");
const { analyzeParsed } = require("./analyze");
const { HEADER_CHECKS } = require("./analyzers");
const { getDomainIntel } = require("./intel/provider");

// The only headers we accept. Everything else is dropped.
const HEADER_NAMES = ["From", "Reply-To", "Return-Path", "Authentication-Results", "Received-SPF", "Subject", "Date", "Message-ID"];

// { "from": "...", "Subject": "..." } -> "From: ...\r\nSubject: ..."
// - names are matched without caring about upper/lower case
// - a value must be text; line breaks inside it become spaces, so a value
//   can never add a header of its own (for example a fake Authentication-Results)
function headersToText(headers) {
  // If the same name comes twice ("From" and "from"), the FIRST one wins.
  const byLowerName = {};
  for (const name of Object.keys(headers)) {
    const lower = name.toLowerCase();
    if (!(lower in byLowerName)) byLowerName[lower] = headers[name];
  }

  const lines = [];
  for (const name of HEADER_NAMES) {
    const value = byLowerName[name.toLowerCase()];
    if (typeof value === "string") lines.push(name + ": " + value.replace(/[\r\n]+/g, " "));
  }
  return lines.join("\r\n") + "\r\n\r\n";
}

// Headers in, result out (the same shape as the full analysis, plus mode).
async function analyzeHeaders(headers) {
  const email = await parseEmail(headersToText(headers));
  const intel = [];
  if (email.from) {
    const answer = await getDomainIntel(email.from.domain); // the From domain only
    if (answer) intel.push(answer);
  }
  return { ...analyzeParsed(email, intel, HEADER_CHECKS), mode: "headers-only" };
}

module.exports = { analyzeHeaders, headersToText, HEADER_NAMES };
