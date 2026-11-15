// GmailApi.gs
// Small helpers that talk to the Gmail API directly.
//
// Why not the simpler GmailApp service? GmailApp needs FULL access to the
// mailbox (the https://mail.google.com/ scope, which can even delete mail
// forever). The Gmail API lets us ask only for "gmail.modify":
// read emails and change labels. Least privilege.

const GMAIL_API = "https://gmail.googleapis.com/gmail/v1/users/me";

// One request to the Gmail API, signed with the user's own login token.
function gmailRequest(method, path, body) {
  const options = {
    method: method,
    headers: { Authorization: "Bearer " + ScriptApp.getOAuthToken() },
    muteHttpExceptions: true,
  };
  if (body) {
    options.contentType = "application/json";
    options.payload = JSON.stringify(body);
  }
  const response = UrlFetchApp.fetch(GMAIL_API + path, options);
  if (response.getResponseCode() >= 300) {
    throw new Error("Gmail API answered " + response.getResponseCode());
  }
  return JSON.parse(response.getContentText() || "{}");
}

// Returns { labelName: labelId } for the given names. Creates missing labels.
function getLabelIds(names) {
  const ids = {};
  const existing = gmailRequest("get", "/labels").labels || [];
  for (const label of existing) {
    ids[label.name] = label.id;
  }
  for (const name of names) {
    if (!ids[name]) {
      ids[name] = gmailRequest("post", "/labels", { name: name }).id;
    }
  }
  return ids;
}

// The emails that carry a label (at most "max" of them).
function listMessagesWithLabel(labelId, max) {
  const result = gmailRequest("get", "/messages?maxResults=" + max + "&labelIds=" + labelId);
  return result.messages || [];
}

// The full email as raw .eml text. Reading it this way does not mark it as read.
function getRawEmail(messageId) {
  const message = gmailRequest("get", "/messages/" + messageId + "?format=raw");
  // Gmail sends the email in "base64url" form; turn it back into normal text.
  const bytes = Utilities.base64DecodeWebSafe(message.raw);
  return Utilities.newBlob(bytes).getDataAsString();
}

// Add one label and remove another, in one request.
function changeLabels(messageId, addLabelId, removeLabelId) {
  const body = { addLabelIds: [addLabelId], removeLabelIds: [removeLabelId] };
  gmailRequest("post", "/messages/" + messageId + "/modify", body);
}
