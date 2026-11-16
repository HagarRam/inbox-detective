// graph.js
// The campaign graph (vis-network): each dot is a domain, colored by verdict;
// a line means two domains share rare infrastructure. Click a dot for details.

// Above this many dots, names are shown only on hover, so labels do not pile up.
const MAX_LABELED_NODES = 25;

// One dot: color by verdict, plain-text tooltip (vis-network shows it as text, not HTML).
function toNode(node, showLabel) {
  const v = VERDICTS[node.verdict] || VERDICTS.suspicious;
  const fill = color(v.token);
  return {
    id: node.id,
    label: showLabel ? node.label : undefined,
    title: node.label + " | " + v.word + " | campaign " + node.group,
    color: { background: fill, border: fill, highlight: { background: fill, border: color("--text") } },
  };
}

function drawGraph(graph, campaigns) {
  const box = document.getElementById("graph");
  box.replaceChildren(); // empty the box before (re)drawing
  if (graph.nodes.length === 0) {
    showEmpty(box, "No campaigns found yet.");
    return null;
  }
  const showLabels = graph.nodes.length <= MAX_LABELED_NODES;
  const options = {
    nodes: { shape: "dot", size: 12, font: { color: color("--text"), size: 12, vadjust: 4 } },
    edges: { color: { color: color("--muted") }, scaling: { min: 1, max: 6 }, smooth: false },
    physics: { barnesHut: { springLength: 160, avoidOverlap: 0.6 }, stabilization: { iterations: 400 } },
    interaction: { hover: true, tooltipDelay: 150 },
  };
  const nodes = graph.nodes.map((n) => toNode(n, showLabels));
  const network = new vis.Network(box, { nodes, edges: graph.edges }, options);
  // vis-network makes its area focusable with Tab; give it a name for screen readers.
  const area = box.querySelector(".vis-network");
  if (area) area.setAttribute("aria-label", "Campaign graph: " + graph.nodes.length + " domains. The list of campaigns is below.");
  network.on("click", (event) => showNodeDetails(event.nodes[0], graph, campaigns));
  return network;
}

// Fill the details box under the graph for the clicked dot (plain text only).
function showNodeDetails(domain, graph, campaigns) {
  const box = document.getElementById("graph-details");
  if (!domain) {
    box.replaceChildren(el("p", "Click a dot to see details.", "muted"));
    return;
  }
  const node = graph.nodes.find((n) => n.id === domain);
  const campaign = campaigns.find((c) => c.id === node.group);
  const title = el("p");
  title.appendChild(el("strong", domain + "  "));
  title.appendChild(verdictPill(node.verdict));
  const info = el("p", "Campaign " + campaign.id + ": " + campaign.emails.length + " emails, " + campaign.domains.length + " domains.", "muted");
  const list = el("ul");
  for (const email of campaign.emails) list.appendChild(el("li", email.subject + " (from " + (email.from ? email.from.domain : "?") + ")"));
  box.replaceChildren(title, info, list);
}
