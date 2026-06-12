import { CameraError, startCamera, stopStream } from "./camera";
import {
  VOXEL_BLOCK_PALETTE,
  applyBlockAverage,
  applyBrightness,
  applyColorCast,
  applyContrast,
  applyDither,
  applyNoise,
  applyPaletteLimit,
  applyRgbSplit,
  drawCyberpunkHud,
  drawGlitchBars,
  drawPixelGrid,
  drawScanlines,
  drawTimestamp
} from "./effects";
import { startDemoSource, type DemoSource } from "./demo-source";
import { DEFAULT_PRESET, PRESETS, getPresetById, type Preset } from "./presets";
import { getSaveCapability, saveCanvas } from "./save";
import "./styles.css";

const CANVAS_WIDTH = 640;
const CANVAS_HEIGHT = 480;

const app = requireNode(document.querySelector<HTMLDivElement>("#app"), "App root not found.");
const rootParams = new URLSearchParams(window.location.search);

app.innerHTML = `
  <main class="app-shell">
    <header class="top-bar">
      <h1>TrashCam 2004</h1>
      <p class="status" data-status>카메라 여는 중...</p>
    </header>

    <section class="preview-wrap" aria-label="TrashCam preview">
      <canvas class="preview" data-preview width="${CANVAS_WIDTH}" height="${CANVAS_HEIGHT}"></canvas>
      <video class="camera-source" data-video muted autoplay playsinline></video>
      <div class="boot-card" data-boot-card>
        <span>NO SIGNAL</span>
      </div>
    </section>

    <footer class="control-bar">
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
      <div><span>frames</span><output data-debug-key="renderedFrames">0</output></div>
      <div><span>preset</span><output data-debug-key="activePreset">-</output></div>
      <div><span>category</span><output data-debug-key="presetCategory">-</output></div>
      <div><span>save</span><output data-debug-key="lastSaveKind">-</output></div>
      <div><span>share</span><output data-debug-key="shareCapability">-</output></div>
      <div><span>bytes</span><output data-debug-key="lastSaveBytes">-</output></div>
      <div><span>video</span><output data-debug-key="videoSize">-</output></div>
      <div class="debug-wide"><span>file</span><output data-debug-key="lastSaveName">-</output></div>
      <div class="debug-wide"><span>status</span><output data-debug-key="statusMessage">-</output></div>
      <button class="debug-copy-button" type="button" data-copy-debug data-debug-report="">Copy state</button>
    </aside>
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
const copyDebugButton = requireNode(
  app.querySelector<HTMLButtonElement>("[data-copy-debug]"),
  "Copy debug button is missing."
);
const presetButtons = Array.from(app.querySelectorAll<HTMLButtonElement>("[data-preset]"));
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

let activePreset = DEFAULT_PRESET;
let activeStream: MediaStream | null = null;
let activeDemoSource: DemoSource | null = null;
let animationFrame = 0;
let lastRenderedAt = 0;
let renderedFrames = 0;
let isRendering = false;
let isSaving = false;

setCanvasPlaceholder();
setAppState("sourceMode", "camera");
setAppState("cameraState", "booting");
setAppState("cameraError", "none");
setAppState("secureContext", String(window.isSecureContext));
setAppState("shareCapability", getSaveCapability());
setAppState("videoSize", "0x0");
setAppState("renderedFrames", "0");
setAppState("activePreset", activePreset.id);
setAppState("presetCategory", activePreset.category);

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

presetButtons.forEach((button) => {
  button.addEventListener("click", () => {
    const presetId = button.dataset.preset as Preset["id"];
    activePreset = getPresetById(presetId);
    setAppState("activePreset", activePreset.id);
    setAppState("presetCategory", activePreset.category);
    syncPresetButtons();
    setStatus(activePreset.caption);
  });
});

retryButton.addEventListener("click", () => {
  void bootCamera();
});

saveButton.addEventListener("click", () => {
  void saveCurrentFrame();
});

copyDebugButton.addEventListener("click", () => {
  void copyDebugState();
});

window.addEventListener("beforeunload", () => {
  stopRenderLoop();
  stopDemoSource();
  stopStream(activeStream);
});

async function bootCamera(): Promise<void> {
  setAppState("sourceMode", "camera");
  setAppState("cameraState", "booting");
  setAppState("cameraError", "none");
  setAppState("renderedFrames", "0");
  renderedFrames = 0;
  setStatus("카메라 여는 중...");
  retryButton.hidden = true;
  saveButton.disabled = true;
  bootCard.hidden = false;
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
    saveButton.disabled = false;
    setStatus(activePreset.caption);
    startRenderLoop();
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
  saveButton.disabled = true;
  bootCard.hidden = false;
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
    saveButton.disabled = false;
    setStatus("Synthetic source. 실제 카메라 검증은 아님.");
    startRenderLoop();
  } catch {
    setAppState("cameraState", "failed");
    setAppState("cameraError", "demo-source");
    setStatus("Synthetic source를 못 열었다.");
    retryButton.hidden = false;
    bootCard.hidden = false;
    setCanvasPlaceholder();
  }
}

async function saveCurrentFrame(): Promise<void> {
  if (isSaving) {
    return;
  }

  isSaving = true;
  saveButton.disabled = true;
  setStatus("PNG 만드는 중...");

  try {
    const result = await saveCanvas(previewCanvas, activePreset, { prepareOnly: shouldPrepareSaveOnly() });
    setAppState("lastSaveKind", result.kind);
    setAppState("lastSaveBytes", String(result.bytes));
    setAppState("lastSaveName", result.filename);
    setStatus(result.message);
  } catch {
    setAppState("lastSaveKind", "failed");
    setStatus("저장 실패. 브라우저가 또 예민하게 군다.");
  } finally {
    isSaving = false;
    saveButton.disabled = activeStream === null;
  }
}

async function copyDebugState(): Promise<void> {
  try {
    await copyText(buildDebugReport());
    setStatus("Debug state copied.");
  } catch {
    setStatus("Debug 복사 실패. 화면 값을 그대로 적어줘.");
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

  if (preset.pixelArt || preset.voxelBlock) {
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

  const imageData = previewCtx.getImageData(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  applyPresetImageDataEffects(imageData, preset);

  if (preset.cyberpunk) {
    applyRgbSplit(imageData, preset.cyberpunk.rgbSplit);
  }

  previewCtx.putImageData(imageData, 0, 0);

  if (preset.cyberpunk) {
    drawGlitchBars(previewCtx, CANVAS_WIDTH, CANVAS_HEIGHT, preset.cyberpunk.glitchBars);
    drawScanlines(previewCtx, CANVAS_WIDTH, CANVAS_HEIGHT, preset.cyberpunk.scanlineOpacity);
    drawCyberpunkHud(previewCtx, preset.cyberpunk.hudLabel, CANVAS_WIDTH, CANVAS_HEIGHT);
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
  presetButtons.forEach((button) => {
    button.setAttribute("aria-pressed", String(button.dataset.preset === activePreset.id));
  });
}

function handleCameraFailure(error: unknown): void {
  setAppState("cameraState", "failed");
  setAppState("cameraError", error instanceof CameraError ? error.kind : "unknown");
  saveButton.disabled = true;
  retryButton.hidden = false;
  bootCard.hidden = false;
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

function setDebugValue(name: string, value: string): void {
  const field = debugFields.get(name);

  if (field) {
    field.value = value;
    field.textContent = value;
  }
}

function refreshDebugReport(): void {
  if (shouldShowDebugPanel()) {
    copyDebugButton.dataset.debugReport = buildDebugReport();
  }
}

function buildDebugReport(): string {
  const lines = [
    "TrashCam 2004 debug state",
    `time=${new Date().toISOString()}`,
    `url=${window.location.href}`,
    `userAgent=${navigator.userAgent}`,
    `source=${app.dataset.sourceMode ?? "-"}`,
    `camera=${app.dataset.cameraState ?? "-"}`,
    `cameraError=${app.dataset.cameraError ?? "-"}`,
    `secure=${app.dataset.secureContext ?? "-"}`,
    `viewport=${window.innerWidth}x${window.innerHeight}`,
    `devicePixelRatio=${window.devicePixelRatio}`,
    `video=${app.dataset.videoSize ?? "-"}`,
    `frames=${app.dataset.renderedFrames ?? "-"}`,
    `preset=${app.dataset.activePreset ?? "-"}`,
    `category=${app.dataset.presetCategory ?? "-"}`,
    `shareCapability=${app.dataset.shareCapability ?? "-"}`,
    `save=${app.dataset.lastSaveKind ?? "-"}`,
    `bytes=${app.dataset.lastSaveBytes ?? "-"}`,
    `file=${app.dataset.lastSaveName ?? "-"}`,
    `status=${statusLine.textContent ?? "-"}`
  ];

  return lines.join("\n");
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
