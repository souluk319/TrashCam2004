import type { Preset } from "./presets";

export type SaveResult =
  | { kind: "shared"; message: string; filename: string; bytes: number; blob: Blob }
  | { kind: "downloaded"; message: string; filename: string; bytes: number; blob: Blob }
  | { kind: "prepared"; message: string; filename: string; bytes: number; blob: Blob }
  | { kind: "cancelled"; message: string; filename: string; bytes: number; blob: Blob };

export type SaveOptions = {
  prepareOnly?: boolean;
};

type FileShareData = ShareData & {
  files: File[];
};

export function getSaveCapability(): string {
  if (typeof navigator.share !== "function") {
    return "download-fallback";
  }

  if (typeof File !== "function") {
    return "share-no-file-fallback";
  }

  if (typeof navigator.canShare !== "function") {
    return "share-no-can-share-fallback";
  }

  try {
    const probeFile = new File([new Blob([""], { type: "image/png" })], "trashcam-probe.png", {
      type: "image/png"
    });

    return navigator.canShare({ files: [probeFile] }) ? "file-share" : "download-fallback";
  } catch {
    return "download-fallback";
  }
}

export async function saveCanvas(canvas: HTMLCanvasElement, preset: Preset, options: SaveOptions = {}): Promise<SaveResult> {
  const blob = await canvasToBlob(canvas);
  const filename = `trashcam-2004-${preset.slug}-${formatTimestamp(new Date())}.png`;

  return deliverBlob(blob, filename, preset.caption, options);
}

export async function deliverBlob(
  blob: Blob,
  filename: string,
  text: string,
  options: SaveOptions = {}
): Promise<SaveResult> {
  if (options.prepareOnly) {
    return {
      kind: "prepared",
      message: "PNG prepared. Delivery skipped for local verification.",
      filename,
      bytes: blob.size,
      blob
    };
  }

  const shareData = tryCreateShareData(blob, filename, text);

  if (canShareFiles(shareData)) {
    try {
      await navigator.share(shareData);
      return { kind: "shared", message: "공유 메뉴에서 이미지 저장을 선택해줘.", filename, bytes: blob.size, blob };
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        return { kind: "cancelled", message: "공유가 취소됐다.", filename, bytes: blob.size, blob };
      }
    }
  }

  downloadBlob(blob, filename);
  return { kind: "downloaded", message: "Saved. Unfortunately.", filename, bytes: blob.size, blob };
}

function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) {
        resolve(blob);
        return;
      }

      reject(new Error("Canvas could not be converted to PNG."));
    }, "image/png");
  });
}

function tryCreateShareData(blob: Blob, filename: string, text: string): FileShareData | null {
  if (typeof File !== "function") {
    return null;
  }

  try {
    return {
      files: [new File([blob], filename, { type: "image/png" })],
      title: "TrashCam 2004",
      text
    };
  } catch {
    return null;
  }
}

function canShareFiles(shareData: FileShareData | null): shareData is FileShareData {
  if (
    !shareData
    || typeof navigator.share !== "function"
    || typeof navigator.canShare !== "function"
  ) {
    return false;
  }

  try {
    return navigator.canShare(shareData);
  } catch {
    return false;
  }
}

function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = filename;
  link.rel = "noopener";
  document.body.append(link);
  link.click();
  link.remove();

  window.setTimeout(() => {
    URL.revokeObjectURL(url);
  }, 1000);
}

function formatTimestamp(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  const seconds = String(date.getSeconds()).padStart(2, "0");

  return `${year}${month}${day}-${hours}${minutes}${seconds}`;
}
