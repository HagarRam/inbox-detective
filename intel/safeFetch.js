// safeFetch.js
// The ONLY way the server fetches web pages for the intel lookups.
//
// SSRF protection ("Server-Side Request Forgery"): an attacker could try to make
// our server call addresses inside our own network (for example 127.0.0.1 or
// 169.254.169.254, the cloud "metadata" server that holds secrets). So:
// - https only
// - before each request, the host must resolve to PUBLIC addresses only
// - redirects are followed by hand, at most 3, and each one is checked again
// - every request has a time limit, and the answer has a size limit

const dns = require("dns").promises;
const { isPrivateIp } = require("./domainCheck");

const TIMEOUT_MS = 8000;
const MAX_REDIRECTS = 3;
const MAX_BYTES = 2 * 1024 * 1024; // 2 MB

// Throws if the URL is not https or its host points into a private network.
async function assertSafeUrl(url) {
  if (url.protocol !== "https:") throw new Error("Only https is allowed");
  const addresses = await dns.lookup(url.hostname, { all: true });
  for (const entry of addresses) {
    if (isPrivateIp(entry.address)) throw new Error("Blocked private address");
  }
}

// Read the body, but stop if it is bigger than MAX_BYTES.
async function readLimited(response) {
  const chunks = [];
  let total = 0;
  for await (const chunk of response.body) {
    total += chunk.length;
    if (total > MAX_BYTES) throw new Error("Answer too large");
    chunks.push(chunk);
  }
  return Buffer.concat(chunks).toString("utf8");
}

// GET a URL and return the parsed JSON. Follows up to MAX_REDIRECTS safe redirects.
async function fetchJson(address) {
  let url = new URL(address);
  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    await assertSafeUrl(url);
    const response = await fetch(url, {
      redirect: "manual", // we follow redirects ourselves, so we can check them
      signal: AbortSignal.timeout(TIMEOUT_MS),
      // Some services block the default "node" name, so we send a plain tool name.
      headers: { Accept: "application/json, application/rdap+json", "User-Agent": "inbox-detective-intel/1.0" },
    });
    const next = response.headers.get("location");
    if (response.status >= 300 && response.status < 400 && next) {
      url = new URL(next, url); // the redirect target, checked on the next loop
      continue;
    }
    if (!response.ok) throw new Error("Answered " + response.status);
    return JSON.parse(await readLimited(response));
  }
  throw new Error("Too many redirects");
}

module.exports = { fetchJson };
