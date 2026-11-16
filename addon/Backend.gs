// Backend.gs
// Talks to our server. Every request carries the secret in the X-API-Key header.
//
// The backend address and the secret are kept in Script Properties
// (Project Settings -> Script Properties), never in the code or in Git:
//   BACKEND_URL  e.g. https://debating-plus-sincere.ngrok-free.dev
//   API_KEY      the same value as API_SECRET in the server's .env

// The server refuses bodies over 5 MB, so we stop a bit earlier.
const MAX_EMAIL_CHARS = 4 * 1024 * 1024;

function getConfig() {
  const props = PropertiesService.getScriptProperties();
  const url = props.getProperty("BACKEND_URL");
  const key = props.getProperty("API_KEY");
  if (!url || !key) {
    throw new Error("The add-on is not configured (BACKEND_URL / API_KEY missing).");
  }
  return { url: url, key: key };
}

// POST some JSON to the backend and return its JSON answer.
function postToBackend(path, body) {
  const config = getConfig();
  const response = UrlFetchApp.fetch(config.url + path, {
    method: "post",
    contentType: "application/json",
    // The second header tells ngrok (free plan) to skip its "you are about to visit" page.
    headers: { "X-API-Key": config.key, "ngrok-skip-browser-warning": "1" },
    payload: JSON.stringify(body),
    muteHttpExceptions: true, // let us read the status code instead of crashing
    followRedirects: false, // never follow the request somewhere else
  });
  const status = response.getResponseCode();
  if (status === 401) throw new Error("The backend rejected the API key.");
  if (status !== 200) throw new Error("The backend answered with status " + status + ".");
  return JSON.parse(response.getContentText());
}

// Analyze one full raw email.
function callBackend(raw) {
  if (raw.length > MAX_EMAIL_CHARS) {
    throw new Error("This email is too large to analyze.");
  }
  return postToBackend("/analyze", { raw: raw });
}

// The full https address of the dashboard, with a fresh one-time token.
function getDashboardUrl() {
  const answer = postToBackend("/dashboard-token", {});
  return getConfig().url + answer.path;
}
