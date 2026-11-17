// Seed.gs
// Puts the 50 fictional demo emails (DemoEmails.gs) into the TEST Gmail inbox.
// Run importDemoEmails() from the editor. If it stops in the middle, run it again:
// it continues from where it stopped (saved in the NEXT_INDEX script property).
//
// It uses Gmail's "import": the emails appear in the inbox as if they were received,
// but nothing is sent to anyone. This is a SEPARATE project from the add-on, so the
// add-on never gets the "insert emails" permission (it stays read-only).

const IMPORT_URL = "https://gmail.googleapis.com/gmail/v1/users/me/messages/import" +
  "?internalDateSource=dateHeader&neverMarkSpam=true"; // use the email's own date; keep it out of spam

function importDemoEmails() {
  const props = PropertiesService.getScriptProperties();
  // Where we stopped last time, so a second run continues and never makes duplicates.
  let next = Number(props.getProperty("NEXT_INDEX") || 0);
  if (next >= DEMO_EMAILS.length) {
    console.log("All " + DEMO_EMAILS.length + " demo emails are already imported.");
    return;
  }
  while (next < DEMO_EMAILS.length) {
    importOne(DEMO_EMAILS[next]); // stops here with an error if Gmail refuses an email
    next++;
    props.setProperty("NEXT_INDEX", String(next)); // saved after EVERY email
  }
  console.log("Imported all " + DEMO_EMAILS.length + " demo emails into the inbox.");
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
