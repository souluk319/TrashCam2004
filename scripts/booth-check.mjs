import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawn } from "node:child_process";
import net from "node:net";

const PREVIEW_PORT = 4174;
const PREVIEW_URL = `http://127.0.0.1:${PREVIEW_PORT}/?demo=1&debug=1&save=prepare&boothFast=1`;
const CHROME_CANDIDATES = [
  process.env.CHROME_BIN,
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/Applications/Chromium.app/Contents/MacOS/Chromium",
  "google-chrome",
  "chromium",
  "chromium-browser"
].filter(Boolean);

let previewProcess = null;
let chromeProcess = null;
let userDataDir = "";
let cleanedUp = false;

function logOk(message) {
  console.log(`ok - ${message}`);
}

function fail(message) {
  throw new Error(message);
}

async function main() {
  try {
    await ensurePreviewServer();
    const chromePath = await findChrome();
    const debuggingPort = await findFreePort();
    userDataDir = mkdtempSync(join(tmpdir(), "trashcam-booth-check-"));

    chromeProcess = spawn(chromePath, [
      "--headless=new",
      `--remote-debugging-port=${debuggingPort}`,
      `--user-data-dir=${userDataDir}`,
      "--window-size=390,844",
      "--no-first-run",
      "--no-default-browser-check",
      "--autoplay-policy=no-user-gesture-required",
      PREVIEW_URL
    ], {
      stdio: ["ignore", "ignore", "pipe"]
    });

    await waitForDevTools(debuggingPort);
    const pageTarget = await waitForPageTarget(debuggingPort);
    const client = await connectToCdp(pageTarget.webSocketDebuggerUrl);
    const browserProblems = [];

    client.on("Log.entryAdded", ({ entry }) => {
      if (entry.level === "error" || entry.level === "warning") {
        browserProblems.push(`${entry.level}: ${entry.text}`);
      }
    });
    client.on("Runtime.exceptionThrown", ({ exceptionDetails }) => {
      browserProblems.push(`exception: ${exceptionDetails.text ?? "runtime exception"}`);
    });

    try {
      await client.send("Runtime.enable");
      await client.send("Log.enable");
      await client.send("Page.enable");
      await client.send("Emulation.setDeviceMetricsOverride", {
        width: 390,
        height: 844,
        deviceScaleFactor: 2,
        mobile: true
      });
      await waitForDemoReady(client);
      logOk("4-Cut Booth check loaded demo camera");

      await evaluate(client, `document.querySelector('button[data-capture-mode="booth"]')?.click()`);
      await waitForState(client, (state) => state.captureMode === "booth", "capture mode did not switch to booth");

      await evaluate(client, "document.querySelector('[data-save]')?.click()");
      await waitForState(
        client,
        (state) => state.boothState === "ready" && state.boothCuts === "4" && state.filledBoothThumbs === 4,
        "4-Cut Booth did not capture 4 frames"
      );
      logOk("4-Cut Booth captured 4 frames");

      await evaluate(client, `document.querySelector('[data-booth-frame="classic-black"]')?.click()`);
      await waitForState(client, (state) => state.boothFrame === "classic-black", "booth frame did not switch");

      await evaluate(client, "document.querySelector('[data-save]')?.click()");
      const finalState = await waitForState(
        client,
        (state) => state.save === "prepared" && state.captureReview === "visible" && state.bytes > 0,
        "4-Cut Booth strip did not prepare PNG"
      );

      if (!finalState.filename.includes("4-cut-booth-classic-black")) {
        fail(`expected booth filename, got ${finalState.filename}`);
      }

      if (finalState.overflowCount !== 0) {
        fail(`expected no horizontal overflow, got ${finalState.overflowCount}`);
      }

      if (browserProblems.length > 0) {
        fail(`browser problems: ${browserProblems.join(" | ")}`);
      }

      logOk(`4-Cut Booth strip prepared: ${finalState.bytes} bytes`);
    } finally {
      await client.close();
    }
  } finally {
    cleanup();
  }
}

async function waitForDemoReady(client) {
  await waitForState(
    client,
    (state) => state.source === "demo" && state.camera === "ready" && state.frames > 0 && state.hasBoothMode,
    "demo source did not become ready"
  );
}

async function waitForState(client, predicate, timeoutMessage) {
  let lastState = null;

  await waitFor(async () => {
    lastState = await readAppState(client);
    return predicate(lastState);
  }, 12_000, () => `${timeoutMessage}: ${JSON.stringify(lastState)}`);

  return lastState;
}

async function readAppState(client) {
  return evaluate(client, `(() => {
    const app = document.querySelector("#app");
    const overflowing = [];

    for (const element of Array.from(document.querySelectorAll("*"))) {
      const rect = element.getBoundingClientRect();

      if (rect.width > 0 && (rect.left < -1 || rect.right > window.innerWidth + 1)) {
        overflowing.push(element.tagName);
      }
    }

    return {
      source: app?.dataset.sourceMode ?? "",
      camera: app?.dataset.cameraState ?? "",
      frames: Number(app?.dataset.renderedFrames ?? 0),
      captureMode: app?.dataset.captureMode ?? "",
      boothState: app?.dataset.boothState ?? "",
      boothCuts: app?.dataset.boothCuts ?? "",
      boothFrame: app?.dataset.boothFrame ?? "",
      save: app?.dataset.lastSaveKind ?? "",
      captureReview: app?.dataset.captureReview ?? "",
      bytes: Number(app?.dataset.lastSaveBytes ?? 0),
      filename: app?.dataset.lastSaveName ?? "",
      hasBoothMode: Boolean(document.querySelector('button[data-capture-mode="booth"]')),
      filledBoothThumbs: Array.from(document.querySelectorAll("[data-booth-thumb]")).filter((canvas) => canvas.dataset.filled === "yes").length,
      overflowCount: overflowing.length
    };
  })()`);
}

async function ensurePreviewServer() {
  if (await isPortOpen(PREVIEW_PORT)) {
    logOk(`preview server already listening on ${PREVIEW_PORT}`);
    return;
  }

  previewProcess = spawn("npm", ["run", "preview:local"], {
    stdio: ["ignore", "pipe", "pipe"]
  });

  await waitFor(async () => isPortOpen(PREVIEW_PORT), 10_000, "preview server did not start on 4174");
  logOk("started local production preview server");
}

async function findChrome() {
  for (const candidate of CHROME_CANDIDATES) {
    if (candidate.includes("/")) {
      if (await canSpawn(candidate, ["--version"])) {
        return candidate;
      }
      continue;
    }

    if (await canSpawn(candidate, ["--version"])) {
      return candidate;
    }
  }

  fail("Chrome/Chromium not found. Set CHROME_BIN to run 4-Cut Booth verification.");
}

function canSpawn(command, args) {
  return new Promise((resolve) => {
    const child = spawn(command, args, { stdio: "ignore" });
    child.on("error", () => resolve(false));
    child.on("exit", (code) => resolve(code === 0));
  });
}

function isPortOpen(port) {
  return new Promise((resolve) => {
    const socket = net.createConnection({ host: "127.0.0.1", port });
    socket.setTimeout(500);
    socket.on("connect", () => {
      socket.destroy();
      resolve(true);
    });
    socket.on("timeout", () => {
      socket.destroy();
      resolve(false);
    });
    socket.on("error", () => resolve(false));
  });
}

function findFreePort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      server.close(() => {
        if (address && typeof address === "object") {
          resolve(address.port);
        } else {
          reject(new Error("Could not allocate a free port."));
        }
      });
    });
    server.on("error", reject);
  });
}

async function waitForDevTools(port) {
  await waitFor(async () => {
    try {
      const response = await fetch(`http://127.0.0.1:${port}/json/version`);
      return response.ok;
    } catch {
      return false;
    }
  }, 10_000, "Chrome DevTools endpoint did not start");
}

async function waitForPageTarget(port) {
  let lastTargets = [];

  await waitFor(async () => {
    try {
      const response = await fetch(`http://127.0.0.1:${port}/json/list`);
      lastTargets = await response.json();
      return lastTargets.some((target) => target.type === "page" && target.webSocketDebuggerUrl);
    } catch {
      return false;
    }
  }, 10_000, () => `Chrome page target did not appear: ${JSON.stringify(lastTargets)}`);

  return lastTargets.find((target) => target.type === "page" && target.webSocketDebuggerUrl);
}

async function connectToCdp(webSocketDebuggerUrl) {
  const socket = new WebSocket(webSocketDebuggerUrl);
  let nextId = 1;
  const pending = new Map();
  const listeners = new Map();

  await new Promise((resolve, reject) => {
    socket.addEventListener("open", resolve, { once: true });
    socket.addEventListener("error", reject, { once: true });
  });

  socket.addEventListener("message", (event) => {
    const message = JSON.parse(event.data);

    if (message.id) {
      const request = pending.get(message.id);
      if (!request) {
        return;
      }

      pending.delete(message.id);

      if (message.error) {
        request.reject(new Error(message.error.message));
      } else {
        request.resolve(message.result ?? {});
      }
      return;
    }

    if (message.method) {
      for (const listener of listeners.get(message.method) ?? []) {
        listener(message.params ?? {});
      }
    }
  });

  return {
    send(method, params = {}) {
      const id = nextId;
      nextId += 1;
      socket.send(JSON.stringify({ id, method, params }));

      return new Promise((resolve, reject) => {
        pending.set(id, { resolve, reject });
      });
    },
    on(method, listener) {
      const methodListeners = listeners.get(method) ?? [];
      methodListeners.push(listener);
      listeners.set(method, methodListeners);
    },
    close() {
      socket.close();
      return Promise.resolve();
    }
  };
}

async function evaluate(client, expression) {
  const result = await client.send("Runtime.evaluate", {
    expression,
    awaitPromise: true,
    returnByValue: true
  });

  if (result.exceptionDetails) {
    fail(result.exceptionDetails.text ?? "Runtime.evaluate failed");
  }

  return result.result.value;
}

async function waitFor(predicate, timeoutMs, timeoutMessage) {
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
    if (await predicate()) {
      return;
    }

    await delay(250);
  }

  fail(typeof timeoutMessage === "function" ? timeoutMessage() : timeoutMessage);
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function cleanup() {
  if (cleanedUp) {
    return;
  }

  cleanedUp = true;
  stopProcess(chromeProcess);
  stopProcess(previewProcess);

  if (userDataDir) {
    safeRemoveTempDir(userDataDir);
  }
}

function safeRemoveTempDir(path) {
  try {
    rmSync(path, { force: true, maxRetries: 10, recursive: true, retryDelay: 150 });
  } catch (error) {
    console.log(`note - could not remove temporary directory ${path}: ${error.message}`);
  }
}

function stopProcess(child) {
  if (!child || child.killed) {
    return;
  }

  child.stderr?.destroy();
  child.stdout?.destroy();
  child.kill("SIGTERM");
  child.unref();
}

process.on("exit", cleanup);
process.on("SIGINT", () => {
  cleanup();
  process.exit(130);
});
process.on("SIGTERM", () => {
  cleanup();
  process.exit(143);
});

main().catch((error) => {
  cleanup();
  console.error(`fail - ${error.message}`);
  process.exit(1);
});
