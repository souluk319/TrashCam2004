import { spawnSync } from "node:child_process";

const STABLE_DEBUG_URL = "https://souluk319.github.io/TrashCam2004/?debug=1";
const VERIFY_COMMAND = "pbpaste | npm run verify:phone-report";

function usage() {
  console.log(`TrashCam 2004 real phone test guide

Usage:
  npm run phone:test
  npm run phone:test -- --url-only
  npm run phone:test -- --copy-url
  npm run phone:test -- --help
`);
}

function parseArgs(argv) {
  const args = { copyUrl: false, help: false, urlOnly: false };

  for (const arg of argv) {
    if (arg === "--copy-url") {
      args.copyUrl = true;
      continue;
    }

    if (arg === "--url-only") {
      args.urlOnly = true;
      continue;
    }

    if (arg === "--help" || arg === "-h") {
      args.help = true;
      continue;
    }

    throw new Error(`Unknown argument: ${arg}`);
  }

  return args;
}

function copyUrlToClipboard() {
  const result = spawnSync("pbcopy", {
    encoding: "utf8",
    input: STABLE_DEBUG_URL,
    stdio: ["pipe", "ignore", "pipe"]
  });

  if (result.status !== 0) {
    const detail = (result.stderr || "").trim();
    throw new Error(`Could not copy URL with pbcopy${detail ? `: ${detail}` : ""}`);
  }
}

function printGuide() {
  console.log(`TrashCam 2004 real phone test

Open on phone:
  ${STABLE_DEBUG_URL}

Pass path:
  1. Open the URL on iPhone Safari or Android Chrome.
  2. Allow camera permission.
  3. Confirm debug values: secure=true, source=camera, camera=ready, frames increasing.
  4. Fill device and browser. Notes are optional.
  5. Switch at least one preset and tap Save PNG.
  6. Use the share sheet or download fallback.
  7. Open the saved image from Photos or Files/Downloads.
  8. Confirm the image has the TrashCam effect.
  9. Check file opened and effect visible.
  10. Tap Copy phone test.

Verify pasted phone report on this Mac:
  ${VERIFY_COMMAND}

The verifier only passes when the report proves:
  - stable HTTPS URL, not demo mode
  - source=camera and camera=ready
  - frames > 0
  - save=shared or save=downloaded
  - device/browser filled
  - saved file opened and effect visible
  - acceptanceGate=phone-pass-candidate

This command does not open a browser, request camera permission, or mutate deployment state.
`);
}

function main() {
  const args = parseArgs(process.argv.slice(2));

  if (args.help) {
    usage();
    return;
  }

  if (args.urlOnly) {
    console.log(STABLE_DEBUG_URL);
    return;
  }

  if (args.copyUrl) {
    copyUrlToClipboard();
    console.log(`ok - copied phone test URL to clipboard: ${STABLE_DEBUG_URL}`);
    return;
  }

  printGuide();
}

try {
  main();
} catch (error) {
  console.error(`fail - ${error.message}`);
  process.exit(1);
}
