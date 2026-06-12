export const BOOTH_CUT_COUNT = 4;

export type FrameTemplateId = "classic-white" | "classic-black" | "instant-film";

export type FrameTemplate = {
  id: FrameTemplateId;
  label: string;
  slug: string;
  background: string;
  paper: string;
  slot: string;
  slotBorder: string;
  ink: string;
  muted: string;
  shadow: string;
};

export const BOOTH_FRAME_TEMPLATES: FrameTemplate[] = [
  {
    id: "classic-white",
    label: "White",
    slug: "classic-white",
    background: "#d8d0bc",
    paper: "#fffbed",
    slot: "#050505",
    slotBorder: "#1a1810",
    ink: "#11100c",
    muted: "#6a6440",
    shadow: "rgba(0, 0, 0, 0.28)"
  },
  {
    id: "classic-black",
    label: "Black",
    slug: "classic-black",
    background: "#050505",
    paper: "#11100c",
    slot: "#050505",
    slotBorder: "#f5efcf",
    ink: "#f5efcf",
    muted: "#a7a07c",
    shadow: "rgba(0, 0, 0, 0.55)"
  },
  {
    id: "instant-film",
    label: "Instant Film",
    slug: "instant-film",
    background: "#cbbf9b",
    paper: "#fff6dc",
    slot: "#11100c",
    slotBorder: "#eadbb2",
    ink: "#2a2215",
    muted: "#8d7b50",
    shadow: "rgba(50, 35, 18, 0.34)"
  }
];

export class CaptureSession {
  private readonly frames: HTMLCanvasElement[] = [];

  constructor(
    private readonly frameWidth: number,
    private readonly frameHeight: number
  ) {}

  get count(): number {
    return this.frames.length;
  }

  get complete(): boolean {
    return this.frames.length === BOOTH_CUT_COUNT;
  }

  reset(): void {
    this.frames.length = 0;
  }

  addFrame(source: HTMLCanvasElement): HTMLCanvasElement {
    if (this.complete) {
      throw new Error("4-Cut Booth session is already complete.");
    }

    const frame = this.cloneFrame(source);
    this.frames.push(frame);

    return frame;
  }

  replaceFrame(index: number, source: HTMLCanvasElement): HTMLCanvasElement {
    if (index < 0 || index >= this.frames.length) {
      throw new Error(`4-Cut Booth cut ${index + 1} is not ready.`);
    }

    const frame = this.cloneFrame(source);
    this.frames[index] = frame;

    return frame;
  }

  private cloneFrame(source: HTMLCanvasElement): HTMLCanvasElement {
    const frame = document.createElement("canvas");
    const frameContext = requireContext(frame.getContext("2d"));

    frame.width = this.frameWidth;
    frame.height = this.frameHeight;
    frameContext.imageSmoothingEnabled = false;
    frameContext.drawImage(source, 0, 0, this.frameWidth, this.frameHeight);

    return frame;
  }

  getFrames(): readonly HTMLCanvasElement[] {
    return this.frames;
  }
}

export class PhotoStripComposer {
  compose(frames: readonly HTMLCanvasElement[], template: FrameTemplate): HTMLCanvasElement {
    if (frames.length !== BOOTH_CUT_COUNT) {
      throw new Error(`4-Cut Booth needs ${BOOTH_CUT_COUNT} frames, got ${frames.length}.`);
    }

    const stripWidth = 720;
    const slotWidth = 600;
    const slotHeight = 450;
    const marginX = 60;
    const top = 88;
    const gap = 24;
    const bottom = 156;
    const stripHeight = top + slotHeight * BOOTH_CUT_COUNT + gap * (BOOTH_CUT_COUNT - 1) + bottom;
    const strip = document.createElement("canvas");
    const ctx = requireContext(strip.getContext("2d"));

    strip.width = stripWidth;
    strip.height = stripHeight;
    ctx.imageSmoothingEnabled = false;

    ctx.fillStyle = template.background;
    ctx.fillRect(0, 0, stripWidth, stripHeight);
    this.drawPaper(ctx, template, stripWidth, stripHeight);
    this.drawHeader(ctx, template, stripWidth);

    frames.forEach((frame, index) => {
      const y = top + index * (slotHeight + gap);

      ctx.fillStyle = template.shadow;
      ctx.fillRect(marginX + 8, y + 8, slotWidth, slotHeight);
      ctx.fillStyle = template.slot;
      ctx.fillRect(marginX, y, slotWidth, slotHeight);
      drawCanvasCover(ctx, frame, marginX, y, slotWidth, slotHeight);
      ctx.strokeStyle = template.slotBorder;
      ctx.lineWidth = 4;
      ctx.strokeRect(marginX + 2, y + 2, slotWidth - 4, slotHeight - 4);
      this.drawCutNumber(ctx, template, index + 1, marginX, y);
    });

    this.drawFooter(ctx, template, stripWidth, stripHeight);

    return strip;
  }

  private drawPaper(
    ctx: CanvasRenderingContext2D,
    template: FrameTemplate,
    stripWidth: number,
    stripHeight: number
  ): void {
    ctx.fillStyle = template.paper;
    ctx.fillRect(22, 22, stripWidth - 44, stripHeight - 44);
    ctx.strokeStyle = template.slotBorder;
    ctx.lineWidth = 2;
    ctx.strokeRect(22, 22, stripWidth - 44, stripHeight - 44);

    ctx.save();
    ctx.globalAlpha = 0.06;
    ctx.fillStyle = template.ink;

    for (let y = 34; y < stripHeight - 34; y += 18) {
      ctx.fillRect(34, y, stripWidth - 68, 1);
    }

    for (let x = 44; x < stripWidth - 44; x += 28) {
      ctx.fillRect(x, 34, 1, stripHeight - 68);
    }

    if (template.id === "instant-film") {
      ctx.globalAlpha = 0.08;
      ctx.fillStyle = "#b79b62";

      for (let y = 52; y < stripHeight - 48; y += 41) {
        ctx.fillRect(40, y, stripWidth - 80, 2);
      }
    }

    ctx.restore();
  }

  private drawHeader(ctx: CanvasRenderingContext2D, template: FrameTemplate, stripWidth: number): void {
    ctx.fillStyle = template.ink;
    ctx.font = "700 26px 'Courier New', monospace";
    ctx.textAlign = "center";
    ctx.fillText(template.id === "instant-film" ? "INSTANT FILM" : "4-CUT BOOTH", stripWidth / 2, 60);
    ctx.fillStyle = template.muted;
    ctx.font = "16px 'Courier New', monospace";
    ctx.fillText("TRASHCAM 2004", stripWidth / 2, 82);
    ctx.textAlign = "start";
  }

  private drawCutNumber(
    ctx: CanvasRenderingContext2D,
    template: FrameTemplate,
    cutNumber: number,
    x: number,
    y: number
  ): void {
    ctx.fillStyle = "rgba(0, 0, 0, 0.58)";
    ctx.fillRect(x + 12, y + 12, 70, 28);
    ctx.fillStyle = "#f5efcf";
    ctx.font = "700 16px 'Courier New', monospace";
    ctx.fillText(`CUT ${cutNumber}`, x + 20, y + 32);
    ctx.strokeStyle = template.slotBorder;
    ctx.lineWidth = 1;
    ctx.strokeRect(x + 12.5, y + 12.5, 70, 28);
  }

  private drawFooter(
    ctx: CanvasRenderingContext2D,
    template: FrameTemplate,
    stripWidth: number,
    stripHeight: number
  ): void {
    const now = new Date();

    ctx.fillStyle = template.ink;
    ctx.font = "700 24px 'Courier New', monospace";
    ctx.textAlign = "center";
    ctx.fillText(template.id === "instant-film" ? "REAL FAKE PHOTO" : "SAVE THE DAMAGE", stripWidth / 2, stripHeight - 92);
    ctx.fillStyle = template.muted;
    ctx.font = "16px 'Courier New', monospace";
    ctx.fillText(formatDateLabel(now), stripWidth / 2, stripHeight - 62);
    ctx.textAlign = "start";
  }
}

export function getFrameTemplateById(id: string): FrameTemplate {
  return BOOTH_FRAME_TEMPLATES.find((template) => template.id === id) ?? BOOTH_FRAME_TEMPLATES[0];
}

export function formatBoothFilename(template: FrameTemplate, date = new Date()): string {
  return `trashcam-2004-4-cut-booth-${template.slug}-${formatTimestamp(date)}.png`;
}

function drawCanvasCover(
  ctx: CanvasRenderingContext2D,
  source: HTMLCanvasElement,
  x: number,
  y: number,
  width: number,
  height: number
): void {
  const sourceRatio = source.width / source.height;
  const targetRatio = width / height;
  let cropWidth = source.width;
  let cropHeight = source.height;

  if (sourceRatio > targetRatio) {
    cropWidth = source.height * targetRatio;
  } else {
    cropHeight = source.width / targetRatio;
  }

  const cropX = (source.width - cropWidth) / 2;
  const cropY = (source.height - cropHeight) / 2;

  ctx.drawImage(source, cropX, cropY, cropWidth, cropHeight, x, y, width, height);
}

function formatDateLabel(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}.${month}.${day}`;
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

function requireContext(context: CanvasRenderingContext2D | null): CanvasRenderingContext2D {
  if (!context) {
    throw new Error("Canvas 2D context is not available.");
  }

  return context;
}
