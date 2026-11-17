// app.js
// Loads /dashboard/data and fills the page: tiles, tables and lists.
// The charts are in charts.js, the campaign graph in graph.js, helpers in util.js.

// Charts and the graph drawn so far, so we can redraw them when the theme changes.
let visuals = [];
let lastData = null;

// Draw (or redraw) everything that is painted on a canvas, in the current theme colors.
function drawVisuals(data) {
  for (const visual of visuals) visual.destroy(); // remove the old ones first
  setupChartMotion(); // short Chart.js animation, or none with reduced motion
  Chart.defaults.color = color("--muted"); // axis labels and legend text
  Chart.defaults.borderColor = color("--border"); // grid lines
  Chart.defaults.font.family = "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif";
  const drawn = [drawTimeline(data.timeline), drawScamTypes(data.scamTypes), drawGraph(data.graph, data.campaigns)];
  visuals = drawn.filter((v) => v !== null); // an empty chart draws nothing
}

// theme.js sends "themechange" when the theme switches.
document.addEventListener("themechange", () => {
  if (lastData) drawVisuals(lastData);
});

// One stat tile: icon, big number, label, and a small line under it.
function makeTile(iconName, num, label, sub, css) {
  const tile = el("div", undefined, "tile " + css);
  const head = el("div", undefined, "tile-head");
  head.appendChild(icon(iconName));
  head.appendChild(el("span", label));
  tile.appendChild(head);
  tile.appendChild(el("div", "0", "num")); // the real number counts up later (see drawSummary)
  tile.appendChild(el("div", sub, "label"));
  return tile;
}

function drawSummary(summary, campaigns) {
  const total = summary.total || 0;
  let linked = 0; // how many emails belong to some campaign
  for (const c of campaigns) linked += c.emails.length;
  const box = document.getElementById("summary");
  box.replaceChildren(); // remove the loading placeholders
  const tiles = [makeTile("mail", total, "Emails scanned", "headers only", "")];
  const targets = [total];
  for (const key of ["malicious", "suspicious", "likely safe"]) {
    const v = VERDICTS[key];
    tiles.push(makeTile(v.icon, summary[key] || 0, v.word, (summary[key] || 0) + " of " + total + " (estimate)", "tile-" + v.css));
    targets.push(summary[key] || 0);
  }
  tiles.push(makeTile("campaign", summary.campaigns || 0, "Campaigns", linked + " emails linked (estimate)", ""));
  targets.push(summary.campaigns || 0);
  for (const tile of tiles) box.appendChild(tile);
  // The numbers count up from 0 the first time the tiles are on screen.
  onFirstView(box, () => {
    tiles.forEach((tile, i) => countUp(tile.querySelector(".num"), targets[i]));
  });
}

// A score bar: the colored part is the score out of 100.
function scoreBar(score, verdict) {
  const cell = el("div", undefined, "score");
  const bar = el("div", undefined, "bar");
  const fill = el("div", undefined, "fill fill-" + (VERDICTS[verdict] || VERDICTS.suspicious).css);
  fill.style.width = "0%"; // starts empty; drawSenders fills it (set from JS, which our CSP allows)
  fill.dataset.score = score;
  bar.appendChild(fill);
  cell.appendChild(bar);
  cell.appendChild(el("span", score, "score-num"));
  return cell;
}

function drawSenders(senders) {
  const body = document.querySelector("#senders tbody");
  if (senders.length === 0) return showEmpty(document.getElementById("senders-box"));
  for (const s of senders) {
    const row = el("tr");
    row.appendChild(el("td", s.name || "(no name)"));
    row.appendChild(el("td", s.domain));
    const verdictCell = el("td");
    verdictCell.appendChild(verdictPill(s.verdict));
    row.appendChild(verdictCell);
    const scoreCell = el("td");
    scoreCell.appendChild(scoreBar(s.maxScore, s.verdict));
    row.appendChild(scoreCell);
    row.appendChild(el("td", s.emails, "num-cell"));
    body.appendChild(row);
  }
  // The bars grow to their score the first time the table is on screen (CSS transition).
  onFirstView(body, () => {
    for (const fill of body.querySelectorAll(".fill")) fill.style.width = fill.dataset.score + "%";
  });
}

function drawImpersonation(list) {
  const body = document.querySelector("#impersonation tbody");
  if (list.length === 0) return showEmpty(document.getElementById("impersonation-box"), "No brand impersonation found.");
  for (const i of list) {
    const row = el("tr");
    row.appendChild(el("td", i.brand, "brand-cell"));
    row.appendChild(el("td", i.domains.join(", ")));
    row.appendChild(el("td", i.emails, "num-cell"));
    body.appendChild(row);
  }
}

function drawCampaign(campaign) {
  const box = el("div", undefined, "campaign");
  box.appendChild(el("strong", "Campaign " + campaign.id + ": " + campaign.emails.length + " emails, " + campaign.domains.length + " domains"));
  const list = el("ul");
  for (const email of campaign.emails) {
    list.appendChild(el("li", email.subject + "  (from " + (email.from ? email.from.domain : "?") + ")"));
  }
  box.appendChild(list);
  box.appendChild(el("div", "Shared infrastructure (weight in brackets):", "small muted"));
  for (const reason of campaign.sharedInfrastructure) box.appendChild(el("span", reason, "chip"));
  return box;
}

function drawCampaigns(campaigns) {
  const box = document.getElementById("campaigns");
  for (const campaign of campaigns) box.appendChild(drawCampaign(campaign));
}

function drawRecommendations(tips) {
  const list = document.getElementById("recommendations");
  if (tips.length === 0) return showEmpty(list, "Nothing to recommend yet.");
  for (const tip of tips) {
    const item = el("li");
    item.appendChild(el("span", tip.who, "who who-" + tip.who.toLowerCase()));
    item.appendChild(el("span", tip.text));
    item.appendChild(el("span", tip.because, "small muted because"));
    list.appendChild(item);
  }
}

async function main() {
  setupReveal(); // sections slide in as you scroll
  const response = await fetch("/dashboard/data");
  if (!response.ok) {
    document.querySelector("main").replaceChildren(el("p", "Session expired. Open the dashboard again from the Gmail add-on."));
    return;
  }
  const data = await response.json();
  lastData = data;
  drawSummary(data.summary, data.campaigns);
  drawVisuals(data);
  drawCampaigns(data.campaigns);
  drawSenders(data.riskiestSenders);
  drawImpersonation(data.impersonation);
  drawRecommendations(data.recommendations);
  document.body.classList.remove("loading"); // hide the loading placeholders
}

main();
