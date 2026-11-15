// demoMailboxData.js
// The 50 FICTIONAL demo emails: who sends them, when, and what they say.
// Phishing domains end with ".example" (reserved, never real). Normal emails come
// from example.org / example.com / example.net (also reserved), plus GitHub.

// <a href="real">shown text</a>
function link(href, text) {
  return '<p><a href="' + href + '">' + text + "</a></p>";
}

// ---------- Phishing campaign 1: "bank" + "PayPal" on the same server ----------
const bankAndPaypal = [
  { name: "Bank Security", from: "alerts@secure-bank-login.example", replyTo: "collect@other-domain.example", returnPath: "bounce@mailer-xyz.example", auth: "fail", date: "2026-11-04T08:10:00Z",
    subject: "Urgent: your account will be closed", body: "<p>Urgent: verify your account within 24 hours or your account will be closed.</p>" + link("http://login-update.example/verify?id=11", "mybank.com/secure") },
  { name: "Bank Security", from: "alerts@secure-bank-login.example", replyTo: "collect@other-domain.example", returnPath: "bounce@mailer-xyz.example", auth: "fail", date: "2026-11-06T17:45:00Z",
    subject: "Unusual transfer blocked - confirm your identity", body: "<p>We blocked a transfer of 2,400 USD. Confirm your identity immediately to release your account.</p>" + link("http://login-update.example/confirm?id=12", "mybank.com/security") },
  { name: "Bank Security Team", from: "notice@secure-bank-login.example", returnPath: "bounce@mailer-xyz.example", auth: "fail", date: "2026-11-09T06:20:00Z",
    subject: "Final notice: update your card details", body: "<p>Final notice: update your card details today or your card will be suspended.</p>" + link("http://login-update.example/card?id=13", "Update card details") },
  { name: "PayPal Service", from: "service@paypal-account-review.example", replyTo: "billing-team@fastmail-drop.example", returnPath: "bounce@bulk-sender.example", auth: "softfail", date: "2026-11-05T10:30:00Z",
    subject: "Final notice: unauthorized login on your account", body: "<p>Unauthorized login detected. Confirm your identity within 24 hours. The invoice is attached.</p>", attachment: "invoice.pdf.html" },
  { name: "PayPal", from: "security@paypal-account-review.example", replyTo: "billing-team@fastmail-drop.example", returnPath: "bounce@bulk-sender.example", auth: "softfail", date: "2026-11-07T13:05:00Z",
    subject: "Your payment of 349.99 USD is on hold", body: "<p>Your payment is on hold. Verify your account to release it.</p>" + link("https://bit.ly/demo-pp-hold", "paypal.com/resolution") },
  { name: "PayPal Resolution Center", from: "resolution@paypal-account-review.example", returnPath: "bounce@bulk-sender.example", auth: "softfail", date: "2026-11-10T09:15:00Z",
    subject: "Action required: your account is limited", body: "<p>Your account access is limited. Please confirm your password and credit card to restore it.</p>" + link("http://login-update.example/pp?id=16", "paypal.com/limits") },
  { name: "PayPal Billing", from: "billing@paypal-account-review.example", replyTo: "billing-team@fastmail-drop.example", auth: "fail", date: "2026-11-12T19:40:00Z",
    subject: "Refund pending - verify your account", body: "<p>A refund of 120 USD is pending. Verify your account to receive it.</p>" + link("http://login-update.example/refund?id=17", "paypal.com/refund") },
];

// ---------- Phishing campaign 2: fake Microsoft 365 ----------
const microsoft = [
  { name: "Microsoft 365 Admin", from: "admin@office365-support.example", auth: "fail", date: "2026-11-09T07:30:00Z",
    subject: "Your mailbox is full - act now", body: "<p>Your mailbox is full. Act now to avoid losing email.</p>" + link("https://login.microsoftonline.com@xn--microsft-login-8hb.example/auth", "login.microsoftonline.com") },
  { name: "Microsoft 365 Admin", from: "admin@office365-support.example", auth: "fail", date: "2026-11-10T11:00:00Z",
    subject: "Password expires in 24 hours", body: "<p>Your password expires within 24 hours. Keep your current password here.</p>" + link("https://xn--microsft-login-8hb.example/keep", "login.microsoftonline.com/keep") },
  { name: "Microsoft Account Team", from: "no-reply@office365-support.example", replyTo: "helpdesk@mail-collector.example", auth: "fail", date: "2026-11-11T15:20:00Z",
    subject: "Unusual sign-in activity", body: "<p>We detected unusual sign-in activity. Verify your account or it will be suspended.</p>" + link("https://xn--microsft-login-8hb.example/verify", "account.microsoft.com") },
  { name: "Microsoft 365 Admin", from: "admin@office365-support-desk.example", replyTo: "helpdesk@mail-collector.example", auth: "fail", date: "2026-11-12T08:00:00Z",
    subject: "Your password expires today", body: "<p>Your password expires today. Confirm your password to keep access.</p>" + link("http://192.0.2.44/owa/login", "login.microsoftonline.com") },
  { name: "Office 365 Support", from: "support@office365-support-desk.example", replyTo: "helpdesk@mail-collector.example", auth: "fail", date: "2026-11-13T09:45:00Z",
    subject: "Shared file: Q4 salary review.xlsx", body: "<p>A file was shared with you. Sign in to view it.</p>" + link("https://xn--microsft-login-8hb.example/file", "onedrive.live.com/Q4-salary-review") },
  { name: "Microsoft 365 Admin", from: "admin@office365-support-desk.example", auth: "fail", date: "2026-11-14T06:10:00Z",
    subject: "Action required: mailbox migration", body: "<p>Action required: confirm your password within 24 hours to complete the mailbox migration.</p>" + link("https://xn--microsft-login-8hb.example/migrate", "outlook.office.com") },
  { name: "Microsoft Teams", from: "teams@office365-support-desk.example", replyTo: "helpdesk@mail-collector.example", auth: "fail", date: "2026-11-14T16:30:00Z",
    subject: "You have 3 missed messages", body: "<p>You have missed messages. Sign in to read them.</p>" + link("https://xn--microsft-login-8hb.example/teams", "teams.microsoft.com") },
  { name: "Microsoft Security", from: "security@office365-support.example", auth: "fail", date: "2026-11-15T07:05:00Z",
    subject: "Final notice: verify your account", body: "<p>Final notice: verify your account now or it will be closed.</p>" + link("https://xn--microsft-login-8hb.example/final", "account.microsoft.com/security") },
];

// ---------- Phishing campaign 3: HR payroll + fake Google Docs (rare shared mail server) ----------
const hrAndDocs = [
  { name: "HR Payroll", from: "payroll@company-hr-portal.example", auth: "fail", date: "2026-11-12T10:00:00Z",
    subject: "Updated salary statement available - verify your identity", body: "<p>Your updated salary statement is ready. Verify your identity to view it.</p>" + link("http://hr-portal-login.example/verify?u=1", "hr.company.com/payroll") },
  { name: "HR Department", from: "hr@company-hr-portal.example", auth: "fail", date: "2026-11-13T12:30:00Z",
    subject: "Bonus payment: confirm your bank details", body: "<p>Your year-end bonus is approved. Please confirm your bank account details within 24 hours.</p>" + link("http://hr-portal-login.example/bonus", "hr.company.com/bonus") },
  { name: "HR Payroll", from: "payroll@company-hr-portal.example", auth: "fail", date: "2026-11-15T08:20:00Z",
    subject: "Tax form needs your signature today", body: "<p>Urgent: sign your tax form today.</p>" + link("http://hr-portal-login.example/tax", "hr.company.com/tax-form") },
  { name: "Google Docs", from: "share@docs-sharing-notify.example", auth: "fail", date: "2026-11-12T14:15:00Z",
    subject: "Noa Levi shared a document with you", body: "<p>Noa Levi shared \"Budget 2027\" with you.</p>" + link("https://xn--gogle-docs-4ib.example/view?id=88", "docs.google.com/document/budget-2027") },
  { name: "Google Drive", from: "drive@docs-sharing-notify.example", auth: "fail", date: "2026-11-13T18:00:00Z",
    subject: "Document shared: Team contacts", body: "<p>A document was shared with you. Sign in with your password to open it.</p>" + link("https://xn--gogle-docs-4ib.example/view?id=91", "drive.google.com/team-contacts") },
  { name: "Google Docs", from: "share@docs-sharing-notify.example", auth: "fail", date: "2026-11-14T11:25:00Z",
    subject: "Comment on \"Q4 plan\"", body: "<p>You were mentioned in a comment.</p>" + link("https://xn--gogle-docs-4ib.example/view?id=95", "docs.google.com/document/q4-plan") },
];

// ---------- Delivery scam (on Cloudflare: weak links, not a campaign with the others) ----------
const delivery = [
  { name: "DHL Express", from: "tracking@dhl-parcel-notice.example", auth: "fail", date: "2026-09-17T07:42:00Z",
    subject: "Your parcel could not be delivered - action required", body: "<p>Your parcel could not be delivered. Pay the 2.99 USD fee within 24 hours.</p>" + link("http://bit.ly/demo-redeliver", "dhl.com/redelivery") },
  { name: "DHL Express", from: "tracking@dhl-parcel-notice.example", auth: "fail", date: "2026-09-29T12:10:00Z",
    subject: "Customs fee required for your package", body: "<p>A customs fee is required. Enter your credit card to release the package.</p>" + link("http://bit.ly/demo-customs", "dhl.com/customs") },
  { name: "DHL Delivery", from: "noreply@dhl-parcel-notice.example", auth: "fail", date: "2026-10-14T09:30:00Z",
    subject: "Delivery attempt failed", body: "<p>We tried to deliver your package. Download the shipping label.</p>", attachment: "shipping_label.pdf.htm" },
  { name: "DHL Express", from: "tracking@dhl-parcel-notice.example", auth: "fail", date: "2026-10-28T16:00:00Z",
    subject: "Last chance to schedule your delivery", body: "<p>Final notice: schedule your delivery or the package will be returned.</p>" + link("http://bit.ly/demo-schedule", "dhl.com/schedule") },
];

// ---------- CEO / gift-card fraud: no links, replies go elsewhere ----------
const ceoFraud = [
  { name: "Daniel Cohen (CEO)", from: "daniel.cohen.ceo@gmail-business-mail.example", replyTo: "d.cohen.private@quick-inbox.example", auth: "softfail", date: "2026-11-13T07:55:00Z",
    subject: "Quick favor - are you at your desk?", body: "<p>Are you at your desk? I need a quick favor. Keep this confidential.</p>" },
  { name: "Daniel Cohen (CEO)", from: "daniel.cohen.ceo@gmail-business-mail.example", replyTo: "d.cohen.private@quick-inbox.example", auth: "softfail", date: "2026-11-13T08:20:00Z",
    subject: "Gift cards for the team", body: "<p>Please buy 5 gift cards of 100 USD for the team and send me the codes urgently.</p>" },
  { name: "Daniel Cohen", from: "d.cohen@gmail-business-mail.example", replyTo: "d.cohen.private@quick-inbox.example", auth: "softfail", date: "2026-11-14T13:40:00Z",
    subject: "Urgent wire transfer today", body: "<p>I need you to process an urgent wire transfer today. Payment details to follow.</p>" },
];

// ---------- "GitHub" from a fake domain (sender drift) ----------
const githubFake = [
  { name: "GitHub", from: "noreply@github-account-notice.example", returnPath: "bounce@github-account-notice.example", auth: "softfail", date: "2026-11-14T09:40:00Z",
    subject: "[GitHub] Please verify your account to keep access", body: "<p>Unusual sign-in activity. Verify your account within 24 hours or access will be suspended.</p>" + link("https://github-account-notice.example/session/verify", "github.com/settings/security") },
  { name: "GitHub", from: "security@github-account-notice.example", returnPath: "bounce@github-account-notice.example", auth: "softfail", date: "2026-11-15T10:05:00Z",
    subject: "[GitHub] Your personal access token was used", body: "<p>Your token was used from a new location. Confirm your password to revoke it.</p>" + link("https://github-account-notice.example/tokens", "github.com/settings/tokens") },
];

// ---------- Normal emails ----------
const normal = [
  { name: "GitHub", from: "noreply@github.com", returnPath: "bounces+12345@bounces.github.com", auth: "pass", date: "2026-10-21T06:00:00Z",
    subject: "Your weekly GitHub digest", body: "<p>Here is what happened in your repositories this week.</p>" + link("https://github.com/notifications", "github.com/notifications") },
  { name: "GitHub", from: "noreply@github.com", returnPath: "bounces+12345@bounces.github.com", auth: "pass", date: "2026-11-11T06:00:00Z",
    subject: "Your weekly GitHub digest", body: "<p>3 pull requests were merged this week.</p>" + link("https://github.com/settings/emails", "Manage email preferences") },
  { name: "Dana Levi", from: "dana@example.org", auth: "pass", date: "2026-08-24T15:30:00Z", subject: "Notes from today's meeting", body: "<p>Hi, attached are my notes from today. Talk tomorrow!</p>" },
  { name: "Dana Levi", from: "dana@example.org", auth: "pass", date: "2026-09-08T09:12:00Z", subject: "Lunch on Thursday?", body: "<p>Want to grab lunch on Thursday at 12:30?</p>" },
  { name: "Dana Levi", from: "dana@example.org", auth: "pass", date: "2026-10-19T17:05:00Z", subject: "Slides for the review", body: "<p>I uploaded the slides to our shared folder.</p>" },
  { name: "Yossi Cohen", from: "yossi@example.org", auth: "pass", date: "2026-09-15T11:40:00Z", subject: "Re: project timeline", body: "<p>Sounds good, let's keep the deadline for the end of the month.</p>" },
  { name: "Yossi Cohen", from: "yossi@example.org", auth: "pass", date: "2026-11-02T08:25:00Z", subject: "Team offsite photos", body: "<p>Photos from the offsite are in the album. Enjoy!</p>" },
  { name: "Tech Weekly", from: "news@newsletter.example.com", returnPath: "bounce@mailer.example.com", auth: "pass", date: "2026-08-31T05:00:00Z",
    subject: "Tech Weekly #112: new browsers, old bugs", body: "<p>This week in tech.</p>" + link("https://newsletter.example.com/112", "Read online") },
  { name: "Tech Weekly", from: "news@newsletter.example.com", returnPath: "bounce@mailer.example.com", auth: "pass", date: "2026-09-28T05:00:00Z",
    subject: "Tech Weekly #116: the state of passkeys", body: "<p>This week in tech.</p>" + link("https://newsletter.example.com/116", "Read online") },
  { name: "Tech Weekly", from: "news@newsletter.example.com", returnPath: "bounce@mailer.example.com", auth: "pass", date: "2026-10-26T05:00:00Z",
    subject: "Tech Weekly #120: security news roundup", body: "<p>This week in tech.</p>" + link("https://newsletter.example.com/120", "Read online") },
  { name: "City Books", from: "orders@shop.example.net", auth: "pass", date: "2026-09-02T13:20:00Z", subject: "Your order #4471 has shipped", body: "<p>Your books are on the way.</p>" + link("https://shop.example.net/orders/4471", "Track your order") },
  { name: "City Books", from: "orders@shop.example.net", auth: "pass", date: "2026-10-05T10:00:00Z", subject: "Receipt for order #4522", body: "<p>Thank you for your purchase.</p>" + link("https://shop.example.net/orders/4522", "View receipt") },
  { name: "City Books", from: "news@shop.example.net", auth: "pass", date: "2026-11-08T08:00:00Z", subject: "New arrivals this week", body: "<p>See what is new on our shelves.</p>" + link("https://shop.example.net/new", "Browse new arrivals") },
  { name: "Course Updates", from: "course@example.edu", auth: "pass", date: "2026-08-27T07:30:00Z", subject: "Welcome to Operations Research", body: "<p>The syllabus is on the course website.</p>" + link("https://example.edu/or101", "Course website") },
  { name: "Course Updates", from: "course@example.edu", auth: "pass", date: "2026-10-01T07:30:00Z", subject: "Homework 3 is published", body: "<p>Homework 3 is due in two weeks.</p>" + link("https://example.edu/or101/hw3", "Homework 3") },
  { name: "Course Updates", from: "course@example.edu", auth: "pass", date: "2026-11-03T07:30:00Z", subject: "Exam room update", body: "<p>The exam will take place in room 204.</p>" },
  { name: "Team Calendar", from: "calendar@example.org", auth: "pass", date: "2026-09-21T06:45:00Z", subject: "Invitation: Sprint planning (Mon 10:00)", body: "<p>You are invited to Sprint planning.</p>" },
  { name: "Team Calendar", from: "calendar@example.org", auth: "pass", date: "2026-10-26T06:45:00Z", subject: "Invitation: Quarterly review (Tue 14:00)", body: "<p>You are invited to the Quarterly review.</p>" },
  { name: "Mom", from: "mom@example.net", auth: "pass", date: "2026-09-12T18:10:00Z", subject: "Dinner on Friday", body: "<p>Dinner at our place on Friday, 19:30. Bring dessert!</p>" },
  { name: "Mom", from: "mom@example.net", auth: "pass", date: "2026-10-30T19:00:00Z", subject: "Photos from the weekend", body: "<p>Here are the photos from the weekend.</p>" },
];

module.exports = [...bankAndPaypal, ...microsoft, ...hrAndDocs, ...delivery, ...ceoFraud, ...githubFake, ...normal];
