# Pre-open scanner (Apps Script)

Checks an email **before you open it**.

1. In the Gmail list, tick an email (do not open it) and give it the label `Scan`.
2. A time trigger runs `scanLabeledEmails()` every few minutes.
3. The email gets a verdict label (`🔴 Malicious`, `🟠 Suspicious`, `🟢 Safe`) and loses `Scan`.

## Why a separate project from the add-on

- **Opening an email can already leak information**, for example a tracking pixel
  tells the sender "this address is alive and the email was read".
  The scanner reads the email only as raw text through the Gmail API. It never shows
  it, never loads images, and the email stays unread.
- **Least privilege:** the scanner needs to read emails and change labels
  (`gmail.modify`). The add-on needs much less (only the open email).
  Keeping them apart means the add-on never gets the wider permission.
- We call the Gmail API directly instead of `GmailApp`, because `GmailApp` needs
  full mailbox access (`https://mail.google.com/`, which can even delete mail forever).

## Files

| File | Job |
|---|---|
| `appsscript.json` | Manifest: the two scopes it needs |
| `Scanner.gs` | Finds emails with the `Scan` label and labels them with the verdict |
| `GmailApi.gs` | Small helpers for the Gmail API (labels, raw email) |
| `Backend.gs` | Same file as in the add-on: calls `POST /analyze` |

## Setup

1. https://script.google.com (test account) -> New project -> name it `Inbox Detective Scanner`.
2. Project Settings: tick "Show appsscript.json manifest file in editor".
3. Paste the 4 files from this folder.
4. Project Settings -> Script Properties: `BACKEND_URL` and `API_KEY` (same as the add-on).
5. In the editor choose `scanLabeledEmails` and click Run once. Approve the permissions.
   This also creates the 4 labels in Gmail.
6. Triggers (clock icon) -> Add Trigger -> `scanLabeledEmails`, Time-driven,
   Minutes timer, Every 5 minutes -> Save.
