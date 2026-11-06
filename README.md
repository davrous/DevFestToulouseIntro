# Into the unexpected

A three-minute real-time opening for the DevFest Toulouse 2026 closing keynote. Babylon.js + TypeScript + Vite. The camera starts in the T of the actual extruded title, travels through arcade, impossible cinema, camera lens and projector beam into the digital D, then reveals **DEVFEST / TOULOUSE**. No scene swap, prerecorded film, runtime CDN, or audio-driven camera.

For future agents and cross-machine handoff, start with [AGENT_CONTEXT.md](AGENT_CONTEXT.md): show intent, preserved decisions, timing, focused code map, known pitfalls and validation history.

### Animated retro arcade

The six existing Kenney machines now include local Pong, original Donkey Kong
arcade and Super Mario Bros. video monitors, plus two deterministic pinball
attract sequences. The middle-left pinball celebrates multiball / AI4FUN around
10–14 s. Camera, music, cabinet placement and show duration are unchanged.
Press **D → ARCADE / GAMES + PINBALL** for independent feature flags, previews,
timeline/decoder diagnostics and tuning.

See the [integration and rehearsal guide](docs/arcade-integration.md) for
geometry, media preparation (`npm run arcade:prepare`), rights limitations,
transport behavior, screenshots and `npm run verify:arcade`.
Videos/posters are included locally; FFmpeg is only needed to regenerate them.
**The supplied Nintendo/Tenor footage has no identified redistribution grant;
clear its rights before public distribution.**

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

## No runtime CDN / day-of-demo reproducibility

The supplied intro and four bundled Strudel scores use **only their own origin**:

| Component | Runtime source |
| --- | --- |
| Babylon.js / glTF loaders **9.28.0** | Installed npm modules compiled into the local Vite JavaScript chunks |
| Havok **1.3.14** | Local JavaScript plus the imported, hashed local `.wasm` asset |
| Strudel and audio worklets | Bundled npm modules; worklet code is generated as local `data:`/`blob:` modules |
| Soundtrack MP3/WAV, drums, orchestra | Local `assets/music/` and `assets/strudel/`; 3 drum + 18 orchestra WAV samples |
| Arcade gameplay and posters | Local `assets/arcade/`; three silent MP4s, PNG fallbacks, four phase-offset video decoders |
| 3D models and textures | Local assets; all 25 GLBs audited, with embedded or existing local resources |
| Fonts and artwork | System fonts, local PNGs and generated Canvas textures; no Google Fonts/CDN |

Babylon includes default CDN URLs for **optional** Draco/meshopt/KTX2 decoders
and other tools. This version does not use those compressed formats or request
those defaults. Documentation/credit URLs and the SVG `xmlns` identifier are
not runtime downloads. The offline check rejects introducing an unverified
network decoder or an external model resource.

All direct dependency versions are exact, and the committed
[`package-lock.json`](package-lock.json) locks the transitive tree and integrity
hashes. The freeze retained all **198 existing package entries without a
version upgrade**. npm registry URLs in that lockfile are for installation,
not playback. Use `npm ci` during preparation; do not run `npm update`, delete
the lockfile or rebuild against new dependencies immediately before the show.

Run `npm run verify:offline` after changes. It creates a fresh production browser
context, blocks every third-party HTTP(S) origin, disables service workers,
checks the show at 16 timeline moments, plays both Journey formats, opens all nine viewer
assets and starts all four scores including their audio worklets and all 21
local WAV samples. [Latest evidence](docs/offline-validation.json) records zero
external requests and zero browser errors. This covers the supplied scores,
not arbitrary new URLs added later in the live editor.

For the event, retain the **complete tested `dist/` folder** and an already
prepared local HTTP server (`npm run preview` on the prepared project). Serving
that build does not reinstall packages or contact npm/CDNs. Azure's URL serves
these same local-to-the-site assets, but still requires connectivity to Azure;
a local HTTP copy avoids that remaining network dependency. Do not open the
build with `file://`. Keep the rehearsed browser/GPU driver configuration too:
local libraries do not freeze browser or driver updates.

**Music is optional.** The home page defaults to **Viola's Journey soundtrack**
in **MP3 320 kbit/s**. Music starts only after **PLAY SEQUENCE** or **Space**, never
on page load. Choose **No bundled music** for silent playback or **Strudel keynote**
for the live score instead. The selected `Viola's Journey` file is played
locally and analyzed in real time to drive the same bass, mid, treble, transient,
and energy reactions as the other music inputs. Visuals also work without music,
audio input, or the optional event bridge.

Both Journey formats fade smoothly over their last **1.25 seconds**, using the
earlier of the actual file ending or the 180-s show limit. The envelope is
applied through a dedicated Web Audio output gain after analysis, so live input
and visual frequency data are unchanged. Pause, seek, restart and lobby return
restore the appropriate level. Viola's Journey ends at 177.6 s; its fade must
therefore finish there, not start near 180 s.

For one-click Strudel playback, choose **Strudel keynote** and a
**Strudel version**, then press **PLAY SEQUENCE** or **Space**. The same-origin
frame preloads local audio and starts both clocks through the confirmed
synchronized onset, without switching tabs or replacing the saved Strudel draft.

For soundtrack playback, choose **Viola's Journey soundtrack**, then select
**MP3 320 kbit/s** or **WAV original (lossless)** under **Audio format**.
Playback, pause, resume, and rehearsal seeks follow the visual timeline. The live input can
remain connected at the same time: the soundtrack drives the complete scene while
Anne-Flore's viola microphone adds its detected energy over the soundtrack. The
microphone is analyzed locally and is never monitored through the speakers; no
permission is requested automatically.

Only Viola's Journey is offered in the soundtrack selector. The default MP3 uses
320 kbit/s CBR (about 7.1 MB); the original lossless WAV uses 16-bit PCM
(about 34.1 MB). Both are 48 kHz stereo, last 177.6 s, and use the exact same
measured accent map, effect timing, FFT analysis and final fade. Choosing WAV
does not convert the MP3: it plays the original local file. The older Trance
files remain in the asset archive but are no longer offered.

Additional audio files can be added under `public/assets/music/` and registered in
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
| CRT lightning / synchronized joke | 59.200 s | 59.200 s (fixed cinematic cue) |
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
| 0:00–0:05.925 | DEVFEST AI4FUN / CLOSING KEYNOTE and the green DevFest mascot open the show; the logo shares the panel's fade. Its height still matches the camera at 5.925 s, and the retro shader runs from 4.3 s to the crossing |
| 0:05–0:31 | Fixed pixel-art decals, scenery and small luminous pixels stay flat against the T's side walls. The six larger reactive light panels are mounted just in front of the wall surface at height 15, above the grounded Kenney cabinets, not floating in front of their screens. Each cabinet is placed using its actual scaled/rotated bounds, with a 0.8-unit gap to the inner wall; model sizes and the camera lane stay unchanged |
| 0:17–0:31 | Anne-Flore's cyan gateway; the violin and bow are 25% larger and fade in with exactly the same 17.25–19.05-s envelope as her name, including bloom. Nearby Pong paddles rally from 17.4 s; the final shot physically hits the violin near 22 s, releasing its voxel cubes into a Havok fall |
| 0:27–0:34.5 | The preloaded `GET /pain-au-chocolat` panel switches to `301 / Location: /chocolatine` at exactly **0:28 on camera time**, advanced by 0.5 s without musical cue shifting. The whole printed panel fades from 31.85 to 32.55 s, before the 32.75-s camera crossing, avoiding a black screen |
| From 0:34.4 | The original 48 legacy-code cubes assemble in twelve colorful L/J tetrominoes, lock into their unchanged homes and show `BUILD FAILED`. The 38.2-s impact cue releases a genuine recorded Havok collapse, continued to rest at 46.2 s. The debris remains in place for the rest of the show, naturally leaving the camera frustum rather than disappearing on a timer |
| 0:38.2–0:46.03 | The impact sends a progressive cyan packet through physical copper traces to a four-panel XOR CPU gate. Havok debris collides with its frame and four kinematic shutters, which follow the same retraction/rotation as the visible gate; cubes cannot pass through a closed door. The correct XOR symbol powers up, pins unlock and beveled shutters slide diagonally and fold into side rails. Fully open at 45.7 s, they physically clear the unchanged exit camera |
| 0:46–0:52 | The original giant clapperboard is already present during the approach, below LEVEL COMPLETE, and snaps shut in 0.18 seconds from 0:50.85. The fullscreen CRT transition holds a green phosphor line from 0:51.135 to 0:51.38, then reopens on CINEMA and clears by 0:52.18; no black plane |
| 0:51–1:06 | Eight curved CRTs initially show their retro programs. At **59.200 s exactly**, one strong branching lightning strike links them and all screens switch to `AI UPDATE / 99%`, `Time remaining: 42 years` and `Fallback: more cassoulet`. The joke remains after the single decaying flash |
| After the last TV | A continuous floor-to-ceiling Matrix mural behind the snack machine runs from the black floor/ceiling strip to the right wall edge; larger `DEVFEST / TOULOUSE` glyphs remain readable within the animated rain |
| 1:06–1:23 | David Rousset is introduced **once**, as a movie premiere projected onto a world-space cinema screen with his configured demo title |
| 1:17–1:20 | Giant front-facing reels and rotating sprockets transport a black-and-white film ribbon; two raised buckets tip inward at 1:17.55 and spill 72 Havok kernels from 1:18.1. The initial cascade remains visible before the rush; its physics continues behind the transition |
| 1:20–1:34.2 | At **80.000 s** the camera accelerates into the already-previewed lens at 80.45 s. The enclosed 3D tunnel keeps its cyan/violet design, calmer beat-driven flight and physical final 90-degree right turn. The actual opening at its end reveals the D while the tube walls remain around it; the camera passes through this mouth at **94.200 s exactly**, without an intervening iris or full-screen cut |
| 1:34.2–1:56 | Return to the D, then Eric Mittelette's gateway and converging data streams, without the obsolete `agent.observe()` / `agent.plan()` panels |
| Approximately 1:54–1:58 | A fixed red-bordered **Skynet** warning on the east wall faces the unchanged camera before its right turn toward the npm terminal and T-800. The locally bundled logo sits above `Warning, it's operational!`, with clear separation and room around the wall edge. Only the red triangle pulses gently every 1.2 seconds; the Skynet wordmark and caption stay steady. Everything is preloaded, with no timed pop. [Rendered view](docs/skynet-warning.png) |
| 1:47–1:56.7 | A transparent buffer tank faces the incoming camera, perpendicular to the right wall. 32 cubes progressively fill the same volume; a 33rd cube arrives at 1:50.7, making shader water ripple and spill over the lip. Only then does `BUFFER OVERFLOW / console.log('just one more...')` appear |
| 1:57–2:05 | The centered terminal types `$ npm install cassoulet` and progresses to 4.80 GB. It sits slightly higher to keep the approaching T-800 visible beneath it, then softly clears after completion at 2:04.4 |
| 1:59.5–2:14 | The T-800 advances beyond the terminal. At 2:04.4 the install releases 64 real cans. Genuine impacts stagger and dissolve the robot; after twelve contacts it becomes **192 curved red rose petals**, tumbling and floating through the corridor. The cassoulet saves the audience, then leaves a colliding heap |
| After Mitsuru, before the 2:24.6 rocket launch | **The Power Of Cassoulet!** is a persistent wall comic facing the camera at the right turn, with a superhero can and a ridiculous defeated T-800 wearing a cassoulet tin and waving a surrender flag |
| 1:54–2:12 | A traveling architectural pulse progressively raises six symmetrical data gates, shifting cyan to gold; it continues behind the cassoulet gag and hands off to Mitsuru without an empty corridor |
| 2:08–2:35 | Mitsuru Furuta / floating orbital name instead of another rectangular card; denser golden data streams and a three-band meter behind him build the D climax |
| 2:20–2:29 | A procedural deployment rocket waits at the **next corner**, before the right turn toward Orbital Link. After a readable approach, it launches at 2:24.6 and hits the actual ceiling underside at 2:26.8: a brief flash, expanding shockwave and 240 falling sparks. The pad stays grounded; the camera follows the ascent then smoothly hands over to Orbital Link |
| 2:23–2:46 | Toulouse orbital hardware sits deeper in the D. The single astronaut now stands behind it, at his fixed **16.64-unit final height**, without growth; the two-line `TOULOUSE / ORBITAL LINK` label remains present into the final zoom-out |
| 2:33–2:39 | Brief turn by the last meter, then escape |
| 2:39–2:53 | Faster backward/upward pullback exposes the complete title and the force-field floor connecting the T and D at corridor level; at 2:48–2:52.5 its two spans rise like drawbridges and telescope into the T exit and lower D doorway |
| 2:50–3:00 | World-space **AI4Fun** signature and subtle anniversary marks; title settled by 2:53, seven-second final hold |

During the interior flight, circuit-board equalizer lanes run along the floor, with idle packets and audio-driven spectrum bars. Havok simulates the violin/bow, 48 legacy-code blocks and 72 popcorn kernels. The measured Pong impact, legacy-wall destruction, 64-can rescue, robot collision proxy and 192 lightweight petal proxies use the same engine at 60 fixed steps per second. Recorded poses are sampled for exact pause/seek/replay; no additional live physics world is introduced. Real contacts trigger the violin's gravity and the robot's progressive PBR disintegration, with no timer substituted for a missed impact. The former can basket is removed to keep the robot's walk unobstructed; the barrage collides with the floor, actual corridor walls, robot and petals, then settles into a loose heap. The buffer tank instead uses deterministic cubes and lightweight water shaders, not a fluid simulation. Five wall groups reuse recessed panels as three-column spectra.

See [Legacy → XOR integration](docs/legacy-xor-integration.md) for the architecture,
safe debug controls, physical handoff, exact camera regression and rendered
before/after captures. Run `npm run verify:legacy-xor` to reproduce them.

The cinema's seats, CRTs, David's complete opaque card and screen support, both popcorn buckets, film/reels and giant camera are preloaded and visible from entry at 51.18 seconds, not enabled one prop at a time. David's card has no delayed visibility switch or fade that could pop into view as the camera approaches. Narrative actions still occur later: his premiere spotlights come up at 66 s, the buckets tip and spill, and the camera iris is crossed. Only optical/projector/space effects keep their later reveal windows. The drawbridges stay closed throughout the final hold and reset when seeking backward.

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

The supplied T-800 is no longer staged at the D entrance. Its original
**The Chase** clip advances it down the corridor after the npm panel from
119.5 s, at its retained 21.6-unit height. The terminal is horizontally centered,
slightly elevated and fully readable; its original 119.1-s framing cue is
preserved independently of the astronaut's new final location. The suspended
core briefly contracts to clear the drop column. The first measured can hit
freezes the walk and releases a dynamic
capsule proxy; its recorded body transform drives the stagger. Twelve distinct
can contacts drive a red-edged disintegration, followed by 192 curved rose
petals with recorded wind/damping and shader-driven flutter. One original
procedural mesh and thin-instance buffer render the cloud; no game assets,
extra textures or external models are downloaded. The supplied T-800 mesh,
skeleton and textures are retained;
this is a collision proxy plus shader destruction, not a joint-by-joint ragdoll.
Two shadowless, actor-scoped lights reveal the chrome: a cool frontal key and
a warm red rim follow the recorded body pose. They are precompiled before
playback and switch off with the defeated or disabled model, without relighting
the terminal or cans.
Missing impacts fail preparation explicitly. The paired robot/can gag follows
the existing Toulouse-effects flag and supports pause, seek and restart.

The manga artwork is drawn once into a preloaded local texture and attached to
the west wall of D cell (3, 5), facing the camera after Mitsuru's right turn.
It is armed by the measured destruction, not a timer, and stays fixed on its
wall rather than covering the screen. A smooth gaze lets the audience read it
for several seconds before returning to the rocket ahead of liftoff at 144.6 s.
The original mascot and title are joined by a red-X-eyed, can-helmeted T-800,
spilled beans and `T-800: 0 / TERROIR: 1`. The rescue flag also disables it.
No new audio, font download, image dependency or camera-position change is introduced.

Both film reels rotate continuously in opposite directions at 0.55 rad/s on the
effect clock. Their angle does not depend on instantaneous bass amplitude,
avoiding phase jumps and apparent stalls; pause and rehearsal seeks reproduce
the same reel and sprocket positions.

### Local NVIDIA SimReady additions

The intro now includes real, locally converted NVIDIA assets: retro Pong,
a pastry collectible, the physical cassoulet rescue, the developer snack machine and a launch-support
arm beside the existing rocket. The snack machine is flush with the left side
of the front D wall, already present from the cinema's entry at 51.18 s, so
it is discovered naturally behind the TVs rather than popping in at 61.35 s.
Its `404: HEALTHY SNACK NOT FOUND` board is also preloaded, fully opaque and
present throughout 51.18–87.6 s; only the light flicker and snack drop are timed.
The machine remains opaque until the
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
`DEVFEST AI4FUN / CLOSING KEYNOTE` panel and its DevFest logo fade out before the camera reaches its plane,
avoiding oversized clipped lettering. The shader is precompiled before
SYSTEM READY, remains available with optional post-processing disabled, and
follows camera/show time exactly for pause and seek. It adds no rendering pass
outside that 1.625-second window. Both transition shaders share the
[timed post-process lifecycle](src/effects/TimedPostProcess.ts), including
pipeline-rebuild ordering and cleanup.

For the local keynote score, **Start show + music** on `/strudel/` launches both clocks from the scheduled audible cycle-zero onset, including when Babylon is in another tab of the same window. Switch to the Babylon tab after clicking: its clock catches up to the music even if background rendering was suspended. Synchronized playback keeps time across tab switches; ordinary playback still auto-pauses when hidden. A loading or already-playing show explicitly rejects the launch. Normal Evaluate, pause and seek remain independent. The one-shot Strudel gesture descends three octaves with increasingly spaced, lower drum pulses, leaves the phosphor hold quiet, and resumes the score at 51.38. Reload the keynote to update an existing saved draft; no draft is overwritten automatically.

Research references: [GM Shaders Mini: CRT](https://mini.gmshaders.com/p/gm-shaders-mini-crt) for CRT/phosphor techniques and [The Book of Shaders: Noise](https://thebookofshaders.com/11/) for procedural interference. The in-project GLSL implementation is original, not copied from these tutorials, and uses no extra assets or runtime network requests.

For Anne-Flore and Eric, beams rise from floor projectors and **dynamic spotlights** illuminate the physical cards before their name fade. David's already-present, light-reactive screen receives two moving aisle spotlights that sweep from its center across the name and back, using physical falloff and targeting the screen rather than its side posts. Opaque typography preserves readability and the hardware avoids blown-out halos. Mitsuru's name floats inside two animated overclock orbits rather than repeating Eric's card. Cinema haze bloom respects beam opacity. Music never alters the deterministic camera route. OVERCLOCK intensifies the final digital section; these effects fade before the title reveal.

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

Adjust the example's speaker names and demo titles to match the event program. `world` selects `game`, `cinema` (movie premiere), or `digital`; keep exactly one cinema speaker. `gateTime` determines the fixed position along the camera route where the portal or cinema screen is crossed; keep it inside the introduction interval. Theme options: `signal`, `neural`, `playground`, `overclock`. Eric's title is now "AI AntiPattern, tu perds ton sang froid". Names and titles are textures on physical world-space meshes, not HTML overlays. Rehearse after changing timing or unusually long titles.

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
- [CinemaWorld](src/scene/CinemaWorld.ts), [CinemaAssets](src/scene/CinemaAssets.ts): local cinema models, animated slate, David's premiere, linked film reels and giant lens.
- [CrtLightningTransition](src/effects/CrtLightningTransition.ts): precompiled single lightning strike at exactly 59.2 s, projected branches to all eight CRTs and simultaneous joke update.
- [XorCpuGate](src/scene/XorCpuGate.ts), [CircuitSignal](src/effects/CircuitSignal.ts): four thick beveled processor shutters, a correct XOR symbol and a progressively energized physical circuit.
- [RosePetals](src/effects/RosePetals.ts): original curved, double-sided red petals, instanced shading and deterministic flutter.
- [CassouletPowerPoster](src/effects/CassouletPowerPoster.ts): original manga wall comic after Mitsuru, before the rocket launch; no fullscreen overlay.
- [CassouletRescue](src/simready/CassouletRescue.ts), [TerminatorWalk](src/scene/TerminatorWalk.ts), [TerminatorDestruction](src/effects/TerminatorDestruction.ts): measured can impacts, recorded body/debris physics and progressive destruction of the original animated T-800.
- [PhysicalTunnel](src/effects/PhysicalTunnel.ts), [TunnelFlight](src/camera/TunnelFlight.ts): enclosed 3D serpentine course, calm rhythmic camera, four FFT-driven speaker trails and shared preview render; [LensVortexTransition](src/effects/LensVortexTransition.ts) composites the room through the actual tube opening.
- [ClapCrtTransition](src/effects/ClapCrtTransition.ts): precompiled fullscreen arcade-to-CRT shader, phosphor-line handoff, deterministic uniforms and no extra render pass outside the transition.
- [ArcadeEntryTransition](src/effects/ArcadeEntryTransition.ts): precompiled retro-gaming shader, starting at 4.3 s and clearing at the opening AI4FUN / CLOSING KEYNOTE panel crossing.
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

Scene-clearance tests keep the orbiting core clear of walls/roof/camera and Mitsuru's panel inside the corridor. Ambient dust and tiny data points are disabled inside the corridors; the data particles return for the reveal from 159 s, while intentional sparks and rocket particles are unchanged. Interior fog dissipates during the escape, before the pullback reaches large distances; the solid letters remain visible rather than disappearing behind their glow. The pipeline uses up to 4x MSAA when supported, with FXAA as the fallback.

The Cassoulet victory poster preloads the bundled OFL Anton font before SYSTEM READY, avoiding platform-dependent Impact/Arial Black text. Its thinner outlines and mipmap/anisotropic filtering improve readability on Windows and macOS without filling in the letters. The illustration remains procedural and wall-mounted.

Browser validation additionally covers physical text readability, synthetic Web Audio input, input disconnection, real events from a separate Node process through the relay, offline asset loading, fullscreen and graphics-context recovery. Vite's large Babylon bundle warning is non-blocking; stage shaders and materials are preloaded instead of fetched during the performance.

The first speaker's laser lead, partial text/violin fades and bass-deformed
thin-instance frame are also **rendered into a temporary offscreen target during
loading**. Material compilation alone misses some actual draw variants. The
[warmup](src/scene/RenderWarmup.ts) waits for render targets, keeps physics
disabled, restores the initial pose/output and disposes its target before
SYSTEM READY, without flashing future shots in the lobby. The production
SimReady verifier measures 13–20.5 s of real soundtrack playback and rejects
late shader compilations, frame stalls above 50 ms or a 95th percentile above
22 ms. This fixes the cold first-speaker stall without changing its timing or effects.

The same offscreen preparation now draws the Terminator's intact entrance,
first can impact and model-to-petals handoff, using the recorded Havok contact
times. The cold entrance previously caused six PBR cache misses at 119.5 s
and a measured 98.2-ms frame: real rendering builds the light defines in a
different order than `forceCompilationAsync`, producing different effect keys
even with the same shader features. Drawing the actual camera views during
loading warms those variants plus the skin/glow bindings, without reducing
model quality or changing timing. The SimReady verifier measures 113.5–128 s
on the first real-music pass and requires zero late compilations, max <50 ms
and p95 <22 ms, including the destruction and petals.

The Skynet warning is also drawn during offscreen preparation before SYSTEM
READY. The verifier checks several seconds of fully framed warning text before
the right turn, actual GPU lettering, at least 95% visibility of the caption
strip despite foreground arches, fixed wall placement on seek and the shared
Terminator/cassoulet enable switch. Its original local logo source and public-domain
classification are recorded in [CREDITS.md](CREDITS.md).
The logo uses contiguous UV slices of that same image: the triangle has its own
emissive color/texture level, while the wordmark stays constant. Its slow 1.2-s
timeline pulse uses no timer or per-frame texture upload. GPU pixel checks compare
the bright/dark phases, steady wordmark/caption and identical appearance after rewind.

GPU compatibility is checked with `npm run verify:gpu`: the complete intro and
the Terminator destruction shader are tested with uniform buffers both enabled
and disabled. `rescueDamage` is declared in the material UBO, with a matching
standalone GLSL fallback, and updated through Babylon's `UniformBuffer`.
Declaring it only via `getUniforms().fragment` works on the non-UBO path but
fails with an undeclared identifier when the PBR material uses UBOs (as on
Windows/RTX). The check renders intact/half-dissolved/destroyed/rewound pixels,
not just shader text. It exercises both engine paths on the host running it;
it does not claim to emulate an actual Windows GPU driver.

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
