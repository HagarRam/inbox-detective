// Scanner.gs
// The "pre-open scanner": checks emails BEFORE the user opens them.
//
// How the user uses it:
//   1. In the Gmail list, tick emails (do NOT open them) and give them the label "Scan".
//   2. In the add-on home screen, click "Scan marked emails".
//   3. Each email gets a verdict label (🔴 / 🟠 / 🟢) and loses the "Scan" label.
//
// Why: opening an email can already leak information (for example a tracking
// pixel tells the sender "this address is alive"). Here the email is read only
// as raw text, through the Gmail API, and is never shown. It also stays unread.

const SCAN_LABEL = "Scan";

// Google gives one button click only 30 seconds, so we scan a few emails per click.
const EMAILS_PER_CLICK = 5;

// Backend verdict -> label the user sees in the Gmail list.
const VERDICT_LABELS = {
  "likely safe": "🟢 Safe",
  suspicious: "🟠 Suspicious",
  malicious: "🔴 Malicious",
};

// Scans up to EMAILS_PER_CLICK marked emails and returns a short summary:
// { scanned, failed, waiting, counts: { "🔴 Malicious": 1, ... } }
function scanMarkedEmails() {
  const names = [SCAN_LABEL, "🟢 Safe", "🟠 Suspicious", "🔴 Malicious"];
  const labelIds = getLabelIds(names); // also creates the labels the first time
  const messages = listMessagesWithLabel(labelIds[SCAN_LABEL], EMAILS_PER_CLICK);

  const summary = { scanned: 0, failed: 0, waiting: 0, counts: {} };
  for (const message of messages) {
    const verdictLabel = scanOneEmail(message.id, labelIds);
    if (verdictLabel) {
      summary.scanned++;
      summary.counts[verdictLabel] = (summary.counts[verdictLabel] || 0) + 1;
    } else {
      summary.failed++;
    }
  }
  // Emails that still have "Scan": more marked emails, or ones that failed.
  summary.waiting = listMessagesWithLabel(labelIds[SCAN_LABEL], 100).length;
  return summary;
}

// Scan one email and label it. Returns the verdict label, or null if it failed.
// On failure the email keeps "Scan", so the next click tries again.
function scanOneEmail(messageId, labelIds) {
  try {
    const raw = getRawEmail(messageId);
    const result = callBackend(raw);
    const verdictLabel = VERDICT_LABELS[result.verdict];
    changeLabels(messageId, labelIds[verdictLabel], labelIds[SCAN_LABEL]);
    return verdictLabel;
  } catch (err) {
    console.error("Could not scan " + messageId + ": " + err.message);
    return null;
  }
}
