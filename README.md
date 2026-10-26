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

**Music is optional.** The home page defaults to **MP3 soundtrack** and
**Viola's Journey**. Music starts only after **PLAY SEQUENCE** or **Space**, never
on page load. Choose **No bundled music** for silent playback or **Strudel keynote**
for the live score instead. The bundled `Viola's Journey` MP3 is played
locally and analyzed in real time to drive the same bass, mid, treble, transient,
and energy reactions as the other music inputs. Visuals also work without music,
audio input, or the optional event bridge.

For one-click Strudel playback, choose **Strudel keynote** and a
**Strudel version**, then press **PLAY SEQUENCE** or **Space**. The same-origin
frame preloads local audio and starts both clocks through the confirmed
synchronized onset, without switching tabs or replacing the saved Strudel draft.

For MP3 playback, choose **MP3 soundtrack**, then select `Viola's Journey` or
`Viola & Trance`. Playback, pause, resume, and rehearsal seeks follow the visual timeline. The live input can
remain connected at the same time: the MP3 drives the complete scene while
Anne-Flore's viola microphone adds its detected energy over the soundtrack. The
microphone is analyzed locally and is never monitored through the speakers; no
permission is requested automatically.

Both bundled soundtracks use 320 kbit/s CBR MP3, preserving the original 48 kHz
stereo format. The original WAV files are retained alongside them for re-encoding;
the demo plays only the MP3 versions.

Additional MP3 files can be added under `public/assets/music/` and registered in
the `SOUNDTRACKS` list in `src/audio/soundtracks.ts`; the home-page selector is
populated from that catalog.

### Viola's Journey synchronization

`Viola's Journey` is the reference soundtrack for a dedicated measured accent
map, not the Strudel score's fixed 150 BPM grid. The MP3 decodes to **177.6 s**;
its clearest pulsed sections have periodicity around **134–137 BPM** (also
detectable at half-time), with weaker or less regular passages elsewhere.

The checked-in [audio map](src/audio/violasJourney.json) contains 274 low-register
accents, 150 cross-band bass attacks and 235 mid/high attacks. It is generated
from the actual MP3 using 22.05-kHz mono analysis, a 1024-sample Hann window,
roughly 10-ms hops, three-band positive spectral flux and adaptive local peak
picking. The file's SHA-256 is tested so replacing the soundtrack cannot
silently leave an obsolete map. With FFmpeg installed, regenerate it using:

```sh
npm run analyze:journey
```

[Journey timing](src/audio/violasJourney.ts) samples these accents against the
audio element's playback clock, without timers or a synthetic constant beat.
Live viola remains layered over the soundtrack. Local, continuous effect-clock
adjustments synchronize the violin fall, legacy wall, clap/CRT, popcorn, lens,
digital entrance, overflow and rocket to measured attacks:

| Moment | Baseline effect time | Journey onset |
| --- | ---: | ---: |
| Violin fall | 22.000 s | 22.141 s |
| Legacy wall | 38.200 s | 38.105 s |
| Clapperboard contact | 51.030 s | 50.876 s |
| Synchronized CRTs | 59.400 s | 59.346 s |
| Popcorn spill | 78.100 s | 78.154 s |
| Lens passage | 80.450 s | 80.450 s (fixed cinematic cue) |
| Digital entrance | 94.200 s | 94.200 s (fixed cinematic cue) |
| Buffer overflow | 110.700 s | 110.700 s |
| Rocket launch | 144.600 s | 144.643 s |
| Ceiling impact | 146.800 s | 146.618 s |
| Exit accent | 159.000 s | 158.850 s |

These shifts stay below 200 ms, affect scene effects rather than the camera
clock, and return to ordinary show time outside each local window. From 160 s
onward, structural timing is unchanged: the bridge still closes at 168–172.5 s
and the title settles at 173 s. A restrained light accent follows the measured
172.569-s attack without changing the final camera pose. Pause, seek and replay
recompute the score directly. `Viola & Trance`, Strudel and silent playback keep
their original musical timing.

Closely spaced measured cues use automatically narrowed, non-overlapping
retiming windows, so the new lens entry and following popcorn accent remain
continuous and monotonic rather than competing for the effect clock.

Integrated playback uses the Strudel core scheduler without creating a hidden
CodeMirror editor or its drawing/highlighting loop. The normal editor remains
available at `/strudel/`; its drawing pauses when that tab is hidden, while
audio and synchronization continue. This avoids competing with the 3D render
loop without reducing the instrumental palette or graphics quality.

Three original arrangements share the [viola-friendly score](examples/devfest-viola.strudel):

| Version | Key | Direction |
| --- | --- | --- |
| Arcade symphonique | D minor | Retro pulse/FM colors, answering orchestra and a growing trance accompaniment |
| Cinema suspendu | G minor | More lyrical piano, harp, flute and strings, with space for live viola |
| Trance heroique | D minor, final D major | Stronger electronic build, orchestral summit and a brighter epic resolution |
| Previous keynote | Bb minor | The preserved [earlier synth-only score](examples/devfest-keynote.strudel) |

All last three minutes at 150 BPM. The new arrangements use seven acoustic
families from 18 locally hosted CC0 samples alongside pulse, FM, supersaw, sub,
acid and choir-like synthesis. They start gently, rise through the arcade,
prepare the clap stop, restart with an orchestral pickup and an uninterrupted
beat grid towards David, then leave the lens passage to the viola. The bigger
second act opens its texture from **147.2 s**, preparing the **159-s** exit over
11.8 seconds rather than adding a last-second snare rush. The settled title
resolves at **173 s**, with no new notes after 176 s.

The standalone **local Strudel performance page** at `/strudel/` supports the
same choices. To hear a revised score, **Stop**, select its version, click
**Load selected score / 3:00**, confirm replacement, then **Start show + music**.
Selection alone does not replace an existing editor draft. See
[STRUDEL_SYNC.md](STRUDEL_SYNC.md) for launch, helpers, cue windows, local
instruments, licensing and rehearsal diagnostics.

## The show

| Time | Scene |
| --- | --- |
| 0:00–0:05.925 | DEVFEST AI4FUN / AGENDA opens the show without a giant central cabinet; the fullscreen retro-gaming shader starts at 0:04.3 and clears at the physical panel crossing, 0:05.925, revealing the corridor |
| 0:05–0:31 | Fixed pixel-art decals, scenery and small luminous pixels stay flat against the T's side walls. The six larger reactive light panels are mounted just in front of the wall surface at height 15, above the grounded Kenney cabinets, not floating in front of their screens |
| 0:17–0:31 | Anne-Flore's cyan gateway; the violin and bow are 25% larger and fade in with exactly the same 17.25–19.05-s envelope as her name, including bloom. Nearby Pong paddles rally from 17.4 s; the final shot physically hits the violin near 22 s, releasing its voxel cubes into a Havok fall |
| 0:27–0:34.5 | The already-present `GET /pain-au-chocolat` panel is discovered closer to Anne-Flore, square across the corridor; its text switches to `301 Moved Permanently / Location: /chocolatine` exactly at 0:29; no falling bonus tokens |
| 0:34.5–0:41 | The FINAL BOSS announces LEGACY CODE before its translucent Havok wall appears and collapses at 0:38 |
| 0:41–0:49 | `$ git rebase --continue` announces EXIT UNLOCKED, then the T door opens |
| 0:46–0:52 | The original giant clapperboard is already present during the approach, below LEVEL COMPLETE, and snaps shut in 0.18 seconds from 0:50.85. The fullscreen CRT transition holds a green phosphor line from 0:51.135 to 0:51.38, then reopens on CINEMA and clears by 0:52.18; no black plane |
| 0:51–1:06 | A symmetrical cinema cathedral with eight full curved CRT screens: MS-DOS, CONFIG.SYS, AUTOEXEC.BAT, Windows 95, blue-screen jokes, floppy installation and a Toulouse BBS; all briefly flash DEVFEST at 0:59.4 |
| After the last TV | A continuous floor-to-ceiling Matrix mural behind the snack machine runs from the black floor/ceiling strip to the right wall edge; larger `DEVFEST / TOULOUSE` glyphs remain readable within the animated rain |
| 1:06–1:23 | David Rousset is introduced **once**, as a movie premiere projected onto a world-space cinema screen with his configured demo title |
| 1:17–1:20 | Giant front-facing reels and rotating sprockets transport a black-and-white film ribbon; two raised buckets tip inward at 1:17.55 and spill 72 Havok kernels from 1:18.1. The initial cascade remains visible before the rush; its physics continues behind the transition |
| 1:20–1:34.2 | At **80.000 s** the camera accelerates into the already-previewed lens at 80.45 s. The enclosed 3D tunnel keeps its cyan/violet design, calmer beat-driven flight and physical final 90-degree right turn. The actual opening at its end reveals the D while the tube walls remain around it; the camera passes through this mouth at **94.200 s exactly**, without an intervening iris or full-screen cut |
| 1:34.2–1:56 | Return to the D, then Eric Mittelette's gateway and converging data streams, without the obsolete `agent.observe()` / `agent.plan()` panels |
| 1:47–1:56.7 | A transparent buffer tank faces the incoming camera, perpendicular to the right wall. 32 cubes progressively fill the same volume; a 33rd cube arrives at 1:50.7, making shader water ripple and spill over the lip. Only then does `BUFFER OVERFLOW / console.log('just one more...')` appear |
| After the buffer | The original astronaut faces the passage in the next corner. At 1:56.2–1:58.4 he grows proportionally from his normal 6.5-unit height to 10.4, feet fixed, while the adjacent existing data arch rises. No new arch or duplicate astronaut |
| 1:57–2:05 | A simulated terminal types `$ npm install cassoulet`, downloads 4.8 GB with a progress bar and blinking cursor, and prints installation completion at 2:04.4 |
| 2:04.4–2:14 | Exactly when installation reaches 4.80 GB, 64 real NVIDIA beans cans start falling, colliding and accumulating into a mountain; no `CASSOULET POWER` panel |
| 1:54–2:12 | A traveling architectural pulse progressively raises six symmetrical data gates, shifting cyan to gold; it continues behind the cassoulet gag and hands off to Mitsuru without an empty corridor |
| 2:08–2:35 | Mitsuru Furuta / floating orbital name instead of another rectangular card; denser golden data streams and a three-band meter behind him build the D climax |
| 2:20–2:29 | A procedural deployment rocket waits at the **next corner**, before the right turn toward Orbital Link. After a readable approach, it launches at 2:24.6 and hits the actual ceiling underside at 2:26.8: a brief flash, expanding shockwave and 240 falling sparks. The pad stays grounded; the camera follows the ascent then smoothly hands over to Orbital Link |
| 2:23–2:46 | Toulouse orbital hardware sits deeper in the D; its two-line `TOULOUSE / ORBITAL LINK` label remains present into the final zoom-out |
| 2:33–2:39 | Brief turn by the last meter, then escape |
| 2:39–2:53 | Faster backward/upward pullback exposes the complete title and the force-field floor connecting the T and D at corridor level; at 2:48–2:52.5 its two spans rise like drawbridges and telescope into the T exit and lower D doorway |
| 2:50–3:00 | World-space **AI4Fun** signature and subtle anniversary marks; title settled by 2:53, seven-second final hold |

During the interior flight, circuit-board equalizer lanes run along the floor: quiet time-driven packets remain visible without an audio input, while bass, mids and treble raise short spectrum bars. The former bouncing balls and their physical platforms have been removed. In the T, Havok simulates the violin/bow cubes and 48 labeled legacy-code blocks; bonus tokens have been removed in favor of the chocolatine gag. The cinema adds two synchronized popcorn cascades totaling 72 kernels with seat ledge collisions. Both the final Pong-ball/violin collision and the 64-can mountain are simulated once with the same Havok engine at 60 fixed steps per second; recorded poses are sampled during playback for exact pause/seek/replay, with no new live rigid bodies. The violin's gravity is activated by measured ball contact, not a timed fallback. The can pile includes basket, floor, walls and can-to-can collisions. The buffer tank instead uses deterministic cube filling and lightweight water-surface/overflow shaders, not a fluid simulation. Physics debris cannot block the camera, and temporary bodies are cleaned up. Five wall groups (one in the T and four in the D, including one behind Mitsuru and one before the exit) reuse recessed rectangles as three-column spectra: low frequencies (electro kick), mid frequencies (including viola fundamentals), and high frequencies (electro hats and viola harmonics, with a restrained viola-energy proxy). Their idle bars are visible from the approach to each corridor and respond more strongly to audio.

The cinema's seats, CRTs, screen support, both popcorn buckets, film/reels and giant camera are preloaded and visible from entry at 51.18 seconds, not enabled one prop at a time. Their narrative actions still occur later: David's name fades in, the buckets tip and spill, and the camera iris is crossed. Only optical/projector/space effects keep their later reveal windows. The drawbridges stay closed throughout the final hold and reset when seeking backward.

The tunnel's four speaker trails are driven by the existing Web Audio FFT:
cyan **40–180 Hz** (bass/kick), coral **180–700 Hz** (viola fundamentals),
violet **700–2400 Hz** (upper mids/harmonics), and gold **4–14 kHz**
(percussion/air). Band energy changes their width, glow and waviness, without
integrating audio into the flight clock. The physical tunnel is rendered on
an isolated layer of the existing scene, shared by the lens preview and the
transition; its extra render pass stops at 94.2 s. Only 80–94.2 s of camera travel
is locally remapped; the route before/after, MP3 and final reveal are preserved.
The original Strudel score retains its existing musical phrases independently
of the new visual rush.

The calmer flight averages about **67.5 world units/s**, down from 87.3.
Vertical travel spans about **22 units** instead of 50, with banking limited
to about **13 degrees**. Its speed profile analytically integrates the measured
Journey kick attacks, then normalizes the travelled distance over 80.45–94.2 s.
This adds smooth musical acceleration without frame-rate drift, while keeping
the exit cue exact on pause, seek and replay. The tunnel's surface shaders,
ribs, palette and four FFT trails are unchanged. The former metallic iris is
removed: the finite tube renders into a transparent target, and the D is visible
only through its real opening. This keeps both environments on screen together,
with the room prepared before it becomes visible and a matching exit-camera gaze.

The supplied animated T-800 walks toward the camera in the left-turn passage
at the D entrance, beside rather than across the main camera lane. Its original
**The Chase** skeletal clip and translation are sampled by timeline time
(60.5–69.5 s), including pause, rewind and replay; no autonomous animation timer.
It is now **three times its original height**: 21.6 rather than 7.2 world units,
with its walk animation preserved. Its straight lane now stays inside the
front corridor rather than drifting diagonally through a wall. A restrained
camera glance keeps it nearer the viewing axis before David takes over; the
animated silhouette is tested against walls, floor, ceiling and actual scenery
occlusion, not just its static model bounds.

Both film reels rotate continuously in opposite directions at 0.55 rad/s on the
effect clock. Their angle does not depend on instantaneous bass amplitude,
avoiding phase jumps and apparent stalls; pause and rehearsal seeks reproduce
the same reel and sprocket positions.

### Local NVIDIA SimReady additions

The intro now includes real, locally converted NVIDIA assets: retro Pong,
a pastry collectible, a physical mountain of beans cans, the developer snack machine and a launch-support
arm beside the existing rocket. The snack machine is flush with the left side
of the front D wall, already present from the cinema's entry at 51.18 s, so
it is discovered naturally behind the TVs rather than popping in at 61.35 s.
Only its `404: HEALTHY SNACK NOT FOUND` caption and snack-drop interaction
occur in the short passage before David. The machine remains opaque until the
cinema ends at 87.6 s; it leaves the frame naturally as the camera turns.
Pong retains its paddles and ball without a `PONG / HUMAN vs AI` sign, now
beside Anne-Flore and sharing the final ball trajectory with the violin's
recorded physical impact.
The arm is preloaded and physically present from the digital entry at 95 s,
like the rocket itself, with no reveal/fade at 139.5 s. It reaches toward the rocket and retracts
at liftoff. The camera spline, music, televisions and speaker cards are unchanged;
the lens approach gaze follows its requested closer placement.

The donut, small mobile robot and forklift collision have been removed from
the presentation following the revised direction; their original converted
models remain in the nine-asset inspection library.

Press **D** for independent flags, placement/animation controls and rehearsal
jumps. Open `/?asset-viewer=simready` for model/material inspection, or
`/?simready=0` for the original intro without NVIDIA effects or their preload.
See [integration and reproduction commands](docs/simready-integration.md),
[conversion results](docs/simready-conversion-report.md) and
[NVIDIA attributions](docs/simready-attribution.md).

The wall beside the snack machine carries a local GPU character-rain shader:
30 columns of readable ASCII glyphs scroll independently, with bright leaders
and fading tails. A 512-pixel glyph atlas is generated once from the local
monospace font; only shader time changes during playback. Fragments of
`DEVFEST TOULOUSE` are embedded in two staggered rows and share the ordinary
rain brightness, so they can be recognized without becoming another title
card. The code surface sits in front of the wall's recessed panels rather
than being obscured by them, and follows the snack-machine feature flag.

The simulated npm terminal is a world-space texture, not a real subprocess.
Typing, cursor, progress and completion all use show time; canvas uploads are
limited to 10 Hz. `CASSOULET_INSTALL.complete` is also the exact start of the
physical can delivery, with no separate timer or early rounded “4.80 GB”.

The clap's original [CRT transition shader](src/effects/ClapCrtTransition.ts) combines square arcade pixels, restrained RGB separation and row interference, a soft green phosphor shutdown line, then a curved CRT reopening with raster scanlines and an RGB shadow mask. Its baseline [timing](src/content/showBeats.ts) spans 50.65–52.18 seconds: the scene swaps at effect time 51.18, hidden behind a 245-ms phosphor hold, and the image starts reopening at effect time 51.38. The Journey profile re-times the entire effect window together, keeping the scene handoff behind the closed tube. The shader is compiled before SYSTEM READY, follows the deterministic effect clock for pause/seek/replay, and is detached outside this window. As a narrative transition it remains active when optional Bloom/FXAA is disabled, just as the former physical shutter did.

The opening [retro-gaming entry shader](src/effects/ArcadeEntryTransition.ts)
uses chunky pixels, a limited-color dithered palette, RGB separation, subtle
row glitches and CRT scanlines from **4.3 to 5.925 s**, starting **1 s later**
than the previous 3.3-s version. Its strongest pixel burst is just before the
crossing, then the effect fades completely by the physical panel crossing at
approximately **5.925 s**, leaving the corridor unobscured. The
`DEVFEST AI4FUN / AGENDA` panel fades out before the camera reaches its plane,
avoiding oversized clipped lettering. The shader is precompiled before
SYSTEM READY, remains available with optional post-processing disabled, and
follows camera/show time exactly for pause and seek. It adds no rendering pass
outside that 1.625-second window. Both transition shaders share the
[timed post-process lifecycle](src/effects/TimedPostProcess.ts), including
pipeline-rebuild ordering and cleanup.

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

Captured input is processed locally, never recorded or uploaded, and never
monitored through the speakers. This is independent of the optional embedded
Strudel music output. Disconnect releases captured microphone/display tracks.
Permission denial, muted/lost input or a disconnected bridge does not stop the timeline.

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

Call these functions from the actual note-playback/scheduler callbacks in your
Strudel setup, **not when a pattern is merely constructed**. The local editor
and bundled compositions already use this integration; an external Strudel
setup must wire its own playback callbacks and audio routing.

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
- [CinemaWorld](src/scene/CinemaWorld.ts), [CinemaAssets](src/scene/CinemaAssets.ts): local preloaded Sketchfab models, animated slate and T-800, CRT synchronization, David's premiere, linked film reels and giant lens.
- [PhysicalTunnel](src/effects/PhysicalTunnel.ts), [TunnelFlight](src/camera/TunnelFlight.ts): enclosed 3D serpentine course, calm rhythmic camera, four FFT-driven speaker trails and shared preview render; [LensVortexTransition](src/effects/LensVortexTransition.ts) composites the room through the actual tube opening.
- [ClapCrtTransition](src/effects/ClapCrtTransition.ts): precompiled fullscreen arcade-to-CRT shader, phosphor-line handoff, deterministic uniforms and no extra render pass outside the transition.
- [ArcadeEntryTransition](src/effects/ArcadeEntryTransition.ts): precompiled retro-gaming shader, starting at 4.3 s and clearing at the opening AI4FUN / AGENDA panel crossing.
- [CinemaPopcorn](src/scene/CinemaPopcorn.ts): 36 short-lived Havok kernels with static floor/seat ledge colliders and seek-safe cleanup.
- [DigitalMoments](src/scene/DigitalMoments.ts): two different thin-instanced data-stream passages for Eric and Mitsuru, intensified by the music without moving the camera.
- [EasterEggs](src/scene/EasterEggs.ts): time-derived scenes; seeking backward restores the correct joke/sculpture state without simulating forward.
- [PixelWorld](src/scene/PixelWorld.ts), [ArcadeCathedral](src/scene/ArcadeCathedral.ts), [ArcadeT](src/scene/ArcadeT.ts): local Kenney pixel parallax, grounded cabinets visible along the corridor, opening screen portal, arcade HUD and the door.
- [DemosceneTransition](src/scene/DemosceneTransition.ts): thin-instanced 2D-to-voxel transformation and speed lines over the bridge.
- [ArcadePhysics](src/scene/ArcadePhysics.ts): destructible technical-debt wall, with cleanup and seek recovery; no bonus-token cascade.
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

Only selected, licensed GLBs from the supplied SketchfabModels directory are in [public/assets/cinema](public/assets/cinema). Twelve staged models preload before SYSTEM READY, including the supplied CC-BY-4.0 T-800 and its original walk clip; the former floating theatre fragment is retained locally but no longer loaded or displayed. Camera ground and director-chair presentation socle are removed before bounds normalization; seats and director chair use the same physical height. Repeated seats/televisions/spotlights share geometry instances. The hero camera uses geometry-sharing clones so its entry fade works without unsupported instance-visibility warnings. A missing optional model logs an error; a missing required Terminator walk clip fails preparation explicitly. The 1.37-million-triangle, noncommercial-licensed movie projector was deliberately excluded; its substitute is lightweight geometry. See [CREDITS.md](CREDITS.md) for attribution. There are no runtime requests to Sketchfab.

## Verify and rehearse

```powershell
npm test
npm run build
```

Tests cover clock behavior, malformed inputs, frequency bands, transient decay, event/camera independence, speaker/cue timing, backward seeking, CRT transition envelopes/precompilation/errors/pipeline rebuilds, full curved CRT coverage, stable wall sprites, spotlight hits inside David's card, physical asset normalization, camera fading, popcorn/overflow cleanup, continuous D escalation, wall/roof clearance, camera turns below 45 degrees/second, at least two seconds of full unlabelled clap framing and four seconds for speaker names, and full-title projection by 2:53 at several aspect ratios.

Scene-clearance tests additionally keep drifting dust below the camera, the orbiting core clear of walls/roof/camera, and Mitsuru's panel inside the corridor. Interior fog now dissipates during the escape, before the pullback reaches large distances; the solid letters remain visible rather than disappearing behind their glow. The pipeline uses up to 4x MSAA when supported, with FXAA as the fallback.

Browser validation additionally covers physical text readability, synthetic Web Audio input, input disconnection, real events from a separate Node process through the relay, offline asset loading, fullscreen and graphics-context recovery. Vite's large Babylon bundle warning is non-blocking; stage shaders and materials are preloaded instead of fetched during the performance.

Current music revision: **58 targeted tests across five files** and the
TypeScript/Vite production build pass. Tests cover all three arrangements,
global post-clap beat alignment, speaker rests, the longer exit preparation,
finite endings, selection and launch behavior. All three choices were launched
in a real browser without leaving the main tab; the existing editor draft was
preserved, and the 3D clap was visually checked at 49.8 s.

**Full real-audio rehearsal is still unverified for all three arrangements.**
The previous test session reported a running AudioContext with its clock stalled
near 0.005-0.011 s, reproduced with a native oscillator independent of Strudel.
Earlier zero-RMS measurements also used an invalid tap of offline reverb
rendering and cannot certify actual silence. The verifier now taps only live
contexts and supports explicit `AV_CAPTURE=pcm` without the test WebRTC relay.
The native clock is advancing normally in the October 8 performance tests;
the dense real-audio passage now matches the visual-only frame-rate control.
See [STRUDEL_SYNC.md](STRUDEL_SYNC.md) for the three full-run commands; rehearse
on a machine with a functioning audio clock before stage use.

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
