// ScannerCard.gs
// How the "check before opening" part of the home screen looks:
// a search box, one row per email (checkbox + result tag), the scan buttons, Previous / Next.
// It only BUILDS widgets; the clicks are handled in Homepage.gs.

const SEARCH_HINT = "Search mail, for example from:paypal or newer_than:7d";

// A plain button that runs one function of the add-on.
function actionButton(text, functionName) {
  return CardService.newTextButton()
    .setText(ltr(text))
    .setOnClickAction(CardService.newAction().setFunctionName(functionName));
}

// The search box with Search and Clear.
function searchWidgets(query) {
  const input = CardService.newTextInput().setFieldName("query").setTitle("Search").setHint(SEARCH_HINT);
  if (query) input.setValue(query);
  const buttons = CardService.newButtonSet()
    .addButton(actionButton("Search", "onSearchClick"))
    .addButton(actionButton("Clear", "onClearClick"));
  return [input, buttons];
}

// "Not scanned yet" or e.g. "🔴 Malicious · Score: 95 out of 100 (estimate)".
// Rows are always scanned from headers only, so ⚪ is used instead of "safe".
function chipText(chip) {
  if (!chip) return "Not scanned yet";
  const result = { verdict: chip.verdict, score: chip.score, mode: "headers-only" };
  return verdictText(result) + " · Score: " + chip.score + " out of 100 (estimate)";
}

// A row that came out Suspicious or Malicious is opened with a tap, not ticked again.
function isFlagged(chip) {
  return Boolean(chip) && chip.verdict !== "likely safe";
}

// One email: sender name on top, subject (bold = unread), date and result tag below.
// The sender and subject come from the email (attacker text), so they are escaped.
function emailRow(row, chip, ticked) {
  const subject = escapeHtml(shorten(row.subject, 70));
  const widget = CardService.newDecoratedText()
    .setTopLabel(escapeHtml(shorten(row.sender, 40)))
    .setText(row.unread ? "<b>" + subject + "</b>" : subject)
    .setBottomLabel(ltr(row.date + " · " + chipText(chip) + (isFlagged(chip) ? " · tap for details" : "")))
    .setWrapText(true);
  if (isFlagged(chip)) {
    const open = CardService.newAction().setFunctionName("onRowClick").setParameters({ id: row.id });
    return widget.setOnClickAction(open);
  }
  const box = CardService.newSwitch()
    .setControlType(CardService.SwitchControlType.CHECK_BOX)
    .setFieldName("pick_" + row.id) // one field per row; Homepage.gs reads every "pick_..."
    .setValue(row.id)
    .setSelected(ticked);
  return widget.setSwitchControl(box);
}

// "Scan selected", "Select all unread", "Scan today's emails" (+ "Continue scan" while a scan is running).
function scanButtons(queue) {
  const buttons = CardService.newButtonSet()
    .addButton(actionButton("Scan selected", "onScanSelectedClick"))
    .addButton(actionButton("Select all unread", "onSelectUnreadClick"))
    .addButton(actionButton("Scan today's emails", "onScanTodayClick"));
  if (queue.ids.length > 0) buttons.addButton(actionButton("Continue scan (" + queue.ids.length + " left)", "onContinueScanClick"));
  return buttons;
}

// Previous / Next, only the ones that make sense. null when there is only one page.
function pagingButtons(state) {
  if (state.page === 0 && !state.next) return null;
  const buttons = CardService.newButtonSet();
  if (state.page > 0) buttons.addButton(actionButton("Previous", "onPreviousClick"));
  if (state.next) buttons.addButton(actionButton("Next", "onNextClick"));
  return buttons;
}

// The line above the rows: which list this is. The search text is the user's, but we still escape it.
function listTitle(state) {
  const page = state.page > 0 ? " (page " + (state.page + 1) + ")" : "";
  if (!state.query) return ltr("Latest inbox emails" + page);
  return ltr("Results for \"" + escapeHtml(shorten(state.query, 50)) + "\"" + page);
}

// The card for one tapped row: verdict, all the reasons, and the "full check" hint.
function buildDetailsCard(scan) {
  const card = CardService.newCardBuilder().setHeader(cardHeader(ltr("Before opening: sender check")));
  if (scan.error) {
    const text = CardService.newTextParagraph().setText(ltr("⚠ " + escapeHtml(friendlyError(scan.error))));
    return card.addSection(CardService.newCardSection().addWidget(text)).build();
  }
  const subject = CardService.newTextParagraph().setText("<b>" + escapeHtml(shorten(scan.result.subject || "(no subject)", 80)) + "</b>");
  return card
    .addSection(CardService.newCardSection().addWidget(subject))
    .addSection(verdictSection(scan.result).addWidget(fullCheckHint(scan.result)))
    .addSection(findingsSection(scan.result.findings))
    .setFixedFooter(dashboardFooter())
    .build();
}
