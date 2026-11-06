# Legacy Code → XOR CPU gate

## Architecture and measured constraints

The supplied Markdown brief and all three PNG references were read before
implementation. Their art is not used as a runtime texture.

- Babylon.js 9.28, TypeScript, Vite; the existing ACES/image-processing,
  bloom/glow, blue-hour ambient, directional light and camera bounce remain.
  Units are the existing 28-unit letter modules, height 34, roof underside 32.85.
  Existing `BoxBatch`, `emissive`, `createWorldText` and Havok bake utilities
  are reused. No new dependency, shadow map, music or camera keyframe.
- The legacy wall has **48 boxes, 8 × 6**, size **2.65 × 3.35 × 2.15**,
  spacing **2.75 × 3.45**. Its original `routeAnchor(40)` is approximately
  **(-554.4, 11.848, -41.4624)**, yaw **1.5190026901**. The box centers retain
  their original authored heights, starting at 1.75.
- Existing destruction cue: **38.2 s** on the existing effect clock.
  The former **41.2-s** disappearance is removed: fragments remain present
  for the rest of the show and leave view only through normal framing/occlusion.
  The camera has no Havok body: the previous
  implementation released the wall with authored impulses at that cue, before
  the camera crossed the wall plane around 40 s. This choreography is retained,
  not misrepresented as a newly measured camera/body contact.
- Existing body parameters: mass 1.6, friction .55, restitution .32;
  original world-space linear/angular velocities are retained. The floor is
  at (-560, -.25, -65), extents (125, .5, 145); the two yawed rails are at
  ±12.8 from the wall anchor, extents (.5, 24, 25).
- The actual T exit is the east-facing opening of cell (1, 9), at
  **X=-518, Z=-42** (the brief's “upper-left” is pictorial, not a reason to
  move the exit). It spans 28 units; the previous curtain used a 26.4-unit
  width and 32.1-unit height, opening from 42.6 to 46.6 s.
- Unmodified camera samples put the crossing at approximately **46.03 s**,
  position (-518, 11, -42), FOV approximately .991 radians. At 44 s it is at
  (-532, 11, -42). The gate must clear this trajectory and its near plane
  before crossing, not disappear to make the test pass.
- The global duration remains **180 s**. Existing musical effect-time
  adjustment is reused unchanged. All new transforms depend on absolute
  timeline time; debug/rehearsal controls use the existing application seek,
  pause and playback APIs.

## Implemented sequence

| Beat | Effect-clock window | Implementation |
| --- | --- | --- |
| Assemble | 34.7–36.81 s | Twelve fixed L/J groups, four original cubes each; 110-ms stagger, 900-ms eased arrival from left, right, above and depth |
| Lock / fail | 36.81–38.2 s | Crisp final snap, brief emissive lock pulse, exact original box homes; `BUILD FAILED` and `// TODO: remove this wall` are printed on the wall |
| Break / settle | 38.2–46.2 s, then static debris | Original canonical impulses, gravity and Havok collisions; small deterministic electrical discharge at the impact. No visibility cutoff while the camera passes the fallen cubes |
| Propagate | 38.2–41.5 s | Copper tubes run from the wall to the nearby side surface, up a relay bend and into the CPU chip; a distance-UV shader moves a cyan head and short trail progressively |
| Activate | 41.5–42.6 s | Correct OR-like XOR outline plus a separate input arc energizes; `ACCESS GRANTED` appears only after arrival; pins withdraw |
| Open | 42.6–45.7 s | Four distinct thick carriages translate diagonally, fold into the side rail envelope and expose the existing world beyond |
| Exit | approximately 46.03 s | The unchanged camera passes through real free space; all shutters remain present and fully retracted |

These are nominal effect-clock times. The existing Journey beat adjustment is
left intact; it drives the impact, propagation and lock together. There are no
new music events or wall-clock animation timers.

### Wall geometry and Havok handoff

The render boxes now have real beveled caps, opaque retro colors and six sparse
code labels: `TODO`, `FIXME`, `deprecated`, `legacy.dll`, `tech debt`,
`v1_final_FINAL`. Grouping only controls pre-impact visual motion; the 48 final
centers, quaternions, collider sizes and spacing are not altered.

During assembly the visible meshes have **no live dynamic body**. At loading,
the existing Havok engine creates the original 48 box bodies at their fully
assembled homes, applies the original canonical world-space velocities and
records **481 frames at 60 Hz** over the eight-second collapse and settling. Mass 1.6,
friction .55, restitution .32, floor restitution .35 and rail restitution .3
are preserved. The temporary bodies and boundaries are disposed in `finally`.
`PhysicsBake` supports optional per-collider rotation, restitution and animated
poses, preserving existing consumers' static-boundary defaults.

The bake now includes the gate's four fixed chassis boxes, shared with the
render geometry, and four animated shutter boxes using the same dimensions,
root transform and `xorPanelPose` as the visible panels. Their material uses
friction .55 and restitution .55. Havok's animated bodies target the next
60-Hz pose before each integration, so the colliders translate and rotate
with the opening instead of leaving an invisible wall across the exit.
Small bevels and surface armor are not separately collision-tessellated; the
thick main shutter solids and frame provide the collision envelope.

Actual cube/frame and cube/shutter impulses are recorded in
`ArcadePhysics.gateContacts`, including the formerly escaping cube 42.
Closed-door tests check every cube corner through 42.6 s with a 0.1-unit
solver tolerance. A separate real-Havok projectile test proves both a rebound
off a closed shutter and free passage once it is fully retracted.

Gate transform/mechanical changes in the debug UI rebuild this recording
before applying the visual settings; color/label changes reuse it. Rebuilding
uses canonical gravity and velocity limits even at a different rehearsal
speed, then restores the previous physics configuration. Disabling the gate
also removes its baked collisions. All temporary gate bodies and callbacks
are disposed; normal playback, pause and seeking still create no bodies.

At 38.2 s the animated poses match frame zero of that recording. Subsequent
poses use interpolated positions and quaternion slerp from actual Havok output,
not ballistic stand-ins. Pause holds the same sample; direct seek, reverse
scrubbing and restart sample the same tracks without reconstructing bodies.
Even hidden boxes evaluate to a fixed home or the final recorded pose, avoiding
history-dependent parked transforms. No meshes, materials, bodies or listeners
are created during replay.

The final poses are held after 46.2 s, without hiding the 48 cubes. The last
second of the recording is checked for less than 0.03 units of travel per cube,
so holding it does not freeze an unfinished fall. The production verifier checks
visible GPU-pixel contribution at 41.21 and 42.1 s, not just enabled flags, as
well as visibility and deterministic seeking through the end of the show.

The old optional raw-audio early release is intentionally removed: the existing
authored 38.2-s impact is the deterministic narrative authority. Live audio does
not randomly release cubes early or change the cached physical result.

### Engineered four-panel gate

The curtain implementation and its exclusive tests are removed; the cinema's
unrelated burgundy acoustic scenery is untouched. The new gate consists of
layered graphite/titanium solids, beveled angular armor wings, copper perimeter
traces, instanced fasteners/heat sinks, four carriage rails and lock pins.
Two scoped shadowless lights reveal the metal and exposed passage. No opaque
portal image, cloth, imported concept texture or new shadow target is used.

The four closed carriage centers are:

```text
upper-left   (-6.075, 23.65, 0)
upper-right  ( 6.075, 23.65, 0)
lower-left   (-6.075,  8.55, 0)
lower-right  ( 6.075,  8.55, 0)
```

Coordinates are local to the gate at (-518, 0, -42), yaw π/2. For eased opening
`q`, each center moves by `(side × 3.25q, verticalSide × .65q, 6.2q)`, with
`side × 78q` degrees of yaw. Top leaves therefore move up/out, bottom leaves
down/out; all four fold into longitudinal side space rather than pushing through
the floor, roof or lateral wall. The front bezel stands ahead of the complete
shutter swing, while guide rails stay outboard of the blades.

The central logic chip rides the upper-right carriage. A short piston extension
of `3 sin(πq)` keeps it ahead of the opposite moving leaf before returning to
its final mounted position. The badge therefore does not clip through the left
shutter or remain as a fixed obstacle in the opening. The green debug wireframe
shows a conservative **10 × 18** safe aperture, not an imaginary full-frame gap.
Nothing is hidden or scaled to zero to provide crossing clearance.

## Debug and comparison controls

Open the existing diagnostics with **D**, then expand **LEGACY WALL / XOR CPU
GATE**. Controls are not visible in the live intro:

- `enableLegacyWallAssembly`, `enableXorCpuGate`;
- assembly lead, stagger/speed, sparse label mode and wall message;
- signal offset/duration, cyan/copper colors and emission;
- gate XYZ, yaw and uniform scale, with deliberately small mounting-safe ranges;
- panel travel/lift, folding angle, depth travel and opening duration;
- panel bounding boxes, original camera path, safe aperture and cube collider
  bounding boxes; recorded-physics state and closed/open transform readouts;
- approach, impact, signal, activation, opening and exit jumps; sequence replay
  and a 34.4–48.5-s loop. Closing diagnostics stops the loop.

Invalid timing or placement input is rejected with a notice and the previous
configuration retained. Opening duration is capped at 3.2 s so full clearance
precedes the original crossing. Disabling both effects restores the original
grey wall formation and its Havok destruction, with a guaranteed-clear exit;
the removed curtain is not resurrected.

## Visual references and deliberate adaptations

1. **Legacy wall:** the supplied colorful concept guided the palette,
   tetromino grouping, bevels, sparse labels and short compile-failure beat.
   The actual 8 × 6 collider wall is retained rather than copying the
   concept's larger irregular pile or fictitious code labels.
2. **XOR CPU:** dark layered metal, gold/copper routing, cyan charge, the
   correctly curved XOR, angular armor and engineered motion are genuine
   geometry. The real 28-unit corridor cannot accommodate the concept's giant
   planar diagonal translations: depth retraction and substantial folding are
   the intentional spatial adaptation.
3. **Storyboard:** all six beats are connected by one impact-clock signal.
   The existing camera never pauses for a new hero shot, and the original
   clapperboard and following cinema sequence remain visible through the gate.

The reference artwork's dense industrial background, volumetric rays and
hundreds of small greebles are not copied. The project keeps its original
lighting/fog, local resources and real-time rendering budget. The wall destruction
remains authored-cue Havok, not a newly invented physical camera collider.

## Verification and captures

Run:

```sh
npm test
npm run verify:legacy-xor
node scripts/verify-simready.mjs
```

The dedicated production verifier plays actual Viola's Journey, pauses/resumes,
compares seven rendered playback states against direct seeks, performs 20
replay loops and checks stable resource/body counts. It compares **361 original
camera samples** through the same Babylon camera pipeline (including Babylon's
existing 0.001 singularity nudge), tests swept camera/near-plane clearance
against conservative transformed solid bounds, reads real signal pixels and
benchmarks seven moments at **1920 × 1080**.

The measured native baseline was approximately **60 FPS** for assembly,
destruction and the previous exit. The new sequence must remain above 51 FPS
(the project's 15% regression envelope). Raw final measurements, exact
clearance and startup time are in [validation.json](legacy-xor/validation.json).
The original native measurements are retained in
[baseline-metrics.json](legacy-xor/baseline-metrics.json).
The ordinary full production verifier also rechecks the tunnel, popcorn,
physical rescue, manga wall, local gallery and disabled NVIDIA mode.

### Final measured result

| Check | Result |
| --- | --- |
| Unit/integration suite | **266 tests passed**, 48 files; TypeScript and production build passed |
| Camera regression | **361 samples**, zero position, heading or FOV difference through the original Babylon pipeline |
| Musical playback | **848 rendered frames**, pause/resume stable; seven native states exactly match direct seeks |
| Replay resources | 20 loops / 240 seeks; stable 1,404 meshes, 1,720 transforms, 278 materials, 20 lights and 5 unrelated live bodies |
| Wall physics | 48 real Havok tracks × 481 frames, ending at rest; zero live wall bodies during playback; debris has no timed disappearance |
| Cabinet placement | Six real model bounds each leave **0.800 units** to the inner wall; minimum camera-to-model-bounds clearance **2.90 units** |
| Persistent debris | **223,514 changed GPU pixels** at 41.21 s and **99,981** at 42.1 s versus hiding the cubes; last-second maximum settled travel **0.0000039 units** |
| XOR collisions | **17 recorded Havok impacts**, including cube 42 against a shutter; maximum closed-door corner penetration **0.00841 units**; no temporary gate bodies left after preparation |
| Camera safety | Conservative minimum near-plane/solid clearance **6.87 units**, including fixed frame, badge, rails and moving plates |
| FullHD frame rate | **59.99–60.02 FPS**, median 16.6–16.7 ms, worst measured 95th percentile 17.5 ms |
| Startup | **8.12 s**, including speaker/Terminator warmup and the wall/gate collision bake |
| Final astronaut | Actual height 16.64, fixed pose, old corner empty; visible silhouette in all 6.25 s of sampled final approach |
| Browser/network | Zero JavaScript/console errors and zero external requests |

These are measurements on this machine/browser, not a universal GPU guarantee.
The existing non-blocking Vite large-chunk warning remains unchanged.

### Follow-up: cold freeze before Anne-Flore

The reported freeze was reproduced at the first laser/projector activation,
around 14 s, before the 17-s speaker cue. Cold playback compiled **17 additional
GPU programs** across the lighting lead and text/violin fade, with a
**193–200-ms** frame stall. Replay was smooth. Ordinary material compilation
had not exercised every render-time lighting, transparency and instancing
combination; a further thin-instance variant was needed when bass changes the
frame's X scale (`NONUNIFORMSCALING`).

[RenderWarmup.ts](../src/scene/RenderWarmup.ts) now performs actual offscreen
draws during loading for the laser lead, partial reveal, title fade, full card
and bass-deformed frame. Readiness includes render targets. Physics remains
disabled, the temporary target is disposed and the show is restored to time
zero before SYSTEM READY. Future shots are never drawn into the lobby canvas.
No cue, music timing, visual effect or rendering quality is removed.

The final production check recorded **450 real soundtrack frames** over
13–20.5 s, **zero late shader compilations**, a **24.3-ms maximum** and a
**17.6-ms 95th percentile**. A separate local cold/replay check peaked at
18.1 ms with no long tasks. The existing production verifier now rejects
new shader compilation in this window, stalls above 50 ms or a 95th percentile
above 22 ms. Three focused unit tests cover output/physics restoration,
temporary-resource cleanup and explicit failure propagation.

### Follow-up: opening keynote panel and soundtrack ending

The opening now reads **DEVFEST AI4FUN / CLOSING KEYNOTE** with the existing
transparent green DevFest mascot between the lines. The logo is preloaded,
mounted on the same board and explicitly shares its original fade; the
4.3–5.925-s shader and centered camera crossing are unchanged.

Both bundled MP3s use a quick **1.25-s smooth ending**, before whichever arrives
first: the real media ending or the show limit. Native metadata gives 177.6 s
for Journey and 178 s for Trance, so fading only near 180 s would be too late.
A dedicated output `GainNode` sits **after** the analyser, preserving the
original frequency data and leaving live/Strudel audio untouched. Pause/seek,
restart and lobby return restore the appropriate gain; interpolation is
smoothed on the audio thread to avoid stepped volume changes.

Browser verification measures the actual signal after this gain on both
tracks: normal volume is unchanged, the middle attenuates and the final samples
reach silence. It also checks that rewinding restores full volume.

### Windows/RTX loading failure: material uniform buffers

The supplied Windows console repeats one underlying compilation error:
`rescueDamage: undeclared identifier`. The shader contains a WebGL 2
`uniform Material` block but no declaration for that parameter. On this Mac,
Babylon disables uniform buffers through its browser exception policy; the
standalone GLSL declaration therefore masked the problem.

The error was reproduced locally **before** the fix by enabling UBOs on a
fresh real WebGL 2 engine. The destruction plugin now declares `rescueDamage`
in `getUniforms().ubo`, retains the plain GLSL fallback, and writes through
`UniformBuffer.updateFloat`. It no longer relies on an external effect-only
uniform. UBOs and the visual effect remain enabled; no global quality/performance
workaround is applied.

Run `npm run verify:gpu` to check the built intro in both modes. Actual rendered
white-pixel counts match exactly in UBO and non-UBO modes: **2,888 intact,
1,424 at half damage, 0 destroyed, 2,888 after rewind**. Both complete intro
loads reach SYSTEM READY without shader errors; the real model/petal handoff
at 125.8/127.2 s is checked too. Results are in
[gpu-compat-validation.json](gpu-compat-validation.json).

This executes both shader paths on the available **Apple M1 Max / ANGLE Metal**
host; a Windows user-agent enables Babylon's UBO policy for the full-app check.
It is **not** a physical RTX 5090/Direct3D driver test.

| Beat | Before | After |
| --- | --- | --- |
| Assembly | [Old sudden wall](legacy-xor/before-01-assembly.png) | [Staggered tetrominoes](legacy-xor/after-01-assembly.png) |
| Completed | [Original wall](legacy-xor/before-02-complete.png) | [BUILD FAILED](legacy-xor/after-02-complete.png) |
| Collision | [Original collapse](legacy-xor/before-03-collision.png) | [Recorded Havok impact](legacy-xor/after-03-collision.png) |
| Signal | [No connecting circuit](legacy-xor/before-04-signal.png) | [Traveling packet](legacy-xor/after-04-signal.png) |
| Opening | [Curtain](legacy-xor/before-05-partial-gate.png) | [Four mechanical shutters](legacy-xor/after-05-partial-gate.png) |
| Exit | [Previous passage](legacy-xor/before-06-exit.png) | [Actual free aperture](legacy-xor/after-06-exit.png) |

Also see [XOR activation](legacy-xor/after-07-xor-activation.png),
[persistent debris after the old cutoff](legacy-xor/after-08-persistent-debris.png)
and [cabinet wall clearance](legacy-xor/after-09-arcade-clearance.png).
The [cube/shutter impact](legacy-xor/after-10-xor-cube-impact.png) shows the
new physical gate response.
Before captures were taken during native playback; after captures use the
actual production camera at documented deterministic checkpoints, not concept
art or a free-camera showcase.

## Follow-up: astronaut and chocolatine crossing

The 6 November pass pre-stages the copper impact tube from time zero, with
its source five units in front of the wall anchor. The return bend stays
inside the corridor, between the Tetris wall edge and the architectural wall,
then follows the inner wall toward the door. Regression tests check the
complete copper surface against the actual instanced architectural solids,
not only its centerline against the Tetris blocks. A deterministic
spark follows the electrical packet and expands into a 0.35-s arrival burst
at the door. The original impact flash and gate opening timings are preserved.

The obscured `THE OTHER SIDE` board beside the final rocket is removed from
the architectural interior. The rocket, satellite and orbital label remain.

The existing astronaut is moved behind Orbital Toulouse Link, using its 153-s
anchor, depth 25 and lateral offset 11, with three extra units of setback from
the previous placement. Its actual normalized model height is
**16.64**, immediately and permanently; there is no growth track or duplicate
at the old buffer corner. Its feet remain grounded and its final bounds stay
inside the corridor. The old 122-s data-arch animation is preserved independently.
The terminal's original 119.1-s gaze is decoupled without changing the camera.

The pastry board remains preloaded and switches to chocolatine at exactly
28 s on camera time (advanced by 0.5 s), independently of musical effect-time nudging,
then its entire surface fades **31.85–32.55 s on camera time**, not a
beat-shifted effect clock. It is fully transparent/disabled before crossing
at **32.75 s**. Only visibility changes; no replacement black plane is created.
The verifier checks the actual final astronaut silhouette and fixed bounds,
old-location absence, half-opacity, complete pre-crossing disappearance and
seek/replay. See [final astronaut](legacy-xor/finale-astronaut.png) and
[clear chocolatine crossing](legacy-xor/chocolatine-crossing.png).

## Files changed

### New implementation and verification

- [LegacyXorSequence.ts](../src/scene/LegacyXorSequence.ts): shared bounded
  settings, canonical cue windows and deterministic state.
- [HardSurface.ts](../src/scene/HardSurface.ts): outward-facing solid beveled
  prism geometry reused by the wall and gate.
- [XorCpuGate.ts](../src/scene/XorCpuGate.ts),
  [XorCpuGate.test.ts](../src/scene/XorCpuGate.test.ts): four shutters,
  correct XOR, pistons, rails, scoped lighting, clearance/replay tests.
- [CircuitSignal.ts](../src/effects/CircuitSignal.ts): physical copper tubes
  and progressive distance-based electrical shading.
- [TerminatorDestruction.ts](../src/effects/TerminatorDestruction.ts),
  [TerminatorDestruction.test.ts](../src/effects/TerminatorDestruction.test.ts),
  [verify-gpu-compat.mjs](../scripts/verify-gpu-compat.mjs): matching UBO/fallback
  declarations and actual cross-path rendering regression.
- [RenderWarmup.ts](../src/scene/RenderWarmup.ts),
  [RenderWarmup.test.ts](../src/scene/RenderWarmup.test.ts): offscreen preparation
  of actual first-speaker draw variants, including reactive scaling.
- [soundtracks.ts](../src/audio/soundtracks.ts),
  [soundtracks.test.ts](../src/audio/soundtracks.test.ts),
  [AudioAnalyzer.ts](../src/engine/AudioAnalyzer.ts),
  [AudioAnalyzer.test.ts](../src/engine/AudioAnalyzer.test.ts),
  [App.ts](../src/engine/App.ts), [App.test.ts](../src/engine/App.test.ts):
  native-file-aware ending envelope, post-analysis output gain and transport tests.
- [ArcadeCathedral.ts](../src/scene/ArcadeCathedral.ts),
  [EventBranding.ts](../src/scene/EventBranding.ts),
  [PixelWorld.test.ts](../src/scene/PixelWorld.test.ts): updated keynote title,
  shared local artwork loading and logo fade.
- [LegacyXorDebug.ts](../src/debug/LegacyXorDebug.ts): tuning, diagnostic
  geometry, state readouts, safe input and replay controls.
- [verify-legacy-xor.mjs](../scripts/verify-legacy-xor.mjs): native musical
  playback, visual captures, camera/clearance/resource/FPS regression.
- [dataArch.ts](../src/content/dataArch.ts): replaces the obsolete
  astronaut-growth helper while preserving the original data-arch lift.

### Existing integration surfaces

- [ArcadePhysics.ts](../src/scene/ArcadePhysics.ts),
  [ArcadePhysics.test.ts](../src/scene/ArcadePhysics.test.ts): original homes,
  tetromino assembly and exact cached Havok replay.
- [ArcadeT.ts](../src/scene/ArcadeT.ts),
  [DevFestScene.ts](../src/scene/DevFestScene.ts): gate replacement, shared
  settings, actual regular/thin-instance shader prewarming and lifecycle.
- [PhysicsBake.ts](../src/scene/PhysicsBake.ts): optional collider rotation
  and restitution, needed to retain the original wall boundaries.
- [DebugPanel.ts](../src/debug/DebugPanel.ts): integrates the hidden controls.
- [showBeats.ts](../src/content/showBeats.ts),
  [CameraPath.ts](../src/camera/CameraPath.ts),
  [CinemaWorld.ts](../src/scene/CinemaWorld.ts),
  [CinemaWorld.test.ts](../src/scene/CinemaWorld.test.ts): final astronaut
  staging and fixed size; the camera change only replaces an obsolete
  growth-dependent constant with its identical original value.
- [DigitalMoments.ts](../src/scene/DigitalMoments.ts),
  [DigitalMoments.test.ts](../src/scene/DigitalMoments.test.ts): decoupled,
  otherwise unchanged data arch.
- [cues.ts](../src/content/cues.ts),
  [cues.test.ts](../src/content/cues.test.ts),
  [EasterEggs.ts](../src/scene/EasterEggs.ts),
  [DigitalProps.test.ts](../src/scene/DigitalProps.test.ts): pre-crossing
  pastry transparency and camera/effect-clock separation.
- [StageReadability.test.ts](../src/scene/StageReadability.test.ts): checks
  actual wall/gate/final astronaut placements, replacing removed rebase/boss
  proxy assertions.
- [verify-simready.mjs](../scripts/verify-simready.mjs): updated four-panel
  and final-astronaut checks; other existing production probes retained.
- [package.json](../package.json): reproducible `verify:legacy-xor` command.

### Documentation and generated evidence

[README.md](../README.md), [AGENT_CONTEXT.md](../AGENT_CONTEXT.md),
[CREDITS.md](../CREDITS.md), [simready-integration.md](simready-integration.md),
this report and the generated [simready-validation.json](simready-validation.json)
describe the current sequence. [legacy-xor/](legacy-xor/) contains the original
[camera baseline](legacy-xor/camera-baseline.json), native baseline metrics, final validation JSON,
six before PNGs, seven after PNGs and the two follow-up PNGs linked above.

The exclusive T-exit files `src/scene/RedVelvetCurtain.ts` and
`src/scene/RedVelvetCurtain.test.ts` are deleted. The former
`src/content/astronaut.ts` growth helper is replaced by the data-arch helper.
