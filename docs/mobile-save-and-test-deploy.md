# Mobile Save and Test Deployment Notes

## Purpose

TrashCam 2004 should be tested as a web app before any native app work. The minimum useful test is a link that people can open on their own smartphones, run the front camera, and save or share the damaged image.

## Browser constraints

### Camera

Mobile browsers require secure context for camera access.

Allowed:

- `https://...`
- `localhost` for local development

Not reliable:

- plain `http://...` on a phone
- local network IP without HTTPS

The app checks `window.isSecureContext` before calling `getUserMedia()`. If a phone opens a non-HTTPS/non-localhost URL, it should show:

```text
HTTP에서는 폰 카메라가 안 열린다. HTTPS 링크로 다시 열어줘.
```

After camera permission succeeds, video startup is also bounded. If metadata or playback does not start, the app should stop any acquired camera tracks, expose a `cameraError` value in `?debug=1`, and show retry instead of spinning forever.

The debug report also records app version, preset count, viewport size, device pixel ratio, and source video dimensions so a phone failure can be separated into build version, layout, camera stream, and render issues faster.

### Saving

Web apps cannot reliably write directly into the user's Photos app. Browser security intentionally blocks that path.

The MVP should use:

- `canvas.toBlob()` to generate PNG
- Web Share API when file sharing is supported
- temporary download link as fallback
- guarded capability checks so unsupported `File`, `navigator.canShare()`, or non-cancel share failures still reach the download fallback

The debug report exposes `shareCapability` so iPhone/Android save failures can be compared against the browser's reported Web Share file support.

`?debug=1` also exposes two phone evidence checkboxes:

- `file opened`
- `effect visible`

For real camera runs, `acceptanceGate` should only reach `phone-pass-candidate` after the image has been saved/shared, opened from the phone, and confirmed to contain the active TrashCam effect.

## Save button behavior

Preferred flow:

```text
Tap Save
-> render current canvas frame
-> create PNG Blob
-> try native share sheet
-> fallback to download
-> show short guidance only if both fail
```

Share cancellation is treated as cancellation. Other share-preparation or share-call failures should continue to the fallback download path.

## iPhone Safari notes

- Camera access should work on HTTPS.
- File sharing support can vary by iOS/Safari version.
- Direct save to Photos is not guaranteed.
- The acceptable MVP path is share sheet or download fallback.
- If needed, show one short instruction: `공유 메뉴에서 이미지 저장을 선택해줘.`

## Android Chrome notes

- Camera access should work on HTTPS.
- Download fallback should usually work.
- Web Share API file sharing is often available.

## Deployment candidate

Use Vercel for first external testing.

Why:

- HTTPS by default
- Works well for static Vite apps
- Fast preview URLs
- No backend needed

## Current verification status

Already verified locally:

- `npm run build`
- `npm run smoke`
- `npm run readiness` no-side-effect deployment status report
  - smoke passed
  - Node `v22.22.1`
  - npm `10.9.4`
  - Vercel CLI missing/approval-needed
  - external camera/deployment/phone gates still listed
- `?camera=off` UI path without camera permission
- `?demo=1` synthetic hidden-video to canvas render path
- `?demo=1&save=prepare` PNG Blob/File preparation path
- production preview `?demo=1&save=prepare`
- production preview `?demo=1` fallback-save app state:
  - `data-last-save-kind="downloaded"`
  - PNG byte size greater than 0
  - generated `.png` filename
- fallback download file verification:
  - `npm run verify:download` opens production preview in Chrome
  - `Save PNG` writes the fallback file into a temporary download folder
  - downloaded filename matches the app state
  - downloaded byte count matches `data-last-save-bytes`
  - downloaded file has a PNG signature and 640x480 dimensions
- `?demo=1&debug=1&save=prepare` at 390px:
  - visible debug panel
  - `camera=ready`
  - increasing `frames`
  - prepared PNG save result
  - no horizontal overflow
- production preview `?demo=1&debug=1&save=prepare` at 390px:
  - rendered from `dist`
  - visible debug panel
  - `data-last-save-kind="prepared"`
  - PNG byte size greater than 0
  - generated `.png` filename
  - no console warnings/errors
- production preview copy-state report:
  - `Copy state` button visible
  - generated report includes URL, user agent, `camera=ready`, `save=prepared`, and PNG filename
  - automation verified `data-debug-report` only and did not write to the real clipboard
- save/share fallback hardening:
  - guarded `File` creation before Web Share API use
  - guarded `navigator.canShare()` so unexpected browser errors do not stop fallback download
  - non-cancel share errors continue to fallback download
- camera startup hardening:
  - bounded metadata/playback startup wait
  - acquired camera tracks are stopped if startup fails after permission
  - debug report includes `cameraError`
- debug diagnostics expansion:
  - report includes app version and preset count for public beta failure tracking
  - report includes `shareCapability`, `video`, `viewport`, and `devicePixelRatio`
  - visible panel includes save/share capability and source video dimensions
- production preview after debug diagnostics expansion:
  - `?demo=1&debug=1&save=prepare` rendered from `dist` at 390px
  - report included `shareCapability=file-share`, `video=640x480`, `viewport=390x844`, and device pixel ratio
  - Save prepare produced a PNG byte size and `.png` filename
  - no horizontal overflow or console warnings/errors
- production preview after camera startup hardening:
  - `?demo=1&debug=1&save=prepare` rendered from `dist` at 390px
  - debug report included `cameraError=none`
  - Save prepare produced a PNG byte size and `.png` filename
  - no horizontal overflow or console warnings/errors
- production preview after save/share hardening:
  - `?demo=1&debug=1&save=prepare` rendered from `dist` at 390px
  - Save prepare produced a PNG byte size and `.png` filename
  - debug report included `save=prepared`
  - no horizontal overflow or console warnings/errors
- phone evidence UI:
  - `?demo=1&debug=1&save=prepare` rendered from `dist` at 390px
  - saved-file and saved-effect checkboxes appeared in the debug panel
  - checking them updated `data-phone-test-report`
  - `acceptanceCandidate=no` remained correct in synthetic source mode
  - no horizontal overflow or console warnings/errors
- phone-test automatic device evidence:
  - `Copy state` and `Copy phone test` include `userAgent`, `platform`, `maxTouchPoints`, physical `screen`, `orientation`, `language`, and `mobileCandidate`
  - `npm run smoke`, `npm run verify:fake-camera`, and `npm run verify:pages` check these fields exist
- phone-report verifier:
  - `npm run verify:phone-report` validates pasted `Copy phone test` output from a real phone
  - `npm run verify:phone-report:self-test` confirms the parser accepts a pass fixture and rejects demo/prepare-only reports
  - pass requires `source=camera`, `camera=ready`, `save=shared` or `save=downloaded`, saved-file/effect evidence, and `acceptanceGate=phone-pass-candidate`
- stable Pages verification script:
  - `npm run verify:pages` builds with `/TrashCam2004/`
  - live GitHub Pages HTML must reference the same hashed JS/CSS as local `dist`
  - `.nojekyll` must return HTTP 200
  - headless Chrome must pass demo save/evidence flow with no overflow and no browser warnings/errors
- favicon:
  - `public/favicon.svg` is linked through `%BASE_URL%favicon.svg`
  - this avoids missing favicon requests on the GitHub Pages base path

Not yet verified:

- Real desktop camera permission and live stream
- Real desktop downloaded PNG using an actual camera frame
- Native share sheet and phone Photos/Files save usability
- Real iPhone Safari or Android Chrome full loop

Verified HTTPS URL:

- `https://souluk319.github.io/TrashCam2004/`
- Latest deployed bundle: `assets/index-DV-6-8CJ.js` and `assets/index-CgIRwTF0.css` from `gh-pages` commit `9063556`.
- Synthetic check passed at `?demo=1&debug=1&save=prepare` with 390px viewport, `secure=true`, active render frames, evidence controls, report updates, and PNG prepare.
- Live `favicon.svg` and `.nojekyll` returned HTTP 200.
- `npm run verify:pages` passed against the stable URL with matching hashed assets, PNG prepare `694042` bytes, automatic device evidence fields, evidence report updates, no overflow, and no browser warnings/errors.

Important honesty rule:

`?demo=1` and `?save=prepare` are verification aids. They do not prove the real phone camera/save loop.

## Before deployment gate

Run these before any HTTPS deployment attempt:

```bash
npm run smoke
npm run verify:fake-camera
npm run verify:download
npm run verify:phone-report:self-test
npm run readiness
```

Expected pass signal:

```text
Smoke check passed.
TrashCam 2004 readiness check
```

If readiness reports that Vercel CLI is missing, do not install it silently. Ask for approval first.

After updating the `gh-pages` branch, run:

```bash
npm run verify:pages
```

Then manually confirm one desktop browser loop when possible:

```text
http://127.0.0.1:5174/
```

Use this when you need visible state while testing:

```text
http://127.0.0.1:5174/?debug=1
```

For production preview:

```text
http://127.0.0.1:4174/?debug=1
```

Pass checklist:

- Browser asks for camera permission.
- After permission, preview changes from `NO SIGNAL` to live degraded camera.
- Preset buttons visibly change the effect.
- `Save PNG` creates a PNG file that opens locally.
- With `?debug=1`, `camera` becomes `ready`, `frames` increases, and `save` changes after tapping `Save PNG`.
- After opening the saved file, check `file opened` and `effect visible`; on a real camera run this should move `acceptanceGate` to `phone-pass-candidate`.
- If a debug run fails, tap `Copy state` and paste the copied report into the test notes.
- After a debug run passes, tap `Copy phone test` and validate it with `pbpaste | npm run verify:phone-report`.

If Codex is driving a browser, do not accept the camera/download permission prompt unless 성욱 has explicitly approved that exact action.

## HTTPS deploy checklist

Do not deploy silently. Deployment changes external state.

When 성욱 approves Vercel deployment, use this order:

```bash
npm run readiness
vercel
```

Record:

- deployed HTTPS URL
- deployment command result
- first desktop HTTPS load result
- first phone HTTPS load result

If `vercel` is not installed, ask before installing it.

## Real phone test checklist

Use the HTTPS URL, not local network HTTP.

Add `?debug=1` to the HTTPS URL if a phone test fails and you need visible state:

```text
https://.../?debug=1
```

iPhone Safari:

- HTTPS URL opens.
- Camera permission prompt appears.
- Permission accepted.
- Front camera preview renders.
- Default preset looks visibly damaged.
- At least one other preset visibly changes the preview.
- `Save PNG` opens a share/save path or creates a usable file.
- Saved/shared PNG opens and contains the degraded effect.
- In `?debug=1`, `file opened` and `effect visible` can both be checked.
- `Copy phone test` includes `acceptanceCandidate=yes` or `acceptanceGate=phone-pass-candidate`.

Android Chrome:

- HTTPS URL opens.
- Camera permission prompt appears.
- Permission accepted.
- Front camera preview renders.
- Default preset looks visibly damaged.
- At least one other preset visibly changes the preview.
- `Save PNG` opens share or download path.
- Saved/downloaded PNG opens and contains the degraded effect.
- In `?debug=1`, `file opened` and `effect visible` can both be checked.
- `Copy phone test` includes `acceptanceCandidate=yes` or `acceptanceGate=phone-pass-candidate`.

Record failures with:

- device model
- browser name/version if visible
- exact URL
- exact visible error/status text
- `cameraError` from the `?debug=1` state report
- `version` and `presets` from the copied report
- `shareCapability`, `video`, `viewport`, and `devicePixelRatio` from the copied report
- `userAgent`, `platform`, `maxTouchPoints`, `screen`, `orientation`, `language`, and `mobileCandidate` from the copied report
- `manualSavedFileOpened`, `manualSavedEffectVisible`, and `acceptanceCandidate` from the copied report
- copied `?debug=1` state report when available
- whether the issue was camera permission, preview render, preset switch, save/share, or file usability

## Minimum test pass

The project is ready for first external testing when:

1. Deployed HTTPS URL opens on phone.
2. Front camera permission appears.
3. Live preview renders.
4. At least one low-quality preset is applied.
5. Save/share button produces a usable PNG on phone.
6. `?debug=1` phone report can reach `acceptanceGate=phone-pass-candidate` after the saved image is opened and confirmed.
