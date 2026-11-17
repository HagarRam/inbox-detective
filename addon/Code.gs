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
    const message = getOpenedMessage(e);
    // The scan saved its results under the Gmail API id. Gmail may give the event id in
    // another form, so we ask the message for its own id and use that for both lookups.
    const id = message.getId();
    console.log("Opened email: event id " + e.gmail.messageId + ", message id " + id);
    const result = callBackend(message.getRawContent(), id);
    // Was this email checked BEFORE it was opened, with a bad result? Then warn first.
    const preOpen = getChips()[id];
    return buildResultCard(result, isFlagged(preOpen) ? preOpen : null);
  } catch (err) {
    // Log the details for us; show the user only a short, safe message.
    console.error(err);
    return buildErrorCard(err.message);
  }
}

// The opened email. Gmail gives a short-lived access token that works ONLY for this
// one email, so this part cannot read the rest of the mailbox (least privilege).
function getOpenedMessage(e) {
  GmailApp.setCurrentMessageAccessToken(e.gmail.accessToken);
  return GmailApp.getMessageById(e.gmail.messageId);
}
