// EmailList.gs
// The list of emails on the home screen: one page of 25, from the inbox or from a search.
// For each email we read only From, Subject, the date and "unread". Never the body.

const PAGE_SIZE = 25;

// One page of email ids. query "" = the inbox; otherwise a Gmail search, e.g. "from:paypal".
// pageToken comes from Gmail and points to the next page ("" = the first page).
function listPage(query, pageToken, max) {
  let path = "/messages?maxResults=" + max;
  if (query) path += "&q=" + encodeURIComponent(query);
  else path += "&labelIds=INBOX";
  if (pageToken) path += "&pageToken=" + encodeURIComponent(pageToken);
  const result = gmailGet(path);
  const ids = [];
  for (const message of result.messages || []) ids.push(message.id);
  return { ids: ids, nextPageToken: result.nextPageToken || "" };
}

// The rows for many emails at once (fetchAll sends the requests in parallel).
function getRows(ids) {
  const token = ScriptApp.getOAuthToken();
  const requests = ids.map(function (id) {
    const url = GMAIL_API + "/messages/" + id + "?format=metadata&metadataHeaders=From&metadataHeaders=Subject";
    return { url: url, headers: { Authorization: "Bearer " + token }, muteHttpExceptions: true };
  });
  const rows = [];
  UrlFetchApp.fetchAll(requests).forEach(function (response, i) {
    if (response.getResponseCode() === 200) rows.push(toRow(ids[i], JSON.parse(response.getContentText())));
  });
  return rows;
}

// Gmail's answer -> { id, sender, subject, date, unread }
function toRow(id, message) {
  const row = { id: id, sender: "(unknown sender)", subject: "(no subject)" };
  for (const header of (message.payload && message.payload.headers) || []) {
    if (header.name === "From") row.sender = senderName(header.value);
    if (header.name === "Subject" && header.value) row.subject = header.value;
  }
  row.date = shortDate(Number(message.internalDate)); // the time Gmail received it
  row.unread = (message.labelIds || []).indexOf("UNREAD") !== -1;
  return row;
}

// '"Bank Security" <alerts@x.example>' -> 'Bank Security'. No name -> the address.
function senderName(from) {
  const start = from.indexOf("<");
  const name = (start > 0 ? from.slice(0, start) : "").trim().replace(/^"|"$/g, ""); // drop the quotes
  if (name) return name;
  return from.replace(/[<>]/g, "").trim();
}

// Today -> "14:05", another day -> "Nov 16". In the time zone of appsscript.json.
function shortDate(milliseconds) {
  if (!milliseconds) return "";
  const date = new Date(milliseconds);
  const zone = Session.getScriptTimeZone();
  const today = Utilities.formatDate(new Date(), zone, "yyyy-MM-dd") === Utilities.formatDate(date, zone, "yyyy-MM-dd");
  return Utilities.formatDate(date, zone, today ? "HH:mm" : "MMM d");
}

// The ids of the emails that arrived today (since midnight), at most 50.
function listTodayIds() {
  const midnight = new Date();
  midnight.setHours(0, 0, 0, 0);
  const seconds = Math.floor(midnight.getTime() / 1000);
  return listPage("in:inbox after:" + seconds, "", 50).ids; // Gmail search understands "after:<seconds>"
}
