import { CameraError, startCamera, stopStream } from "./camera";
import {
  VOXEL_BLOCK_PALETTE,
  applyBlockAverage,
  applyBrightness,
  applyColorCast,
  applyContrast,
  applyDither,
  applyAsciiPosterize,
  applyDeepFry,
  applyGrayscaleTint,
  applyNoise,
  applyPaletteLimit,
  applyReceiptDither,
  applyRgbSplit,
  drawCctvEvidenceHud,
  drawCyberpunkHud,
  drawAsciiTerminalOverlay,
  drawDeepFriedOverlay,
  drawGlitchBars,
  drawPixelGrid,
  drawReceiptPrinterOverlay,
  drawScanlines,
  drawSchoolIdOverlay,
  drawStickerBoothOverlay,
  drawTimestamp
} from "./effects";
import { startDemoSource, type DemoSource } from "./demo-source";
import {
  BOOTH_CUT_COUNT,
  BOOTH_FRAME_TEMPLATES,
  CaptureSession,
  PhotoStripComposer,
  formatBoothFilename,
  getFrameTemplateById,
  type FrameTemplate
} from "./photo-strip";
import { DEFAULT_PRESET, PRESETS, getPresetById, type Preset, type PresetCategory } from "./presets";
import { deliverBlob, getSaveCapability, saveCanvas, saveNamedCanvas, type SaveResult } from "./save";
import "./styles.css";

const CANVAS_WIDTH = 640;
const CANVAS_HEIGHT = 480;
const APP_VERSION = "0.1.0-beta.1";
const PRESET_PACKS: Array<{ category: PresetCategory; label: string }> = [
  { category: "trash", label: "Trash" },
  { category: "future", label: "Future" },
  { category: "game", label: "Game" }
];
type CaptureMode = "single" | "booth";
type BoothState = "idle" | "countdown" | "capturing" | "ready" | "saving";

const app = requireNode(document.querySelector<HTMLDivElement>("#app"), "App root not found.");
const rootParams = new URLSearchParams(window.location.search);

app.innerHTML = `
  <main class="app-shell">
    <header class="top-bar">
      <div class="title-row">
        <h1>TrashCam 2004</h1>
        <button class="privacy-button" type="button" data-privacy-open>Privacy</button>
      </div>
      <p class="status" data-status>카메라 여는 중...</p>
    </header>

    <section class="preview-wrap" aria-label="TrashCam preview">
      <canvas class="preview" data-preview width="${CANVAS_WIDTH}" height="${CANVAS_HEIGHT}"></canvas>
      <video class="camera-source" data-video muted autoplay playsinline></video>
      <div class="booth-countdown" data-booth-countdown hidden aria-live="polite">
        <strong data-booth-countdown-value>3</strong>
        <span data-booth-countdown-label>Cut 1/${BOOTH_CUT_COUNT}</span>
      </div>
      <div class="boot-card" data-boot-card>
        <span>NO SIGNAL</span>
      </div>
    </section>

    <section class="capture-review" data-capture-panel hidden aria-label="Saved capture">
      <img class="capture-review-image" data-capture-image alt="Saved TrashCam capture" />
      <div class="capture-review-copy">
        <strong>Last capture</strong>
        <span data-capture-file>-</span>
      </div>
      <div class="capture-review-actions">
        <button class="capture-share-button" type="button" data-share-again>Share again</button>
        <button class="capture-back-button" type="button" data-back-camera>Back to camera</button>
      </div>
    </section>

    <section class="booth-panel" data-booth-panel hidden aria-label="4-Cut Booth">
      <div class="booth-progress">
        <strong data-booth-progress>0/${BOOTH_CUT_COUNT}</strong>
        <span data-booth-hint>Ready</span>
      </div>
      <div class="booth-thumbs" aria-label="4-Cut Booth captured frames">
        ${Array.from({ length: BOOTH_CUT_COUNT }, (_, index) => `
          <div class="booth-thumb" data-booth-thumb-slot="${index}">
            <canvas data-booth-thumb="${index}" width="160" height="120"></canvas>
            <span>${index + 1}</span>
          </div>
        `).join("")}
      </div>
      <div class="booth-frame-row" role="group" aria-label="4-Cut Booth frame">
        ${BOOTH_FRAME_TEMPLATES.map((template) => `
          <button
            class="booth-frame-button"
            type="button"
            data-booth-frame="${template.id}"
            aria-pressed="${template.id === BOOTH_FRAME_TEMPLATES[0].id}"
          >
            ${template.label}
          </button>
        `).join("")}
        <button class="booth-reset-button" type="button" data-booth-reset hidden>Retake</button>
      </div>
    </section>

    <footer class="control-bar">
      <div class="mode-tabs" role="tablist" aria-label="Capture mode">
        <button class="mode-button" type="button" role="tab" data-capture-mode="single" aria-selected="true">Single Shot</button>
        <button class="mode-button" type="button" role="tab" data-capture-mode="booth" aria-selected="false">4-Cut Booth</button>
      </div>

      <div class="preset-pack-tabs" role="tablist" aria-label="Preset pack">
        ${PRESET_PACKS.map(
          (pack) => `
            <button
              class="preset-pack-button"
              type="button"
              role="tab"
              data-preset-pack="${pack.category}"
              aria-selected="${pack.category === DEFAULT_PRESET.category}"
            >
              ${pack.label}
            </button>
          `
        ).join("")}
      </div>

      <div class="preset-group" role="group" aria-label="Preset">
        ${PRESETS.map(
          (preset) => `
            <button
              class="preset-button"
              type="button"
              data-preset="${preset.id}"
              data-category="${preset.category}"
              aria-pressed="${preset.id === DEFAULT_PRESET.id}"
            >
              ${preset.shortName}
            </button>
          `
        ).join("")}
      </div>

      <div class="action-row">
        <button class="save-button" type="button" data-save disabled>Save PNG</button>
        <button class="retry-button" type="button" data-retry hidden>Retry camera</button>
      </div>
    </footer>

    <aside class="debug-panel" data-debug-panel ${shouldShowDebugPanel() ? "" : "hidden"} aria-label="Debug state">
      <div><span>source</span><output data-debug-key="sourceMode">-</output></div>
      <div><span>camera</span><output data-debug-key="cameraState">-</output></div>
      <div><span>error</span><output data-debug-key="cameraError">-</output></div>
      <div><span>secure</span><output data-debug-key="secureContext">-</output></div>
      <div><span>version</span><output data-debug-key="appVersion">-</output></div>
      <div><span>presets</span><output data-debug-key="presetCount">-</output></div>
      <div><span>mode</span><output data-debug-key="captureMode">-</output></div>
      <div><span>booth</span><output data-debug-key="boothState">-</output></div>
      <div><span>cuts</span><output data-debug-key="boothCuts">0</output></div>
      <div><span>frame</span><output data-debug-key="boothFrame">-</output></div>
      <div><span>frames</span><output data-debug-key="renderedFrames">0</output></div>
      <div><span>preset</span><output data-debug-key="activePreset">-</output></div>
      <div><span>category</span><output data-debug-key="presetCategory">-</output></div>
      <div><span>save</span><output data-debug-key="lastSaveKind">-</output></div>
      <div><span>capture</span><output data-debug-key="captureReview">-</output></div>
      <div><span>share</span><output data-debug-key="shareCapability">-</output></div>
      <div><span>gate</span><output data-debug-key="acceptanceGate">-</output></div>
      <div><span>bytes</span><output data-debug-key="lastSaveBytes">-</output></div>
      <div><span>video</span><output data-debug-key="videoSize">-</output></div>
      <div><span>file open</span><output data-debug-key="manualSavedFileOpened">no</output></div>
      <div><span>effect</span><output data-debug-key="manualSavedEffectVisible">no</output></div>
      <div class="debug-wide"><span>file</span><output data-debug-key="lastSaveName">-</output></div>
      <div class="debug-wide"><span>status</span><output data-debug-key="statusMessage">-</output></div>
      <div class="debug-manual-checks" aria-label="Manual phone evidence">
        <label><input type="checkbox" data-manual-file-opened /> file opened</label>
        <label><input type="checkbox" data-manual-effect-visible /> effect visible</label>
      </div>
      <div class="debug-report-fields" aria-label="Phone test report details">
        <label><span>device</span><input type="text" data-phone-device-input autocomplete="off" /></label>
        <label><span>browser</span><input type="text" data-phone-browser-input autocomplete="off" /></label>
        <label class="debug-notes"><span>notes</span><textarea data-phone-notes-input rows="2"></textarea></label>
      </div>
      <button class="debug-copy-button" type="button" data-copy-debug data-debug-report="">Copy state</button>
      <button class="debug-copy-button" type="button" data-copy-phone-test data-phone-test-report="">Copy phone test</button>
    </aside>

    <dialog class="privacy-dialog" data-privacy-dialog>
      <div class="privacy-dialog-body">
        <h2>Privacy</h2>
        <p>Camera frames stay in this browser. TrashCam does not upload photos or video.</p>
        <button type="button" data-privacy-close>OK</button>
      </div>
    </dialog>
  </main>
`;

const video = requireNode(app.querySelector<HTMLVideoElement>("[data-video]"), "Video node is missing.");
const previewCanvas = requireNode(
  app.querySelector<HTMLCanvasElement>("[data-preview]"),
  "Preview canvas is missing."
);
const statusLine = requireNode(app.querySelector<HTMLParagraphElement>("[data-status]"), "Status node is missing.");
const bootCard = requireNode(app.querySelector<HTMLDivElement>("[data-boot-card]"), "Boot card is missing.");
const saveButton = requireNode(app.querySelector<HTMLButtonElement>("[data-save]"), "Save button is missing.");
const retryButton = requireNode(app.querySelector<HTMLButtonElement>("[data-retry]"), "Retry button is missing.");
const boothCountdown = requireNode(
  app.querySelector<HTMLDivElement>("[data-booth-countdown]"),
  "Booth countdown overlay is missing."
);
const boothCountdownValue = requireNode(
  app.querySelector<HTMLElement>("[data-booth-countdown-value]"),
  "Booth countdown value is missing."
);
const boothCountdownLabel = requireNode(
  app.querySelector<HTMLElement>("[data-booth-countdown-label]"),
  "Booth countdown label is missing."
);
const captureReview = requireNode(
  app.querySelector<HTMLElement>("[data-capture-panel]"),
  "Capture review is missing."
);
const captureImage = requireNode(
  app.querySelector<HTMLImageElement>("[data-capture-image]"),
  "Capture review image is missing."
);
const captureFile = requireNode(
  app.querySelector<HTMLSpanElement>("[data-capture-file]"),
  "Capture review filename is missing."
);
const shareAgainButton = requireNode(
  app.querySelector<HTMLButtonElement>("[data-share-again]"),
  "Share again button is missing."
);
const backCameraButton = requireNode(
  app.querySelector<HTMLButtonElement>("[data-back-camera]"),
  "Back to camera button is missing."
);
const boothPanel = requireNode(
  app.querySelector<HTMLElement>("[data-booth-panel]"),
  "Booth panel is missing."
);
const boothProgress = requireNode(
  app.querySelector<HTMLElement>("[data-booth-progress]"),
  "Booth progress is missing."
);
const boothHint = requireNode(
  app.querySelector<HTMLElement>("[data-booth-hint]"),
  "Booth hint is missing."
);
const boothResetButton = requireNode(
  app.querySelector<HTMLButtonElement>("[data-booth-reset]"),
  "Booth reset button is missing."
);
const copyDebugButton = requireNode(
  app.querySelector<HTMLButtonElement>("[data-copy-debug]"),
  "Copy debug button is missing."
);
const copyPhoneTestButton = requireNode(
  app.querySelector<HTMLButtonElement>("[data-copy-phone-test]"),
  "Copy phone test button is missing."
);
const manualFileOpenedInput = requireNode(
  app.querySelector<HTMLInputElement>("[data-manual-file-opened]"),
  "Manual file-opened checkbox is missing."
);
const manualEffectVisibleInput = requireNode(
  app.querySelector<HTMLInputElement>("[data-manual-effect-visible]"),
  "Manual effect-visible checkbox is missing."
);
const phoneDeviceInput = requireNode(
  app.querySelector<HTMLInputElement>("[data-phone-device-input]"),
  "Phone device input is missing."
);
const phoneBrowserInput = requireNode(
  app.querySelector<HTMLInputElement>("[data-phone-browser-input]"),
  "Phone browser input is missing."
);
const phoneNotesInput = requireNode(
  app.querySelector<HTMLTextAreaElement>("[data-phone-notes-input]"),
  "Phone notes input is missing."
);
const privacyOpenButton = requireNode(
  app.querySelector<HTMLButtonElement>("[data-privacy-open]"),
  "Privacy open button is missing."
);
const privacyDialog = requireNode(
  app.querySelector<HTMLDialogElement>("[data-privacy-dialog]"),
  "Privacy dialog is missing."
);
const privacyCloseButton = requireNode(
  app.querySelector<HTMLButtonElement>("[data-privacy-close]"),
  "Privacy close button is missing."
);
const modeButtons = Array.from(app.querySelectorAll<HTMLButtonElement>("[data-capture-mode]"));
const presetPackButtons = Array.from(app.querySelectorAll<HTMLButtonElement>("[data-preset-pack]"));
const presetButtons = Array.from(app.querySelectorAll<HTMLButtonElement>("[data-preset]"));
const boothFrameButtons = Array.from(app.querySelectorAll<HTMLButtonElement>("[data-booth-frame]"));
const boothThumbCanvases = Array.from(app.querySelectorAll<HTMLCanvasElement>("[data-booth-thumb]"));
const debugFields = new Map<string, HTMLOutputElement>();

app.querySelectorAll<HTMLOutputElement>("[data-debug-key]").forEach((field) => {
  const key = field.dataset.debugKey;

  if (key) {
    debugFields.set(key, field);
  }
});

const previewCtx = requireContext(previewCanvas.getContext("2d", { willReadFrequently: true }));
const lowCanvas = document.createElement("canvas");
const lowCtx = requireContext(lowCanvas.getContext("2d", { willReadFrequently: true }));
const captureSession = new CaptureSession(CANVAS_WIDTH, CANVAS_HEIGHT);
const photoStripComposer = new PhotoStripComposer();

let captureMode: CaptureMode = "single";
let boothState: BoothState = "idle";
let selectedBoothFrame: FrameTemplate = BOOTH_FRAME_TEMPLATES[0];
let boothRunId = 0;
let activePreset = DEFAULT_PRESET;
let activePresetCategory: PresetCategory = DEFAULT_PRESET.category;
let activeStream: MediaStream | null = null;
let activeDemoSource: DemoSource | null = null;
let animationFrame = 0;
let lastRenderedAt = 0;
let renderedFrames = 0;
let isRendering = false;
let isSaving = false;
let lastCaptureBlob: Blob | null = null;
let lastCaptureFilename = "";
let lastCapturePreset: Preset = DEFAULT_PRESET;
let lastCaptureText = DEFAULT_PRESET.caption;
let lastCaptureUrl: string | null = null;

setCanvasPlaceholder();
setAppState("sourceMode", "camera");
setAppState("cameraState", "booting");
setAppState("cameraError", "none");
setAppState("secureContext", String(window.isSecureContext));
setAppState("appVersion", APP_VERSION);
setAppState("presetCount", String(PRESETS.length));
setAppState("shareCapability", getSaveCapability());
setAppState("videoSize", "0x0");
setAppState("renderedFrames", "0");
setAppState("captureMode", captureMode);
setAppState("boothState", boothState);
setAppState("boothCuts", "0");
setAppState("boothFrame", selectedBoothFrame.id);
setAppState("activePreset", activePreset.id);
setAppState("presetCategory", activePreset.category);
setAppState("captureReview", "hidden");
resetManualEvidence();
syncPhoneReportMetaState();
syncCaptureModeUi();
syncBoothUi();
syncPresetButtons();

if (shouldSkipCameraForLocalCheck()) {
  setAppState("sourceMode", "off");
  setAppState("cameraState", "skipped");
  retryButton.hidden = false;
  saveButton.disabled = true;
  setStatus("카메라 검증 모드. Retry camera로 실제 권한 요청.");
} else if (shouldUseDemoSource()) {
  setAppState("sourceMode", "demo");
  void bootDemoSource();
} else {
  void bootCamera();
}

modeButtons.forEach((button) => {
  button.addEventListener("click", () => {
    selectCaptureMode(button.dataset.captureMode as CaptureMode);
  });
});

boothFrameButtons.forEach((button) => {
  button.addEventListener("click", () => {
    selectBoothFrame(button.dataset.boothFrame ?? selectedBoothFrame.id);
  });
});

boothResetButton.addEventListener("click", () => {
  resetBoothSession();
  setStatus("4-Cut Booth reset.");
});

presetButtons.forEach((button) => {
  button.addEventListener("click", () => {
    const presetId = button.dataset.preset as Preset["id"];
    selectPreset(getPresetById(presetId));
  });
});

presetPackButtons.forEach((button) => {
  button.addEventListener("click", () => {
    const category = button.dataset.presetPack as PresetCategory;
    const firstPresetInPack = PRESETS.find((preset) => preset.category === category) ?? DEFAULT_PRESET;
    selectPreset(firstPresetInPack);
  });
});

retryButton.addEventListener("click", () => {
  void bootCamera();
});

saveButton.addEventListener("click", () => {
  if (captureMode === "booth") {
    void handleBoothPrimaryAction();
    return;
  }

  void saveCurrentFrame();
});

shareAgainButton.addEventListener("click", () => {
  void shareLastCapture();
});

backCameraButton.addEventListener("click", () => {
  hideCaptureReview();
});

copyDebugButton.addEventListener("click", () => {
  void copyDebugState();
});

copyPhoneTestButton.addEventListener("click", () => {
  void copyPhoneTestState();
});

manualFileOpenedInput.addEventListener("change", syncManualEvidenceState);
manualEffectVisibleInput.addEventListener("change", syncManualEvidenceState);
phoneDeviceInput.addEventListener("input", syncPhoneReportMetaState);
phoneBrowserInput.addEventListener("input", syncPhoneReportMetaState);
phoneNotesInput.addEventListener("input", syncPhoneReportMetaState);

privacyOpenButton.addEventListener("click", () => {
  if (typeof privacyDialog.showModal === "function") {
    privacyDialog.showModal();
    return;
  }

  privacyDialog.setAttribute("open", "true");
});

privacyCloseButton.addEventListener("click", () => {
  if (typeof privacyDialog.close === "function") {
    privacyDialog.close();
    return;
  }

  privacyDialog.removeAttribute("open");
});

window.addEventListener("beforeunload", () => {
  stopRenderLoop();
  stopDemoSource();
  stopStream(activeStream);
  revokeCaptureUrl();
});

async function bootCamera(): Promise<void> {
  setAppState("sourceMode", "camera");
  setAppState("cameraState", "booting");
  setAppState("cameraError", "none");
  setAppState("renderedFrames", "0");
  renderedFrames = 0;
  setStatus("카메라 여는 중...");
  retryButton.hidden = true;
  syncPrimaryActionState();
  bootCard.hidden = false;
  hideCaptureReview();
  resetBoothSession();
  stopRenderLoop();
  stopDemoSource();
  stopStream(activeStream);
  activeStream = null;

  try {
    activeStream = await startCamera(video);
    setAppState("cameraState", "ready");
    setAppState("cameraError", "none");
    refreshVideoState();
    bootCard.hidden = true;
    setStatus(captureMode === "booth" ? "4-Cut Booth ready." : activePreset.caption);
    startRenderLoop();
    syncPrimaryActionState();
  } catch (error) {
    handleCameraFailure(error);
  }
}

async function bootDemoSource(): Promise<void> {
  setAppState("sourceMode", "demo");
  setAppState("cameraState", "booting");
  setAppState("cameraError", "none");
  setAppState("renderedFrames", "0");
  renderedFrames = 0;
  setStatus("synthetic camera 검증 중...");
  retryButton.hidden = false;
  syncPrimaryActionState();
  bootCard.hidden = false;
  hideCaptureReview();
  resetBoothSession();
  stopRenderLoop();
  stopDemoSource();
  stopStream(activeStream);
  activeStream = null;

  try {
    activeDemoSource = await startDemoSource(video);
    activeStream = activeDemoSource.stream;
    setAppState("cameraState", "ready");
    setAppState("cameraError", "none");
    refreshVideoState();
    bootCard.hidden = true;
    setStatus(captureMode === "booth" ? "Synthetic 4-Cut Booth ready." : "Synthetic source. 실제 카메라 검증은 아님.");
    startRenderLoop();
    syncPrimaryActionState();
  } catch {
    setAppState("cameraState", "failed");
    setAppState("cameraError", "demo-source");
    setStatus("Synthetic source를 못 열었다.");
    retryButton.hidden = false;
    bootCard.hidden = false;
    syncPrimaryActionState();
    setCanvasPlaceholder();
  }
}

async function saveCurrentFrame(): Promise<void> {
  if (isSaving) {
    return;
  }

  isSaving = true;
  saveButton.disabled = true;
  setCaptureActionsDisabled(true);
  setStatus("PNG 만드는 중...");

  try {
    const result = await saveCanvas(previewCanvas, activePreset, { prepareOnly: shouldPrepareSaveOnly() });
    storeSaveResult(result);
    showCaptureReview(result, activePreset);
    setStatus(result.message);
  } catch {
    setAppState("lastSaveKind", "failed");
    setStatus("저장 실패. 브라우저가 또 예민하게 군다.");
  } finally {
    isSaving = false;
    syncPrimaryActionState();
    setCaptureActionsDisabled(false);
  }
}

async function shareLastCapture(): Promise<void> {
  if (isSaving || !lastCaptureBlob) {
    return;
  }

  isSaving = true;
  saveButton.disabled = true;
  setCaptureActionsDisabled(true);
  setStatus("PNG 다시 보내는 중...");

  try {
    const result = await deliverBlob(
      lastCaptureBlob,
      lastCaptureFilename,
      lastCaptureText,
      { prepareOnly: shouldPrepareSaveOnly() }
    );
    storeSaveResult(result);
    showCaptureReview(result, lastCapturePreset);
    setStatus(result.message);
  } catch {
    setAppState("lastSaveKind", "failed");
    setStatus("재공유 실패. 그래도 카메라는 살아있다.");
  } finally {
    isSaving = false;
    syncPrimaryActionState();
    setCaptureActionsDisabled(false);
  }
}

async function handleBoothPrimaryAction(): Promise<void> {
  if (captureSession.complete) {
    await saveBoothStrip();
    return;
  }

  await runBoothCaptureSequence();
}

async function runBoothCaptureSequence(): Promise<void> {
  if (isSaving || boothState === "countdown" || boothState === "capturing" || activeStream === null) {
    return;
  }

  const runId = boothRunId + 1;
  boothRunId = runId;
  captureSession.reset();
  clearBoothThumbnails();
  hideCaptureReview();
  setBoothState("countdown");

  for (let cutIndex = 0; cutIndex < BOOTH_CUT_COUNT; cutIndex += 1) {
    const cutNumber = cutIndex + 1;
    const countdownSeconds = getBoothCountdownSeconds();

    for (let second = countdownSeconds; second >= 1; second -= 1) {
      if (runId !== boothRunId || captureMode !== "booth") {
        return;
      }

      showBoothCountdown(second, cutNumber);
      setStatus(`4-Cut Booth ${cutNumber}/${BOOTH_CUT_COUNT} - ${second}`);
      await delay(getBoothCountdownDelayMs());
    }

    if (runId !== boothRunId || captureMode !== "booth") {
      return;
    }

    setBoothState("capturing");
    const frame = captureSession.addFrame(previewCanvas);
    drawBoothThumbnail(frame, cutIndex);
    updateBoothProgress(`Captured ${cutNumber}/${BOOTH_CUT_COUNT}`);
    setAppState("boothCuts", String(captureSession.count));

    if (cutNumber < BOOTH_CUT_COUNT) {
      setBoothState("countdown");
      await delay(getBoothBetweenShotsDelayMs());
    }
  }

  hideBoothCountdown();
  setBoothState("ready");
  updateBoothProgress("Pick frame, save strip");
  setStatus("4-Cut Booth ready.");
}

async function saveBoothStrip(): Promise<void> {
  if (isSaving || !captureSession.complete) {
    return;
  }

  isSaving = true;
  setBoothState("saving");
  syncPrimaryActionState();
  setCaptureActionsDisabled(true);
  setStatus("Photo strip 만드는 중...");

  try {
    const stripCanvas = photoStripComposer.compose(captureSession.getFrames(), selectedBoothFrame);
    const filename = formatBoothFilename(selectedBoothFrame);
    const result = await saveNamedCanvas(
      stripCanvas,
      filename,
      "4-Cut Booth from TrashCam 2004.",
      { prepareOnly: shouldPrepareSaveOnly() }
    );

    storeSaveResult(result);
    showCaptureReview(result, activePreset, "4-Cut Booth saved TrashCam strip", "4-Cut Booth from TrashCam 2004.");
    setBoothState("ready");
    updateBoothProgress("Saved strip");
    setStatus(result.message);
  } catch {
    setAppState("lastSaveKind", "failed");
    setBoothState("ready");
    setStatus("스트립 저장 실패. 다시 Save Strip.");
  } finally {
    isSaving = false;
    syncPrimaryActionState();
    setCaptureActionsDisabled(false);
  }
}

function storeSaveResult(result: SaveResult): void {
  resetManualEvidence();
  setAppState("lastSaveKind", result.kind);
  setAppState("lastSaveBytes", String(result.bytes));
  setAppState("lastSaveName", result.filename);
}

function showCaptureReview(
  result: SaveResult,
  preset: Preset,
  altText = `${preset.shortName} saved TrashCam capture`,
  shareText = preset.caption
): void {
  lastCaptureBlob = result.blob;
  lastCaptureFilename = result.filename;
  lastCapturePreset = preset;
  lastCaptureText = shareText;
  revokeCaptureUrl();
  lastCaptureUrl = URL.createObjectURL(result.blob);

  captureImage.src = lastCaptureUrl;
  captureImage.alt = altText;
  captureFile.textContent = result.filename;
  captureReview.hidden = false;
  setAppState("captureReview", "visible");
  setCaptureActionsDisabled(false);
}

function hideCaptureReview(): void {
  captureReview.hidden = true;
  captureImage.removeAttribute("src");
  captureFile.textContent = "-";
  lastCaptureBlob = null;
  lastCaptureFilename = "";
  lastCapturePreset = DEFAULT_PRESET;
  lastCaptureText = DEFAULT_PRESET.caption;
  revokeCaptureUrl();
  setAppState("captureReview", "hidden");
  setCaptureActionsDisabled(false);
}

function revokeCaptureUrl(): void {
  if (lastCaptureUrl) {
    URL.revokeObjectURL(lastCaptureUrl);
    lastCaptureUrl = null;
  }
}

function setCaptureActionsDisabled(disabled: boolean): void {
  shareAgainButton.disabled = disabled || !lastCaptureBlob;
  backCameraButton.disabled = disabled;
}

function selectCaptureMode(mode: CaptureMode): void {
  if (mode === captureMode) {
    return;
  }

  captureMode = mode;
  setAppState("captureMode", captureMode);
  hideBoothCountdown();

  if (mode === "single") {
    resetBoothSession();
    setStatus(activePreset.caption);
  } else {
    hideCaptureReview();
    resetBoothSession();
    setStatus("4-Cut Booth ready.");
  }

  syncCaptureModeUi();
  syncPrimaryActionState();
}

function selectBoothFrame(frameId: string): void {
  selectedBoothFrame = getFrameTemplateById(frameId);
  setAppState("boothFrame", selectedBoothFrame.id);
  syncBoothFrameButtons();

  if (captureMode === "booth" && captureSession.complete) {
    setStatus(`${selectedBoothFrame.label} frame selected.`);
  }
}

function resetBoothSession(): void {
  boothRunId += 1;
  captureSession.reset();
  clearBoothThumbnails();
  hideBoothCountdown();
  setBoothState("idle");
  updateBoothProgress("Ready");
  setAppState("boothCuts", "0");
  syncPrimaryActionState();
}

function setBoothState(nextState: BoothState): void {
  boothState = nextState;
  setAppState("boothState", boothState);
  syncBoothUi();
  syncPrimaryActionState();
}

function syncCaptureModeUi(): void {
  modeButtons.forEach((button) => {
    button.setAttribute("aria-selected", String(button.dataset.captureMode === captureMode));
  });

  boothPanel.hidden = captureMode !== "booth";
  syncBoothUi();
}

function syncBoothUi(): void {
  boothPanel.hidden = captureMode !== "booth";
  boothResetButton.hidden = captureMode !== "booth" || (boothState === "idle" && captureSession.count === 0);
  syncBoothFrameButtons();
}

function syncBoothFrameButtons(): void {
  boothFrameButtons.forEach((button) => {
    button.setAttribute("aria-pressed", String(button.dataset.boothFrame === selectedBoothFrame.id));
  });
}

function syncPrimaryActionState(): void {
  const readyForAction = activeStream !== null && app.dataset.cameraState === "ready";
  const boothBusy = boothState === "countdown" || boothState === "capturing" || boothState === "saving";

  if (captureMode === "booth") {
    saveButton.textContent = captureSession.complete ? "Save Strip" : "Start 4-Cut";
    saveButton.disabled = isSaving || !readyForAction || boothBusy;
    return;
  }

  saveButton.textContent = "Save PNG";
  saveButton.disabled = isSaving || !readyForAction;
}

function showBoothCountdown(second: number, cutNumber: number): void {
  boothCountdown.hidden = false;
  boothCountdownValue.textContent = String(second);
  boothCountdownLabel.textContent = `Cut ${cutNumber}/${BOOTH_CUT_COUNT}`;
  setAppState("boothCuts", String(captureSession.count));
}

function hideBoothCountdown(): void {
  boothCountdown.hidden = true;
}

function updateBoothProgress(message: string): void {
  boothProgress.textContent = `${captureSession.count}/${BOOTH_CUT_COUNT}`;
  boothHint.textContent = message;
}

function clearBoothThumbnails(): void {
  boothThumbCanvases.forEach((canvas) => {
    const ctx = requireContext(canvas.getContext("2d"));

    canvas.dataset.filled = "no";
    ctx.fillStyle = "#050505";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = "#3e3a27";
    ctx.lineWidth = 2;
    ctx.strokeRect(1, 1, canvas.width - 2, canvas.height - 2);
  });
}

function drawBoothThumbnail(frame: HTMLCanvasElement, index: number): void {
  const canvas = boothThumbCanvases[index];

  if (!canvas) {
    return;
  }

  const ctx = requireContext(canvas.getContext("2d"));

  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(frame, 0, 0, canvas.width, canvas.height);
  canvas.dataset.filled = "yes";
}

function getBoothCountdownSeconds(): number {
  return rootParams.get("boothFast") === "1" ? 1 : 3;
}

function getBoothCountdownDelayMs(): number {
  return rootParams.get("boothFast") === "1" ? 80 : 1000;
}

function getBoothBetweenShotsDelayMs(): number {
  return rootParams.get("boothFast") === "1" ? 60 : 500;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function resetManualEvidence(): void {
  manualFileOpenedInput.checked = false;
  manualEffectVisibleInput.checked = false;
  syncManualEvidenceState();
}

function syncManualEvidenceState(): void {
  setAppState("manualSavedFileOpened", manualFileOpenedInput.checked ? "yes" : "no");
  setAppState("manualSavedEffectVisible", manualEffectVisibleInput.checked ? "yes" : "no");
}

function syncPhoneReportMetaState(): void {
  setAppState("phoneDevice", sanitizeReportValue(phoneDeviceInput.value));
  setAppState("phoneBrowser", sanitizeReportValue(phoneBrowserInput.value));
  setAppState("phoneNotes", sanitizeReportValue(phoneNotesInput.value));
}

async function copyDebugState(): Promise<void> {
  try {
    await copyText(buildDebugReport());
    setStatus("Debug state copied.");
  } catch {
    setStatus("Debug 복사 실패. 화면 값을 그대로 적어줘.");
  }
}

async function copyPhoneTestState(): Promise<void> {
  try {
    await copyText(buildPhoneTestReport());
    setStatus("Phone test report copied.");
  } catch {
    setStatus("Phone test 복사 실패. 화면 값을 그대로 적어줘.");
  }
}

function startRenderLoop(): void {
  if (isRendering) {
    return;
  }

  isRendering = true;
  lastRenderedAt = 0;
  animationFrame = requestAnimationFrame(render);
}

function stopRenderLoop(): void {
  isRendering = false;
  cancelAnimationFrame(animationFrame);
}

function stopDemoSource(): void {
  activeDemoSource?.stop();
  activeDemoSource = null;
}

function render(timestamp: number): void {
  if (!isRendering) {
    return;
  }

  const frameInterval = 1000 / activePreset.fps;

  if (timestamp - lastRenderedAt >= frameInterval && video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
    refreshVideoState();
    drawFrame();
    renderedFrames += 1;
    setAppState("renderedFrames", String(renderedFrames));
    lastRenderedAt = timestamp;
  }

  animationFrame = requestAnimationFrame(render);
}

function drawFrame(): void {
  const preset = activePreset;
  lowCanvas.width = preset.lowWidth;
  lowCanvas.height = preset.lowHeight;

  lowCtx.imageSmoothingEnabled = false;
  previewCtx.imageSmoothingEnabled = false;

  drawVideoCover(lowCtx, video, preset.lowWidth, preset.lowHeight);

  if (preset.pixelArt || preset.voxelBlock || preset.receiptPrinter) {
    const lowImageData = lowCtx.getImageData(0, 0, preset.lowWidth, preset.lowHeight);
    applyPresetImageDataEffects(lowImageData, preset);

    if (preset.pixelArt) {
      applyDither(lowImageData, preset.pixelArt.dither);
      applyPaletteLimit(lowImageData);
    }

    if (preset.voxelBlock) {
      applyBlockAverage(lowImageData, preset.voxelBlock.blockSize);
      applyPaletteLimit(lowImageData, VOXEL_BLOCK_PALETTE);
    }

    if (preset.receiptPrinter) {
      applyReceiptDither(lowImageData, preset.receiptPrinter.dither);
    }

    lowCtx.putImageData(lowImageData, 0, 0);
  }

  previewCtx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  previewCtx.fillStyle = "#050505";
  previewCtx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

  const jitterX = preset.jitter ? Math.round((Math.random() * 2 - 1) * preset.jitter) : 0;
  const jitterY = preset.jitter ? Math.round((Math.random() * 2 - 1) * preset.jitter) : 0;

  previewCtx.drawImage(
    lowCanvas,
    jitterX,
    jitterY,
    CANVAS_WIDTH + Math.abs(jitterX) * 2,
    CANVAS_HEIGHT + Math.abs(jitterY) * 2
  );

  if (preset.pixelArt) {
    drawPixelGrid(
      previewCtx,
      CANVAS_WIDTH,
      CANVAS_HEIGHT,
      CANVAS_WIDTH / preset.lowWidth,
      CANVAS_HEIGHT / preset.lowHeight,
      preset.pixelArt.gridOpacity
    );
    return;
  }

  if (preset.voxelBlock) {
    drawPixelGrid(
      previewCtx,
      CANVAS_WIDTH,
      CANVAS_HEIGHT,
      (CANVAS_WIDTH / preset.lowWidth) * preset.voxelBlock.blockSize,
      (CANVAS_HEIGHT / preset.lowHeight) * preset.voxelBlock.blockSize,
      preset.voxelBlock.gridOpacity
    );
    return;
  }

  if (preset.receiptPrinter) {
    drawReceiptPrinterOverlay(
      previewCtx,
      preset.receiptPrinter.footerLabel,
      CANVAS_WIDTH,
      CANVAS_HEIGHT,
      preset.receiptPrinter.bandOpacity
    );
    return;
  }

  const imageData = previewCtx.getImageData(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  applyPresetImageDataEffects(imageData, preset);

  if (preset.cyberpunk) {
    applyRgbSplit(imageData, preset.cyberpunk.rgbSplit);
  }

  if (preset.cctvEvidence) {
    applyGrayscaleTint(imageData, [164, 255, 128]);
  }

  if (preset.asciiTerminal) {
    applyAsciiPosterize(imageData);
  }

  if (preset.deepFried) {
    applyDeepFry(imageData, preset.deepFried.intensity);
  }

  previewCtx.putImageData(imageData, 0, 0);

  if (preset.cyberpunk) {
    drawGlitchBars(previewCtx, CANVAS_WIDTH, CANVAS_HEIGHT, preset.cyberpunk.glitchBars);
    drawScanlines(previewCtx, CANVAS_WIDTH, CANVAS_HEIGHT, preset.cyberpunk.scanlineOpacity);
    drawCyberpunkHud(previewCtx, preset.cyberpunk.hudLabel, CANVAS_WIDTH, CANVAS_HEIGHT);
    return;
  }

  if (preset.cctvEvidence) {
    drawScanlines(previewCtx, CANVAS_WIDTH, CANVAS_HEIGHT, preset.cctvEvidence.scanlineOpacity);
    drawCctvEvidenceHud(previewCtx, preset.cctvEvidence.label, CANVAS_WIDTH, CANVAS_HEIGHT);
    return;
  }

  if (preset.schoolId) {
    drawSchoolIdOverlay(
      previewCtx,
      preset.schoolId.label,
      preset.schoolId.idNumber,
      CANVAS_WIDTH,
      CANVAS_HEIGHT,
      preset.schoolId.flashOpacity
    );
    return;
  }

  if (preset.asciiTerminal) {
    drawAsciiTerminalOverlay(
      previewCtx,
      preset.asciiTerminal.label,
      CANVAS_WIDTH,
      CANVAS_HEIGHT,
      preset.asciiTerminal.cellSize
    );
    return;
  }

  if (preset.deepFried) {
    drawDeepFriedOverlay(previewCtx, preset.deepFried.label, CANVAS_WIDTH, CANVAS_HEIGHT);
    return;
  }

  if (preset.stickerBooth) {
    drawStickerBoothOverlay(
      previewCtx,
      preset.stickerBooth.label,
      CANVAS_WIDTH,
      CANVAS_HEIGHT,
      preset.stickerBooth.stickerOpacity
    );
    return;
  }

  if (preset.id === "cyworld") {
    drawCyworldWash(previewCtx);
  }

  if (preset.scanlines) {
    drawScanlines(previewCtx, CANVAS_WIDTH, CANVAS_HEIGHT, 0.22);
  }

  if (preset.timestamp) {
    drawTimestamp(previewCtx, preset.name, CANVAS_WIDTH, CANVAS_HEIGHT);
  }
}

function applyPresetImageDataEffects(imageData: ImageData, preset: Preset): void {
  applyContrast(imageData, preset.contrast);
  applyBrightness(imageData, preset.brightness);
  applyColorCast(imageData, preset.color);
  applyNoise(imageData, preset.noise);
}

function drawVideoCover(
  ctx: CanvasRenderingContext2D,
  source: HTMLVideoElement,
  targetWidth: number,
  targetHeight: number
): void {
  const sourceWidth = source.videoWidth || targetWidth;
  const sourceHeight = source.videoHeight || targetHeight;
  const sourceRatio = sourceWidth / sourceHeight;
  const targetRatio = targetWidth / targetHeight;
  let cropWidth = sourceWidth;
  let cropHeight = sourceHeight;

  if (sourceRatio > targetRatio) {
    cropWidth = sourceHeight * targetRatio;
  } else {
    cropHeight = sourceWidth / targetRatio;
  }

  const cropX = (sourceWidth - cropWidth) / 2;
  const cropY = (sourceHeight - cropHeight) / 2;

  ctx.save();
  ctx.translate(targetWidth, 0);
  ctx.scale(-1, 1);
  ctx.drawImage(source, cropX, cropY, cropWidth, cropHeight, 0, 0, targetWidth, targetHeight);
  ctx.restore();
}

function drawCyworldWash(ctx: CanvasRenderingContext2D): void {
  ctx.save();
  ctx.globalCompositeOperation = "screen";
  ctx.globalAlpha = 0.16;
  ctx.fillStyle = "#ffd0dc";
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  ctx.restore();
}

function syncPresetButtons(): void {
  presetPackButtons.forEach((button) => {
    button.setAttribute("aria-selected", String(button.dataset.presetPack === activePresetCategory));
  });

  presetButtons.forEach((button) => {
    button.hidden = button.dataset.category !== activePresetCategory;
    button.setAttribute("aria-pressed", String(button.dataset.preset === activePreset.id));
  });
}

function selectPreset(preset: Preset): void {
  activePreset = preset;
  activePresetCategory = preset.category;
  setAppState("activePreset", activePreset.id);
  setAppState("presetCategory", activePreset.category);
  syncPresetButtons();

  if (captureMode === "booth") {
    setStatus(`4-Cut Booth filter: ${activePreset.shortName}`);
    return;
  }

  setStatus(activePreset.caption);
}

function handleCameraFailure(error: unknown): void {
  setAppState("cameraState", "failed");
  setAppState("cameraError", error instanceof CameraError ? error.kind : "unknown");
  retryButton.hidden = false;
  bootCard.hidden = false;
  syncPrimaryActionState();
  setCanvasPlaceholder();

  if (error instanceof CameraError && error.kind === "permission-denied") {
    setStatus("카메라 권한이 막혔다. 브라우저 설정에서 다시 허용해야 한다.");
    return;
  }

  if (error instanceof CameraError && error.kind === "insecure-context") {
    setStatus("HTTP에서는 폰 카메라가 안 열린다. HTTPS 링크로 다시 열어줘.");
    return;
  }

  if (error instanceof CameraError && error.kind === "unsupported") {
    setStatus("이 브라우저는 카메라 API를 지원하지 않는다.");
    return;
  }

  if (error instanceof CameraError && error.kind === "playback-blocked") {
    setStatus("카메라 재생이 막혔다. Retry camera를 눌러 다시 시작해줘.");
    return;
  }

  setStatus("카메라를 못 열었다. 권한이나 HTTPS를 확인해줘.");
}

function setCanvasPlaceholder(): void {
  previewCtx.fillStyle = "#0d0d0b";
  previewCtx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  previewCtx.fillStyle = "#2bff7d";
  previewCtx.font = "26px 'Courier New', monospace";
  previewCtx.textAlign = "center";
  previewCtx.fillText("TRASHCAM 2004", CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 10);
  previewCtx.fillStyle = "#e9d56a";
  previewCtx.font = "16px 'Courier New', monospace";
  previewCtx.fillText("waiting for camera damage", CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 24);
  previewCtx.textAlign = "start";
}

function setStatus(message: string): void {
  statusLine.textContent = message;
  setDebugValue("statusMessage", message);
  refreshDebugReport();
}

function shouldSkipCameraForLocalCheck(): boolean {
  return rootParams.get("camera") === "off";
}

function shouldUseDemoSource(): boolean {
  return rootParams.get("demo") === "1";
}

function shouldPrepareSaveOnly(): boolean {
  return rootParams.get("save") === "prepare";
}

function shouldShowDebugPanel(): boolean {
  return rootParams.get("debug") === "1";
}

function setAppState(name: string, value: string): void {
  app.dataset[name] = value;
  setDebugValue(name, value);
  refreshDebugReport();
}

function refreshVideoState(): void {
  setAppState("videoSize", `${video.videoWidth || 0}x${video.videoHeight || 0}`);
}

function getScreenSize(): string {
  return `${screen.width}x${screen.height}`;
}

function getScreenOrientation(): string {
  return screen.orientation?.type ?? (window.innerWidth >= window.innerHeight ? "landscape-legacy" : "portrait-legacy");
}

function isLikelyMobileDevice(): boolean {
  return navigator.maxTouchPoints > 0 && Math.min(screen.width, screen.height) <= 1024;
}

function setDebugValue(name: string, value: string): void {
  const field = debugFields.get(name);

  if (field) {
    field.value = value;
    field.textContent = value;
  }
}

function refreshDebugReport(): void {
  const acceptanceGate = getAcceptanceGateStatus();
  app.dataset.acceptanceGate = acceptanceGate;
  setDebugValue("acceptanceGate", acceptanceGate);

  if (shouldShowDebugPanel()) {
    copyDebugButton.dataset.debugReport = buildDebugReport();
    copyPhoneTestButton.dataset.phoneTestReport = buildPhoneTestReport();
  }
}

function buildDebugReport(): string {
  const lines = [
    "TrashCam 2004 debug state",
    `time=${new Date().toISOString()}`,
    `url=${window.location.href}`,
    `userAgent=${navigator.userAgent}`,
    `platform=${navigator.platform || "-"}`,
    `maxTouchPoints=${navigator.maxTouchPoints}`,
    `screen=${getScreenSize()}`,
    `orientation=${getScreenOrientation()}`,
    `language=${navigator.language || "-"}`,
    `mobileCandidate=${isLikelyMobileDevice() ? "yes" : "no"}`,
    `source=${app.dataset.sourceMode ?? "-"}`,
    `camera=${app.dataset.cameraState ?? "-"}`,
    `cameraError=${app.dataset.cameraError ?? "-"}`,
    `secure=${app.dataset.secureContext ?? "-"}`,
    `version=${app.dataset.appVersion ?? "-"}`,
    `presets=${app.dataset.presetCount ?? "-"}`,
    `mode=${app.dataset.captureMode ?? "-"}`,
    `booth=${app.dataset.boothState ?? "-"}`,
    `boothCuts=${app.dataset.boothCuts ?? "-"}`,
    `boothFrame=${app.dataset.boothFrame ?? "-"}`,
    `viewport=${window.innerWidth}x${window.innerHeight}`,
    `devicePixelRatio=${window.devicePixelRatio}`,
    `video=${app.dataset.videoSize ?? "-"}`,
    `frames=${app.dataset.renderedFrames ?? "-"}`,
    `preset=${app.dataset.activePreset ?? "-"}`,
    `category=${app.dataset.presetCategory ?? "-"}`,
    `shareCapability=${app.dataset.shareCapability ?? "-"}`,
    `acceptanceGate=${app.dataset.acceptanceGate ?? "-"}`,
    `save=${app.dataset.lastSaveKind ?? "-"}`,
    `captureReview=${app.dataset.captureReview ?? "-"}`,
    `bytes=${app.dataset.lastSaveBytes ?? "-"}`,
    `file=${app.dataset.lastSaveName ?? "-"}`,
    `manualSavedFileOpened=${app.dataset.manualSavedFileOpened ?? "no"}`,
    `manualSavedEffectVisible=${app.dataset.manualSavedEffectVisible ?? "no"}`,
    `status=${statusLine.textContent ?? "-"}`
  ];

  return lines.join("\n");
}

function buildPhoneTestReport(): string {
  const lines = [
    "TrashCam 2004 phone test report",
    `time=${new Date().toISOString()}`,
    `url=${window.location.href}`,
    `device=${app.dataset.phoneDevice ?? ""}`,
    `browser=${app.dataset.phoneBrowser ?? ""}`,
    `userAgent=${navigator.userAgent}`,
    `platform=${navigator.platform || "-"}`,
    `maxTouchPoints=${navigator.maxTouchPoints}`,
    `screen=${getScreenSize()}`,
    `orientation=${getScreenOrientation()}`,
    `language=${navigator.language || "-"}`,
    `mobileCandidate=${isLikelyMobileDevice() ? "yes" : "no"}`,
    `acceptanceGate=${getAcceptanceGateStatus()}`,
    `source=${app.dataset.sourceMode ?? "-"}`,
    `camera=${app.dataset.cameraState ?? "-"}`,
    `cameraError=${app.dataset.cameraError ?? "-"}`,
    `secure=${app.dataset.secureContext ?? "-"}`,
    `version=${app.dataset.appVersion ?? "-"}`,
    `presets=${app.dataset.presetCount ?? "-"}`,
    `mode=${app.dataset.captureMode ?? "-"}`,
    `booth=${app.dataset.boothState ?? "-"}`,
    `boothCuts=${app.dataset.boothCuts ?? "-"}`,
    `boothFrame=${app.dataset.boothFrame ?? "-"}`,
    `viewport=${window.innerWidth}x${window.innerHeight}`,
    `devicePixelRatio=${window.devicePixelRatio}`,
    `video=${app.dataset.videoSize ?? "-"}`,
    `frames=${app.dataset.renderedFrames ?? "-"}`,
    `preset=${app.dataset.activePreset ?? "-"}`,
    `category=${app.dataset.presetCategory ?? "-"}`,
    `shareCapability=${app.dataset.shareCapability ?? "-"}`,
    `save=${app.dataset.lastSaveKind ?? "-"}`,
    `captureReview=${app.dataset.captureReview ?? "-"}`,
    `bytes=${app.dataset.lastSaveBytes ?? "-"}`,
    `file=${app.dataset.lastSaveName ?? "-"}`,
    `status=${statusLine.textContent ?? "-"}`,
    `manualCameraPermission=${app.dataset.sourceMode === "camera" && app.dataset.cameraState === "ready" ? "yes" : "no"}`,
    `manualPreviewMoving=${Number(app.dataset.renderedFrames ?? 0) > 0 ? "yes" : "no"}`,
    `manualShareSheetOrDownload=${getSaveDeliveryEvidence()}`,
    `manualSavedFileOpened=${app.dataset.manualSavedFileOpened ?? "no"}`,
    `manualSavedEffectVisible=${app.dataset.manualSavedEffectVisible ?? "no"}`,
    `acceptanceCandidate=${getAcceptanceGateStatus() === "phone-pass-candidate" ? "yes" : "no"}`,
    `notes=${app.dataset.phoneNotes ?? ""}`
  ];

  return lines.join("\n");
}

function sanitizeReportValue(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function getAcceptanceGateStatus(): string {
  if (app.dataset.secureContext !== "true") {
    return "blocked-insecure";
  }

  if (app.dataset.sourceMode !== "camera") {
    return "synthetic-or-local-check";
  }

  if (app.dataset.cameraState !== "ready") {
    return `camera-${app.dataset.cameraState ?? "unknown"}`;
  }

  if (Number(app.dataset.renderedFrames ?? 0) <= 0) {
    return "waiting-render";
  }

  const saveKind = app.dataset.lastSaveKind;

  if (!saveKind) {
    return "camera-ready-save-needed";
  }

  if (saveKind === "prepared") {
    return "png-prepared-only";
  }

  if (saveKind === "shared" || saveKind === "downloaded") {
    if (app.dataset.manualSavedFileOpened !== "yes") {
      return "manual-file-open-needed";
    }

    if (app.dataset.manualSavedEffectVisible !== "yes") {
      return "manual-effect-check-needed";
    }

    return "phone-pass-candidate";
  }

  if (saveKind === "cancelled") {
    return "share-cancelled";
  }

  if (saveKind === "failed") {
    return "save-failed";
  }

  return "unknown";
}

function getSaveDeliveryEvidence(): string {
  const saveKind = app.dataset.lastSaveKind;

  if (saveKind === "shared" || saveKind === "downloaded") {
    return "yes";
  }

  if (saveKind === "prepared") {
    return "prepare-only";
  }

  if (saveKind === "cancelled" || saveKind === "failed") {
    return saveKind;
  }

  return "no";
}

async function copyText(text: string): Promise<void> {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }

  const textArea = document.createElement("textarea");
  textArea.value = text;
  textArea.setAttribute("readonly", "true");
  textArea.style.position = "fixed";
  textArea.style.top = "0";
  textArea.style.left = "0";
  textArea.style.opacity = "0";
  document.body.append(textArea);
  textArea.focus();
  textArea.select();

  const copied = document.execCommand("copy");
  textArea.remove();

  if (!copied) {
    throw new Error("Debug state copy failed.");
  }
}

function requireNode<T extends Element>(node: T | null, message: string): T {
  if (!node) {
    throw new Error(message);
  }

  return node;
}

function requireContext(context: CanvasRenderingContext2D | null): CanvasRenderingContext2D {
  if (!context) {
    throw new Error("Canvas 2D context is not available.");
  }

  return context;
}
