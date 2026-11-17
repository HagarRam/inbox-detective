# Inbox Detective

**A Gmail add-on that doesn't only ask "is this email bad?", but "is someone targeting me, and how?"**

Open an email and the add-on shows a maliciousness **score**, a **verdict** and the **reasons**.
It can also check emails **before you open them**, scan the whole mailbox, and link
different-looking emails that come from the **same attacker infrastructure** into campaigns.

> The score and the campaigns are **estimates** built from fixed, explainable rules and passive public lookups. They are not proof.

---

## What it does

| Layer | What the user sees |
|---|---|
| **Open email** | Side-panel card: score 0-100, verdict (🟢 Likely safe / 🟠 Suspicious / 🔴 Dangerous), every finding with its points and a plain-language explanation. Good signals (e.g. SPF/DKIM/DMARC pass) are shown too. |
| **Check before opening** | Home screen (no email open): a search field, *"Checked 12 of 50 unread emails"*, the **unread** emails that were **not scanned yet** (25 per page), a blue *Scan N ticked emails* button with *Select all*, and an *Already scanned* list with its own search. Only the **sender headers** are checked (authentication, Reply-To, display name, domain age), 5 per click. After a scan an alert (*"⛔ 2 dangerous, 1 suspicious need attention"*) opens the **Scan overview**: 🔴 / 🟠 / 🟢 groups, each email with its score and main reason, tap for details and "If you had clicked". If you later **open** a flagged email, the side panel starts with *"⛔ WARNING: you were warned before opening this email"*. |
| **Network intel** | For every domain in the email (sender, Reply-To, Return-Path, links): IP, hosting network (ASN), name servers, mail servers, registrar, registration date, TLS certificates. A domain registered days ago raises the score. |
| **Campaigns** | Domains that share **rare** infrastructure (same private name server, IP, certificate, registration day) are grouped. A "bank" email and a "PayPal" email on the same server become one campaign. |
| **Dashboard** | Built only from YOUR mailbox: every email you open or check is added right away, and *Scan whole mailbox* (add-on menu ⋮) adds the rest (headers only, 50 per click, new emails first). Opened from the add-on with a one-time link: threats over time, scam types, campaign graph, who pretends to be whom, riskiest senders, protection advice. |
| **If you had clicked** | For every Suspicious or Malicious email: the facts we found, a likely story in 3-4 steps mapped to MITRE ATT&CK, and protections for you, your IT admin and your organization. Always labeled *"Estimate based on common patterns, not a fact."* |

## Architecture

```
 Gmail ── opened email ──► Apps Script add-on (CardService)
                              │  HTTPS + X-API-Key (secret in Script Properties)
                              ▼
                ngrok tunnel, static domain (HTTPS)
                              │
                              ▼
            Node.js + Express backend (listens on 127.0.0.1 only)
   POST /analyze ─► parseEmail ─► analyzers ─► intel provider ─► score (+ summary to the store)
   POST /analyze-headers ─► sender headers only ─► header checks + From-domain intel ─► score
                                                   │
                                     replay (saved files) | live (DNS, RDAP, crt.sh, ASN)
   POST /scan-batch ─► same pipeline on headers ─► metadata store (data/, not in Git)
   POST /dashboard-token ─► one-time token ─► GET /dashboard ─► session cookie ─► dashboard page
                                                                   │
                                            campaign graph, impersonation map, riskiest senders
```

**Code map**

| Folder / file | Job |
|---|---|
| `addon/` | The Gmail add-on (Apps Script). See [addon/README.md](addon/README.md). |
| `server.js` | Express app: authentication, rate limit, safe headers, routes. |
| `parseEmail.js` | The only place that reads the raw email. Turns it into a small clean object. |
| `analyzers/` | One file per check. Pure functions: email in, findings out. |
| `score.js` | Adds up the points, clamps to 0-100, picks the verdict. |
| `intel/` | Passive domain lookups behind a provider interface (live / replay), with the SSRF guard. |
| `campaign/` | Pivots, rarity weights, clustering, impersonation map, sender drift. |
| `dashboard/` | Metadata store, one-time tokens, dashboard data and page. |
| `scenarios/` | "If you had clicked": the fixed stories (`stories.js`) and the pure builder (`buildScenario.js`). |
| `security/` | Rate limiting, safe headers, error handler. |
| `fixtures/intel/` | Saved intel for replay mode. |
| `samples/` | 11 sample emails (9 phishing, 2 legitimate) for tests and `npm run demo`. |
| `seeder/` | Separate Apps Script project that imports 50 fictional demo emails into the test inbox. |

## How the scoring works

Every check returns **findings** `{ id, points, title, detail }`. Bad signals add points, good signals subtract.
The total is clamped to 0-100: **0-24 likely safe, 25-59 suspicious, 60+ malicious.**

| Area | Signals (points) |
|---|---|
| Sender authentication | DMARC fail (+25), SPF fail/softfail (+15), DKIM missing (+10), all three pass (-20). Read from Gmail's own `Authentication-Results` header. |
| Sender identity | Reply-To on another domain (+20), display name of a brand from a non-brand domain (+25), Return-Path on another domain (+5) |
| Links | Text shows one site, link goes to another (+30), look-alike brand domain (+25), punycode (+20), raw IP (+20), `user@host` trick (+20), shortener (+10), plain http (+5) |
| Attachments | Double extension like `invoice.pdf.exe` (+35), risky type (+25). **Never opened**: only name, type, size and SHA-256. |
| Content | Pressure language (+15), password / payment / identity requests (+20) |
| Network intel | Domain registered in the last 30 days (+20), domain points into a private network (+10) |

The rules live in code. Nothing written inside an email can change them.

## Key decisions and why

- **Explainable rules instead of a black box.** Every point on the score has a sentence behind it. A security analyst (and the user) can check and argue with each one.
- **Check before opening.** Opening an email can already leak information (a tracking pixel tells the sender the address is alive). Two layers: before opening, the home-screen scan **reads headers only** (`format=metadata`, sent to `POST /analyze-headers`), never the body. It is never rendered, images never load, and it stays unread. When you open the email, the add-on runs the full check (links, attachments, content). Before opening, the add-on trusts only the **first** `Authentication-Results` header and only if it comes from `mx.google.com`, because lower copies may be written by the attacker.
- **Least privilege, and honest about the trade-off.** Reading only the open email needs `gmail.addons.current.message.readonly`. Checking emails *before* opening needs `gmail.readonly`, which is wider. I chose it for the feature, but kept it **read-only**: it reads headers only before opening, and cannot send, change or delete mail. A first version added verdict labels, which needed `gmail.modify` (which also allows sending). I dropped the labels to drop that scope. I call the Gmail REST API directly instead of `GmailApp`, because `GmailApp` needs full mailbox access.
- **Provider interface for intel (live / replay).** The same code works with real lookups or with saved answers. The demo works offline, gives the same result every time, and does not hit free-service limits.
- **Rarity weighting.** Sharing Cloudflare or Google proves nothing: millions of sites do. A shared pivot on a huge shared service counts 10%. A pivot shared by more than 25 domains is skipped. A rare private name server or a shared certificate counts a lot.
- **Dashboard gets metadata only.** The mailbox scan sends headers, never bodies. An email you open or check is analyzed in full, but the server stores the same short summary for it: sender, subject, date, score, finding titles and domain intel. Never the body.
- **One-time link instead of a password.** The add-on (which holds the API key) asks for a token. The token works once, for 5 minutes, and is swapped for a 30-minute `HttpOnly; Secure; SameSite=Lax` session cookie. It then disappears from the address bar.
- **Simple code on purpose.** Plain JavaScript, small files, short functions, only 4 dependencies (express, mailparser, htmlparser2, dotenv). Pure logic is separate from I/O, so it is tested with `node --test` and no extra libraries.

## Passive, not active

The intel layer only **asks public sources about** a domain: public DNS, RDAP (the modern whois), the crt.sh certificate log, and Team Cymru's IP-to-ASN service (over DNS).
It **never connects to, scans or probes attacker infrastructure.** This is a deliberate decision:
- Touching the attacker's servers can warn them that they were noticed.
- It can run attacker-controlled content or hit traps.
- Active scanning of third-party systems needs permission.

## Threat model

| Threat | Mitigation |
|---|---|
| Malicious email content (HTML, scripts, links) | The backend parses it as text and never renders it. Links are read with a real HTML parser. Attachments are only hashed, never opened or run. |
| Attacker text in the UI (subject, sender name, domain) | Add-on cards escape `< > &`. The dashboard writes all email-derived text with `textContent` only. A strict Content-Security-Policy allows scripts from our own server only (the chart libraries are served locally from `dashboard/public/vendor`). |
| SSRF through lookups (domains are attacker-controlled) | Domains are validated (only a-z, 0-9, `-`, `.`) before any lookup. HTTPS only. The host must resolve to public addresses, re-checked on every redirect (max 3). 8 s timeout, 2 MB size limit. Replay file names are safe because of the same validation. |
| Unauthorized use of the backend | `X-API-Key` on every API route, compared in constant time. Fails closed if the server has no secret. |
| Flooding / key guessing | 120 requests per minute per client (429 after that). JSON bodies limited to 5 MB (64 KB for the headers-only check), scan batches to 50 emails x 64 KB of headers. |
| Server reachable directly | It listens on `127.0.0.1` only. The only way in is the HTTPS tunnel. |
| Leaking details in errors | A last error handler returns a short generic message. `X-Powered-By` is off. |
| Dashboard link theft | Token is single-use and expires in 5 minutes. `Referrer-Policy: no-referrer`, `Cache-Control: no-store`, `frame-ancestors 'none'`. |
| Secrets in Git | Secrets only in `.env` (server) and Script Properties (add-on). `.env` and `data/` are in `.gitignore`. Git history checked before publishing. |
| Prompt injection | No LLM is used. Scores come from fixed rules only. |

### Security checklist

- [x] Least-privilege OAuth scopes (read-only; trade-off explained above)
- [x] Secrets only in env vars / Script Properties, never in code or Git
- [x] `.env`, `data/` and `node_modules` in `.gitignore`
- [x] No email bodies stored; dashboard keeps metadata only
- [x] SSRF protection on every outbound lookup (private/loopback/link-local blocked, redirects limited, timeouts, size limit)
- [x] Everything rendered in the dashboard is treated as untrusted (`textContent`, CSP)
- [x] Rate limiting and authentication on backend endpoints; body size limits
- [x] Attachments never opened or executed
- [x] No LLM, so no prompt injection path

## Setup and run

**Requirements:** Node.js 22 LTS, a Gmail test account, and [ngrok](https://ngrok.com) with a free static domain and its authtoken saved (`ngrok config add-authtoken ...`).

```bash
npm install
cp .env.example .env
# put a random secret in .env:
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

npm test                 # 77 tests
npm run demo             # analyze every email in samples/
npm run campaigns        # print campaigns, impersonation map, sender drift
npm run demo:start       # server + ngrok tunnel; prints READY and the public URL
```

`npm run demo:start` checks that port 3000 is free, starts the server (`npm start`) and
`ngrok http --url=debating-plus-sincere.ngrok-free.dev 3000`, prints **READY** only when the
server answers through the tunnel, and stops both on Ctrl+C.

### Demo startup checklist

1. `npm run demo:start` and wait for **READY**.
2. Open Gmail on the demo account.
3. Open an email.

### Why a static tunnel domain

- **The URL stays the same**, so the add-on configuration (`urlFetchWhitelist` and `BACKEND_URL`) does not change before the demo. A quick tunnel gets a new URL on every run.
- **The server and the data stay on my laptop.** Nothing is deployed to a third-party host.
- **For production** I would deploy the backend to a managed host with its own domain and HTTPS.

`.env` options: `API_SECRET` (required), `PORT` (default 3000), `INTEL_MODE` = `replay` (default) or `live`.

Then install the add-on in the test Gmail account: see [addon/README.md](addon/README.md).

**Replay data:** `node scripts/recordIntel.js github.com bit.ly` records real live answers into `fixtures/intel/`.
The `.example` domains in the samples do not exist, so their replay files are **synthetic and labeled as such**. They use IP addresses from documentation ranges (RFC 5737) and documentation ASNs, so they belong to no one.

## Demo walkthrough

1. **Home screen, before opening anything.** With no email open, the add-on lists the unread emails. Tick a few (for example *"Suspicious login from a new device"*, *"This week's offers"*, *"Your monthly GitHub summary"*) and click *Scan*. Only the sender headers are read; the emails stay unopened.
2. **View results.** The Scan overview groups them: 🔴 *Dangerous. Do not open*, 🟠 *Suspicious. Be careful*, 🟢 *No strong red flags*, each with its score and main reason. Tap the 🔴 one: a red warning box, all the reasons, and **"If you had clicked"** (facts, likely steps with MITRE ATT&CK IDs, protections).
3. **Open the dangerous email anyway.** The side panel starts with *"⛔ WARNING: you were warned before opening this email"*, then the full check: 100/100 Dangerous, with reasons like *"Link text does not match its real destination: shows mybank.com but goes to login-update.example"*.
4. **Open a normal email** (e.g. the GitHub summary). It is 🟢 Likely safe, and the card shows the good signal *"Sender is authenticated"*.
5. **Dashboard.** In the add-on menu (⋮) choose *Scan whole mailbox (for dashboard)*, then click *Open dashboard*. Show the campaign graph: the "bank" and "PayPal" emails are one campaign (same IP, name servers, certificate, registration day), the fake Microsoft emails are another, and the HR and "Google Docs" emails are linked by a rare mail server even though both sit on Cloudflare (the Cloudflare links count only +0.1 / +0.3).

Optional, command line: `npm run campaigns` also shows *sender drift*: "GitHub" from github.com, then from `github-account-notice.example` on a different network.

**Demo mailbox:** the test inbox is filled with 50 fictional emails (21 phishing in 5 campaigns, 9 suspicious, 20 normal) by a separate Apps Script project: see [seeder/README.md](seeder/README.md). It uses Gmail *import*, so nothing is sent to anyone, and the add-on never needs the "insert emails" permission.

Without Gmail: `npm run seed-dashboard` fills the dashboard from `samples/` (headers only, the same as the real scan).

## Limitations and honest trade-offs

- **Before opening, headers only.** The pre-open scan never sees links, attachments or the text, so a phish with clean authentication can pass it. It never says "safe" (it says *"No strong red flags"*), and the full check runs when you open the email.
- **Gmail add-on (CardService) limits.** Google decides fonts, sizes and layout: no custom CSS, no bigger buttons, three count lines instead of columns. A text field reacts only on Enter, so search is not live while typing. Gmail cannot pop up a window or block opening an email, so the "you were warned" message is in the side panel.
- **What the add-on remembers.** Scan results are kept in User Properties (about 9 KB per value), so it remembers the last 120 scanned emails, and the list covers the newest 200 unread emails. *Reset scan history* (menu ⋮) clears it.
- **Scenarios are estimates.** The facts are real (taken only from the findings), but the steps are a likely story based on common patterns, not what this attacker will do. There are no statistics. MITRE ATT&CK IDs and names were checked on attack.mitre.org (November 2026); T1656 "Impersonation" could not be checked and is not used.
- **The score is an estimate.** Fixed weights chosen by hand, not trained on data. A clever phish with clean authentication and no links (e.g. a plain "call me" message) can score low. A legitimate bulk mailer can collect a few points.
- **Campaigns and drift are estimates** based on shared infrastructure. Shared hosting can create false links. Rarity weighting reduces this, but does not remove it.
- **Demo intel is partly synthetic** (fictional `.example` domains). Live mode works on real domains, but is slower (~6 s per email, crt.sh is often slow), so replay is the default.
- **The mailbox scan uses headers only**, so link and attachment checks do not run there. This is the price of not sending bodies. Emails you open or check one by one get the full check, and a later headers-only scan never overwrites it.
- **Single user.** The store and sessions are in memory or in a local file, for one mailbox. Restarting the server ends dashboard sessions.
- **The backend runs on my laptop** behind an ngrok tunnel. If the laptop sleeps, the add-on cannot reach it. The free ngrok plan shows a one-time warning page when the dashboard opens in a browser (click *Visit*).
- **Apps Script limits:** one click may run 30 s, so scans go in chunks (5 selected emails, 50 headers).
- **No reputation feeds yet** (Safe Browsing / VirusTotal). The provider interface is ready for them.

## What I would do with more time

- Add Google Safe Browsing / VirusTotal as another provider, with API keys in env vars.
- Calibrate the weights on a labeled dataset and measure false positives and false negatives.
- Use only the `Received` hop that Gmail added, to fingerprint the real sending server for sender drift.
- Run the dashboard scan as a background job with progress, a real database, and multi-user sessions.
- Deploy the backend to a small managed host with a fixed HTTPS address instead of a tunnel.
- Publish the add-on through the Google Workspace Marketplace with OAuth verification.

## Where AI tools helped

I used Claude (an AI coding assistant) during this project, as the assignment allowed.
It wrote and refactored most of the code from my instructions, wrote the tests, helped debug the Apps Script permission problems, and drafted this README.
It also proposed options and trade-offs. I chose the direction: for example checking emails before opening them, picking emails with checkboxes instead of labels, and one add-on instead of two.
I ran the add-on live in a test Gmail account, and I kept the code deliberately simple so I can explain every line myself.
