import "./shaders";
import { Scene } from "@babylonjs/core/scene";
import { Color3, Color4 } from "@babylonjs/core/Maths/math.color";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { FreeCamera } from "@babylonjs/core/Cameras/freeCamera";
import { HemisphericLight } from "@babylonjs/core/Lights/hemisphericLight";
import { DirectionalLight } from "@babylonjs/core/Lights/directionalLight";
import { PointLight } from "@babylonjs/core/Lights/pointLight";
import { DefaultRenderingPipeline } from "@babylonjs/core/PostProcesses/RenderPipeline/Pipelines/defaultRenderingPipeline";
import { ImageProcessingConfiguration } from "@babylonjs/core/Materials/imageProcessingConfiguration";
import { RawCubeTexture } from "@babylonjs/core/Materials/Textures/rawCubeTexture";
import { Constants } from "@babylonjs/core/Engines/constants";
import { GlowLayer } from "@babylonjs/core/Layers/glowLayer";
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
import { Mesh } from "@babylonjs/core/Meshes/mesh";
import { InstancedMesh } from "@babylonjs/core/Meshes/instancedMesh";
import type { Engine } from "@babylonjs/core/Engines/engine";
import { cameraPose } from "../camera/CameraPath";
import { PHASES, smoothstep } from "../engine/Timeline";
import { silentFeatures, type AudioFeatures } from "../engine/AudioAnalyzer";
import type { Section } from "../engine/protocol";
import { SPEAKERS } from "../content/speakers";
import { cueEnvelope } from "../content/cues";
import { createLabyrinth } from "./Labyrinth";
import { createInterior, updateInterior, createFinalCaption } from "./Interior";
import { createAtmosphere, DUST, showFogDensity } from "./Atmosphere";
import { SpeakerPortal } from "./SpeakerPortal";
import { EasterEggs } from "./EasterEggs";
import { ArcadeT } from "./ArcadeT";
import { ArcadePhysics } from "./ArcadePhysics";
import { PixelWorld } from "./PixelWorld";
import { ArcadeCathedral } from "./ArcadeCathedral";
import { DemosceneTransition } from "./DemosceneTransition";
import { MusicReactive } from "../effects/MusicReactive";
import { ASTRONAUT_FINALE, CINEMA, TERMINATOR } from "../content/showBeats";
import { FloorEqualizer } from "../effects/ShowLighting";
import { WallMeters } from "../effects/WallMeters";
import { ClapCrtTransition } from "../effects/ClapCrtTransition";
import { ArcadeEntryTransition } from "../effects/ArcadeEntryTransition";
import { LensVortexTransition } from "../effects/LensVortexTransition";
import { CrtLightningTransition } from "../effects/CrtLightningTransition";
import { CassouletPowerPoster } from "../effects/CassouletPowerPoster";
import { legacyXorSettings } from "./LegacyXorSequence";
import { prewarmRenderStates } from "./RenderWarmup";
import { laserLead } from "../effects/ShowLighting";
import { EventBranding } from "./EventBranding";
import { CinemaWorld } from "./CinemaWorld";
import { CinemaPopcorn } from "./CinemaPopcorn";
import { DigitalMoments } from "./DigitalMoments";
import { DigitalOverflow } from "./DigitalOverflow";
import { SimReadyGags } from "../simready/SimReadyGags";
import HavokPhysics from "@babylonjs/havok";
import havokWasm from "@babylonjs/havok/lib/esm/HavokPhysics.wasm?url";
import { HavokPlugin } from "@babylonjs/core/Physics/v2/Plugins/havokPlugin";
import "@babylonjs/core/Physics/joinedPhysicsEngineComponent";

const SILENCE = silentFeatures();
const PALETTE = ["#68d7be", "#76ffe0", "#b19dff", "#ffa999", "#ffd28d", "#77ffe3"].map(Color3.FromHexString);

export class DevFestScene {
  readonly scene: Scene;
  readonly camera: FreeCamera;
  readonly pipeline: DefaultRenderingPipeline;
  readonly glow: GlowLayer;
  readonly portals: SpeakerPortal[];
  readonly simready: SimReadyGags;
  private readonly easterEggs: EasterEggs;
  readonly arcade: ArcadeT;
  readonly arcadePhysics: ArcadePhysics;
  readonly legacyXor = legacyXorSettings();
  private readonly pixelWorld: PixelWorld;
  private readonly cathedral: ArcadeCathedral;
  private readonly demoscene: DemosceneTransition;
  private readonly music: MusicReactive;
  private readonly floorEqualizer: FloorEqualizer;
  private readonly wallMeters: WallMeters;
  private readonly branding: EventBranding;
  private readonly cinema: CinemaWorld;
  private readonly popcorn: CinemaPopcorn;
  private readonly digitalMoments: DigitalMoments;
  private readonly overflow: DigitalOverflow;
  private readonly clapTransition: ClapCrtTransition;
  private readonly entryTransition: ArcadeEntryTransition;
  private readonly lensVortex: LensVortexTransition;
  private readonly crtLightning: CrtLightningTransition;
  private readonly cassouletPoster: CassouletPowerPoster;
  private readonly tint = new Color3();
  private readonly labyrinth;
  private readonly interior;
  private readonly atmosphere;
  private readonly caption;
  private readonly fill: HemisphericLight;
  private readonly sun: DirectionalLight;
  private readonly headlight: PointLight;
  private physicsPlugin?: HavokPlugin;
  private physicsSpeed = 1;

  constructor(private readonly engine: Engine) {
    const scene = this.scene = new Scene(engine);
    scene.clearColor = new Color4(.018, .035, .048, 1);
    scene.fogMode = Scene.FOGMODE_EXP2;
    scene.fogColor = new Color3(.022, .055, .071);
    scene.fogDensity = .009;
    scene.skipPointerMovePicking = true;
    scene.autoClear = true;
    // A local softbox environment gives metal a reflection without downloaded HDR assets.
    const faces = Array.from({ length: 6 }, (_, face) => {
      const data = new Uint8Array(64 * 64 * 4);
      for (let y = 0; y < 64; y++) {
        for (let x = 0; x < 64; x++) {
          const stripe = Math.exp(-Math.pow((x - 24) / 9, 2)) * Math.exp(-Math.pow((y - 22) / 30, 2));
          const light = (face === 2 ? 28 : 8) + stripe * (face === 0 || face === 4 ? 125 : 45);
          const i = (y * 64 + x) * 4;
          data[i] = light * .62;
          data[i + 1] = light * .87;
          data[i + 2] = light;
          data[i + 3] = 255;
        }
      }
      return data;
    });
    scene.environmentTexture = new RawCubeTexture(scene, faces, 64, Constants.TEXTUREFORMAT_RGBA, Constants.TEXTURETYPE_UNSIGNED_BYTE, true);
    scene.environmentIntensity = .55;
    this.camera = new FreeCamera("Cinematic camera", new Vector3(0, 10, 0), scene);
    this.camera.minZ = .15;
    this.camera.maxZ = 12000;
    this.camera.inertia = 0;
    this.camera.inputs.clear();
    this.fill = new HemisphericLight("Ambient / blue hour", new Vector3(.2, 1, .1), scene);
    this.fill.diffuse = new Color3(.62, .82, .96);
    this.fill.groundColor = new Color3(.1, .2, .24);
    this.fill.intensity = .65;
    this.sun = new DirectionalLight("Exterior / grazing key", new Vector3(.3, -1, .5), scene);
    this.sun.diffuse = new Color3(.74, .94, 1);
    this.sun.intensity = 1.8;
    this.headlight = new PointLight("Camera / soft bounce", Vector3.Zero(), scene);
    this.headlight.diffuse = new Color3(.47, 1, .86);
    this.headlight.range = 95;
    this.headlight.intensity = 75;
    this.labyrinth = createLabyrinth(scene);
    this.interior = createInterior(scene);
    this.atmosphere = createAtmosphere(scene);
    this.caption = createFinalCaption(scene);
    this.portals = SPEAKERS.flatMap((speaker, index) =>
      speaker.world === "cinema" ? [] : [new SpeakerPortal(scene, speaker, index)]);
    this.easterEggs = new EasterEggs(scene);
    this.arcade = new ArcadeT(scene, this.legacyXor);
    this.arcadePhysics = new ArcadePhysics(scene, this.legacyXor);
    this.pixelWorld = new PixelWorld(scene);
    this.cathedral = new ArcadeCathedral(scene);
    this.demoscene = new DemosceneTransition(scene);
    this.cinema = new CinemaWorld(scene);
    this.popcorn = new CinemaPopcorn(scene);
    this.digitalMoments = new DigitalMoments(scene);
    this.overflow = new DigitalOverflow(scene);
    this.simready = new SimReadyGags(scene, new URLSearchParams(location.search).get("simready") !== "0");
    this.branding = new EventBranding(scene);
    this.music = new MusicReactive(scene);
    this.floorEqualizer = new FloorEqualizer(scene);
    this.wallMeters = new WallMeters(scene);
    this.glow = new GlowLayer("Architectural light bloom", scene, { mainTextureRatio: .5, blurKernelSize: 32 });
    this.glow.addExcludedMesh(this.music.particles);
    this.glow.addExcludedMesh(this.easterEggs.rocketParticles);
    // Keep non-emissive geometry in the glow depth pass: hidden lights must not bleed through walls.
    this.glow.customEmissiveColorSelector = (mesh, _subMesh, material, result) => {
      if (material instanceof StandardMaterial && !mesh.name.startsWith("FX/Laser halo")
        && /FX\/|light traces|running lights|data banks|computational core|Core orbit|Depth gates/.test(mesh.name)) {
        const color = material.emissiveColor;
        const opacity = mesh.name.startsWith("FX/Cinema /") || mesh.name.startsWith("FX/Rocket /")
          || mesh.name.startsWith("FX/Pixel to voxel")
          ? material.alpha * mesh.visibility : 1;
        result.set(color.r * opacity, color.g * opacity, color.b * opacity, 1);
      } else {
        result.set(0, 0, 0, 1);
      }
    };
    this.pipeline = new DefaultRenderingPipeline("Cinema", true, scene, [this.camera]);
    this.pipeline.samples = Math.max(1, Math.min(4, engine.getCaps().maxMSAASamples));
    this.pipeline.fxaaEnabled = this.pipeline.samples === 1;
    this.pipeline.bloomEnabled = true;
    this.pipeline.bloomThreshold = .8;
    this.pipeline.bloomWeight = .2;
    this.pipeline.bloomKernel = 48;
    this.pipeline.bloomScale = .5;
    this.pipeline.imageProcessingEnabled = true;
    const image = scene.imageProcessingConfiguration;
    image.toneMappingEnabled = true;
    image.toneMappingType = ImageProcessingConfiguration.TONEMAPPING_ACES;
    image.exposure = 1.15;
    image.contrast = 1.15;
    image.vignetteEnabled = true;
    image.vignetteWeight = 1.5;
    image.vignetteStretch = .4;
    image.vignetteColor = new Color4(.015, .035, .04, 1);
    this.entryTransition = new ArcadeEntryTransition(this.camera, this.pipeline);
    this.clapTransition = new ClapCrtTransition(this.camera, this.pipeline);
    this.lensVortex = new LensVortexTransition(this.camera, this.pipeline);
    this.crtLightning = new CrtLightningTransition(this.camera, this.pipeline, this.cinema.crtScreens);
    this.cassouletPoster = new CassouletPowerPoster(scene);
    this.glow.addExcludedMesh(this.cassouletPoster.mesh);
    this.cinema.tunnelPreview.setTunnel(this.lensVortex.tunnel.texture);
    this.update(0);
  }

  async prepare(progress: (message: string) => void = () => {}): Promise<void> {
    await Promise.all([this.pixelWorld.prepare(), this.cathedral.prepare(), this.cinema.prepare(),
      this.entryTransition.prepare(), this.clapTransition.prepare(), this.lensVortex.prepare(),
      this.crtLightning.prepare(), this.simready.prepare(progress)]);
    const havok = await HavokPhysics({ locateFile: () => havokWasm });
    const plugin = new HavokPlugin(true, havok);
    if (!this.scene.enablePhysics(new Vector3(0, -17, 0), plugin)) {
      throw new Error("Havok physics could not be initialized.");
    }
    this.physicsPlugin = plugin;
    plugin.setVelocityLimits(32, 12);
    this.scene.physicsEnabled = false;
    this.simready.initializePhysics();
    this.demoscene.initialize(plugin);
    if (this.demoscene.impact) this.simready.setPongImpact(this.demoscene.impact);
    this.arcadePhysics.initialize(plugin);
    this.popcorn.initialize(plugin);
    await this.branding.ready;
    await this.scene.whenReadyAsync();
    const compile = (meshes = this.scene.meshes) => Promise.all(meshes.map((mesh) => mesh.material?.forceCompilationAsync(mesh, {
      useInstances: mesh instanceof InstancedMesh || (mesh instanceof Mesh && mesh.hasThinInstances),
    })));
    await compile();
    this.update(CINEMA.crtSync, SILENCE);
    await compile([...this.cinema.crtScreens]);
    this.update(SPEAKERS[0].startTime + 3, SILENCE);
    await compile();
    for (const [id, gag] of this.simready.groups) {
      this.update(this.simready.config.gags[id].animation.interaction, SILENCE);
      await compile(gag.meshes);
    }
    this.update(TERMINATOR.walkStart + 1, SILENCE);
    await compile(this.cinema.terminator.root.getChildMeshes());
    this.update(ASTRONAUT_FINALE.start + 1, SILENCE);
    await compile(this.cinema.astronautRoot.getChildMeshes());
    this.update(0, SILENCE);
    const speaker = SPEAKERS[0];
    const entranceStates = [
      speaker.startTime - laserLead(speaker) + .01,
      speaker.startTime + .6, speaker.startTime + 1.2, speaker.startTime + 3,
    ].map((time) => () => this.update(time, SILENCE));
    // Bass introduces a separate NONUNIFORMSCALING shader for the thin-instanced frame.
    entranceStates.push(() => this.update(speaker.startTime + .6, { ...SILENCE, bass: 1 }));
    await prewarmRenderStates(this.scene, this.camera, entranceStates, () => this.update(0, SILENCE));
  }

  setPostProcessing(enabled: boolean): void {
    this.pipeline.bloomEnabled = enabled;
    this.pipeline.fxaaEnabled = enabled && this.pipeline.samples === 1;
    this.pipeline.imageProcessingEnabled = enabled;
    this.glow.isEnabled = enabled;
  }

  update(cameraTime: number, audio: AudioFeatures = SILENCE, section: Section | null = null, speed = 1,
    revealAccent = 0, effectTime = cameraTime): void {
    const time = effectTime;
    if (this.physicsSpeed !== speed) {
      this.scene.getPhysicsEngine()?.setGravity(new Vector3(0, -17 * speed * speed, 0));
      this.physicsPlugin?.setVelocityLimits(32 * speed, 12 * speed);
      this.physicsSpeed = speed;
    }
    const aspect = this.engine.getRenderWidth() / this.engine.getRenderHeight();
    const pose = cameraPose(cameraTime, aspect);
    this.camera.position.copyFrom(pose.position);
    this.camera.setTarget(pose.target);
    this.camera.fov = pose.fov;
    this.entryTransition.update(cameraTime);
    this.clapTransition.update(time);
    this.lensVortex.update(cameraTime, audio);
    this.crtLightning.update(cameraTime);
    this.headlight.position.copyFrom(pose.position);
    const wake = smoothstep(time / 35);
    const reveal = smoothstep((time - 159) / 10);
    const calm = 1 - smoothstep((time - 153) / 18);
    const cinema = time >= CINEMA.clapperStart && time < CINEMA.tunnelRoomReady;
    const paletteTime = time < 155 && section ? PHASES.find((phase) => phase.name === section)!.time + 6 : time;
    let index = 0;
    for (let i = 1; i < PHASES.length; i++) if (paletteTime >= PHASES[i].time) index = i;
    Color3.LerpToRef(PALETTE[Math.max(0, index - 1)], PALETTE[index], smoothstep((paletteTime - PHASES[index].time) / 6), this.tint);
    const pulse = calm * (audio.kick * .32 + audio.snare * .2 + audio.drop * .3);
    const voice = calm * audio.energy;
    this.glow.intensity = .2 + reveal * .35 + pulse * .15 + voice * .25
      + revealAccent * .08 * smoothstep((time - 170) / 3);
    this.pipeline.bloomWeight = .2 + calm * (audio.violaEnergy * .08 + audio.drop * .1) + voice * .05;
    this.camera.minZ = .15 + reveal * 8;
    this.scene.fogDensity = showFogDensity(time, audio.violaEnergy)
      + cueEnvelope(time, 46, CINEMA.clapperStart, .7) * .012;
    this.scene.fogColor.set(.022 + this.tint.r * .008, .033 + this.tint.g * .022, .04 + this.tint.b * .03);
    this.fill.intensity = .35 + wake * .3 + reveal * .55;
    this.sun.intensity = .5 + wake * .5 + reveal * 1.2;
    this.headlight.intensity = (100 + wake * 90 + pulse * 95 + voice * 100) * (1 - reveal);
    this.headlight.diffuse.copyFromFloats(cinema ? 1 : .47, cinema ? .8 : 1, cinema ? .58 : .86);
    if (cinema) this.headlight.intensity *= .65;
    this.labyrinth.cyan.emissiveColor.copyFrom(this.tint).scaleInPlace(.8 + wake * .55 + reveal * 1.5 + pulse + voice * 1.8);
    this.labyrinth.amber.emissiveColor.set(1.25 + reveal * 1.75, .52 + reveal * .25, .26);
    if (cinema) {
      this.labyrinth.cyan.emissiveColor.scaleInPlace(.3);
      this.labyrinth.amber.emissiveColor.scaleInPlace(.3);
    }
    this.labyrinth.roof.emissiveColor.set(.008 + reveal * .067, .018 + reveal * .15, .023 + reveal * .17);
    this.labyrinth.bridge.update(time);
    this.labyrinth.meshes.forEach((mesh) => {
      mesh.setEnabled(cameraTime < CINEMA.lens - .15 || cameraTime >= CINEMA.tunnelRoomReady);
    });
    this.atmosphere.dust.position.y = Math.sin(time * .13) * DUST.drift;
    this.caption.visibility = smoothstep((time - 170) / 3);
    this.branding.update(time);
    updateInterior(this.interior, time);
    this.interior.root.setEnabled(!cinema);
    const rescueSpace = this.simready.config.enabled && this.simready.config.enableToulouseEasterEggs
      ? 1 - cueEnvelope(time, TERMINATOR.start - .7, TERMINATOR.end, .7, 1) : 1;
    this.interior.core.scaling.setAll((1 + audio.bass * calm * .025
      + audio.drop * cueEnvelope(time, 120, 155, 2) * .18) * Math.max(.001, rescueSpace));
    this.interior.rings.forEach((ring) => ring.scaling.setAll(Math.max(.001, rescueSpace)));
    this.portals.forEach((portal) => portal.update(time, audio));
    this.easterEggs.update(time, cameraTime);
    this.arcade.update(time, audio);
    this.pixelWorld.update(time, audio);
    this.cathedral.update(time, audio);
    this.demoscene.update(time, audio, speed);
    this.cinema.update(time, audio, cameraTime);
    this.simready.update(time, audio);
    this.cinema.terminator.update(time, this.simready.cassouletRescue,
      this.simready.config.enabled && this.simready.config.enableToulouseEasterEggs);
    this.cassouletPoster.update(time, this.simready.cassouletRescue?.rescue?.destroyTime,
      this.simready.config.enabled && this.simready.config.enableToulouseEasterEggs);
    this.popcorn.update(time, audio, speed);
    this.digitalMoments.update(time, audio);
    this.overflow.update(time);
    this.arcadePhysics.update(time, audio);
    this.music.update(time, audio, cinema);
    this.floorEqualizer.update(time, audio);
    this.wallMeters.update(time, audio);
    if (cinema) {
      this.floorEqualizer.mesh.setEnabled(false);
      this.wallMeters.mesh.setEnabled(false);
    }
  }

  get cellCount(): number { return this.labyrinth.cellCount; }
}
