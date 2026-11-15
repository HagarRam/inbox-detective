// senderMismatch.js
// Checks if the addresses around the sender point to other domains.
//   Reply-To    = where your answer goes when you press "Reply"
//   Return-Path = where bounce messages go

const { finding } = require("./finding");

// Reply-To on a different domain: you think you answer the bank,
// but your answer goes to the attacker.
function checkReplyTo(email) {
  if (!email.from) return [];
  for (const reply of email.replyTo) {
    if (reply.domain !== email.from.domain) {
      return [finding("reply_to_mismatch", 20, "Replies go to a different domain",
        "The email is from " + email.from.domain + ", but Reply goes to " + reply.domain + ".")];
    }
  }
  return [];
}

// Return-Path on a different domain. Low points, because mailing
// services (newsletters) do this legitimately.
function checkReturnPath(email) {
  if (!email.from || !email.returnPath) return [];
  const fromDomain = email.from.domain;
  const bounceDomain = email.returnPath.domain;

  // Same domain, or a subdomain of it (bounces.github.com for github.com), is normal.
  if (bounceDomain === fromDomain || bounceDomain.endsWith("." + fromDomain)) return [];

  return [finding("return_path_mismatch", 5, "Bounce address uses a different domain",
    "Return-Path is " + bounceDomain + ", From is " + fromDomain + ". Common for mailing services, but also for spoofed mail.")];
}

module.exports = { checkReplyTo, checkReturnPath };
