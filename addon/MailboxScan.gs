// MailboxScan.gs
// Scans the whole mailbox for the dashboard, in chunks of 50 emails per click.
//
// Privacy: we send ONLY the headers (sender, subject, date, authentication
// results...), never the body. The server keeps only a short summary.
// Where we stopped is saved in User Properties, so the next click continues there.
// Every click first adds the emails that arrived since the last click, so new
// mail reaches the dashboard right away, even in the middle of a long scan.

const CHUNK_SIZE = 50;
const MAX_HEADER_CHARS = 60000; // the server accepts up to 64 KB of headers per email
const SCAN_QUERY = "-in:sent -in:drafts -in:chats"; // received mail only

// One page of email ids, starting where the last click stopped.
function listNextChunk(pageToken) {
  let path = "/messages?maxResults=" + CHUNK_SIZE + "&q=" + encodeURIComponent(SCAN_QUERY);
  if (pageToken) path += "&pageToken=" + encodeURIComponent(pageToken);
  const result = gmailGet(path);
  const ids = (result.messages || []).map(function (m) { return m.id; });
  return { ids: ids, nextPageToken: result.nextPageToken || null };
}

// The ids of emails that arrived after a moment in time (seconds since 1970).
// Gmail search understands "after:<seconds>".
function listNewSince(seconds) {
  const query = SCAN_QUERY + " after:" + seconds;
  const result = gmailGet("/messages?maxResults=" + CHUNK_SIZE + "&q=" + encodeURIComponent(query));
  return (result.messages || []).map(function (m) { return m.id; });
}

// Send the headers of these emails to the server. Returns how many the dashboard has now.
function sendToDashboard(ids) {
  return postToBackend("/scan-batch", { emails: getHeadersOfMany(ids) }).total;
}

// Get the headers of many emails at once (fetchAll runs the requests in parallel).
function getHeadersOfMany(ids) {
  const token = ScriptApp.getOAuthToken();
  const requests = ids.map(function (id) {
    return { url: GMAIL_API + "/messages/" + id + "?format=metadata", headers: { Authorization: "Bearer " + token }, muteHttpExceptions: true };
  });
  const emails = [];
  UrlFetchApp.fetchAll(requests).forEach(function (response, i) {
    if (response.getResponseCode() !== 200) return; // skip one broken email, keep the rest
    const text = headersToText(JSON.parse(response.getContentText()).payload.headers || []);
    if (text.length <= MAX_HEADER_CHARS) emails.push({ id: ids[i], headers: text });
  });
  return emails;
}

// Gmail gives headers as a list of { name, value }; the server wants "Name: value" lines.
function headersToText(headers) {
  return headers.map(function (h) { return h.name + ": " + h.value; }).join("\r\n");
}

// One click. Returns { scanned, total, done, newEmails }.
function scanNextChunk() {
  const props = PropertiesService.getUserProperties();
  const now = Math.floor(Date.now() / 1000);
  const lastClick = props.getProperty("LAST_SCAN_TIME");
  props.setProperty("LAST_SCAN_TIME", String(now));
  let total = Number(props.getProperty("SCAN_COUNT") || 0);

  // 1. New emails since the last click come first.
  if (lastClick) {
    const newIds = listNewSince(lastClick);
    if (newIds.length > 0) {
      total = sendToDashboard(newIds);
      props.setProperty("SCAN_COUNT", String(total));
      return { scanned: newIds.length, total: total, done: false, newEmails: true };
    }
  }

  // 2. Otherwise continue the scan of the whole mailbox where we stopped.
  const chunk = listNextChunk(props.getProperty("SCAN_PAGE_TOKEN"));
  if (chunk.ids.length > 0) total = sendToDashboard(chunk.ids);
  if (chunk.nextPageToken) {
    props.setProperty("SCAN_PAGE_TOKEN", chunk.nextPageToken);
  } else {
    props.deleteProperty("SCAN_PAGE_TOKEN"); // finished: the next click starts again from the newest
  }
  props.setProperty("SCAN_COUNT", String(total));
  return { scanned: chunk.ids.length, total: total, done: !chunk.nextPageToken, newEmails: false };
}
