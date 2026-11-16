// buildDashboard.js
// All scan records in -> everything the dashboard page shows, out.
// Pure function: no network, no files. Easy to test.

const { buildCampaigns } = require("../campaign/buildCampaigns");
const { LINK_THRESHOLD } = require("../campaign/clusters");
const { buildImpersonationMap } = require("../campaign/impersonation");
const { findSenderDrift } = require("../campaign/senderDrift");
const { scamType } = require("./scamTypes");
const { buildRecommendations } = require("./recommendations");

function countBy(list, keyOf) {
  const counts = {};
  for (const item of list) {
    const key = keyOf(item);
    counts[key] = (counts[key] || 0) + 1;
  }
  return counts;
}

// Per day: how many malicious / suspicious / safe emails arrived.
function buildTimeline(records) {
  const days = {};
  for (const r of records) {
    const day = (r.date || "unknown").slice(0, 10);
    if (!days[day]) days[day] = { day, malicious: 0, suspicious: 0, "likely safe": 0 };
    days[day][r.verdict]++;
  }
  return Object.values(days).sort((a, b) => a.day.localeCompare(b.day));
}

// Sender domains with the highest score first. "verdict" is the verdict of the
// sender's highest-scoring email (already computed by score.js; nothing new here).
function buildRiskiestSenders(riskyRecords) {
  const byDomain = new Map();
  for (const r of riskyRecords) {
    const domain = r.from ? r.from.domain : "unknown";
    const entry = byDomain.get(domain) || { domain, emails: 0, maxScore: -1, name: r.from ? r.from.name : "" };
    entry.emails++;
    if (r.score > entry.maxScore) {
      entry.maxScore = r.score;
      entry.verdict = r.verdict;
    }
    byDomain.set(domain, entry);
  }
  return [...byDomain.values()].sort((a, b) => b.maxScore - a.maxScore || b.emails - a.emails).slice(0, 10);
}

// The worst verdict among the emails that use each domain, e.g. { "x.example": "malicious" }.
function worstVerdictByDomain(records) {
  const rank = { "likely safe": 0, suspicious: 1, malicious: 2 };
  const worst = {};
  for (const r of records) {
    for (const item of r.intel || []) {
      const old = worst[item.domain];
      if (!old || rank[r.verdict] > rank[old]) worst[item.domain] = r.verdict;
    }
  }
  return worst;
}

// Graph for vis-network: domains are dots, strong links are lines.
function buildGraph(campaigns, links, records) {
  const verdicts = worstVerdictByDomain(records);
  const nodes = [];
  for (const c of campaigns) {
    for (const domain of c.domains) nodes.push({ id: domain, label: domain, group: c.id, verdict: verdicts[domain] || "suspicious" });
  }
  const inGraph = new Set(nodes.map((n) => n.id));
  const edges = [];
  for (const l of links) {
    if (l.weight >= LINK_THRESHOLD && inGraph.has(l.a) && inGraph.has(l.b)) {
      edges.push({ from: l.a, to: l.b, value: l.weight, title: l.reasons.join("\n") });
    }
  }
  return { nodes, edges };
}

function buildDashboard(records) {
  const risky = records.filter((r) => r.verdict !== "likely safe");
  const { campaigns, links } = buildCampaigns(risky);
  return {
    summary: { total: records.length, ...countBy(records, (r) => r.verdict), campaigns: campaigns.length },
    timeline: buildTimeline(records),
    scamTypes: countBy(risky, scamType),
    campaigns,
    graph: buildGraph(campaigns, links, risky),
    impersonation: buildImpersonationMap(risky),
    senderDrift: findSenderDrift(records),
    riskiestSenders: buildRiskiestSenders(risky),
    recommendations: buildRecommendations(risky, campaigns),
  };
}

module.exports = { buildDashboard };
