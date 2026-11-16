// Overview.gs
// The "Scan overview" card. It opens on top of the home screen after every scan
// (and from "View overview"). It answers: what was found on this page, what was
// checked and what was not, which emails need attention, and what is not scanned yet.

const CHECKED_TEXT = "Checked: the sender (SPF, DKIM, DMARC), Reply-To, display name and domain age. " +
  "Not checked: links, attachments and message text. Open an email for the full check.";

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

// One count line, e.g. "🔴 2 Dangerous".
function countLine(text) {
  return CardService.newDecoratedText().setText("<b>" + ltr(text) + "</b>");
}

// The three counts and what was (not) checked.
function countsSection(counts) {
  return CardService.newCardSection()
    .addWidget(countLine("🔴 " + counts.malicious + " Dangerous"))
    .addWidget(countLine("🟠 " + counts.suspicious + " Suspicious"))
    .addWidget(countLine("⚪ " + counts.clean + " No strong red flags"))
    .addWidget(textLine('<font color="' + GREY + '">' + ltr(CHECKED_TEXT) + "</font>"));
}

// "Needs your attention": 🔴 first, then 🟠. Each one opens its details with a tap.
function attentionSection(rows, chips) {
  const section = CardService.newCardSection().setHeader(ltr("Needs your attention"));
  for (const verdict of ["malicious", "suspicious"]) {
    for (const row of rows) {
      const chip = chips[row.id];
      if (!chip || chip.verdict !== verdict) continue;
      section.addWidget(CardService.newDecoratedText()
        .setTopLabel(escapeHtml(row.sender))
        .setText(escapeHtml(row.subject))
        .setBottomLabel(ltr(chipText(chip)))
        .setWrapText(true)
        .setOnClickAction(rowClickAction(row.id)));
    }
  }
  return section;
}

// "N emails on this page were not scanned yet." + "Scan the rest" (only if there are some),
// "Continue scan" while a scan is running, and "Back to list".
function nextStepsSection(counts, queue) {
  const section = CardService.newCardSection();
  const left = counts.unscanned.length;
  if (left > 0) {
    section.addWidget(textLine(ltr(left + (left === 1 ? " email" : " emails") + " on this page were not scanned yet.")));
    section.addWidget(filledButton("Scan the rest", "onScanRestClick", BLUE));
  }
  if (queue.ids.length > 0) section.addWidget(textButton("Continue scan (" + queue.ids.length + " left)", "onContinueScanClick"));
  return section.addWidget(textButton("Back to list", "onBackToListClick"));
}

function buildOverviewCard() {
  const rows = getPageRows();
  const chips = getChips();
  const counts = countRows(rows, chips);
  const card = CardService.newCardBuilder().setHeader(CardService.newCardHeader().setTitle(ltr("Scan overview")));
  card.addSection(countsSection(counts));
  if (counts.malicious + counts.suspicious > 0) card.addSection(attentionSection(rows, chips));
  return card.addSection(nextStepsSection(counts, getQueue())).build();
}
