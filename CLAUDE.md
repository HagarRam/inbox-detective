# CLAUDE.md: Inbox Detective (home assignment brief)

This file is the full brief for the project. Read all of it before writing any code.

## 0. Who you are working with (read first)

- The user is **Hagar**, a B.Sc. Industrial Engineering & Management student, applying for **Security Analyst (Student)** at **Upwind Security**. She is not a professional developer.
- **Talk to her in Hebrew, in feminine forms.** Keep code, comments, commit messages and the README in English.
- She wants to **understand** everything. In the interview she will present the solution on her own laptop **without AI** and explain the architecture and her decisions. So:
  - Work in **small steps**. After each feature, explain in simple Hebrew **what you built and why**, then ask her one short question to check she followed.
  - Write **short, plain-language comments** in the code ("what this does and why"). No jargon walls.
  - Never paste huge amounts of code without explaining it.
- She was told that using AI tools is allowed for this assignment. Do not hide or lie about AI use. If she asks, help her describe honestly where AI helped, for the README.

### 0.1 Simplicity rule (applies to every feature)

Keep everything **simple**. Hagar must be able to explain every line out loud, without AI, in an interview.

- Plain JavaScript, **short functions (under about 25 lines)**, clear names, no clever tricks.
- Avoid advanced patterns and extra libraries. Prefer the simplest approach that works, even if it is a bit longer (a plain `for` loop over chained `.reduce`/`.flatMap`, an `if` over a dense ternary).
- If a regex or a trick is needed, add a **one-line comment** saying what it does in plain words.
- **Each file does one small job.**
- Before adding anything complicated, **ask Hagar first**, or choose the simpler option and tell her why.

## 1. The assignment (summary of the PDF)

Build a **Gmail Add-on: "Malicious Email Scorer"**.

- It analyzes the **currently opened email** and shows a **maliciousness score**, a **verdict**, and a **clear, explainable reasoning**.
- **The Gmail Add-on is the product.** A backend is required.
- Built with **Google Workspace APIs** (Apps Script add-on with CardService).
- Must be **deployable to a real Gmail account and demonstrated live** in the interview, on her own laptop.
- **Security is a first-class concern**: assume emails, attachments and external content are untrusted.
- Submission is a **public Git repository** with a README that is the first thing a reviewer reads: architecture, decisions, how to run.
- Evaluation includes engineering judgment, security thinking, and **communication** (writing and in person).
- Scope, signals and capabilities are up to her. The goal is to be **creative, deep, surprising**, with a "researcher mindset".

## 2. The concept: "Inbox Detective"

The add-on does not only answer "is this email bad?". It answers **"is someone targeting me, and how?"**

Two layers:

1. **Core analysis** of the opened email: score, verdict, explainable findings.
2. **Discovery layer**: connect emails to each other by shared infrastructure, scan the whole mailbox, show a dashboard, and explain "what would have happened if you had clicked".

### 2.1 Signals for the core analysis (each one becomes a "finding")

A finding is `{ id, points, title, detail }`. Always show positive and negative signals. Never output a bare number.

- **Headers:** SPF / DKIM / DMARC from `Authentication-Results`; From vs Reply-To vs Return-Path mismatch; display-name spoofing of known brands. **Only trust the `Received` hop that Gmail added**; earlier hops can be forged.
- **Links:** visible text vs real `href`; URL shorteners; raw IP hosts; punycode/look-alike domains; plain http; domain age (RDAP); reputation lookups (Google Safe Browsing / VirusTotal, behind a provider interface).
- **Attachments:** type, double extension, hash **only**. **Never open or execute attachments.**
- **Content:** pressure language (urgent, verify your account, within 24 hours), password or payment requests.
- Score is 0-100 with a verdict: `likely safe`, `suspicious`, `malicious`. The score is an **estimate**, and the README must say so.

### 2.2 Discovery layer: network investigation of domains

For every suspicious domain, collect **passive** pivots only:

| Pivot | Source |
|---|---|
| IP address | DNS A/AAAA |
| ASN / hosting provider | IP info lookup |
| Name servers (NS) | DNS |
| Mail server (MX) | DNS |
| Registrar and registration date | RDAP |
| TLS certificates | crt.sh |

- Link domains that **share rare pivots** (same private name server, same registration day, same certificate).
- **Rarity weighting:** a shared pivot that belongs to a huge shared service (Gmail, Cloudflare) counts almost nothing; a rare shared pivot counts a lot.
- Output a **campaign graph**: different-looking senders that come from the same infrastructure are one campaign.
- **Sender drift:** a known sender suddenly arriving from different infrastructure.
- **Impersonation map:** who pretends to be whom.
- **Do NOT actively scan, probe, connect to, or pentest attacker infrastructure.** Passive public lookups only. Say this in the README as a deliberate decision.

### 2.3 Dashboard (whole mailbox since the account was created)

- Timeline of threats; campaigns and campaign graph (vis-network or d3); impersonation map; riskiest senders; distribution of scam types (Chart.js); protection recommendations.
- Opened from the add-on through a **one-time signed token link**. No stored passwords.
- The scan runs in **chunks** and sends **metadata only**, not full email bodies.

### 2.4 "If you had clicked" scenario cards

For each threat, a card with three parts:

1. **Facts found** (from the findings).
2. **Likely scenario, in steps** (for example: fake login page, credentials captured, account takeover).
3. **Protections** (for user, admin, organization).

Rules:
- Label the scenario clearly as **an estimate based on common patterns**, never as a fact.
- Map steps to **MITRE ATT&CK** techniques (for example phishing with a link, phishing with an attachment, user execution, valid accounts). **Verify every technique ID and name against attack.mitre.org before using it**, and never invent statistics about real-world outcomes.

## 3. Architecture

```
Gmail (opened email)
   -> Apps Script add-on (CardService, contextual trigger)
   -> HTTPS request with a shared secret / signed token
   -> Node.js + Express backend
        parseEmail -> analyzers -> intel providers -> score
   -> response (score, verdict, findings, scenario)
   -> add-on card  +  "Open dashboard" button (one-time token)
   -> web dashboard (served by the backend)
```

- **Provider interface** for external intel, so we can switch between **live** mode and **replay** mode (fixture data) and the demo works even without network or API limits.
- **Demo data:** seed a clean test mailbox with realistic phishing and legitimate emails using the Gmail API (`users.messages.import`). Demo on a **clean test account**, not Hagar's personal inbox.
- **Add-on scopes (least privilege):** only what is needed to read the current message and call the backend. Verify exact scope names in the Google docs before use.
- Keep pure logic (analyzers, scoring) **separate from I/O** (parsing, network), so it is testable with `node --test` and no extra libraries.

## 4. Security requirements (checklist)

- [ ] Least-privilege OAuth scopes
- [ ] Secrets only in env vars / Script Properties, never in code or Git
- [ ] `.env` and `node_modules` in `.gitignore`
- [ ] Do not store email bodies; keep only the metadata the dashboard needs
- [ ] SSRF protection on every outbound lookup the server makes from user-controlled data (block private/loopback/link-local ranges, limit redirects, set timeouts)
- [ ] Sanitize everything rendered in the dashboard (email content is attacker-controlled)
- [ ] Rate limiting + authentication on every backend endpoint; body size limits
- [ ] Never open or execute attachments
- [ ] If an LLM is ever used: treat email text as untrusted input (prompt injection), never let it change the score rules. LLM is optional and not required.

## 5. Current state of the repo

- Machine: macOS (Apple Silicon). Node v26, Git 2.50. VS Code signed in to GitHub.
- Repo: `https://github.com/HagarRam/inbox-detective` (currently **private**; it must be made **public** at submission, after checking there are no secrets).
- Existing files: `package.json` (deps: express 5, mailparser, dotenv), `.gitignore`, `server.js` (hello server on port 3000), `analyzers.js` (link mismatch check), `parse.js`, `samples/phish1.eml`.
- Not done yet: everything else below. The working tree may have uncommitted changes; check `git status` first.

## 6. Working rules for Git (important)

- **One branch per feature**, named `feature/<name>`. Never commit straight to `main`.
- Small, focused commits with **short, plain-language messages** ("Add check for look-alike domains").
- **Do not run `git push`.** When a feature is ready, stop and tell Hagar:
  1. the exact commands for her to run (`git add`, `git commit -m "..."`, `git push -u origin <branch>`),
  2. what to click on GitHub to open a Pull Request and merge it,
  3. then wait until she says it is merged, and run `git checkout main` and `git pull` before the next feature.
- Do not commit secrets, `.env`, or `node_modules`.

## 7. Feature branches (in this order)

Mark each as done only when it runs and Hagar understands it.

1. **`feature/analysis-engine`**: `parseEmail.js` (mailparser -> clean object), `analyzers.js` (link mismatch, SPF/DKIM/DMARC, Reply-To mismatch, display-name spoof, suspicious URLs, pressure language), `score.js` (0-100 + verdict), `analyze.js`, `demo.js`, `POST /analyze` in `server.js`, sample emails (phish and legit), unit tests with `node --test`.
2. **`feature/network-intel`**: passive domain enrichment behind a provider interface (DNS, RDAP, crt.sh, ASN), live and replay modes, SSRF guard, timeouts, caching.
3. **`feature/campaign-graph`**: pivot extraction, rarity weighting, clustering, sender drift, impersonation map.
4. **`feature/gmail-addon`**: Apps Script project with manifest, contextual trigger, CardService card showing score, verdict, findings, calls the backend with a secret. Needs a public HTTPS URL for the backend (tunnel or a small free host). Document how to deploy and use Test deployments.
5. **`feature/dashboard`**: chunked mailbox scan (metadata only), one-time signed token, timeline, campaign graph, charts, riskiest senders, recommendations.
6. **`feature/click-scenarios`**: "if you had clicked" cards with MITRE mapping (verified) and protections.
7. **`feature/seed-demo-mailbox`**: script to import realistic demo emails into a clean test Gmail account.
8. **`chore/hardening-and-readme`**: security checklist pass, rate limiting, sanitization, final README, repo made public.

Priority if time runs short: Must = branches 1, 4; Discovery = 2, 3, 5; Bonus = 6, 7. Cut bonuses first.

## 8. Timeline

Hagar has about 2 days. Day 1: backend, scoring, analyzers, fixtures. Day 2: add-on, dashboard, hardening, deploy, README, rehearse the demo out loud.

## 9. README (must be excellent; it is the first thing reviewers read)

Sections: what it is and the one-line pitch; architecture diagram; how it works (signals and scoring); key decisions and why; threat model; what is passive vs active and why; setup and run instructions; demo walkthrough; limitations and honest trade-offs (score is an estimate, scenarios are estimates, limited external lookups); "what I would do with more time"; a short, honest note on where AI tools helped.

## 10. Open questions to settle with Hagar

- Does she have a separate Gmail account for testing? (needed for the add-on and demo)
- How will the backend be reachable over HTTPS during the live demo (tunnel vs small free host)?
- Which external reputation service to use first (Google Safe Browsing / VirusTotal), and where to keep the API keys.

## 11. Definition of done

- Add-on shows score, verdict and reasons for any opened email, live, on her laptop.
- Discovery layer and dashboard work at least in replay mode, and in live mode if time allows.
- No secrets in the repo; security checklist reviewed.
- README complete; repo public.
- Hagar can explain every file and every decision **without AI**.
