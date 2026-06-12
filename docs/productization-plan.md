# TrashCam 2004 Productization Plan

## One-line

TrashCam 2004 is implemented as a local static camera MVP. Productization starts when the app has a stable HTTPS URL and proves this loop on real phones:

```text
Open public link -> allow camera -> funny live preview -> switch presets -> save/share usable PNG
```

## Current state

- Static Vite + TypeScript app is implemented.
- Camera, canvas render loop, preset switching, PNG save/share fallback, `?demo=1`, `?debug=1`, and `?save=prepare` exist.
- Public beta polish exists: Open Graph metadata, Privacy dialog, 12 presets, app version, and preset count diagnostics.
- Local synthetic verification passes.
- Actual product risk is still external-device behavior, not source code structure.

## Product success criteria

TrashCam becomes a public beta when all P0 items are true:

- A stable HTTPS URL exists.
- iPhone Safari opens the URL, requests camera permission, renders live preview, and saves or shares a usable PNG.
- Android Chrome opens the URL, requests camera permission, renders live preview, and saves or shares a usable PNG.
- `?debug=1` report can identify failures by version, preset count, browser, video size, viewport, camera state, and save state.
- Privacy copy is visible from the app and honestly states that camera frames stay in the browser.
- The app still works with no backend, no account, no upload, and no database.

## Non-goals for beta

- User accounts
- Server-side image upload
- Gallery/community feed
- AI image generation
- Native iOS/Android app
- Payments
- Full analytics suite
- Major visual redesign

## P0 - Ship a real beta URL

### 1. Freeze the beta candidate

Owner: Michael

Actions:

- Keep current preset set at 12 modes.
- Keep version at `0.1.0-beta.1` until first public URL passes phone tests.
- Run:

```bash
npm run build
npm run smoke
npm run readiness
```

Exit criteria:

- Build passes.
- Smoke passes.
- Readiness only reports known external gates.

### 2. Deploy to stable HTTPS

Owner: 성욱 + Michael

Recommended path: Vercel GitHub import.

Why:

- This repo is already pushed to GitHub.
- Vite static output is simple: build command `npm run build`, output directory `dist`.
- No environment variables are needed.

Actions:

- Import `souluk319/TrashCam2004` into Vercel.
- Use build command `npm run build`.
- Use output directory `dist`.
- Open deployed URL with `?debug=1`.
- Confirm debug panel shows `secure=true`, `version=0.1.0-beta.1`, `presets=12`.

Fallback path:

- Cloudflare Pages can also work with the same build command and output directory.
- Cloudflare Quick Tunnel is only for temporary testing, not a stable product URL.

Exit criteria:

- Public HTTPS URL returns the app.
- Camera API is available because the page is secure.
- Response headers from `vercel.json` are present.

### 3. Real desktop browser check

Owner: 성욱

Actions:

- Open deployed URL in desktop Chrome.
- Allow camera permission.
- Confirm live camera preview, not demo source.
- Switch at least these presets: `PC Bang Cam 2004`, `Pixel Art Cam`, `Cyberpunk Cam`, `Sticker Booth Cam`.
- Save PNG.
- Open the saved file and confirm it contains the effected image.

Exit criteria:

- Debug report says `source=camera`, `camera=ready`, and `save=downloaded` or `save=shared`.
- Saved PNG opens correctly.

## P0 - Real phone acceptance

### iPhone Safari

Actions:

- Open deployed HTTPS URL.
- Allow camera permission.
- Confirm preview starts within 5 seconds.
- Switch to `Pixel Art Cam`.
- Tap Save PNG.
- Confirm native share sheet or save/download fallback works.
- Open the resulting image from Photos/Files/share target.
- Repeat once with `Cyberpunk Cam`.

Pass:

- Camera opens.
- Preview updates.
- Saved image includes the active effect.
- No layout overlap blocks Save.

### Android Chrome

Actions:

- Open deployed HTTPS URL.
- Allow camera permission.
- Confirm preview starts within 5 seconds.
- Switch to `Pixel Art Cam`.
- Tap Save PNG.
- Confirm file download or share path works.
- Open the resulting image from Downloads/share target.
- Repeat once with `Voxel Block Cam`.

Pass:

- Camera opens.
- Preview updates.
- Saved image includes the active effect.
- No layout overlap blocks Save.

### Failure logging

If any phone check fails, open the same URL with `?debug=1`, tap `Copy state`, and record:

- Device and browser
- Exact URL
- Visible status/error
- Copied debug report
- Whether the failure is camera permission, camera playback, render, preset switch, save/share, or file usability

## P1 - Make it feel like a product

### 1. Preset pack navigation

Problem:

- 12 preset buttons are fun, but the control bar can feel crowded.

Recommended fix:

- Add pack tabs: `Trash`, `Future`, `Game`.
- Show only presets from the selected pack.
- Keep the first preset in each pack as the default when switching packs.

Exit criteria:

- Mobile controls feel calmer.
- No preset names wrap awkwardly.
- Existing preset data structure with `category` remains useful.

### 2. Capture review state

Problem:

- After save/share, the user has no in-app moment to enjoy the result.

Recommended fix:

- After tapping Save, briefly show a frozen capture preview state with `Share again` and `Back to camera`.
- Keep live camera running only if performance stays fine.

Exit criteria:

- User can see what was saved.
- Save/share errors remain recoverable.

### 3. Shareable brand polish

Actions:

- Add app icon and mobile home-screen metadata.
- Add a small footer link for privacy.
- Improve Open Graph image later, after real screenshots exist.

Exit criteria:

- Shared URL has correct title/description.
- App looks intentional when added to home screen.

## P2 - Public beta loop

### Tester batch

Target:

- 5 to 10 testers.
- Mixed devices: at least 2 iPhones and 2 Android phones.

Ask testers to send:

- Device/browser
- Favorite preset
- Whether save/share worked
- One saved PNG if they are comfortable sharing it
- Any debug report if broken

Decision rule:

- Fix P0 blockers immediately.
- Fix repeated P1 friction if 2 or more testers hit it.
- Defer new presets until save/share is boringly reliable.

## Recommended next action

Deploy from GitHub to Vercel first. No more mode expansion before this gate.

The next implementation loop should be:

```text
Vercel deploy -> desktop camera check -> iPhone test -> Android test -> fix only real failures
```
