// Homepage.gs
// The add-on "home screen": shown when NO email is open (the user is in the list).
// It lists the newest emails (sender + subject only) with checkboxes.
// The user ticks some and clicks "Scan selected emails" -> a card with the
// score, verdict and reasons for each one. No email is ever opened.

// In the results card, show only the strongest reasons per email, so it stays short.
const FINDINGS_PER_EMAIL = 5;

function onHomepage(e) {
  try {
    return buildHomepageCard(listRecentEmails());
  } catch (err) {
    console.error(err);
    return buildErrorCard(err.message);
  }
}

function buildHomepageCard(emails) {
  const section = CardService.newCardSection().setHeader("Check emails without opening them");
  if (emails.length === 0) {
    section.addWidget(CardService.newTextParagraph().setText("Your inbox is empty."));
  } else {
    section.addWidget(buildEmailCheckboxes(emails));
    section.addWidget(
      CardService.newTextButton()
        .setText("Scan selected emails")
        .setOnClickAction(CardService.newAction().setFunctionName("onScanClick"))
    );
  }
  return CardService.newCardBuilder()
    .setHeader(CardService.newCardHeader().setTitle("Inbox Detective"))
    .addSection(section)
    .build();
}

// One checkbox per email: "Sender: Subject". The value is the email id.
function buildEmailCheckboxes(emails) {
  const boxes = CardService.newSelectionInput()
    .setType(CardService.SelectionInputType.CHECK_BOX)
    .setFieldName("emailIds")
    .setTitle("Tick the emails to scan (max " + EMAILS_PER_CLICK + ")");
  for (const email of emails) {
    boxes.addItem(shorten(email.from + ": " + email.subject, 70), email.id, false);
  }
  return boxes;
}

// Runs when the button is clicked: scan the ticked emails, then show the results.
function onScanClick(e) {
  const ids = getTickedIds(e);
  if (ids.length === 0) {
    return notify("Tick at least one email first.");
  }
  const card = buildScanResultsCard(scanEmails(ids));
  const response = CardService.newActionResponseBuilder()
    .setNavigation(CardService.newNavigation().pushCard(card));
  if (ids.length > EMAILS_PER_CLICK) {
    response.setNotification(CardService.newNotification()
      .setText("Scanned the first " + EMAILS_PER_CLICK + ". Go back, tick the rest and scan again."));
  }
  return response.build();
}

// The ids of the ticked checkboxes (an empty list if none was ticked).
function getTickedIds(e) {
  const inputs = e.commonEventObject.formInputs;
  if (!inputs || !inputs.emailIds) return [];
  return inputs.emailIds.stringInputs.value;
}

// One section per scanned email: subject, score + verdict, and the reasons.
function buildScanResultsCard(scans) {
  const card = CardService.newCardBuilder()
    .setHeader(CardService.newCardHeader().setTitle("Scan results"));
  for (const scan of scans) {
    card.addSection(buildOneScanSection(scan));
  }
  return card.build();
}

function buildOneScanSection(scan) {
  const section = CardService.newCardSection();
  if (scan.error) {
    section.setHeader("Could not scan this email");
    return section.addWidget(CardService.newTextParagraph().setText(escapeHtml(scan.error)));
  }
  const result = scan.result;
  section.setHeader(escapeHtml(shorten(result.subject || "(no subject)", 60)));
  section.addWidget(buildScoreWidget(result));
  for (let i = 0; i < result.findings.length && i < FINDINGS_PER_EMAIL; i++) {
    section.addWidget(buildFindingWidget(result.findings[i]));
  }
  return section;
}

// A small pop-up message at the bottom of the screen.
function notify(text) {
  return CardService.newActionResponseBuilder()
    .setNotification(CardService.newNotification().setText(text))
    .build();
}

// Cut long text and add "..." so the card stays readable.
function shorten(text, max) {
  if (text.length <= max) return text;
  return text.slice(0, max - 3) + "...";
}
