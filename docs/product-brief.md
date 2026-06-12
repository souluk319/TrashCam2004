# TrashCam 2004 Product Brief

## Problem

Modern camera apps are too clean, too polished, and too flattering. There is room for a deliberately stupid camera toy that creates instant nostalgia and visual damage.

## Product concept

TrashCam 2004 is a browser-based front-camera app that makes the user look like they are being captured by an old PC webcam in a noisy internet cafe.

It should feel less like a filter app and more like opening a cursed old webcam utility from the early broadband era.

## Audience

- Developers and makers who enjoy useless but funny tools.
- People who like retro internet aesthetics.
- Friends who want quick shareable images.
- 성욱, when the brain needs input that is dumb enough to become useful.

## Product principles

1. Instant result beats feature count.
2. The image must look worse on purpose.
3. Controls should be obvious and minimal.
4. No account, no setup, no explanation screen.
5. The first screen is the camera experience.

## Visual direction

The app should avoid polished photo-app aesthetics. It should feel like:

- Old webcam utility
- Cheap PC cafe software
- Early 2000s personal homepage widget
- Bad compression
- Low frame rate preview
- Slightly broken color calibration

## Core presets

### PC Bang Cam 2004

- Low resolution
- Greenish tint
- Harsh contrast
- Mild scanline effect
- Timestamp overlay optional

### Cyworld Selfie Cam

- Warm pink color cast
- Soft blur
- Overexposed highlights
- Cheap sticker-like frame optional

### Laptop Webcam Hell

- Blue/gray cast
- Heavy noise
- Underexposed shadows
- Blocky pixels
- Jittery frame timing

## MVP user flow

```text
Open app
-> Camera permission prompt
-> Live preview starts
-> Choose preset
-> Save PNG
-> Try another preset
```

## First version UI

- Full-screen camera preview.
- Small top label: `TrashCam 2004`.
- Bottom toolbar:
  - Preset segmented control
  - Save button
  - Camera retry button if permission fails
- Optional status text only for errors.

## Copy tone

Short, dry, and a little insulting to the output image.

Examples:

- `Your face has entered 2004.`
- `Resolution successfully damaged.`
- `This camera has given up.`
- `Saved. Unfortunately.`

## Risks

- iOS Safari camera permissions can be picky.
- Camera access requires HTTPS outside localhost.
- Real-time canvas effects can get heavy on older phones.
- If the effect is too subtle, the product fails.

## Validation checklist

- Can a user understand the joke in under 3 seconds?
- Does the default preset look intentionally bad?
- Can the user save an image without reading instructions?
- Does it work on a real phone, not only desktop?

