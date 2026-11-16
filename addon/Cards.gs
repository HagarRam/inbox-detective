// Cards.gs
// Builds what the user sees in the Gmail side panel.
//
// CardService limits (Google decides the look, not us):
// - no custom CSS, fonts or colors for widgets; only <b>, <i>, <font color> in text
// - the "show more / show less" control of a collapsible section has Google's own wording
// - light/dark mode follows Gmail; we cannot style it ourselves
// So we use emojis and symbols (🔴 🟠 🟢 ✖ ✔ •) to show meaning next to every word.
//
// Security: finding details can contain text taken from the email
// (domains, phrases, file names). The email is untrusted, and card text
// understands a few HTML tags, so we escape < > & before showing anything.

const LOGO_URL = "https://www.gstatic.com/images/icons/material/system/1x/label_googblue_24dp.png";
const TOP_FINDINGS = 5; // shown at once; the rest are behind "show more"

// Every verdict = an emoji + a word, never color alone.
const VERDICT_LABELS = { malicious: "🔴 Malicious", suspicious: "🟠 Suspicious", "likely safe": "🟢 Likely safe" };

// U+200E is an invisible "left-to-right mark". In Hebrew (right-to-left) Gmail,
// numbers and brackets can be reordered ("100 / 0"); the marks keep this line in order.
const LTR = "‎";

function cardHeader(subtitle) {
  return CardService.newCardHeader()
    .setTitle("Inbox Detective")
    .setSubtitle(subtitle)
    .setImageUrl(LOGO_URL)
    .setImageStyle(CardService.ImageStyle.CIRCLE);
}

// Big verdict line + "Score: N out of 100 (estimate)" in ONE string.
function verdictWidget(result) {
  return CardService.newDecoratedText()
    .setText("<b>" + (VERDICT_LABELS[result.verdict] || result.verdict) + "</b>")
    .setBottomLabel(LTR + "Score: " + result.score + " out of 100 (estimate)" + LTR);
}

// Verdict, score and the one-sentence summary.
function verdictSection(result) {
  return CardService.newCardSection()
    .addWidget(verdictWidget(result))
    .addWidget(CardService.newTextParagraph().setText(escapeHtml(summarySentence(result))));
}

// ✖ bad sign, ✔ good sign, • information only
function findingSymbol(points) {
  if (points > 0) return "✖";
  if (points < 0) return "✔";
  return "•";
}

// "+30 points", "-20 points" or "information"
function pointsText(points) {
  if (points > 0) return "+" + points + " points";
  if (points < 0) return points + " points";
  return "information";
}

// One short row: symbol + title, the points above, a one-line detail below (muted).
function findingRow(f) {
  return CardService.newDecoratedText()
    .setTopLabel(LTR + pointsText(f.points) + LTR)
    .setText(findingSymbol(f.points) + " <b>" + escapeHtml(f.title) + "</b>")
    .setBottomLabel(escapeHtml(shorten(f.detail, 100)))
    .setWrapText(true);
}

// All findings (already sorted by impact). The first TOP_FINDINGS show; the rest fold away.
function findingsSection(findings) {
  const count = findings.length === 1 ? "1 finding" : findings.length + " findings";
  const section = CardService.newCardSection().setHeader("Why (" + count + ")");
  if (findings.length === 0) return section.addWidget(CardService.newTextParagraph().setText("No signals found."));
  for (const f of findings) section.addWidget(findingRow(f));
  if (findings.length > TOP_FINDINGS) section.setCollapsible(true).setNumUncollapsibleWidgets(TOP_FINDINGS);
  return section;
}

// The one primary (filled) button, fixed at the bottom of the card.
function dashboardFooter() {
  const button = CardService.newTextButton()
    .setText("Open dashboard")
    .setTextButtonStyle(CardService.TextButtonStyle.FILLED)
    .setOnClickAction(CardService.newAction().setFunctionName("onOpenDashboardClick"));
  return CardService.newFixedFooter().setPrimaryButton(button);
}

function buildResultCard(result) {
  return CardService.newCardBuilder()
    .setHeader(cardHeader("Analysis of this email"))
    .addSection(verdictSection(result))
    .addSection(findingsSection(result.findings))
    .setFixedFooter(dashboardFooter())
    .build();
}

// "message" may be a technical error; the user sees only the friendly version.
function buildErrorCard(message) {
  const text = CardService.newTextParagraph().setText("⚠ " + escapeHtml(friendlyError(message)));
  return CardService.newCardBuilder()
    .setHeader(cardHeader("Could not analyze"))
    .addSection(CardService.newCardSection().addWidget(text))
    .build();
}

// Cut long text and add "..." so the card stays readable.
function shorten(text, max) {
  const value = String(text || "");
  if (value.length <= max) return value;
  return value.slice(0, max - 3) + "...";
}

// Replace the characters that HTML treats as special.
function escapeHtml(text) {
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
