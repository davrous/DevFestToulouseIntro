# Into the unexpected

A three-minute real-time opening for the DevFest Toulouse 2026 closing keynote. Babylon.js + TypeScript + Vite. The camera starts in the T of the actual extruded title, crosses an open force-field floor into the D, meets four speakers, then reveals **DEVFEST / TOULOUSE**. No scene swap, film, runtime CDN, or audio-driven camera.

## Run locally

Requires Node.js 22.12+ (or 20.19+).

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

## The show

| Time | Scene |
| --- | --- |
| 0:00–0:06 | DEVFEST ARCADE / PRESS ANY KEY opens the show without a giant central cabinet; the camera discovers the arcade corridor |
| 0:05–0:31 | Pixel runners and scenery stay against the T's side walls, above six grounded Kenney cabinets; the last pair sits forward of Anne-Flore's card; `GET /pain-au-chocolat` redirects to `/chocolatine` before she arrives |
| 0:17–0:31 | Anne-Flore's cyan gateway, with a voxel violin and bow centered directly below her card |
| 0:30–0:41 | Bonus tokens fall just beyond the violin; the FINAL BOSS announces LEGACY CODE before its translucent Havok wall appears and collapses at 0:38 |
| 0:41–0:49 | `$ git rebase --continue` announces EXIT UNLOCKED, then the T door opens |
| 0:47–1:05 | Speed lines, fog and NEXT LEVEL accompany the wall-free transparent force-field floor into the D |
| 1:20 | David Rousset / violet neural gateway, agent/code panels |
| 1:36 | Eric Mittelette / playful warm gateway, just before the corridor meter |
| 1:55–2:05 | `npm install cassoulet / package size: 4.8 GB` stays readable after Eric and disappears before Mitsuru's entrance |
| 2:08 | Mitsuru Furuta / golden overclock gateway; three-band meter on the end wall behind him |
| 2:23–2:46 | Toulouse orbital hardware sits deeper in the D; its two-line `TOULOUSE / ORBITAL LINK` label remains present into the final zoom-out |
| 2:33–2:39 | Brief turn by the last meter, then escape |
| 2:39–2:53 | Faster backward/upward pullback exposes the complete title and the force-field floor connecting the T and D at corridor level; no raised or overhead copy is rendered |
| 2:50–3:00 | World-space **AI4Fun** signature and subtle anniversary marks; title settled by 2:53, seven-second final hold |

During the interior flight, circuit-board equalizer lanes run along the floor: quiet time-driven packets remain visible without an audio input, while bass, mids and treble raise short spectrum bars. The former bouncing balls and their physical platforms have been removed. In the T, Havok instead simulates 26 arcade tokens and 48 labeled legacy-code blocks. A deterministic timeline releases them, while music accents their motion; their bodies are disposed after the camera passes and recreated on a backward seek. Physics debris cannot block the camera. Five wall groups (one in the T and four in the D, including one behind Mitsuru and one before the exit) reuse recessed rectangles as three-column spectra: low frequencies (electro kick), mid frequencies (including viola fundamentals), and high frequencies (electro hats and viola harmonics, with a restrained viola-energy proxy). Their idle bars are visible from the approach to each corridor and respond more strongly to audio. Kicks and snares add brief pulses.

For each speaker, the beams rise from two floor-mounted projectors, initially pointing toward the camera before sweeping to either side of the card, while **two real dynamic spotlights** illuminate its physical backing and surrounding structure. The frame brightens as the name, title and associated artwork fade in; an extra pair of beams and the spotlights then sweep outward from the name's center like a theatrical marquee. The visible beams use lightweight emissive geometry rather than expensive volumetric scattering. OVERCLOCK intensifies the effect and drops briefly expand the computational core. These effects fade out by 2:35, leaving the title reveal and final hold clear.

### Configure speakers

Edit [src/content/speakers.ts](src/content/speakers.ts). Each portal accepts:

```typescript
{
  name: "Anne-Flore Bernard",
  demoTitle: "Musical Agentic Blender",
  startTime: 17,
  endTime: 39,
  gateTime: 29,
  visualTheme: "signal"
}
```

Adjust the example's speaker names and demo titles to match the event program. `gateTime` determines the fixed position along the camera route where the camera crosses the portal; keep it inside the introduction interval. Theme options: `signal`, `neural`, `playground`, `overclock`. Names and titles are textures on physical world-space meshes, not HTML overlays. Rehearse after changing timing or unusually long titles.

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

**Balanced** caps the render buffer at 2560×1440. **Native / 4K** uses full device resolution. Normal playback hides HTML controls and the cursor. At speed 1, the clock stops at exactly 3:00; only the already-finished final image remains on screen indefinitely.

Hidden tabs pause rather than silently skip the finale. Keep the show visible on the projector; run Strudel in a separate window instead of switching the show tab. A lost graphics context pauses the timeline and rebuilds GPU resources when the context returns. The timestamp, audio controller and settings survive; press Space after recovery.

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
- [Camera](src/camera/CameraPath.ts): deterministic T-to-D Catmull–Rom route, measured gaze transitions and a final full-title reveal unchanged by the arcade effects.
- [SpeakerPortal](src/scene/SpeakerPortal.ts): reusable physical gate, staged typography reveal, theme and animated ornaments.
- [EasterEggs](src/scene/EasterEggs.ts): time-derived scenes; seeking backward restores the correct joke/sculpture state without simulating forward.
- [PixelWorld](src/scene/PixelWorld.ts), [ArcadeCathedral](src/scene/ArcadeCathedral.ts), [ArcadeT](src/scene/ArcadeT.ts): local Kenney pixel parallax, grounded cabinets visible along the corridor, opening screen portal, arcade HUD and the door.
- [DemosceneTransition](src/scene/DemosceneTransition.ts): thin-instanced 2D-to-voxel transformation and speed lines over the bridge.
- [ArcadePhysics](src/scene/ArcadePhysics.ts): bounded Havok token cascade and destructible technical-debt wall, with cleanup and seek recovery.
- [MusicReactive](src/effects/MusicReactive.ts): seeded GPU-animated particles and shader-based MIDI ribbons.
- [ShowLighting](src/effects/ShowLighting.ts): ground-mounted portal laser beams and dynamic spotlights, scanning lights and GPU floor circuit traces with thin-instanced spectrum bars.
- [WallMeters](src/effects/WallMeters.ts): three-band LED columns in five groups, including behind Mitsuru and before the exit, driven by bass, viola/body and high-frequency signals.
- [EventBranding](src/scene/EventBranding.ts): original event artwork on the first server's end panel, above David's name and as two small final signatures. David's crest follows his gate visibility. The final marks fade in with **AI4Fun** after 2:50 and do not affect the camera or title geometry.
- [ShowController](src/engine/ShowController.ts), [protocol](src/engine/protocol.ts), [AudioAnalyzer](src/engine/AudioAnalyzer.ts): independently validated music inputs.
- [App](src/engine/App.ts), [Timeline](src/engine/Timeline.ts), [DevFestScene](src/scene/DevFestScene.ts): preload, stage lifecycle, deterministic clock and rendering.

`window.devfest` remains available for inspection: `start(155)`, `seek(173)`, `timeline.pause()`, `timeline.play()`, `returnToLobby()`. A full show uses normal playback speed 1.

### Supplied event artwork

Three original transparent PNGs from the supplied `Mascotte-20261002T171109Z-1-001.zip` are stored in [src/assets/event](src/assets/event):

- `mascot-flag-green.png`: `Mascotte/PNG/VERT/1-Drapeau-VERT@2x.png`
- `mascot-planet-violet.png`: `Mascotte/PNG/VIOLET/2-Planete-VIOLET@2x.png`
- `anniversary-cube-orange.png`: `Mascotte/PNG/ORANGE/5-Typo-cube-ORANGE@2x.png`

The illustrations retain their original colors and proportions; subdued material opacity integrates them into the architecture. The interior marks have opaque mounting plates so background lights do not show through them. Vite bundles the images locally. All three must finish loading before START is enabled; an asset-loading failure is surfaced rather than silently omitting the branding.

### Local Kenney arcade artwork

Only selected models and pixel sprites from the supplied Kenney archives are in [public/assets/kenney](public/assets/kenney). The cabinet GLB references its adjacent `Textures/colormap.png`; pixel sheets and four input-key icons use nearest-neighbor sampling and alpha testing. These resources are preloaded before SYSTEM READY. If a decorative Kenney asset cannot load, the error is logged and that decoration is skipped; the camera show continues. No CDN or network connection is used at runtime. Original CC0 license texts are retained in the asset folder, including the Mini Arcade contributor notice for Kenney, Fleur Keijsers and Guus Vermeulen.

## Verify and rehearse

```powershell
npm test
npm run build
```

Tests cover clock behavior, malformed inputs, frequency bands, transient decay, event/camera independence, speaker/cue timing, backward seeking, wall/roof clearance, camera turns below 45 degrees/second, projector framing for each joke and at least four seconds of complete speaker-panel framing, and full-title projection by 2:53 at several aspect ratios.

Scene-clearance tests additionally keep drifting dust below the camera, the orbiting core clear of walls/roof/camera, and Mitsuru's panel inside the corridor. Interior fog now dissipates during the escape, before the pullback reaches large distances; the solid letters remain visible rather than disappearing behind their glow. The pipeline uses up to 4x MSAA when supported, with FXAA as the fallback.

Browser validation additionally covers physical text readability, synthetic Web Audio input, input disconnection, real events from a separate Node process through the relay, offline asset loading, fullscreen and graphics-context recovery. Vite's large Babylon bundle warning is non-blocking; stage shaders and materials are preloaded instead of fetched during the performance.

### Validation results — 2026-10-02

- 41 unit tests pass; the production build passes TypeScript checking.
- All four complete speaker-name panels remain in frame for at least four seconds at 16:9; key speaker/joke shots were also inspected in the browser.
- A native 3840×2160 accelerated full-timeline stress run on the RTX 5090, with every reactive channel at maximum, rendered 3,632 frames. The largest sampled frame interval was 13.5 ms; all six phases and four speakers appeared, then the show held its final canvas-only frame.
- That cold-load/run made no external asset requests and logged no console errors.
- After the shot-clearance and reveal-fog corrections, a native 4K accelerated full-timeline run with 4x MSAA rendered 3,603 frames with no sampled frame interval above 16.7 ms. All four speakers appeared, the final camera pose was unchanged, and the browser reported no errors.
- Synthetic 110 Hz input produced strong bass/energy readings; disconnect left a caller-owned stream alive and did not stop the show.
- A quiet, steady 1 kHz signal increased average rendered luminance by approximately 17% without relying on kick/snare attacks. While paused, the live meter followed input changes but the camera and rendered image remained unchanged. Input monitoring also worked with visual reactivity disabled.
- Simulated permission denial and a display share without audio both showed actionable errors while playback continued.
- A simulated graphics reset at the fourth introduction rebuilt the scene, preserved the timestamp and connected event controller, and produced no invalid texture operations.
- The localhost relay delivered events from a separate Node process and rejected non-local browser origins.

### Before going on stage

- Replace demo titles and rehearse all spoken introductions against their actual gate windows.
- Run the production build, leave the local server running, and test with the Internet disconnected.
- Choose the real audio interface/browser-share source and confirm meters without feedback.
- Rehearse Strudel events against actual audio latency; direct events are more reliable than onset detection on a mixed feed.
- Profile **Native / 4K** on the final projector/GPU setup. The automated accelerated run is not a substitute for a three-minute, full-speed rehearsal with live musicians.
- Keep D closed, speed at 1, fullscreen enabled, and the show window visible. Use 6 to rehearse the escape and reveal.
- Pause/restart/phase shortcuts remain available if the live performance needs recovery.
