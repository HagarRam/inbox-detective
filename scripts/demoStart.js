// demoStart.js
// One command for the demo:  npm run demo:start
// 1. checks that port 3000 is free
// 2. starts the server and the ngrok tunnel (static domain, so the URL never changes)
// 3. prints READY and the public URL only when the server answers THROUGH the tunnel
// 4. Ctrl+C stops both

const net = require("net");
const { spawn } = require("child_process");

const PORT = 3000;
const DOMAIN = "debating-plus-sincere.ngrok-free.dev";
const PUBLIC_URL = "https://" + DOMAIN;
const WAIT_SECONDS = 30;

const children = []; // the server and ngrok, so we can stop them

// True if nothing listens on the port yet. (We try to open it for a moment.)
function isPortFree(port) {
  return new Promise((resolve) => {
    const tester = net.createServer();
    tester.once("error", () => resolve(false));
    tester.once("listening", () => tester.close(() => resolve(true)));
    tester.listen(port, "127.0.0.1");
  });
}

// Start a program. If it stops on its own, stop everything.
// showOutput=false hides ngrok's full-screen display, so our messages stay readable.
function start(name, command, args, showOutput) {
  const output = showOutput ? "inherit" : "ignore";
  const child = spawn(command, args, { stdio: ["ignore", output, "inherit"] });
  child.on("exit", (code) => {
    console.error(name + " stopped (exit code " + code + "). Stopping everything.");
    stopAll(1);
  });
  children.push(child);
}

function stopAll(exitCode) {
  for (const child of children) {
    child.removeAllListeners("exit"); // we are stopping it on purpose
    child.kill();
  }
  process.exit(exitCode);
}

// Does the server answer at this address? (The header skips ngrok's browser warning page.)
async function answers(url) {
  try {
    const response = await fetch(url, { headers: { "ngrok-skip-browser-warning": "1" }, signal: AbortSignal.timeout(3000) });
    return (await response.text()).includes("Inbox Detective is alive");
  } catch (err) {
    return false;
  }
}

// Ask once a second until both the local server and the tunnel answer.
async function waitUntilReady() {
  for (let i = 0; i < WAIT_SECONDS; i++) {
    if ((await answers("http://127.0.0.1:" + PORT + "/")) && (await answers(PUBLIC_URL + "/"))) return true;
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  return false;
}

async function main() {
  if (!(await isPortFree(PORT))) {
    console.error(`Port ${PORT} is already in use. Run: lsof -i :${PORT} and kill the PID`);
    process.exit(1);
  }
  process.on("SIGINT", () => {
    console.log("\nStopping the server and ngrok...");
    stopAll(0);
  });
  start("Server", "node", ["server.js"], true);
  start("ngrok", "ngrok", ["http", "--url=" + DOMAIN, String(PORT)], false);

  if (await waitUntilReady()) {
    console.log("\nREADY  " + PUBLIC_URL + "\n(Ctrl+C to stop)");
  } else {
    console.error("Not ready after " + WAIT_SECONDS + " seconds. Check the messages above.");
    stopAll(1);
  }
}

main();
