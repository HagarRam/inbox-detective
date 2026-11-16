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

// Headers only (before opening) with a low score: we did not see the links or
// the attachments, so we never say "safe". White, not green: no false reassurance.
const HEADERS_ONLY_CLEAN = "⚪ No strong sender red flags"; // "strong": small ones (✖ +20) may still show below

function verdictText(result) {
  if (result.mode === "headers-only" && result.verdict === "likely safe") return HEADERS_ONLY_CLEAN;
  return VERDICT_LABELS[result.verdict] || result.verdict;
}

// U+200E is an invisible "left-to-right mark". In Hebrew (right-to-left) Gmail,
// numbers, brackets and full stops can jump to the wrong side ("Scan .2").
// ltr() puts a mark on both sides of OUR English text, so it stays in order.
// (Not used on email subjects: those may be Hebrew and must stay right-to-left.)
const LTR = "‎";

function ltr(text) {
  return LTR + text + LTR;
}

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
    .setText("<b>" + verdictText(result) + "</b>")
    .setBottomLabel(ltr("Score: " + result.score + " out of 100 (estimate)"));
}

// Verdict, score and the one-sentence summary.
function verdictSection(result) {
  return CardService.newCardSection()
    .addWidget(verdictWidget(result))
    .addWidget(CardService.newTextParagraph().setText(ltr(escapeHtml(summarySentence(result)))));
}

// Shown under every headers-only result: the check is not complete yet.
function fullCheckHint() {
  return CardService.newTextParagraph().setText("<i>" + ltr("Open the email and run the add-on for a full check.") + "</i>");
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
    .setTopLabel(ltr(pointsText(f.points)))
    .setText(findingSymbol(f.points) + " <b>" + escapeHtml(f.title) + "</b>")
    .setBottomLabel(escapeHtml(shorten(f.detail, 100)))
    .setWrapText(true);
}

// All findings (already sorted by impact). The first TOP_FINDINGS show; the rest fold away.
function findingsSection(findings) {
  const count = findings.length === 1 ? "1 finding" : findings.length + " findings";
  const section = CardService.newCardSection().setHeader(ltr("Why (" + count + ")"));
  if (findings.length === 0) return section.addWidget(CardService.newTextParagraph().setText(ltr("No signals found.")));
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
  const text = CardService.newTextParagraph().setText(ltr("⚠ " + escapeHtml(friendlyError(message))));
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
