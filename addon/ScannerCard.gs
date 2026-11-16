// ScannerCard.gs
// How the "check before opening" part of the home screen looks, in 3 steps:
// Step 1 find (search + "show read"), Step 2 tick (rows + Page N), Step 3 scan (buttons).
// It only BUILDS widgets; the clicks are handled in Homepage.gs.

// A plain button that runs one function of the add-on.
function actionButton(text, functionName) {
  return CardService.newTextButton()
    .setText(ltr(text))
    .setOnClickAction(CardService.newAction().setFunctionName(functionName));
}

// A short paragraph of our own text.
function textLine(html) {
  return CardService.newTextParagraph().setText(html);
}

// Step 1: one search field, "Search", "Clear search" (only while searching), "Show read emails too".
function findSection(state) {
  const input = CardService.newTextInput().setFieldName("query").setTitle("Search").setHint("e.g. from:paypal");
  if (state.query) input.setValue(state.query);
  const buttons = CardService.newButtonSet().addButton(actionButton("Search", "onSearchClick"));
  if (state.query) buttons.addButton(actionButton("Clear search", "onClearClick"));
  const toggle = CardService.newSwitch().setFieldName("show_read").setValue("on").setSelected(state.showRead)
    .setOnChangeAction(CardService.newAction().setFunctionName("onShowReadChange"));
  const showRead = CardService.newDecoratedText().setText(ltr("Show read emails too")).setSwitchControl(toggle);
  return CardService.newCardSection().setHeader(ltr("Step 1: Find emails"))
    .addWidget(input).addWidget(buttons).addWidget(showRead);
}

// Step 2: "Page N" + Previous / Next, the rows, and again "Page N" + Previous / Next.
function listSection(state, rows, tickAll) {
  const section = CardService.newCardSection().setHeader(ltr("Step 2: Tick the emails to check"));
  section.addWidget(textLine("<b>" + listTitle(state) + "</b>"));
  if (rows.length === 0) return section.addWidget(textLine(ltr(emptyText(state))));
  addPaging(section, state);
  const chips = getChips();
  for (const row of rows) section.addWidget(emailRow(row, chips[row.id], tickAll));
  addPaging(section, state);
  return section;
}

function emptyText(state) {
  if (state.query) return "No emails match this search.";
  if (!state.showRead) return "No unread emails. Turn on \"Show read emails too\" to see the others.";
  return "Your inbox is empty.";
}

function addPaging(section, state) {
  const buttons = pagingButtons(state);
  if (buttons) section.addWidget(textLine(ltr("Page " + (state.page + 1)))).addWidget(buttons);
}

// Step 3: the buttons, and one line that says what they do.
function scanSection(queue) {
  const scan = actionButton("Scan ticked emails", "onScanSelectedClick").setTextButtonStyle(CardService.TextButtonStyle.FILLED);
  const buttons = CardService.newButtonSet().addButton(scan).addButton(actionButton("Tick all (this page)", "onTickAllClick"));
  if (queue.ids.length > 0) buttons.addButton(actionButton("Continue scan (" + queue.ids.length + " left)", "onContinueScanClick"));
  buttons.addButton(actionButton("Scan overview", "onOverviewClick"));
  const help = "<i>" + ltr("Scan ticked emails checks only their sender headers (5 per click) and then shows the Scan overview.") + "</i>";
  return CardService.newCardSection().setHeader(ltr("Step 3: Scan")).addWidget(buttons).addWidget(textLine(help));
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

// Tapping a Suspicious / Malicious row opens its details card.
function rowClickAction(id) {
  return CardService.newAction().setFunctionName("onRowClick").setParameters({ id: id });
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
    return widget.setOnClickAction(rowClickAction(row.id));
  }
  const box = CardService.newSwitch()
    .setControlType(CardService.SwitchControlType.CHECK_BOX)
    .setFieldName("pick_" + row.id) // one field per row; Homepage.gs reads every "pick_..."
    .setValue(row.id)
    .setSelected(ticked);
  return widget.setSwitchControl(box);
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
  const which = state.showRead ? "Inbox emails" : "Unread inbox emails";
  if (!state.query) return ltr(which);
  return ltr(which + " matching \"" + escapeHtml(shorten(state.query, 50)) + "\"");
}

// The words of the warning box. Fixed text, never taken from the email.
const WARNINGS = {
  malicious: { color: "#c5221f", title: "⛔ DANGEROUS EMAIL", text: "Do not open it, do not click its links and do not reply. Delete it or report it." },
  suspicious: { color: "#b06000", title: "⚠ BE CAREFUL", text: "This email may be dangerous. Do not click its links or open its attachments until you are sure who sent it." },
};

// A clear box at the top of the details card. Color + symbol + words (never color alone).
function warningSection(result) {
  const warning = WARNINGS[result.verdict];
  if (!warning) return null;
  const text = '<font color="' + warning.color + '"><b>' + ltr(warning.title) + "</b></font><br>" + ltr(warning.text);
  return CardService.newCardSection().addWidget(CardService.newTextParagraph().setText(text));
}

// The card for one tapped row: the warning box, verdict, all the reasons.
function buildDetailsCard(scan) {
  const card = CardService.newCardBuilder().setHeader(cardHeader(ltr("Before opening: sender check")));
  if (scan.error) {
    const text = CardService.newTextParagraph().setText(ltr("⚠ " + escapeHtml(friendlyError(scan.error))));
    return card.addSection(CardService.newCardSection().addWidget(text)).build();
  }
  const result = scan.result;
  const warning = warningSection(result);
  if (warning) card.addSection(warning);
  const subject = CardService.newTextParagraph().setText("<b>" + escapeHtml(shorten(result.subject || "(no subject)", 80)) + "</b>");
  const verdict = verdictSection(result);
  if (result.verdict !== "malicious") verdict.addWidget(fullCheckHint(result)); // the red box already says "do not open"
  card.addSection(CardService.newCardSection().addWidget(subject)).addSection(verdict).addSection(findingsSection(result.findings));
  if (result.scenario) card.addSection(scenarioSection(result.scenario));
  return card.setFixedFooter(dashboardFooter()).build();
}
