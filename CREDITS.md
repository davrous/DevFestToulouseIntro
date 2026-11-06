# 3D artwork credits

## Cassoulet poster typography

The bundled, unmodified [Anton font](src/assets/event/Anton-Regular.ttf) by
The Anton Project Authors is
from [Google Fonts](https://github.com/google/fonts/tree/main/ofl/anton),
licensed under the [SIL Open Font License 1.1](public/licenses/Anton-OFL.txt).
It is loaded locally before the procedural poster is drawn; no runtime font
service is contacted.

## Arcade gameplay media

The three exact user-supplied GIF sources are converted into local silent
MP4s and posters. [Per-file sources, hashes and transformations](public/assets/arcade/manifest.json)
and the [rights record](public/licenses/arcade-media.txt) accompany them.
Pong's filmed GIF is by **pong74ls**, cropped by **WikiJunkie**, via
[Wikimedia Commons](https://commons.wikimedia.org/wiki/File:Pong_Game_Test2.gif),
under [CC BY 3.0](https://creativecommons.org/licenses/by/3.0/); conversion and
monochrome display preparation are changes, not endorsement.
The exact original Donkey Kong arcade and Super Mario Bros. NES footage is
from the supplied Tenor links. **Nintendo retains the underlying game and
character rights. No explicit redistribution grant was identified for those
GIFs; the supplied URLs are not a license. Obtain clearance before distributing
the show publicly.** No unrelated replacement footage was used.

The pinball overlay artwork, playfield, choreography and AI4FUN score display
are original procedural additions over the unchanged CC0 Kenney machines.

## Skynet warning logo

The unmodified [local Skynet logo](src/assets/skynet/skynet-logo.png) comes from
[Wikimedia Commons: Skynet Terminator logo.png](https://commons.wikimedia.org/wiki/File:Skynet_Terminator_logo.png),
file revision 18 May 2020. Commons classifies it as **public domain / PD-textlogo**
(simple geometric shapes and text), crediting TriStar Pictures, Paramount Pictures,
and/or the graphic artists. Trademark rights may still apply; its use here is a
fictional Terminator reference, not an affiliation or endorsement.
[Local source/license record](public/licenses/Skynet-logo-PD-textlogo.txt).
The image is bundled locally; playback never requests Wikimedia.
The image file is unchanged. At runtime, contiguous UV bands separate the upper
triangle from the wordmark so only the triangle pulses; the message and wordmark
retain constant brightness.

## NVIDIA SimReady

The nine locally converted NVIDIA SimReady models are published under the
CC-BY-4.0 license declared independently by each pinned asset package.
[Asset-by-asset attribution](docs/simready-attribution.md) records the original
identifiers, immutable dataset revision and source links; each original license
text is retained beside its runtime GLB under `public/assets/simready/`.
[Conversion notes](docs/simready-conversion-report.md) document texture resizing,
runtime geometry reduction and thin-glass adaptation. Source USDs are retained
separately and are not included in the production bundle.

The croissant and beans can are playful references, not accurate models of a
chocolatine or cassoulet. The original donut, mobile robot and forklift remain
available in the local inspection library but are not used in the current show.

The cinema models in `public/assets/cinema/` are local copies of the credited originals. Each is licensed under [Creative Commons Attribution 4.0](https://creativecommons.org/licenses/by/4.0/). The show changes scale, placement, repetition and animation at runtime; the GLB files are not modified. At runtime the cinema camera's presentation ground and the director chair's presentation socle are omitted before scale normalization, and procedural spokes supplement the film reels. The CRT's curved front geometry is reused with remapped UVs and original retro-computing textures, while its original glass/screen layers are hidden. The movie theatre environment is retained locally but no longer staged or preloaded.

| Local file | Original model | Creator | Source |
| --- | --- | --- | --- |
| `cinema_seat.glb` | Cinema Seat | Connor Wassall | [Sketchfab](https://sketchfab.com/3d-models/cinema-seat-6c44adbc299c4f8ab45e9913d58cfcba) |
| `black_film_slate_or_clapperboard.glb` | Black Film Slate or Clapperboard | Bendar Multimedia | [Sketchfab](https://sketchfab.com/3d-models/black-film-slate-or-clapperboard-f971698c983d4256a269424e88b17872) |
| `spotlight.glb` | Spotlight | R3indeer | [Sketchfab](https://sketchfab.com/3d-models/spotlight-bf2894cc5af04be6a57cc2ff66e0bbee) |
| `film_reel.glb` | Film Reel | fisherfx.pro | [Sketchfab](https://sketchfab.com/3d-models/film-reel-ed2f560e03394c61acac3f097db6e8a6) |
| `cinema_camera.glb` | Cinema Camera | re1monsen | [Sketchfab](https://sketchfab.com/3d-models/cinema-camera-e1fec87c8ae0487f964d20de2559aa62) |
| `retro_crt_tv.glb` | Retro CRT TV | meipal | [Sketchfab](https://sketchfab.com/3d-models/retro-crt-tv-6bc462b233ce4c78904dfcadf5123e29) |
| `popcorn_bucket.glb` | Popcorn Bucket | beastybevan | [Sketchfab](https://sketchfab.com/3d-models/popcorn-bucket-115700b607424d7d92b133cb44ec6166) |
| `low_poly_astronaut.glb` | Low Poly Astronaut | Colin.Greenall | [Sketchfab](https://sketchfab.com/3d-models/low-poly-astronaut-a0858f7876e1432b94c4c0571ee4e17a) |
| `low_poly_satellite.glb` | Low Poly Satellite | piyal67 | [Sketchfab](https://sketchfab.com/3d-models/low-poly-satellite-c4fdace1e6204978b65ad894903bafa5) |
| `movie_theatre_environment.glb` | Movie Theatre Environment | mikeyobright | [Sketchfab](https://sketchfab.com/3d-models/movie-theatre-environment-d8f337bc3efb4bf2aaae271962563700) |
| `vhs_tape.glb` | VHS Tape | Beepo | [Sketchfab](https://sketchfab.com/3d-models/vhs-tape-b420546b370b4be4800d720cadbaeb11) |
| `directors_chair.glb` | Director's Chair | creativejenna | [Sketchfab](https://sketchfab.com/3d-models/directors-chair-d664c3ed7e1d48f5a0c0ad7f6581477b) |
| `terminator_t-800_endo-skeleton_damaged.glb` | TERMINATOR: T-800 Endo-Skeleton (Damaged) | CatBYTE Studio | [Sketchfab](https://sketchfab.com/3d-models/terminator-t-800-endo-skeleton-damaged-dd9b3744c30e4bf58aa6f57da00c1eb0) |

The user-supplied T-800 includes the original **The Chase** skeletal clip.
Its embedded metadata declares CC-BY-4.0. The show samples this clip by absolute
timeline time and stages the enlarged model after the npm terminal. The
cassoulet rescue uses a Havok collision proxy, a runtime PBR destruction plugin
and original procedural red rose petals. The supplied GLB, textures and skeleton
are unchanged; no pre-authored death animation is claimed.

The curved rose-petal geometry, crimson flutter shader, procedural XOR CPU gate and
**The Power Of Cassoulet!** manga victory illustration are original procedural
artwork for this intro. The comic mascot, spoon, defeated-robot caricature,
speed lines and typography
are drawn locally and do not reproduce an existing manga character or panel.
No model, texture, animation
or shader from *Clair Obscur: Expedition 33* is included. Technical references:
[Babylon.js ShaderMaterial](https://doc.babylonjs.com/features/featuresDeepDive/materials/shaders/shaderMaterial)
and [thin instances](https://doc.babylonjs.com/features/featuresDeepDive/mesh/copies/thinInstances).

The high-poly *Cinema Movie Projector AP5* source was **not used or redistributed**. The in-show projector is original procedural geometry instead.

The existing [Kenney Mini Arcade](public/assets/kenney/LICENSE-mini-arcade.txt) cabinets are CC0 artwork by Kenney, with additional contributors Fleur Keijsers and Guus Vermeulen. [Kenney Pixel Platformer](public/assets/kenney/LICENSE-pixel-platformer.txt) sprites and [Input Prompts Pixel](public/assets/kenney/LICENSE-input-prompts-pixel.txt) icons are also CC0.

## Local Strudel performance page

The pinned Strudel packages are software by the Strudel contributors, licensed
AGPL-3.0-or-later: [source](https://codeberg.org/uzu/strudel) and
[local license](public/licenses/Strudel-AGPL-3.0.txt). See
[STRUDEL_SYNC.md](STRUDEL_SYNC.md) for distribution obligations.
The three drum WAVs in `public/assets/strudel/` are original procedural
engineering fixtures generated by `scripts/generate-sync-samples.mjs`, not
third-party or Roland sample recordings.

The [original keynote score](examples/devfest-keynote.strudel) uses original
melodic material and local synthesis in Bb minor. Its slow-string emotional
character is a stylistic reference, not a quotation, transcription or arrangement
of Samuel Barber's *Adagio for Strings*. No Barber recording, score, MIDI or
other material from that work is redistributed. That previous score uses local
synthesis, not acoustic orchestral recordings.

The three [viola-friendly arrangements](examples/devfest-viola.strudel) also use
original musical material. Their seven acoustic instrument families are a
locally hosted subset of **VSCO 2 Community Edition** by **Sam Gossner and Simon
Dalzell**, with sample cutting by **Elan Hickler / Soundemote**:

- [Source repository](https://github.com/sgossner/VSCO-2-CE), revision
  `440300901dfe9275fd84e0b7763af1f8443ae62e`.
- [Official collection](https://versilian-studios.com/vsco-community/).
- **CC0-1.0**, with the [license distributed locally](public/licenses/VSCO-2-CE-CC0.txt).
- 18 WAVs: violin ensemble, cello ensemble, flute, French horn, harp, upright
  piano and timpani. The [manifest](src/strudel/orchestraSamples.json) records
  each source, local filename and mapped note root.
- Files are trimmed to at most six seconds, peak-normalized to -3 dB, faded
  where trimmed, and converted to mono 32-kHz 16-bit WAV. The
  [staging script](scripts/stage-orchestra.mjs) reproduces these conversions.

These CC0 recordings are redistributed under
[public/assets/strudel/orchestra](public/assets/strudel/orchestra). They are
not recordings of the live viola or samples from a copyrighted composition.
