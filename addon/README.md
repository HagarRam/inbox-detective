# Gmail Add-on (Apps Script)

One add-on with two screens:

- **An email is open:** the add-on reads that email as raw text, sends it to the backend
  `POST /analyze` (with the `X-API-Key` header) and shows the score, verdict and findings.
- **No email is open (home screen):** the add-on lists the 10 newest inbox emails
  (sender and subject only) with checkboxes. Tick some and click "Scan selected":
  the add-on fetches only their **sender headers** (`format=metadata`), sends them to
  `POST /analyze-headers`, and shows the score, verdict and reasons for each one,
  **without opening them**. Opening an email later runs the full check.
- **Mailbox dashboard (home screen):** "Scan mailbox" sends the **headers only** of the
  next 50 emails to `POST /scan-batch` (where it stopped is saved in User Properties).
  Each click first adds the emails that arrived since the last click.
  Every email you open or check is also added to the dashboard right away.
  "Open dashboard" asks the server for a one-time token and opens the dashboard
  in a new tab.

## Files

| File | Job |
|---|---|
| `appsscript.json` | Manifest: name, scopes, allowed URLs, the two triggers |
| `Code.gs` | Runs when an email is opened |
| `Homepage.gs` | Home screen: email list with checkboxes, scan button, results card |
| `Scanner.gs` | Lists the newest emails and scans the ticked ones |
| `GmailApi.gs` | Small read-only helpers for the Gmail API |
| `MailboxScan.gs` | Scans the mailbox in chunks of 50, headers only |
| `Backend.gs` | Calls the backend (analyze, scan batch, dashboard token) |
| `Cards.gs` | Builds the result card (verdict line, findings, primary button) |
| `Summary.gs` | One plain-English summary sentence, built from fixed phrases |
| `Errors.gs` | Turns technical errors into short, friendly messages |

## Security decisions

- **Why scan before opening:** opening an email can already leak information,
  for example a tracking pixel tells the sender "this address is alive".
  The scanner **reads headers only before opening** (From, Reply-To, Return-Path,
  Authentication-Results, Received-SPF, Subject, Date, Message-ID). It never reads the
  body, never shows the email or loads its images, and the email stays unread.
  The price: links and attachments are not checked until you open the email.
- **Only Gmail's own Authentication-Results counts:** Gmail adds its header at the top.
  If the same header appears again lower down (maybe written by the attacker, maybe in
  lower case), the add-on keeps the first one. If the first one is not from
  `mx.google.com`, it is dropped and the result says "no authentication result".
- **One add-on, honest trade-off:** to scan emails that are not open, the add-on needs
  `gmail.readonly` (read emails). This is wider than "only the open email", but it is
  read-only. In one line: it **reads headers only before opening, and cannot send,
  change or delete** anything.
  A first version added verdict labels to emails, which needed `gmail.modify`
  (which also allows sending). I dropped the labels and moved to `gmail.readonly`,
  so the extra feature costs as little permission as possible.
  The scanner calls the Gmail API directly instead of `GmailApp`, because `GmailApp`
  needs full access (`https://mail.google.com/`, which can even delete mail forever).
- **Allow-list:** `urlFetchWhitelist` lets the add-on call only our backend and the Gmail API.
- **No secrets in code:** `BACKEND_URL` and `API_KEY` live in Script Properties.
- **Escaping:** text from the email is escaped before it is put in a card.
- **No redirects:** the request to the backend never follows a redirect.
- **Small batches:** one click scans at most 5 emails, because Google stops a click after 30 seconds.
- **The list shows only sender and subject** (`format=metadata`), never the body.
  No part of the add-on uses `format=raw` before an email is opened.

## Setup (test deployment)

1. Start the backend and the tunnel: `npm run demo:start` (see the main README) and wait for **READY**.
   The public address is always `https://debating-plus-sincere.ngrok-free.dev` (an ngrok static domain).
2. Go to https://script.google.com with the **test** Gmail account, create a new project.
3. Project Settings: tick "Show appsscript.json manifest file in editor".
4. Create the `.gs` files listed above and paste the content from this folder.
   Under Services, add the **Gmail API** (this turns the API on for the project).
   Paste `appsscript.json` as is: its `urlFetchWhitelist` already allows the ngrok domain and the Gmail API.
5. Project Settings -> Script Properties: add `BACKEND_URL` = `https://debating-plus-sincere.ngrok-free.dev`
   (no `/` at the end) and `API_KEY` (same value as `API_SECRET` in `.env`).
6. Deploy -> Test deployments -> Google Workspace Add-on -> Install.
7. Open Gmail (refresh), click the add-on icon in the side panel, and authorize.

Because the domain is static, steps 4-5 are done once. Before a demo, only step 1 is needed.
