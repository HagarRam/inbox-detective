# Gmail Add-on (Apps Script)

One add-on with two screens:

- **An email is open:** the add-on reads that email as raw text, sends it to the backend
  `POST /analyze` (with the `X-API-Key` header) and shows the score, verdict and findings.
- **No email is open (home screen):** a "Scan marked emails" button checks emails
  **before they are opened**. Tick emails in the list, add the label `Scan`, click the button.
  Each email gets a verdict label (`🔴 Malicious`, `🟠 Suspicious`, `🟢 Safe`) and a pop-up
  says how many were scanned and how many marked emails are still waiting.

## Files

| File | Job |
|---|---|
| `appsscript.json` | Manifest: name, scopes, allowed URLs, the two triggers |
| `Code.gs` | Runs when an email is opened |
| `Homepage.gs` | Home screen, the scan button and its pop-up |
| `Scanner.gs` | Scans emails labeled `Scan` and labels them with the verdict |
| `GmailApi.gs` | Small helpers for the Gmail API (labels, raw email) |
| `Backend.gs` | Calls the backend and checks the answer |
| `Cards.gs` | Builds the result card |

## Security decisions

- **Why scan before opening:** opening an email can already leak information,
  for example a tracking pixel tells the sender "this address is alive".
  The scanner reads the email only as raw text. It never shows it or loads its images,
  and the email stays unread.
- **One add-on, honest trade-off:** to scan emails that are not open and to add labels,
  the add-on needs `gmail.modify` (read emails, change labels). This is wider than
  "only the open email". I chose one add-on for a simpler user experience, and asked for
  the smallest scope that allows it: `gmail.modify`, **not** full access
  (`https://mail.google.com/`, which can even delete mail forever).
  That is also why the scanner calls the Gmail API directly instead of `GmailApp`,
  which needs full access.
- **Allow-list:** `urlFetchWhitelist` lets the add-on call only our backend and the Gmail API.
- **No secrets in code:** `BACKEND_URL` and `API_KEY` live in Script Properties.
- **Escaping:** text from the email is escaped before it is put in a card.
- **No redirects:** the request to the backend never follows a redirect.
- **Small batches:** one click scans at most 5 emails, because Google stops a click after 30 seconds.

## Setup (test deployment)

1. Start the backend: `node server.js` (with `API_SECRET` set in `.env`).
2. Expose it over HTTPS: `cloudflared tunnel --url http://localhost:3000`
   and copy the `https://....trycloudflare.com` address.
3. Go to https://script.google.com with the **test** Gmail account, create a new project.
4. Project Settings: tick "Show appsscript.json manifest file in editor".
5. Create the `.gs` files listed above and paste the content from this folder.
   Paste `appsscript.json` and replace `REPLACE-WITH-YOUR-BACKEND-HOST` with the tunnel host.
6. Project Settings -> Script Properties: add `BACKEND_URL` (the tunnel address, no `/` at the end)
   and `API_KEY` (same value as `API_SECRET`).
7. Deploy -> Test deployments -> Google Workspace Add-on -> Install.
8. Open Gmail (refresh), click the add-on icon in the side panel, and authorize.

Note: a quick tunnel gets a new address every time it starts. Then update both
the manifest allow-list and `BACKEND_URL`.
