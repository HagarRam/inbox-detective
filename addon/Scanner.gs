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
function startScan(ids) {
  saveQueue({ ids: ids, total: ids.length });
  return scanNextInQueue();
}

// Scan the next 5 emails of the queue and remember each result for its row.
// Returns { scanned, total, left, error }: error is the last problem, or "".
function scanNextInQueue() {
  const queue = getQueue();
  const now = queue.ids.splice(0, EMAILS_PER_CLICK); // take the first 5 out of the queue
  let error = "";
  for (const id of now) {
    const scan = scanOneEmail(id);
    if (scan.error) error = scan.error;
    else saveChip(id, scan.result);
  }
  saveQueue(queue);
  return { scanned: queue.total - queue.ids.length, total: queue.total, left: queue.ids.length, error: error };
}

// The pop-up message after a click, e.g. "Scanned 5 of 12. Click Continue scan for the next 5."
function progressText(progress) {
  if (progress.error) return friendlyError(progress.error);
  if (progress.left === 0) return "Scanned " + progress.total + (progress.total === 1 ? " email." : " emails.");
  const next = Math.min(EMAILS_PER_CLICK, progress.left);
  return "Scanned " + progress.scanned + " of " + progress.total + ". Click Continue scan for the next " + next + ".";
}
