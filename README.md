# TrashCam 2004

## One-line

Phone front-camera web app that intentionally downgrades the image into a 2000s low-quality PC webcam look.

## Core idea

Most camera apps try to make people look better. TrashCam 2004 does the opposite:
it turns the front camera into a broken-looking old webcam with pixelation, color bleed, noise, low frame rate, and cursed presets.

The value is not utility. The value is instant visual comedy.

## Target experience

1. Open the app on a phone.
2. Allow front-camera access.
3. See a live degraded preview immediately.
4. Switch between ugly presets.
5. Save a still image.

## MVP scope

### Must have

- Front camera access through the browser.
- Live canvas preview.
- Low-resolution pixelated rendering.
- Noise, color shift, and compression-like artifacts.
- Three baseline presets:
  - PC Bang Cam 2004
  - Cyworld Selfie Cam
  - Laptop Webcam Hell
- Save current frame as PNG.
- Smartphone-friendly save/share flow.
- HTTPS test deployment so real phones can use camera permissions.

### Should not have in MVP

- Login
- Backend
- AI generation
- Social feed
- User accounts
- Video recording
- Native mobile app

## Minimum testable version

The first complete milestone is not a polished product. It is a web link that can be opened on real smartphones and tested end to end.

Done means:

1. The app is deployed on HTTPS.
2. A phone can open the link.
3. The browser asks for front-camera permission.
4. The live preview starts.
5. At least one trash preset is visibly active.
6. The user can save or share a captured PNG from the phone.

This is the loop target. Keep iterating until these six checks pass.

## Recommended stack

- Vite
- TypeScript
- Plain HTML/CSS/canvas
- Browser `getUserMedia()`
- Deploy later to Vercel or any HTTPS static host

Reason: the core product is a camera/canvas effect. A full framework is unnecessary for the first version.

## Success criteria

- Works on desktop Chrome with webcam.
- Works on iPhone Safari when served through HTTPS or localhost.
- Works on Android Chrome when served through HTTPS.
- The degraded preview is visibly funny without explanation.
- A saved PNG looks like a believable terrible old webcam photo.
- On phones, save uses `canvas.toBlob()` plus Web Share API when available.
- iPhone Safari has a usable fallback even if direct Photos save is restricted.

## Current build status

- Vite TypeScript app exists.
- Camera startup, canvas render loop, three presets, and PNG save/share path are implemented.
- `npm install` succeeds.
- `npm run build` succeeds.
- `npm run smoke` succeeds.
- `npm run readiness` succeeds as a no-side-effect deployment status report, while noting that Vercel CLI and real device tests still require approval.
- `npm run dev:local` reserves `http://127.0.0.1:5174/` for this project so another Vite app on 5173 does not get mistaken for TrashCam.
- `vercel.json` pins Vercel to Vite, `npm run build`, and `dist`.
- `vercel.json` also sets deployment response headers:
  - `Permissions-Policy: camera=(self), microphone=(), geolocation=()`
  - `Referrer-Policy: no-referrer`
  - `X-Content-Type-Options: nosniff`
- Browser UI was checked in no-camera verification mode with `?camera=off`.
- Browser render/preset/mobile layout was checked in synthetic camera mode with `?demo=1`.
- `?demo=1` exposes non-visual state on `#app` for verification:
  - `data-source-mode`
  - `data-camera-state`
  - `data-camera-error`
  - `data-secure-context`
  - `data-share-capability`
  - `data-video-size`
  - `data-rendered-frames`
  - `data-active-preset`
  - `data-last-save-kind`
  - `data-last-save-bytes`
  - `data-last-save-name`
- Real camera permission, actual downloaded/shared PNG file usability, HTTPS deploy, and phone tests still need manual/external verification.
- 2026-06-12 local browser recheck: `?demo=1&save=prepare` on a 390px viewport at `http://127.0.0.1:5174/` rendered frames, had no horizontal overflow, and prepared a PNG Blob/File with no console warnings or errors.
- Camera startup now checks `window.isSecureContext` before requesting camera access. On non-HTTPS/non-localhost pages, the UI shows explicit HTTPS guidance instead of a vague unsupported-camera error.
- Camera startup now has a bounded metadata/playback wait. If video startup fails after permission, acquired tracks are stopped, retry is shown, and `?debug=1` exposes `cameraError`.
- Save/share fallback is hardened for mobile browsers: `File` creation is guarded, `navigator.canShare()` exceptions fall through safely, and non-cancel share failures continue to the download fallback.
- 2026-06-12 production preview recheck: `?demo=1&save=prepare` on a 390px viewport at `http://127.0.0.1:4174/` rendered from `dist`, had no horizontal overflow, and prepared a PNG Blob/File with no console warnings or errors.
- 2026-06-12 production preview fallback-save recheck: `?demo=1` at `http://127.0.0.1:4174/` reached the fallback download path with `data-last-save-kind="downloaded"`, `data-last-save-bytes=692817`, PNG filename generation, and no console warnings or errors. Codex in-app Browser does not support download event/file receipt, so this does not prove an actual file landed in Downloads.
- Real-device deployment and phone test checklist lives in `docs/mobile-save-and-test-deploy.md`.
- 2026-06-12 debug-mode recheck: `?demo=1&debug=1&save=prepare` at 390px showed visible diagnostics, no horizontal overflow, active render frames, and prepared PNG save state with no console warnings or errors.
- 2026-06-12 production debug-mode recheck: `http://127.0.0.1:4174/?demo=1&debug=1&save=prepare` at 390px rendered from `dist`, showed visible diagnostics, no horizontal overflow, `data-last-save-kind="prepared"`, `data-last-save-bytes=694086`, PNG filename generation, and no console warnings or errors.
- 2026-06-12 production copy-state report recheck: `Copy state` report generation was verified through `data-debug-report` without writing to the real clipboard. The report included URL, user agent, `camera=ready`, `save=prepared`, and PNG filename.
- 2026-06-12 production save-hardening recheck: after guarded `File`/`canShare()` changes, `http://127.0.0.1:4174/?demo=1&debug=1&save=prepare` at 390px still prepared a PNG, updated the debug report with `save=prepared`, had no horizontal overflow, and produced no console warnings or errors.
- 2026-06-12 production camera-hardening recheck: after bounded camera startup changes, `http://127.0.0.1:4174/?demo=1&debug=1&save=prepare` at 390px still rendered from `dist`, exposed `cameraError=none`, prepared a PNG, had no horizontal overflow, and produced no console warnings or errors.
- 2026-06-12 debug diagnostics expansion: `?debug=1` now reports save/share capability, source video dimensions, viewport size, and device pixel ratio for faster real-phone failure triage.
- 2026-06-12 production diagnostics recheck: `http://127.0.0.1:4174/?demo=1&debug=1&save=prepare` at 390px reported `shareCapability=file-share`, `video=640x480`, `viewport=390x844`, device pixel ratio, and `save=prepared` with no horizontal overflow or console warnings/errors.
- 2026-06-12 readiness recheck: `npm run readiness` passed smoke and local checks, reported Node `v22.22.1`, npm `10.9.4`, and correctly flagged missing Vercel CLI plus remaining external verification gates as approval-needed.
- 2026-06-12 preset expansion: `Pixel Art Cam` added as the first game-style preset. It uses a public-safe name, a limited toy-game palette, ordered dithering, and block grid lines. No Minecraft name, logo, or texture is used.
- 2026-06-12 Pixel Art production recheck: `http://127.0.0.1:4174/?demo=1&debug=1&save=prepare` at 390px switched to `pixelart`, reported `category=game`, prepared `trashcam-2004-pixel-art-cam-...png`, had no horizontal overflow, and produced no console warnings/errors. This is still synthetic-source verification, not a real phone camera test.

## Local development

```bash
npm install
npm run dev:local
```

Open:

```text
http://127.0.0.1:5174/
```

For UI-only verification without requesting camera permission:

```text
http://127.0.0.1:5174/?camera=off
```

For local render verification without requesting camera permission:

```text
http://127.0.0.1:5174/?demo=1
```

`?demo=1` uses a synthetic canvas stream. It proves the hidden-video -> degraded-canvas render path works, but it does not prove real camera permission or real phone behavior.

For opt-in visible diagnostics during real-device testing:

```text
http://127.0.0.1:5174/?debug=1
```

You can combine it with test modes:

```text
http://127.0.0.1:5174/?demo=1&debug=1
```

The debug panel shows source, camera state, camera error reason, secure context, source video size, share capability, frame count, active preset, and last save result. The copied report also includes viewport size and device pixel ratio. `Copy state` copies the current debug report for failure notes. It is only visible when `debug=1` is present, and it does not replace real camera/phone verification.

For local PNG preparation verification without downloading a file:

```text
http://127.0.0.1:5174/?demo=1&save=prepare
```

Tap `Save PNG`, then check:

```text
#app[data-last-save-kind="prepared"]
data-last-save-bytes is greater than 0
data-last-save-name ends with .png
```

This proves canvas-to-PNG Blob/File preparation works. It does not prove native share sheet or download behavior.

Useful local pass signal:

```text
#app[data-source-mode="demo"][data-camera-state="ready"]
data-rendered-frames increases over time
```

For production-build preview verification:

```bash
npm run build
npm run preview:local
```

Open:

```text
http://127.0.0.1:4174/?demo=1&save=prepare
```

Production preview debug check:

```text
http://127.0.0.1:4174/?demo=1&debug=1&save=prepare
```

For production-build fallback-save path verification without real camera:

```text
http://127.0.0.1:4174/?demo=1
```

Tap `Save PNG`, then check:

```text
#app[data-last-save-kind="downloaded"]
data-last-save-bytes is greater than 0
data-last-save-name ends with .png
```

This proves the app reached the fallback download branch. It still does not prove the browser or phone saved a usable file to disk/photos.

## Local smoke check

```bash
npm run smoke
```

This runs the production build and checks:

- required app files exist
- `dist` contains bundled JS/CSS
- Vercel config points to Vite, `npm run build`, and `dist`
- Vercel config includes camera/permission and basic response headers
- camera code checks secure context before requesting camera access
- camera code bounds video startup and stops an acquired stream if playback startup fails
- camera code uses `getUserMedia()` with front-camera preference and fallback
- save code uses `canvas.toBlob()`, Web Share API, and download fallback
- save code guards mobile share capability checks so fallback download remains available
- save code supports `?save=prepare` for non-downloading local PNG preparation checks
- app supports `?debug=1` for visible real-device diagnostics
- debug panel can copy a state report for phone-test failure notes
- debug report includes share capability, video size, viewport, and device pixel ratio for phone-test triage
- the three baseline presets and Pixel Art Cam exist
- Pixel Art Cam has a game preset category
- Pixel Art palette limiting and dithering helpers exist

This does not prove real camera permission, actual downloaded/shared file usability, HTTPS deployment, or phone support.

## Deployment readiness check

```bash
npm run readiness
```

This runs `npm run smoke`, then prints a no-side-effect status report for deployment readiness.

It checks:

- project root
- smoke script wiring
- built `dist`
- Node and npm availability
- Vercel CLI availability
- remaining approval-required gates

This does not install Vercel, deploy, accept camera permissions, or verify phone behavior.

## Next build step

Verify the real browser loop:

```text
desktop browser -> camera permission -> degraded preview -> preset switch -> save PNG
```

## HTTPS deployment prep

Vercel is the intended first HTTPS host. This repo now includes:

```text
vercel.json -> npm install -> npm run build -> dist
headers -> same-origin camera allowed, microphone/geolocation disabled
```

Current local note:

- `vercel` CLI is not installed in this shell.
- Deployment has not been run yet.
- Do not call the MVP done until at least one real phone completes the HTTPS camera/save loop.

Manual deploy path:

```bash
npm run build
npm install -g vercel
vercel
```

After deploy, record the HTTPS URL and test:

```text
phone opens URL -> camera permission -> degraded preview -> save/share PNG
```
