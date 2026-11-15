// attachments.js
// Looks only at the attachment's NAME. We never open or run attachments.

const { finding } = require("./finding");

// File types that can run code or open a fake login page.
const RISKY = ["exe", "scr", "js", "vbs", "bat", "cmd", "ps1", "jar", "msi", "hta", "lnk", "iso", "img", "docm", "xlsm", "pptm", "html", "htm"];
// Harmless-looking types that attackers put in front of a risky one ("invoice.pdf.exe").
const DECOYS = ["pdf", "doc", "docx", "xls", "xlsx", "jpg", "png", "txt", "zip"];

function checkOneAttachment(filename) {
  const parts = filename.toLowerCase().split("."); // "invoice.pdf.exe" -> ["invoice", "pdf", "exe"]
  if (parts.length < 2) return null;
  const last = parts[parts.length - 1];
  const beforeLast = parts.length > 2 ? parts[parts.length - 2] : "";

  if (RISKY.includes(last) && DECOYS.includes(beforeLast)) {
    return finding("attachment_double_ext", 35, "Attachment hides its real type",
      '"' + filename + '" looks like a .' + beforeLast + " but is really a ." + last + " file.");
  }
  if (RISKY.includes(last)) {
    return finding("attachment_risky", 25, "Risky attachment type",
      '"' + filename + '" is a .' + last + " file, which can run code or open a fake page.");
  }
  return null;
}

function checkAttachments(email) {
  const findings = [];
  for (const attachment of email.attachments) {
    const result = checkOneAttachment(attachment.filename);
    if (result) findings.push(result);
  }
  return findings;
}

module.exports = { checkAttachments };
