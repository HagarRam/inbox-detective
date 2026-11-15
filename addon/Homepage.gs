// Homepage.gs
// The add-on "home screen": shown when NO email is open (the user is in the list).
// It has one button that scans the emails the user marked with the label "Scan".

function onHomepage(e) {
  const howTo = CardService.newTextParagraph().setText(
    "Check emails <b>without opening them</b>:<br>" +
      "1. In the list, tick emails and add the label <b>Scan</b>.<br>" +
      "2. Click the button below.<br>" +
      "Each email gets a label: 🔴 Malicious, 🟠 Suspicious or 🟢 Safe."
  );
  const button = CardService.newTextButton()
    .setText("Scan marked emails")
    .setOnClickAction(CardService.newAction().setFunctionName("onScanClick"));

  const section = CardService.newCardSection().addWidget(howTo).addWidget(button);
  return CardService.newCardBuilder()
    .setHeader(CardService.newCardHeader().setTitle("Inbox Detective"))
    .addSection(section)
    .build();
}

// Runs when the button is clicked. Scans, then shows a small pop-up message.
function onScanClick(e) {
  let message;
  try {
    message = describeScan(scanMarkedEmails());
  } catch (err) {
    console.error(err);
    message = "Scan failed: " + err.message;
  }
  return CardService.newActionResponseBuilder()
    .setNotification(CardService.newNotification().setText(message))
    .build();
}

// Turns the scan summary into one short sentence for the pop-up.
function describeScan(summary) {
  if (summary.scanned === 0 && summary.failed === 0) {
    return "No emails with the label Scan. Tick emails in the list and add the label Scan first.";
  }
  let text = "Scanned " + summary.scanned + " emails.";
  for (const label in summary.counts) {
    text += " " + label + ": " + summary.counts[label] + ".";
  }
  if (summary.failed > 0) text += " " + summary.failed + " failed.";
  if (summary.waiting > 0) {
    text += " " + summary.waiting + " marked emails are still waiting. Click again.";
  } else {
    text += " No more marked emails.";
  }
  return text;
}
