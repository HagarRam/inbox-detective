// Scenario.gs
// Shows the "If you had clicked" scenario that the server sends (field "scenario").
// The add-on only DISPLAYS it; the server builds it (scenarios/buildScenario.js).
// Facts include text from the email (domains, names), so everything is escaped.

// "• one<br>• two"
function bulletList(items) {
  return items.map(function (item) { return "• " + ltr(escapeHtml(item)); }).join("<br>");
}

// "1. text" with its MITRE ATT&CK technique below it, in grey.
function stepsText(steps) {
  return steps.map(function (step, i) {
    const mitre = step.mitre ? '<br><font color="#5f6368">' + ltr("MITRE ATT&amp;CK: " + escapeHtml(step.mitre)) + "</font>" : "";
    return ltr((i + 1) + ". " + escapeHtml(step.text)) + mitre;
  }).join("<br>");
}

function paragraph(title, body) {
  return CardService.newTextParagraph().setText("<b>" + ltr(title) + "</b><br>" + body);
}

// One section: the estimate note and the facts are always visible; steps and protections fold away.
function scenarioSection(scenario) {
  const protect = scenario.protections;
  return CardService.newCardSection()
    .setHeader(ltr("If you had clicked"))
    .addWidget(CardService.newTextParagraph().setText("<i>" + ltr(escapeHtml(scenario.estimateNote)) + "</i>"))
    .addWidget(paragraph("What we found", bulletList(scenario.facts)))
    .addWidget(paragraph("What could happen next", stepsText(scenario.steps)))
    .addWidget(paragraph("Protect yourself", bulletList(protect.user)))
    .addWidget(paragraph("Your IT admin can", bulletList(protect.admin)))
    .addWidget(paragraph("Your organization can", bulletList(protect.organization)))
    .setCollapsible(true)
    .setNumUncollapsibleWidgets(3);
}
