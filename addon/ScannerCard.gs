// ScannerCard.gs
// The pieces of the home screen: search, alert, rows, pager, buttons. Also the details card.
// It only BUILDS widgets; the clicks are handled in Homepage.gs.
// CardService decides sizes and fonts; we only choose the style (FILLED / TEXT),
// the color of FILLED buttons, and whether a button is disabled.

const BLUE = "#1a73e8"; // scan
const PURPLE = "#673ab7"; // dashboard
const RED = "#c5221f"; // results that need attention
const GREY = "#5f6368";

// A button that runs one function of the add-on.
function actionButton(text, functionName) {
  return CardService.newTextButton()
    .setText(ltr(text))
    .setOnClickAction(CardService.newAction().setFunctionName(functionName));
}

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

// The tag of a result, e.g. "🔴 Dangerous · 95". Never the word "safe".
const TAG_WORDS = { malicious: "🔴 Dangerous", suspicious: "🟠 Suspicious", "likely safe": "⚪ No strong red flags" };

function chipText(chip) {
  if (!chip) return "Not scanned yet";
  return (TAG_WORDS[chip.verdict] || chip.verdict) + " · " + chip.score;
}

function isFlagged(chip) {
  return Boolean(chip) && chip.verdict !== "likely safe";
}

// Tapping a Dangerous / Suspicious email opens its details card.
function rowClickAction(id) {
  return CardService.newAction().setFunctionName("onRowClick").setParameters({ id: id });
}

// ---- The alert after a scan ----

// Count the results of the current scan.
function countResults(results) {
  const counts = { malicious: 0, suspicious: 0, clean: 0 };
  for (const r of results) {
    if (r.verdict === "malicious") counts.malicious++;
    else if (r.verdict === "suspicious") counts.suspicious++;
    else counts.clean++;
  }
  return counts;
}

// "⛔ 2 dangerous, 1 suspicious emails need attention" (a count of 0 is left out),
// or "4 emails checked, no strong red flags".
function alertText(results) {
  const counts = countResults(results);
  const parts = [];
  if (counts.malicious > 0) parts.push(counts.malicious + " dangerous");
  if (counts.suspicious > 0) parts.push(counts.suspicious + " suspicious");
  if (parts.length === 0) return results.length + (results.length === 1 ? " email" : " emails") + " checked, no strong red flags";
  return "⛔ " + parts.join(", ") + " emails need attention";
}

function viewResultsButton() {
  return filledButton("View results", "onOverviewClick", RED);
}

// The alert block, or [] when nothing was scanned yet.
function alertWidgets(results) {
  if (results.length === 0) return [];
  const checked = results.length + (results.length === 1 ? " email checked" : " emails checked");
  return [
    textLine("<b>" + ltr(alertText(results)) + "</b>"),
    textLine('<font color="' + GREY + '">' + ltr(checked) + "</font>"),
    viewResultsButton(),
  ];
}

// ---- The list ----

// One email: sender on top, bold subject, date below, and a checkbox.
// Gmail shortens long text itself (wrap off). The text comes from the email, so it is escaped.
// Ticking a box redraws the card, so the Scan button can show how many are ticked.
function emailRow(row, ticked) {
  const box = CardService.newSwitch()
    .setControlType(CardService.SwitchControlType.CHECK_BOX)
    .setFieldName("pick_" + row.id) // one field per row; Homepage.gs reads every "pick_..."
    .setValue(row.id)
    .setSelected(ticked)
    .setOnChangeAction(CardService.newAction().setFunctionName("onTickChange"));
  return CardService.newDecoratedText()
    .setTopLabel(escapeHtml(row.sender))
    .setText("<b>" + escapeHtml(row.subject) + "</b>")
    .setBottomLabel(ltr(row.date))
    .setWrapText(false)
    .setSwitchControl(box);
}

// "Previous" / "Next" (words, not arrows: arrows flip in Hebrew Gmail) and "Page N".
function pagerWidgets(state) {
  const previous = textButton("Previous", "onPreviousClick").setDisabled(state.page === 0);
  const next = textButton("Next", "onNextClick").setDisabled(!state.next);
  return [CardService.newButtonSet().addButton(previous).addButton(next), textLine(ltr("Page " + (state.page + 1)))];
}

// ---- The buttons ----

function scanButton(tickedCount) {
  const label = tickedCount > 0 ? "Scan " + tickedCount + " ticked " + (tickedCount === 1 ? "email" : "emails") : "Scan ticked emails";
  return filledButton(label, "onScanSelectedClick", BLUE);
}

function tickAllButton() {
  return textButton("Tick all on this page", "onTickAllClick");
}

function dashboardButton() {
  return filledButton("📊  Open dashboard", "onOpenDashboardClick", PURPLE); // the emoji makes it stand out (we cannot set a font size)
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
