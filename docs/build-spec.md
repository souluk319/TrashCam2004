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

## Capture modes

### Single Shot

Default mode. Tapping save captures the current filtered preview and saves one PNG.

### 4-Cut Booth

Product-style mode expansion. Public app copy should use `4-Cut Booth`, `Four Cut`, or `Photo Strip` naming. Do not use `인생네컷` in shipped UI copy.

First pass flow:

```text
Select 4-Cut Booth
-> choose any existing filter preset
-> tap Start 4-Cut
-> 3 second countdown per cut
-> capture 4 filtered frames
-> show 4 thumbnails
-> choose White or Black frame
-> compose one vertical photo-strip canvas
-> save/share PNG through the existing save path
```

First pass scope:

- Capture 4 frames.
- Compose a vertical photo strip.
- Include White and Black frame templates.
- Save PNG.
- Reuse existing `src/save.ts` delivery path and Capture Review UI.

Deferred:

- Background picker.
- Instant Film, Cyberpunk, Pixel, and Voxel dedicated strip frames.
- Individual cut retake.
- Cut reorder.
- Stickers/text.
- GIF or short video output.

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

### Cyberpunk Cam

Purpose: future/game-style expansion with a neon hacked-camera mood. It should feel stylishly broken while the face remains ridiculous.

Settings:

- Offscreen resolution: `176x132`
- FPS: `11`
- Medium noise
- Strong contrast
- Purple/red/cyan color cast
- RGB channel split
- Horizontal glitch bars
- Scanlines
- HUD copy: `SIGNAL BREACH`

Copy:

- `SIGNAL BREACH. Face integrity optional.`

### Voxel Block Cam

Purpose: generic block-world camera mode. It should make the face look like block chunks without using Minecraft names, logos, or textures.

Public naming guardrail:

- Use `Voxel Block Cam` in the app.
- Do not use Minecraft names, logos, textures, or direct branding.
- Keep it as generic voxel/block-world visual language.

Settings:

- Offscreen resolution: `96x72`
- FPS: `8`
- Low noise
- Block averaging
- Limited block palette
- Stronger block grid/edge lines

Copy:

- `Your face is now legally made of blocks.`

### Receipt Printer Cam

Purpose: make the saved image look like a thermal receipt printout of a bad face decision.

Settings:

- Offscreen resolution: `112x84`
- FPS: `8`
- High contrast
- Black-and-white receipt dithering
- Paper tint
- Horizontal printer banding
- Footer copy: `TOTAL DAMAGE: 2004`

Copy:

- `TOTAL DAMAGE: 2004 KRW.`

### CCTV Evidence Cam

Purpose: make the face feel like it was caught by a cheap security camera and cannot explain itself.

Settings:

- Offscreen resolution: `184x138`
- FPS: `6`
- Medium noise
- Green grayscale tint
- Strong scanlines
- Corner brackets
- REC marker and evidence label

Copy:

- `MOTION DETECTED. Explain yourself.`

### School ID Cam

Purpose: turn the preview into an overexposed, suspicious student-ID style portrait frame.

Settings:

- Offscreen resolution: `210x158`
- FPS: `10`
- Light noise
- Slight blue cast
- Flash wash
- ID-card border and school label overlay
- Bottom metadata strip

Copy:

- `Officially suspicious since 2004.`

### ASCII Terminal Cam

Purpose: make the saved image look like the user's face was rendered by a broken command-line terminal.

Settings:

- Offscreen resolution: `128x96`
- FPS: `7`
- Green terminal tint
- High contrast
- ASCII glyph rendering over the visible canvas
- HUD copy: `FACE.EXE`

Copy:

- `Your face has entered command-line custody.`

### Deep Fried Meme Cam

Purpose: push the photo into over-compressed meme damage without adding external assets.

Settings:

- Offscreen resolution: `176x132`
- FPS: `8`
- Strong contrast
- Heavy saturation
- Posterized colors
- Channel offset and compression band overlay

Copy:

- `JPEG has left the chat.`

### Sticker Booth Cam

Purpose: make the saved image feel like a cheap mall photo-booth sticker sheet.

Settings:

- Offscreen resolution: `210x158`
- FPS: `10`
- Warm pink cast
- Light noise
- Photo-booth frame
- Sticker bursts and date stamp

Copy:

- `Mall photo booth energy. Zero dignity.`

## Effect functions

Implement effects in a small, readable module.

Suggested files:

```text
src/presets.ts
src/effects.ts
src/camera.ts
src/save.ts
src/photo-strip.ts
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
- `applyBlockAverage(imageData, blockSize)`
- `applyRgbSplit(imageData, amount)`
- `drawGlitchBars(ctx, width, height, count)`
- `drawCyberpunkHud(ctx, label, width, height)`
- `drawPixelGrid(ctx, width, height, blockWidth, blockHeight, opacity)`
- `applyReceiptDither(imageData, amount)`
- `applyGrayscaleTint(imageData, tint)`
- `drawReceiptPrinterOverlay(ctx, footerLabel, width, height, bandOpacity)`
- `drawCctvEvidenceHud(ctx, label, width, height)`
- `drawSchoolIdOverlay(ctx, label, idNumber, width, height, flashOpacity)`
- `applyAsciiPosterize(imageData)`
- `drawAsciiTerminalOverlay(ctx, label, width, height, cellSize)`
- `applyDeepFry(imageData, intensity)`
- `drawDeepFriedOverlay(ctx, label, width, height)`
- `drawStickerBoothOverlay(ctx, label, width, height, opacity)`
- `clamp(value, min, max)`

Avoid over-abstracting. The MVP should stay easy to edit.

## Public beta polish

Keep the first screen as the camera tool, but add minimum public-sharing polish:

- `index.html` should include description and Open Graph title/description metadata.
- The app should expose a compact Privacy dialog.
- Privacy copy should state that camera frames stay in the browser and TrashCam does not upload photos or video.
- Do not add analytics, accounts, uploads, or a landing page in this pass.

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

4-Cut Booth filename:

```text
trashcam-2004-4-cut-booth-{frame-slug}-{YYYYMMDD-HHmmss}.png
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
