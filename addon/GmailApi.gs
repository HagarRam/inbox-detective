// GmailApi.gs
// Small helpers that talk to the Gmail API directly.
//
// Why not the simpler GmailApp service? GmailApp needs FULL access to the
// mailbox (the https://mail.google.com/ scope, which can even delete mail
// forever). The Gmail API lets us ask only for "gmail.readonly":
// the add-on can read emails, but can NOT send, change or delete anything.

const GMAIL_API = "https://gmail.googleapis.com/gmail/v1/users/me";

// One GET request to the Gmail API, signed with the user's own login token.
function gmailGet(path) {
  const response = UrlFetchApp.fetch(GMAIL_API + path, {
    headers: { Authorization: "Bearer " + ScriptApp.getOAuthToken() },
    muteHttpExceptions: true,
  });
  if (response.getResponseCode() >= 300) {
    throw new Error("Gmail API answered " + response.getResponseCode() + ": " + gmailErrorReason(response));
  }
  return JSON.parse(response.getContentText() || "{}");
}

// Google explains every error in { error: { message } }. Show that reason,
// so "403" turns into something like "insufficient authentication scopes".
function gmailErrorReason(response) {
  try {
    return JSON.parse(response.getContentText()).error.message;
  } catch (err) {
    return "no reason given";
  }
}

// Layer 1 (before opening): the only headers the scanner asks Gmail for. No body.
const PRE_OPEN_HEADERS = ["From", "Reply-To", "Return-Path", "Authentication-Results", "Received-SPF", "Subject", "Date", "Message-ID"];

// The sender headers of one email, as { name: value }.
// format=metadata means Gmail sends headers only, never the body.
// Nothing is rendered and the email stays unread.
function getHeadersOnly(messageId) {
  let path = "/messages/" + messageId + "?format=metadata";
  for (const name of PRE_OPEN_HEADERS) {
    path += "&metadataHeaders=" + encodeURIComponent(name);
  }
  return pickHeaders(gmailGet(path).payload.headers || []);
}

// Gmail gives a list of { name, value }, from the TOP of the email down.
// - Names are matched without caring about case ("authentication-results" too).
// - We keep the FIRST one of each name and never overwrite it with a later one:
//   Gmail adds its own headers at the top; lower ones may come from the attacker.
function pickHeaders(list) {
  const headers = {};
  for (const header of list) {
    const name = officialName(header.name);
    if (name && headers[name] === undefined) headers[name] = header.value;
  }
  // Trust Authentication-Results only if the first one is Gmail's own.
  const auth = headers["Authentication-Results"];
  if (auth !== undefined && !auth.trim().toLowerCase().startsWith("mx.google.com")) {
    delete headers["Authentication-Results"]; // the server then says "no authentication result"
  }
  return headers;
}

// "reply-to" -> "Reply-To". A name that is not in our list -> null.
function officialName(name) {
  for (const official of PRE_OPEN_HEADERS) {
    if (official.toLowerCase() === String(name).toLowerCase()) return official;
  }
  return null;
}
