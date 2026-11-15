// collectDomains.test.js: which domains of an email we investigate.

const test = require("node:test");
const assert = require("node:assert");
const { collectDomains } = require("../intel/collectDomains");

test("collects sender, reply-to, return-path and link domains, once each", () => {
  const email = {
    from: { domain: "Sender.example" },
    replyTo: [{ domain: "reply.example" }],
    returnPath: { domain: "sender.example" },
    links: [
      { href: "https://link.example/a", text: "" },
      { href: "http://192.0.2.1/login", text: "" }, // an IP, not a domain: skipped
      { href: "mailto:x@mail.example", text: "" }, // not a web link: skipped
    ],
  };
  assert.deepStrictEqual(collectDomains(email), ["sender.example", "reply.example", "link.example"]);
});
