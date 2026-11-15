# Gmail Add-on (Apps Script)

The add-on runs inside Gmail. When you open an email it:

1. reads the opened email as raw text (only that one email),
2. sends it to the backend `POST /analyze` with the `X-API-Key` header,
3. shows the score, verdict and findings in a side-panel card.

## Files

| File | Job |
|---|---|
| `appsscript.json` | Manifest: name, scopes, allowed backend URL, trigger |
| `Code.gs` | Entry point: runs when an email is opened |
| `Backend.gs` | Calls the backend and checks the answer |
| `Cards.gs` | Builds the card the user sees |

## Security decisions

- **Least-privilege scopes:** the add-on can read only the email that is open right now
  (`gmail.addons.current.message.readonly`), plus make outbound calls (`script.external_request`).
- **Allow-list:** `urlFetchWhitelist` lets the add-on call only our backend address.
- **No secrets in code:** `BACKEND_URL` and `API_KEY` live in Script Properties.
- **Escaping:** text from the email is escaped before it is put in the card.
- **No redirects:** the request to the backend never follows a redirect.

## Setup (test deployment)

1. Start the backend: `node server.js` (with `API_SECRET` set in `.env`).
2. Expose it over HTTPS: `cloudflared tunnel --url http://localhost:3000`
   and copy the `https://....trycloudflare.com` address.
3. Go to https://script.google.com with the **test** Gmail account, create a new project.
4. Project Settings: tick "Show appsscript.json manifest file in editor".
5. Create the files `Code.gs`, `Backend.gs`, `Cards.gs` and paste the content from this folder.
   Paste `appsscript.json` and replace `REPLACE-WITH-YOUR-BACKEND-HOST` with the tunnel host.
6. Project Settings -> Script Properties: add `BACKEND_URL` (the tunnel address, no `/` at the end)
   and `API_KEY` (same value as `API_SECRET`).
7. Deploy -> Test deployments -> Google Workspace Add-on -> Install.
8. Open Gmail (refresh), open an email, click the add-on icon on the right, and authorize.

Note: a quick tunnel gets a new address every time it starts. Then update both
the manifest allow-list and `BACKEND_URL`.
