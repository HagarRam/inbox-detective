// demoMailboxData.js
// The 50 FICTIONAL demo emails (set 2): who sends them, when, and what they say.
// 21 phishing (5 campaigns), 9 suspicious, 20 normal. All of them are new emails;
// the phishing ones reuse the attacker infrastructure that has saved intel in
// fixtures/intel/, so the dashboard can link them into campaigns.
// Phishing domains end with ".example" (reserved, never real). Normal emails come
// from example.org / example.com / example.net / example.edu (also reserved), plus GitHub.

// <a href="real">shown text</a>
function link(href, text) {
  return '<p><a href="' + href + '">' + text + "</a></p>";
}

// ---------- Phishing campaign 1: "bank" + "PayPal" on the same server ----------
const bankAndPaypal = [
  { name: "Bank Security", from: "alerts@secure-bank-login.example", replyTo: "collect@other-domain.example", returnPath: "bounce@mailer-xyz.example", auth: "fail", date: "2026-09-08T08:05:00Z",
    subject: "Suspicious login from a new device", body: "<p>A new device signed in to your account. If this was not you, verify your account within 24 hours.</p>" + link("http://login-update.example/device?id=21", "mybank.com/secure") },
  { name: "Bank Security", from: "alerts@secure-bank-login.example", replyTo: "collect@other-domain.example", returnPath: "bounce@mailer-xyz.example", auth: "fail", date: "2026-10-02T17:30:00Z",
    subject: "Your debit card has been locked", body: "<p>Your debit card was locked for your protection. Confirm your identity immediately to unlock it.</p>" + link("http://login-update.example/unlock?id=22", "mybank.com/cards") },
  { name: "Online Banking", from: "service@secure-bank-login.example", returnPath: "bounce@mailer-xyz.example", auth: "fail", date: "2026-11-15T06:40:00Z",
    subject: "New security rules: update your details", body: "<p>Final notice: update your details today to keep using online banking.</p>" + link("http://login-update.example/rules?id=23", "Update my details") },
  { name: "PayPal", from: "notice@paypal-account-review.example", replyTo: "billing-team@fastmail-drop.example", returnPath: "bounce@bulk-sender.example", auth: "softfail", date: "2026-09-19T10:10:00Z",
    subject: "We noticed a payment you did not make", body: "<p>Unauthorized login detected and a payment of 89.00 USD was sent. Review the receipt attached.</p>", attachment: "receipt.pdf.html" },
  { name: "PayPal Support", from: "support@paypal-account-review.example", replyTo: "billing-team@fastmail-drop.example", returnPath: "bounce@bulk-sender.example", auth: "softfail", date: "2026-10-23T12:00:00Z",
    subject: "Your account needs one more step", body: "<p>Please verify your account to keep sending payments.</p>" + link("https://bit.ly/demo-pp-step", "paypal.com/settings") },
  { name: "PayPal Billing", from: "billing@paypal-account-review.example", replyTo: "billing-team@fastmail-drop.example", auth: "fail", date: "2026-11-16T09:20:00Z",
    subject: "Invoice 7734 is overdue", body: "<p>Invoice 7734 is overdue. Update your payment method to avoid a fee.</p>" + link("http://login-update.example/invoice?id=26", "paypal.com/invoices/7734") },
];

// ---------- Phishing campaign 2: fake Microsoft 365 ----------
const microsoft = [
  { name: "Microsoft 365", from: "admin@office365-support.example", auth: "fail", date: "2026-09-25T07:15:00Z",
    subject: "Storage almost full: 98% used", body: "<p>Your mailbox storage is almost full. Act now to keep receiving email.</p>" + link("https://login.microsoftonline.com@xn--microsft-login-8hb.example/storage", "login.microsoftonline.com") },
  { name: "Microsoft Account", from: "no-reply@office365-support.example", replyTo: "helpdesk@mail-collector.example", auth: "fail", date: "2026-10-16T11:45:00Z",
    subject: "Sign-in blocked from an unknown location", body: "<p>Unusual activity on your account. Verify your account to restore access.</p>" + link("https://xn--microsft-login-8hb.example/blocked", "account.microsoft.com") },
  { name: "Microsoft 365 Admin", from: "admin@office365-support-desk.example", replyTo: "helpdesk@mail-collector.example", auth: "fail", date: "2026-11-03T08:30:00Z",
    subject: "Multi-factor setup required by Friday", body: "<p>Enter your password to finish the multi-factor setup.</p>" + link("http://192.0.2.44/mfa/setup", "aka.ms/mfasetup") },
  { name: "Microsoft Teams", from: "teams@office365-support-desk.example", replyTo: "helpdesk@mail-collector.example", auth: "fail", date: "2026-11-12T15:50:00Z",
    subject: "Voice message from your manager", body: "<p>You have a new voice message. Sign in to listen.</p>" + link("https://xn--microsft-login-8hb.example/voice", "teams.microsoft.com/voice") },
  { name: "OneDrive", from: "share@office365-support-desk.example", auth: "fail", date: "2026-11-16T07:25:00Z",
    subject: "Contract_2027.docx was shared with you", body: "<p>A file was shared with you. Confirm your password to open it.</p>" + link("https://xn--microsft-login-8hb.example/contract", "onedrive.live.com/Contract_2027") },
];

// ---------- Phishing campaign 3: HR + fake Google Docs (rare shared mail server) ----------
const hrAndDocs = [
  { name: "HR Benefits", from: "benefits@company-hr-portal.example", auth: "fail", date: "2026-10-07T10:20:00Z",
    subject: "Open enrollment closes tomorrow", body: "<p>Open enrollment closes tomorrow. Confirm your identity to keep your benefits.</p>" + link("http://hr-portal-login.example/benefits", "hr.company.com/benefits") },
  { name: "HR Payroll", from: "payroll@company-hr-portal.example", auth: "fail", date: "2026-11-10T09:00:00Z",
    subject: "Payslip correction for October", body: "<p>Your October payslip was corrected. Update your bank details to receive the difference.</p>" + link("http://hr-portal-login.example/payslip", "hr.company.com/payslip") },
  { name: "Google Sheets", from: "share@docs-sharing-notify.example", auth: "fail", date: "2026-10-09T14:05:00Z",
    subject: "Yael shared \"Holiday schedule\" with you", body: "<p>Yael shared a spreadsheet with you.</p>" + link("https://xn--gogle-docs-4ib.example/sheet?id=301", "docs.google.com/spreadsheets/holiday") },
  { name: "Google Drive", from: "drive@docs-sharing-notify.example", auth: "fail", date: "2026-11-14T16:35:00Z",
    subject: "Folder shared: Board meeting", body: "<p>A folder was shared with you. Sign in with your password to open it.</p>" + link("https://xn--gogle-docs-4ib.example/folder?id=302", "drive.google.com/board-meeting") },
];

// ---------- Delivery scam ----------
const delivery = [
  { name: "DHL Express", from: "tracking@dhl-parcel-notice.example", auth: "fail", date: "2026-08-28T07:40:00Z",
    subject: "Your package is waiting at the depot", body: "<p>Your package is waiting. Pay the 1.99 USD storage fee within 48 hours.</p>" + link("http://bit.ly/demo-depot", "dhl.com/depot") },
  { name: "DHL Delivery", from: "noreply@dhl-parcel-notice.example", auth: "fail", date: "2026-10-19T09:10:00Z",
    subject: "Address problem with your delivery", body: "<p>We could not read your address. Open the attached form and fill it in.</p>", attachment: "address_form.pdf.htm" },
  { name: "DHL Express", from: "tracking@dhl-parcel-notice.example", auth: "fail", date: "2026-11-11T13:15:00Z",
    subject: "Import tax due on your parcel", body: "<p>Import tax is due. Enter your credit card to release the parcel.</p>" + link("http://bit.ly/demo-tax", "dhl.com/import-tax") },
];

// ---------- CEO fraud: no links, replies go elsewhere ----------
const ceoFraud = [
  { name: "Daniel Cohen (CEO)", from: "daniel.cohen.ceo@gmail-business-mail.example", replyTo: "d.cohen.private@quick-inbox.example", auth: "softfail", date: "2026-10-27T07:50:00Z",
    subject: "Are you available for a confidential task?", body: "<p>Are you available? I have a confidential task for you. Please reply only to me.</p>" },
  { name: "Daniel Cohen", from: "d.cohen@gmail-business-mail.example", replyTo: "d.cohen.private@quick-inbox.example", auth: "softfail", date: "2026-11-13T08:45:00Z",
    subject: "Vendor payment needed today", body: "<p>Please send a wire transfer to our new vendor today. I will send the bank details.</p>" },
];

// ---------- Fake "GitHub" ----------
const githubFake = [
  { name: "GitHub", from: "security@github-account-notice.example", returnPath: "bounce@github-account-notice.example", auth: "softfail", date: "2026-11-08T10:30:00Z",
    subject: "[GitHub] Unusual sign-in to your account", body: "<p>Unusual activity on your account. Verify your account within 24 hours.</p>" + link("https://github-account-notice.example/session", "github.com/sessions") },
];

// ---------- "Suspicious" (score 25-59): some warning signs, not enough for "Dangerous" ----------
// auth "none" = no authentication result; "softfail"/"fail" = the sender could not be confirmed.
const suspicious = [
  { name: "Weekly Deals", from: "news@weekly-deals-mailer.example", auth: "softfail", date: "2026-09-12T09:00:00Z",
    subject: "This week's offers", body: "<p>Our new offers for this week.</p>" + link("https://weekly-deals-mailer.example/offers", "See the offers") },
  { name: "Amazon Orders", from: "orders@shop-order-notify.example", auth: "none", date: "2026-10-04T12:30:00Z",
    subject: "Your order has shipped", body: "<p>Your order is on its way.</p>" + link("https://shop-order-notify.example/track", "Track your order") },
  { name: "Tech Summit", from: "events@summit-tickets.example", replyTo: "tickets@ticket-desk-mail.example", returnPath: "bounce@mail-relay-hub.example", auth: "none", date: "2026-10-11T08:15:00Z",
    subject: "Your ticket for Tech Summit 2026", body: "<p>Your ticket is ready. See you there.</p>" },
  { name: "Netflix", from: "info@stream-account-mail.example", returnPath: "bounce@mail-relay-hub.example", auth: "none", date: "2026-10-22T19:00:00Z",
    subject: "New shows this week", body: "<p>New shows were added this week.</p>" },
  { name: "IT Helpdesk", from: "helpdesk@it-support-desk.example", auth: "fail", date: "2026-11-02T07:00:00Z",
    subject: "Scheduled maintenance tonight", body: "<p>Scheduled maintenance tonight between 22:00 and 23:00.</p>" },
  { name: "DocuSign", from: "docs@sign-request-mail.example", replyTo: "signer@docs-reply-box.example", auth: "none", date: "2026-11-09T10:20:00Z",
    subject: "A document is waiting for your signature", body: "<p>Please review the document.</p>" + link("https://sign-request-mail.example/doc", "Review document") },
  { name: "Delivery Update", from: "updates@parcel-status-news.example", auth: "softfail", date: "2026-11-14T13:40:00Z",
    subject: "Your parcel is on its way", body: "<p>Your parcel left our warehouse.</p>" + link("http://parcel-status-news.example/track", "Track parcel") },
  { name: "LinkedIn", from: "messages@network-invite-mail.example", auth: "none", date: "2026-11-15T16:05:00Z",
    subject: "You have a new connection request", body: "<p>Someone wants to connect with you.</p>" },
  { name: "Apple Billing", from: "billing@music-plan-mail.example", auth: "none", date: "2026-11-16T11:10:00Z",
    subject: "Your subscription renews next week", body: "<p>Your family subscription renews next week.</p>" },
];

// ---------- Normal emails ----------
const normal = [
  { name: "GitHub", from: "noreply@github.com", returnPath: "bounces+12345@bounces.github.com", auth: "pass", date: "2026-09-02T06:00:00Z",
    subject: "Your monthly GitHub summary", body: "<p>Here is what happened in your repositories this month.</p>" + link("https://github.com/notifications", "github.com/notifications") },
  { name: "GitHub", from: "noreply@github.com", returnPath: "bounces+12345@bounces.github.com", auth: "pass", date: "2026-11-05T06:00:00Z",
    subject: "[inbox-detective] New star on your repository", body: "<p>Someone starred your repository.</p>" + link("https://github.com/stargazers", "See stargazers") },
  { name: "Noa Levi", from: "noa@example.org", auth: "pass", date: "2026-08-24T09:30:00Z", subject: "Lunch on Thursday?", body: "<p>Want to grab lunch on Thursday at 12:30?</p>" },
  { name: "Noa Levi", from: "noa@example.org", auth: "pass", date: "2026-10-13T15:10:00Z", subject: "Slides for tomorrow", body: "<p>I added my part to the slides. Have a look when you can.</p>" },
  { name: "Team Calendar", from: "calendar@example.org", auth: "pass", date: "2026-09-14T06:45:00Z", subject: "Invitation: Design review (Wed 11:00)", body: "<p>You are invited to the Design review.</p>" },
  { name: "Team Calendar", from: "calendar@example.org", auth: "pass", date: "2026-11-09T06:45:00Z", subject: "Invitation: Year-end planning (Thu 15:00)", body: "<p>You are invited to Year-end planning.</p>" },
  { name: "Course Updates", from: "course@example.edu", auth: "pass", date: "2026-09-01T07:30:00Z", subject: "Welcome to Data Analysis", body: "<p>The course website is now open.</p>" + link("https://example.edu/da201", "Course website") },
  { name: "Course Updates", from: "course@example.edu", auth: "pass", date: "2026-10-20T07:30:00Z", subject: "Project groups are published", body: "<p>The project groups are on the course website.</p>" + link("https://example.edu/da201/groups", "Project groups") },
  { name: "Course Updates", from: "course@example.edu", auth: "pass", date: "2026-11-12T07:30:00Z", subject: "Office hours moved to Monday", body: "<p>This week's office hours are on Monday at 14:00.</p>" },
  { name: "City Books", from: "orders@shop.example.net", auth: "pass", date: "2026-09-21T10:00:00Z", subject: "Receipt for order #5180", body: "<p>Thank you for your purchase.</p>" + link("https://shop.example.net/orders/5180", "View receipt") },
  { name: "City Books", from: "news@shop.example.net", auth: "pass", date: "2026-11-01T08:00:00Z", subject: "Autumn reading list", body: "<p>Our staff picks for the autumn.</p>" + link("https://shop.example.net/autumn", "See the list") },
  { name: "Green Gym", from: "club@gym.example.com", auth: "pass", date: "2026-09-05T05:50:00Z", subject: "New yoga classes on Sunday", body: "<p>We added two yoga classes on Sunday morning.</p>" },
  { name: "Green Gym", from: "club@gym.example.com", auth: "pass", date: "2026-10-30T05:50:00Z", subject: "Holiday opening hours", body: "<p>Here are our opening hours for the holidays.</p>" },
  { name: "Mom", from: "mom@example.net", auth: "pass", date: "2026-09-27T18:10:00Z", subject: "Shabbat dinner", body: "<p>Dinner at our place on Friday at 19:30.</p>" },
  { name: "Mom", from: "mom@example.net", auth: "pass", date: "2026-11-07T19:00:00Z", subject: "Grandma's birthday", body: "<p>Don't forget grandma's birthday next week!</p>" },
  { name: "Dan Mizrahi", from: "dan@example.com", auth: "pass", date: "2026-10-05T11:20:00Z", subject: "Notes from the study group", body: "<p>Here are my notes from today's study group.</p>" },
  { name: "Dan Mizrahi", from: "dan@example.com", auth: "pass", date: "2026-11-15T20:05:00Z", subject: "Game night on Saturday", body: "<p>Game night at my place on Saturday. Are you in?</p>" },
  { name: "Library", from: "library@example.edu", auth: "pass", date: "2026-10-17T08:00:00Z", subject: "Your book is ready for pickup", body: "<p>The book you reserved is ready at the front desk.</p>" },
  { name: "Weather Daily", from: "daily@weather.example.org", auth: "pass", date: "2026-11-14T05:30:00Z", subject: "Rain expected this weekend", body: "<p>Rain is expected on Saturday and Sunday.</p>" },
  { name: "Career Center", from: "careers@example.edu", auth: "pass", date: "2026-11-16T09:00:00Z", subject: "Internship fair next Tuesday", body: "<p>Meet 30 companies at the internship fair next Tuesday.</p>" + link("https://example.edu/careers/fair", "Fair details") },
];

module.exports = [...bankAndPaypal, ...microsoft, ...hrAndDocs, ...delivery, ...ceoFraud, ...githubFake, ...suspicious, ...normal];
