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

// The ids of the newest emails in the inbox.
function listInboxIds(max) {
  const result = gmailGet("/messages?labelIds=INBOX&maxResults=" + max);
  const ids = [];
  for (const message of result.messages || []) {
    ids.push(message.id);
  }
  return ids;
}

// Only the From and Subject of an email (no body), for the list on the home screen.
function getFromAndSubject(messageId) {
  const path = "/messages/" + messageId + "?format=metadata&metadataHeaders=From&metadataHeaders=Subject";
  const headers = gmailGet(path).payload.headers || [];
  const email = { id: messageId, from: "(unknown sender)", subject: "(no subject)" };
  for (const header of headers) {
    if (header.name === "From") email.from = header.value;
    if (header.name === "Subject") email.subject = header.value;
  }
  return email;
}

// The full email as raw .eml text. Reading it this way does not mark it as read.
function getRawEmail(messageId) {
  const message = gmailGet("/messages/" + messageId + "?format=raw");
  // Gmail sends the email in "base64url" form; turn it back into normal text.
  const bytes = Utilities.base64DecodeWebSafe(message.raw);
  return Utilities.newBlob(bytes).getDataAsString();
}
