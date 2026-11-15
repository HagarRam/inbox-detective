// demo.js
// Analyzes every email in the samples/ folder and prints a readable report.
// Run:  node demo.js

const fs = require("fs");
const { analyzeRaw } = require("./analyze");

async function printReport(file) {
  const result = await analyzeRaw(fs.readFileSync("samples/" + file));
  console.log("============================================================");
  console.log(file + "  |  " + result.subject);
  console.log("Score: " + result.score + "/100  ->  " + result.verdict.toUpperCase());
  for (const f of result.findings) {
    let sign = String(f.points);
    if (f.points > 0) sign = "+" + f.points;
    console.log("  [" + sign + "] " + f.title + ": " + f.detail);
  }
}

async function main() {
  for (const file of fs.readdirSync("samples")) {
    if (file.endsWith(".eml")) await printReport(file);
  }
}

main();
