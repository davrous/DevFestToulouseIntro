# Into the unexpected

A three-minute real-time opening for the DevFest Toulouse 2026 closing keynote. Babylon.js + TypeScript + Vite. The camera starts in the T of the actual extruded title, travels through arcade, impossible cinema, camera lens and projector beam into the digital D, then reveals **DEVFEST / TOULOUSE**. No scene swap, prerecorded film, runtime CDN, or audio-driven camera.

For future agents and cross-machine handoff, start with [AGENT_CONTEXT.md](AGENT_CONTEXT.md): show intent, preserved decisions, timing, focused code map, known pitfalls and validation history.

## Run locally

Requires Node.js 22.12+.

```powershell
npm ci
npm run dev
```

Open http://127.0.0.1:5173. Wait for **SYSTEM READY**, then **PLAY SEQUENCE**. **Preview the reveal** starts at 2:35. Fullscreen is optional and requested only from a user gesture.

For the optimized stage build:

```powershell
npm run build
npm run preview
```

Open http://127.0.0.1:4173 and keep the local server running. After installation/build, no Internet is needed. Do not open the HTML using `file://`.

**This page does not play music.** The viola and Strudel performance remain external. Visuals work without either audio input or the optional event bridge. No microphone permission is requested automatically.

The optional **local Strudel performance tab** at `/strudel/` adds precise
scheduler events over same-origin BroadcastChannel alongside the unchanged FFT
capture. See [STRUDEL_SYNC.md](STRUDEL_SYNC.md) for launch, helpers, cue windows,
offline instruments and rehearsal diagnostics. The Babylon page still plays no audio.
The separate [original keynote score](examples/devfest-keynote.strudel) lasts
three minutes in Bb minor, with a quicker initial rise, answering string-like /
wind-like / horn-like synth voices, an emotional cadence at each speaker,
and the 150-BPM electronic grid. Its F7 preparation integrates the descending
tape-stop at the clap rather than interrupting an unrelated phrase.
Load it explicitly from the performance page;
it uses only local instruments and does not replace the engineering demo or
the supplied music excerpt.

The accompaniment leaves the external live viola central at the opening and
through the quiet lens passage. After 96 s it rebuilds more vigorously until
the 159-s exit impact, then clears the beat for a spacious dramatic pullback
and a Bbm resolution at the settled title (173 s).

For a one-click local performance, enable **Start the bundled Strudel keynote**
on the main lobby and press **PLAY SEQUENCE**. The click opens a same-origin
Strudel performance frame, loads the bundled keynote without replacing the
saved editor draft, initializes local audio, and starts both clocks through the
confirmed synchronized onset without leaving the Babylon tab. Leave the option
disabled for visual-only playback.

## The show

| Time | Scene |
| --- | --- |
| 0:00–0:06 | DEVFEST ARCADE / PRESS ANY KEY opens the show without a giant central cabinet; the camera discovers the arcade corridor |
| 0:05–0:31 | Fixed pixel-art decals and scenery stay against the T's side walls, above six grounded Kenney cabinets; bass never changes their character, position or scale; `GET /pain-au-chocolat` redirects to `/chocolatine` before Anne-Flore |
| 0:17–0:31 | Anne-Flore's cyan gateway, with a voxel violin and bow centered directly below her card; their cubes collapse with Havok at 0:22, early enough to see the floor bounces before the camera passes |
| 0:30–0:41 | Bonus tokens fall just beyond the violin; the FINAL BOSS announces LEGACY CODE before its translucent Havok wall appears and collapses at 0:38 |
| 0:41–0:49 | `$ git rebase --continue` announces EXIT UNLOCKED, then the T door opens |
| 0:46–0:52 | The original giant clapperboard is already present during the approach, below LEVEL COMPLETE, and snaps shut in 0.18 seconds from 0:50.85. The fullscreen CRT transition holds a green phosphor line from 0:51.135 to 0:51.38, then reopens on CINEMA and clears by 0:52.18; no black plane |
| 0:51–1:06 | A symmetrical cinema cathedral with eight full curved CRT screens: MS-DOS, CONFIG.SYS, AUTOEXEC.BAT, Windows 95, blue-screen jokes, floppy installation and a Toulouse BBS; all briefly flash DEVFEST at 0:59.4 |
| 1:06–1:23 | David Rousset is introduced **once**, as a movie premiere projected onto a world-space cinema screen with his configured demo title |
| 1:17–1:24 | Giant front-facing reels and rotating sprockets transport a black-and-white film ribbon; two raised striped buckets, left and right, tip inward at 1:17.55 and spill 72 Havok kernels from 1:18.1, while still in front of the camera so the falling rain stays visible before passing overhead |
| 1:24–1:39 | The already-visible giant frontal cinema camera is approached and entered through its lens at 1:30. Only then do short, coaxial optical rings lead into the projector beam, transparent floor and space warp; digital architecture returns through haze at 1:35 |
| 1:35–1:56 | Eric Mittelette's gateway and converging data streams, without the obsolete `agent.observe()` / `agent.plan()` panels |
| 1:49–1:59 | A physical memory rack overflows in the S bend: `BUFFER OVERFLOW / console.log('just one more...')`, then 32 Havok bytes spill at 1:53.2; the caption fades before the cassoulet |
| 1:57–2:05 | `npm install cassoulet / package size: 4.8 GB` stays readable after Eric and disappears before Mitsuru's entrance |
| 1:54–2:12 | A traveling architectural pulse progressively raises six symmetrical data gates, shifting cyan to gold; it continues behind the cassoulet gag and hands off to Mitsuru without an empty corridor |
| 2:08–2:35 | Mitsuru Furuta / floating orbital name instead of another rectangular card; denser golden data streams and a three-band meter behind him build the D climax |
| 2:20–2:29 | A procedural deployment rocket waits at the **next corner**, before the right turn toward Orbital Link. After a readable approach, it launches at 2:24.6 and hits the actual ceiling underside at 2:26.8: a brief flash, expanding shockwave and 240 falling sparks. The pad stays grounded; the camera follows the ascent then smoothly hands over to Orbital Link |
| 2:23–2:46 | Toulouse orbital hardware sits deeper in the D; its two-line `TOULOUSE / ORBITAL LINK` label remains present into the final zoom-out |
| 2:33–2:39 | Brief turn by the last meter, then escape |
| 2:39–2:53 | Faster backward/upward pullback exposes the complete title and the force-field floor connecting the T and D at corridor level; at 2:48–2:52.5 its two spans rise like drawbridges and telescope into the T exit and lower D doorway |
| 2:50–3:00 | World-space **AI4Fun** signature and subtle anniversary marks; title settled by 2:53, seven-second final hold |

During the interior flight, circuit-board equalizer lanes run along the floor: quiet time-driven packets remain visible without an audio input, while bass, mids and treble raise short spectrum bars. The former bouncing balls and their physical platforms have been removed. In the T, Havok instead simulates the violin/bow cubes, 26 arcade tokens and 48 labeled legacy-code blocks; the cinema adds two synchronized popcorn cascades totaling 72 kernels with seat ledge collisions. Physics debris cannot block the camera, and temporary bodies are cleaned up and recreated on a backward seek. Five wall groups (one in the T and four in the D, including one behind Mitsuru and one before the exit) reuse recessed rectangles as three-column spectra: low frequencies (electro kick), mid frequencies (including viola fundamentals), and high frequencies (electro hats and viola harmonics, with a restrained viola-energy proxy). Their idle bars are visible from the approach to each corridor and respond more strongly to audio.

The cinema's seats, CRTs, screen support, both popcorn buckets, film/reels and giant camera are preloaded and visible from entry at 51.18 seconds, not enabled one prop at a time. Their narrative actions still occur later: David's name fades in, the buckets tip and spill, and the camera iris is crossed. Only optical/projector/space effects keep their later reveal windows. The drawbridges stay closed throughout the final hold and reset when seeking backward.

The clap's original [CRT transition shader](src/effects/ClapCrtTransition.ts) combines square arcade pixels, restrained RGB separation and row interference, a soft green phosphor shutdown line, then a curved CRT reopening with raster scanlines and an RGB shadow mask. Its [timing](src/content/showBeats.ts) spans 50.65–52.18 seconds: the scene still swaps at 51.18, hidden behind a 245-ms phosphor hold, and the image starts reopening at 51.38. The shader is compiled before SYSTEM READY, follows absolute show time for pause/seek/replay, and is detached outside this window. As a narrative transition it remains active when optional Bloom/FXAA is disabled, just as the former physical shutter did.

For the local keynote score, **Start show + music** on `/strudel/` launches both clocks from the scheduled audible cycle-zero onset, including when Babylon is in another tab of the same window. Switch to the Babylon tab after clicking: its clock catches up to the music even if background rendering was suspended. Synchronized playback keeps time across tab switches; ordinary playback still auto-pauses when hidden. A loading or already-playing show explicitly rejects the launch. Normal Evaluate, pause and seek remain independent. The one-shot Strudel gesture descends three octaves with increasingly spaced, lower drum pulses, leaves the phosphor hold quiet, and resumes the score at 51.38. Reload the keynote to update an existing saved draft; no draft is overwritten automatically.

Research references: [GM Shaders Mini: CRT](https://mini.gmshaders.com/p/gm-shaders-mini-crt) for CRT/phosphor techniques and [The Book of Shaders: Noise](https://thebookofshaders.com/11/) for procedural interference. The in-project GLSL implementation is original, not copied from these tutorials, and uses no extra assets or runtime network requests.

For Anne-Flore and Eric, beams rise from floor projectors and **dynamic spotlights** illuminate the physical cards. David's light-reactive screen receives two moving aisle spotlights that sweep from its center across the name and back, using physical falloff and targeting the screen rather than its side posts. Light precedes the name fade; opaque typography preserves readability and the hardware avoids blown-out halos. Mitsuru's name floats inside two animated overclock orbits rather than repeating Eric's card. Cinema haze bloom respects beam opacity. Music never alters the deterministic camera route. OVERCLOCK intensifies the final digital section; these effects fade before the title reveal.

### Configure speakers

Edit [src/content/speakers.ts](src/content/speakers.ts). Each portal accepts:

```typescript
{
  name: "Anne-Flore Bernard",
  demoTitle: "Musical Agentic Blender",
  startTime: 17,
  endTime: 39,
  gateTime: 29,
  visualTheme: "signal",
  world: "game"
}
```

Adjust the example's speaker names and demo titles to match the event program. `world` selects `game`, `cinema` (movie premiere), or `digital`; keep exactly one cinema speaker. `gateTime` determines the fixed position along the camera route where the portal or cinema screen is crossed; keep it inside the introduction interval. Theme options: `signal`, `neural`, `playground`, `overclock`. The existing demo titles have not been changed. Names and titles are textures on physical world-space meshes, not HTML overlays. Rehearse after changing timing or unusually long titles.

Optional `lateralOffset` and `gateWidth` position the entire gate across the corridor. Mitsuru's gate is shifted 1.1 world units to the camera's right and narrowed slightly to clear the brick wall; its camera gaze follows the same placement.

## Operator controls

| Key | Action |
| --- | --- |
| Space | Start / pause / resume; replay after the final hold |
| R | Restart |
| 1–5 | Jump to boot / compile / build / run / overclock |
| 6 | Reveal preparation at 2:35 |
| D | Flight control: scrub, phases, FPS, camera, speaker, active cues, audio, bridge |
| F | Toggle fullscreen |
| Escape | Return to lobby when not fullscreen |

Flight control also provides post-processing, render resolution, reactive intensity, live-input connection, rehearsal triggers and WebSocket controls. Rehearsal triggers affect visuals **during playback**; pause freezes the choreography and reactive frame, but input meters continue monitoring live audio. Playback-speed changes affect the whole master timeline, not just the camera, so speaker/camera synchronization cannot drift.

The **STORY / REHEARSAL JUMPS** in flight control also include POPCORN and D ESCALATION alongside the chapter, speaker and reveal jumps. Live diagnostics include active meshes, triangles, draw calls, and visible physics bodies alongside FPS.

**Balanced** caps the render buffer at 2560×1440. **Native / 4K** uses full device resolution. Normal playback hides HTML controls and the cursor. At speed 1, the clock stops at exactly 3:00; only the already-finished final image remains on screen indefinitely.

Ordinary playback auto-pauses in hidden tabs rather than silently skipping the finale. Playback launched with **Start show + music** instead keeps its clock aligned across tab switches. Keep the show visible on the projector for smooth rendering; a separate Strudel window is still useful for live editing. A lost graphics context pauses the timeline and rebuilds GPU resources when the context returns. The timestamp, audio controller and settings survive; press Space after recovery.

## Live audio analysis

Open **Live audio setup** in the lobby, or use the audio controls in flight control:

1. Choose **Microphone / line input** or **System / browser tab audio**.
2. Click **CONNECT INPUT** / **CONNECT AUDIO**.
3. Grant the browser permission. For system/tab capture, select a source and enable **Share audio**. Sources without an audio track are rejected with a visible error.
4. Speak and check the **LIVE INPUT** meter in the lobby or flight control. It should rise immediately. The selected input's device name appears in the signal hint.
5. Adjust **Input gain** as needed. It defaults to +12 dB for quiet microphones; reduce it for strong system/line input. A typical speaking level around -35 to -15 dBFS is a useful starting point. A warning appears for very quiet or excessively hot input.
6. Start/resume the show. Continuous voice/instrument volume visibly brightens the corridor, floor-mounted spotlights and bloom; bass/mid/treble reshape the floor and wall spectra and claps/drum attacks add sharper pulses. The lobby also responds, so input can be checked without starting the camera.

If the meter moves but visuals do not, check **Audio reactivity** and **Reactive intensity** in D. Paused images stay frozen even though meters move. Reactivity intentionally fades out after 2:35 and is absent from the final hold. If the meter does not move, check the reported device, browser/Windows input selection, OS microphone permissions, mute controls and input gain.

The Web Audio analyser uses floating-point waveform measurements and a local input preamp, and exposes `kick`, `bass`, `mid`, `treble`, `energy`, `beat`, `violaEnergy`, `snare` and `drop`. Smoothed `energy` drives continuous corridor and laser brightness; the other bands drive light pulses, the floor spectrum, ornament breathing, particle motion/brightness, flowing ribbons, fog and restrained bloom. The time-based lighting choreography still works with audio reactivity disabled or no input connected. Audio never controls camera position, speaker timestamps, route selection or reveal timing.

`violaEnergy` from mixed audio is a **smoothed mid-band proxy, not instrument separation**. For accurate viola control, use a dedicated input or send explicit `violaEnergy` levels through the event API.

Audio is processed locally, never recorded or uploaded, and never connected to the page's speaker output. Disconnect releases captured microphone/display tracks. Permission denial, muted/lost input or a disconnected bridge does not stop the timeline.

For an embedded audio source, connect a caller-owned stream:

```javascript
await showController.audio.connectStream(mediaStream);
showController.audio.disconnect();
```

The controller does not stop tracks it did not acquire. The caller owns their cleanup. AudioContext activation and capture must originate from user interaction.

## Strudel integration

### Same page

The public event interface is `window.showController`:

```javascript
showController.trigger("kick");
showController.trigger("snare", 0.8);
showController.trigger("hat", 0.4);
showController.trigger("drop");
showController.trigger("viola", 0.7);
showController.setEnergy(0.65);
showController.setLevels({ bass: 0.7, treble: 0.3, violaEnergy: 0.8 });
showController.setSection("OVERCLOCK");

showController.setEnergy(null);  // Return to analysed energy.
showController.setSection(null); // Return to timeline-derived colors.
```

`setSection` changes the **visual palette only**. It cannot jump the camera or reveal the title early. Values must be finite numbers in `[0, 1]`; invalid calls throw. Transient events decay, streamed levels decay when updates stop, and manual `setEnergy` holds until changed/reset. Reactive intensity is configurable from 0 to 2, with final channel values capped at 1.

An alternative same-page transport:

```javascript
window.dispatchEvent(new CustomEvent("devfest:event", {
  detail: { type: "trigger", event: "kick", velocity: 0.9 }
}));
```

Call these functions from the actual note-playback/scheduler callbacks in your Strudel setup, **not when a pattern is merely constructed**. This repository supplies the integration layer, not a Strudel editor, music composition or audio-routing configuration.

### Another local window/process

Run the optional relay in a second terminal:

```powershell
npm run bridge
```

It listens at `ws://127.0.0.1:8787`. Click **CONNECT BRIDGE** in flight control, or:

```javascript
showController.connect("ws://127.0.0.1:8787");
```

From a different local browser window:

```javascript
const visuals = new WebSocket("ws://127.0.0.1:8787");
visuals.addEventListener("open", () => {
  visuals.send(JSON.stringify({ type: "trigger", event: "kick", velocity: 1 }));
  visuals.send(JSON.stringify({ type: "energy", value: 0.65 }));
  visuals.send(JSON.stringify({ type: "levels", values: { violaEnergy: 0.8 } }));
  visuals.send(JSON.stringify({ type: "section", section: "BUILD" }));
});
```

For Node/local applications, connect using any WebSocket client and send the same JSON. The relay broadcasts to other connected clients; the browser validates event types and values and visibly reports rejected events.

The relay binds only to `127.0.0.1`, rejects non-local browser origins, accepts text messages up to 4096 bytes, and limits each client to 240 events/second. Run Strudel locally for bridge access; a public `strudel.cc` page is intentionally not an allowed origin. Set `$env:STRUDEL_PORT = "8788"` before `npm run bridge` to change the port.

The bridge is not started or contacted automatically. When explicitly connected, the browser retries a lost connection; **DISCONNECT** stops retries. `showController.disconnect()` leaves the standalone show running.

## Architecture

- [Title geometry](src/content/title.ts): centered architectural alphabet, 251 enclosed modules, seed `DEVFEST_TOULOUSE_2026`.
- [Labyrinth](src/scene/Labyrinth.ts): thin-instanced floors, roofs, boundary walls, panels and light traces.
- [Camera](src/camera/CameraPath.ts): deterministic T-to-D Catmull–Rom route, lens/warp gaze accents and the original final full-title reveal.
- [SpeakerPortal](src/scene/SpeakerPortal.ts): reusable physical gate, staged typography reveal, theme and animated ornaments.
- [CinemaWorld](src/scene/CinemaWorld.ts), [CinemaAssets](src/scene/CinemaAssets.ts): local preloaded Sketchfab models, giant animated slate and scene handoff, climbing-instanced seats, CRT synchronization, David's premiere, linked film reels, giant lens, procedural projector and short space crossing.
- [ClapCrtTransition](src/effects/ClapCrtTransition.ts): precompiled fullscreen arcade-to-CRT shader, phosphor-line handoff, deterministic uniforms and no extra render pass outside the transition.
- [CinemaPopcorn](src/scene/CinemaPopcorn.ts): 36 short-lived Havok kernels with static floor/seat ledge colliders and seek-safe cleanup.
- [DigitalMoments](src/scene/DigitalMoments.ts): two different thin-instanced data-stream passages for Eric and Mitsuru, intensified by the music without moving the camera.
- [EasterEggs](src/scene/EasterEggs.ts): time-derived scenes; seeking backward restores the correct joke/sculpture state without simulating forward.
- [PixelWorld](src/scene/PixelWorld.ts), [ArcadeCathedral](src/scene/ArcadeCathedral.ts), [ArcadeT](src/scene/ArcadeT.ts): local Kenney pixel parallax, grounded cabinets visible along the corridor, opening screen portal, arcade HUD and the door.
- [DemosceneTransition](src/scene/DemosceneTransition.ts): thin-instanced 2D-to-voxel transformation and speed lines over the bridge.
- [ArcadePhysics](src/scene/ArcadePhysics.ts): bounded Havok token cascade and destructible technical-debt wall, with cleanup and seek recovery.
- [MusicReactive](src/effects/MusicReactive.ts): seeded GPU-animated particles and shader-based MIDI ribbons.
- [ShowLighting](src/effects/ShowLighting.ts): ground-mounted portal laser beams and dynamic spotlights, scanning lights and GPU floor circuit traces with thin-instanced spectrum bars.
- [WallMeters](src/effects/WallMeters.ts): three-band LED columns in five groups, including behind Mitsuru and before the exit, driven by bass, viola/body and high-frequency signals.
- [EventBranding](src/scene/EventBranding.ts): original event artwork on the first server's end panel and as two small final signatures. The final marks fade in with **AI4Fun** after 2:50 and do not affect the camera or title geometry.
- [ShowController](src/engine/ShowController.ts), [protocol](src/engine/protocol.ts), [AudioAnalyzer](src/engine/AudioAnalyzer.ts): independently validated music inputs.
- [App](src/engine/App.ts), [Timeline](src/engine/Timeline.ts), [DevFestScene](src/scene/DevFestScene.ts): preload, stage lifecycle, deterministic clock and rendering.

`window.devfest` remains available for inspection: `start(155)`, `seek(173)`, `timeline.pause()`, `timeline.play()`, `returnToLobby()`. A full show uses normal playback speed 1.

### Supplied event artwork

Three original transparent PNGs from the supplied `Mascotte-20261002T171109Z-1-001.zip` are stored in [src/assets/event](src/assets/event):

- `mascot-flag-green.png`: `Mascotte/PNG/VERT/1-Drapeau-VERT@2x.png`
- `mascot-planet-violet.png`: `Mascotte/PNG/VIOLET/2-Planete-VIOLET@2x.png`
- `anniversary-cube-orange.png`: `Mascotte/PNG/ORANGE/5-Typo-cube-ORANGE@2x.png`

The green flag and anniversary cube are used in the show; the violet planet image is retained locally but no longer mounted above David's cinema screen. The illustrations retain their original colors and proportions; subdued material opacity integrates them into the architecture. Vite bundles the used images locally. Both must finish loading before START is enabled; an asset-loading failure is surfaced rather than silently omitting the branding.

### Local Kenney arcade artwork

Only selected models and pixel sprites from the supplied Kenney archives are in [public/assets/kenney](public/assets/kenney). The cabinet GLB references its adjacent `Textures/colormap.png`; pixel sheets and four input-key icons use nearest-neighbor sampling and alpha testing. These resources are preloaded before SYSTEM READY. If a decorative Kenney asset cannot load, the error is logged and that decoration is skipped; the camera show continues. No CDN or network connection is used at runtime. Original CC0 license texts are retained in the asset folder, including the Mini Arcade contributor notice for Kenney, Fleur Keijsers and Guus Vermeulen.

### Local cinema and space artwork

Only selected, licensed GLBs from the supplied SketchfabModels directory are in [public/assets/cinema](public/assets/cinema). Eleven staged models preload before SYSTEM READY; the former floating theatre fragment is retained locally but no longer loaded or displayed. Camera ground and director-chair presentation socle are removed from the runtime hierarchy before bounds normalization; seats and director chair use the same physical height. Repeated seats/televisions/spotlights share geometry instances. The single hero camera uses geometry-sharing clones so its entry fade works without Babylon's unsupported instance-visibility warnings. A missing optional model logs an error; the procedural stage and timeline continue. The 1.37-million-triangle, noncommercial-licensed movie projector was deliberately excluded; its in-show substitute is lightweight geometry. See [CREDITS.md](CREDITS.md) for attribution. There are no runtime requests to Sketchfab.

## Verify and rehearse

```powershell
npm test
npm run build
```

Tests cover clock behavior, malformed inputs, frequency bands, transient decay, event/camera independence, speaker/cue timing, backward seeking, CRT transition envelopes/precompilation/errors/pipeline rebuilds, full curved CRT coverage, stable wall sprites, spotlight hits inside David's card, physical asset normalization, camera fading, popcorn/overflow cleanup, continuous D escalation, wall/roof clearance, camera turns below 45 degrees/second, at least two seconds of full unlabelled clap framing and four seconds for speaker names, and full-title projection by 2:53 at several aspect ratios.

Scene-clearance tests additionally keep drifting dust below the camera, the orbiting core clear of walls/roof/camera, and Mitsuru's panel inside the corridor. Interior fog now dissipates during the escape, before the pullback reaches large distances; the solid letters remain visible rather than disappearing behind their glow. The pipeline uses up to 4x MSAA when supported, with FXAA as the fallback.

Browser validation additionally covers physical text readability, synthetic Web Audio input, input disconnection, real events from a separate Node process through the relay, offline asset loading, fullscreen and graphics-context recovery. Vite's large Babylon bundle warning is non-blocking; stage shaders and materials are preloaded instead of fetched during the performance.

### Validation results — 2026-10-06

- **70 tests across 13 files** and the TypeScript/Vite production build pass after the staging corrections. The clap's actual closing stroke uses source frames 50–60, not the full animation that reopens afterward.
- All eleven staged GLBs preload locally. The production page made no external resource requests and logged no errors or warnings during a full **180-second playback at speed 1** (about 180.01 seconds of wall time). The original final camera pose and floor-level T–D connection remain intact.
- Visual checks at 16:9 covered the unobstructed clap, mirrored supported seat tiers, integrated CRTs, correctly scaled director chair, David's spotlight premiere, linked reels, visible bucket before the Havok spill, frontal camera/lens, projector-space passage, D escalation and final reveal. Measured seat and director-chair heights are both 4.2 world units. The popcorn collider matches the visible raised deck rather than letting kernels sink into it.
- Targeted forward/backward seeks restore stage visibility, the shutter and temporary bodies. Cinema haze no longer blooms as an opaque mask over text, and the hero camera fade no longer produces instance-visibility warnings.
- Native 3840×2160 rendering and the live mesh/triangle/draw-call monitor are available for rehearsal. These checks do **not** establish sustained 60 FPS on the actual projector workstation; profile and rehearse there with the real audio feed.

### Before going on stage

Latest visual pass (2026-10-07): **34 targeted tests across 10 files** and the production build pass. An active 1600×900 browser rehearsal with injected musical levels/kicks took **180.007 seconds** at speed 1, with no console errors/warnings, failed requests or external resources. Stable sprites, all eight curved CRT surfaces, cinema props visible throughout approach/rewind, the original final camera and the floor-only bridge were checked. The final non-overlapping buffer-stack adjustment was subsequently replayed in the real 109–119-second physics window, including cleanup. This does not certify projector/4K performance.

Rocket follow-up: **33 targeted tests across 5 files** and the production build pass. The moved rocket, fixed pad, ascent/impact framing, deterministic seek/replay and cleanup were checked in an active 1600×900 browser. The real 139–180-second segment took **41.003 seconds** at speed 1, with no browser errors/warnings or failed/external requests. Camera turns remain below 45°/s, Orbital Link stays readable, and the original final pose and floor-only bridge are preserved. This follow-up did not rerun the full three-minute rehearsal.

- Replace demo titles and rehearse all spoken introductions against their actual gate windows.
- Run the production build, leave the local server running, and test with the Internet disconnected.
- Choose the real audio interface/browser-share source and confirm meters without feedback.
- Rehearse Strudel events against actual audio latency; direct events are more reliable than onset detection on a mixed feed.
- Profile **Native / 4K** on the final projector/GPU setup. The automated accelerated run is not a substitute for a three-minute, full-speed rehearsal with live musicians.
- Keep D closed, speed at 1, fullscreen enabled, and the show window visible. Use 6 to rehearse the escape and reveal.
- Pause/restart/phase shortcuts remain available if the live performance needs recovery.
