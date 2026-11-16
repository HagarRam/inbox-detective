// ScannerCard.gs
// The pieces of the home screen: search, rows, paging, buttons. Also the details card.
// It only BUILDS widgets; the clicks are handled in Homepage.gs.

const BLUE = "#1A73E8"; // the main action: scan
const PURPLE = "#673AB7"; // a different place: the dashboard
const GREY = "#5f6368";

// A button that runs one function of the add-on.
function actionButton(text, functionName) {
  return CardService.newTextButton()
    .setText(ltr(text))
    .setOnClickAction(CardService.newAction().setFunctionName(functionName));
}

// A filled (colored) button, or a plain text button.
function filledButton(text, functionName, color) {
  return actionButton(text, functionName).setTextButtonStyle(CardService.TextButtonStyle.FILLED).setBackgroundColor(color);
}

function textButton(text, functionName) {
  return actionButton(text, functionName).setTextButtonStyle(CardService.TextButtonStyle.TEXT);
}

// A short paragraph of our own text.
function textLine(html) {
  return CardService.newTextParagraph().setText(html);
}

// The search field. It runs when the user presses Enter; empty = the normal list.
function searchInput(query) {
  const input = CardService.newTextInput()
    .setFieldName("query")
    .setHint("Search unread mail, e.g. from:paypal")
    .setOnChangeAction(CardService.newAction().setFunctionName("onSearchClick"));
  if (query) input.setValue(query);
  return input;
}

// "Last scan: 2 dangerous, 1 suspicious" + "View overview", or null if nothing was scanned.
function lastScanLine(counts) {
  if (counts.malicious + counts.suspicious + counts.clean === 0) return null;
  return CardService.newDecoratedText()
    .setText(ltr("Last scan: " + counts.malicious + " dangerous, " + counts.suspicious + " suspicious"))
    .setButton(textButton("View overview", "onOverviewClick"));
}

// The tag after a scan, e.g. "🔴 Dangerous · 95". Never the word "safe".
const TAG_WORDS = { malicious: "🔴 Dangerous", suspicious: "🟠 Suspicious", "likely safe": "⚪ No strong red flags" };

function chipText(chip) {
  if (!chip) return "Not scanned yet";
  return (TAG_WORDS[chip.verdict] || chip.verdict) + " · " + chip.score;
}

// A row that came out Suspicious or Malicious is opened with a tap, not ticked again.
function isFlagged(chip) {
  return Boolean(chip) && chip.verdict !== "likely safe";
}

// Tapping a Suspicious / Malicious row opens its details card.
function rowClickAction(id) {
  return CardService.newAction().setFunctionName("onRowClick").setParameters({ id: id });
}

// One email: sender on top, subject (bold) in the middle, date (or the tag after a scan) below.
// The sender and subject come from the email (attacker text), so they are escaped.
function emailRow(row, chip, ticked) {
  const widget = CardService.newDecoratedText()
    .setTopLabel(escapeHtml(shorten(row.sender, 40)))
    .setText("<b>" + escapeHtml(shorten(row.subject, 70)) + "</b>")
    .setBottomLabel(ltr(chip ? chipText(chip) : row.date))
    .setWrapText(true);
  if (isFlagged(chip)) return widget.setOnClickAction(rowClickAction(row.id));
  const box = CardService.newSwitch()
    .setControlType(CardService.SwitchControlType.CHECK_BOX)
    .setFieldName("pick_" + row.id) // one field per row; Homepage.gs reads every "pick_..."
    .setValue(row.id)
    .setSelected(ticked);
  return widget.setSwitchControl(box);
}

// "‹  Page N  ›" at the bottom. "Page N" is a disabled button, used as a label.
function pagingButtons(state) {
  if (state.page === 0 && !state.next) return null; // only one page
  const previous = actionButton("‹", "onPreviousClick").setDisabled(state.page === 0);
  const label = CardService.newTextButton().setText(ltr("Page " + (state.page + 1))).setDisabled(true)
    .setOnClickAction(CardService.newAction().setFunctionName("onRefreshClick")); // a button needs an action; it is disabled anyway
  const next = actionButton("›", "onNextClick").setDisabled(!state.next);
  return CardService.newButtonSet().addButton(previous).addButton(label).addButton(next);
}

// "No unread emails." or, for a search, "No unread emails match this search."
function emptyText(state) {
  return state.query ? "No unread emails match this search." : "No unread emails.";
}

// The small grey label above the rows. The search text is escaped like any other text.
function listTitle(state) {
  if (!state.query) return ltr("Unread emails");
  return ltr("Unread emails matching \"" + escapeHtml(shorten(state.query, 50)) + "\"");
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
