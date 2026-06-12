export type ColorMultipliers = {
  r: number;
  g: number;
  b: number;
};

export type PresetCategory = "trash" | "future" | "game";

export type PixelArtSettings = {
  dither: number;
  gridOpacity: number;
};

export type CyberpunkSettings = {
  rgbSplit: number;
  glitchBars: number;
  scanlineOpacity: number;
  hudLabel: string;
};

export type VoxelBlockSettings = {
  blockSize: number;
  gridOpacity: number;
};

export type ReceiptPrinterSettings = {
  dither: number;
  bandOpacity: number;
  footerLabel: string;
};

export type CctvEvidenceSettings = {
  scanlineOpacity: number;
  label: string;
};

export type SchoolIdSettings = {
  flashOpacity: number;
  label: string;
  idNumber: string;
};

export type AsciiTerminalSettings = {
  cellSize: number;
  label: string;
};

export type DeepFriedSettings = {
  intensity: number;
  label: string;
};

export type StickerBoothSettings = {
  label: string;
  stickerOpacity: number;
};

export type Preset = {
  id:
    | "pcbang"
    | "cyworld"
    | "hell"
    | "pixelart"
    | "cyberpunk"
    | "voxel"
    | "receipt"
    | "cctv"
    | "schoolid"
    | "ascii"
    | "deepfried"
    | "stickerbooth";
  category: PresetCategory;
  name: string;
  shortName: string;
  slug: string;
  caption: string;
  lowWidth: number;
  lowHeight: number;
  fps: number;
  noise: number;
  color: ColorMultipliers;
  contrast: number;
  brightness: number;
  scanlines?: boolean;
  timestamp?: boolean;
  jitter?: number;
  pixelArt?: PixelArtSettings;
  cyberpunk?: CyberpunkSettings;
  voxelBlock?: VoxelBlockSettings;
  receiptPrinter?: ReceiptPrinterSettings;
  cctvEvidence?: CctvEvidenceSettings;
  schoolId?: SchoolIdSettings;
  asciiTerminal?: AsciiTerminalSettings;
  deepFried?: DeepFriedSettings;
  stickerBooth?: StickerBoothSettings;
};

export const PRESETS: Preset[] = [
  {
    id: "pcbang",
    category: "trash",
    name: "PC Bang Cam 2004",
    shortName: "PC Bang",
    slug: "pc-bang-cam-2004",
    caption: "Resolution successfully damaged.",
    lowWidth: 160,
    lowHeight: 120,
    fps: 10,
    noise: 24,
    color: { r: 0.92, g: 1.08, b: 0.78 },
    contrast: 32,
    brightness: 4,
    scanlines: true,
    timestamp: true
  },
  {
    id: "cyworld",
    category: "trash",
    name: "Cyworld Selfie Cam",
    shortName: "Cyworld",
    slug: "cyworld-selfie-cam",
    caption: "Your face has entered 2004.",
    lowWidth: 220,
    lowHeight: 165,
    fps: 12,
    noise: 9,
    color: { r: 1.14, g: 0.95, b: 1.03 },
    contrast: 10,
    brightness: 22
  },
  {
    id: "hell",
    category: "trash",
    name: "Laptop Webcam Hell",
    shortName: "Hell",
    slug: "laptop-webcam-hell",
    caption: "This camera has given up.",
    lowWidth: 128,
    lowHeight: 96,
    fps: 8,
    noise: 42,
    color: { r: 0.78, g: 0.86, b: 1.16 },
    contrast: 48,
    brightness: -28,
    jitter: 4
  },
  {
    id: "pixelart",
    category: "game",
    name: "Pixel Art Cam",
    shortName: "Pixel Art",
    slug: "pixel-art-cam",
    caption: "Profile picture unlocked. Somehow worse.",
    lowWidth: 80,
    lowHeight: 60,
    fps: 9,
    noise: 3,
    color: { r: 1.08, g: 1.02, b: 0.92 },
    contrast: 34,
    brightness: 10,
    pixelArt: {
      dither: 18,
      gridOpacity: 0.16
    }
  },
  {
    id: "cyberpunk",
    category: "future",
    name: "Cyberpunk Cam",
    shortName: "Cyberpunk",
    slug: "cyberpunk-cam",
    caption: "SIGNAL BREACH. Face integrity optional.",
    lowWidth: 176,
    lowHeight: 132,
    fps: 11,
    noise: 16,
    color: { r: 1.2, g: 0.92, b: 1.32 },
    contrast: 58,
    brightness: -8,
    cyberpunk: {
      rgbSplit: 5,
      glitchBars: 7,
      scanlineOpacity: 0.18,
      hudLabel: "SIGNAL BREACH"
    }
  },
  {
    id: "voxel",
    category: "game",
    name: "Voxel Block Cam",
    shortName: "Voxel",
    slug: "voxel-block-cam",
    caption: "Your face is now legally made of blocks.",
    lowWidth: 96,
    lowHeight: 72,
    fps: 8,
    noise: 2,
    color: { r: 1.04, g: 1.08, b: 0.88 },
    contrast: 24,
    brightness: 6,
    voxelBlock: {
      blockSize: 2,
      gridOpacity: 0.24
    }
  },
  {
    id: "receipt",
    category: "trash",
    name: "Receipt Printer Cam",
    shortName: "Receipt",
    slug: "receipt-printer-cam",
    caption: "TOTAL DAMAGE: 2004 KRW.",
    lowWidth: 112,
    lowHeight: 84,
    fps: 8,
    noise: 0,
    color: { r: 1, g: 1, b: 1 },
    contrast: 72,
    brightness: 8,
    receiptPrinter: {
      dither: 34,
      bandOpacity: 0.16,
      footerLabel: "TOTAL DAMAGE: 2004"
    }
  },
  {
    id: "cctv",
    category: "trash",
    name: "CCTV Evidence Cam",
    shortName: "CCTV",
    slug: "cctv-evidence-cam",
    caption: "MOTION DETECTED. Explain yourself.",
    lowWidth: 184,
    lowHeight: 138,
    fps: 6,
    noise: 20,
    color: { r: 0.78, g: 1.16, b: 0.84 },
    contrast: 44,
    brightness: -18,
    cctvEvidence: {
      scanlineOpacity: 0.24,
      label: "MOTION DETECTED"
    }
  },
  {
    id: "schoolid",
    category: "trash",
    name: "School ID Cam",
    shortName: "School ID",
    slug: "school-id-cam",
    caption: "Officially suspicious since 2004.",
    lowWidth: 210,
    lowHeight: 158,
    fps: 10,
    noise: 6,
    color: { r: 0.92, g: 1.02, b: 1.16 },
    contrast: 18,
    brightness: 34,
    schoolId: {
      flashOpacity: 0.2,
      label: "UNKNOWN",
      idNumber: "2004-ERROR"
    }
  },
  {
    id: "ascii",
    category: "future",
    name: "ASCII Terminal Cam",
    shortName: "ASCII",
    slug: "ascii-terminal-cam",
    caption: "Your face has entered command-line custody.",
    lowWidth: 128,
    lowHeight: 96,
    fps: 7,
    noise: 4,
    color: { r: 0.72, g: 1.42, b: 0.74 },
    contrast: 54,
    brightness: -22,
    asciiTerminal: {
      cellSize: 12,
      label: "FACE.EXE"
    }
  },
  {
    id: "deepfried",
    category: "trash",
    name: "Deep Fried Meme Cam",
    shortName: "Deep Fry",
    slug: "deep-fried-meme-cam",
    caption: "JPEG has left the chat.",
    lowWidth: 176,
    lowHeight: 132,
    fps: 8,
    noise: 26,
    color: { r: 1.34, g: 1.1, b: 0.68 },
    contrast: 68,
    brightness: 18,
    deepFried: {
      intensity: 0.84,
      label: "JPEG DAMAGE"
    }
  },
  {
    id: "stickerbooth",
    category: "trash",
    name: "Sticker Booth Cam",
    shortName: "Sticker",
    slug: "sticker-booth-cam",
    caption: "Mall photo booth energy. Zero dignity.",
    lowWidth: 210,
    lowHeight: 158,
    fps: 10,
    noise: 7,
    color: { r: 1.12, g: 0.96, b: 1.08 },
    contrast: 22,
    brightness: 24,
    stickerBooth: {
      label: "BEST FRIENDS 2004",
      stickerOpacity: 0.9
    }
  }
];

export const DEFAULT_PRESET = PRESETS[0];

export function getPresetById(id: Preset["id"]): Preset {
  return PRESETS.find((preset) => preset.id === id) ?? DEFAULT_PRESET;
}
