// Overview.gs
// The "Scan overview" card. It opens on top of the home screen after every scan
// (and from the "Scan overview" button). It answers three questions:
// what was checked, what was found on this page, and what is still not scanned.

// Count the emails of the shown page by their last result.
function countRows(rows, chips) {
  const counts = { malicious: 0, suspicious: 0, clean: 0, unscanned: [] };
  for (const row of rows) {
    const chip = chips[row.id];
    if (!chip) counts.unscanned.push(row.id);
    else if (chip.verdict === "malicious") counts.malicious++;
    else if (chip.verdict === "suspicious") counts.suspicious++;
    else counts.clean++;
  }
  return counts;
}

// "🔴 2 dangerous · 🟠 1 suspicious · ⚪ 4 no strong sender red flags"
function summaryText(counts) {
  return "🔴 " + counts.malicious + " dangerous · 🟠 " + counts.suspicious + " suspicious · ⚪ " + counts.clean + " no strong sender red flags";
}

// a. What was checked and what was not. Fixed text.
function checkedSection() {
  const html = "<b>" + ltr("What was checked:") + "</b> " + ltr("sender headers only: authentication (SPF, DKIM, DMARC), Reply-To / Return-Path, display-name impersonation, domain age.") +
    "<br><b>" + ltr("What was NOT checked:") + "</b> " + ltr("links, attachments, message text.") +
    "<br><i>" + ltr("Open the email to run the full check.") + "</i>";
  return CardService.newCardSection().addWidget(textLine(html));
}

// c. One row: sender, subject, result. Suspicious / Malicious open with a tap.
function overviewRow(row, chip) {
  const flagged = isFlagged(chip);
  const widget = CardService.newDecoratedText()
    .setTopLabel(escapeHtml(row.sender))
    .setText(escapeHtml(row.subject))
    .setBottomLabel(ltr(chipText(chip) + (flagged ? " · tap for details" : "")))
    .setWrapText(true);
  if (flagged) widget.setOnClickAction(rowClickAction(row.id));
  return widget;
}

// b + c. The summary line, then 🔴 first, then 🟠, then ⚪.
function resultsSection(rows, chips, counts) {
  const section = CardService.newCardSection().setHeader(ltr("Results on this page"));
  section.addWidget(textLine("<b>" + ltr(summaryText(counts)) + "</b>"));
  for (const verdict of ["malicious", "suspicious", "likely safe"]) {
    for (const row of rows) {
      const chip = chips[row.id];
      if (chip && chip.verdict === verdict) section.addWidget(overviewRow(row, chip));
    }
  }
  return section;
}

// d. How many emails of this page are not scanned yet, and "Scan the rest".
function notScannedSection(counts, queue) {
  const section = CardService.newCardSection().setHeader(ltr("Not scanned yet"));
  const left = counts.unscanned.length;
  if (left === 0) return section.addWidget(textLine(ltr("Every email on this page is scanned.")));
  section.addWidget(textLine(ltr(left + (left === 1 ? " email" : " emails") + " on this page are not scanned yet.")));
  const buttons = CardService.newButtonSet().addButton(actionButton("Scan the rest", "onScanRestClick"));
  if (queue.ids.length > 0) buttons.addButton(actionButton("Continue scan (" + queue.ids.length + " left)", "onContinueScanClick"));
  return section.addWidget(buttons);
}

function buildOverviewCard() {
  const rows = getPageRows();
  const chips = getChips();
  const counts = countRows(rows, chips);
  return CardService.newCardBuilder()
    .setHeader(cardHeader(ltr("Scan overview")))
    .addSection(checkedSection())
    .addSection(resultsSection(rows, chips, counts))
    .addSection(notScannedSection(counts, getQueue()))
    .build();
}
