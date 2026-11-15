// Cards.gs
// Builds what the user sees in the Gmail side panel.
//
// Security: finding details can contain text taken from the email
// (domains, phrases, file names). The email is untrusted, and card text
// understands a few HTML tags, so we escape < > & before showing anything.

// Show at most this many findings, so the card stays short.
const MAX_FINDINGS = 15;

function buildResultCard(result) {
  const card = CardService.newCardBuilder()
    .setHeader(CardService.newCardHeader().setTitle("Inbox Detective"))
    .addSection(buildScoreSection(result))
    .addSection(buildFindingsSection(result.findings));
  return card.build();
}

function buildScoreSection(result) {
  return CardService.newCardSection().addWidget(buildScoreWidget(result));
}

// "100 / 100" with "🔴 MALICIOUS" under it. Used here and in the scan results.
function buildScoreWidget(result) {
  return CardService.newDecoratedText()
    .setTopLabel("Score (estimate)")
    .setText("<b>" + result.score + " / 100</b>")
    .setBottomLabel(verdictIcon(result.verdict) + " " + result.verdict.toUpperCase());
}

function buildFindingsSection(findings) {
  const section = CardService.newCardSection().setHeader("Why");
  if (findings.length === 0) {
    return section.addWidget(CardService.newTextParagraph().setText("No signals found."));
  }
  for (let i = 0; i < findings.length && i < MAX_FINDINGS; i++) {
    section.addWidget(buildFindingWidget(findings[i]));
  }
  return section;
}

// One finding = points on top, title in the middle, explanation below.
function buildFindingWidget(f) {
  return CardService.newDecoratedText()
    .setTopLabel(pointsLabel(f.points))
    .setText("<b>" + escapeHtml(f.title) + "</b>")
    .setBottomLabel(escapeHtml(f.detail))
    .setWrapText(true);
}

function buildErrorCard(message) {
  const text = CardService.newTextParagraph().setText(escapeHtml(message));
  return CardService.newCardBuilder()
    .setHeader(CardService.newCardHeader().setTitle("Inbox Detective"))
    .addSection(CardService.newCardSection().setHeader("Could not analyze").addWidget(text))
    .build();
}

// "+30 (bad sign)", "-20 (good sign)", "0 (info)"
function pointsLabel(points) {
  if (points > 0) return "+" + points + " (bad sign)";
  if (points < 0) return points + " (good sign)";
  return "0 (info)";
}

function verdictIcon(verdict) {
  if (verdict === "malicious") return "🔴";
  if (verdict === "suspicious") return "🟠";
  return "🟢";
}

// Replace the characters that HTML treats as special.
function escapeHtml(text) {
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
