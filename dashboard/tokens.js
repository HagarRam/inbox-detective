// tokens.js
// How the dashboard is opened safely, without passwords:
// 1. The add-on (which knows the API key) asks the server for a ONE-TIME token.
// 2. The add-on opens  /dashboard?token=...  in the browser.
// 3. The server checks the token, DELETES it (so it works only once), and gives
//    the browser a short session cookie instead. The token is now useless,
//    even if it stays in the browser history.

const crypto = require("crypto");

const TOKEN_MS = 5 * 60 * 1000; // a token must be used within 5 minutes
const SESSION_MS = 30 * 60 * 1000; // a dashboard session lasts 30 minutes

const tokens = new Map(); // token -> expiry time
const sessions = new Map(); // session id -> expiry time

// 32 random bytes: impossible to guess.
function randomId() {
  return crypto.randomBytes(32).toString("hex");
}

function createToken() {
  const token = randomId();
  tokens.set(token, Date.now() + TOKEN_MS);
  return token;
}

// True only once per token, and only before it expires.
function useToken(token) {
  const expires = tokens.get(token);
  tokens.delete(token); // one time only, even if it was expired
  return Boolean(expires) && Date.now() < expires;
}

function createSession() {
  const id = randomId();
  sessions.set(id, Date.now() + SESSION_MS);
  return id;
}

function isValidSession(id) {
  const expires = sessions.get(id);
  if (!expires) return false;
  if (Date.now() > expires) {
    sessions.delete(id);
    return false;
  }
  return true;
}

module.exports = { createToken, useToken, createSession, isValidSession, SESSION_MS };
