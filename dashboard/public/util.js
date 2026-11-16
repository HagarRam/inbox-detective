// util.js
// Small helpers shared by the other dashboard files.
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

// Read a color token from style.css, e.g. color("--accent"), in the CURRENT theme.
function color(name) {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

// Simple line icons, drawn with SVG (24x24 grid). Each one is a list of shapes.
const ICONS = {
  mail: [["path", "M3 6h18v12H3z"], ["path", "M3 7l9 6 9-6"]],
  malicious: [["circle", ""], ["path", "M9 9l6 6M15 9l-6 6"]],
  suspicious: [["path", "M12 3l10 18H2z"], ["path", "M12 10v4M12 17v1"]],
  safe: [["circle", ""], ["path", "M8 12l3 3 5-6"]],
  campaign: [["path", "M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1"], ["path", "M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"]],
};

// Build an icon with createElementNS (the safe way to make SVG; no innerHTML).
function icon(name) {
  const ns = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(ns, "svg");
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("aria-hidden", "true"); // the word next to it is what screen readers read
  svg.setAttribute("class", "icon");
  for (const [shape, d] of ICONS[name]) {
    const part = document.createElementNS(ns, shape);
    if (shape === "circle") {
      part.setAttribute("cx", "12"); part.setAttribute("cy", "12"); part.setAttribute("r", "9");
    } else {
      part.setAttribute("d", d);
    }
    svg.appendChild(part);
  }
  return svg;
}

// Every verdict has a word, an icon and a color token. Never color alone.
const VERDICTS = {
  malicious: { word: "Malicious", icon: "malicious", token: "--malicious", css: "malicious" },
  suspicious: { word: "Suspicious", icon: "suspicious", token: "--suspicious", css: "suspicious" },
  "likely safe": { word: "Likely safe", icon: "safe", token: "--safe", css: "safe" },
};

// A small colored tag: icon + word, e.g. [x Malicious].
function verdictPill(verdict) {
  const v = VERDICTS[verdict] || VERDICTS.suspicious;
  const pill = el("span", undefined, "pill pill-" + v.css);
  pill.appendChild(icon(v.icon));
  pill.appendChild(document.createTextNode(v.word));
  return pill;
}

// Show a friendly "No data yet" message in an element.
function showEmpty(box, message) {
  box.replaceChildren(el("p", message || "No data yet.", "empty"));
}
