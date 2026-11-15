// MailboxScan.gs
// Scans the whole mailbox for the dashboard, in chunks of 50 emails per click.
//
// Privacy: we send ONLY the headers (sender, subject, date, authentication
// results...), never the body. The server keeps only a short summary.
// Where we stopped is saved in User Properties, so the next click continues there.

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

// Scan the next chunk. Returns { scanned, total, done }.
function scanNextChunk() {
  const props = PropertiesService.getUserProperties();
  const chunk = listNextChunk(props.getProperty("SCAN_PAGE_TOKEN"));
  let total = Number(props.getProperty("SCAN_COUNT") || 0);
  if (chunk.ids.length > 0) {
    const answer = postToBackend("/scan-batch", { emails: getHeadersOfMany(chunk.ids) });
    total = answer.total;
  }
  if (chunk.nextPageToken) {
    props.setProperty("SCAN_PAGE_TOKEN", chunk.nextPageToken);
  } else {
    props.deleteProperty("SCAN_PAGE_TOKEN"); // finished: the next click starts again from the newest
  }
  props.setProperty("SCAN_COUNT", String(total));
  return { scanned: chunk.ids.length, total: total, done: !chunk.nextPageToken };
}
