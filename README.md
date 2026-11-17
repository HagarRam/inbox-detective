# Inbox Detective

A Gmail add-on that scores emails for phishing risk, explains every reason, and links emails that come from the same attacker infrastructure.
The score and the links between emails are **estimates** based on fixed rules and public lookups, not proof.

## What it does

- **Open email check:** a score from 0 to 100, a verdict (likely safe / suspicious / dangerous) and the reason for each point.
- **Check before opening:** scans unread emails using the sender headers only, without opening the email.
- **Dashboard:** threats over time, riskiest senders and campaign graph, built from your own mailbox.
- **Possible links between emails:** domains that share rare infrastructure (name server, IP, certificate, registration day) are grouped into one campaign.

## Architecture

The Gmail add-on (Apps Script) sends the email data over HTTPS, with an API key, to a Node.js + Express backend. The backend listens on `127.0.0.1` only and is exposed through an ngrok tunnel with a static domain. It parses the email, runs one check per file in `analyzers/`, looks up the domains (live or from saved replay files), and returns the score.

## Scoring

Each check adds or subtracts points. The total is clamped to 0-100: **0-24 likely safe, 25-59 suspicious, 60+ malicious.**
The weights were chosen by hand, not trained on data.

- DMARC fail: +25
- Link text shows one site but goes to another: +30

## Key decisions

- **Explainable rules instead of a black box.** Every point on the score has a sentence behind it, and no LLM is used.
- **Check before opening.** Opening an email can leak information (for example through a tracking pixel), so the early scan reads headers only. The full check runs when you open the email.
- **Metadata only.** The dashboard stores sender, subject, date, score and findings, never email bodies.

## Security

- Email content is parsed as text and never rendered. Attachments are only hashed, never opened.
- Lookups are passive (public DNS, RDAP, crt.sh) and protected against SSRF: domain validation, HTTPS only, public IPs only, timeouts and size limits.
- Every API route needs an `X-API-Key` and is rate limited. The server fails closed if no secret is set.
- Text from emails is escaped everywhere it is shown, and the dashboard uses a strict Content-Security-Policy.
- The dashboard opens with a one-time link (5 minutes) that is swapped for a session cookie.
- Secrets live only in `.env` and Script Properties, both kept out of Git. OAuth access is read-only (`gmail.readonly`).

## Setup and run

**Requirements:** Node.js 22 LTS, a Gmail test account, and [ngrok](https://ngrok.com) with a free static domain and its authtoken saved (`ngrok config add-authtoken ...`).

```bash
npm install
cp .env.example .env
# put a random secret in .env:
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

npm test                 # run the tests
npm run demo             # analyze every email in samples/
npm run campaigns        # print campaigns and impersonation map
npm run demo:start       # server + ngrok tunnel; prints READY and the public URL
```

`npm run demo:start` checks that port 3000 is free, starts the server (`npm start`) and the ngrok tunnel, and prints **READY** only when the server answers through the tunnel. Ctrl+C stops both.

`.env` options: `API_SECRET` (required), `PORT` (default 3000), `INTEL_MODE` = `replay` (default) or `live`.

Then install the add-on in the test Gmail account: see [addon/README.md](addon/README.md).
To fill the test inbox with 50 fictional emails: see [seeder/README.md](seeder/README.md).

**Replay data:** `node scripts/recordIntel.js github.com bit.ly` records real live answers into `fixtures/intel/`.

## Demo walkthrough

1. Open Gmail on the demo account, tick a few unread emails on the add-on home screen and click *Scan*. Only the headers are read.
2. Open a flagged email. The side panel shows the warning, the score and the reasons.
3. From the add-on menu choose *Scan whole mailbox*, then *Open dashboard* to see the campaign graph.

## Limitations

- The early scan sees headers only, so a phish with clean authentication can pass it. It never says "safe", only "No strong red flags".
- The score and the campaign links are estimates. Clever phishing can score low, and shared hosting can create false links.
- Part of the demo data is synthetic (fictional `.example` domains).
- The backend runs on a local laptop behind a tunnel, for a single user.
