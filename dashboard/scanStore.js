// scanStore.js
// Keeps the results of the mailbox scan, for the dashboard.
//
// Privacy: we keep ONLY metadata (sender, subject, date, score, finding titles,
// domain intel). Never the email body. The file lives in data/ (not in Git).

const fs = require("fs");
const path = require("path");

const FILE = path.join(__dirname, "..", "data", "scan-records.json");

// Only the fields the dashboard needs. Everything else is dropped.
function toRecord(id, result) {
  const findings = [];
  for (const f of result.findings) {
    findings.push({ id: f.id, title: f.title, points: f.points });
  }
  return { id, date: result.date, subject: result.subject, from: result.from, score: result.score, verdict: result.verdict, findings, intel: result.intel };
}

function readAll() {
  if (!fs.existsSync(FILE)) return [];
  return JSON.parse(fs.readFileSync(FILE, "utf8"));
}

// Add new records; a record with the same id replaces the old one.
function saveRecords(newRecords) {
  const byId = new Map();
  for (const record of readAll()) byId.set(record.id, record);
  for (const record of newRecords) byId.set(record.id, record);
  fs.mkdirSync(path.dirname(FILE), { recursive: true });
  fs.writeFileSync(FILE, JSON.stringify([...byId.values()]));
  return byId.size;
}

module.exports = { toRecord, readAll, saveRecords };
