// Homepage.gs
// The add-on "home screen": shown when NO email is open (the user is in the list).
// A short welcome, three clear actions, and one "how it works" line:
//   1. tick emails and scan them WITHOUT opening them
//   2. scan the whole mailbox (headers only) for the dashboard
//   3. open the dashboard (the one primary button, at the bottom)

// In the scan results, show only the strongest reasons per email, so it stays short.
const FINDINGS_PER_EMAIL = 3;

function onHomepage(e) {
  try {
    return buildHomepageCard(listRecentEmails());
  } catch (err) {
    console.error(err);
    return buildErrorCard(err.message);
  }
}

function buildHomepageCard(emails) {
  const welcome = CardService.newCardSection().addWidget(CardService.newTextParagraph().setText(
    ltr("Check emails <b>before</b> you open them, and see who is targeting your mailbox.") + "<br>" +
    "<i>" + ltr("How it works: emails are read as text only. Links and attachments are never opened. Scores are estimates.") + "</i>"
  ));
  return CardService.newCardBuilder()
    .setHeader(cardHeader("Is someone targeting you?"))
    .addSection(welcome)
    .addSection(checkEmailsSection(emails))
    .addSection(mailboxSection())
    .setFixedFooter(dashboardFooter())
    .build();
}

// Action 1: the newest emails with checkboxes, and a scan button.
function checkEmailsSection(emails) {
  const section = CardService.newCardSection().setHeader(ltr("1. Check emails without opening them"));
  if (emails.length === 0) {
    return section.addWidget(CardService.newTextParagraph().setText(ltr("Your inbox is empty.")));
  }
  const scan = CardService.newTextButton()
    .setText("Scan selected")
    .setOnClickAction(CardService.newAction().setFunctionName("onScanClick"));
  return section.addWidget(buildEmailCheckboxes(emails)).addWidget(scan);
}

// Action 2: scan the whole mailbox for the dashboard.
function mailboxSection() {
  const explain = CardService.newTextParagraph().setText(
    ltr("Headers only, " + CHUNK_SIZE + " emails per click. Then open the dashboard to see campaigns, trends and advice.")
  );
  const scan = CardService.newTextButton()
    .setText(ltr("Scan mailbox (next " + CHUNK_SIZE + ")"))
    .setOnClickAction(CardService.newAction().setFunctionName("onMailboxScanClick"));
  return CardService.newCardSection().setHeader(ltr("2. Scan your whole mailbox")).addWidget(explain).addWidget(scan);
}

function onMailboxScanClick(e) {
  try {
    const result = scanNextChunk();
    let text = "Scanned " + result.scanned + " emails (" + result.total + " in the dashboard).";
    text += result.done ? " The whole mailbox is scanned." : " Click again to continue.";
    return notify(text);
  } catch (err) {
    console.error(err);
    return notify(friendlyError(err.message));
  }
}

// Action 3: ask the server for a one-time link and open it in a new browser tab.
function onOpenDashboardClick(e) {
  try {
    const link = CardService.newOpenLink().setUrl(getDashboardUrl());
    return CardService.newActionResponseBuilder().setOpenLink(link).build();
  } catch (err) {
    console.error(err);
    return notify(friendlyError(err.message));
  }
}

// One checkbox per email: "Sender: Subject". The value is the email id.
function buildEmailCheckboxes(emails) {
  const boxes = CardService.newSelectionInput()
    .setType(CardService.SelectionInputType.CHECK_BOX)
    .setFieldName("emailIds")
    .setTitle(ltr("Tick up to " + EMAILS_PER_CLICK + " emails"));
  for (const email of emails) {
    boxes.addItem(shorten(email.from + ": " + email.subject, 70), email.id, false);
  }
  return boxes;
}

// Runs when "Scan selected" is clicked: scan the ticked emails, then show the results.
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

// One section per scanned email, in the same visual language as the result card.
function buildScanResultsCard(scans) {
  const card = CardService.newCardBuilder().setHeader(cardHeader(ltr("Scan results (emails stay unopened)")));
  for (const scan of scans) {
    card.addSection(buildOneScanSection(scan));
  }
  return card.setFixedFooter(dashboardFooter()).build();
}

function buildOneScanSection(scan) {
  const section = CardService.newCardSection();
  if (scan.error) {
    section.setHeader("Could not scan this email");
    return section.addWidget(CardService.newTextParagraph().setText(ltr("⚠ " + escapeHtml(friendlyError(scan.error)))));
  }
  const result = scan.result;
  section.setHeader(escapeHtml(shorten(result.subject || "(no subject)", 60)));
  section.addWidget(verdictWidget(result));
  section.addWidget(CardService.newTextParagraph().setText(ltr(escapeHtml(summarySentence(result)))));
  for (let i = 0; i < result.findings.length && i < FINDINGS_PER_EMAIL; i++) {
    section.addWidget(findingRow(result.findings[i]));
  }
  return section;
}

// A small pop-up message at the bottom of the screen.
function notify(text) {
  return CardService.newActionResponseBuilder()
    .setNotification(CardService.newNotification().setText(ltr(text)))
    .build();
}
