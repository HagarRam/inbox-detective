// analyzers/index.js
// The list of all checks. analyze.js runs every one of them.
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

module.exports = { ALL_CHECKS };
