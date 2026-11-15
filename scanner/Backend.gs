// Backend.gs
// Sends the raw email to our server (POST /analyze) and returns its answer.
//
// The backend address and the secret are kept in Script Properties
// (Project Settings -> Script Properties), never in the code or in Git:
//   BACKEND_URL  e.g. https://something.trycloudflare.com
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

function callBackend(raw) {
  if (raw.length > MAX_EMAIL_CHARS) {
    throw new Error("This email is too large to analyze.");
  }
  const config = getConfig();
  const response = UrlFetchApp.fetch(config.url + "/analyze", {
    method: "post",
    contentType: "application/json",
    headers: { "X-API-Key": config.key },
    payload: JSON.stringify({ raw: raw }),
    muteHttpExceptions: true, // let us read the status code instead of crashing
    followRedirects: false, // never follow the request somewhere else
  });

  const status = response.getResponseCode();
  if (status === 401) throw new Error("The backend rejected the API key.");
  if (status !== 200) throw new Error("The backend answered with status " + status + ".");
  return JSON.parse(response.getContentText());
}
