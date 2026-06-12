import { existsSync, readFileSync } from "node:fs";

const EXPECTED_HOST = "souluk319.github.io";
const EXPECTED_PATH_PREFIX = "/TrashCam2004/";
const EXPECTED_VERSION = "0.1.0-beta.1";
const EXPECTED_PRESET_COUNT = 12;
const VALID_SAVE_KINDS = new Set(["shared", "downloaded"]);

function logOk(message) {
  console.log(`ok - ${message}`);
}

function logWarn(message) {
  console.log(`warn - ${message}`);
}

function logFail(message) {
  console.error(`fail - ${message}`);
}

function usage() {
  console.log(`TrashCam 2004 phone report check

Usage:
  npm run verify:phone-report -- --file path/to/phone-report.txt
  pbpaste | npm run verify:phone-report
  npm run verify:phone-report:self-test

Pass requires a real phone report copied from ?debug=1 after:
  device/browser filled -> camera permission -> moving preview -> PNG shared/downloaded -> saved file opened -> effect confirmed
`);
}

function parseArgs(argv) {
  const args = { file: "", selfTest: false, help: false };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === "--self-test") {
      args.selfTest = true;
      continue;
    }

    if (arg === "--help" || arg === "-h") {
      args.help = true;
      continue;
    }

    if (arg === "--file") {
      args.file = argv[index + 1] ?? "";
      index += 1;
      continue;
    }

    if (!args.file && !arg.startsWith("-")) {
      args.file = arg;
      continue;
    }

    throw new Error(`Unknown argument: ${arg}`);
  }

  return args;
}

function readInput(file) {
  if (file) {
    if (!existsSync(file)) {
      throw new Error(`Report file does not exist: ${file}`);
    }

    return readFileSync(file, "utf8");
  }

  if (process.stdin.isTTY) {
    return "";
  }

  return readFileSync(0, "utf8");
}

function parseReport(text) {
  const fields = new Map();
  const lines = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);

  for (const line of lines) {
    const separator = line.indexOf("=");

    if (separator <= 0) {
      continue;
    }

    fields.set(line.slice(0, separator), line.slice(separator + 1));
  }

  return {
    title: lines[0] ?? "",
    fields
  };
}

function validateReport(report) {
  const failures = [];
  const warnings = [];
  const get = (key) => report.fields.get(key) ?? "";

  requireValue(
    report.title === "TrashCam 2004 phone test report",
    "report title is TrashCam 2004 phone test report",
    failures
  );

  validateUrl(get("url"), failures);
  validateNumber("maxTouchPoints", get("maxTouchPoints"), (value) => value > 0, "maxTouchPoints is greater than 0", failures);
  validateSize("screen", get("screen"), failures);
  validateSize("viewport", get("viewport"), failures);
  validateSize("video", get("video"), failures, { allowZero: false });
  validateNumber("frames", get("frames"), (value) => value > 0, "frames is greater than 0", failures);
  validateNumber("bytes", get("bytes"), (value) => value > 0, "bytes is greater than 0", failures);

  requireField("userAgent", get("userAgent"), failures);
  requireField("device", get("device"), failures);
  requireField("browser", get("browser"), failures);
  requireField("platform", get("platform"), failures);
  requireField("orientation", get("orientation"), failures);
  requireField("language", get("language"), failures);
  requireField("file", get("file"), failures);

  requireValue(get("mobileCandidate") === "yes", "mobileCandidate=yes", failures);
  requireValue(get("acceptanceGate") === "phone-pass-candidate", "acceptanceGate=phone-pass-candidate", failures);
  requireValue(get("source") === "camera", "source=camera", failures);
  requireValue(get("camera") === "ready", "camera=ready", failures);
  requireValue(get("cameraError") === "none", "cameraError=none", failures);
  requireValue(get("secure") === "true", "secure=true", failures);
  requireValue(get("version") === EXPECTED_VERSION, `version=${EXPECTED_VERSION}`, failures);
  requireValue(Number(get("presets")) === EXPECTED_PRESET_COUNT, `presets=${EXPECTED_PRESET_COUNT}`, failures);
  requireValue(VALID_SAVE_KINDS.has(get("save")), "save is shared or downloaded", failures);
  requireValue(get("captureReview") === "visible", "captureReview=visible", failures);
  requireValue(/\.png$/i.test(get("file")), "file ends with .png", failures);
  requireValue(get("manualCameraPermission") === "yes", "manualCameraPermission=yes", failures);
  requireValue(get("manualPreviewMoving") === "yes", "manualPreviewMoving=yes", failures);
  requireValue(get("manualShareSheetOrDownload") === "yes", "manualShareSheetOrDownload=yes", failures);
  requireValue(get("manualSavedFileOpened") === "yes", "manualSavedFileOpened=yes", failures);
  requireValue(get("manualSavedEffectVisible") === "yes", "manualSavedEffectVisible=yes", failures);
  requireValue(get("acceptanceCandidate") === "yes", "acceptanceCandidate=yes", failures);

  if (!get("notes")) {
    warnings.push("notes field is blank; add anything unusual from the phone test if needed");
  }

  return { failures, warnings };
}

function validateUrl(value, failures) {
  if (!value) {
    failures.push("url is missing");
    return;
  }

  let url;

  try {
    url = new URL(value);
  } catch {
    failures.push(`url is invalid: ${value}`);
    return;
  }

  requireValue(url.protocol === "https:", "url uses https", failures);
  requireValue(url.hostname === EXPECTED_HOST, `url host is ${EXPECTED_HOST}`, failures);
  requireValue(url.pathname.startsWith(EXPECTED_PATH_PREFIX), `url path starts with ${EXPECTED_PATH_PREFIX}`, failures);
  requireValue(url.searchParams.get("debug") === "1", "url includes debug=1", failures);
  requireValue(url.searchParams.get("demo") !== "1", "url is not demo=1", failures);
  requireValue(url.searchParams.get("camera") !== "off", "url is not camera=off", failures);
  requireValue(url.searchParams.get("save") !== "prepare", "url is not save=prepare", failures);
}

function validateNumber(key, raw, predicate, message, failures) {
  if (!raw) {
    failures.push(`${key} is missing`);
    return;
  }

  const value = Number(raw);

  if (!Number.isFinite(value)) {
    failures.push(`${key} is not a number: ${raw}`);
    return;
  }

  requireValue(predicate(value), message, failures);
}

function validateSize(key, raw, failures, options = {}) {
  const allowZero = options.allowZero ?? false;

  if (!/^\d+x\d+$/.test(raw)) {
    failures.push(`${key} must look like WIDTHxHEIGHT, got ${raw || "missing"}`);
    return;
  }

  const [width, height] = raw.split("x").map(Number);
  const valid = allowZero ? width >= 0 && height >= 0 : width > 0 && height > 0;

  requireValue(valid, `${key} has non-zero dimensions`, failures);
}

function requireField(key, value, failures) {
  requireValue(Boolean(value && value !== "-"), `${key} is present`, failures);
}

function requireValue(condition, message, failures) {
  if (!condition) {
    failures.push(message);
  }
}

function printValidation(result) {
  for (const warning of result.warnings) {
    logWarn(warning);
  }

  if (result.failures.length > 0) {
    for (const failure of result.failures) {
      logFail(failure);
    }

    return false;
  }

  logOk("phone report satisfies real-device acceptance gates");
  return true;
}

function runSelfTest() {
  const passing = validateReport(parseReport(SAMPLE_PASS_REPORT));
  const failing = validateReport(parseReport(SAMPLE_DEMO_REPORT));

  if (passing.failures.length > 0) {
    throw new Error(`self-test pass fixture failed: ${passing.failures.join(" | ")}`);
  }

  if (failing.failures.length === 0) {
    throw new Error("self-test demo fixture unexpectedly passed");
  }

  if (!failing.failures.some((failure) => failure.includes("url is not demo=1"))) {
    throw new Error("self-test demo fixture did not reject demo=1");
  }

  if (!failing.failures.some((failure) => failure.includes("save is shared or downloaded"))) {
    throw new Error("self-test demo fixture did not reject prepare-only save");
  }

  logOk("phone report parser self-test passed");
}

const SAMPLE_PASS_REPORT = `TrashCam 2004 phone test report
time=2026-06-12T13:10:00.000Z
url=https://souluk319.github.io/TrashCam2004/?debug=1
device=iPhone test fixture
browser=Safari test fixture
userAgent=Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 Version/18.5 Mobile/15E148 Safari/604.1
platform=iPhone
maxTouchPoints=5
screen=390x844
orientation=portrait-primary
language=ko-KR
mobileCandidate=yes
acceptanceGate=phone-pass-candidate
source=camera
camera=ready
cameraError=none
secure=true
version=0.1.0-beta.1
presets=12
viewport=390x733
devicePixelRatio=3
video=640x480
frames=120
preset=pixelart
category=game
shareCapability=file-share
save=shared
captureReview=visible
bytes=712345
file=trashcam-2004-pixel-art-cam-20260612-221000.png
status=공유 메뉴에서 이미지 저장을 선택해줘.
manualCameraPermission=yes
manualPreviewMoving=yes
manualShareSheetOrDownload=yes
manualSavedFileOpened=yes
manualSavedEffectVisible=yes
acceptanceCandidate=yes
notes=fixture
`;

const SAMPLE_DEMO_REPORT = `TrashCam 2004 phone test report
time=2026-06-12T13:10:00.000Z
url=https://souluk319.github.io/TrashCam2004/?demo=1&debug=1&save=prepare
device=
browser=
userAgent=Mozilla/5.0
platform=MacIntel
maxTouchPoints=0
screen=390x844
orientation=portrait-primary
language=ko-KR
mobileCandidate=no
acceptanceGate=synthetic-or-local-check
source=demo
camera=ready
cameraError=none
secure=true
version=0.1.0-beta.1
presets=12
viewport=390x733
devicePixelRatio=2
video=640x480
frames=120
preset=pixelart
category=game
shareCapability=file-share
save=prepared
captureReview=visible
bytes=712345
file=trashcam-2004-pixel-art-cam-20260612-221000.png
status=PNG prepared. Delivery skipped for local verification.
manualCameraPermission=no
manualPreviewMoving=yes
manualShareSheetOrDownload=prepare-only
manualSavedFileOpened=yes
manualSavedEffectVisible=yes
acceptanceCandidate=no
notes=fixture
`;

try {
  const args = parseArgs(process.argv.slice(2));

  if (args.help) {
    usage();
    process.exit(0);
  }

  if (args.selfTest) {
    runSelfTest();
    process.exit(0);
  }

  const input = readInput(args.file);

  if (!input.trim()) {
    usage();
    process.exit(2);
  }

  const report = parseReport(input);
  const valid = printValidation(validateReport(report));
  process.exit(valid ? 0 : 1);
} catch (error) {
  logFail(error.message);
  process.exit(1);
}
