// Seed.gs
// Puts the 50 fictional demo emails (DemoEmails.gs) into the TEST Gmail inbox.
// Run importDemoEmails() ONCE from the editor.
//
// It uses Gmail's "import": the emails appear in the inbox as if they were received,
// but nothing is sent to anyone. This is a SEPARATE project from the add-on, so the
// add-on never gets the "insert emails" permission (it stays read-only).

const IMPORT_URL = "https://gmail.googleapis.com/gmail/v1/users/me/messages/import" +
  "?internalDateSource=dateHeader&neverMarkSpam=true"; // use the email's own date; keep it out of spam

function importDemoEmails() {
  const props = PropertiesService.getScriptProperties();
  if (props.getProperty("IMPORTED") === "yes") {
    console.log("Already imported. To import again, delete the IMPORTED script property first.");
    return;
  }
  let count = 0;
  for (const raw of DEMO_EMAILS) {
    importOne(raw);
    count++;
  }
  props.setProperty("IMPORTED", "yes"); // so a second click does not create duplicates
  console.log("Imported " + count + " demo emails into the inbox.");
}

// One email: Gmail wants it in "base64url" form, in the inbox, unread.
function importOne(raw) {
  const body = {
    raw: Utilities.base64EncodeWebSafe(raw, Utilities.Charset.UTF_8),
    labelIds: ["INBOX", "UNREAD"],
  };
  const response = UrlFetchApp.fetch(IMPORT_URL, {
    method: "post",
    contentType: "application/json",
    headers: { Authorization: "Bearer " + ScriptApp.getOAuthToken() },
    payload: JSON.stringify(body),
    muteHttpExceptions: true,
  });
  if (response.getResponseCode() !== 200) {
    throw new Error("Import failed (" + response.getResponseCode() + "): " + response.getContentText().slice(0, 300));
  }
}
