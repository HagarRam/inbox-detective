// analyzers/index.js
// The lists of checks. analyze.js runs them.
// To add a new check: write it in its own file and add it here.

const { checkAuthentication } = require("./authentication");
const { checkReplyTo, checkReturnPath } = require("./senderMismatch");
const { checkDisplayNameSpoof } = require("./displayName");
const { checkLinkMismatch } = require("./linkMismatch");
const { checkSuspiciousUrls } = require("./suspiciousUrls");
const { checkAttachments } = require("./attachments");
const { checkContent } = require("./content");

const ALL_CHECKS = [
  checkAuthentication,
  checkReplyTo,
  checkReturnPath,
  checkDisplayNameSpoof,
  checkLinkMismatch,
  checkSuspiciousUrls,
  checkAttachments,
  checkContent,
];

// The checks that need only the sender headers (no body, no links, no attachments).
// Used by the headers-only scan BEFORE the email is opened.
const HEADER_CHECKS = [
  checkAuthentication,
  checkReplyTo,
  checkReturnPath,
  checkDisplayNameSpoof,
];

module.exports = { ALL_CHECKS, HEADER_CHECKS };
