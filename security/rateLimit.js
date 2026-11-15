// rateLimit.js
// Limits how many requests one client can send per minute, so nobody can
// flood the server or try thousands of API keys. Simple "fixed window":
// count requests per client; the count starts again every minute.

const WINDOW_MS = 60 * 1000;

// Who is the client? The server listens only on 127.0.0.1, so every request
// comes through the Cloudflare tunnel, which puts the real visitor's IP in
// the CF-Connecting-IP header. Without the tunnel (local tests) we use req.ip.
function clientKey(req) {
  return req.get("CF-Connecting-IP") || req.ip;
}

function rateLimit(maxPerMinute) {
  const counts = new Map(); // client -> { start, count }
  return function (req, res, next) {
    const key = clientKey(req);
    const now = Date.now();
    let entry = counts.get(key);
    if (!entry || now - entry.start > WINDOW_MS) {
      entry = { start: now, count: 0 }; // a new minute: start counting again
      counts.set(key, entry);
    }
    entry.count++;
    if (entry.count > maxPerMinute) {
      res.set("Retry-After", "60");
      return res.status(429).json({ error: "Too many requests, try again in a minute" });
    }
    next();
  };
}

module.exports = { rateLimit };
