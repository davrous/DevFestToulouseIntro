# Into the unexpected

DevFest Toulouse 2026 closing-keynote opening. **Phase A: the title-labyrinth / camera proof of concept.** A silent, deterministic, three-minute Babylon.js sequence; not a pre-rendered film.

## Run locally

Requires Node.js 22.12+ (or 20.19+).

```powershell
npm ci
npm run dev
```

Open http://127.0.0.1:5173. Wait for **SYSTEM READY**, then **PLAY SEQUENCE**. Fullscreen is requested only from a user gesture; it is optional. **Preview the reveal** starts at 2:35.

For a stage build:

```powershell
npm run build
npm run preview
```

Open http://127.0.0.1:4173. Keep the local server running. Dependencies are needed during installation/build, but **no Internet is needed at runtime**. Do not open the HTML using `file://`.

## Operator controls

| Key | Action |
| --- | --- |
| Space | Start / pause / resume (replays after the final hold) |
| R | Restart |
| 1–5 | Boot / compile / build / run / overclock |
| 6 | Reveal preparation at 2:35 |
| D | Flight-control diagnostics, seek, playback speed, bloom and resolution |
| F | Toggle fullscreen |
| Escape | Return to lobby when not fullscreen |

Browser controls retain their normal keyboard behavior when focused. Playback hides all HTML UI and the cursor after inactivity. The final frame holds indefinitely. Hidden tabs pause the show instead of silently missing the finale. If the graphics context is lost, the show pauses and rebuilds the renderer when the context returns, preserving the timestamp and quality settings; press Space after the recovery message. Audio cannot interrupt this prototype: it has no audio dependency.

**Balanced** defaults to a maximum 2560×1440 render buffer. Use **Native / 4K** in flight control for full device resolution. Resolution and speed can be changed without restarting. Benchmark the production build on the actual stage PC/projector before selecting native 4K; 60 FPS on that hardware is a target, not a measured guarantee.

## Central visual construction

- [Title geometry](src/content/title.ts) defines centered seven- and eight-letter rows as a custom 5×7 architectural alphabet. Every lit cell is a real enclosed, extruded room, not a flat title texture.
- [Labyrinth](src/scene/Labyrinth.ts) builds floors, roofs, boundary walls, internal panels and light traces from those exact cells. Static geometry uses thin-instance batches rather than hundreds of separate meshes.
- [Camera path](src/camera/CameraPath.ts) stays **inside the first D** for the entire interior journey. The camera follows a time-keyed Catmull–Rom path; changes in height, local scenery and turns disguise the plan. This first prototype deliberately proves one letter's interior before extending the journey to speaker districts.
- At **2:30–2:43**, the camera settles and turns back into the room. At **2:43**, it retreats through a real opening in the southern wall. The ascent and lateral move gradually expose the entire connected visual composition.
- At approximately **2:53**, both words become readable. At **2:57**, the camera reaches a fixed final composition and stays there.
- No scene swap, replacement title, random free flight or camera driven by audio. The view at the end is the same geometry traversed at the start.
- All geometry, textures and lighting are generated locally. The seed is `DEVFEST_TOULOUSE_2026`. Fonts on world-space panels use the operating system's monospace font, with no font downloads.

## Architecture / extension points

- [App](src/engine/App.ts): preload, render loop, stage lifecycle and operator controls.
- [Timeline](src/engine/Timeline.ts): deterministic master clock, seek, pause, speed and phase boundaries.
- [DevFestScene](src/scene/DevFestScene.ts): scene lighting, fog, bloom and time-based updates.
- [Interior](src/scene/Interior.ts): spatial signs, data banks and a suspended computational core.
- [Diagnostics](src/debug/DebugPanel.ts): runtime status and controls.

`window.devfest` exposes the prototype for local inspection: `start(155)`, `seek(173)`, `timeline.pause()`, `timeline.play()`, `returnToLobby()`. This is a development interface, **not yet the planned Strudel event API**.

### Next milestones, intentionally not claimed as complete

**B:** reusable speaker portals and four configurable demo titles. **C:** Toulouse/developer Easter eggs, richer particles and atmospheric transitions. **D:** Web Audio analysis and Strudel events. **E:** final choreography, live-performance rehearsal, hardware profiling and stage reliability.

The phase names and timestamps already exist as scaffolding, but there are no speaker introductions or audio-reactive behavior in Phase A.

## Verification

```powershell
npm test
npm run build
```

The 12 tests cover clock behavior, seek determinism, seeded geometry, the sampled camera path inside actual letter volumes, exit clearance, reveal continuity, interior turns below 45 degrees/second, and the projection of every letter's bounding corners inside the frame by 2:53 at multiple aspect ratios.

### Prototype validation — 2026-10-02

- Production build type-checked and served locally; interior, escape and final composition inspected in Chromium.
- Play, pause/resume, restart, phase jump, diagnostics, bloom control and return-to-lobby exercised in the browser.
- Cold load with non-local HTTP requests blocked: no external requests or failed asset requests.
- Native 3840×2160 accelerated full-timeline run on an NVIDIA RTX 5090: all six phases, 3,639 rendered frames, no sampled frame interval above 16.7 ms, and a clean final hold. This is a smoke test, not a substitute for a full-speed stage rehearsal.
- Simulated WebGL context loss: clean renderer reconstruction, timestamp preserved at 1:30, manual resume successful, no invalid texture operations.
- Locked dependencies audited without advisories at validation time.

Vite reports a non-blocking large-chunk warning for the Babylon engine bundle. This locally served show intentionally loads the renderer and shaders before playback rather than fetching them during choreography.
