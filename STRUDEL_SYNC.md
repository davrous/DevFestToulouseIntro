# DevFest: Strudel audio + exact musical events

## Launch and rehearse

```powershell
npm ci
npm run dev
```

Use **one origin**, including the same hostname and port:

- Show: `http://127.0.0.1:5173/`
- Performance: `http://127.0.0.1:5173/strudel/`

The debug panel (`D`) links to the matching performance page. For the stage build,
run `npm run build` then `npm run preview`; both pages use port 4173 by default.
Keep the local server running. Do not mix `localhost` and `127.0.0.1`, different
ports, or `file://` URLs. BroadcastChannel cannot cross origins.

1. Wait for SYSTEM READY in Babylon, then open the performance tab.
2. Confirm **BABYLON SYNC / CONNECTED** and, under `D`, **STRUDEL_EVENTS: CONNECTED**.
3. Start Babylon and Strudel independently. Evaluate with **Ctrl+Enter**; stop
   Strudel with **Ctrl+.**. Re-evaluating replaces patterns while the cycle clock
   keeps running. Code is saved locally after evaluation.
4. In Babylon, connect **System / browser tab audio**, choose the Strudel tab
   and enable **Share audio**, exactly as before. No monitoring/double audio is
   routed to speakers. Browser permission still requires a user gesture.
5. Observe continuous FFT energy and exact events separately. On the projector,
   keep Babylon visible: hiding its tab deliberately pauses the show. Use two
   browser windows/displays for editing during playback, or pause/resume for
   inspection. Disable browser energy-saving/background throttling for rehearsal.
6. Restart the show (`R`) and stop/restart Strudel for a fresh three-minute run.

The included [engineering demo](examples/devfest-av-sync.strudel) is **not** the
keynote music. It uses three original local test drum samples and no downloads.
The supplied keynote excerpt uses `setcpm(150 / 4)`, so the demo preserves **150
BPM**, four beats per cycle: CPM = BPM / 4; CPS = BPM / 240 = 0.625. The supplied
excerpt has not been modified. A separate original keynote score is now
available below; loading it requires confirmation and does not overwrite a
saved draft until Evaluate.

## Original keynote score: 3:00 in Bb minor

[Into the unexpected](examples/devfest-keynote.strudel) is original musical
material in **B-flat minor**, the key of Barber's *Adagio for Strings*. It evokes
slow bowed phrases, suspensions, expanding registers and an emotional crescendo,
without quoting its melody, copying its arrangement or using its recordings.
The local string-like timbre is synthesized, not a sampled acoustic orchestra.

In the performance page, stop playback and choose **Load keynote / Bb minor /
3:00**, confirm replacement of the editor text, then Evaluate. Copy/export
unfinished work first. The engineering demo and supplied excerpt remain separate.

| Time | Musical progression |
| --- | --- |
| 0:00-0:32 | Low cello foundation, intimate sustained harmony, original upper melody entering at 0:12.8; a quiet half-time heartbeat |
| 0:32-0:54.4 | Suspended chords, deeper bass, introduction of the 150-BPM four-on-the-floor pulse |
| 0:54.4-0:56 | Short breath around the cinema clap; existing string releases continue naturally |
| 0:56-1:23.2 | Broader strings and answering voice under David's premiere and the reels |
| 1:23.2-1:36 | Percussion retreats for the lens/projector/warp passage |
| 1:36-2:08 | Electronic pulse returns, quiet arpeggio joins the slow strings |
| 2:08-2:27.2 | Higher voicings, rising string brightness, more insistent hats |
| 2:27.2-2:40 | Full original orchestral/electronic summit |
| 2:40-2:52.8 | Percussion recedes; broad Gb/Ebm/F7 cadence during the pullback |
| 2:52.8-3:00 | Final Bbm, natural release and short local reverb, then silence |

The unchanged tempo is 150 BPM / 37.5 CPM / 0.625 CPS. The complete form is
**112.5 cycles = 180 seconds**, including the ending tail. Onset filtering makes
it one-shot: it does not start again at 3:00. The scheduler can remain running
silently; stop/restart Strudel to replay from cycle zero. Re-evaluation preserves
the current cycle, so evaluating after the end is not a restart.

All voices use built-in synthesis and the three original local WAVs. There are
no remote soundfonts, Hydra imports or sample-bank downloads. Kick/snare/hats
use the same audio-preserving event helpers; 15 explicit `cueAt` outputs follow
the existing scene/speaker timing. These are optional accents, not scene control.
The A-natural in F7 is the conventional harmonic-minor dominant; the score stays
in Bb minor and ends on its tonic. Automation is applied after `arrange` so it
uses the global cycle rather than restarting its crescendo inside each section.

## Architecture

```text
Strudel audio -> existing tab/line capture -> AudioAnalyzer FFT -> continuous energy
Strudel haps  -> public onTrigger callback -> BroadcastChannel -> MusicEventBus
                                                            -> reactive accents
Babylon Timeline -> camera, scenes, speakers, physics release, final reveal
```

The modular local REPL uses **@strudel/codemirror 1.3.0**, **@strudel/webaudio
1.3.0**, and core/mini/tonal/transpiler **1.2.6**, pinned in the manifest and
lockfile. It uses the real CodeMirror Strudel editor, mini-notation highlighting,
labels (`$:` / `_$:`), sliders, pattern transforms and Web Audio output.
Babylon never imports the Strudel engine; it only loads the small sync modules.

The scheduler callback is the public `Pattern.onTrigger(hap, currentTime, cps,
targetTime)` API in core 1.2.6. Its fourth argument is the **absolute AudioContext
onset**, not an evaluation time or relative timeout. `audioAndVisual` uses
`dominant = false`, preserving default audio output exactly once. Silent
`visual`/`cue` tracks use `dominant = true`, suppressing audio output entirely.
The public `register` API adds `.visual()`; no private REPL hook/source parsing.

`getOutputTimestamp()` maps the intended audio onset to
`performance.timeOrigin + performanceTime` across tabs. If unavailable, the
AudioContext/current performance offset plus reported output/base latency is
used. Babylon queues early messages and dispatches on its next render frame at
the intended onset; slightly late events dispatch immediately and retain their
original onset for pulse decay. This adds **no deliberate visual delay**.
The diagnostics show transport delay and frame lateness separately; they are
estimates, not an acoustic calibration of the room/projector.

## Helpers: one rhythm, one sound

```javascript
const KICK = s("bd*4").gain(.9)
$: audioAndVisual(KICK, "kick") // same haps, unchanged audio
$: s("~ sd ~ sd").visual("snare")
$: audioAndVisual(s("hh*8").gain(.12), "hat")

$: visual("impact").slow(8) // silent, scheduler-controlled event track
$: cue("cinema-cut").slow(16) // silent repeated cue, guarded in Babylon
$: cueAt("cinema-cut", 54.55 * .625) // one onset at this Strudel cycle
```

`visual(name, pattern)` creates a **silent** output with the supplied pattern's
rhythm; `pattern.visual(name)` preserves its audio. Transform rhythms *before*
adding the helper when possible. Only intentional event tracks are forwarded.
Fractional `cueAt` cycle positions are supported. Tempo changes naturally affect
when those cycle positions occur; cues do not follow Babylon time automatically.
Align independent starts or move cue positions to match the performance.

To add accents to the supplied keynote without changing its music:

```javascript
// Keep the original KICK and its RolandTR909 bank/gain exactly as written.
// Change only its active performance label:
$: audioAndVisual(KICK, "kick")
// Select hats rather than forwarding every synth/arpeggio:
$: audioAndVisual(HATS, "hat")
```

**Offline instruments:** the engineering page registers local `bd`, `sd`, `hh`
and built-in synths, not Strudel's Internet sample catalog. The excerpt's
`RolandTR909`, `gm_synth_strings_1` and `initHydra` need their own local,
properly licensed samples/soundfonts and an explicitly bundled Hydra integration
before that complete composition can run offline here. They have **not** been
silently substituted. Keep `strudel.cc` for the existing FFT-only workflow if
needed. Do not use `samples("github:...")`, remote soundfonts or CDN scripts in
the stage build; the performance page's CSP blocks non-local resource fetches.
Register your staged local sample map with `samples(map, localBaseURL)`.

## Events and initial mappings

Names and configurable timeline windows are centralized in
[avProtocol.ts](src/engine/avProtocol.ts).

- `kick`: existing emissive/architectural pulse; no camera shake.
- `snare`: existing light accents plus a restrained CRT brightness accent.
- `hat`: existing treble-driven particle/spectrum detail.
- `impact`: existing drop-strength light/particle response.
- Cues: `game`, `level-complete`, `cinema-cut`, `cinema`, `speaker-david`,
  `film-reels`, `popcorn`, `lens`, `projector`, `warp`, `d-entry`, `speaker-eric`,
  `speaker-mitsuru`, `climax`, `reveal`.

Cues reinforce existing drop/transition parameters, not mesh construction or
scene scheduling. `reveal` adds a small, decaying final glow accent.
`popcorn` can strengthen the release impulse if received just before release,
otherwise it accents the light; it **never respawns physics**.

Each cue is accepted only once per Babylon run/seek and inside its configurable
timeline window (generally +/-1 to 3 seconds). Off-window cues remain visible
as `outside-window` in the monitor. Names, camera, clapper, popcorn release and
final reveal still happen at their original deterministic times if no cue arrives.

To add a new cue, extend `SHOW_CUES` and `CUE_WINDOWS`, then add a small mapping
in `ShowController.applyMusicEvent`. The typed cue table forces you to specify
its window. Use `cueAt("your-cue", cycle)` in Strudel. Do not add timeline waits.

## Diagnostics and fail-safes

`D` shows independent audio/event connection states, last event/age, events/sec,
transport latency, dispatch lateness, last cue and Strudel cycle/CPS. The monitor
retains 40 entries; cue decisions, duplicates, stale events and cancellations
are explicit. It is hidden in clean stage mode.

Use **K / S / H / I** with flight control open for kick/snare/hat/impact, or its
event/cue buttons. All use the **same MusicEventBus** as Strudel, including cue
windows. To test a cue, seek into its window and resume playback. Pause freezes
visual choreography; the monitor/FFT input meters continue receiving input.
Legacy `showController.trigger`, WebSocket, levels and section APIs remain intact.

The channel is `devfest-av-sync-v1`. Heartbeats/acks run once per second and
confirm the other tab exists (not that music is playing); they are **not** music
timers. A closed/unresponsive peer expires after 3.5 seconds. Stopping/closing
Strudel cancels its pending events. Reopen the page to reconnect automatically.

IDs include sender, playback session, event name and rational hap onset.
Re-evaluation within a session deduplicates identical onsets; stop/start creates
a new session. Babylon keeps at most 512 recent IDs, 256 pending events and 40
monitor rows. Messages >5 seconds early or >2 seconds late are rejected.
Selected hats are limited to one every 45ms and all outputs to 120 events/sec.
No per-event mesh allocation, timers or continuous-note forwarding.

- Event failure: FFT may still work; timeline continues.
- Audio failure/permission refusal: scheduler events may still work; timeline continues.
- Both absent: the original silent 180-second show still completes.
- Seek/restart clears pending accents and one-shot decisions.

## Validation and licensing

```powershell
npm test
npm run build
npm run preview
```

With the production server still running, use the persistent two-tab browser
rehearsal (about three minutes per score):

```powershell
$env:AV_URL = "http://127.0.0.1:4173"
npm run verify:av

$env:AV_CAPTURE = "1"
npm run verify:av -- .\examples\devfest-keynote.strudel
Remove-Item Env:\AV_CAPTURE
```

Playwright is pinned as a dev dependency. The verifier defaults to installed
Microsoft Edge; use `AV_BROWSER=chrome` for installed Chrome. If no supported
browser is installed, run `npx playwright install chromium` and set
`$env:AV_BROWSER = "chromium"`. This is test tooling, not a runtime download.

It blocks external HTTP requests from cold load, waits for actual local audio
playback/preload, then disables browser networking. It verifies real 180-second
playback, re-evaluation without changing the session, cue decisions, final camera
pose, 36 peak/zero final popcorn bodies, disconnection and reconnection. Keynote
loading also tests Cancel/confirm protection of the editor text. The optional
audio test taps the real final Web Audio mix and relays it over **local WebRTC
with no STUN servers** into the unchanged `AudioAnalyzer.connectStream`. An
AudioWorklet measures every audio block for peak, section RMS and ending silence.
FFT activity is checked in the opening, digital section and climax, not merely
at connection time. A muted test media sink drives Chromium's WebRTC decoder;
it does not monitor audio through speakers.
No duplicate signal is routed to speakers, and no musical events are fabricated.
This is not automation of the permission-sensitive browser tab picker.

Recorded production engineering rehearsal: **180.013 s**, **1,596** dispatched
events; transport median **0.10 ms**, p95 **1.0 ms**, render dispatch lateness
p95 **17.0 ms**. Cinema-cut/popcorn/lens/projector/warp/speaker/climax/reveal cues
were accepted; final camera `(0, 1110, -755)` and physics cleanup were preserved.
External requests and browser warning/errors: **zero**; offline playback,
re-evaluation and reconnection passed. This run deliberately used no FFT input,
proving events and the timeline remain independent of audio permission.

Recorded production **keynote + real FFT** rehearsal: **180.013 s**, **1,081**
scheduled events and **all 15 cues applied**. Transport median **0.10 ms**, p95
**0.70 ms**; render dispatch lateness p95 **16.73 ms**. FFT remained active during
**8,586 render frames**, including **1,372** in the opening, **1,793** in the
digital section and **734** at the climax. Full-mix peak was **0.507**
(approximately **-5.9 dBFS**, without clipping); opening RMS **0.0201** rose to
**0.0733** at the summit, about **3.65 times** the amplitude. Ending RMS at
179.8-180.4 seconds was **zero**. Camera, physics cleanup, stop/loading guards,
Cancel/confirm, re-evaluation, reconnection and offline operation passed, with
zero external requests and zero browser warnings/errors.

These measurements are from a local headless Edge rehearsal at 1280x720,
not a certified 4K/60-fps stage test or a room/projector/acoustic calibration.
Perform the tab-picker and live-input rehearsal on the actual stage machine.

Tests exercise real pinned Strudel patterns/output callbacks, not fabricated
rhythms, plus scheduling, validation, deduplication, cue windows, heartbeat
reconnection and FFT coexistence. Browser rehearsal must also confirm audible
output, tab sharing, stop/re-evaluate/reconnect, offline requests and final hold.
Do not claim microphone/tab-picker permission or acoustic latency from unit tests.

Strudel is **AGPL-3.0-or-later**. Its license is included locally under
`public/licenses/Strudel-AGPL-3.0.txt`; package sources are included in the
installed npm packages, and the matching release sources are at
<https://codeberg.org/uzu/strudel>. Respect source-availability and compatible
licensing obligations before publishing/distributing an integrated application.
This change does not silently relicense existing project files. The drum WAVs
are original generated engineering fixtures, reproducible with
`node .\scripts\generate-sync-samples.mjs`, not Roland recordings.
