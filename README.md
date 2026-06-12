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
- Camera startup, canvas render loop, baseline plus expanded presets, and PNG save/share path are implemented.
- `npm install` succeeds.
- `npm run build` succeeds.
- `npm run smoke` succeeds.
- `npm run verify:fake-camera` succeeds. It launches Chrome with a fake media device and verifies the real `getUserMedia()` code path reaches `source=camera`, `camera=ready`, PNG preparation, and capture review.
- `npm run verify:pages` exists to compare the current Pages build against the live GitHub Pages URL and run a headless demo/evidence check.
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
  - `data-capture-review`
  - `data-acceptance-gate`
- Physical camera permission, actual downloaded/shared PNG file usability, and phone tests still need manual/external verification.
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
- 2026-06-12 preset expansion: `Cyberpunk Cam` and `Voxel Block Cam` added. Cyberpunk uses RGB split, glitch bars, scanlines, and `SIGNAL BREACH` HUD copy. Voxel uses block averaging, a generic limited block palette, and grid lines without Minecraft names, logos, or textures.
- 2026-06-12 production preset recheck: `?demo=1&debug=1&save=prepare` at 390px switched to `cyberpunk` and `voxel`, prepared PNG filenames for both modes, had no horizontal overflow, and produced no console warnings/errors. This is still synthetic-source verification, not a real phone camera test.
- 2026-06-12 preset expansion: `Receipt Printer Cam`, `CCTV Evidence Cam`, and `School ID Cam` added as extra trash-style modes. They use receipt dithering, CCTV tint/HUD, and ID-card frame overlays.
- 2026-06-12 production preset recheck: `http://127.0.0.1:4174/?demo=1&debug=1&save=prepare` at 390px switched to `receipt`, `cctv`, and `schoolid`, prepared PNG filenames for all three modes, had no horizontal overflow, and produced no console warnings/errors. This is still synthetic-source verification, not a real phone camera test.
- 2026-06-12 Cloudflare Quick Tunnel smoke recheck: `https://assurance-med-legs-models.trycloudflare.com/?demo=1&debug=1&save=prepare` responded with HTTP 200 `text/html`.
- 2026-06-12 public beta polish: added Open Graph/description metadata and a small Privacy dialog that states camera frames stay in the browser and are not uploaded.
- 2026-06-12 preset expansion: `ASCII Terminal Cam`, `Deep Fried Meme Cam`, and `Sticker Booth Cam` added. They use ASCII terminal rendering, deep-fried meme color damage, and sticker photo-booth overlays.
- 2026-06-12 production preset recheck: `http://127.0.0.1:4174/?demo=1&debug=1&save=prepare` at 390px showed 12 preset buttons, opened the Privacy dialog, switched to `ascii`, `deepfried`, and `stickerbooth`, prepared PNG filenames for all three modes, had no horizontal overflow, and produced no console warnings/errors. This is still synthetic-source verification, not a real phone camera test.
- 2026-06-12 public beta diagnostics: `?debug=1` now exposes app version and preset count in both the visible panel and copied state report.
- 2026-06-12 productization polish: preset controls now use `Trash`, `Future`, and `Game` pack tabs so mobile users are not staring at all 12 modes at once.
- 2026-06-12 pack-tab verification: temporary HTTPS tunnel + `?demo=1&debug=1&save=prepare` at 390px showed the `Trash` pack filtering to 8 visible presets, `Future` switching to `Cyberpunk`/`ASCII`, `Cyberpunk` PNG prepare succeeding, no horizontal overflow, and no console warnings/errors.
- 2026-06-12 GitHub Pages pipeline: added a Pages build script, enabled the Pages site, and prepared `gh-pages` branch deployment for stable HTTPS at `https://souluk319.github.io/TrashCam2004/`.
- 2026-06-12 stable HTTPS recheck: `https://souluk319.github.io/TrashCam2004/?demo=1&debug=1&save=prepare` loaded from GitHub Pages at 390px, reported `secure=true`, rendered demo frames, switched `Game` pack to `Pixel Art`/`Voxel`, prepared a Pixel Art PNG, had no horizontal overflow, and produced no console warnings/errors.
- 2026-06-12 productization polish: capture review state added. After `Save PNG`, the app shows the saved PNG preview, filename, `Share again`, and `Back to camera`. `Share again` reuses the same saved PNG Blob instead of capturing a new frame.
- 2026-06-12 capture review production recheck: `http://127.0.0.1:4174/?demo=1&debug=1&save=prepare` at 390px showed `captureReview=visible` after save, a Blob preview image, matching PNG filename text, `Share again` preserving the same prepared byte size, `Back to camera` returning to `captureReview=hidden`, no horizontal overflow, and no console warnings/errors. This is still synthetic-source verification, not a real phone camera/save test.
- 2026-06-12 real-device diagnostics: `?debug=1` now exposes `acceptanceGate` and `Copy phone test`, a paste-ready report with device/browser blanks, current camera/save state, and manual fields for file-open/effect-visible confirmation.
- 2026-06-12 phone-test report recheck: `http://127.0.0.1:4174/?demo=1&debug=1&save=prepare` at 390px filled `data-phone-test-report`, showed `acceptanceGate=synthetic-or-local-check`, updated the report after `Save PNG` with `save=prepared` and `captureReview=visible`, had no horizontal overflow, and produced no console warnings/errors.
- 2026-06-12 stable HTTPS latest recheck: `https://souluk319.github.io/TrashCam2004/?demo=1&debug=1&save=prepare` served `assets/index-DoCWuob4.js`, included `Copy phone test`, reported `secure=true`, `version=0.1.0-beta.1`, `acceptanceGate=synthetic-or-local-check`, prepared a PNG, opened capture review, had no horizontal overflow, and produced no console warnings/errors.
- 2026-06-12 Pages deployment hardening: `public/.nojekyll` added and smoke now verifies that the marker is copied to `dist/.nojekyll`; the live Pages marker returned HTTP 200.
- 2026-06-12 fake-camera verification: `npm run verify:fake-camera` passed using Chrome fake media. Result: app reported `source=camera`, `camera=ready`, non-zero source video size, PNG prepared at `766737` bytes, phone-test report included `source=camera`, capture review opened, and the script exited cleanly. This is stronger than `?demo=1`, but it is still not a physical webcam or real phone test.
- 2026-06-12 phone acceptance evidence: `?debug=1` now includes file-open and effect-visible checkboxes. For a real camera run, `acceptanceGate` advances from save-needed to `manual-file-open-needed`, then `manual-effect-check-needed`, and finally `phone-pass-candidate` only after the saved file is opened and the effect is confirmed.
- 2026-06-12 evidence UI recheck: production preview at `http://127.0.0.1:4174/?demo=1&debug=1&save=prepare` in a 390px viewport showed the new evidence controls, prepared a PNG, updated `data-phone-test-report`, had no horizontal overflow, and produced no console warnings/errors. This is still synthetic-source verification.
- 2026-06-12 stable HTTPS evidence deployment: `gh-pages` was updated to `4a9e84e`; live Pages now serves `assets/index-DJDukQqd.js` and `assets/index-CgIRwTF0.css`, `.nojekyll` returns HTTP 200, and `https://souluk319.github.io/TrashCam2004/?demo=1&debug=1&save=prepare` verified the evidence controls, PNG prepare, phone report manual values, no horizontal overflow, and no console warnings/errors.
- 2026-06-12 stable Pages verification script: `npm run verify:pages` added. It builds with the GitHub Pages base path, checks that live Pages serves the same hashed JS/CSS assets, verifies `.nojekyll`, runs a headless 390px demo save/evidence flow, and fails on browser warnings/errors or horizontal overflow.
- 2026-06-12 favicon added through `%BASE_URL%favicon.svg` so GitHub Pages and local builds avoid the default missing favicon request.
- 2026-06-12 stable Pages verification pass: `gh-pages` was updated to `6d36964`, live `favicon.svg` and `.nojekyll` returned HTTP 200, and `npm run verify:pages` passed with live `assets/index-DJDukQqd.js` / `assets/index-CgIRwTF0.css`, PNG prepare `693404` bytes, manual evidence report updates, and `gate=synthetic-or-local-check`.
- 2026-06-12 phone-test evidence expansion: `Copy state` and `Copy phone test` now include automatic browser/device evidence: `userAgent`, `platform`, `maxTouchPoints`, physical `screen`, `orientation`, `language`, and `mobileCandidate`. Smoke, fake-camera, and stable Pages verification now check these fields exist.
- 2026-06-12 stable Pages evidence deployment: `gh-pages` was updated to `9063556`, live Pages served `assets/index-DV-6-8CJ.js`, and `npm run verify:pages` passed with PNG prepare `694042` bytes, manual evidence report updates, no overflow, and `gate=synthetic-or-local-check`.

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

The debug panel shows source, camera state, camera error reason, secure context, app version, preset count, source video size, share capability, real-device acceptance gate, frame count, active preset, and last save result. The copied reports include viewport size, device pixel ratio, user agent, platform, touch capability, physical screen size, orientation, browser language, and a likely-mobile hint. `Copy state` copies the current debug report for failure notes. `Copy phone test` copies a paste-ready phone test report with manual fields for device/browser, saved file open, and saved effect visibility. These controls are only visible when `debug=1` is present, and they do not replace real camera/phone verification.
After a successful save, the copied report also includes `captureReview=visible` while the frozen saved PNG panel is open.

For local PNG preparation verification without downloading a file:

```text
http://127.0.0.1:5174/?demo=1&save=prepare
```

Tap `Save PNG`, then check:

```text
#app[data-last-save-kind="prepared"]
#app[data-capture-review="visible"] after save
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

For GitHub Pages project hosting:

```bash
npm run build:pages
```

This sets the Vite base path to `/TrashCam2004/` so assets load correctly from `https://souluk319.github.io/TrashCam2004/`.

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
- debug report includes app version, preset count, share capability, video size, viewport, and device pixel ratio for phone-test triage
- debug panel includes saved-file and saved-effect checkboxes so a phone report can reach `phone-pass-candidate` only after manual file usability evidence is recorded
- fake-camera verification script exists and requires Chrome fake media to reach `source=camera`, `camera=ready`, phone-test `source=camera`, and capture review after save
- the three baseline presets, Pixel Art Cam, Cyberpunk Cam, Voxel Block Cam, Receipt Printer Cam, CCTV Evidence Cam, School ID Cam, ASCII Terminal Cam, Deep Fried Meme Cam, and Sticker Booth Cam exist
- Pixel Art Cam has a game preset category
- Cyberpunk Cam has a future preset category
- public beta metadata and Privacy dialog copy exist
- Pixel Art palette limiting and dithering helpers exist
- Cyberpunk RGB split, glitch bar, and HUD helpers exist
- Voxel block averaging helper exists
- Receipt printer dithering and overlay helpers exist
- CCTV grayscale tint and HUD helpers exist
- School ID overlay helper exists
- ASCII terminal, deep fried, and sticker booth helpers exist
- stable Pages verification script exists and checks live hashed assets, evidence controls, PNG prepare, no-overflow, and browser warnings/errors

This does not prove real camera permission, actual downloaded/shared file usability, or phone support.

## Fake camera verification

```bash
npm run verify:fake-camera
```

This builds the app, opens the production preview in Chrome with `--use-fake-device-for-media-stream`, and verifies the browser camera path without accepting a real camera permission prompt.

It proves:

- the app calls the real `getUserMedia()` path
- `#app` reaches `data-source-mode="camera"` and `data-camera-state="ready"`
- rendered frames advance from the camera source
- `Save PNG` can prepare a PNG Blob
- capture review opens after save
- the phone-test report includes `source=camera`

It does not prove a physical webcam, native download/share receipt, iPhone Safari, or Android Chrome behavior.

## Stable Pages verification

```bash
npm run verify:pages
```

This builds with the GitHub Pages base path, then checks the live stable URL:

- live HTML references the same JS/CSS assets as the local Pages build
- `.nojekyll` is reachable
- `?demo=1&debug=1&save=prepare` reaches demo ready state
- `Save PNG` prepares a PNG and opens capture review
- phone evidence controls update the phone-test report
- no horizontal overflow appears at 390px
- browser warnings/errors fail the check

This is a stable-URL deployment check. It still does not prove physical phone camera or native file usability.

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

GitHub Pages is also configured as the no-extra-account stable HTTPS fallback:

```text
npm run build:pages -> push dist contents to gh-pages branch
expected URL -> https://souluk319.github.io/TrashCam2004/
```

Current local note:

- `vercel` CLI is not installed in this shell.
- Stable GitHub Pages deployment has been run and synthetically verified.
- Real camera permission and phone save/share remain unverified.
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
