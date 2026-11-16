// Homepage.gs
// The add-on "home screen": shown when NO email is open.
//   Step 1: find emails (unread inbox emails, or a Gmail search)
//   Step 2: tick the emails to check
//   Step 3: scan them WITHOUT opening them; the Scan overview card opens on top
//   Dashboard (whole mailbox): a separate section at the bottom
// This file builds the card and handles the clicks; ScannerCard.gs and Overview.gs build the pieces.

function onHomepage(e) {
  try {
    saveListState(newListState("", false)); // always start at page 1, unread only
    return buildHomepageCard(false);
  } catch (err) {
    console.error(err);
    return buildErrorCard(err.message);
  }
}

// tickAll = true when "Tick all (this page)" was clicked.
function buildHomepageCard(tickAll) {
  const state = getListState();
  const page = listPage(listQuery(state), state.tokens[state.page], PAGE_SIZE);
  state.next = page.nextPageToken; // remembered for the "Next" button
  saveListState(state);
  const rows = getRows(page.ids);
  savePageRows(rows); // the Scan overview shows this same page
  const welcome = textLine(ltr("Check emails <b>before</b> you open them. Only the sender headers are read; links and attachments are checked when you open an email. Scores are estimates."));
  return CardService.newCardBuilder()
    .setHeader(cardHeader("Is someone targeting you?"))
    .addSection(CardService.newCardSection().addWidget(welcome))
    .addSection(findSection(state))
    .addSection(listSection(state, rows, tickAll))
    .addSection(scanSection(getQueue()))
    .addSection(dashboardSection())
    .build();
}

// The dashboard part, clearly separate: the bulk scan reads ALL emails (not only unread).
function dashboardSection() {
  const explain = textLine(ltr("Reads sender headers of your whole mailbox, " + CHUNK_SIZE + " per click, to find campaigns. Not needed to check single emails."));
  const buttons = CardService.newButtonSet()
    .addButton(actionButton("Scan mailbox (next " + CHUNK_SIZE + ")", "onMailboxScanClick"))
    .addButton(actionButton("Open dashboard", "onOpenDashboardClick"));
  return CardService.newCardSection().setHeader(ltr("Dashboard (whole mailbox)")).addWidget(explain).addWidget(buttons);
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
function redraw(text, tickAll) {
  const response = CardService.newActionResponseBuilder()
    .setNavigation(CardService.newNavigation().updateCard(buildHomepageCard(tickAll)));
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

// After a scan: refresh the home screen (new tags), then show the Scan overview on top.
function showOverview(text) {
  const home = buildHomepageCard(false); // first: it also saves the rows the overview shows
  const overview = buildOverviewCard();
  const nav = CardService.newNavigation().popToRoot().updateCard(home).pushCard(overview);
  const response = CardService.newActionResponseBuilder().setNavigation(nav);
  if (text) response.setNotification(CardService.newNotification().setText(ltr(text)));
  return response.build();
}

function onSearchClick(e) {
  return safely(function () {
    const inputs = e.commonEventObject.formInputs || {};
    const query = inputs.query ? String(inputs.query.stringInputs.value[0]).trim().slice(0, 200) : "";
    saveListState(newListState(query, getListState().showRead));
    return redraw("", false);
  });
}

function onClearClick(e) {
  return safely(function () {
    saveListState(newListState("", getListState().showRead));
    return redraw("", false);
  });
}

// The "Show read emails too" switch: on = it is in the form, off = it is missing.
function onShowReadChange(e) {
  return safely(function () {
    const inputs = e.commonEventObject.formInputs || {};
    saveListState(newListState(getListState().query, Boolean(inputs.show_read)));
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
    return showOverview(progressText(startScan(ids)));
  });
}

function onTickAllClick(e) {
  return safely(function () {
    return redraw("All emails on this page are ticked. Click Scan ticked emails.", true);
  });
}

function onContinueScanClick(e) {
  return safely(function () {
    return showOverview(progressText(scanNextInQueue()));
  });
}

// "Scan the rest" on the Scan overview: every email of the page that has no result yet.
function onScanRestClick(e) {
  return safely(function () {
    const ids = countRows(getPageRows(), getChips()).unscanned;
    if (ids.length === 0) return notify("Every email on this page is scanned.");
    return showOverview(progressText(startScan(ids)));
  });
}

function onOverviewClick(e) {
  return safely(function () {
    return CardService.newActionResponseBuilder().setNavigation(CardService.newNavigation().pushCard(buildOverviewCard())).build();
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
