// Homepage.gs
// The add-on "home screen": shown when NO email is open (the user is in the list).
// A short welcome, three clear actions, and one "how it works" line:
//   1. find emails (inbox or search), tick them and scan them WITHOUT opening them
//   2. scan the whole mailbox (headers only) for the dashboard
//   3. open the dashboard (the one primary button, at the bottom)
// This file builds the card and handles the clicks; ScannerCard.gs builds the rows.

function onHomepage(e) {
  try {
    saveListState({ query: "", tokens: [""], page: 0, next: "" }); // always start at the inbox, page 1
    return buildHomepageCard(false);
  } catch (err) {
    console.error(err);
    return buildErrorCard(err.message);
  }
}

// tickUnread = true when "Select all unread" was clicked.
function buildHomepageCard(tickUnread) {
  const welcome = CardService.newCardSection().addWidget(CardService.newTextParagraph().setText(
    ltr("Check emails <b>before</b> you open them, and see who is targeting your mailbox.") + "<br>" +
    "<i>" + ltr("How it works: before opening, only the sender headers are read. Links and attachments are checked when you open an email. Scores are estimates.") + "</i>"
  ));
  return CardService.newCardBuilder()
    .setHeader(cardHeader("Is someone targeting you?"))
    .addSection(welcome)
    .addSection(checkEmailsSection(tickUnread))
    .addSection(mailboxSection())
    .setFixedFooter(dashboardFooter())
    .build();
}

// Action 1: search, the page of emails, the scan buttons and Previous / Next.
function checkEmailsSection(tickUnread) {
  const state = getListState();
  const page = listPage(state.query, state.tokens[state.page], PAGE_SIZE);
  state.next = page.nextPageToken; // remembered for the "Next" button
  saveListState(state);

  const section = CardService.newCardSection().setHeader(ltr("1. Check emails without opening them"));
  for (const widget of searchWidgets(state.query)) section.addWidget(widget);
  section.addWidget(CardService.newTextParagraph().setText("<b>" + listTitle(state) + "</b>"));
  if (page.ids.length === 0) {
    return section.addWidget(CardService.newTextParagraph().setText(ltr(state.query ? "No emails match this search." : "Your inbox is empty.")));
  }
  const chips = getChips();
  for (const row of getRows(page.ids)) section.addWidget(emailRow(row, chips[row.id], tickUnread && row.unread));
  section.addWidget(scanButtons(getQueue()));
  const paging = pagingButtons(state);
  if (paging) section.addWidget(paging);
  return section;
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
    let text;
    if (result.newEmails) {
      text = "Added " + result.scanned + " new emails (" + result.total + " in the dashboard). Click again to continue.";
    } else {
      text = "Scanned " + result.scanned + " emails (" + result.total + " in the dashboard).";
      text += result.done ? " The whole mailbox is scanned." : " Click again to continue.";
    }
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

// ---- Clicks on the email list ----

// Redraw the home screen in place, with a short pop-up message.
function redraw(text, tickUnread) {
  const response = CardService.newActionResponseBuilder()
    .setNavigation(CardService.newNavigation().updateCard(buildHomepageCard(tickUnread)));
  if (text) response.setNotification(CardService.newNotification().setText(ltr(text)));
  return response.build();
}

// Every click below goes through here: errors become one friendly pop-up.
function safely(handler) {
  try {
    return handler();
  } catch (err) {
    console.error(err);
    return notify(friendlyError(err.message));
  }
}

function onSearchClick(e) {
  return safely(function () {
    const inputs = e.commonEventObject.formInputs || {};
    const query = inputs.query ? String(inputs.query.stringInputs.value[0]).trim().slice(0, 200) : "";
    saveListState({ query: query, tokens: [""], page: 0, next: "" });
    return redraw("", false);
  });
}

function onClearClick(e) {
  return safely(function () {
    saveListState({ query: "", tokens: [""], page: 0, next: "" });
    return redraw("", false);
  });
}

function onNextClick(e) {
  return safely(function () {
    const state = getListState();
    state.tokens[state.page + 1] = state.next;
    state.page += 1;
    saveListState(state);
    return redraw("", false);
  });
}

function onPreviousClick(e) {
  return safely(function () {
    const state = getListState();
    state.page = Math.max(0, state.page - 1);
    saveListState(state);
    return redraw("", false);
  });
}

// The ids of the ticked rows. Each row has its own field "pick_<id>",
// and a ticked box sends back its value: the same id.
function pickedIds(e) {
  const inputs = e.commonEventObject.formInputs || {};
  const ids = [];
  for (const name of Object.keys(inputs)) {
    if (name.indexOf("pick_") !== 0) continue;
    const id = name.slice("pick_".length);
    const values = (inputs[name].stringInputs && inputs[name].stringInputs.value) || [];
    if (values.indexOf(id) !== -1) ids.push(id);
  }
  return ids;
}

function onScanSelectedClick(e) {
  return safely(function () {
    const ids = pickedIds(e);
    if (ids.length === 0) return notify("Tick at least one email first.");
    return redraw(progressText(startScan(ids)), false);
  });
}

function onSelectUnreadClick(e) {
  return safely(function () {
    return redraw("Unread emails on this page are ticked. Click Scan selected.", true);
  });
}

function onScanTodayClick(e) {
  return safely(function () {
    const ids = listTodayIds();
    if (ids.length === 0) return notify("No emails arrived today.");
    return redraw(progressText(startScan(ids)), false);
  });
}

function onContinueScanClick(e) {
  return safely(function () {
    return redraw(progressText(scanNextInQueue()), false);
  });
}

// A Suspicious / Malicious row was tapped: check it again (headers only) and show all the reasons.
function onRowClick(e) {
  return safely(function () {
    const card = buildDetailsCard(scanOneEmail(e.commonEventObject.parameters.id));
    return CardService.newActionResponseBuilder().setNavigation(CardService.newNavigation().pushCard(card)).build();
  });
}

// A small pop-up message at the bottom of the screen.
function notify(text) {
  return CardService.newActionResponseBuilder()
    .setNotification(CardService.newNotification().setText(ltr(text)))
    .build();
}
