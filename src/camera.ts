export type CameraErrorKind =
  | "insecure-context"
  | "unsupported"
  | "permission-denied"
  | "playback-blocked"
  | "unavailable";

export class CameraError extends Error {
  readonly kind: CameraErrorKind;

  constructor(kind: CameraErrorKind, message: string) {
    super(message);
    this.name = "CameraError";
    this.kind = kind;
  }
}

export type CameraFacing = "user" | "environment";

function getCameraConstraints(facing: CameraFacing): MediaStreamConstraints {
  return {
    video: {
      facingMode: { ideal: facing },
      width: { ideal: 640 },
      height: { ideal: 480 }
    },
    audio: false
  };
}

const GENERIC_CAMERA_CONSTRAINTS: MediaStreamConstraints = {
  video: {
    width: { ideal: 640 },
    height: { ideal: 480 }
  },
  audio: false
};

const CAMERA_START_TIMEOUT_MS = 8000;

export async function startCamera(video: HTMLVideoElement, facing: CameraFacing = "user"): Promise<MediaStream> {
  if (!window.isSecureContext) {
    throw new CameraError("insecure-context", "Camera access requires HTTPS or localhost.");
  }

  if (!navigator.mediaDevices?.getUserMedia) {
    throw new CameraError("unsupported", "Camera API is not available.");
  }

  const stream = await requestStream(facing);

  try {
    prepareVideoElement(video);
    video.srcObject = stream;
    await waitForMetadata(video, CAMERA_START_TIMEOUT_MS);
    await playVideo(video);
  } catch (error) {
    stopStream(stream);
    video.pause();
    video.srcObject = null;

    if (error instanceof CameraError) {
      throw error;
    }

    throw new CameraError("unavailable", "Camera stream could not start.");
  }

  return stream;
}

export function stopStream(stream: MediaStream | null): void {
  stream?.getTracks().forEach((track) => track.stop());
}

async function requestStream(facing: CameraFacing): Promise<MediaStream> {
  try {
    return await navigator.mediaDevices.getUserMedia(getCameraConstraints(facing));
  } catch (error) {
    if (isPermissionDenied(error)) {
      throw new CameraError("permission-denied", "Camera permission was denied.");
    }
  }

  try {
    return await navigator.mediaDevices.getUserMedia(GENERIC_CAMERA_CONSTRAINTS);
  } catch (error) {
    if (isPermissionDenied(error)) {
      throw new CameraError("permission-denied", "Camera permission was denied.");
    }

    throw new CameraError("unavailable", "Camera could not be opened.");
  }
}

function prepareVideoElement(video: HTMLVideoElement): void {
  video.muted = true;
  video.autoplay = true;
  video.playsInline = true;
  video.setAttribute("muted", "true");
  video.setAttribute("autoplay", "true");
  video.setAttribute("playsinline", "true");
}

async function playVideo(video: HTMLVideoElement): Promise<void> {
  try {
    await video.play();
  } catch (error) {
    if (error instanceof DOMException && error.name === "NotAllowedError") {
      throw new CameraError("playback-blocked", "Camera playback was blocked until user interaction.");
    }

    throw new CameraError("unavailable", "Camera video could not start playing.");
  }
}

function waitForMetadata(video: HTMLVideoElement, timeoutMs: number): Promise<void> {
  if (video.readyState >= HTMLMediaElement.HAVE_METADATA && video.videoWidth > 0) {
    return Promise.resolve();
  }

  return new Promise((resolve, reject) => {
    const timeoutId = window.setTimeout(() => {
      cleanup();
      reject(new CameraError("unavailable", "Video metadata timed out."));
    }, timeoutMs);

    const cleanup = () => {
      window.clearTimeout(timeoutId);
      video.removeEventListener("loadedmetadata", handleLoaded);
      video.removeEventListener("error", handleError);
    };
    const handleLoaded = () => {
      cleanup();
      resolve();
    };
    const handleError = () => {
      cleanup();
      reject(new CameraError("unavailable", "Video metadata could not be loaded."));
    };

    video.addEventListener("loadedmetadata", handleLoaded, { once: true });
    video.addEventListener("error", handleError, { once: true });
  });
}

function isPermissionDenied(error: unknown): boolean {
  return error instanceof DOMException && (error.name === "NotAllowedError" || error.name === "SecurityError");
}
