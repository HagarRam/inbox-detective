// app.js
// Draws the dashboard from /dashboard/data.
//
// Security: subjects, sender names and domains come from emails, which an
// attacker controls. We put them on the page ONLY with textContent (plain text),
// never as HTML, so "<script>" in a subject is shown as text and never runs.

// Create an element with plain text inside.
function el(tag, text, className) {
  const node = document.createElement(tag);
  if (text !== undefined) node.textContent = String(text);
  if (className) node.className = className;
  return node;
}

// A table row from a list of cell texts.
function addRow(tableId, cells) {
  const row = el("tr");
  for (const cell of cells) row.appendChild(el("td", cell));
  document.querySelector("#" + tableId + " tbody").appendChild(row);
}

function color(name) {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

function drawSummary(summary) {
  const tiles = [
    ["Emails scanned", summary.total || 0, ""],
    ["Malicious", summary.malicious || 0, "bad"],
    ["Suspicious", summary.suspicious || 0, "warn"],
    ["Likely safe", summary["likely safe"] || 0, "good"],
    ["Campaigns", summary.campaigns || 0, ""],
  ];
  const box = document.getElementById("summary");
  for (const [label, num, cls] of tiles) {
    const tile = el("div", undefined, "tile");
    tile.appendChild(el("div", num, "num " + cls));
    tile.appendChild(el("div", label, "label"));
    box.appendChild(tile);
  }
}

function drawTimeline(timeline) {
  const series = [["malicious", "--bad"], ["suspicious", "--warn"], ["likely safe", "--good"]];
  const datasets = series.map(([key, c]) => ({ label: key, data: timeline.map((d) => d[key]), backgroundColor: color(c) }));
  new Chart(document.getElementById("timeline"), {
    type: "bar",
    data: { labels: timeline.map((d) => d.day), datasets },
    options: { maintainAspectRatio: false, scales: { x: { stacked: true }, y: { stacked: true, ticks: { precision: 0 } } } },
  });
}

function drawScamTypes(scamTypes) {
  const labels = Object.keys(scamTypes);
  new Chart(document.getElementById("scamTypes"), {
    type: "bar",
    data: { labels, datasets: [{ label: "emails", data: labels.map((l) => scamTypes[l]), backgroundColor: color("--accent") }] },
    options: { indexAxis: "y", maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { x: { ticks: { precision: 0 } } } },
  });
}

function drawGraph(graph) {
  const box = document.getElementById("graph");
  if (graph.nodes.length === 0) {
    box.appendChild(el("p", "No campaigns found yet.", "muted"));
    return;
  }
  const options = {
    nodes: { shape: "dot", size: 14, font: { color: color("--text"), size: 14 } },
    edges: { color: { color: color("--muted") }, scaling: { min: 1, max: 6 } },
    physics: { stabilization: true },
  };
  new vis.Network(box, { nodes: graph.nodes, edges: graph.edges }, options);
}

function drawCampaign(campaign) {
  const box = el("div", undefined, "campaign");
  box.appendChild(el("strong", "Campaign " + campaign.id + ": " + campaign.emails.length + " emails, " + campaign.domains.length + " domains"));
  const list = el("ul");
  for (const email of campaign.emails) {
    list.appendChild(el("li", email.subject + "  (from " + (email.from ? email.from.domain : "?") + ")"));
  }
  box.appendChild(list);
  box.appendChild(el("div", "Shared infrastructure:", "muted"));
  for (const reason of campaign.sharedInfrastructure) box.appendChild(el("span", reason, "chip"));
  return box;
}

function drawCampaigns(campaigns) {
  const box = document.getElementById("campaigns");
  for (const campaign of campaigns) box.appendChild(drawCampaign(campaign));
}

function drawDrift(drift) {
  const box = document.getElementById("drift");
  if (drift.length === 0) box.appendChild(el("p", "No sender drift found.", "muted"));
  for (const d of drift) {
    box.appendChild(el("strong", '"' + d.name + '"'));
    const list = el("ul");
    for (const h of d.history) list.appendChild(el("li", (h.firstSeen || "").slice(0, 10) + "  " + h.domain + "  [" + h.infrastructure + "]"));
    box.appendChild(list);
  }
}

function drawRecommendations(tips) {
  const list = document.getElementById("recommendations");
  for (const tip of tips) {
    const item = el("li");
    item.appendChild(el("span", tip.who + ": ", "who"));
    item.appendChild(document.createTextNode(tip.text + " "));
    item.appendChild(el("span", "(" + tip.because + ")", "muted"));
    list.appendChild(item);
  }
}

async function main() {
  const response = await fetch("/dashboard/data");
  if (!response.ok) {
    document.querySelector("main").replaceChildren(el("p", "Session expired. Open the dashboard again from the Gmail add-on."));
    return;
  }
  const data = await response.json();
  drawSummary(data.summary);
  drawTimeline(data.timeline);
  drawScamTypes(data.scamTypes);
  drawGraph(data.graph);
  drawCampaigns(data.campaigns);
  for (const i of data.impersonation) addRow("impersonation", [i.brand, i.domains.join(", "), i.emails]);
  drawDrift(data.senderDrift);
  for (const s of data.riskiestSenders) addRow("senders", [s.name, s.domain, s.emails, s.maxScore]);
  drawRecommendations(data.recommendations);
}

main();
