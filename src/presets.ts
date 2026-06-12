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

export type Preset = {
  id: "pcbang" | "cyworld" | "hell" | "pixelart";
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
  }
];

export const DEFAULT_PRESET = PRESETS[0];

export function getPresetById(id: Preset["id"]): Preset {
  return PRESETS.find((preset) => preset.id === id) ?? DEFAULT_PRESET;
}
