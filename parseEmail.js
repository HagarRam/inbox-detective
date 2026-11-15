// parseEmail.js
// Turns a raw email (.eml text) into a small, clean object.
// This is the only place that deals with the raw email format.
// The analyzers only ever see the clean object.
//
// Security: the email is untrusted. We only READ it.
// Attachments are never opened: we keep name, type, size and a SHA-256
// fingerprint of the bytes (hashing reads bytes, it does not run them).

const crypto = require("crypto");
const { simpleParser } = require("mailparser");
const { parseAuthResults } = require("./authResults");
const { extractHtmlLinks, extractTextLinks } = require("./extractLinks");

// "a@b.com" -> "b.com"
function domainOf(address) {
  if (!address || !address.includes("@")) return null;
  return address.split("@").pop().toLowerCase().trim();
}

// mailparser gives addresses as { value: [{ name, address }] }.
// We turn that into a simple list of { name, address, domain }.
function cleanAddressList(field) {
  const list = [];
  if (!field || !field.value) return list;
  for (const item of field.value) {
    if (!item.address) continue;
    const address = item.address.toLowerCase().trim();
    list.push({ name: (item.name || "").trim(), address, domain: domainOf(address) });
  }
  return list;
}

// Return-Path looks like "<bounce@x.com>". Remove the < > and keep the address.
function parseReturnPath(value) {
  if (!value) return null;
  const text = typeof value === "string" ? value : value.text || "";
  const address = text.replace("<", "").replace(">", "").trim().toLowerCase();
  if (!address.includes("@")) return null;
  return { address, domain: domainOf(address) };
}

// Describe an attachment WITHOUT opening it.
function describeAttachment(attachment) {
  return {
    filename: attachment.filename || "(no name)",
    contentType: attachment.contentType || "unknown",
    size: attachment.size || 0,
    sha256: crypto.createHash("sha256").update(attachment.content).digest("hex"),
  };
}

async function parseEmail(raw) {
  const mail = await simpleParser(raw);
  const html = typeof mail.html === "string" ? mail.html : "";
  const text = mail.text || "";

  // If there is HTML, take its real links. Otherwise look for bare URLs in the text.
  let links;
  if (html) links = extractHtmlLinks(html);
  else links = extractTextLinks(text);

  const attachments = [];
  for (const attachment of mail.attachments || []) {
    attachments.push(describeAttachment(attachment));
  }

  const fromList = cleanAddressList(mail.from);
  return {
    from: fromList.length > 0 ? fromList[0] : null,
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

module.exports = { parseEmail, domainOf };
