// Code.gs
// Entry point of the add-on. Gmail calls onGmailMessageOpen()
// every time the user opens an email (see "contextualTriggers" in appsscript.json).
//
// Flow: get the raw email -> send it to the backend -> show the result in a card.
// The server also adds the result to the dashboard (we send the email id).
// Gmail cannot pop up a window or stop an email from opening. If the pre-open check
// found it Dangerous or Suspicious, the warning is the first thing in the side panel.

function onGmailMessageOpen(e) {
  try {
    const raw = getOpenedEmailRaw(e);
    const result = callBackend(raw, e.gmail.messageId);
    // Was this email checked BEFORE it was opened, with a bad result? Then warn first.
    const preOpen = getChips()[e.gmail.messageId];
    return buildResultCard(result, isFlagged(preOpen) ? preOpen : null);
  } catch (err) {
    // Log the details for us; show the user only a short, safe message.
    console.error(err);
    return buildErrorCard(err.message);
  }
}

// Read the opened email as raw .eml text (headers + body).
// Gmail gives a short-lived access token that works ONLY for this one email,
// so the add-on cannot read the rest of the mailbox (least privilege).
function getOpenedEmailRaw(e) {
  GmailApp.setCurrentMessageAccessToken(e.gmail.accessToken);
  const message = GmailApp.getMessageById(e.gmail.messageId);
  return message.getRawContent();
}
