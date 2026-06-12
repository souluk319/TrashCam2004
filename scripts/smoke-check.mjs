import { existsSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const failures = [];

function pass(message) {
  console.log(`ok - ${message}`);
}

function fail(message) {
  failures.push(message);
  console.error(`fail - ${message}`);
}

function assert(condition, message) {
  if (condition) {
    pass(message);
    return;
  }

  fail(message);
}

function readJson(path) {
  return JSON.parse(readFileSync(join(root, path), "utf8"));
}

function readText(path) {
  return readFileSync(join(root, path), "utf8");
}

function fileExists(path) {
  return existsSync(join(root, path)) && statSync(join(root, path)).isFile();
}

function directoryExists(path) {
  return existsSync(join(root, path)) && statSync(join(root, path)).isDirectory();
}

function headerValue(key) {
  const allPathHeaders =
    vercelJson.headers?.find((rule) => rule.source === "/(.*)")?.headers ?? [];
  return allPathHeaders.find((header) => header.key === key)?.value;
}

const packageJson = readJson("package.json");
const vercelJson = readJson("vercel.json");
const indexSource = readText("index.html");
const distIndex = fileExists("dist/index.html") ? readText("dist/index.html") : "";
const mainSource = readText("src/main.ts");
const cameraSource = readText("src/camera.ts");
const saveSource = readText("src/save.ts");
const effectsSource = readText("src/effects.ts");
const presetSource = readText("src/presets.ts");
const viteConfigSource = readText("vite.config.ts");
const fakeCameraSource = fileExists("scripts/fake-camera-check.mjs")
  ? readText("scripts/fake-camera-check.mjs")
  : "";
const downloadCheckSource = fileExists("scripts/download-check.mjs")
  ? readText("scripts/download-check.mjs")
  : "";
const phoneReportCheckSource = fileExists("scripts/phone-report-check.mjs")
  ? readText("scripts/phone-report-check.mjs")
  : "";
const pagesCheckSource = fileExists("scripts/pages-check.mjs")
  ? readText("scripts/pages-check.mjs")
  : "";

assert(packageJson.scripts?.dev === "vite", "package.json has dev script");
assert(
  packageJson.scripts?.["dev:local"] === "vite --host 127.0.0.1 --port 5174 --strictPort",
  "package.json has stable TrashCam local dev port",
);
assert(packageJson.scripts?.build === "tsc && vite build", "package.json has build script");
assert(packageJson.scripts?.preview === "vite preview", "package.json has preview script");
assert(
  packageJson.scripts?.["preview:local"] === "vite preview --host 127.0.0.1 --port 4174 --strictPort",
  "package.json has stable local preview port",
);
assert(
  packageJson.scripts?.readiness === "npm run smoke && node scripts/readiness-check.mjs",
  "package.json has readiness check script",
);
assert(
  packageJson.scripts?.["verify:fake-camera"] === "npm run build && node scripts/fake-camera-check.mjs",
  "package.json has fake camera verification script",
);
assert(
  packageJson.scripts?.["verify:download"] === "npm run build && node scripts/download-check.mjs",
  "package.json has fallback download verification script",
);
assert(
  packageJson.scripts?.["verify:phone-report"] === "node scripts/phone-report-check.mjs",
  "package.json has phone report verification script",
);
assert(
  packageJson.scripts?.["verify:phone-report:self-test"] === "node scripts/phone-report-check.mjs --self-test",
  "package.json has phone report parser self-test script",
);
assert(
  packageJson.scripts?.["verify:pages"] === "npm run build:pages && node scripts/pages-check.mjs",
  "package.json has stable Pages verification script",
);
assert(
  packageJson.scripts?.["build:pages"] === "VITE_BASE_PATH=/TrashCam2004/ npm run build",
  "package.json has GitHub Pages build script",
);
assert(viteConfigSource.includes("VITE_BASE_PATH"), "vite config supports deployment base path override");
assert(readText("scripts/readiness-check.mjs").includes("GitHub Pages is the configured stable HTTPS fallback"), "readiness check recognizes GitHub Pages fallback");
assert(fakeCameraSource.includes("--use-fake-device-for-media-stream"), "fake camera verification uses Chrome fake media device");
assert(fakeCameraSource.includes('source === "camera"'), "fake camera verification requires source=camera");
assert(fakeCameraSource.includes('camera === "ready"'), "fake camera verification requires camera=ready");
assert(fakeCameraSource.includes('phoneReport.includes("source=camera")'), "fake camera verification checks phone test report camera source");
assert(fakeCameraSource.includes('captureReview === "visible"'), "fake camera verification checks capture review after save");
assert(fakeCameraSource.includes("cleanup();"), "fake camera verification cleans up browser processes");
assert(downloadCheckSource.includes("Browser.setDownloadBehavior"), "download verification allows a controlled Chrome download folder");
assert(downloadCheckSource.includes('state.save === "downloaded"'), "download verification requires fallback downloaded state");
assert(downloadCheckSource.includes("PNG_SIGNATURE"), "download verification checks PNG file signature");
assert(downloadCheckSource.includes("readUInt32BE(16)"), "download verification checks PNG dimensions");
assert(downloadCheckSource.includes("buffer.length !== expectedBytes"), "download verification compares file size with app bytes");
assert(phoneReportCheckSource.includes("phone-pass-candidate"), "phone report verification requires phone pass candidate gate");
assert(phoneReportCheckSource.includes('source") === "camera"'), "phone report verification requires camera source");
assert(phoneReportCheckSource.includes("VALID_SAVE_KINDS"), "phone report verification requires shared or downloaded save");
assert(phoneReportCheckSource.includes('manualSavedEffectVisible") === "yes"'), "phone report verification requires visible saved effect evidence");
assert(phoneReportCheckSource.includes('url.searchParams.get("demo") !== "1"'), "phone report verification rejects demo reports");
assert(phoneReportCheckSource.includes("--self-test"), "phone report verification includes parser self-test mode");
assert(pagesCheckSource.includes("https://souluk319.github.io/TrashCam2004/"), "stable Pages verification targets GitHub Pages URL");
assert(pagesCheckSource.includes("getExpectedDistAssets"), "stable Pages verification compares live assets with local Pages build");
assert(pagesCheckSource.includes("data-manual-file-opened"), "stable Pages verification checks manual saved-file control");
assert(pagesCheckSource.includes("data-manual-effect-visible"), "stable Pages verification checks manual saved-effect control");
assert(pagesCheckSource.includes("overflowCount"), "stable Pages verification checks horizontal overflow");
assert(pagesCheckSource.includes("browserProblems"), "stable Pages verification checks browser warnings/errors");

assert(vercelJson.framework === "vite", "vercel framework is vite");
assert(vercelJson.buildCommand === "npm run build", "vercel build command is npm run build");
assert(vercelJson.outputDirectory === "dist", "vercel output directory is dist");
assert(
  headerValue("Permissions-Policy") === "camera=(self), microphone=(), geolocation=()",
  "vercel allows same-origin camera and disables unused device permissions",
);
assert(headerValue("Referrer-Policy") === "no-referrer", "vercel sends no-referrer policy");
assert(
  headerValue("X-Content-Type-Options") === "nosniff",
  "vercel sends nosniff content type protection",
);

assert(fileExists("index.html"), "index.html exists");
assert(fileExists("public/.nojekyll"), "GitHub Pages no-Jekyll marker exists");
assert(fileExists("src/main.ts"), "src/main.ts exists");
assert(fileExists("src/camera.ts"), "src/camera.ts exists");
assert(fileExists("src/effects.ts"), "src/effects.ts exists");
assert(fileExists("src/presets.ts"), "src/presets.ts exists");
assert(fileExists("src/save.ts"), "src/save.ts exists");
assert(fileExists("src/demo-source.ts"), "src/demo-source.ts exists");
assert(fileExists("scripts/readiness-check.mjs"), "readiness check script exists");
assert(fileExists("scripts/fake-camera-check.mjs"), "fake camera verification script exists");
assert(fileExists("scripts/download-check.mjs"), "fallback download verification script exists");
assert(fileExists("scripts/phone-report-check.mjs"), "phone report verification script exists");
assert(fileExists("scripts/pages-check.mjs"), "stable Pages verification script exists");
assert(fileExists("public/favicon.svg"), "public favicon exists");
assert(indexSource.includes('name="description"'), "index has public beta description meta");
assert(indexSource.includes('property="og:title"'), "index has Open Graph title");
assert(indexSource.includes('property="og:description"'), "index has Open Graph description");
assert(indexSource.includes('href="%BASE_URL%favicon.svg"'), "index links favicon with deployment base path");

assert(fileExists("dist/index.html"), "dist/index.html exists after build");
assert(fileExists("dist/.nojekyll"), "dist includes GitHub Pages no-Jekyll marker");
assert(directoryExists("dist/assets"), "dist/assets exists after build");
assert(/assets\/index-.*\.js/.test(distIndex), "dist index references bundled JavaScript");
assert(/assets\/index-.*\.css/.test(distIndex), "dist index references bundled CSS");

assert(cameraSource.includes("navigator.mediaDevices.getUserMedia"), "camera uses getUserMedia");
assert(cameraSource.includes("window.isSecureContext"), "camera checks secure context before getUserMedia");
assert(cameraSource.includes('"insecure-context"'), "camera has insecure context error kind");
assert(cameraSource.includes('"playback-blocked"'), "camera distinguishes blocked video playback");
assert(cameraSource.includes('facingMode: "user"'), "camera prefers front-facing mode");
assert(cameraSource.includes("GENERIC_CAMERA_CONSTRAINTS"), "camera has generic fallback constraints");
assert(cameraSource.includes("CAMERA_START_TIMEOUT_MS"), "camera startup has a bounded metadata wait");
assert(cameraSource.includes("stopStream(stream)"), "camera stops acquired stream after startup failure");

assert(mainSource.includes("data-preview"), "UI creates visible preview canvas");
assert(mainSource.includes("data-video"), "UI creates hidden video source");
assert(mainSource.includes("requestAnimationFrame(render)"), "render loop uses requestAnimationFrame");
assert(mainSource.includes("imageSmoothingEnabled = false"), "render path disables image smoothing");
assert(mainSource.includes('setAppState("secureContext"'), "app exposes secure context smoke state");
assert(mainSource.includes("HTTPS 링크로 다시 열어줘"), "UI explains HTTPS requirement for phone camera");
assert(mainSource.includes('setAppState("renderedFrames"'), "app exposes render smoke state");
assert(mainSource.includes("shouldShowDebugPanel"), "app has opt-in debug panel mode");
assert(mainSource.includes('data-debug-key="cameraState"'), "debug panel exposes camera state");
assert(mainSource.includes('data-debug-key="cameraError"'), "debug panel exposes camera failure reason");
assert(mainSource.includes('data-debug-key="appVersion"'), "debug panel exposes app version");
assert(mainSource.includes('data-debug-key="presetCount"'), "debug panel exposes preset count");
assert(mainSource.includes('data-debug-key="shareCapability"'), "debug panel exposes save/share capability");
assert(mainSource.includes('data-debug-key="captureReview"'), "debug panel exposes capture review state");
assert(mainSource.includes('data-debug-key="acceptanceGate"'), "debug panel exposes real-device acceptance gate");
assert(mainSource.includes('data-debug-key="videoSize"'), "debug panel exposes source video dimensions");
assert(mainSource.includes('data-debug-key="manualSavedFileOpened"'), "debug panel exposes manual saved-file evidence");
assert(mainSource.includes('data-debug-key="manualSavedEffectVisible"'), "debug panel exposes manual saved-effect evidence");
assert(mainSource.includes("data-manual-file-opened"), "debug panel has manual saved-file checkbox");
assert(mainSource.includes("data-manual-effect-visible"), "debug panel has manual saved-effect checkbox");
assert(mainSource.includes("cameraError="), "debug report includes camera failure reason");
assert(mainSource.includes("version="), "debug report includes app version");
assert(mainSource.includes("presets="), "debug report includes preset count");
assert(mainSource.includes("viewport="), "debug report includes viewport size");
assert(mainSource.includes("devicePixelRatio="), "debug report includes device pixel ratio");
assert(mainSource.includes("shareCapability="), "debug report includes save/share capability");
assert(mainSource.includes("acceptanceGate="), "debug report includes real-device acceptance gate");
assert(mainSource.includes("captureReview="), "debug report includes capture review state");
assert(mainSource.includes("video="), "debug report includes source video dimensions");
assert(mainSource.includes("platform="), "debug and phone reports include browser platform evidence");
assert(mainSource.includes("maxTouchPoints="), "debug and phone reports include touch capability evidence");
assert(mainSource.includes("screen="), "debug and phone reports include physical screen size evidence");
assert(mainSource.includes("orientation="), "debug and phone reports include screen orientation evidence");
assert(mainSource.includes("language="), "debug and phone reports include browser language evidence");
assert(mainSource.includes("mobileCandidate="), "debug and phone reports include mobile candidate evidence");
assert(mainSource.includes("isLikelyMobileDevice"), "phone report computes likely mobile evidence");
assert(mainSource.includes("manualSavedFileOpened="), "phone test report includes manual saved-file evidence");
assert(mainSource.includes("manualSavedEffectVisible="), "phone test report includes manual saved-effect evidence");
assert(mainSource.includes("acceptanceCandidate="), "phone test report includes acceptance candidate field");
assert(mainSource.includes("buildDebugReport"), "debug panel can build a copyable state report");
assert(mainSource.includes("data-debug-report"), "debug panel exposes generated state report for safe checks");
assert(mainSource.includes("buildPhoneTestReport"), "debug panel can build a copyable phone test report");
assert(mainSource.includes("data-phone-test-report"), "debug panel exposes generated phone test report for safe checks");
assert(mainSource.includes("manual-file-open-needed"), "acceptance gate waits for saved file open confirmation");
assert(mainSource.includes("manual-effect-check-needed"), "acceptance gate waits for saved effect confirmation");
assert(mainSource.includes("phone-pass-candidate"), "acceptance gate can mark a phone pass candidate");
assert(mainSource.includes("navigator.clipboard"), "debug panel can copy state to clipboard");
assert(mainSource.includes("data-privacy-open"), "app exposes privacy dialog trigger");
assert(mainSource.includes("does not upload photos or video"), "privacy dialog explains local camera handling");
assert(mainSource.includes("data-preset-pack"), "app exposes preset pack tabs");
assert(mainSource.includes("activePresetCategory"), "preset pack state is tracked");
assert(mainSource.includes("button.hidden = button.dataset.category !== activePresetCategory"), "preset buttons filter by active pack");
assert(mainSource.includes("data-capture-panel"), "app exposes capture review panel");
assert(mainSource.includes("data-capture-image"), "capture review renders the saved PNG");
assert(mainSource.includes("data-share-again"), "capture review can share the same saved PNG again");
assert(mainSource.includes("data-back-camera"), "capture review can return to the live camera");
assert(mainSource.includes("lastCaptureBlob"), "app stores the last capture blob for reuse");
assert(mainSource.includes("URL.revokeObjectURL"), "app revokes capture object URLs");

assert(saveSource.includes("canvas.toBlob"), "save path converts canvas to PNG blob");
assert(saveSource.includes("deliverBlob"), "save path can deliver an existing PNG blob");
assert(saveSource.includes("getSaveCapability"), "save path exposes share capability diagnostics");
assert(saveSource.includes("tryCreateShareData"), "save path guards File creation before sharing");
assert(saveSource.includes('typeof File !== "function"'), "save path falls back when File is unavailable");
assert(saveSource.includes("navigator.canShare"), "save path checks file share support");
assert(saveSource.includes("try {\n    return navigator.canShare"), "save path tolerates canShare failures");
assert(saveSource.includes("navigator.share"), "save path uses Web Share API when available");
assert(saveSource.includes("URL.createObjectURL"), "save path has object URL fallback");
assert(saveSource.includes("prepareOnly"), "save path supports prepared PNG smoke mode");
assert(mainSource.includes('setAppState("lastSaveBytes"'), "app exposes save byte smoke state");
assert(mainSource.includes('data-debug-key="lastSaveBytes"'), "debug panel exposes save byte state");

assert(presetSource.includes("PC Bang Cam 2004"), "PC Bang preset exists");
assert(presetSource.includes("Cyworld Selfie Cam"), "Cyworld preset exists");
assert(presetSource.includes("Laptop Webcam Hell"), "Laptop Webcam Hell preset exists");
assert(presetSource.includes("Pixel Art Cam"), "Pixel Art Cam preset exists");
assert(presetSource.includes("Cyberpunk Cam"), "Cyberpunk Cam preset exists");
assert(presetSource.includes("Voxel Block Cam"), "Voxel Block Cam preset exists");
assert(presetSource.includes("Receipt Printer Cam"), "Receipt Printer Cam preset exists");
assert(presetSource.includes("CCTV Evidence Cam"), "CCTV Evidence Cam preset exists");
assert(presetSource.includes("School ID Cam"), "School ID Cam preset exists");
assert(presetSource.includes("ASCII Terminal Cam"), "ASCII Terminal Cam preset exists");
assert(presetSource.includes("Deep Fried Meme Cam"), "Deep Fried Meme Cam preset exists");
assert(presetSource.includes("Sticker Booth Cam"), "Sticker Booth Cam preset exists");
assert(presetSource.includes('category: "future"'), "future preset category exists");
assert(presetSource.includes('category: "game"'), "game preset category exists");
assert(mainSource.includes("data-category"), "preset buttons expose preset category");
assert(effectsSource.includes("applyPaletteLimit"), "palette limit effect exists");
assert(effectsSource.includes("applyDither"), "dither effect exists");
assert(effectsSource.includes("applyRgbSplit"), "RGB split effect exists");
assert(effectsSource.includes("drawGlitchBars"), "glitch bars effect exists");
assert(effectsSource.includes("applyBlockAverage"), "block average effect exists");
assert(effectsSource.includes("drawCyberpunkHud"), "cyberpunk HUD effect exists");
assert(effectsSource.includes("applyReceiptDither"), "receipt printer dither effect exists");
assert(effectsSource.includes("applyGrayscaleTint"), "grayscale tint effect exists");
assert(effectsSource.includes("drawReceiptPrinterOverlay"), "receipt printer overlay exists");
assert(effectsSource.includes("drawCctvEvidenceHud"), "CCTV evidence HUD exists");
assert(effectsSource.includes("drawSchoolIdOverlay"), "school ID overlay exists");
assert(effectsSource.includes("applyAsciiPosterize"), "ASCII posterize effect exists");
assert(effectsSource.includes("drawAsciiTerminalOverlay"), "ASCII terminal overlay exists");
assert(effectsSource.includes("applyDeepFry"), "deep fried effect exists");
assert(effectsSource.includes("drawDeepFriedOverlay"), "deep fried overlay exists");
assert(effectsSource.includes("drawStickerBoothOverlay"), "sticker booth overlay exists");

if (failures.length > 0) {
  console.error(`\nSmoke check failed: ${failures.length} issue(s).`);
  process.exit(1);
}

console.log("\nSmoke check passed.");
