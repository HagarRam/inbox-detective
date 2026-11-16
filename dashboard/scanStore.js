// scanStore.js
// Keeps the results of the mailbox scan, for the dashboard.
//
// Privacy: we keep ONLY metadata (sender, subject, date, score, finding titles,
// domain intel). Never the email body. The file lives in data/ (not in Git).

const fs = require("fs");
const path = require("path");

const FILE = path.join(__dirname, "..", "data", "scan-records.json");
const ID_PATTERN = /^[A-Za-z0-9_-]{1,64}$/; // Gmail ids are letters and digits only

// Only the fields the dashboard needs. Everything else is dropped.
// fullEmail = true when the whole email was checked (not only the headers).
function toRecord(id, result, fullEmail) {
  const findings = [];
  for (const f of result.findings) {
    findings.push({ id: f.id, title: f.title, points: f.points });
  }
  return { id, date: result.date, subject: result.subject, from: result.from, score: result.score, verdict: result.verdict, findings, intel: result.intel, fullEmail: Boolean(fullEmail) };
}

function readAll() {
  if (!fs.existsSync(FILE)) return [];
  return JSON.parse(fs.readFileSync(FILE, "utf8"));
}

// Add new records to the old ones; a record with the same id replaces the old one,
// EXCEPT: a check of the whole email knows more than a headers-only scan,
// so a headers-only record never replaces a whole-email one.
function mergeRecords(oldRecords, newRecords) {
  const byId = new Map();
  for (const record of oldRecords) byId.set(record.id, record);
  for (const record of newRecords) {
    const old = byId.get(record.id);
    if (old && old.fullEmail && !record.fullEmail) continue;
    byId.set(record.id, record);
  }
  return [...byId.values()];
}

// Save new records into the file. Returns how many records the file has now.
function saveRecords(newRecords) {
  const all = mergeRecords(readAll(), newRecords);
  fs.mkdirSync(path.dirname(FILE), { recursive: true });
  fs.writeFileSync(FILE, JSON.stringify(all));
  return all.length;
}

module.exports = { ID_PATTERN, toRecord, mergeRecords, readAll, saveRecords };
