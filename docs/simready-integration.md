# SimReady integration

## Existing architecture and constraints

The baseline is Vite 7, TypeScript 5.9 and Babylon.js 9. The entry point is
`src/main.ts`; `App` owns the existing 180-second `Timeline`, audio transport,
pause/seek controls and loading screen. `DevFestScene` owns one scene, the
cinematic camera, the rendering pipeline and the existing Havok instance.
No camera, music, television or speaker-card changes are needed.

`cameraPose` and `routeAnchor` in `src/camera/CameraPath.ts` are the source of
truth for framing. Positions are in the X/Z plane, Y is vertical. Camera
motion is independent of audio. The optional Journey profile only makes
small local adjustments to effect time. New animations must be pure functions
of that existing effect clock, not wall-clock timers or uncontrolled physics.

The cinema CRT installation is anchored at route time 58, with its final
supports at local Z = 28. David's premiere screen is anchored at route time
76; his introduction starts at 66, and camera attention begins earlier.
The vending gag must be framed in the passage after the final CRT supports
and must finish before David's introduction. Its exact transform and visible
interval are validated against the actual camera and scene geometry.

Existing `CinemaAssets` preloads local GLBs, caches templates and normalizes
clones under parent transforms. The new SimReady layer follows that pattern,
with a shared registry, preload cache, independent flags and disposal.
`DebugPanel` is hidden in presentation mode and is the integration point for
rehearsal/configuration controls. The asset viewer must reuse the current
Vite/Babylon application rather than introduce another framework.

## Source pipeline

The nine exact NVIDIA package identifiers are recorded in
`assets/simready/assets.json`, pinned to a resolved Hugging Face revision.
Only those folders are downloaded. Original USDs and intermediate files stay
outside `public/` and are ignored by Git. Runtime GLBs, previews, license files
and their generated manifest live under `public/assets/simready/`.

Every package license is checked independently before downloading its render
dependencies. Source hierarchy, payloads and texture paths are preserved.
The conversion pipeline must report missing dependencies/material limitations
explicitly; a primitive replacement is not a successful NVIDIA conversion.

Blender is run headlessly in an isolated process, never by resetting a user's
open Blender scene. Detection supports an explicit executable path. Model
geometry, UVs, textures and useful hierarchy are preserved; render geometry
is separated from simulation proxies. Self-contained GLBs are inspected and
validated before integration.

## Current artistic direction

The nine assets remain available in the inspection library. Following the
updated direction, the donut, small mobile robot and forklift collision are
**not instantiated or loaded by the presentation**. The robotic arm has moved
beside the existing rocket instead of participating in a collision.

| Moment | Effect-time window | Placement / interaction |
| --- | --- | --- |
| Retro Pong | 17.4–23.5 s | Beside Anne-Flore; measured Journey attacks drive the rally, then the final ball physically hits the voxel violin near 22 s; no caption |
| Pastry reference | 27–31.5 s | A real croissant collectible accompanies the HTTP gag; chocolatine text switches at exactly 28 s on the camera clock |
| Developer snack machine | Model and 404 board: 51.18–87.6 s | Left side of the D's front wall; model and caption are already opaque during approach; only its light/snack interaction is timed |
| Cassoulet rescue | Robot: 119.5–134 s; cans: 124.4–134 s | The T-800 approaches beyond the centered terminal. At 4.80 GB, 64 real cans drop from height 28; twelve genuine hits dissolve it into 192 original red rose petals |
| Launch support arm | Model: 95–159 s; motion: from 139.5 s | Seven units beside the existing rocket, already present during approach, supporting it then withdrawing at its unchanged 144.6-s launch cue |

The vending machine's world X comes from the left third of cell `(2, 6)`.
The wall face is `cell.z + CELL/2 - 0.75`. Its actual imported GLB bounds
determine the back-surface offset, rather than guessing the model depth.
The original USD contains separate springs, doors and a collection lid but
no individually modeled snacks; the dropped pastry is the real NVIDIA
croissant, not an invented substitute model. Only
`404: HEALTHY SNACK NOT FOUND` is displayed. The lighting flickers briefly
and the pastry drops with a deterministic, bounded landing bounce.
The model, its materials and textures are preloaded and compiled before SYSTEM
READY. Its physical geometry is fully opaque from the cinema's first frame,
like the existing TV and seat scenery; it does not fade or switch on at the
interaction time. The camera naturally reveals it during the approach and
leaves it behind before David becomes the focal point. The 404 board is also
preloaded and stays at opacity 1 for the same physical presence window; it no
longer flashes on at the interaction. The obsolete `displayDuration` control
has been removed. Caption visibility follows the machine's start/end settings.

The BUFFER OVERFLOW is now a transparent capacity tank on the right of the
approach, anchored near route time 116 but with fixed yaw **pi**, making its
front perpendicular to the right wall rather than following the spline's
bend. From 107 s, 32 cubes fill fixed slots in the same tank. One additional
orange cube drops onto the full tank at the measured 110.7-s attack. Only
after that arrival does the caption appear, alongside a displaced water wave
and a flowing overflow curtain. The caption clears at 114.3 s. Cube positions,
water height, ripples and spill envelopes are absolute-time driven and fully
seekable; the water is a lightweight shader effect, not an expensive fluid
simulation. The ordinary fill cubes remain inside the tank after the extra
cube arrives.

The cassoulet sequence uses 64 real can models and cylinder colliders, the
actual corridor floor/walls, a temporary humanoid capsule and 192 lightweight
petal proxies.
The old basket is removed so the advancing robot cannot clip through it.
Havok calculates the entire interaction at 60 fixed steps per second before
SYSTEM READY, then disposes all temporary aggregates and nodes.
The first genuine can contact releases the animated capsule into dynamic
motion and freezes the supplied walk pose. Distinct positive-impulse contacts
drive a PBR disintegration shader; the twelfth contact releases the petals.
Recorded body, can and petal poses replay exactly on seek, with no extra
live physics world. Preparation fails if the barrage misses or cannot destroy
the target; there is no timed-kill fallback. The remaining cans form an open
colliding heap rather than the former contained mountain.

The arm uses the four actual shoulder transforms from the imported hierarchy,
reparented under a non-destructive shoulder pivot. Its base stays beside the
pad while the upper assembly reaches toward the rocket and retracts before
the airframe rises. The rocket model, launch, ceiling impact, camera attention
and music are unchanged.
Like the rocket, its physical geometry is fully visible from the digital
entry at 95 s, rather than being faded in when the camera approaches at 139.5 s.
Only the articulation is timed to the launch preparation.

## Later cinematic refinements

- The opening violin and bow are 25% larger. Their material alpha follows the
  same `speakerReveal` envelope as Anne-Flore's name, starting at 17.25 s rather
  than abruptly appearing at 19 s. The glow pass respects that alpha; the
  physical cubes keep the enlarged geometry when struck by the final Pong ball.
  `ViolinPongImpact` records a real Havok sphere/voxel contact at about 21.98 s
  and only then enables gravity on the violin. The ball and all voxel poses
  share the same 60-Hz recording. A missed shot fails preparation explicitly;
  there is no timer that silently substitutes a collapse.
- `NpmCassouletTerminal` draws a simulated local shell with typing, cursor,
  progress bar and downloaded gigabytes. Uploads are capped at 10 Hz and all
  state is derived from show time. `CASSOULET_INSTALL.complete = 124.4` is also
  the exact start of the Havok can recording. No actual command runs and no
  packages or gigabytes are downloaded.
- The T exit is a four-panel mechanical XOR CPU gate, not a curtain. Its
  activation follows a progressive physical circuit from the 38.2-s wall
  impact. Opening starts at the retained 42.6-s cue and finishes at 45.7 s,
  before the unchanged crossing near 46.03 s. See
  [the dedicated integration report](legacy-xor-integration.md).
- The opening sign and its scanline overlay are vertically centered on the
  camera's 5.925-s crossing. At exactly 59.2 s, `CrtLightningTransition` adds
  one strong decaying lightning pulse and switches all eight preloaded CRTs
  to `AI UPDATE / 99%`, a 42-year ETA and a cassoulet fallback joke. Both use
  camera time directly, not a beat-shifted clock.
- At exactly 80 s the camera accelerates after the initial popcorn cascade,
  crossing the lens at 80.45 s while retaining its spatial anchor at 86.3.
  `PhysicalTunnel` now renders a real continuous, ribbed 3D tube with an
  arc-length-driven camera, rising/falling serpentine bends, banking and a
  final physical 90-degree right turn. Its isolated layer/render target stays
  in the existing Babylon scene, shared with the coaxial radius-6.66 preview
  disc. The four speaker paths react to actual FFT bands: 40–180, 180–700,
  700–2400 and 4000–14000 Hz, controlling glow, width and waviness.
  The former metallic iris is removed. The tube now has a real open end at
  the camera's exact 94.2-s destination. Its antialiased transparent render
  target composites the real D only through this opening, preserving the
  tunnel walls around the room throughout the approach. The D is prepared
  at 90 s, and its exit gaze points into the corridor rather than into a wall.
  The extra render pass is
  removed at 94.2 s. The local camera rush intentionally changes only 80–94.2 s;
  the surrounding route, MP3, 180-s duration and final reveal are unchanged.
  The flight is now about 23% slower, with vertical travel reduced from 50
  to 22 units and banking limited to about 13 degrees. Analytically integrated
  measured Journey kick attacks gently modulate speed, normalized to preserve
  the exact exit deadline. Surface shaders, ribs, palette and FFT trails are
  unchanged; only the terminal geometry and composition change.
- The user-supplied, CC-BY-4.0 T-800 is part of the existing cinema asset loader,
  not the nine-model NVIDIA registry. Its original `The Chase` skeletal clip
  is sampled by absolute timeline time while it advances toward the viewer
  after the npm terminal from 119.5 s. It advances straight toward the camera
  before the installed cassoulet delivers the measured rescue impacts.
  Its height is now 21.6 units, exactly three times its former 7.2 units,
  with its original clip preserved. Its new lane is centered at X=-448 on
  the east corridor, approaching the barrage at Z=126.
  The terminal is centered and raised enough to leave the robot visible below;
  the original 119.1-s camera framing is retained independently of the astronaut. The suspended core/rings
  contract to clear the can-drop column.
  Validation measures every sampled skeletal pose and a rendered silhouette
  mask, including actual wall/seat occlusions, rather than accepting a
  projected bounding box that might be hidden behind the scenery.
  Attribution is recorded in
  [CREDITS.md](../CREDITS.md).
- `CassouletPowerPoster` adds the manga punchline **The Power Of Cassoulet!**
  on the west wall of D cell (3, 5), facing the post-Mitsuru right turn,
  before rocket liftoff at 144.6 s. The original canvas illustration
  features a muscular superhero can, wooden spoon, halftones, speed lines,
  `K.O.!`, `4.80 GB OF PURE POWER` and a Toulouse-terroir victory footer.
  A ridiculous defeated T-800 has red X eyes, a tin-can helmet and a white
  surrender flag. The fixed board becomes available at destruction +0.35 s;
  it does not pop in, billboard or replace the frame. Camera attention eases
  across 136.5–144.4 s, preserving liftoff and the later Orbital Link.
  Artwork is preloaded once and excluded from glow to retain printed detail;
  no extra image/font requests or wall-clock timers are used. The rescue flag
  also disables the poster.
- The original T-800's PBR chrome receives a cool frontal key and red rim,
  scoped exclusively to its geometry. Both shadowless lights follow the body
  and switch off on destruction or feature disable. Its lit material variants
  are precompiled during loading; the terminal and cans are not relit.
- The single existing astronaut is now behind Orbital Toulouse Link, using
  its 153-s anchor, depth 25 and lateral 11, set back another three units
  from the satellite. It is staged from 143 to 166 s,
  already **16.64 units high**, with no growth or extra duplicate. The old
  buffer-corner instance is gone. The existing 122-s data arch keeps its
  previous 3.2-unit lift, independently of the astronaut.
- `MatrixRainWall` uses a single 512×512 glyph atlas and a GPU rain shader,
  not per-frame canvas text drawing or an external texture/video. Its 88×42
  grid has independent column speeds and fading trails. Larger, brighter
  `DEVFEST` and `TOULOUSE` rows remain legible among the rain. A single
  continuous plane covers the wall behind the machine from the black strip
  at X=-532 to the right wall edge at X=-462.75, Y=0.05–32.85.
  It sits in front of the existing inset panels and inherits the machine's
  visibility and feature flag.

New motion is absolute-time driven, either analytical or sampled from the
fixed-step Havok bake. No additional physics engine, persistent live rigid
bodies, wall-clock animation timers or sound effects are added.

### Rose-petal rendering research

The reviewed native approaches were Babylon.js
[thin instances](https://doc.babylonjs.com/features/featuresDeepDive/mesh/copies/thinInstances)
and [ShaderMaterial](https://doc.babylonjs.com/features/featuresDeepDive/materials/shaders/shaderMaterial).
A small original curved mesh plus a double-sided crimson shader avoids another
download, texture dependency or per-petal JavaScript render object.
The 192 petals share geometry and use stable per-instance seeds; GPU flutter
is driven by show time. Lightweight Havok proxies use drag, reduced effective
gravity and deterministic wind, all recorded during preparation. Replay checks
compare only visible state, not stale matrix buffers of disabled particles.
This is an original red-petal visual treatment, not extracted game artwork.
Materials and geometries are cached and shared between geometry-sharing clones,
so per-object fades work without Babylon's unsupported `InstancedMesh.visibility`
changes. New material
variants are compiled at their interaction poses before SYSTEM READY.

## Configuration and inspection

Defaults and placement are in `src/simready/config.ts`. The independent flags
are `enablePongGag`, `enableToulouseEasterEggs`,
`enableSnackVendingMachine` and `enableLaunchArm`, plus a global `enabled`.
Press **D**, expand **NVIDIA SIMREADY / CONFIGURATION**, then select a
moment to edit its XYZ position, XYZ rotation (radians), scale, start/end,
interaction time, duration, bounce and flicker. **PREVIEW / REPLAY GAG**
jumps to that moment. These rehearsal edits are in-memory; persist artistic
defaults in the configuration module.

Open `/?asset-viewer=simready` for the same application's local inspection
mode. It supports all-nine gallery mode, individual selection, orbit, scale,
wireframe, bounding boxes, vertex normals, conversion warnings, dimensions,
texture/material counts and provenance. It does not use an external renderer
or CDN.

Open `/?simready=0` to compare the original intro with all NVIDIA effects
disabled and without preloading their GLBs.

## Reproduction commands

Requires Node 22.12+, Python 3.10+ and Blender 4.5 LTS. Blender is detected
on PATH or at the standard macOS application path; otherwise pass
`--blender` explicitly or set `BLENDER_PATH`.

```sh
python3 -m venv .venv-simready
.venv-simready/bin/python -m pip install -r scripts/requirements-simready.txt
.venv-simready/bin/python scripts/download_simready.py
.venv-simready/bin/python scripts/convert_simready.py --blender /path/to/blender
npm run simready:validate
npm run verify:simready
# Include a real three-minute playback with the MP3:
SIMREADY_FULL_SHOW=1 npm run verify:simready
npm run dev
# http://127.0.0.1:5173/
# http://127.0.0.1:5173/?asset-viewer=simready
# http://127.0.0.1:5173/?simready=0
```

Downloads and conversions are cached. `--asset snackVendingMachine` restricts
either script to a single friendly ID. `--force` regenerates conversions.
Textures are capped at 1024 pixels, except the arm's explicit 512-pixel recipe.
Dense meshes receive runtime-only reduction; the source USDs remain intact.
The converter reimports each exported GLB and records checksum, dimensions,
mesh/material/texture counts and warnings. The official Khronos validator
checks all nine self-contained files. See
[attribution](simready-attribution.md) and
[conversion report](simready-conversion-report.md).

## Validation

Required checks include source/revision/license provenance, GLB structure and
materials, camera clearance and framing, deterministic pause/seek/replay,
independent disabling of each gag, asset-viewer inspection, build/tests and
normal-playback browser performance. Conversion and attribution reports record
the actual results, including limitations rather than success-shaped fallbacks.

Explicit tangents are omitted because several source faces produced zero-length
tangents during export. UVs, normals and normal textures are retained; Babylon's
standard derivative-based normal mapping is used. Khronos reports this as a
portability warning, not an invalid GLB. Thin glass is converted to low-cost
alpha-blended PBR instead of adding expensive transmission render targets.

### Measured production validation

Production checks use headless Edge at **1920 × 1080**. A preceding run covered
the full **180-second** presentation. The manga revision's focused playback
checks exercise both the tunnel (78.5–94.2 s) and the pre-launch wall comic
(136–145 s), with scripted rescue/replay checkpoints through the final hold. Startup to SYSTEM
READY took approximately **6 s**, including both Havok recordings,
the animated T-800, glyph atlas, simulated terminal and physical tunnel.
The tunnel render pass and temporary rescue effects were off at the final hold;
the static poster stays on its interior wall.
The scripted walk through the entire timeline preserved the exact camera
positions, rotations and FOV with effects enabled or disabled. Repeated seeks
and replay did not accumulate meshes, transforms, materials or lights.

| Probe | NVIDIA effects | FPS | Median frame | 95th percentile | Draw calls |
| --- | --- | ---: | ---: | ---: | ---: |
| T exit | — | See [Legacy/XOR measurements](legacy-xor/validation.json) | — | — | — |
| CRT lightning, 59.2 s | On | 60.03 | 16.6 ms | 18.1 ms | 520 |
| Centered terminal / lit robot, 121.5 s | On | 59.99 | 16.7 ms | 17.7 ms | 231 |
| Measured impacts, 125.8 s | On | 60.03 | 16.7 ms | 17.9 ms | 345 |
| Red rose petals, 127.2 s | On | 60.01 | 16.7 ms | 17.7 ms | 378 |
| Pre-launch manga wall, 140.5 s | On | 60.01 | 16.7 ms | 17.4 ms | 176 |

The full report retains both On/Off measurements. Off disables the NVIDIA
additions, including the paired robot/can rescue. The XOR gate, CRT lightning,
physical tunnel, water-buffer, astronaut and terminal remain enabled.

These are measurements of that browser/machine, not a guarantee for every
projector or GPU. The inspector's nine-asset gallery, wireframe, bounding boxes
and vertex-normal controls were also exercised. Disabled mode made **no NVIDIA
asset requests**. There were **zero browser JavaScript/console errors and zero
external network requests**. Raw reproducible results are in
[simready-validation.json](simready-validation.json).

The latest browser probes also verify the revised 4.3–5.925-s entry shader,
the pre-existing HTTP panel with yaw 0 and the exact 28-s redirect, the accelerated lens
crossing at 80.45 s, the fully opaque launch arm before
the approach, the physical can rescue starting only at terminal completion, the
absence of both removed captions, and water/title activation only after the
33rd cube. Instanced-visibility warnings are treated as failures.

Browser probes additionally check matching violin/name opacity, a positive
Pong/voxel contact impulse and identical ball/debris replay, terminal completion
and first can at exactly 124.4 s, the initial reels/popcorn before the 80-s rush, the shared
GPU lens preview, full mural bounds, fixed-size final astronaut and exactly
24 preserved arch instances. A pixel comparison with all scenery hidden proves
that the tunnel interior is opaque; repeating it during the exit verifies that
the opening reveals the real scene. This revision passes the complete
test suite, TypeScript checks and the production build. Browser probes additionally
require the tunnel pass to remain active at 94.199 s and stop at exactly
94.2 s, and verify the T-800's actual 21.6-unit height. A temporary rendered
silhouette mask measures **5.75 seconds of actual visibility**, including **5.5
seconds near the image axis**. Skeletal bounds remain clear of the corridor
walls, floor and ceiling. The first real can hit occurs at **125.2 s**;
twelve distinct positive-impulse contacts trigger the 192-petal release at
**126.25 s**. Model, can and visible-petal replay states are identical after
rewind. Disabled particle buffers are intentionally excluded from comparisons.
The wall comic is checked during actual MP3 playback after Mitsuru and before
144.6 s. Whole-quad projection and an occlusion-aware GPU mask require at least
four seconds of readability; color readback rejects a blank or washed-out board.
Its mounting transform remains fixed on the real pre-launch wall, and no
fullscreen manga postprocess is allowed. Original robot pixels are also
compared with its dedicated lights on/off, requiring a measurable chrome
brightness improvement and actor-only light scope. Latest measurements are
recorded in [simready-validation.json](simready-validation.json).
Alpha readback proves tube walls and room coexist during the exit; at 94 s
about 53% of the image still contains tunnel walls and 47% reveals the room.
Frame-to-frame RGB checks around the exit remain below 4.6% average change,
including removal of the transition at 94.2 s, with no intermediate metal shot.
During actual MP3 playback, **824 rendered frames**
verified all four varying FFT bands reached the tunnel material with **zero
routing error**. Their measured peak levels were 0.877 / 0.716 / 0.610 / 0.434.
The original Strudel composition keeps its musical lens/rest sections fixed;
retiming the visual rush does not accidentally rewrite its arrangement.
