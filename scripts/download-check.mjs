import { existsSync, mkdtempSync, readdirSync, readFileSync, rmSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, join } from "node:path";
import { spawn } from "node:child_process";
import net from "node:net";

const PREVIEW_PORT = 4174;
const PREVIEW_URL = `http://127.0.0.1:${PREVIEW_PORT}/?demo=1&debug=1`;
const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
const EXPECTED_WIDTH = 640;
const EXPECTED_HEIGHT = 480;
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
let downloadDir = "";
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
    userDataDir = mkdtempSync(join(tmpdir(), "trashcam-download-chrome-"));
    downloadDir = mkdtempSync(join(tmpdir(), "trashcam-downloads-"));

    chromeProcess = spawn(chromePath, [
      "--headless=new",
      `--remote-debugging-port=${debuggingPort}`,
      `--user-data-dir=${userDataDir}`,
      "--no-first-run",
      "--no-default-browser-check",
      "--autoplay-policy=no-user-gesture-required",
      "about:blank"
    ], {
      stdio: ["ignore", "ignore", "pipe"]
    });

    const stderrLines = [];
    chromeProcess.stderr?.on("data", (chunk) => {
      stderrLines.push(String(chunk).trim());
    });

    await waitForDevTools(debuggingPort);
    const pageTarget = await waitForPageTarget(debuggingPort);
    const client = await connectToCdp(pageTarget.webSocketDebuggerUrl);
    const browserProblems = [];
    const downloads = new Map();

    client.on("Log.entryAdded", ({ entry }) => {
      if (entry.level === "error" || entry.level === "warning") {
        const sourceUrl = entry.url ? ` (${entry.url})` : "";
        browserProblems.push(`${entry.level}: ${entry.text}${sourceUrl}`);
      }
    });
    client.on("Runtime.consoleAPICalled", ({ type, args = [] }) => {
      if (type === "error" || type === "warning") {
        const text = args.map((arg) => arg.value ?? arg.description ?? "").join(" ");
        browserProblems.push(`${type}: ${text}`);
      }
    });
    client.on("Runtime.exceptionThrown", ({ exceptionDetails }) => {
      browserProblems.push(`exception: ${exceptionDetails.text ?? "runtime exception"}`);
    });
    client.on("Browser.downloadWillBegin", ({ guid, suggestedFilename }) => {
      downloads.set(guid, { filename: suggestedFilename, state: "started", receivedBytes: 0 });
    });
    client.on("Browser.downloadProgress", ({ guid, state, receivedBytes }) => {
      const previous = downloads.get(guid) ?? { filename: "", state: "unknown", receivedBytes: 0 };
      downloads.set(guid, { ...previous, state, receivedBytes });
    });

    try {
      await client.send("Runtime.enable");
      await client.send("Log.enable");
      await client.send("Page.enable");
      await allowDownloads(client, downloadDir);
      await client.send("Page.navigate", { url: PREVIEW_URL });
      await waitForDemoReady(client);
      logOk("download check loaded production preview demo source");

      await evaluate(client, "document.querySelector('[data-save]')?.click()");
      await waitForDownloadedState(client);
      const state = await readAppState(client);
      const download = await waitForDownloadedFile(state.filename);
      assertPngFile(download.path, state.bytes);

      if (browserProblems.length > 0) {
        fail(`download check emitted browser problems: ${browserProblems.join(" | ")}`);
      }

      const completed = [...downloads.values()].filter((item) => item.state === "completed");
      if (completed.length > 0) {
        logOk(`Chrome reported completed download: ${completed[0].filename || state.filename}`);
      }

      logOk(`downloaded PNG file verified: ${basename(download.path)} ${download.bytes} bytes`);
    } finally {
      await client.close();
    }

    if (stderrLines.some((line) => /\b(ERROR|FATAL)\b/.test(line))) {
      console.log("note - Chrome emitted stderr lines; inspect only if download check becomes flaky");
    }
  } finally {
    cleanup();
  }
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

  fail("Chrome/Chromium not found. Set CHROME_BIN to run download verification.");
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
    const response = await fetch(`http://127.0.0.1:${port}/json/list`);
    lastTargets = await response.json();
    return lastTargets.some((target) => target.type === "page");
  }, 10_000, "Chrome page target did not open");

  return lastTargets.find((target) => target.type === "page");
}

async function connectToCdp(url) {
  const socket = new WebSocket(url);
  const pending = new Map();
  const listeners = new Map();
  let nextId = 1;

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
        return;
      }

      request.resolve(message.result);
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

async function allowDownloads(client, path) {
  try {
    await client.send("Browser.setDownloadBehavior", {
      behavior: "allow",
      downloadPath: path,
      eventsEnabled: true
    });
    return;
  } catch {
    await client.send("Page.setDownloadBehavior", {
      behavior: "allow",
      downloadPath: path
    });
  }
}

async function waitForDemoReady(client) {
  await waitFor(async () => {
    const state = await readAppState(client);
    return (
      state.url.startsWith(PREVIEW_URL)
      && state.source === "demo"
      && state.camera === "ready"
      && state.secure === "true"
      && state.frames > 0
    );
  }, 12_000, "download check demo did not reach ready state");
}

async function waitForDownloadedState(client) {
  await waitFor(async () => {
    const state = await readAppState(client);
    return (
      state.save === "downloaded"
      && state.captureReview === "visible"
      && state.bytes > 0
      && /^trashcam-2004-.+\.png$/.test(state.filename)
    );
  }, 8_000, "app did not reach downloaded PNG state");
}

async function waitForDownloadedFile(expectedFilename) {
  let lastFiles = [];

  await waitFor(() => {
    lastFiles = readdirSync(downloadDir).filter((name) => !name.endsWith(".crdownload"));
    return lastFiles.includes(expectedFilename);
  }, 8_000, `downloaded file ${expectedFilename} did not appear; saw ${lastFiles.join(", ") || "none"}`);

  const path = join(downloadDir, expectedFilename);
  return { path, bytes: statSync(path).size };
}

function assertPngFile(path, expectedBytes) {
  const buffer = readFileSync(path);

  if (buffer.length !== expectedBytes) {
    fail(`downloaded file size ${buffer.length} did not match app bytes ${expectedBytes}`);
  }

  for (let index = 0; index < PNG_SIGNATURE.length; index += 1) {
    if (buffer[index] !== PNG_SIGNATURE[index]) {
      fail("downloaded file does not have a PNG signature");
    }
  }

  const width = buffer.readUInt32BE(16);
  const height = buffer.readUInt32BE(20);

  if (width !== EXPECTED_WIDTH || height !== EXPECTED_HEIGHT) {
    fail(`expected PNG dimensions ${EXPECTED_WIDTH}x${EXPECTED_HEIGHT}, got ${width}x${height}`);
  }
}

async function readAppState(client) {
  return evaluate(client, `(() => {
    const app = document.querySelector("#app");

    return {
      url: window.location.href,
      source: app?.dataset.sourceMode ?? "",
      camera: app?.dataset.cameraState ?? "",
      secure: app?.dataset.secureContext ?? "",
      frames: Number(app?.dataset.renderedFrames ?? 0),
      save: app?.dataset.lastSaveKind ?? "",
      bytes: Number(app?.dataset.lastSaveBytes ?? 0),
      filename: app?.dataset.lastSaveName ?? "",
      captureReview: app?.dataset.captureReview ?? ""
    };
  })()`);
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

  fail(timeoutMessage);
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
    rmSync(userDataDir, { force: true, recursive: true });
  }

  if (downloadDir && existsSync(downloadDir)) {
    rmSync(downloadDir, { force: true, recursive: true });
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
  console.error(`fail - ${error.message}`);
  cleanup();
  process.exit(1);
});
