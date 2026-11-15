// routes.js
// The dashboard's web addresses:
//   POST /scan-batch       (API key)  the add-on sends a chunk of email HEADERS
//   POST /dashboard-token  (API key)  the add-on asks for a one-time link
//   GET  /dashboard?token=...         opens the dashboard once, sets a session cookie
//   GET  /dashboard/view   (session)  the page
//   GET  /dashboard/data   (session)  the numbers for the page, as JSON

const path = require("path");
const express = require("express");
const { analyzeRaw } = require("../analyze");
const { toRecord, readAll, saveRecords } = require("./scanStore");
const { buildDashboard } = require("./buildDashboard");
const tokens = require("./tokens");

const MAX_BATCH = 50;
const MAX_HEADER_CHARS = 64 * 1024;
const ID_PATTERN = /^[A-Za-z0-9_-]{1,64}$/; // Gmail ids are letters and digits only

// The page may load scripts, styles and data ONLY from our own server.
// Even if attacker text got into the page, the browser would refuse to run it.
function securityHeaders(req, res, next) {
  res.set("Content-Security-Policy", "default-src 'self'; img-src 'self' data:; frame-ancestors 'none'; base-uri 'none'; form-action 'none'");
  res.set("X-Content-Type-Options", "nosniff");
  res.set("Referrer-Policy", "no-referrer"); // never leak the token to other sites
  res.set("Cache-Control", "no-store");
  next();
}

// Read our session cookie from the "Cookie" header ("a=1; session=abc").
function getSessionId(req) {
  for (const part of (req.get("Cookie") || "").split(";")) {
    const [name, value] = part.trim().split("=");
    if (name === "session") return value;
  }
  return null;
}

function requireSession(req, res, next) {
  if (!tokens.isValidSession(getSessionId(req))) {
    return res.status(401).send("Session expired. Open the dashboard again from the Gmail add-on.");
  }
  next();
}

// Check the batch shape before doing any work.
function validBatch(emails) {
  if (!Array.isArray(emails) || emails.length === 0 || emails.length > MAX_BATCH) return false;
  return emails.every((e) => e && ID_PATTERN.test(e.id) && typeof e.headers === "string" && e.headers.length <= MAX_HEADER_CHARS);
}

async function scanBatch(req, res) {
  const emails = req.body && req.body.emails;
  if (!validBatch(emails)) return res.status(400).json({ error: "Body must be { emails: [{ id, headers }] }, 1-" + MAX_BATCH + " items" });
  try {
    const records = [];
    for (const email of emails) records.push(toRecord(email.id, await analyzeRaw(email.headers)));
    res.json({ saved: records.length, total: saveRecords(records) });
  } catch (err) {
    console.error("Scan batch failed:", err.message);
    res.status(500).json({ error: "Could not scan this batch" });
  }
}

function openDashboard(req, res) {
  if (!tokens.useToken(String(req.query.token || ""))) {
    return res.status(401).send("This link is invalid or was already used. Open the dashboard again from the Gmail add-on.");
  }
  // HttpOnly: page scripts cannot read it. Secure: https only. SameSite=Lax: other sites cannot send it in the background.
  res.cookie("session", tokens.createSession(), { httpOnly: true, secure: true, sameSite: "lax", maxAge: tokens.SESSION_MS });
  res.redirect(303, "/dashboard/view"); // the token disappears from the address bar
}

function dashboardRoutes(requireApiKey) {
  const router = express.Router();
  router.use("/dashboard", securityHeaders);
  router.post("/scan-batch", requireApiKey, scanBatch);
  router.post("/dashboard-token", requireApiKey, (req, res) => res.json({ path: "/dashboard?token=" + tokens.createToken() }));
  router.get("/dashboard", openDashboard);
  router.get("/dashboard/view", requireSession, (req, res) => res.sendFile(path.join(__dirname, "public", "index.html")));
  router.get("/dashboard/data", requireSession, (req, res) => res.json(buildDashboard(readAll())));
  router.use("/dashboard/static", express.static(path.join(__dirname, "public"))); // scripts and styles, no data
  return router;
}

module.exports = { dashboardRoutes };
