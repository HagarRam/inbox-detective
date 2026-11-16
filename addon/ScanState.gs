// ScanState.gs
// A small memory between clicks, in User Properties (only this user can see it):
//   LIST_STATE  which list is shown: the search text and the page
//   SCAN_QUEUE  the emails still waiting to be scanned (5 per click)
//   SCAN_CHIPS  the last result of each scanned email, for the tag on its row

const MAX_CHIPS = 100; // one property holds about 9 KB, so we keep only the newest 100

function readJson(key, fallback) {
  const text = PropertiesService.getUserProperties().getProperty(key);
  return text ? JSON.parse(text) : fallback;
}

function saveJson(key, value) {
  PropertiesService.getUserProperties().setProperty(key, JSON.stringify(value));
}

// { query, tokens, page, next }: tokens[page] is Gmail's token for the shown page
// ("" for page 1), next is the token for the page after it.
function getListState() {
  return readJson("LIST_STATE", { query: "", tokens: [""], page: 0, next: "" });
}

function saveListState(state) {
  saveJson("LIST_STATE", state);
}

// { ids: [still to scan], total: how many were asked for }
function getQueue() {
  return readJson("SCAN_QUEUE", { ids: [], total: 0 });
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
