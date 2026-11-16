// Overview.gs
// The "Scan overview" card, opened with "View results". After a scan the user sees
// at a glance which emails are bad, which look normal, and why.
// Results are from the sender headers only, so we never use the word "safe".

const ROWS_PER_GROUP = 10;

// The three groups, in the order they are shown.
const GROUPS = [
  { verdict: "malicious", header: "🔴 Dangerous. Do not open", count: "Dangerous", emoji: "🔴" },
  { verdict: "suspicious", header: "🟠 Suspicious. Be careful", count: "Suspicious", emoji: "🟠" },
  { verdict: "likely safe", header: "🟢 No strong red flags", count: "No strong red flags", emoji: "🟢" },
];

const HOW_TO_READ = "🟢 = the sender looks normal. It does NOT mean the email is harmless: links and attachments were not checked. Open the email for the full check.<br>" +
  "🔴 / 🟠 = the sender shows warning signs. Do not click links or open attachments.";

// The results of one group, highest score first.
function groupResults(results, verdict) {
  const list = results.filter(function (r) { return r.verdict === verdict; });
  list.sort(function (a, b) { return b.score - a.score; });
  return list;
}

// "Score 95 · Replies go to a different domain". A normal email with no warning sign
// says "Sender checks passed". Only the score when there is nothing else to say.
function rowLabel(r) {
  const why = r.top || (r.verdict === "likely safe" ? "Sender checks passed" : "");
  return "Score " + r.score + (why ? " · " + why : "");
}

// One email: sender, bold subject, score and why. A tap opens the details card.
function resultRow(r) {
  return CardService.newDecoratedText()
    .setTopLabel(escapeHtml(r.sender))
    .setText("<b>" + escapeHtml(r.subject) + "</b>")
    .setBottomLabel(ltr(escapeHtml(rowLabel(r))))
    .setWrapText(false)
    .setOnClickAction(rowClickAction(r.id));
}

// 1. "5 emails checked" and one count line per group (also when it is 0).
function summarySection(results) {
  const section = CardService.newCardSection().addWidget(textLine("<b>" + ltr(emailsText(results.length) + " checked") + "</b>"));
  for (const group of GROUPS) {
    const count = groupResults(results, group.verdict).length;
    section.addWidget(CardService.newDecoratedText().setText(ltr(group.emoji + " " + count + " " + group.count)));
  }
  return section;
}

// 2-4. One section per group that has emails: at most 10 rows, then "+N more in the dashboard".
function groupSection(group, list) {
  const section = CardService.newCardSection().setHeader(ltr(group.header));
  for (const r of list.slice(0, ROWS_PER_GROUP)) section.addWidget(resultRow(r));
  if (list.length > ROWS_PER_GROUP) section.addWidget(textLine(ltr("+" + (list.length - ROWS_PER_GROUP) + " more in the dashboard")));
  return section;
}

// 5. How to read the colors.
function howToReadSection() {
  return CardService.newCardSection().setHeader(ltr("How to read this")).addWidget(textLine(ltr(HOW_TO_READ)));
}

// The emails of the shown page that have no result yet.
function unscannedIds() {
  const chips = getChips();
  return getPageRows().map(function (row) { return row.id; }).filter(function (id) { return !chips[id]; });
}

function scanRestButton() {
  return filledButton("Scan the rest", "onScanRestClick", BLUE);
}

function backToListButton() {
  return textButton("Back to list", "onBackToListClick");
}

// 6. "N emails on this page were not scanned yet." + "Scan the rest", then "Back to list".
function nextStepsSection() {
  const section = CardService.newCardSection();
  const left = unscannedIds().length;
  if (left > 0) {
    section.addWidget(textLine(ltr(emailsText(left) + " on this page were not scanned yet.")));
    section.addWidget(scanRestButton());
  }
  return section.addWidget(backToListButton());
}

function buildOverviewCard() {
  const results = getLastScan();
  const card = CardService.newCardBuilder().setHeader(CardService.newCardHeader().setTitle(ltr("Scan overview")));
  card.addSection(summarySection(results));
  for (const group of GROUPS) {
    const list = groupResults(results, group.verdict);
    if (list.length > 0) card.addSection(groupSection(group, list));
  }
  return card.addSection(howToReadSection()).addSection(nextStepsSection()).build();
}
