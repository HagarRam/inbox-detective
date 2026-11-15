// parseEmail.js
// Turns a raw email (.eml text) into a small, clean object that the
// analyzers can work with. This is the ONLY file that knows how emails
// are formatted. The analyzers never see raw MIME.
//
// Security notes:
// - The email is untrusted. We only READ it, we never run anything from it.
// - Attachments are never opened. We keep name, type, size and a SHA-256
//   hash of the bytes (hashing reads bytes, it does not execute them).

const crypto = require("crypto");
const { simpleParser } = require("mailparser");
const { Parser } = require("htmlparser2");

// Gmail's own server name in Authentication-Results.
// We only trust results that Gmail itself added, because anyone can
// write a fake "spf=pass" header into the email before sending it.
const TRUSTED_AUTH_SERVER = "mx.google.com";

// Get the domain part of an email address ("a@b.com" -> "b.com").
function domainOf(address) {
  if (!address || !address.includes("@")) return null;
  return address.split("@").pop().toLowerCase().trim();
}

// mailparser gives addresses as { value: [{ name, address }] }.
// We turn that into a simple list of { name, address, domain }.
function cleanAddressList(field) {
  if (!field || !field.value) return [];
  return field.value
    .filter((a) => a.address)
    .map((a) => ({
      name: (a.name || "").trim(),
      address: a.address.toLowerCase().trim(),
      domain: domainOf(a.address),
    }));
}

// Return-Path looks like "<bounce@x.com>". Take out the address.
function parseReturnPath(value) {
  if (!value) return null;
  const text = typeof value === "string" ? value : value.text || "";
  const match = text.match(/<?([^<>\s]+@[^<>\s]+)>?/);
  if (!match) return null;
  return { address: match[1].toLowerCase(), domain: domainOf(match[1]) };
}

// Read SPF / DKIM / DMARC results, but only from the header Gmail added.
// headerLines keeps headers in their original order (top = newest).
// Gmail adds its header at the top, so we take the FIRST trusted one.
function parseAuthResults(headerLines) {
  const result = { spf: "none", dkim: "none", dmarc: "none", trusted: false };

  const trustedLine = headerLines
    .filter((h) => h.key === "authentication-results")
    .map((h) => h.line.replace(/^authentication-results:\s*/i, ""))
    .find((value) => value.trim().toLowerCase().startsWith(TRUSTED_AUTH_SERVER));

  if (!trustedLine) return result; // no header from Gmail: we know nothing

  result.trusted = true;
  for (const check of ["spf", "dkim", "dmarc"]) {
    const match = trustedLine.match(new RegExp(`\\b${check}=(\\w+)`, "i"));
    if (match) result[check] = match[1].toLowerCase();
  }
  return result;
}

// Find every <a href="...">text</a> in the HTML body.
// We use a real HTML parser (not a regex) because attackers write
// messy HTML on purpose to confuse simple pattern matching.
function extractHtmlLinks(html) {
  const links = [];
  let current = null; // the <a> tag we are currently inside

  const parser = new Parser({
    onopentag(name, attrs) {
      if (name === "a" && attrs.href) {
        current = { href: attrs.href.trim(), text: "" };
      }
    },
    ontext(text) {
      if (current) current.text += text;
    },
    onclosetag(name) {
      if (name === "a" && current) {
        current.text = current.text.replace(/\s+/g, " ").trim();
        links.push(current);
        current = null;
      }
    },
  });
  parser.write(html);
  parser.end();
  return links;
}

// Plain-text emails have no <a> tags, so we also look for bare URLs.
function extractTextLinks(text) {
  const urls = text.match(/https?:\/\/[^\s<>"')]+/gi) || [];
  return urls.map((url) => ({ href: url, text: url }));
}

// Main function: raw email in, clean object out.
async function parseEmail(raw) {
  const mail = await simpleParser(raw);

  const html = typeof mail.html === "string" ? mail.html : "";
  const text = mail.text || "";

  // Prefer real HTML links; if the email is plain text, use bare URLs.
  const links = html ? extractHtmlLinks(html) : extractTextLinks(text);

  const attachments = (mail.attachments || []).map((att) => ({
    filename: att.filename || "(no name)",
    contentType: att.contentType || "unknown",
    size: att.size || 0,
    sha256: crypto.createHash("sha256").update(att.content).digest("hex"),
  }));

  return {
    from: cleanAddressList(mail.from)[0] || null,
    replyTo: cleanAddressList(mail.replyTo),
    returnPath: parseReturnPath(mail.headers.get("return-path")),
    subject: mail.subject || "",
    date: mail.date ? mail.date.toISOString() : null,
    auth: parseAuthResults(mail.headerLines),
    text, // readable body text, used by the content checks
    links,
    attachments,
  };
}

module.exports = { parseEmail, extractHtmlLinks, parseAuthResults, domainOf };
