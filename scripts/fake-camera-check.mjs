import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawn } from "node:child_process";
import net from "node:net";

const PREVIEW_PORT = 4174;
const PREVIEW_URL = `http://127.0.0.1:${PREVIEW_PORT}/?debug=1&save=prepare`;
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
    userDataDir = mkdtempSync(join(tmpdir(), "trashcam-fake-camera-"));

    chromeProcess = spawn(chromePath, [
      "--headless=new",
      `--remote-debugging-port=${debuggingPort}`,
      `--user-data-dir=${userDataDir}`,
      "--no-first-run",
      "--no-default-browser-check",
      "--autoplay-policy=no-user-gesture-required",
      "--use-fake-device-for-media-stream",
      "--use-fake-ui-for-media-stream",
      PREVIEW_URL
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

    try {
      await client.send("Runtime.enable");
      await client.send("Page.enable");
      await waitForCameraReady(client);
      logOk("fake camera opened through getUserMedia");

      const beforeSave = await readAppState(client);
      assertCameraState(beforeSave);

      await evaluate(client, "document.querySelector('[data-save]')?.click()");
      await waitForSavePrepared(client);
      const afterSave = await readAppState(client);

      if (afterSave.save !== "prepared") {
        fail(`expected save=prepared, got ${afterSave.save}`);
      }

      if (afterSave.captureReview !== "visible") {
        fail(`expected captureReview=visible, got ${afterSave.captureReview}`);
      }

      if (afterSave.acceptanceGate !== "png-prepared-only") {
        fail(`expected acceptanceGate=png-prepared-only, got ${afterSave.acceptanceGate}`);
      }

      if (afterSave.bytes <= 0) {
        fail(`expected positive PNG bytes, got ${afterSave.bytes}`);
      }

      if (!afterSave.phoneReportHasCamera) {
        fail("phone test report did not include source=camera");
      }

      if (!afterSave.phoneReportHasDeviceEvidence) {
        fail("phone test report did not include automatic device/browser evidence");
      }

      logOk(`fake camera PNG prepared: ${afterSave.bytes} bytes`);
      logOk("capture review opens after fake camera save");
    } finally {
      await client.close();
    }

    if (stderrLines.some((line) => /\b(ERROR|FATAL)\b/.test(line))) {
      console.log("note - Chrome emitted stderr lines; inspect only if fake-camera check becomes flaky");
    }
  } finally {
    cleanup();
  }
}

function assertCameraState(state) {
  if (state.source !== "camera") {
    fail(`expected source=camera, got ${state.source}`);
  }

  if (state.camera !== "ready") {
    fail(`expected camera=ready, got ${state.camera}`);
  }

  if (state.secure !== "true") {
    fail(`expected secure=true, got ${state.secure}`);
  }

  if (state.frames <= 0) {
    fail(`expected rendered frames > 0, got ${state.frames}`);
  }

  if (!/^[1-9][0-9]*x[1-9][0-9]*$/.test(state.videoSize)) {
    fail(`expected non-zero video size, got ${state.videoSize}`);
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

  fail("Chrome/Chromium not found. Set CHROME_BIN to run fake camera verification.");
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
    return lastTargets.some((target) => target.type === "page" && target.url.startsWith(PREVIEW_URL));
  }, 10_000, "Chrome page target did not open preview URL");

  return lastTargets.find((target) => target.type === "page" && target.url.startsWith(PREVIEW_URL));
}

async function connectToCdp(url) {
  const socket = new WebSocket(url);
  const pending = new Map();
  let nextId = 1;

  await new Promise((resolve, reject) => {
    socket.addEventListener("open", resolve, { once: true });
    socket.addEventListener("error", reject, { once: true });
  });

  socket.addEventListener("message", (event) => {
    const message = JSON.parse(event.data);

    if (!message.id) {
      return;
    }

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
    close() {
      socket.close();
      return Promise.resolve();
    }
  };
}

async function waitForCameraReady(client) {
  await waitFor(async () => {
    const state = await readAppState(client);
    return state.source === "camera" && state.camera === "ready" && state.frames > 0;
  }, 12_000, "fake camera did not reach source=camera camera=ready frames>0");
}

async function waitForSavePrepared(client) {
  await waitFor(async () => {
    const state = await readAppState(client);
    return state.save === "prepared" && state.captureReview === "visible" && state.bytes > 0;
  }, 8_000, "fake camera save did not prepare PNG");
}

async function readAppState(client) {
  return evaluate(client, `(() => {
    const app = document.querySelector("#app");
    const phoneReport = document.querySelector("[data-copy-phone-test]")?.dataset.phoneTestReport ?? "";

    return {
      source: app?.dataset.sourceMode ?? "",
      camera: app?.dataset.cameraState ?? "",
      secure: app?.dataset.secureContext ?? "",
      frames: Number(app?.dataset.renderedFrames ?? 0),
      videoSize: app?.dataset.videoSize ?? "",
      save: app?.dataset.lastSaveKind ?? "",
      acceptanceGate: app?.dataset.acceptanceGate ?? "",
      bytes: Number(app?.dataset.lastSaveBytes ?? 0),
      captureReview: app?.dataset.captureReview ?? "",
      phoneReportHasCamera: phoneReport.includes("source=camera"),
      phoneReportHasDeviceEvidence: (
        phoneReport.includes("userAgent=")
        && phoneReport.includes("platform=")
        && phoneReport.includes("maxTouchPoints=")
        && phoneReport.includes("screen=")
        && phoneReport.includes("orientation=")
        && phoneReport.includes("language=")
        && phoneReport.includes("mobileCandidate=")
      )
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
