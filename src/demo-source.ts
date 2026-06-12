export type DemoSource = {
  stream: MediaStream;
  stop: () => void;
};

const DEMO_WIDTH = 640;
const DEMO_HEIGHT = 480;
const DEMO_FPS = 15;

export async function startDemoSource(video: HTMLVideoElement): Promise<DemoSource> {
  const sourceCanvas = document.createElement("canvas");
  sourceCanvas.width = DEMO_WIDTH;
  sourceCanvas.height = DEMO_HEIGHT;

  const sourceCtx = sourceCanvas.getContext("2d");

  if (!sourceCtx || typeof sourceCanvas.captureStream !== "function") {
    throw new Error("Synthetic camera source is not available in this browser.");
  }

  let frameId = 0;
  let running = true;

  const draw = (timestamp: number) => {
    if (!running) {
      return;
    }

    drawDemoFrame(sourceCtx, timestamp);
    frameId = window.requestAnimationFrame(draw);
  };

  frameId = window.requestAnimationFrame(draw);

  const stream = sourceCanvas.captureStream(DEMO_FPS);
  video.srcObject = stream;
  video.muted = true;
  video.autoplay = true;
  video.playsInline = true;
  video.setAttribute("playsinline", "true");

  await waitForDemoMetadata(video);
  await video.play();

  return {
    stream,
    stop: () => {
      running = false;
      window.cancelAnimationFrame(frameId);
      stream.getTracks().forEach((track) => track.stop());
    }
  };
}

function drawDemoFrame(ctx: CanvasRenderingContext2D, timestamp: number): void {
  const pulse = Math.sin(timestamp / 180);
  const drift = Math.sin(timestamp / 700) * 16;

  ctx.fillStyle = "#d7c792";
  ctx.fillRect(0, 0, DEMO_WIDTH, DEMO_HEIGHT);

  ctx.fillStyle = "#735b3b";
  ctx.fillRect(0, 0, DEMO_WIDTH, 72);

  ctx.fillStyle = "#27211a";
  ctx.fillRect(0, 380, DEMO_WIDTH, 100);

  ctx.fillStyle = "#c98f72";
  ctx.beginPath();
  ctx.ellipse(DEMO_WIDTH / 2 + drift, 245, 118, 145, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#3a211e";
  ctx.beginPath();
  ctx.ellipse(DEMO_WIDTH / 2 + drift - 42, 226, 18, 12 + pulse * 2, 0, 0, Math.PI * 2);
  ctx.ellipse(DEMO_WIDTH / 2 + drift + 42, 226, 18, 12 - pulse * 2, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = "#64362e";
  ctx.lineWidth = 8;
  ctx.beginPath();
  ctx.arc(DEMO_WIDTH / 2 + drift, 288, 46, 0.12 * Math.PI, 0.88 * Math.PI);
  ctx.stroke();

  ctx.fillStyle = "rgba(255, 255, 255, 0.34)";
  ctx.fillRect(56, 104, 112, 34);
  ctx.fillRect(472, 322, 92, 40);

  ctx.fillStyle = "#14140f";
  ctx.font = "22px 'Courier New', monospace";
  ctx.fillText("SYNTHETIC CAMERA", 32, 46);
}

function waitForDemoMetadata(video: HTMLVideoElement): Promise<void> {
  if (video.readyState >= HTMLMediaElement.HAVE_METADATA && video.videoWidth > 0) {
    return Promise.resolve();
  }

  return new Promise((resolve, reject) => {
    const cleanup = () => {
      video.removeEventListener("loadedmetadata", handleLoaded);
      video.removeEventListener("error", handleError);
    };
    const handleLoaded = () => {
      cleanup();
      resolve();
    };
    const handleError = () => {
      cleanup();
      reject(new Error("Synthetic video metadata could not be loaded."));
    };

    video.addEventListener("loadedmetadata", handleLoaded, { once: true });
    video.addEventListener("error", handleError, { once: true });
  });
}
