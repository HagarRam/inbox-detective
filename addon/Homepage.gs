// Homepage.gs
// The add-on "home screen": shown when NO email is open. Top to bottom:
//   search -> alert after a scan ("View results") -> "Unread emails" (not scanned yet, tick them)
//   -> Previous / Next, Page N -> "Scan N ticked emails" -> "Tick all on this page"
//   -> "Already scanned" (with their tags; a tap opens the details, not the email).
// "Open dashboard" is in the fixed footer, so it is always visible without scrolling.
// The card menu (the three dots) has the whole-mailbox scan and "Reset scan history".
// This file builds the card and handles the clicks; ScannerCard.gs and Overview.gs build the pieces.

function onHomepage(e) {
  try {
    saveListState(newListState("")); // always start at page 1, no search
    return buildHomepageCard(getQueue().ids, false);
  } catch (err) {
    console.error(err);
    return buildErrorCard(err.message);
  }
}

// ticked = the ids to show as ticked. useSavedPage = true: redraw the same page without asking Gmail.
function buildHomepageCard(ticked, useSavedPage) {
  const rows = useSavedPage ? getPageRows() : loadPageRows();
  const menu = CardService.newCardAction().setText("Scan whole mailbox (for dashboard)")
    .setOnClickAction(CardService.newAction().setFunctionName("onMailboxScanClick"));
  const reset = CardService.newCardAction().setText("Reset scan history")
    .setOnClickAction(CardService.newAction().setFunctionName("onResetClick"));
  const count = rows.filter(function (row) { return ticked.indexOf(row.id) !== -1; }).length;
  return CardService.newCardBuilder()
    .addSection(topSection())
    .addSection(listSection(rows, ticked))
    .addSection(actionsSection(count))
    .addSection(alreadyScannedSection(getScannedRows(), getChips(), getListState()))
    .addCardAction(menu)
    .addCardAction(reset)
    .setFixedFooter(dashboardFooter())
    .build();
}

// The list works like a queue: first take up to 200 unread emails (ids only, one cheap call),
// split them into "not scanned yet" and "already scanned", THEN cut pages of 25.
// Scanned or opened emails leave the list and the next ones move up.
// Sender and subject are loaded (in one go) only for the 25 shown + the scanned ones shown below.
function loadPageRows() {
  const state = getListState();
  const chips = getChips();
  const all = listPage(listQuery(state), "", MAX_LISTED).ids;
  const notScanned = all.filter(function (id) { return !chips[id]; });
  const scanned = all.filter(function (id) { return chips[id]; });
  const start = state.page * PAGE_SIZE;
  state.next = notScanned.length > start + PAGE_SIZE ? "more" : ""; // "" = this is the last page
  state.total = all.length;
  state.checked = scanned.length;
  saveListState(state);
  const rows = getRows(notScanned.slice(start, start + PAGE_SIZE).concat(scanned.slice(0, MAX_ALREADY_SCANNED)));
  const pageRows = rows.filter(function (row) { return !chips[row.id]; });
  savePageRows(pageRows);
  saveRows("SCANNED_ROWS", rows.filter(function (row) { return chips[row.id]; }));
  return pageRows;
}

// The search field, "Checked 12 of 50 unread emails", and the alert after a scan.
function topSection() {
  const state = getListState();
  const section = CardService.newCardSection().addWidget(searchInput(state.query));
  const progress = progressLine(state);
  if (progress) section.addWidget(textLine("<b>" + ltr(progress) + "</b>"));
  for (const widget of alertWidgets(getLastScan())) section.addWidget(widget);
  return section;
}

// "Unread emails": the rows, then the pager at the bottom.
function listSection(rows, ticked) {
  const section = CardService.newCardSection().setHeader(ltr("Unread emails"));
  if (rows.length === 0) section.addWidget(textLine(ltr("No unread emails to check here.")));
  for (const row of rows) section.addWidget(emailRow(row, ticked.indexOf(row.id) !== -1));
  for (const widget of pagerWidgets(getListState())) section.addWidget(widget);
  return section;
}

// Each button in its own row: Scan, then Tick all under it.
function actionsSection(tickedCount) {
  return CardService.newCardSection()
    .addWidget(scanButton(tickedCount))
    .addWidget(tickAllButton());
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

// ---- Clicks on the home screen ----

// Redraw the home screen in place, with a short pop-up message.
function redraw(text, ticked, useSavedPage) {
  const response = CardService.newActionResponseBuilder()
    .setNavigation(CardService.newNavigation().updateCard(buildHomepageCard(ticked, useSavedPage)));
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

// Runs when Enter is pressed in the search field. Empty = the normal list.
function onSearchClick(e) {
  return safely(function () {
    const inputs = e.commonEventObject.formInputs || {};
    const query = inputs.query ? String(inputs.query.stringInputs.value[0]).trim().slice(0, 200) : "";
    saveListState(newListState(query));
    return redraw("", [], false);
  });
}

// A box was ticked or unticked: redraw the same page so the Scan button shows the new count.
function onTickChange(e) {
  return safely(function () {
    return redraw("", pickedIds(e), true);
  });
}

function onNextClick(e) {
  return safely(function () {
    const state = getListState();
    if (!state.next) return notify("This is the last page.");
    state.page += 1;
    saveListState(state);
    return redraw("", [], false);
  });
}

function onPreviousClick(e) {
  return safely(function () {
    const state = getListState();
    state.page = Math.max(0, state.page - 1);
    saveListState(state);
    return redraw("", [], false);
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

// Scan the ticked emails (5 per click). The ones left stay ticked for the next click.
// If a scan is already running (emails left from the last click), the results are added to it.
function onScanSelectedClick(e) {
  return safely(function () {
    const ids = pickedIds(e);
    if (ids.length === 0) return notify("Tick at least one email first.");
    const progress = startScan(ids, getQueue().ids.length === 0);
    return redraw(progressText(progress), getQueue().ids, false);
  });
}

function onTickAllClick(e) {
  return safely(function () {
    const ids = getPageRows().map(function (row) { return row.id; });
    return redraw("", ids, true);
  });
}

// "Scan the rest" on the Scan overview: the emails of the page that have no result yet.
function onScanRestClick(e) {
  return safely(function () {
    const ids = unscannedIds();
    if (ids.length === 0) return notify("Every email on this page is scanned.");
    const progress = startScan(ids, false);
    const home = buildHomepageCard(getQueue().ids, false); // first: it also saves the new page
    const nav = CardService.newNavigation().popToRoot().updateCard(home).pushCard(buildOverviewCard());
    return CardService.newActionResponseBuilder().setNavigation(nav)
      .setNotification(CardService.newNotification().setText(ltr(progressText(progress)))).build();
  });
}

function onOverviewClick(e) {
  return safely(function () {
    return CardService.newActionResponseBuilder().setNavigation(CardService.newNavigation().pushCard(buildOverviewCard())).build();
  });
}

// Menu (three dots) -> "Reset scan history": every unread email shows again as not scanned.
function onResetClick(e) {
  return safely(function () {
    resetScanHistory();
    return redraw("Scan history cleared. Every unread email can be checked again.", [], false);
  });
}

// "Back to list" on the Scan overview.
function onBackToListClick(e) {
  return CardService.newActionResponseBuilder().setNavigation(CardService.newNavigation().popToRoot()).build();
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
