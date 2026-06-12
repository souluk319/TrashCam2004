import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawn } from "node:child_process";
import net from "node:net";

const PAGES_ROOT_URL = "https://souluk319.github.io/TrashCam2004/";
const CHECK_URL = `${PAGES_ROOT_URL}?demo=1&debug=1&save=prepare&cacheBust=${Date.now()}`;
const CHROME_CANDIDATES = [
  process.env.CHROME_BIN,
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/Applications/Chromium.app/Contents/MacOS/Chromium",
  "google-chrome",
  "chromium",
  "chromium-browser"
].filter(Boolean);

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
    const expectedAssets = getExpectedDistAssets();
    await assertLiveHtmlUsesExpectedAssets(expectedAssets);

    const chromePath = await findChrome();
    const debuggingPort = await findFreePort();
    userDataDir = mkdtempSync(join(tmpdir(), "trashcam-pages-check-"));

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

    await waitForDevTools(debuggingPort);
    const pageTarget = await waitForPageTarget(debuggingPort);
    const client = await connectToCdp(pageTarget.webSocketDebuggerUrl);
    const browserProblems = [];

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

    try {
      await client.send("Runtime.enable");
      await client.send("Log.enable");
      await client.send("Page.enable");
      await client.send("Page.navigate", { url: CHECK_URL });
      await waitForDemoReady(client, expectedAssets);
      logOk("stable Pages URL loaded current deployed bundle");

      await evaluate(client, "document.querySelector('[data-save]')?.click()");
      await waitForSavePrepared(client);
      logOk("stable Pages PNG prepare opened capture review");

      await evaluate(client, `(() => {
        const fileOpened = document.querySelector("[data-manual-file-opened]");
        const effectVisible = document.querySelector("[data-manual-effect-visible]");
        fileOpened.checked = true;
        effectVisible.checked = true;
        fileOpened.dispatchEvent(new Event("change", { bubbles: true }));
        effectVisible.dispatchEvent(new Event("change", { bubbles: true }));
      })()`);
      await waitForManualEvidenceReport(client);
      logOk("stable Pages phone evidence report updates manual values");

      const finalState = await readAppState(client);

      if (finalState.overflowCount !== 0) {
        fail(`expected no horizontal overflow, got ${finalState.overflowCount}`);
      }

      if (browserProblems.length > 0) {
        fail(`stable Pages emitted browser problems: ${browserProblems.join(" | ")}`);
      }

      logOk(`stable Pages bytes=${finalState.bytes} gate=${finalState.acceptanceGate}`);
    } finally {
      await client.close();
    }
  } finally {
    cleanup();
  }
}

function getExpectedDistAssets() {
  const distIndex = readFileSync(join(process.cwd(), "dist", "index.html"), "utf8");
  const assets = [...distIndex.matchAll(/assets\/index-[^"']+\.(?:js|css)/g)].map((match) => match[0]);
  const expectedScript = assets.find((asset) => asset.endsWith(".js"));
  const expectedStyle = assets.find((asset) => asset.endsWith(".css"));

  if (!expectedScript || !expectedStyle) {
    fail("dist/index.html does not reference expected JS/CSS assets. Run npm run build:pages first.");
  }

  return { script: expectedScript, style: expectedStyle };
}

async function assertLiveHtmlUsesExpectedAssets(expectedAssets) {
  const [htmlResponse, nojekyllResponse] = await Promise.all([
    fetch(PAGES_ROOT_URL, { cache: "no-store" }),
    fetch(`${PAGES_ROOT_URL}.nojekyll`, { cache: "no-store" })
  ]);

  if (!htmlResponse.ok) {
    fail(`stable Pages root returned HTTP ${htmlResponse.status}`);
  }

  if (!nojekyllResponse.ok) {
    fail(`stable Pages .nojekyll returned HTTP ${nojekyllResponse.status}`);
  }

  const html = await htmlResponse.text();

  if (!html.includes(expectedAssets.script)) {
    fail(`stable Pages HTML does not reference ${expectedAssets.script}`);
  }

  if (!html.includes(expectedAssets.style)) {
    fail(`stable Pages HTML does not reference ${expectedAssets.style}`);
  }

  logOk(`stable Pages HTML references ${expectedAssets.script}`);
  logOk("stable Pages nojekyll marker is reachable");
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

  fail("Chrome/Chromium not found. Set CHROME_BIN to run stable Pages verification.");
}

function canSpawn(command, args) {
  return new Promise((resolve) => {
    const child = spawn(command, args, { stdio: "ignore" });
    child.on("error", () => resolve(false));
    child.on("exit", (code) => resolve(code === 0));
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

async function waitForDemoReady(client, expectedAssets) {
  await waitFor(async () => {
    const state = await readAppState(client);
    return (
      state.url.startsWith(PAGES_ROOT_URL)
      && state.scripts.some((script) => script.includes(expectedAssets.script))
      && state.styles.some((style) => style.includes(expectedAssets.style))
      && state.source === "demo"
      && state.camera === "ready"
      && state.secure === "true"
      && state.frames > 0
      && state.hasManualFileControl
      && state.hasManualEffectControl
    );
  }, 15_000, "stable Pages demo did not reach ready state");
}

async function waitForSavePrepared(client) {
  await waitFor(async () => {
    const state = await readAppState(client);
    return state.save === "prepared" && state.captureReview === "visible" && state.bytes > 0;
  }, 8_000, "stable Pages save did not prepare PNG");
}

async function waitForManualEvidenceReport(client) {
  await waitFor(async () => {
    const state = await readAppState(client);
    return (
      state.manualFile === "yes"
      && state.manualEffect === "yes"
      && state.reportHasManualFileYes
      && state.reportHasManualEffectYes
      && state.reportHasAcceptanceCandidateNo
      && state.reportHasDeviceEvidence
      && state.acceptanceGate === "synthetic-or-local-check"
    );
  }, 5_000, "stable Pages phone evidence report did not update");
}

async function readAppState(client) {
  return evaluate(client, `(() => {
    const app = document.querySelector("#app");
    const phoneReport = document.querySelector("[data-copy-phone-test]")?.dataset.phoneTestReport ?? "";
    const overflowing = [];

    for (const element of Array.from(document.querySelectorAll("*"))) {
      const rect = element.getBoundingClientRect();

      if (rect.width > 0 && (rect.left < -1 || rect.right > window.innerWidth + 1)) {
        overflowing.push(element.tagName);
      }
    }

    return {
      url: window.location.href,
      scripts: Array.from(document.scripts).map((script) => script.src).filter(Boolean),
      styles: Array.from(document.querySelectorAll('link[rel="stylesheet"]')).map((link) => link.href),
      source: app?.dataset.sourceMode ?? "",
      camera: app?.dataset.cameraState ?? "",
      secure: app?.dataset.secureContext ?? "",
      frames: Number(app?.dataset.renderedFrames ?? 0),
      save: app?.dataset.lastSaveKind ?? "",
      acceptanceGate: app?.dataset.acceptanceGate ?? "",
      captureReview: app?.dataset.captureReview ?? "",
      bytes: Number(app?.dataset.lastSaveBytes ?? 0),
      manualFile: app?.dataset.manualSavedFileOpened ?? "",
      manualEffect: app?.dataset.manualSavedEffectVisible ?? "",
      hasManualFileControl: Boolean(document.querySelector("[data-manual-file-opened]")),
      hasManualEffectControl: Boolean(document.querySelector("[data-manual-effect-visible]")),
      reportHasManualFileYes: phoneReport.includes("manualSavedFileOpened=yes"),
      reportHasManualEffectYes: phoneReport.includes("manualSavedEffectVisible=yes"),
      reportHasAcceptanceCandidateNo: phoneReport.includes("acceptanceCandidate=no"),
      reportHasDeviceEvidence: (
        phoneReport.includes("userAgent=")
        && phoneReport.includes("platform=")
        && phoneReport.includes("maxTouchPoints=")
        && phoneReport.includes("screen=")
        && phoneReport.includes("orientation=")
        && phoneReport.includes("language=")
        && phoneReport.includes("mobileCandidate=")
      ),
      overflowCount: overflowing.length
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

  if (userDataDir) {
    rmSync(userDataDir, { force: true, recursive: true });
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
