// server.js
// The backend. The Gmail add-on will send the raw email here and get
// back a score, a verdict and the findings.
//
// Security in this file:
// - Every /analyze request must carry the shared secret (X-API-Key header).
//   The secret lives in the .env file / environment, never in the code.
// - The request body has a size limit, so nobody can send a huge payload.
// - We never store the email. We analyze it in memory and forget it.

require("dotenv").config();
const crypto = require("crypto");
const express = require("express");
const { analyzeRaw } = require("./analyze");

const app = express();

// Only accept JSON, and at most 5 MB (an email with small attachments).
app.use(express.json({ limit: "5mb" }));

// Compare two secrets in constant time, so an attacker cannot guess the
// secret letter by letter by measuring how long the answer takes.
function safeEqual(a, b) {
  const hashA = crypto.createHash("sha256").update(String(a)).digest();
  const hashB = crypto.createHash("sha256").update(String(b)).digest();
  return crypto.timingSafeEqual(hashA, hashB);
}

// Middleware: stop the request unless it has the correct secret.
function requireApiKey(req, res, next) {
  const secret = process.env.API_SECRET;
  if (!secret) {
    // Fail closed: if the server was started without a secret, refuse everything.
    return res.status(503).json({ error: "Server is not configured" });
  }
  const given = req.get("X-API-Key") || "";
  if (!safeEqual(given, secret)) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  next();
}

// Health check, so we can see the server is up. Reveals nothing.
app.get("/", (req, res) => {
  res.send("Inbox Detective is alive");
});

// Main endpoint: body is { "raw": "<the full .eml text>" }
app.post("/analyze", requireApiKey, async (req, res) => {
  const raw = req.body && req.body.raw;
  if (typeof raw !== "string" || raw.length === 0) {
    return res.status(400).json({ error: "Body must be JSON: { raw: string }" });
  }
  try {
    const result = await analyzeRaw(raw);
    res.json(result);
  } catch (err) {
    // Do not send internal error details back to the caller.
    console.error("Analysis failed:", err.message);
    res.status(500).json({ error: "Could not analyze this email" });
  }
});

// Start listening only when run directly (node server.js),
// not when a test file imports the app.
if (require.main === module) {
  const port = process.env.PORT || 3000;
  app.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
  });
}

module.exports = { app };
