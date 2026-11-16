// Overview.gs
// The "Scan overview" card, opened with "View results". It shows the current scan:
// the counts, what was checked and what was not, the emails that need attention,
// and how many emails of the page are still not scanned.

const CHECKED_TEXT = "Checked: the sender (SPF, DKIM, DMARC), Reply-To, display name and domain age.";
const NOT_CHECKED_TEXT = "Not checked: links, attachments and message text. Open an email for the full check.";

// The emails of the shown page that have no result yet.
function unscannedIds() {
  const chips = getChips();
  return getPageRows().map(function (row) { return row.id; }).filter(function (id) { return !chips[id]; });
}

// Three count lines (Columns holds only 2 columns, so we use 3 lines) and what was checked.
function countsSection(results) {
  const counts = countResults(results);
  return CardService.newCardSection()
    .addWidget(CardService.newDecoratedText().setText("<b>" + ltr(counts.malicious + " Dangerous") + "</b>"))
    .addWidget(CardService.newDecoratedText().setText("<b>" + ltr(counts.suspicious + " Suspicious") + "</b>"))
    .addWidget(CardService.newDecoratedText().setText("<b>" + ltr(counts.clean + " No strong red flags") + "</b>"))
    .addWidget(textLine('<font color="' + GREY + '">' + ltr(CHECKED_TEXT) + "<br>" + ltr(NOT_CHECKED_TEXT) + "</font>"));
}

// Dangerous and Suspicious emails, highest score first. A tap opens the details card.
function attentionSection(results) {
  const flagged = results.filter(function (r) { return r.verdict !== "likely safe"; });
  flagged.sort(function (a, b) { return b.score - a.score; });
  const section = CardService.newCardSection().setHeader(ltr("Needs your attention"));
  for (const r of flagged) {
    section.addWidget(CardService.newDecoratedText()
      .setTopLabel(escapeHtml(r.sender))
      .setText("<b>" + escapeHtml(r.subject) + "</b>")
      .setBottomLabel(ltr(chipText(r)))
      .setWrapText(false)
      .setOnClickAction(rowClickAction(r.id)));
  }
  return section;
}

function scanRestButton() {
  return filledButton("Scan the rest", "onScanRestClick", BLUE);
}

function backToListButton() {
  return textButton("Back to list", "onBackToListClick");
}

// "N emails on this page were not scanned yet." + "Scan the rest", then "Back to list".
function nextStepsSection() {
  const section = CardService.newCardSection();
  const left = unscannedIds().length;
  if (left > 0) {
    section.addWidget(textLine(ltr(left + (left === 1 ? " email" : " emails") + " on this page were not scanned yet.")));
    section.addWidget(scanRestButton());
  }
  return section.addWidget(backToListButton());
}

function buildOverviewCard() {
  const results = getLastScan();
  const card = CardService.newCardBuilder().setHeader(CardService.newCardHeader().setTitle(ltr("Scan overview")));
  card.addSection(countsSection(results));
  if (countResults(results).malicious + countResults(results).suspicious > 0) card.addSection(attentionSection(results));
  return card.addSection(nextStepsSection()).build();
}
