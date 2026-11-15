// Scanner.gs
// The "pre-open scanner": checks emails BEFORE the user opens them.
//
// How to use it:
//   1. In the Gmail list, tick an email (do NOT open it) and give it the label "Scan".
//   2. Every few minutes a time trigger runs scanLabeledEmails().
//   3. The email gets a verdict label (🔴 / 🟠 / 🟢) and loses the "Scan" label.
//
// Why: opening an email can already leak information (for example a tracking
// pixel tells the sender "this address is alive"). Here the email is read only
// as raw text, through the Gmail API, and is never shown. It also stays unread.

const SCAN_LABEL = "Scan";

// Backend verdict -> label the user sees in the Gmail list.
const VERDICT_LABELS = {
  "likely safe": "🟢 Safe",
  suspicious: "🟠 Suspicious",
  malicious: "🔴 Malicious",
};

// Run by the time trigger (and once by hand, to create the labels and authorize).
function scanLabeledEmails() {
  const names = [SCAN_LABEL, "🟢 Safe", "🟠 Suspicious", "🔴 Malicious"];
  const labelIds = getLabelIds(names);
  const messages = listMessagesWithLabel(labelIds[SCAN_LABEL]);
  console.log("Emails waiting for a scan: " + messages.length);
  for (const message of messages) {
    scanOneEmail(message.id, labelIds);
  }
}

// Scan one email. If it fails, keep the "Scan" label so the next run tries again.
function scanOneEmail(messageId, labelIds) {
  try {
    const raw = getRawEmail(messageId);
    const result = callBackend(raw);
    const verdictLabel = VERDICT_LABELS[result.verdict];
    changeLabels(messageId, labelIds[verdictLabel], labelIds[SCAN_LABEL]);
    console.log(messageId + " -> " + result.score + "/100 " + result.verdict);
  } catch (err) {
    console.error("Could not scan " + messageId + ": " + err.message);
  }
}
