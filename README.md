# Inbox Detective

**A Gmail add-on that doesn't only ask "is this email bad?", but "is someone targeting me, and how?"**

Open an email and the add-on shows a maliciousness **score** (0-100), a **verdict** and the **reasons**. It can also check emails **before you open them** and link different-looking emails that come from the **same attacker infrastructure** into campaigns.

> The score and the campaigns are **estimates** built from fixed, explainable rules and passive public lookups. They are not proof.

## Features

- **Open email:** score, verdict (🟢 Likely safe / 🟠 Suspicious / 🔴 Dangerous) and every finding with its points and a plain-language explanation. Good signals (SPF/DKIM/DMARC pass) are shown too.
- **Check before opening:** scans unread emails from the **sender headers only** (authentication, Reply-To, display name, domain age). The body is never read or rendered. If you later open a flagged email, you get a warning in the side panel.
- **Network intel:** for every domain in the email: IP, ASN, name servers, mail servers, registrar, registration date, TLS certificates. A domain registered days ago raises the score.
- **Campaigns:** domains sharing **rare** infrastructure (private name server, IP, certificate, registration day) are grouped together.
- **Dashboard:** built only from your mailbox: threats over time, scam types, campaign graph, impersonation map, riskiest senders.
- **"If you had clicked":** for suspicious or malicious emails: the facts found, a likely 3-4 step story mapped to MITRE ATT&CK, and protections. Always labeled as an estimate.

## Architecture

```
Gmail ─► Apps Script add-on (CardService)
            │  HTTPS + X-API-Key
            ▼
        ngrok tunnel (static domain)
            ▼
   Node.js + Express backend (127.0.0.1 only)
   /analyze         ─► parseEmail ─► analyzers ─► intel provider ─► score
   /analyze-headers ─► header checks + sender-domain intel ─► score
   /scan-batch      ─► same pipeline on headers ─► metadata store
   /dashboard-token ─► one-time token ─► /dashboard
```

| Folder | Job |
|---|---|
| `addon/` | The Gmail add-on (Apps Script) |
| `server.js` | Express app: auth, rate limit, safe headers, routes |
| `parseEmail.js` | The only place that reads the raw email |
| `analyzers/` | One pure function per check |
| `score.js` | Adds points, clamps to 0-100, picks the verdict |
| `intel/` | Passive domain lookups (live / replay) with SSRF guard |
| `campaign/` | Clustering, rarity weights, impersonation map |
| `dashboard/` | Metadata store, one-time tokens, dashboard page |
| `scenarios/` | "If you had clicked" stories |
| `samples/`, `fixtures/` | Sample emails and saved intel for tests and demo |

## Scoring

Each check returns a finding `{ id, points, title, detail }`. The total is clamped to 0-100: **0-24 likely safe, 25-59 suspicious, 60+ malicious.**

| Area | Examples (points) |
|---|---|
| Authentication | DMARC fail +25, SPF fail +15, DKIM missing +10, all pass -20 |
| Sender identity | Reply-To on another domain +20, brand name on a non-brand domain +25 |
| Links | Text/destination mismatch +30, look-alike domain +25, punycode +20, raw IP +20, shortener +10 |
| Attachments | Double extension +35, risky type +25 (never opened, only hashed) |
| Content | Pressure language +15, password/payment requests +20 |
| Network intel | Domain registered in last 30 days +20 |

The rules live in code. Nothing written inside an email can change them, and no LLM is used.

## Key decisions

- **Explainable rules, not a black box.** Every point has a sentence behind it.
- **Check before opening.** Opening an email can leak information (tracking pixels), so the pre-open scan reads headers only. The full check runs when you open the email.
- **Least privilege.** The pre-open scan needs `gmail.readonly` (read-only, no send/modify/delete). I dropped verdict labels to avoid the wider `gmail.modify` scope, and call the Gmail REST API directly instead of `GmailApp`.
- **Passive intel only.** Only public DNS, RDAP, crt.sh and Team Cymru are queried. The tool never connects to or probes attacker infrastructure.
- **Rarity weighting.** Sharing Cloudflare proves nothing, so common shared services count 10%, and pivots shared by more than 25 domains are skipped.
- **Metadata only.** The dashboard stores sender, subject, date, score and findings, never email bodies.
- **Provider interface (live / replay).** Same code with real lookups or saved answers, so the demo works offline and is repeatable.

## Security

| Threat | Mitigation |
|---|---|
| Malicious email content | Parsed as text, never rendered. Attachments are only hashed. |
| Attacker text in the UI | Escaped in cards, `textContent` + strict CSP in the dashboard |
| SSRF via lookups | Domain validation, HTTPS only, public IPs only (re-checked on redirects), timeouts and size limits |
| Unauthorized use | `X-API-Key` (constant-time compare), fails closed |
| Flooding | 120 req/min per client, body size limits |
| Dashboard link theft | One-time token (5 min) swapped for a 30-min `HttpOnly` cookie |
| Secrets in Git | Only in `.env` / Script Properties, both ignored by Git |

## Setup

**Requirements:** Node.js 22 LTS, a Gmail test account, and [ngrok](https://ngrok.com) with a free static domain.

```bash
npm install
npm run demo:start       # server + ngrok tunnel, prints READY
```

`.env` options: `API_SECRET` (required), `PORT` (default 3000), `INTEL_MODE` = `replay` (default) or `live`.

Install the add-on in the test Gmail account: see [addon/README.md](addon/README.md). To fill the test inbox with 50 fictional emails: see [seeder/README.md](seeder/README.md).

## Limitations

- **Pre-open scan is headers only.** A phish with clean authentication can pass it, so it never says "safe", only "No strong red flags".
- **The score is an estimate.** Hand-picked weights, not trained on data. A plain "call me" scam can score low.
- **Campaigns and scenarios are estimates.** Shared hosting can create false links.
- **Gmail add-on limits.** No custom CSS, and Gmail cannot block opening an email.
- **Single user.** Store and sessions are local to one mailbox.
- **Runs on a laptop** behind an ngrok tunnel. For production, deploy to a managed host.
- **No reputation feeds yet** (Safe Browsing / VirusTotal). The provider interface is ready for them.
