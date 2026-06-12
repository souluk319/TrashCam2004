import type { ColorMultipliers } from "./presets";

export type PaletteColor = readonly [number, number, number];

const PIXEL_ART_PALETTE: PaletteColor[] = [
  [16, 16, 22],
  [34, 38, 48],
  [58, 52, 74],
  [93, 66, 94],
  [111, 68, 58],
  [168, 85, 72],
  [216, 111, 92],
  [244, 168, 122],
  [255, 211, 158],
  [76, 57, 43],
  [132, 91, 58],
  [196, 138, 78],
  [238, 202, 118],
  [56, 92, 78],
  [72, 142, 93],
  [128, 184, 100],
  [204, 226, 136],
  [56, 78, 132],
  [74, 132, 188],
  [116, 196, 214],
  [230, 238, 216],
  [250, 248, 218],
  [235, 156, 184],
  [166, 92, 142]
];

export const VOXEL_BLOCK_PALETTE: PaletteColor[] = [
  [28, 34, 24],
  [48, 62, 38],
  [76, 94, 54],
  [112, 134, 72],
  [154, 168, 84],
  [202, 192, 108],
  [90, 66, 42],
  [132, 90, 54],
  [178, 122, 70],
  [220, 166, 98],
  [78, 92, 116],
  [112, 138, 158],
  [166, 190, 194],
  [222, 226, 204],
  [150, 86, 76],
  [212, 124, 102]
];

const BAYER_4 = [
  [0, 8, 2, 10],
  [12, 4, 14, 6],
  [3, 11, 1, 9],
  [15, 7, 13, 5]
];

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function applyNoise(imageData: ImageData, amount: number): void {
  const data = imageData.data;

  for (let index = 0; index < data.length; index += 4) {
    const noise = (Math.random() * 2 - 1) * amount;
    data[index] = clamp(data[index] + noise, 0, 255);
    data[index + 1] = clamp(data[index + 1] + noise, 0, 255);
    data[index + 2] = clamp(data[index + 2] + noise, 0, 255);
  }
}

export function applyColorCast(imageData: ImageData, multipliers: ColorMultipliers): void {
  const data = imageData.data;

  for (let index = 0; index < data.length; index += 4) {
    data[index] = clamp(data[index] * multipliers.r, 0, 255);
    data[index + 1] = clamp(data[index + 1] * multipliers.g, 0, 255);
    data[index + 2] = clamp(data[index + 2] * multipliers.b, 0, 255);
  }
}

export function applyContrast(imageData: ImageData, amount: number): void {
  const data = imageData.data;
  const factor = (259 * (amount + 255)) / (255 * (259 - amount));

  for (let index = 0; index < data.length; index += 4) {
    data[index] = clamp(factor * (data[index] - 128) + 128, 0, 255);
    data[index + 1] = clamp(factor * (data[index + 1] - 128) + 128, 0, 255);
    data[index + 2] = clamp(factor * (data[index + 2] - 128) + 128, 0, 255);
  }
}

export function applyBrightness(imageData: ImageData, amount: number): void {
  const data = imageData.data;

  for (let index = 0; index < data.length; index += 4) {
    data[index] = clamp(data[index] + amount, 0, 255);
    data[index + 1] = clamp(data[index + 1] + amount, 0, 255);
    data[index + 2] = clamp(data[index + 2] + amount, 0, 255);
  }
}

export function applyDither(imageData: ImageData, amount: number): void {
  if (amount <= 0) {
    return;
  }

  const data = imageData.data;

  for (let y = 0; y < imageData.height; y += 1) {
    for (let x = 0; x < imageData.width; x += 1) {
      const index = (y * imageData.width + x) * 4;
      const threshold = ((BAYER_4[y % 4][x % 4] / 15) - 0.5) * amount;

      data[index] = clamp(data[index] + threshold, 0, 255);
      data[index + 1] = clamp(data[index + 1] + threshold, 0, 255);
      data[index + 2] = clamp(data[index + 2] + threshold, 0, 255);
    }
  }
}

export function applyReceiptDither(imageData: ImageData, amount: number): void {
  const data = imageData.data;

  for (let y = 0; y < imageData.height; y += 1) {
    for (let x = 0; x < imageData.width; x += 1) {
      const index = (y * imageData.width + x) * 4;
      const luminance = data[index] * 0.299 + data[index + 1] * 0.587 + data[index + 2] * 0.114;
      const threshold = 142 + ((BAYER_4[y % 4][x % 4] / 15) - 0.5) * amount;
      const ink = luminance < threshold ? 28 : 246;

      data[index] = ink;
      data[index + 1] = ink;
      data[index + 2] = ink;
    }
  }
}

export function applyGrayscaleTint(imageData: ImageData, tint: PaletteColor): void {
  const data = imageData.data;

  for (let index = 0; index < data.length; index += 4) {
    const luminance = data[index] * 0.299 + data[index + 1] * 0.587 + data[index + 2] * 0.114;
    const level = luminance / 255;

    data[index] = clamp(level * tint[0], 0, 255);
    data[index + 1] = clamp(level * tint[1], 0, 255);
    data[index + 2] = clamp(level * tint[2], 0, 255);
  }
}

export function applyPaletteLimit(imageData: ImageData, palette: PaletteColor[] = PIXEL_ART_PALETTE): void {
  const data = imageData.data;

  for (let index = 0; index < data.length; index += 4) {
    let nearest = palette[0];
    let nearestDistance = Number.POSITIVE_INFINITY;

    for (const color of palette) {
      const redDistance = data[index] - color[0];
      const greenDistance = data[index + 1] - color[1];
      const blueDistance = data[index + 2] - color[2];
      const distance = redDistance * redDistance + greenDistance * greenDistance + blueDistance * blueDistance;

      if (distance < nearestDistance) {
        nearest = color;
        nearestDistance = distance;
      }
    }

    data[index] = nearest[0];
    data[index + 1] = nearest[1];
    data[index + 2] = nearest[2];
  }
}

export function applyBlockAverage(imageData: ImageData, blockSize: number): void {
  const size = Math.max(1, Math.floor(blockSize));

  if (size <= 1) {
    return;
  }

  const data = imageData.data;

  for (let blockY = 0; blockY < imageData.height; blockY += size) {
    for (let blockX = 0; blockX < imageData.width; blockX += size) {
      let red = 0;
      let green = 0;
      let blue = 0;
      let alpha = 0;
      let count = 0;

      for (let y = blockY; y < Math.min(blockY + size, imageData.height); y += 1) {
        for (let x = blockX; x < Math.min(blockX + size, imageData.width); x += 1) {
          const index = (y * imageData.width + x) * 4;
          red += data[index];
          green += data[index + 1];
          blue += data[index + 2];
          alpha += data[index + 3];
          count += 1;
        }
      }

      const averagedRed = Math.round(red / count);
      const averagedGreen = Math.round(green / count);
      const averagedBlue = Math.round(blue / count);
      const averagedAlpha = Math.round(alpha / count);

      for (let y = blockY; y < Math.min(blockY + size, imageData.height); y += 1) {
        for (let x = blockX; x < Math.min(blockX + size, imageData.width); x += 1) {
          const index = (y * imageData.width + x) * 4;
          data[index] = averagedRed;
          data[index + 1] = averagedGreen;
          data[index + 2] = averagedBlue;
          data[index + 3] = averagedAlpha;
        }
      }
    }
  }
}

export function applyRgbSplit(imageData: ImageData, amount: number): void {
  const offset = Math.max(1, Math.floor(amount));
  const data = imageData.data;
  const source = new Uint8ClampedArray(data);

  for (let y = 0; y < imageData.height; y += 1) {
    for (let x = 0; x < imageData.width; x += 1) {
      const index = (y * imageData.width + x) * 4;
      const redX = clamp(x - offset, 0, imageData.width - 1);
      const blueX = clamp(x + offset, 0, imageData.width - 1);
      const redIndex = (y * imageData.width + redX) * 4;
      const blueIndex = (y * imageData.width + blueX) * 4;

      data[index] = source[redIndex];
      data[index + 1] = source[index + 1];
      data[index + 2] = source[blueIndex + 2];
    }
  }
}

export function drawPixelGrid(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  blockWidth: number,
  blockHeight: number,
  opacity: number
): void {
  if (opacity <= 0) {
    return;
  }

  ctx.save();
  ctx.globalAlpha = opacity;
  ctx.strokeStyle = "#050505";
  ctx.lineWidth = 1;
  ctx.beginPath();

  for (let x = blockWidth; x < width; x += blockWidth) {
    ctx.moveTo(Math.round(x) + 0.5, 0);
    ctx.lineTo(Math.round(x) + 0.5, height);
  }

  for (let y = blockHeight; y < height; y += blockHeight) {
    ctx.moveTo(0, Math.round(y) + 0.5);
    ctx.lineTo(width, Math.round(y) + 0.5);
  }

  ctx.stroke();
  ctx.restore();
}

export function drawGlitchBars(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  count: number
): void {
  ctx.save();

  for (let index = 0; index < count; index += 1) {
    const barHeight = 4 + Math.floor(Math.random() * 18);
    const y = Math.floor(Math.random() * Math.max(1, height - barHeight));
    const shift = Math.floor((Math.random() * 2 - 1) * 42);

    ctx.globalAlpha = 0.72;
    ctx.drawImage(ctx.canvas, 0, y, width, barHeight, shift, y, width, barHeight);

    if (index % 2 === 0) {
      ctx.globalAlpha = 0.18;
      ctx.fillStyle = shift > 0 ? "#ff2b6d" : "#31f7ff";
      ctx.fillRect(Math.max(0, shift), y, width, Math.max(1, Math.floor(barHeight / 3)));
    }
  }

  ctx.restore();
}

export function drawCyberpunkHud(
  ctx: CanvasRenderingContext2D,
  label: string,
  width: number,
  height: number
): void {
  const now = new Date();
  const seconds = String(now.getSeconds()).padStart(2, "0");

  ctx.save();
  ctx.font = "16px 'Courier New', monospace";
  ctx.textBaseline = "top";
  ctx.fillStyle = "rgba(3, 7, 12, 0.72)";
  ctx.fillRect(14, 14, 210, 56);
  ctx.strokeStyle = "#31f7ff";
  ctx.lineWidth = 1;
  ctx.strokeRect(14.5, 14.5, 210, 56);
  ctx.fillStyle = "#ff2b6d";
  ctx.fillText(label, 24, 24);
  ctx.fillStyle = "#31f7ff";
  ctx.fillText(`CAM_04 // ${seconds} FPS?`, 24, 48);

  ctx.fillStyle = "rgba(255, 43, 109, 0.72)";
  ctx.fillRect(width - 154, height - 32, 140, 2);
  ctx.fillStyle = "rgba(49, 247, 255, 0.72)";
  ctx.fillRect(width - 154, height - 24, 96, 2);
  ctx.restore();
}

export function drawReceiptPrinterOverlay(
  ctx: CanvasRenderingContext2D,
  footerLabel: string,
  width: number,
  height: number,
  bandOpacity: number
): void {
  ctx.save();
  ctx.globalCompositeOperation = "multiply";
  ctx.fillStyle = "rgba(255, 244, 208, 0.34)";
  ctx.fillRect(0, 0, width, height);
  ctx.globalCompositeOperation = "source-over";

  ctx.globalAlpha = bandOpacity;
  ctx.fillStyle = "#050505";
  for (let y = 0; y < height; y += 18) {
    ctx.fillRect(0, y, width, 2);
  }

  ctx.globalAlpha = 0.5;
  ctx.strokeStyle = "#050505";
  ctx.setLineDash([8, 6]);
  ctx.lineWidth = 2;
  ctx.strokeRect(18.5, 18.5, width - 37, height - 37);
  ctx.setLineDash([]);

  ctx.globalAlpha = 0.78;
  ctx.fillStyle = "#050505";
  ctx.fillRect(38, height - 74, width - 76, 34);
  ctx.globalAlpha = 1;
  ctx.fillStyle = "#f8f0d1";
  ctx.font = "18px 'Courier New', monospace";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(footerLabel, width / 2, height - 57);

  ctx.globalAlpha = 0.74;
  ctx.fillStyle = "#050505";
  ctx.font = "14px 'Courier New', monospace";
  ctx.fillText("NO REFUNDS // FACE QUALITY FINAL", width / 2, height - 28);
  ctx.restore();
}

export function drawCctvEvidenceHud(
  ctx: CanvasRenderingContext2D,
  label: string,
  width: number,
  height: number
): void {
  const now = new Date();
  const stamp = [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, "0"),
    String(now.getDate()).padStart(2, "0")
  ].join("-");
  const time = [
    String(now.getHours()).padStart(2, "0"),
    String(now.getMinutes()).padStart(2, "0"),
    String(now.getSeconds()).padStart(2, "0")
  ].join(":");

  ctx.save();
  ctx.font = "17px 'Courier New', monospace";
  ctx.textBaseline = "top";
  ctx.fillStyle = "rgba(0, 12, 4, 0.7)";
  ctx.fillRect(14, 14, 250, 58);
  ctx.fillStyle = "#b6ff9b";
  ctx.fillText(`CAM 04 // ${label}`, 24, 24);
  ctx.fillText(`${stamp} ${time}`, 24, 48);

  ctx.fillStyle = "#ff2d2d";
  ctx.beginPath();
  ctx.arc(width - 104, 33, 7, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#dfffbd";
  ctx.fillText("REC", width - 86, 24);

  ctx.strokeStyle = "rgba(223, 255, 189, 0.86)";
  ctx.lineWidth = 3;
  const cornerSize = 48;
  const margin = 18;
  ctx.beginPath();
  ctx.moveTo(margin, margin + cornerSize);
  ctx.lineTo(margin, margin);
  ctx.lineTo(margin + cornerSize, margin);
  ctx.moveTo(width - margin - cornerSize, margin);
  ctx.lineTo(width - margin, margin);
  ctx.lineTo(width - margin, margin + cornerSize);
  ctx.moveTo(margin, height - margin - cornerSize);
  ctx.lineTo(margin, height - margin);
  ctx.lineTo(margin + cornerSize, height - margin);
  ctx.moveTo(width - margin - cornerSize, height - margin);
  ctx.lineTo(width - margin, height - margin);
  ctx.lineTo(width - margin, height - margin - cornerSize);
  ctx.stroke();

  ctx.fillStyle = "rgba(0, 12, 4, 0.7)";
  ctx.fillRect(width - 256, height - 50, 238, 30);
  ctx.fillStyle = "#b6ff9b";
  ctx.fillText("EVIDENCE_2004_UNHELPFUL", width - 246, height - 42);
  ctx.restore();
}

export function drawSchoolIdOverlay(
  ctx: CanvasRenderingContext2D,
  label: string,
  idNumber: string,
  width: number,
  height: number,
  flashOpacity: number
): void {
  ctx.save();
  ctx.globalCompositeOperation = "screen";
  ctx.globalAlpha = flashOpacity;
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, width, height);
  ctx.globalCompositeOperation = "source-over";
  ctx.globalAlpha = 1;

  ctx.fillStyle = "rgba(228, 240, 255, 0.18)";
  ctx.fillRect(0, 0, width, height);
  ctx.fillStyle = "rgba(25, 50, 94, 0.88)";
  ctx.fillRect(0, 0, width, 54);
  ctx.fillRect(0, height - 72, width, 72);

  ctx.strokeStyle = "#f6fbff";
  ctx.lineWidth = 4;
  ctx.strokeRect(16.5, 16.5, width - 33, height - 33);
  ctx.strokeStyle = "rgba(246, 251, 255, 0.62)";
  ctx.lineWidth = 2;
  ctx.strokeRect(34.5, 78.5, width - 69, height - 174);

  ctx.fillStyle = "#f6fbff";
  ctx.font = "22px 'Courier New', monospace";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("SCHOOL ID // 2004", width / 2, 28);

  ctx.font = "18px 'Courier New', monospace";
  ctx.textAlign = "left";
  ctx.fillText(`NAME: ${label}`, 36, height - 48);
  ctx.fillText(`ID: ${idNumber}`, 36, height - 24);

  ctx.textAlign = "right";
  ctx.fillStyle = "#ffd56c";
  ctx.fillText("STATUS: SUSPICIOUS", width - 36, height - 36);
  ctx.restore();
}

export function drawScanlines(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  opacity: number
): void {
  ctx.save();
  ctx.globalAlpha = opacity;
  ctx.fillStyle = "#050505";

  for (let y = 0; y < height; y += 4) {
    ctx.fillRect(0, y, width, 1);
  }

  ctx.restore();
}

export function drawTimestamp(
  ctx: CanvasRenderingContext2D,
  presetName: string,
  width: number,
  height: number
): void {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  const hours = String(now.getHours()).padStart(2, "0");
  const minutes = String(now.getMinutes()).padStart(2, "0");
  const seconds = String(now.getSeconds()).padStart(2, "0");
  const stamp = `${year}/${month}/${day} ${hours}:${minutes}:${seconds} ${presetName}`;

  ctx.save();
  ctx.font = "16px 'Courier New', monospace";
  ctx.textBaseline = "bottom";
  ctx.fillStyle = "rgba(0, 0, 0, 0.72)";
  ctx.fillRect(14, height - 38, Math.min(width - 28, 380), 24);
  ctx.fillStyle = "#d5ff72";
  ctx.fillText(stamp, 24, height - 19);
  ctx.restore();
}
