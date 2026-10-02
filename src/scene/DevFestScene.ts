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
import type { Engine } from "@babylonjs/core/Engines/engine";
import { cameraPose } from "../camera/CameraPath";
import { PHASES, smoothstep } from "../engine/Timeline";
import { silentFeatures, type AudioFeatures } from "../engine/AudioAnalyzer";
import type { Section } from "../engine/protocol";
import { SPEAKERS } from "../content/speakers";
import { createLabyrinth } from "./Labyrinth";
import { createInterior, updateInterior, createFinalCaption } from "./Interior";
import { createAtmosphere, DUST, showFogDensity } from "./Atmosphere";
import { SpeakerPortal } from "./SpeakerPortal";
import { EasterEggs } from "./EasterEggs";
import { MusicReactive } from "../effects/MusicReactive";
import { EventBranding } from "./EventBranding";

const SILENCE = silentFeatures();
const PALETTE = ["#68d7be", "#76ffe0", "#b19dff", "#ffa999", "#ffd28d", "#77ffe3"].map(Color3.FromHexString);

export class DevFestScene {
  readonly scene: Scene;
  readonly camera: FreeCamera;
  readonly pipeline: DefaultRenderingPipeline;
  readonly glow: GlowLayer;
  readonly portals: SpeakerPortal[];
  private readonly easterEggs: EasterEggs;
  private readonly music: MusicReactive;
  private readonly branding: EventBranding;
  private readonly tint = new Color3();
  private readonly labyrinth;
  private readonly interior;
  private readonly atmosphere;
  private readonly caption;
  private readonly fill: HemisphericLight;
  private readonly sun: DirectionalLight;
  private readonly headlight: PointLight;

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
    this.portals = SPEAKERS.map((speaker, index) => new SpeakerPortal(scene, speaker, index));
    this.easterEggs = new EasterEggs(scene);
    this.branding = new EventBranding(scene, this.easterEggs.container, this.portals[1]);
    this.music = new MusicReactive(scene);
    this.glow = new GlowLayer("Architectural light bloom", scene, { mainTextureRatio: .5, blurKernelSize: 32 });
    this.glow.addExcludedMesh(this.music.particles);
    // Keep non-emissive geometry in the glow depth pass: hidden lights must not bleed through walls.
    this.glow.customEmissiveColorSelector = (mesh, _subMesh, material, result) => {
      if (material instanceof StandardMaterial && /FX\/|light traces|running lights|data banks|computational core|Core orbit|Depth gates/.test(mesh.name)) {
        const color = material.emissiveColor;
        result.set(color.r, color.g, color.b, 1);
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
    this.update(0);
  }

  async prepare(): Promise<void> {
    await this.branding.ready;
    await this.scene.whenReadyAsync();
    await Promise.all(this.scene.meshes.map((mesh) => mesh.material?.forceCompilationAsync(mesh, {
      useInstances: mesh instanceof Mesh && mesh.hasThinInstances,
    })));
  }

  setPostProcessing(enabled: boolean): void {
    this.pipeline.bloomEnabled = enabled;
    this.pipeline.fxaaEnabled = enabled && this.pipeline.samples === 1;
    this.pipeline.imageProcessingEnabled = enabled;
    this.glow.isEnabled = enabled;
  }

  update(time: number, audio: AudioFeatures = SILENCE, section: Section | null = null): void {
    const aspect = this.engine.getRenderWidth() / this.engine.getRenderHeight();
    const pose = cameraPose(time, aspect);
    this.camera.position.copyFrom(pose.position);
    this.camera.setTarget(pose.target);
    this.camera.fov = pose.fov;
    this.headlight.position.copyFrom(pose.position);
    const wake = smoothstep(time / 35);
    const reveal = smoothstep((time - 163) / 10);
    const calm = 1 - smoothstep((time - 155) / 22);
    const paletteTime = time < 155 && section ? PHASES.find((phase) => phase.name === section)!.time + 6 : time;
    let index = 0;
    for (let i = 1; i < PHASES.length; i++) if (paletteTime >= PHASES[i].time) index = i;
    Color3.LerpToRef(PALETTE[Math.max(0, index - 1)], PALETTE[index], smoothstep((paletteTime - PHASES[index].time) / 6), this.tint);
    const pulse = calm * (audio.kick * .32 + audio.snare * .2 + audio.drop * .3);
    const voice = calm * audio.energy;
    this.glow.intensity = .2 + reveal * .35 + pulse * .15 + voice * .25;
    this.pipeline.bloomWeight = .2 + calm * (audio.violaEnergy * .08 + audio.drop * .1) + voice * .05;
    this.camera.minZ = .15 + reveal * 8;
    this.scene.fogDensity = showFogDensity(time, audio.violaEnergy);
    this.scene.fogColor.set(.022 + this.tint.r * .008, .033 + this.tint.g * .022, .04 + this.tint.b * .03);
    this.fill.intensity = .35 + wake * .3 + reveal * .55;
    this.sun.intensity = .5 + wake * .5 + reveal * 1.2;
    this.headlight.intensity = (100 + wake * 90 + pulse * 95 + voice * 100) * (1 - reveal);
    this.labyrinth.cyan.emissiveColor.copyFrom(this.tint).scaleInPlace(.8 + wake * .55 + reveal * 1.5 + pulse + voice * 1.8);
    this.labyrinth.amber.emissiveColor.set(1.25 + reveal * 1.75, .52 + reveal * .25, .26);
    this.labyrinth.roof.emissiveColor.set(.008 + reveal * .067, .018 + reveal * .15, .023 + reveal * .17);
    this.atmosphere.dust.position.y = Math.sin(time * .13) * DUST.drift;
    this.caption.visibility = smoothstep((time - 175) / 3);
    this.branding.update(time);
    updateInterior(this.interior, time);
    this.interior.core.scaling.setAll(1 + audio.bass * calm * .025);
    this.portals.forEach((portal) => portal.update(time, audio));
    this.easterEggs.update(time);
    this.music.update(time, audio);
  }

  get cellCount(): number { return this.labyrinth.cellCount; }
}
