// clusters.js
// Groups domains that are strongly linked, directly or through each other.
// If A is linked to B, and B to C, then A, B and C are one group.

// A link must be at least this strong to count (e.g. one rare name server + same day).
const LINK_THRESHOLD = 4;

// domain -> list of strongly linked neighbour domains
function buildNeighbours(links) {
  const neighbours = new Map();
  for (const link of links) {
    if (link.weight < LINK_THRESHOLD) continue;
    if (!neighbours.has(link.a)) neighbours.set(link.a, []);
    if (!neighbours.has(link.b)) neighbours.set(link.b, []);
    neighbours.get(link.a).push(link.b);
    neighbours.get(link.b).push(link.a);
  }
  return neighbours;
}

// Walk from one domain to everything reachable from it ("flood fill").
function collectGroup(start, neighbours, seen) {
  const group = [];
  const toVisit = [start];
  seen.add(start);
  while (toVisit.length > 0) {
    const domain = toVisit.pop();
    group.push(domain);
    for (const next of neighbours.get(domain) || []) {
      if (!seen.has(next)) {
        seen.add(next);
        toVisit.push(next);
      }
    }
  }
  return group.sort();
}

// Returns groups of 2+ domains, e.g. [["a.example", "b.example"], ...]
function findClusters(links) {
  const neighbours = buildNeighbours(links);
  const seen = new Set();
  const groups = [];
  for (const domain of neighbours.keys()) {
    if (!seen.has(domain)) groups.push(collectGroup(domain, neighbours, seen));
  }
  return groups;
}

module.exports = { findClusters, LINK_THRESHOLD };
