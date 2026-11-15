// Scanner.gs
// The "pre-open scanner": checks emails BEFORE the user opens them.
//
// Why: opening an email can already leak information (for example a tracking
// pixel tells the sender "this address is alive"). Here the email is read only
// as raw text, through the Gmail API, and is never shown. It also stays unread.

// How many of the newest inbox emails the home screen lists.
const RECENT_EMAILS = 10;

// Google gives one button click only 30 seconds, so we scan a few emails per click.
const EMAILS_PER_CLICK = 5;

// The newest inbox emails, as { id, from, subject }. No body is read here.
function listRecentEmails() {
  const emails = [];
  for (const id of listInboxIds(RECENT_EMAILS)) {
    emails.push(getFromAndSubject(id));
  }
  return emails;
}

// Scan one email. Returns { id, result } or, if it failed, { id, error }.
function scanOneEmail(messageId) {
  try {
    const raw = getRawEmail(messageId);
    return { id: messageId, result: callBackend(raw) };
  } catch (err) {
    console.error("Could not scan " + messageId + ": " + err.message);
    return { id: messageId, error: err.message };
  }
}

// Scan up to EMAILS_PER_CLICK of the given ids.
function scanEmails(ids) {
  const scans = [];
  for (let i = 0; i < ids.length && i < EMAILS_PER_CLICK; i++) {
    scans.push(scanOneEmail(ids[i]));
  }
  return scans;
}
