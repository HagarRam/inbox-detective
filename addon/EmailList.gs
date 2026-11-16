// EmailList.gs
// The list of emails on the home screen: one page of 25 unread inbox emails (or a search).
// For each email we read only From, Subject, the date and "unread". Never the body.

const PAGE_SIZE = 25;

// The Gmail search for the list: unread inbox emails, plus the user's own search text,
// e.g. "in:inbox is:unread from:paypal". Opened emails do not need a check before opening.
function listQuery(state) {
  return "in:inbox is:unread" + (state.query ? " " + state.query : "");
}

// One page of email ids for a Gmail search. pageToken points to the page ("" = the first).
function listPage(query, pageToken, max) {
  let path = "/messages?maxResults=" + max + "&q=" + encodeURIComponent(query);
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
