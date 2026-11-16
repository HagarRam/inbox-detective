// ScanState.gs
// A small memory between clicks, in User Properties (only this user can see it):
//   LIST_STATE  which list is shown: the search text and the page
//   PAGE_ROWS   the emails of the shown page (so a tick can redraw without asking Gmail again)
//   SCAN_QUEUE  ticked emails still waiting to be scanned (5 per click)
//   SCAN_CHIPS  the pre-open result of each scanned email: hides it from the list,
//               and warns when that email is opened later
//   LAST_SCAN   the results of the current scan, for the alert and the Scan overview
// One property holds about 9 KB, so every list has a maximum size.

const MAX_CHIPS = 120;
const MAX_LAST_SCAN = 25; // one page

function readJson(key, fallback) {
  const text = PropertiesService.getUserProperties().getProperty(key);
  return text ? JSON.parse(text) : fallback;
}

function saveJson(key, value) {
  PropertiesService.getUserProperties().setProperty(key, JSON.stringify(value));
}

// { query, page, next }: page 0 = the first page; next = "" when this is the last page.
function newListState(query) {
  return { query: query, page: 0, next: "" };
}

function getListState() {
  return readJson("LIST_STATE", newListState(""));
}

function saveListState(state) {
  saveJson("LIST_STATE", state);
}

// [{ id, sender, subject, date }]. Shortened only to fit the storage; Gmail shortens the display.
function savePageRows(rows) {
  saveJson("PAGE_ROWS", rows.map(function (row) {
    return { id: row.id, sender: row.sender.slice(0, 60), subject: row.subject.slice(0, 120), date: row.date };
  }));
}

function getPageRows() {
  return readJson("PAGE_ROWS", []);
}

// { ids: [still to scan] }
function getQueue() {
  return readJson("SCAN_QUEUE", { ids: [] });
}

function saveQueue(queue) {
  saveJson("SCAN_QUEUE", queue);
}

// { "<email id>": { verdict, score } }
function getChips() {
  return readJson("SCAN_CHIPS", {});
}

function saveChip(id, result) {
  const chips = getChips();
  delete chips[id]; // add it again at the end, so it counts as the newest
  chips[id] = { verdict: result.verdict, score: result.score };
  const ids = Object.keys(chips);
  for (let i = 0; i < ids.length - MAX_CHIPS; i++) delete chips[ids[i]]; // forget the oldest
  saveJson("SCAN_CHIPS", chips);
}

// [{ id, verdict, score, sender, subject, top }] of the current scan (top = strongest warning sign).
function getLastScan() {
  return readJson("LAST_SCAN", []);
}

function saveLastScan(results) {
  saveJson("LAST_SCAN", results.slice(-MAX_LAST_SCAN));
}
