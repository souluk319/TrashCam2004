# TrashCam 2004 MVP Plan

## Goal

Build a browser MVP that turns the front camera into a live low-quality webcam preview and lets the user save a still image.

The working target is the minimum testable web deployment: a real HTTPS link that 성욱 and other people can open on their own phones, use the front camera, and save or share the result.

## Non-goals

- No backend.
- No AI.
- No login.
- No video export.
- No social sharing in the first pass.
- No native app.

## Technical shape

```text
main.ts
-> request camera stream
-> attach stream to hidden video
-> draw video to tiny offscreen canvas
-> upscale to visible canvas with imageSmoothing disabled
-> apply preset-specific imageData effects
-> render overlays
-> save visible canvas as PNG
-> use Web Share API on phones when available
```

## Key browser APIs

- `navigator.mediaDevices.getUserMedia()`
- `HTMLVideoElement`
- `CanvasRenderingContext2D`
- `ImageData`
- `HTMLCanvasElement.toBlob()`
- `URL.createObjectURL()`
- `navigator.share()`
- `File`

## Suggested file structure

```text
trashcam-2004/
  README.md
  docs/
    product-brief.md
    mvp-plan.md
  package.json
  index.html
  src/
    main.ts
    effects.ts
    presets.ts
    styles.css
```

## Implementation steps

1. Scaffold Vite TypeScript app.
2. Build the camera permission and stream startup flow.
3. Render hidden video to visible canvas.
4. Add low-resolution pixelation.
5. Add preset effect functions.
6. Add preset switching UI.
7. Add PNG save.
8. Add Web Share API path for supported smartphones.
9. Add fallback download path.
10. Test on desktop browser.
11. Deploy to HTTPS test URL.
12. Test on iPhone Safari and Android Chrome.

## Smartphone save/share strategy

Directly writing into the phone photo library is restricted by browser security, especially on iPhone Safari. The MVP should support the realistic web flow:

1. Capture the visible canvas frame.
2. Convert it to PNG with `canvas.toBlob()`.
3. If `navigator.canShare()` and `navigator.share()` support files, open the native share sheet.
4. If sharing is unavailable, create a temporary download link.
5. Show short fallback text only when needed.

Expected behavior:

- Android Chrome: download and Web Share API should usually work.
- iPhone Safari: Web Share API may work, but direct Photos save is not guaranteed. The user may need to choose Save Image or save through the share sheet.
- Desktop Chrome: download should work.

The save button should not over-explain. It should try the best path first and only show guidance after failure.

## Test deployment requirements

- Deploy to HTTPS before phone testing.
- Vercel static deployment is the default candidate.
- Camera access must be tested on the deployed HTTPS URL, not only local desktop.
- Localhost is acceptable for desktop development, but not enough for smartphone validation.

## Minimum test loop

Keep iterating until all of these pass:

- Desktop Chrome opens the app and shows camera preview.
- Desktop Chrome can save PNG.
- iPhone Safari opens the HTTPS URL and asks for camera permission.
- iPhone Safari shows degraded live preview.
- iPhone Safari can save or share a captured PNG through at least one usable path.
- Android Chrome shows degraded live preview.
- Android Chrome can save or share PNG.
- The default preset is obviously ugly within 3 seconds.

## Effect algorithm for MVP

### Pixelation

1. Draw video into a small offscreen canvas, such as `160x120`.
2. Draw that small canvas back to the visible canvas size.
3. Set `imageSmoothingEnabled = false`.

### Noise

Loop over image data and add random brightness variation:

```text
pixel.r += random(-noise, noise)
pixel.g += random(-noise, noise)
pixel.b += random(-noise, noise)
```

### Color cast

Multiply channels differently per preset:

```text
greenish: r * 0.9, g * 1.08, b * 0.85
pinkish: r * 1.12, g * 0.94, b * 1.02
bluegray: r * 0.82, g * 0.9, b * 1.12
```

### Low FPS feeling

Render effect frames at 8 to 12 FPS while keeping the UI responsive.

## MVP presets

| Preset | Resolution | Noise | Color | Extra |
| --- | --- | --- | --- | --- |
| PC Bang Cam 2004 | 160x120 | Medium | Green/yellow | Scanlines |
| Cyworld Selfie Cam | 220x165 | Low | Warm/pink | Soft blur |
| Laptop Webcam Hell | 128x96 | High | Blue/gray | Jitter |

## Done definition

- `npm run dev` starts the app.
- Opening the local URL shows the camera permission request.
- Allowing permission shows degraded live preview.
- All three presets visibly differ.
- Save button downloads a PNG.
- HTTPS test URL works on real smartphones.
- Phone save/share has been tested on at least iPhone Safari or Android Chrome.
- README explains the concept and next build step.
