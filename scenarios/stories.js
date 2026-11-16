// stories.js
// The fixed text of the "If you had clicked" scenarios: likely steps and protections.
// This is DATA only. Nothing here comes from an email.
//
// MITRE ATT&CK techniques: every ID and name below was checked on attack.mitre.org
// (November 2026). T1656 "Impersonation" could not be checked, so it is not used.
const MITRE = {
  phishingAttachment: "T1566.001 Phishing: Spearphishing Attachment",
  phishingLink: "T1566.002 Phishing: Spearphishing Link",
  maliciousLink: "T1204.001 User Execution: Malicious Link",
  maliciousFile: "T1204.002 User Execution: Malicious File",
  credentialLink: "T1598.003 Phishing for Information: Spearphishing Link",
  validAccounts: "T1078 Valid Accounts",
  financialTheft: "T1657 Financial Theft",
};

// A dangerous file: open it -> it runs -> passwords or access are stolen.
const ATTACHMENT = {
  steps: [
    { text: "The email arrives with a file that looks harmless.", mitre: MITRE.phishingAttachment },
    { text: "You open the file, and it runs a program on your computer.", mitre: MITRE.maliciousFile },
    { text: "The program can steal saved passwords or let the attacker control the computer.", mitre: "" },
    { text: "With your passwords, the attacker signs in as you.", mitre: MITRE.validAccounts },
  ],
  protections: {
    user: ["Do not open unexpected attachments, even from a name you know.", "If you already opened it: disconnect from the network and tell IT."],
    admin: ["Block risky file types (.exe, .js, double extensions) at the mail gateway.", "Search for the file's hash in your security tools."],
    organization: ["Use endpoint protection (EDR) on every computer.", "Allow only approved programs to run."],
  },
};

// A hidden or fake link: click -> fake login page -> password captured -> account taken over.
const CREDENTIALS = {
  steps: [
    { text: "The email asks you to click a link that hides where it really goes.", mitre: MITRE.phishingLink },
    { text: "The link opens a fake login page that looks like the real one.", mitre: MITRE.maliciousLink },
    { text: "You type your password, and it goes to the attacker.", mitre: MITRE.credentialLink },
    { text: "The attacker signs in to your real account with it.", mitre: MITRE.validAccounts },
  ],
  protections: {
    user: ["Never sign in from a link in an email: type the address yourself.", "Turn on two-step verification.", "If you typed your password: change it now."],
    admin: ["Block the sender and link domains at the mail gateway.", "Check this account's sign-ins for unknown places or devices."],
    organization: ["Use phishing-resistant sign-in (security keys or passkeys).", "Run short phishing training with real examples."],
  },
};

// Replies go elsewhere / a request for money or details, without a link.
const MONEY = {
  steps: [
    { text: "Someone pretends to be a person or company you trust.", mitre: "" },
    { text: "You reply, and your answer goes to the attacker.", mitre: "" },
    { text: "The attacker asks for a payment, gift cards or personal details.", mitre: "" },
    { text: "The money or the details are lost.", mitre: MITRE.financialTheft },
  ],
  protections: {
    user: ["Confirm any payment request by phone, on a number you already know.", "Never send gift cards, bank details or ID copies by email."],
    admin: ["Flag emails whose Reply-To domain differs from the sender.", "Show a banner on emails from outside the organization."],
    organization: ["Require two people to approve payments and bank-detail changes."],
  },
};

// Before opening (headers only): we saw the sender, not the links or files.
const HEADERS_ONLY = {
  steps: [
    { text: "The sender headers show warning signs (see the facts).", mitre: "" },
    { text: "Links and attachments were not checked yet (headers only).", mitre: "" },
    { text: "A common next step in emails like this is a link to a fake login page.", mitre: MITRE.phishingLink },
    { text: "If you type your password there, the attacker can sign in as you.", mitre: MITRE.validAccounts },
  ],
  protections: {
    user: ["Do not click links or open attachments until you are sure who sent it.", "Look at the sender's real address, not only the name."],
    admin: ["Quarantine incoming mail that fails DMARC.", "Flag emails whose Reply-To domain differs from the sender."],
    organization: ["Give everyone a one-click way to report a suspicious email."],
  },
};

// Anything else that was flagged in a full check.
const GENERAL = {
  steps: [
    { text: "The sender is probably not who it says it is.", mitre: "" },
    { text: "You trust the email and do what it asks.", mitre: "" },
    { text: "If it leads to a login page, your password can be captured.", mitre: MITRE.credentialLink },
    { text: "The attacker can then sign in as you.", mitre: MITRE.validAccounts },
  ],
  protections: HEADERS_ONLY.protections,
};

module.exports = { MITRE, ATTACHMENT, CREDENTIALS, MONEY, HEADERS_ONLY, GENERAL };
