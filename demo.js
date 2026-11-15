// demo.js
// Runs the analysis on every sample email and prints a readable report.
// Usage:  node demo.js               (all files in samples/)
//         node demo.js samples/x.eml (one file)

const fs = require("fs");
const path = require("path");
const { analyzeRaw } = require("./analyze");

async function main() {
  const files = process.argv.length > 2
    ? process.argv.slice(2)
    : fs.readdirSync("samples").filter((f) => f.endsWith(".eml")).map((f) => path.join("samples", f));

  for (const file of files) {
    const result = await analyzeRaw(fs.readFileSync(file));
    console.log("=".repeat(60));
    console.log(`${file}`);
    console.log(`Subject: ${result.summary.subject}`);
    console.log(`Score: ${result.score}/100  ->  ${result.verdict.toUpperCase()}`);
    for (const f of result.findings) {
      const sign = f.points > 0 ? `+${f.points}` : `${f.points}`;
      console.log(`  [${sign.padStart(3)}] ${f.title}: ${f.detail}`);
    }
  }
}

main().catch((err) => {
  console.error("Demo failed:", err.message);
  process.exit(1);
});
