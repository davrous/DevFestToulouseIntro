# Arcade screens and pinball attract mode

## Survey and preserved staging

Babylon.js **9.28.0**, the existing local Kenney GLBs, scene preparation,
shader warmup, audio transport, camera and 180-second duration are retained.
No cabinet is moved. GLBs and their palette materials are unchanged.

| Cabinet | Existing model | New activity | Approximate camera window |
| --- | --- | --- | --- |
| 0, first left | `arcade-machine.glb` | Pong, initial offset 4.2 s | 0–2.5 s |
| 1, first right | `dance-machine.glb` | Super Mario Bros., offset 1.3 s | 0–3.5 s |
| 2, middle left | `pinball.glb` | Featured pinball, three-ball multiball, AI4FUN high score | Best around 7–14 s |
| 3, middle right | `arcade-machine.glb` | Original Donkey Kong arcade footage, offset 2.7 s | Best around 7–14 s |
| 4, rear left | `dance-machine.glb` | Super Mario Bros., offset 5.1 s | Best around 15–21 s |
| 5, rear right | `pinball.glb` | Single-ball attract sequence, independent phase offset 5.6 s | Best around 15–21 s |

Windows were measured with the existing camera, not invented from musical
timestamps. Distant machines are in the frustum from the beginning, but the
opening title, nearer cabinets and the camera's angle limit readability.
The featured machine launches around 3.65–4.2 s, strikes its flippers around
7.15 and 9.2 s, announces multiball at 10 s, has three visible balls around
11.3 s, and shows HIGH SCORE / AI4FUN around 12–14 s. It already has activity
from the previous attract cycle at time zero. These timings use **camera /
master time**, not the locally warped Journey effects clock.

### Geometry, UVs and overlays

Each cabinet body is a single mesh / single primitive using a shared palette
texture (`colormap`), not separate screen materials. The dance platform rail
is a child mesh; it is not a monitor. Pinball has a separate inclined glass
mesh named `(%ignore)`, but its bumpers, static flippers, floor and score slot
are baked into the body.

Measured model-local screen boundaries:

| Model | Width | Bottom/top Y | Bottom/top Z | Physical aspect |
| --- | ---: | --- | --- | ---: |
| Arcade | 0.300 | 0.3316 / 0.5092 | 0.1180 / 0.0588 | 1.603 |
| Dance | 0.600 | 0.3500 / 0.6007 | -0.2957 / -0.2957 | 2.393 |

`ArcadeScreenController` fits four inset vertices to these planes, offsets
them by 0.0008 model units, and parents them to the actual imported body.
It does not overwrite palette UVs or cabinet artwork. GLTF loader conversion
quaternions are retained. The screen UVs are deliberately oriented from the
model's +Z-facing side. Babylon's video upload has the opposite Y-inversion
convention to image upload: the video uses `invertY=false`, PNG fallback uses
`invertY=true`. Both have been checked from the cinematic camera.

**There are no portrait cabinets.** Donkey Kong is pillarboxed inside the
middle arcade monitor instead of stretching it or altering the cabinet.
Pong and Mario also retain their source aspect ratios. The light local CRT
shader adds 0.8% curvature, 7% scanline modulation, very small flicker and
edge shading. It never postprocesses the rest of the scene.

The pinball overlay is an original printed board, three low-poly chrome
balls, three bumper caps/rings, insert lamps, two mechanically pivoted
flippers, a plunger rod and a fitted dot-matrix score slot. It covers the
unmovable baked playfield ornaments; the original body/glass remain intact
and reappear unchanged when the feature is disabled. The original model's
internal floor is flat; the overlay follows the **1:6 inclined glass plane**
with clearance for ball diameter 0.018 model units. Its basis, bumper
coordinates and flipper pivots are in [pinballState.ts](../src/scene/arcade/pinballState.ts).
There are no separate ramps or simulated rail mechanisms to animate.

## Media preparation and rights

```sh
# Requires ffmpeg and ffprobe: macOS `brew install ffmpeg`;
# Windows `winget install Gyan.FFmpeg`; Debian/Ubuntu `apt install ffmpeg`.
npm run arcade:prepare
# Rebuild using cached source GIFs without Internet:
npm run arcade:prepare -- --offline --force
```

The exact three supplied GIF URLs are downloaded at development time. The
script verifies animation, hashes, dimensions and frame counts, writes
H.264 Baseline / YUV420P / 20-fps / silent MP4s and decoded PNG posters,
and fully decodes the outputs before publishing them. Sources and HTTP cache
metadata stay in ignored `assets/arcade/source/`, outside the production
bundle. Unchanged media is not downloaded/re-encoded unnecessarily.
Failures reject preparation rather than recording broken media as ready.

Runtime files are in [public/assets/arcade](../public/assets/arcade/).
The [manifest](../public/assets/arcade/manifest.json) records exact URLs,
source and output hashes, dimensions, frames, duration, transformations and
rights. There are no runtime Tenor / Wikimedia requests and no substitutions.
The requested Pong source is a filmed CRT, not a clean game framebuffer;
monochrome preparation cannot remove its original perspective.

Pong's GIF is attributed under CC BY 3.0. **The two supplied Tenor links do
not provide an explicit redistribution license for Nintendo footage.**
Local technical integration is not rights clearance; obtain permission or
appropriately licensed footage before public distribution. See the
[license record](../public/licenses/arcade-media.txt) and [credits](../CREDITS.md).

## Loading and transport

`DevFestScene.prepare()` loads all media and posters, seeks to independent
initial offsets and uploads decoded frames before SYSTEM READY. Four small
decoders cover four monitors; the two Mario monitors deliberately use
different phases. Matching game/offset resources can be shared. No new
decoder, mesh, light or material is created during ordinary playback.
Shader compilation and real render warmup include the arcade and multiball.
The final loading barrier also waits for warmup's asynchronous seeks.

The existing master clock determines `(time + offset) modulo duration`.
Native muted video playback follows `timeline.speed`; seeks are corrected
only on transport changes or drift above 220 ms (35 ms when paused or
explicitly seeking). In-flight seeks coalesce to the latest target.
Video frames upload on decoder frame callbacks, not every rendered frame.
After the cabinet section (49 s by default), all video decoders pause.
Returning to the arcade resynchronizes them. Page hide and scene disposal
pause media; disposal releases textures, callbacks and video sources.

HTML video cannot guarantee frame-exact export. There is no frame-sequence
export mode in this intro, so none was added. Pinball is exactly reproducible:
piecewise authored ball trajectories determine the matching bumper pulses,
scores, flipper strikes and multiball releases. Hidden balls travel through
the shooter/drain apron, not through visible mid-playfield spawn points.
This adds no Havok bodies, worlds, audio or independent animation timer.

If video playback fails during the show, its loaded game poster is retained,
the error is logged and a persistent presentation notice is displayed.
Resume/explicit seek can retry playback. Initial loading/decode failures
prevent a false SYSTEM READY status.

## Rehearsal controls

Press **D**, then expand **ARCADE / GAMES + PINBALL**:

- Independent `enableArcadeVideoScreens`, `enablePinballAttractMode`,
  `enablePinballMultiball`, `enableArcadeCrtEffect` flags.
- Game and start offset per cabinet; reassignment pauses the show, prepares
  the new local resource, then disposes unused media.
- Brightness, scanlines, active-section/always video policy and end time.
- Pinball start/cycle/speed, machine phase offsets, flipper angle/stroke,
  bumper intensity, score increment and multiball activation.
- Jump/replay arcade, each monitor's existing-camera preview, pinball
  selection/replay and multiball preview.
- Trajectory lines, flipper pivot markers, screen bounding/UV extents,
  decoded-video status, seek count and master time.

Debug geometry is disabled by default and cleared when diagnostics close.
Controls resolve the current world, including after graphics recovery.
For console rehearsal:

```js
devfest.seek(1);      // Pong and first Mario
devfest.seek(11.3);   // Donkey Kong and three-ball pinball
devfest.seek(12.3);   // HIGH SCORE / AI4FUN
devfest.seek(18.3);   // Rear Mario and background pinball
devfest.togglePlayback();
```

## Validation and evidence

```sh
npm test -- src/scene/arcade/arcade.test.ts src/engine/App.test.ts src/scene/PixelWorld.test.ts src/scene/StageReadability.test.ts
npm run verify:arcade
npm run verify:offline
```

The browser check uses a fresh production context, blocks third-party origins,
requires all three videos/posters before ready, tests normal muted playback
without an autoplay-policy override, deterministic replay against actual
soundtrack playback, pause/seek/rewind/restart and half speed. It checks all
flags and stable mesh/material/texture/light/body counts after repeated seeks.
It also hides each steel ball independently and compares rendered pixels to
prove that all three really contribute to the cinematic frame, exercises game
reassignment/resource sharing and disposal, and checks diagnostics cleanup.
Unit tests sample ball/bumper, ball/ball and glass clearance at 120 Hz and
ensure draining extra balls never takes points away from the score.

The [machine-readable report](arcade-validation.json) records 1080p and 1440p
frame-time comparisons with the enhancements enabled/disabled, decoder
counts, loading time, media hashes, errors and offline requests.
The measured rehearsal sustained approximately 60 FPS at both resolutions,
with and without these enhancements, using 120-frame samples per condition.
Headless results are machine-specific; rehearse at the actual projector
resolution/GPU before the event. Screenshots in [arcade/](arcade/) use only
the existing cinematic camera, not an easier authoring camera.

## Changed-file map

- New runtime modules in [src/scene/arcade/](../src/scene/arcade/):
  [configuration](../src/scene/arcade/config.ts),
  [media lifecycle/clock](../src/scene/arcade/ArcadeMediaManager.ts),
  [fitted screens/CRT shader](../src/scene/arcade/ArcadeScreenController.ts),
  [pure pinball choreography](../src/scene/arcade/pinballState.ts),
  [pinball geometry/controller](../src/scene/arcade/PinballAttractController.ts),
  [orchestration](../src/scene/arcade/ArcadeSceneEnhancements.ts) and
  [focused tests](../src/scene/arcade/arcade.test.ts).
- New [ArcadeDebug.ts](../src/debug/ArcadeDebug.ts), wired into
  [DebugPanel.ts](../src/debug/DebugPanel.ts).
- [ArcadeCathedral.ts](../src/scene/ArcadeCathedral.ts) exposes the existing
  machine references; [DevFestScene.ts](../src/scene/DevFestScene.ts) prepares,
  warms and updates the enhancements.
  [App.ts](../src/engine/App.ts) forwards playback/seek state, immediately
  pauses decoders on transport/backgrounding and reports media failures.
  [App.test.ts](../src/engine/App.test.ts) tests that transport integration.
- New [preparation](../scripts/prepare-arcade-media.mjs) and
  [browser verification](../scripts/verify-arcade.mjs) scripts, with commands
  in [package.json](../package.json). No new dependencies.
- Three MP4s, three PNG posters and a manifest in
  [public/assets/arcade/](../public/assets/arcade/), plus the
  [license record](../public/licenses/arcade-media.txt). Source GIFs/cache are
  excluded through [.gitignore](../.gitignore).
- This guide, six [rendered captures](arcade/),
  [arcade validation](arcade-validation.json) and refreshed
  [whole-show offline validation](offline-validation.json).
  [README](../README.md), [credits](../CREDITS.md) and
  [handoff context](../AGENT_CONTEXT.md) are updated.
