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
| Retro Pong | 7–14.7 s | Ahead of the arcade camera; analytical bounces use measured Journey attacks; paddles/ball only, no caption |
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
  physical cubes keep the enlarged geometry when they fall at the unchanged
  22-s cue.
- `NpmCassouletTerminal` draws a simulated local shell with typing, cursor,
  progress bar and downloaded gigabytes. Uploads are capped at 10 Hz and all
  state is derived from show time. `CASSOULET_INSTALL.complete = 124.4` is also
  the exact start of the Havok can recording. No actual command runs and no
  packages or gigabytes are downloaded.
- The camera lens is about 3.4 route units behind David's card, crossed at
  76.8 s. Its measured Journey effect cue is 76.827 s. A precompiled
  `LensVortexTransition` adds cyan/violet spirals, moving depth rings, sparks
  and restrained refraction until 95.6 s. The center remains open and the
  cinema scene continues until 87.6 s, preserving reels and popcorn at their
  established times. Projector, digital entrance, total duration and final
  camera are unchanged.
- The existing cinema astronaut is instantiated once in the corner after
  the buffer (`anchor = 121.75`, `lateral = -8`), facing the incoming viewer.
  It is not duplicated in the old space crossing.
- `MatrixRainWall` uses a single 512×512 glyph atlas and a GPU rain shader,
  not per-frame canvas text drawing or an external texture/video. Its 30×32
  grid has independent column speeds and fading trails. Fragments of
  `DEVFESTTOULOUSE` occupy two staggered rows but retain normal trail
  brightness, avoiding a conspicuous headline. The surface is in front of
  the existing inset panels beside the snack machine. It inherits that
  machine's visibility and feature flag.

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

The production build was exercised in headless Edge at **1920 × 1080** with
the real MP3 for the complete **180-second** presentation. Startup to SYSTEM
READY took **3.70 s** in the latest run, including the Havok can-pile bake,
glyph atlas, simulated terminal and precompiled water/vortex shaders. All new effects were off at the final hold.
The scripted walk through the entire timeline preserved the exact camera
positions, rotations and FOV with effects enabled or disabled. Repeated seeks
and replay did not accumulate meshes, transforms, materials or lights.

| Probe | NVIDIA effects | FPS | Median frame | 95th percentile | Draw calls |
| --- | --- | ---: | ---: | ---: | ---: |
| Vending / Matrix wall, 61.8 s | Off | 60.04 | 16.7 ms | 17.7 ms | 296 |
| Vending / Matrix wall, 61.8 s | On | 59.97 | 16.6 ms | 18.1 ms | 488 |
| Lens vortex, 78.5 s | Off | 60.00 | 16.7 ms | 17.9 ms | 103 |
| Lens vortex, 78.5 s | On | 60.02 | 16.7 ms | 17.6 ms | 103 |
| Water overflow, 111 s | Off | 59.99 | 16.7 ms | 17.9 ms | 211 |
| Water overflow, 111 s | On | 60.00 | 16.7 ms | 17.7 ms | 301 |
| Astronaut / terminal, 118 s | Off | 60.00 | 16.8 ms | 17.8 ms | 67 |
| Astronaut / terminal, 118 s | On | 59.99 | 16.7 ms | 18.1 ms | 67 |
| Falling cans, 128 s | Off | 60.02 | 16.7 ms | 17.5 ms | 139 |
| Falling cans, 128 s | On | 60.02 | 16.7 ms | 17.7 ms | 387 |
| Launch support, 143.5 s | Off | 60.00 | 16.7 ms | 18.2 ms | 97 |
| Launch support, 143.5 s | On | 60.02 | 16.7 ms | 18.2 ms | 187 |

Here, On/Off toggles the NVIDIA additions. The core water-buffer, lens vortex,
astronaut and simulated terminal remain enabled in both cases.

These are measurements of that browser/machine, not a guarantee for every
projector or GPU. The inspector's nine-asset gallery, wireframe, bounding boxes
and vertex-normal controls were also exercised. Disabled mode made **no NVIDIA
asset requests**. There were **zero browser JavaScript/console errors and zero
external network requests**. Raw reproducible results are in
[simready-validation.json](simready-validation.json).

The latest browser probes also verify the revised 4.3–5.925-s entry shader,
the pre-existing HTTP panel with yaw 0 and the 29-s redirect, the closer lens
crossing immediately behind David, the fully opaque launch arm before
the approach, the physical can mountain starting only at terminal completion, the
absence of both removed captions, and water/title activation only after the
33rd cube. Instanced-visibility warnings are treated as failures.

The latest run additionally checks the matching violin/name opacity, terminal
completion and first can at exactly 124.4 s, preserved reels inside the vortex,
its disappearance before Eric, the real GPU Matrix shader, and the astronaut's
single relocated instance. **112 targeted tests** and the production build pass.
