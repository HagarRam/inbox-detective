// Scanner.gs
// The "pre-open scanner": checks emails BEFORE the user opens them.
//
// Why: opening an email can already leak information (for example a tracking
// pixel tells the sender "this address is alive"). Here we read ONLY the sender
// headers (format=metadata), never the body. Nothing is shown and the email
// stays unread. Opening the email later runs the full check (Code.gs).

// Google gives one button click only 30 seconds, so we scan a few emails per click.
const EMAILS_PER_CLICK = 5;

// Scan one email from its headers only. Returns { id, result } or, if it failed, { id, error }.
function scanOneEmail(messageId) {
  try {
    const headers = getHeadersOnly(messageId);
    const result = postToBackend("/analyze-headers", { headers: headers, id: messageId }); // also added to the dashboard
    return { id: messageId, result: result };
  } catch (err) {
    console.error("Could not scan " + messageId + ": " + err.message);
    return { id: messageId, error: err.message };
  }
}

// Put these emails in the queue and scan the first 5.
// newScan = true: a new scan (the alert starts from zero). false: add to the current scan.
function startScan(ids, newScan) {
  if (newScan) saveLastScan([]);
  saveQueue({ ids: ids });
  return scanNextInQueue();
}

// The short form of one result, for the alert and the Scan overview.
function lastScanEntry(id, result) {
  const from = result.from || {};
  const sender = String(from.name || from.address || "(unknown sender)").slice(0, 40);
  return { id: id, verdict: result.verdict, score: result.score, sender: sender, subject: String(result.subject || "(no subject)").slice(0, 80) };
}

// Scan the next 5 emails of the queue and remember each result.
// Returns { scanned, left, error }: error is the last problem, or "".
function scanNextInQueue() {
  const queue = getQueue();
  const now = queue.ids.splice(0, EMAILS_PER_CLICK); // take the first 5 out of the queue
  const results = getLastScan();
  let error = "";
  for (const id of now) {
    const scan = scanOneEmail(id);
    if (scan.error) {
      error = scan.error;
    } else {
      saveChip(id, scan.result);
      results.push(lastScanEntry(id, scan.result));
    }
  }
  saveLastScan(results);
  saveQueue(queue);
  return { scanned: now.length, left: queue.ids.length, error: error };
}

// The pop-up message after a click, e.g. "Scanned 5 emails. 2 more are ticked: click Scan again."
function progressText(progress) {
  if (progress.error) return friendlyError(progress.error);
  const done = "Scanned " + progress.scanned + (progress.scanned === 1 ? " email." : " emails.");
  if (progress.left === 0) return done;
  return done + " " + progress.left + " more " + (progress.left === 1 ? "is" : "are") + " ticked: click Scan again.";
}
