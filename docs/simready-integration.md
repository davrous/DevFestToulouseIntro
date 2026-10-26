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
| Pastry reference | 27–31.5 s | A real croissant collectible accompanies the HTTP gag; chocolatine response at 29 s |
| Developer snack machine | Model: 51.18–87.6 s; caption: 61.35–65 s | Left side of the D's front wall; back surface aligned 0.02 units in front of the wall, with no yaw; no timed model pop-in |
| Cassoulet mountain | 124.4–134 s | 64 real beans-can models start exactly at the terminal's 4.80-GB completion; Havok cylinder collisions produce a pile. No power-up caption |
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
leaves it behind before David becomes the focal point. Only the caption has a
short visibility envelope. Its duration is separately configurable as
`animation.displayDuration` (3.45 s after the 61.55-s interaction), so extending
the physical presence does not extend the joke across David's card.

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

The cassoulet sequence uses 64 instances of the real converted can model,
with **cylinder** collision shapes, floor, actual corridor side walls and a
visible retaining basket. The existing Havok engine calculates the motion at
60 fixed steps per second before SYSTEM READY. Each pose is recorded, then all
temporary aggregates, shapes and collider nodes are disposed. Playback
interpolates those physical results; it does not fake the pile by independently
placing cans at arbitrary final positions. This makes collisions and the
resulting mountain exactly reproducible for pause, seek and restart, without
advancing the shared live physics world during this gag. Unit tests require a
pile higher than five world units and at least 24 cans resting above the first
layer, and ensure no can falls through the corridor floor.

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
  during the D-entry left turn, 60.5–69.5 s. It stays beside the camera lane.
  Its height is now 21.6 units, exactly three times its former 7.2 units,
  with its original clip preserved. Its lane is now straight inside cell
  (0,6), X=-563 to -559 and Z=46.5, with a little extra floor clearance.
  A restrained camera glance improves its framing before David's introduction.
  Validation measures every sampled skeletal pose and a rendered silhouette
  mask, including actual wall/seat occlusions, rather than accepting a
  projected bounding box that might be hidden behind the scenery.
  Attribution is recorded in
  [CREDITS.md](../CREDITS.md).
- The existing cinema astronaut is instantiated once in the corner after
  the buffer (`anchor = 121.75`, `lateral = -8`), facing the incoming viewer.
  It is not duplicated in the old space crossing. Between 116.2 and 118.4 s
  it grows uniformly from its normal 6.5-unit height to 10.4, with feet fixed
  on the floor. The adjacent **existing** progression gate at 122 s rises
  another 3.2 units on the same envelope. No separate arch is constructed.
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

The latest production build was exercised in headless Edge at **1920 × 1080**
with real MP3 playback through the tunnel passage, 78.5–94.2 s, plus scripted
checkpoints through the final 180-s hold. Startup to SYSTEM
READY took **4.87 s**, including both Havok recordings,
the animated T-800, glyph atlas, simulated terminal and physical tunnel.
The tunnel render pass and all new effects were off at the final hold.
The scripted walk through the entire timeline preserved the exact camera
positions, rotations and FOV with effects enabled or disabled. Repeated seeks
and replay did not accumulate meshes, transforms, materials or lights.

| Probe | NVIDIA effects | FPS | Median frame | 95th percentile | Draw calls |
| --- | --- | ---: | ---: | ---: | ---: |
| T-800 / Matrix wall, 63.25 s | Off | 60.00 | 16.7 ms | 17.0 ms | 327 |
| T-800 / Matrix wall, 63.25 s | On | 60.01 | 16.7 ms | 17.0 ms | 519 |
| Physical tunnel, 84 s | Off | 60.00 | 16.8 ms | 17.8 ms | 28 |
| Physical tunnel, 84 s | On | 59.99 | 16.7 ms | 17.8 ms | 28 |
| Physical room exit, 93.5 s | Off | 60.09 | 16.7 ms | 17.7 ms | 71 |
| Physical room exit, 93.5 s | On | 60.00 | 16.7 ms | 17.8 ms | 71 |

Here, On/Off toggles the NVIDIA additions. The T-800, physical tunnel,
water-buffer, astronaut and simulated terminal remain enabled in both cases.
The full report also retains the rush, right-turn, can-pile and launch probes.

These are measurements of that browser/machine, not a guarantee for every
projector or GPU. The inspector's nine-asset gallery, wireframe, bounding boxes
and vertex-normal controls were also exercised. Disabled mode made **no NVIDIA
asset requests**. There were **zero browser JavaScript/console errors and zero
external network requests**. Raw reproducible results are in
[simready-validation.json](simready-validation.json).

The latest browser probes also verify the revised 4.3–5.925-s entry shader,
the pre-existing HTTP panel with yaw 0 and the 29-s redirect, the accelerated lens
crossing at 80.45 s, the fully opaque launch arm before
the approach, the physical can mountain starting only at terminal completion, the
absence of both removed captions, and water/title activation only after the
33rd cube. Instanced-visibility warnings are treated as failures.

Browser probes additionally check matching violin/name opacity, a positive
Pong/voxel contact impulse and identical ball/debris replay, terminal completion
and first can at exactly 124.4 s, the initial reels/popcorn before the 80-s rush, the shared
GPU lens preview, full mural bounds, and uniform astronaut growth with exactly
24 existing arch instances. A pixel comparison with all scenery hidden proves
that the tunnel interior is opaque; repeating it during the exit verifies that
the opening reveals the real scene. This revision passes **56 focused
tests**, TypeScript checks and the production build. Browser probes additionally
require the tunnel pass to remain active at 94.199 s and stop at exactly
94.2 s, and verify the T-800's actual 21.6-unit height. A temporary rendered
silhouette mask measures **6.5 seconds of actual visibility**, including **4.5
seconds near the image axis**. Skeletal bounds remain clear of the corridor
walls, floor and ceiling, with at least **2.2 units** of camera clearance.
Alpha readback proves tube walls and room coexist during the exit; at 94 s
about 53% of the image still contains tunnel walls and 47% reveals the room.
Frame-to-frame RGB checks around the exit remain below 4.6% average change,
including removal of the transition at 94.2 s, with no intermediate metal shot.
During actual MP3 playback, **826 rendered frames**
verified all four varying FFT bands reached the tunnel material with **zero
routing error**. Their measured peak levels were 0.876 / 0.709 / 0.609 / 0.451.
The original Strudel composition keeps its musical lens/rest sections fixed;
retiming the visual rush does not accidentally rewrite its arrangement.
