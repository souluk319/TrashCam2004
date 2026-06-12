# TrashCam 2004 Build Spec

## Build target

Create the minimum testable web MVP for TrashCam 2004.

The app must run as a static Vite TypeScript web app, open on smartphones through an HTTPS deployment URL, request the front camera, show a deliberately degraded live preview, and let users save or share a captured PNG.

This is not a polished product pass. It is a real-device test build.

## Product promise

Open the link, allow camera access, and instantly look like a 2000s PC webcam tragedy.

## Tech stack

- Vite
- TypeScript
- Plain DOM UI
- CSS
- Canvas 2D
- Browser camera APIs
- Static HTTPS deployment, preferably Vercel

Do not add a backend, login, database, AI model, image upload flow, or native app layer.

## First-screen experience

The first screen must be the camera tool, not a landing page.

Layout:

- Full viewport app shell.
- Main area: visible canvas preview.
- Hidden video element receives the camera stream.
- Bottom control bar:
  - Preset segmented control
  - Save/share button
  - Retry camera button shown only after camera failure
- Small app title: `TrashCam 2004`
- Short status line only for camera, saving, or error states.

The app should feel like an old webcam utility, not a modern photo editor.

## User flow

```text
Open app
-> App requests front camera
-> User allows permission
-> Hidden video receives stream
-> Canvas renders degraded preview
-> User changes preset
-> User taps save
-> App creates PNG
-> App opens native share sheet when possible
-> App falls back to download link when sharing is unavailable
```

## Camera behavior

Use `navigator.mediaDevices.getUserMedia()`.

Preferred constraints:

```ts
{
  video: {
    facingMode: "user",
    width: { ideal: 640 },
    height: { ideal: 480 }
  },
  audio: false
}
```

Fallback:

- Before requesting camera access, check that the page is running in a secure context.
- If the page is not a secure context, do not call `getUserMedia()`. Show a short HTTPS/localhost guidance message instead.
- If the strict front-camera request fails, retry with `{ video: true, audio: false }`.
- If all camera access fails, show a short error and a retry button.
- After a stream is acquired, keep video metadata/playback startup bounded. If metadata or playback does not start, stop the acquired stream and show retry instead of leaving an endless loading state.

The camera should start automatically on load. Do not require a separate "start" button unless browser behavior forces it.

## Canvas pipeline

Use a hidden video, an offscreen low-resolution canvas, and one visible preview canvas.

Render loop:

```text
video frame
-> draw to tiny offscreen canvas
-> draw offscreen canvas to visible canvas with smoothing disabled
-> apply preset-specific pixel manipulation
-> draw overlays
-> repeat at preset FPS
```

Set:

```ts
ctx.imageSmoothingEnabled = false;
```

Keep the UI responsive even if the preview runs at low FPS.

## Preview dimensions

The visible canvas should keep a stable camera-like aspect ratio and fit both phone and desktop screens.

Recommended:

- Internal visible canvas: `640x480`
- CSS: responsive width, max height within viewport
- Object style: no layout shift when presets change

The low-resolution offscreen size changes by preset.

## Presets

### PC Bang Cam 2004

Purpose: default preset. It must look bad within 3 seconds.

Settings:

- Offscreen resolution: `160x120`
- FPS: `10`
- Noise: medium
- Color cast: green/yellow
- Contrast: slightly harsh
- Add scanlines
- Optional overlay: timestamp-like text

Copy:

- `Resolution successfully damaged.`

### Cyworld Selfie Cam

Purpose: softer, warmer, fake-nostalgic ugly.

Settings:

- Offscreen resolution: `220x165`
- FPS: `12`
- Noise: low
- Color cast: warm/pink
- Highlights: slightly overexposed
- Soft blur impression through repeated low-res draw or light channel wash

Copy:

- `Your face has entered 2004.`

### Laptop Webcam Hell

Purpose: the most broken preset.

Settings:

- Offscreen resolution: `128x96`
- FPS: `8`
- Noise: high
- Color cast: blue/gray
- Shadows: underexposed
- Add subtle jitter by shifting the drawn frame a few pixels

Copy:

- `This camera has given up.`

### Pixel Art Cam

Purpose: first game-style preset expansion. It should make the saved image feel like a funny profile portrait, not just another broken webcam.

Public naming guardrail:

- Use `Pixel Art Cam` in the app.
- Do not use Minecraft names, logos, textures, or direct branding.
- For internal discussion, "mark mode" can refer to the idea, but shipped UI copy should stay generic.

Settings:

- Offscreen resolution: `80x60`
- FPS: `9`
- Low noise
- Stronger contrast
- Limited toy-game color palette
- Ordered dithering
- Subtle block grid/outline feeling

Copy:

- `Profile picture unlocked. Somehow worse.`

## Effect functions

Implement effects in a small, readable module.

Suggested files:

```text
src/presets.ts
src/effects.ts
src/camera.ts
src/save.ts
src/main.ts
src/styles.css
```

Effect helpers:

- `applyNoise(imageData, amount)`
- `applyColorCast(imageData, multipliers)`
- `applyContrast(imageData, amount)`
- `drawScanlines(ctx, width, height, opacity)`
- `drawTimestamp(ctx, presetName)`
- `applyPaletteLimit(imageData)`
- `applyDither(imageData, amount)`
- `drawPixelGrid(ctx, width, height, blockWidth, blockHeight, opacity)`
- `clamp(value, min, max)`

Avoid over-abstracting. The MVP should stay easy to edit.

## Save/share behavior

Save button behavior:

```text
tap save
-> visibleCanvas.toBlob("image/png")
-> create File from Blob only when File is available
-> if navigator.canShare({ files: [file] }) and navigator.share exist, use share sheet
-> otherwise create temporary object URL and click a download link
-> revoke object URL after download path starts
```

If `File` creation, `navigator.canShare()`, or `navigator.share()` fails for a non-cancel reason, the app should keep going to the download fallback instead of treating the PNG as failed.

Filename:

```text
trashcam-2004-{preset-slug}-{YYYYMMDD-HHmmss}.png
```

Status text examples:

- `Saved. Unfortunately.`
- `공유 메뉴에서 이미지 저장을 선택해줘.`
- `저장 실패. 브라우저가 또 예민하게 군다.`

Show guidance only after an error or fallback. Do not clutter the main UI.

## Debug diagnostics

When `?debug=1` is present, expose a compact diagnostic panel for real-device testing.

It should include:

- source mode
- camera state and camera error kind
- secure context
- viewport and device pixel ratio in the copyable report
- source video dimensions
- rendered frame count
- active preset
- save/share capability
- last save kind, byte size, and filename
- current status text

The debug panel must stay opt-in and must not replace real camera, save/share, deployment, or phone verification.

## Mobile requirements

The MVP must be tested on a real HTTPS URL, not only local desktop.

Minimum mobile support:

- iPhone Safari: camera opens on HTTPS, degraded preview appears, save/share has at least one usable path.
- Android Chrome: camera opens on HTTPS, degraded preview appears, save/download has at least one usable path.

If only one phone type is available during the first loop, test that one and document the missing device test as a known gap.

## Desktop requirements

Desktop Chrome must work for fast development:

- Camera permission prompt appears.
- Webcam preview renders.
- Presets switch visibly.
- PNG downloads.

## Error states

Camera unavailable:

- Show: `카메라를 못 열었다. 권한이나 HTTPS를 확인해줘.`
- Show retry button.

Insecure context:

- Show: `HTTP에서는 폰 카메라가 안 열린다. HTTPS 링크로 다시 열어줘.`
- Show retry button.

Camera permission denied:

- Show: `카메라 권한이 막혔다. 브라우저 설정에서 다시 허용해야 한다.`

Save/share failed:

- Show fallback download if possible.
- If all fails, show a short instruction.

Playback blocked after camera permission:

- Show: `카메라 재생이 막혔다. Retry camera를 눌러 다시 시작해줘.`
- Stop any acquired camera tracks before showing retry.

No endless spinners. Any waiting state should either resolve or become an error.

## Visual design

Direction:

- Dark utility UI
- Old webcam control-panel flavor
- Compact controls
- No marketing hero
- No decorative cards
- No feature explanation blocks

Color guidance:

- Use dark neutral background.
- Use a small amount of toxic green, faded pink, and washed blue for preset identity.
- Avoid making the whole UI one purple/blue gradient.

Typography:

- Use system fonts.
- Keep button labels short.
- Text must fit on small phone widths.

## Accessibility and usability

- Buttons must be tappable on phones.
- Preset controls must have visible selected state.
- Save button must be disabled while saving.
- Status messages should be readable against the background.
- Canvas should not overlap controls.

## Local commands

Expected commands after implementation:

```bash
npm install
npm run dev
npm run dev:local
npm run build
```

Optional preview:

```bash
npm run preview
npm run preview:local
```

## Deployment

Default target: Vercel static deployment.

The implementation should not require server-side runtime configuration.

Deployment pass means:

- HTTPS URL is produced.
- The app loads without console-breaking runtime errors.
- Phone camera permission appears on the HTTPS URL.

Deployment config should include response headers that keep the camera path explicit and avoid unnecessary browser capabilities:

```text
Permissions-Policy: camera=(self), microphone=(), geolocation=()
Referrer-Policy: no-referrer
X-Content-Type-Options: nosniff
```

## Acceptance checklist

- App runs with `npm run dev`.
- App builds with `npm run build`.
- Desktop Chrome shows degraded webcam preview.
- Default preset is visibly ugly in under 3 seconds.
- All three presets visibly differ.
- Save button creates a PNG on desktop.
- HTTPS deployment URL opens on a phone.
- Phone camera permission prompt appears.
- Phone live preview renders.
- Phone save/share produces a usable PNG through share sheet or download.
- README or docs note any untested phone/browser gap.

## Stop line

Stop at the minimum testable web MVP.

Do not add:

- Accounts
- Feed
- Comments
- Cloud storage
- AI image generation
- Video recording
- Native app wrapper
- Analytics

Those are later decisions after the first phone test.
