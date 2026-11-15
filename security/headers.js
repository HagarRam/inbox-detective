// headers.js
// Safe defaults for every answer the server sends.

function securityHeaders(req, res, next) {
  res.set("X-Content-Type-Options", "nosniff"); // browsers must not guess file types
  res.set("X-Frame-Options", "DENY"); // no other site may show us inside a frame
  res.set("Referrer-Policy", "no-referrer"); // never leak our addresses (or tokens) to other sites
  next();
}

// Last stop for any error: log it for us, send nothing internal to the caller.
// (Without this, Express may send the error details, e.g. for broken JSON.)
function errorHandler(err, req, res, next) {
  const status = err.status && err.status < 500 ? err.status : 500;
  if (status === 500) console.error("Unexpected error:", err.message);
  res.status(status).json({ error: status === 500 ? "Internal error" : "Bad request" });
}

module.exports = { securityHeaders, errorHandler };
