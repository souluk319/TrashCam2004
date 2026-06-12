# TrashCam 2004 Implementation Tasks

Use this as the Codex loop checklist. Complete tasks in order and verify each phase before moving on.

## Goal

Build the minimum testable TrashCam 2004 web MVP:

```text
HTTPS web link -> phone camera permission -> degraded live preview -> preset switch -> PNG save/share
```

## Progress note - 2026-06-12

Implemented locally:

- Vite TypeScript app scaffold.
- One-screen camera UI.
- `getUserMedia()` camera startup with front-camera preference and generic fallback.
- Synthetic camera verification mode via `?demo=1`.
- Hidden video to low-resolution canvas to visible canvas render loop.
- Three visual presets.
- `canvas.toBlob()` PNG save/share path with download fallback.
- Mobile-friendly layout and safe-area padding.

Verified:

- `npm install` succeeds.
- `npm run build` succeeds.
- In-app browser UI/console check succeeds with `?camera=off`.
- 390px mobile viewport has no horizontal overflow.
- 2026-06-12 continuation: `npm run build` rechecked successfully.
- 2026-06-12 continuation: `vercel.json` added for Vercel static Vite deployment.
- 2026-06-12 continuation: `?demo=1` synthetic source renders through the hidden-video/canvas path.
- 2026-06-12 continuation: `?demo=1` preset switch to Cyworld updates selected state and caption.
- 2026-06-12 continuation: `?demo=1` at 390px mobile width has no horizontal overflow and keeps Save enabled.
- 2026-06-12 continuation: render state attributes added on `#app`.
- 2026-06-12 continuation: `?demo=1` verified with `data-source-mode="demo"`, `data-camera-state="ready"`, increasing `data-rendered-frames`, active preset switch to `hell`, and no console errors.
- 2026-06-12 continuation: 390px mobile `?demo=1` rechecked with no horizontal overflow, active render frames, and Save enabled.
- 2026-06-12 continuation: `npm run smoke` added and verified. It runs production build and checks dist output, Vercel config, core camera/save/preset source contracts.
- 2026-06-12 continuation: `?demo=1&save=prepare` added for local PNG preparation verification without triggering browser download/share.
- 2026-06-12 continuation: Save prepare path verified in browser: `data-last-save-kind="prepared"`, PNG filename generated, `data-last-save-bytes=693913`, render frames continued, no console errors.
- 2026-06-12 continuation: Vercel response headers added and covered by `npm run smoke`: `Permissions-Policy`, `Referrer-Policy`, `X-Content-Type-Options`.
- 2026-06-12 continuation: `npm run smoke` rechecked successfully after deployment header changes.
- 2026-06-12 continuation: `dev:local` and `preview:local` scripts added to reserve stable TrashCam local ports and avoid confusing another Vite app on 5173 for this project.
- 2026-06-12 continuation: `?demo=1&save=prepare` rechecked at `http://127.0.0.1:5174/` in a 390px browser viewport. Result: `data-source-mode="demo"`, `data-camera-state="ready"`, active render frames, no horizontal overflow, PNG prepared with byte size, no console warnings/errors.
- 2026-06-12 continuation: secure-context camera guard added. Non-HTTPS/non-localhost pages now fail before `getUserMedia()` with explicit HTTPS guidance instead of a vague unsupported-camera message.
- 2026-06-12 continuation: local browser recheck confirmed `data-secure-context="true"` on `http://127.0.0.1:5174/?demo=1&save=prepare`, active synthetic render frames, Save enabled, and no console warnings/errors.
- 2026-06-12 continuation: production dist preview verified at `http://127.0.0.1:4174/?demo=1&save=prepare` in a 390px browser viewport. Result: `data-source-mode="demo"`, `data-camera-state="ready"`, `data-secure-context="true"`, active render frames, no horizontal overflow, PNG prepared with byte size, no console warnings/errors.
- 2026-06-12 continuation: production dist preview fallback-save path verified at `http://127.0.0.1:4174/?demo=1`. After `Save PNG`, app state reached `data-last-save-kind="downloaded"`, `data-last-save-bytes=692817`, generated a `.png` filename, kept rendering, and showed no console warnings/errors.
- 2026-06-12 continuation: Codex in-app Browser reports downloads are unsupported, so the previous item verifies app fallback branch/state only. It does not prove actual file receipt or file usability on disk.
- 2026-06-12 continuation: `docs/mobile-save-and-test-deploy.md` expanded with deployment gate, desktop camera checklist, HTTPS deployment checklist, real iPhone/Android test checklist, and evidence to record on failure.
- 2026-06-12 continuation: `?debug=1` visible diagnostics added for real-device testing. It shows source, camera state, secure context, frame count, active preset, and save result without changing the default app UI.
- 2026-06-12 continuation: `?demo=1&debug=1&save=prepare` verified at 390px. Debug panel was visible, render frames advanced, prepared PNG save state appeared in the panel, no horizontal overflow, and no console warnings/errors.
- 2026-06-12 continuation: production dist preview verified at `http://127.0.0.1:4174/?demo=1&debug=1&save=prepare` in a 390px browser viewport. Result: visible debug panel, `data-source-mode="demo"`, `data-camera-state="ready"`, `data-secure-context="true"`, active render frames, no horizontal overflow, PNG prepared with `data-last-save-bytes=694086`, no console warnings/errors.
- 2026-06-12 continuation: debug panel `Copy state` action added. It builds a text report with URL, user agent, source/camera/secure/frame/preset/save/file/status state for phone-test failure notes.
- 2026-06-12 continuation: production dist preview verified `Copy state` report generation through `data-debug-report` without writing to the real clipboard. Report included URL, user agent, `camera=ready`, `save=prepared`, and PNG filename.
- 2026-06-12 continuation: save/share fallback hardened. `File` creation is now guarded, `navigator.canShare()` failures fall through safely, and non-cancel share errors continue to the download fallback.
- 2026-06-12 continuation: after save/share hardening, production dist preview was rechecked at `http://127.0.0.1:4174/?demo=1&debug=1&save=prepare` in a 390px browser viewport. Result: synthetic render ready, Save enabled, prepared PNG byte size/file name recorded, debug report included `save=prepared`, no horizontal overflow, no console warnings/errors.
- 2026-06-12 continuation: camera startup hardened for real-device testing. Metadata wait is bounded, blocked video playback is reported separately, and an acquired stream is stopped if startup fails after permission.
- 2026-06-12 continuation: after camera startup hardening, production dist preview was rechecked at `http://127.0.0.1:4174/?demo=1&debug=1&save=prepare` in a 390px browser viewport. Result: synthetic render ready, debug panel visible, `cameraError=none` included in the debug report, PNG prepare succeeded, no horizontal overflow, no console warnings/errors.
- 2026-06-12 continuation: debug diagnostics expanded for real phone testing. The panel/report now includes save/share capability, source video dimensions, viewport size, and device pixel ratio alongside the existing camera/save state.
- 2026-06-12 continuation: after debug diagnostics expansion, production dist preview was rechecked at `http://127.0.0.1:4174/?demo=1&debug=1&save=prepare` in a 390px browser viewport. Result: `shareCapability=file-share`, `video=640x480`, `viewport=390x844`, device pixel ratio present, PNG prepare succeeded, no horizontal overflow, no console warnings/errors.
- 2026-06-12 continuation: `npm run readiness` added. It runs smoke, then reports project root, `dist`, Node/npm, Vercel CLI availability, and remaining approval-required external gates without installing or deploying anything.
- 2026-06-12 continuation: `npm run readiness` verified. Result: smoke passed, project root/dist/Node/npm checks passed, Vercel CLI reported as approval-needed/missing, and external camera/download/deployment/phone gates remained explicitly listed.
- 2026-06-12 continuation: `Pixel Art Cam` added as the first game-style preset. It uses `category: "game"`, a public-safe name, limited palette mapping, ordered dithering, and block grid lines.
- 2026-06-12 continuation: `Pixel Art Cam` verified on production preview with `?demo=1&debug=1&save=prepare` at 390px. Result: active preset `pixelart`, `category=game`, PNG prepared with `trashcam-2004-pixel-art-cam-...png`, no horizontal overflow, no console warnings/errors.
- 2026-06-12 continuation: `Cyberpunk Cam` added as the first future-style preset. It uses `category: "future"`, RGB split, glitch bars, scanlines, and `SIGNAL BREACH` HUD copy.
- 2026-06-12 continuation: `Voxel Block Cam` added as a generic block-world game preset. It uses `category: "game"`, block averaging, a limited block palette, and grid lines without Minecraft names, logos, or textures.
- 2026-06-12 continuation: `Cyberpunk Cam` and `Voxel Block Cam` verified on production preview with `?demo=1&debug=1&save=prepare` at 390px. Result: active presets `cyberpunk`/`voxel`, categories `future`/`game`, PNG prepared for both, no horizontal overflow, no console warnings/errors.
- 2026-06-12 continuation: `Receipt Printer Cam`, `CCTV Evidence Cam`, and `School ID Cam` added as extra trash-style presets. They use receipt dithering, green CCTV tint/HUD, and ID-card frame overlays.
- 2026-06-12 continuation: `Receipt Printer Cam`, `CCTV Evidence Cam`, and `School ID Cam` verified on production preview with `?demo=1&debug=1&save=prepare` at 390px. Result: active presets `receipt`/`cctv`/`schoolid`, `category=trash`, PNG prepared for all three, no horizontal overflow, no console warnings/errors.
- 2026-06-12 continuation: Cloudflare Quick Tunnel smoke rechecked at `https://assurance-med-legs-models.trycloudflare.com/?demo=1&debug=1&save=prepare`; response was HTTP 200 `text/html`.
- 2026-06-12 continuation: public beta polish added. `index.html` now includes description/Open Graph metadata, and the app includes a compact Privacy dialog stating that camera frames stay in the browser and TrashCam does not upload photos or video.
- 2026-06-12 continuation: `ASCII Terminal Cam`, `Deep Fried Meme Cam`, and `Sticker Booth Cam` added as extra public-beta fun presets. They use ASCII terminal rendering, deep-fried meme color damage, and sticker photo-booth overlays.
- 2026-06-12 continuation: the new fun presets were verified on production preview with `?demo=1&debug=1&save=prepare` at 390px. Result: 12 preset buttons, Privacy dialog opened, active presets `ascii`/`deepfried`/`stickerbooth`, PNG prepared for all three, no horizontal overflow, no console warnings/errors.
- 2026-06-12 continuation: productization preset navigation added. The 12 presets are now grouped behind `Trash`, `Future`, and `Game` pack tabs.
- 2026-06-12 continuation: pack-tab navigation was verified through the temporary HTTPS tunnel with `?demo=1&debug=1&save=prepare` at 390px. Result: `Trash` pack showed 8 visible presets, `Future` pack switched to `Cyberpunk`/`ASCII`, `Cyberpunk` PNG prepare succeeded, no horizontal overflow, no console warnings/errors.
- 2026-06-12 continuation: GitHub Pages deployment pipeline added and Pages site enabled. `npm run build:pages` builds with `/TrashCam2004/` Vite base path, `dist` is published through the `gh-pages` branch, and the stable URL is `https://souluk319.github.io/TrashCam2004/`.
- 2026-06-12 continuation: stable GitHub Pages URL verified with `?demo=1&debug=1&save=prepare` at 390px. Result: HTTP 200, `secure=true`, app version `0.1.0-beta.1`, preset count `12`, `Game` pack switched to `Pixel Art`/`Voxel`, Pixel Art PNG prepare succeeded, no horizontal overflow, no console warnings/errors.
- 2026-06-12 continuation: productization capture review added. After `Save PNG`, the app shows a frozen saved PNG preview, filename, `Share again`, and `Back to camera`; `Share again` reuses the same saved PNG Blob.
- 2026-06-12 continuation: capture review verified on production preview with `?demo=1&debug=1&save=prepare` at 390px. Result: `captureReview=visible` after save, Blob preview image, same PNG byte size after `Share again`, `captureReview=hidden` after `Back to camera`, no horizontal overflow, no console warnings/errors.
- 2026-06-12 continuation: real-device diagnostics were expanded with `acceptanceGate` and `Copy phone test`. The phone-test report includes device/browser blanks, current camera/save state, and manual fields for file-open/effect-visible confirmation.
- 2026-06-12 continuation: phone-test report verified on production preview with `?demo=1&debug=1&save=prepare` at 390px. Result: `data-phone-test-report` filled, `acceptanceGate=synthetic-or-local-check`, report updated after save with `save=prepared` and `captureReview=visible`, no horizontal overflow, no console warnings/errors.
- 2026-06-12 continuation: `feat/dev0.1` latest build was deployed to the `gh-pages` branch, preserving `main` as the stable source checkpoint.
- 2026-06-12 continuation: stable GitHub Pages latest build verified with `?demo=1&debug=1&save=prepare` at 390px. Result: served `assets/index-DoCWuob4.js`, included `Copy phone test`, reported `secure=true`, `version=0.1.0-beta.1`, `acceptanceGate=synthetic-or-local-check`, prepared a PNG, opened capture review, had no horizontal overflow, and no console warnings/errors.
- 2026-06-12 continuation: `public/.nojekyll` added and smoke now verifies `dist/.nojekyll`; live Pages marker returned HTTP 200.
- 2026-06-12 continuation: `npm run verify:fake-camera` added and verified. It launches Chrome with fake media devices, exercises the real `getUserMedia()` path, reaches `source=camera` / `camera=ready`, prepares a PNG at `766737` bytes, confirms phone-test report `source=camera`, opens capture review, and exits cleanly.
- 2026-06-12 continuation: `npm run smoke` now checks the fake-camera script contract, and `npm run readiness` rechecked successfully after the fake-camera verification addition.
- 2026-06-12 continuation: phone acceptance evidence controls added to `?debug=1`. The phone report now records saved-file-open and saved-effect-visible values, and real camera runs can only reach `phone-pass-candidate` after both are checked following shared/downloaded save.
- 2026-06-12 continuation: production preview evidence UI rechecked at `http://127.0.0.1:4174/?demo=1&debug=1&save=prepare` in a 390px viewport. Result: evidence controls visible, PNG prepared, report updated with manual evidence values, no horizontal overflow, no console warnings/errors.
- 2026-06-12 continuation: evidence UI deployed to `gh-pages` commit `4a9e84e`. Stable URL now serves `assets/index-DJDukQqd.js` and `assets/index-CgIRwTF0.css`; live `?demo=1&debug=1&save=prepare` at 390px verified evidence controls, PNG prepare, phone report manual values, no horizontal overflow, and no console warnings/errors.
- 2026-06-12 continuation: `npm run verify:pages` added. It builds with `/TrashCam2004/`, compares the live Pages hashed assets with local `dist`, verifies `.nojekyll`, runs a headless stable-URL demo save/evidence flow, and fails on browser warnings/errors or horizontal overflow.
- 2026-06-12 continuation: favicon added as `public/favicon.svg` and linked via `%BASE_URL%favicon.svg` to prevent missing favicon requests on GitHub Pages.
- 2026-06-12 continuation: `gh-pages` updated to `6d36964` and `npm run verify:pages` passed. Result: live hashed assets matched local Pages build, live `favicon.svg`/`.nojekyll` returned HTTP 200, PNG prepare reached `693404` bytes, phone evidence report updated, and gate remained correctly `synthetic-or-local-check`.
- 2026-06-12 continuation: phone-test report device evidence expanded. `Copy state` and `Copy phone test` now include `userAgent`, `platform`, `maxTouchPoints`, physical `screen`, `orientation`, `language`, and `mobileCandidate`; smoke, fake-camera, and Pages verification check the fields exist.
- 2026-06-12 continuation: `gh-pages` updated to `9063556` and `npm run verify:pages` passed after the device-evidence report expansion. Result: live Pages served `assets/index-DV-6-8CJ.js`, PNG prepare reached `694042` bytes, phone evidence report updated, and gate remained correctly `synthetic-or-local-check`.
- 2026-06-12 continuation: `npm run verify:download` added and verified. It opens production preview in Chrome, triggers fallback download, confirms the app reaches `save=downloaded`, and checks the actual downloaded file by filename, matching app-reported byte count, PNG signature, and 640x480 dimensions.

Not yet verified:

- Physical desktop browser camera permission and live camera stream.
- Desktop PNG save using an actual camera frame.
- Native share sheet and phone Photos/Files save usability.
- Real iPhone Safari / Android Chrome test.
- Vercel CLI is not installed in this shell, so deployment was not attempted.
- GitHub Pages stable HTTPS deployment is verified with synthetic source only; it does not prove real phone camera/save behavior.

## Phase 0 - Repo sanity

- [x] Confirm current directory is `projects/experiments/trashcam-2004`.
- [x] Read `README.md`.
- [x] Read `docs/product-brief.md`.
- [x] Read `docs/mvp-plan.md`.
- [x] Read `docs/mobile-save-and-test-deploy.md`.
- [x] Read `docs/build-spec.md`.
- [x] Check whether app files already exist before scaffolding.

Exit criteria:

- Existing project state is understood.
- No unrelated workspace files are modified.

## Phase 1 - Scaffold app

- [x] Create Vite TypeScript app files if they do not already exist.
- [x] Keep the app static and frontend-only.
- [x] Add or verify `package.json` scripts:
  - `dev`
  - `dev:local`
  - `build`
  - `preview`
  - `preview:local`
  - `smoke`
  - `verify:fake-camera`
  - `verify:download`
  - `verify:pages`
  - `readiness`
- [x] Create `src/` structure:
  - `main.ts`
  - `camera.ts`
  - `presets.ts`
  - `effects.ts`
  - `save.ts`
  - `styles.css`

Exit criteria:

- `npm install` succeeds.
- `npm run dev` starts the app.
- `npm run build` succeeds.

## Phase 2 - Base UI

- [x] Build a one-screen camera tool, not a landing page.
- [x] Add visible preview canvas.
- [x] Add hidden video element.
- [x] Add compact title `TrashCam 2004`.
- [x] Add preset segmented control.
- [x] Add save/share button.
- [x] Add status line for errors and short feedback.
- [x] Add retry camera button that appears only after camera failure.
- [x] Make layout responsive for phone viewport.
- [x] Add opt-in `?debug=1` diagnostics for real-device testing.
- [x] Add `Copy state` action inside `?debug=1` diagnostics.
- [x] Include save/share capability, source video size, viewport, and device pixel ratio in debug diagnostics.
- [x] Add `acceptanceGate` and `Copy phone test` report for real-device acceptance notes.
- [x] Add debug-only saved-file and saved-effect evidence checkboxes for phone acceptance reports.
- [x] Add public beta metadata and compact Privacy dialog.

Exit criteria:

- UI loads without camera code breaking.
- Text does not overflow on narrow mobile width.
- Controls do not overlap the canvas.

## Phase 3 - Camera startup

- [x] Request camera on page load.
- [x] Prefer front camera using `facingMode: "user"`.
- [x] Fall back to generic video if front-camera constraints fail.
- [x] Attach stream to hidden video.
- [x] Wait until video metadata is ready before rendering.
- [x] Bound camera metadata/playback startup so the app does not stay stuck loading forever.
- [x] Stop acquired camera tracks if video startup fails after permission.
- [x] Handle permission denied.
- [x] Handle blocked video playback after camera permission.
- [x] Handle insecure context before requesting camera.
- [x] Handle missing camera API.
- [x] Implement retry camera.
- [x] Add synthetic camera mode for local render verification without permission prompts.
- [x] Add non-visual render state attributes for smoke verification.
- [x] Add Chrome fake-camera verification for the real `getUserMedia()` path without accepting a physical camera permission prompt.

Exit criteria:

- Desktop Chrome asks for webcam permission.
- Allowing permission starts video stream.
- Denying permission shows a useful error and retry button.

## Phase 4 - Canvas render loop

- [x] Draw video into low-resolution offscreen canvas.
- [x] Upscale to visible canvas.
- [x] Disable image smoothing.
- [x] Keep visible canvas dimensions stable.
- [x] Limit render rate based on active preset FPS.
- [x] Stop duplicate animation loops when restarting camera.

Exit criteria:

- Live preview appears on desktop.
- Preview is visibly pixelated.
- App remains responsive.

## Phase 5 - Presets and effects

- [x] Define preset config in `presets.ts`.
- [x] Implement PC Bang Cam 2004.
- [x] Implement Cyworld Selfie Cam.
- [x] Implement Laptop Webcam Hell.
- [x] Implement Pixel Art Cam as the first game-style preset expansion.
- [x] Implement Cyberpunk Cam as the first future-style preset expansion.
- [x] Implement Voxel Block Cam as a generic block-world preset expansion.
- [x] Implement Receipt Printer Cam as an extra trash-style preset expansion.
- [x] Implement CCTV Evidence Cam as an extra trash-style preset expansion.
- [x] Implement School ID Cam as an extra trash-style preset expansion.
- [x] Implement ASCII Terminal Cam as an extra future-style preset expansion.
- [x] Implement Deep Fried Meme Cam as an extra trash-style preset expansion.
- [x] Implement Sticker Booth Cam as an extra trash-style preset expansion.
- [x] Implement noise effect.
- [x] Implement color cast effect.
- [x] Implement contrast/brightness tweaks.
- [x] Implement palette limit and ordered dither effects for Pixel Art Cam.
- [x] Implement RGB split, glitch bars, and HUD overlay for Cyberpunk Cam.
- [x] Implement block averaging and limited block palette for Voxel Block Cam.
- [x] Implement receipt dithering and receipt print overlay for Receipt Printer Cam.
- [x] Implement grayscale tint, scanlines, and evidence HUD for CCTV Evidence Cam.
- [x] Implement flash wash and ID-card overlay for School ID Cam.
- [x] Implement ASCII posterize and terminal glyph overlay for ASCII Terminal Cam.
- [x] Implement deep-fried saturation/posterize and damage overlay for Deep Fried Meme Cam.
- [x] Implement sticker frame and burst overlay for Sticker Booth Cam.
- [x] Implement scanlines for PC Bang preset.
- [x] Implement jitter for Laptop Webcam Hell.
- [x] Add short per-preset status/caption copy.
- [x] Add `preset.category` with `trash`/`future`/`game` categories.

Exit criteria:

- Default preset looks bad in under 3 seconds.
- All presets are visually distinct.
- Preset switching does not restart the camera.

## Phase 6 - Save/share

- [x] Capture the currently visible canvas.
- [x] Convert canvas to PNG with `canvas.toBlob()`.
- [x] Create a `File` for Web Share API when supported.
- [x] Use `navigator.canShare()` and `navigator.share()` when available.
- [x] Guard `File` creation and `navigator.canShare()` so unsupported mobile browsers still reach download fallback.
- [x] Fall back to temporary download link.
- [x] Revoke temporary object URL after fallback download starts.
- [x] Disable save button while saving.
- [x] Show success/failure status text.
- [x] Add `?save=prepare` path for non-downloading PNG preparation smoke checks.
- [x] Show a frozen capture review after save with the saved PNG, filename, `Share again`, and `Back to camera`.
- [x] Reuse the same saved PNG Blob for `Share again`.

Exit criteria:

- [x] Desktop Chrome fallback downloads PNG in automated synthetic-source verification.
- Saved PNG includes the degraded effect, not the raw camera image.
- Save failure does not crash the app.

## Phase 7 - Mobile polish

- [x] Ensure controls are thumb-friendly.
- [x] Ensure canvas stays visible above bottom controls.
- [x] Avoid fixed heights that break small phones.
- [x] Add safe-area padding for iPhone.
- [x] Keep status copy short.
- [x] Confirm no explanatory onboarding blocks were added.
- [x] Group the 12 presets behind `Trash`, `Future`, and `Game` pack tabs to reduce mobile control crowding.

Exit criteria:

- Mobile viewport looks usable in browser devtools.
- No text/button overflow in narrow width.

## Phase 8 - Local verification

Run:

```bash
npm run build
```

Then verify:

- [x] No TypeScript build errors.
- [x] `npm run smoke` passes.
- [x] `npm run readiness` reports local readiness and external approval gates.
- [x] No obvious console runtime errors during `?camera=off` and `?demo=1` local use.
- [ ] Desktop camera starts.
- [x] PNG fallback download saves a valid PNG file in automated synthetic-source verification.
- [x] PNG Blob/File preparation succeeds in `?demo=1&save=prepare`.
- [x] `?demo=1&save=prepare` succeeds on the stable local URL `http://127.0.0.1:5174/`.
- [x] Production dist preview succeeds on `http://127.0.0.1:4174/?demo=1&save=prepare`.
- [x] Production dist preview succeeds on `http://127.0.0.1:4174/?demo=1&debug=1&save=prepare`.
- [x] Stable GitHub Pages URL succeeds on `https://souluk319.github.io/TrashCam2004/?demo=1&debug=1&save=prepare` with evidence controls and PNG prepare.
- [x] Stable GitHub Pages verification is scripted through `npm run verify:pages`.
- [x] Production dist preview rechecked after save fallback hardening with `?demo=1&debug=1&save=prepare`.
- [x] Production dist preview rechecked after Receipt/CCTV/School ID preset expansion with `?demo=1&debug=1&save=prepare` at 390px.
- [x] Production dist preview rechecked after public beta polish and ASCII/Deep Fried/Sticker preset expansion with `?demo=1&debug=1&save=prepare` at 390px.
- [x] Production dist preview rechecked after camera startup hardening with `?demo=1&debug=1&save=prepare`.
- [x] Production dist preview rechecked after debug diagnostics expansion with `?demo=1&debug=1&save=prepare`.
- [x] Production dist preview reaches fallback download branch on `http://127.0.0.1:4174/?demo=1` with `data-last-save-kind="downloaded"`, PNG byte size, PNG filename, and no console warnings/errors.
- [x] `npm run verify:download` confirms the actual fallback-downloaded file on disk has the expected filename, byte size, PNG signature, and 640x480 dimensions.
- [ ] Actual downloaded/shared PNG file from a real camera run is confirmed usable in a real browser/device.
- [x] Presets switch in `?demo=1`.
- [x] Pixel Art Cam switches in `?demo=1` and prepares a PNG in `?save=prepare`.
- [x] Cyberpunk Cam and Voxel Block Cam switch in `?demo=1` and prepare PNGs in `?save=prepare`.
- [x] Synthetic render frame counter advances in `?demo=1`.
- [x] `?debug=1` verified visually on mobile-size viewport with synthetic source and PNG prepare mode.
- [x] `?debug=1` phone evidence checkboxes verified at 390px with synthetic source and PNG prepare mode.
- [x] `Copy state` report generation verified on production preview without changing the user's real clipboard during automation.
- [x] Debug report includes camera failure reason via `cameraError`.
- [x] Debug report includes save/share capability, source video dimensions, viewport, and device pixel ratio.

Exit criteria:

- Local MVP is ready for external HTTPS deployment.

## Phase 9 - HTTPS deployment

- [x] Add Vercel build/output configuration.
- [x] Add Vercel response headers for same-origin camera allowance and unused permission lock-down.
- [x] Add no-side-effect readiness check before external deployment.
- [x] Deploy to Vercel or another HTTPS static host.
- [x] Record the deployed URL in project notes or final report.
- [x] Open deployed URL on desktop first.
- [ ] Open deployed URL on phone.

Exit criteria:

- HTTPS URL loads the app.
- Phone browser asks for camera permission.

## Phase 10 - Real phone test

Test at least one real phone before calling the MVP complete.

iPhone Safari:

- [ ] HTTPS URL opens.
- [ ] Camera permission prompt appears.
- [ ] Front camera preview renders.
- [ ] Degraded preset is visible.
- [ ] Save/share creates a usable PNG or opens a usable path.

Android Chrome:

- [ ] HTTPS URL opens.
- [ ] Camera permission prompt appears.
- [ ] Front camera preview renders.
- [ ] Degraded preset is visible.
- [ ] Save/share creates a usable PNG or downloads a usable PNG.

Exit criteria:

- At least one real smartphone completes the full loop.
- Any untested browser/device is documented honestly.

## Final report format

When the loop finishes, report:

- What was built
- Local verification result
- Deployment URL
- Phone test result
- Known gaps
- Recommended next product meeting topics

## Known risks

- iPhone Safari may not save directly to Photos.
- Some browsers require user interaction before camera playback.
- Web Share API file support varies.
- Canvas effects may be too heavy if resolution or FPS is too high.
- If the degraded effect is subtle, the product fails even if the code works.

## Product meeting after MVP

After first phone testing, discuss only these:

- Is the result funny enough?
- Which preset should be the default?
- Should the next feature be video/GIF, stickers, or audio-reactive damage?
- Is this still a toy, or does it become a small physics-AI/camera-AI experiment track?
