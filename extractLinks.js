// extractLinks.js
// Finds every link in the email body as { href, text }:
//   href = where the link really goes
//   text = what the reader sees
//
// Why an HTML parser (htmlparser2) and not a regex:
// attackers write messy HTML on purpose (extra attributes, line breaks,
// tags inside the link) to hide links from simple pattern matching.
// A real parser reads HTML the way a browser does.

const { Parser } = require("htmlparser2");

function extractHtmlLinks(html) {
  const links = [];
  let current = null; // the <a> tag we are inside right now, or null

  const parser = new Parser({
    // Called for every opening tag, e.g. <a href="...">
    onopentag(name, attributes) {
      if (name === "a" && attributes.href) {
        current = { href: attributes.href.trim(), text: "" };
      }
    },
    // Called for every piece of text. Inside a link, we keep it.
    ontext(text) {
      if (current) current.text += text;
    },
    // Called for every closing tag, e.g. </a>
    onclosetag(name) {
      if (name === "a" && current) {
        current.text = current.text.replace(/\s+/g, " ").trim(); // squash spaces and newlines into one space
        links.push(current);
        current = null;
      }
    },
  });
  parser.write(html);
  parser.end();
  return links;
}

// Plain-text emails have no <a> tags, so we look for bare web addresses.
function extractTextLinks(text) {
  // Find "http://" or "https://" followed by anything that is not a space or bracket.
  const urls = text.match(/https?:\/\/[^\s<>"')]+/gi) || [];
  const links = [];
  for (const url of urls) {
    links.push({ href: url, text: url });
  }
  return links;
}

module.exports = { extractHtmlLinks, extractTextLinks };
