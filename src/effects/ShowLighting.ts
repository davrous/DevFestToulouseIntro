import { Mesh } from "@babylonjs/core/Meshes/mesh";
import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder";
import { VertexData } from "@babylonjs/core/Meshes/mesh.vertexData";
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
import { ShaderMaterial } from "@babylonjs/core/Materials/shaderMaterial";
import { Color3 } from "@babylonjs/core/Maths/math.color";
import { Matrix, Quaternion, Vector3 } from "@babylonjs/core/Maths/math.vector";
import { SpotLight } from "@babylonjs/core/Lights/spotLight";
import type { Scene } from "@babylonjs/core/scene";
import type { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import { routeAnchor } from "../camera/CameraPath";
import { THEME_COLORS, type SpeakerConfig } from "../content/speakers";
import { cueEnvelope } from "../content/cues";
import { smoothstep } from "../engine/Timeline";
import type { AudioFeatures } from "../engine/AudioAnalyzer";
import "@babylonjs/core/Meshes/thinInstanceMesh";

export function laserStrength(time: number, speaker: SpeakerConfig, audio: AudioFeatures): number {
  const envelope = cueEnvelope(time, speaker.startTime - 3, speaker.endTime, .55);
  const reveal = 1 - smoothstep((time - 153) / 2);
  const beat = .5 + .5 * Math.sin(time * 5.2);
  return envelope * reveal * Math.min(1, (.38 + beat * .18 + audio.energy * .28
    + audio.kick * .15 + audio.drop * .23) * (speaker.visualTheme === "overclock" ? 1.25 : 1));
}

export function speakerReveal(time: number, speaker: SpeakerConfig): number {
  return smoothstep((time - speaker.startTime - .25) / 1.8)
    * (1 - smoothstep((time - speaker.endTime + .8) / .8));
}

export function laserReach(time: number, speaker: SpeakerConfig): number {
  return smoothstep((time - speaker.startTime + 3) / .6);
}

export function laserAim(time: number, speaker: SpeakerConfig): number {
  return smoothstep((time - speaker.startTime + 2) / 1.75);
}

export function spotlightSweep(time: number, speaker: SpeakerConfig): number {
  return smoothstep((time - speaker.startTime - .25) / 2.5);
}

export function floorVisibility(time: number): number {
  return 1 - smoothstep((time - 151) / 4);
}

export function spectrumBarHeight(time: number, station: number, lane: number, audio: AudioFeatures): number {
  const proximity = 1 - smoothstep((Math.abs(time - station) - 9) / 8);
  const wave = .5 + .5 * Math.sin(time * 5 - station * .7 + lane * 2);
  const band = [audio.bass, Math.max(audio.mid, audio.violaEnergy),
    Math.max(audio.treble, audio.violaEnergy * .6)][lane];
  return .025 + 2.4 * proximity * floorVisibility(time) * Math.min(1,
    .16 + wave * .2 + band * .5 + audio.kick * .18 + audio.snare * .1 + audio.drop * .26);
}

export function laserEndpoints(time: number, speaker: SpeakerConfig, side: number, ray: number): { origin: Vector3; target: Vector3 } {
  const width = speaker.gateWidth ?? 24;
  const height = Math.min(25, routeAnchor(speaker.gateTime, speaker.lateralOffset).position.y + 6.5);
  const towardCamera = new Vector3(side * (2.5 + ray * 1.3), 7 + ray * 1.25, -18 - ray * 1.5);
  const towardCard = new Vector3(side * (width / 2 + .2 + ray * .12),
    height + (ray - 1) * 1.75, -.43 + Math.sin((time - speaker.startTime) * 1.6 + ray * 1.8) * .25);
  return {
    origin: new Vector3(side * (width / 2 - .4), .38, -4.5),
    target: Vector3.Lerp(towardCamera, towardCard, laserAim(time, speaker)),
  };
}

export class PortalLasers {
  private readonly beams: { core: Mesh; haze: Mesh; side: number; ray: number }[] = [];
  private readonly scanners: Mesh[] = [];
  private readonly projectors: { light: SpotLight; source: Vector3; focus: Vector3; side: number }[] = [];
  private readonly coreMaterial: StandardMaterial;
  private readonly hazeMaterial: StandardMaterial;
  private readonly scannerMaterial: StandardMaterial;

  constructor(scene: Scene, parent: TransformNode, private readonly speaker: SpeakerConfig) {
    const tint = Color3.FromHexString(THEME_COLORS[speaker.visualTheme]);
    this.coreMaterial = new StandardMaterial(`FX/Laser core ${speaker.name}`, scene);
    this.coreMaterial.disableLighting = true;
    this.coreMaterial.emissiveColor = tint.scale(2);
    this.coreMaterial.diffuseColor = Color3.Black();
    this.coreMaterial.disableDepthWrite = true;
    this.hazeMaterial = new StandardMaterial(`FX/Laser haze ${speaker.name}`, scene);
    this.hazeMaterial.disableLighting = true;
    this.hazeMaterial.emissiveColor = tint.scale(.8);
    this.hazeMaterial.diffuseColor = Color3.Black();
    this.hazeMaterial.disableDepthWrite = true;
    this.scannerMaterial = new StandardMaterial(`FX/Scanner ${speaker.name}`, scene);
    this.scannerMaterial.disableLighting = true;
    this.scannerMaterial.emissiveColor = tint.scale(1.6);
    this.scannerMaterial.diffuseColor = Color3.Black();
    this.scannerMaterial.disableDepthWrite = true;
    for (const side of [-1, 1]) {
      const source = new Vector3(side * (speaker.gateWidth ?? 24) / 2 - side * 1.6, .38, -4.5);
      const focus = new Vector3(side * 3, Math.min(25, routeAnchor(speaker.gateTime, speaker.lateralOffset).position.y + 6.5), -.12);
      const projector = new SpotLight(`Speaker floor spotlight ${speaker.name} / ${side}`,
        source, focus.subtract(source).normalize(), 1.1, 2, scene);
      projector.parent = parent;
      projector.diffuse = tint;
      projector.specular = tint.scale(.35);
      projector.range = 50;
      projector.intensity = 0;
      this.projectors.push({ light: projector, source, focus, side });
      for (let ray = 0; ray < 4; ray++) {
        const core = MeshBuilder.CreateCylinder(`FX/Laser ${speaker.name}`, { height: 1, diameter: .2, tessellation: 6 }, scene);
        const haze = MeshBuilder.CreateCylinder(`FX/Laser halo ${speaker.name}`, { height: 1, diameter: 1.1, tessellation: 8 }, scene);
        for (const mesh of [core, haze]) { mesh.parent = parent; mesh.isPickable = false; }
        core.material = this.coreMaterial;
        haze.material = this.hazeMaterial;
        this.beams.push({ core, haze, side, ray });
      }
      const scanner = MeshBuilder.CreateBox(`FX/Portal scanner ${speaker.name}`, { width: .24, height: 2.8, depth: .2 }, scene);
      scanner.parent = parent;
      scanner.material = this.scannerMaterial;
      scanner.isPickable = false;
      this.scanners.push(scanner);
    }
  }

  update(time: number, audio: AudioFeatures): void {
    const strength = laserStrength(time, this.speaker, audio);
    const reach = laserReach(time, this.speaker);
    const aim = laserAim(time, this.speaker);
    const sweep = spotlightSweep(time, this.speaker);
    const sweepGlow = cueEnvelope(time, this.speaker.startTime + .25, this.speaker.startTime + 3.5, .35);
    for (const { light, source, focus, side } of this.projectors) {
      light.intensity = strength * reach * (16000 + sweepGlow * 7000);
      const nameFocus = new Vector3(side * (.35 + sweep * ((this.speaker.gateWidth ?? 24) / 2 - 2.5)), focus.y, focus.z);
      light.direction.copyFrom(Vector3.Lerp(new Vector3(side * 3, 8, -19), nameFocus, aim).subtract(source).normalize());
    }
    for (const { core, haze, ray } of this.beams) {
      core.setEnabled(strength > .005 && (ray !== 3 || sweepGlow > .005));
      haze.setEnabled(core.isEnabled());
    }
    for (const scanner of this.scanners) scanner.setEnabled(strength > .005 && reach > .95);
    if (strength <= .005) return;
    this.coreMaterial.alpha = .4 + strength * .55;
    this.hazeMaterial.alpha = strength * .48;
    this.scannerMaterial.alpha = strength * .85;
    const phase = time - this.speaker.startTime;
    for (const { core, haze, side, ray } of this.beams) {
      if (!core.isEnabled()) continue;
      const { origin, target } = ray === 3
        ? { origin: laserEndpoints(time, this.speaker, side, 0).origin,
          target: new Vector3(side * (.35 + sweep * ((this.speaker.gateWidth ?? 24) / 2 - 2.5)),
            Math.min(25, routeAnchor(this.speaker.gateTime, this.speaker.lateralOffset).position.y + 6.5), -.35) }
        : laserEndpoints(time, this.speaker, side, ray);
      const end = Vector3.Lerp(origin, target, reach);
      const delta = end.subtract(origin);
      const length = delta.length();
      const direction = delta.scale(1 / length);
      const axis = Vector3.Cross(Vector3.Up(), direction).normalize();
      const rotation = Quaternion.RotationAxis(axis, Math.acos(Vector3.Dot(Vector3.Up(), direction)));
      for (const mesh of [core, haze]) {
        mesh.position.copyFrom(origin.add(end).scale(.5));
        mesh.rotationQuaternion = rotation;
        mesh.scaling.y = length;
      }
    }
    this.scanners.forEach((scanner, index) => {
      scanner.position.set((index ? 1 : -1) * ((this.speaker.gateWidth ?? 24) / 2 - .13), 3 + (phase * 9 % 24), -.22);
    });
  }
}

interface FloorStation {
  time: number;
  position: Vector3;
  yaw: number;
  rotation: Quaternion;
}

export const FLOOR_STATION_TIMES = Array.from({ length: 48 }, (_, index) => 9 + index * 3);

export class FloorEqualizer {
  private readonly material: ShaderMaterial;
  private readonly stations: FloorStation[] = FLOOR_STATION_TIMES.map((time) => {
    const { position, yaw } = routeAnchor(time);
    return { time, position, yaw, rotation: Quaternion.RotationYawPitchRoll(yaw, 0, 0) };
  });
  private readonly bars: { mesh: Mesh; stations: FloorStation[]; matrices: Float32Array }[] = [];
  private readonly transform = Matrix.Identity();
  private readonly scale = new Vector3();
  private readonly center = new Vector3();
  readonly mesh: Mesh;

  constructor(scene: Scene) {
    this.mesh = new Mesh("FX/Floor circuit equalizer", scene);
    const positions: number[] = [];
    const colors: number[] = [];
    const indices: number[] = [];
    for (const { time: station, position, yaw } of this.stations) {
      for (let lane = 0; lane < 3; lane++) {
        for (let segment = 1; segment <= 6; segment++) {
          const x = (lane - 1) * 6.5;
          const z = (segment - 3.5) * 1.2;
          const first = positions.length / 3;
          for (const [dx, dz] of [[-1, -.43], [1, -.43], [1, .43], [-1, .43]]) {
            const localX = x + dx;
            const localZ = z + dz;
            positions.push(position.x + Math.cos(yaw) * localX + Math.sin(yaw) * localZ, .19,
              position.z - Math.sin(yaw) * localX + Math.cos(yaw) * localZ);
            colors.push(lane / 2, segment / 6, station / 180, 1);
          }
          indices.push(first, first + 1, first + 2, first, first + 2, first + 3);
        }
      }
    }
    const data = new VertexData();
    data.positions = positions;
    data.colors = colors;
    data.indices = indices;
    data.applyToMesh(this.mesh);
    this.mesh.isPickable = false;
    this.material = new ShaderMaterial("Floor circuit pulse", scene, {
      vertexSource: `
        precision highp float;
        attribute vec3 position;
        attribute vec4 color;
        uniform mat4 worldViewProjection;
        varying vec3 code;
        void main() {
          code = color.rgb;
          gl_Position = worldViewProjection * vec4(position, 1.0);
        }`,
      fragmentSource: `
        precision highp float;
        varying vec3 code;
        uniform float time, visibility, bass, mid, treble, kick, snare, drop;
        void main() {
          float station = code.b * 180.0;
          float proximity = 1.0 - smoothstep(9.0, 17.0, abs(time - station));
          float boot = mix(0.55, 1.0, smoothstep(26.0, 36.0, time));
          float overclock = 1.0 + 0.32 * smoothstep(118.0, 126.0, time);
          float wave = 0.5 + 0.5 * sin(time * 5.0 - station * 0.7 + code.r * 4.0);
          float band = code.r < 0.25 ? bass : (code.r < 0.75 ? mid : treble);
          float level = min(1.0, 0.25 + 0.2 * wave + band * 0.56
            + kick * (0.12 + 0.1 * wave) + snare * 0.1 + drop * 0.24);
          float lit = smoothstep(code.g - 0.085, code.g + 0.04, level);
          vec3 tint = station < 59.0 ? vec3(0.28, 1.0, 0.79)
            : station < 89.0 ? vec3(0.67, 0.56, 1.0)
            : station < 119.0 ? vec3(1.0, 0.55, 0.44) : vec3(1.0, 0.8, 0.39);
          gl_FragColor = vec4(tint * (0.4 + lit * 1.5),
            proximity * visibility * boot * min(overclock, 1.25) * (0.04 + lit * 0.7));
        }`,
    }, { attributes: ["position", "color"], uniforms: ["worldViewProjection", "time", "visibility", "bass", "mid", "treble", "kick", "snare", "drop"], needAlphaBlending: true });
    this.material.backFaceCulling = false;
    this.material.disableDepthWrite = true;
    this.mesh.material = this.material;
    const themes = [THEME_COLORS.signal, THEME_COLORS.neural, THEME_COLORS.playground, THEME_COLORS.overclock];
    for (let phase = 0; phase < themes.length; phase++) {
      const stations = this.stations.filter(({ time }) =>
        (time < 60 ? 0 : time < 90 ? 1 : time < 120 ? 2 : 3) === phase);
      const material = new StandardMaterial(`FX/Floor spectrum ${phase}`, scene);
      material.disableLighting = true;
      material.diffuseColor = Color3.Black();
      material.emissiveColor = Color3.FromHexString(themes[phase]).scale(1.15);
      const mesh = MeshBuilder.CreateBox(`FX/Floor spectrum ${phase}`, { size: 1 }, scene);
      mesh.material = material;
      mesh.isPickable = false;
      mesh.alwaysSelectAsActiveMesh = true;
      const matrices = new Float32Array(stations.length * 3 * 16);
      mesh.thinInstanceSetBuffer("matrix", matrices, 16, false);
      this.bars.push({ mesh, stations, matrices });
    }
  }

  update(time: number, audio: AudioFeatures): void {
    const visibility = floorVisibility(time);
    this.mesh.setEnabled(visibility > 0);
    for (const { mesh, stations, matrices } of this.bars) {
      mesh.setEnabled(visibility > 0);
      if (visibility === 0) continue;
      let offset = 0;
      for (const station of stations) {
        for (let lane = 0; lane < 3; lane++) {
          const x = (lane - 1) * 6.5;
          const height = spectrumBarHeight(time, station.time, lane, audio);
          this.scale.set(1.55, height, 2);
          this.center.set(station.position.x + Math.cos(station.yaw) * x, .18 + height / 2,
            station.position.z - Math.sin(station.yaw) * x);
          Matrix.ComposeToRef(this.scale, station.rotation, this.center, this.transform);
          this.transform.copyToArray(matrices, offset);
          offset += 16;
        }
      }
      mesh.thinInstanceBufferUpdated("matrix");
    }
    this.material.setFloat("time", time);
    this.material.setFloat("visibility", visibility);
    this.material.setFloat("bass", audio.bass);
    this.material.setFloat("mid", Math.max(audio.mid, audio.violaEnergy));
    this.material.setFloat("treble", Math.max(audio.treble, audio.violaEnergy * .6));
    this.material.setFloat("kick", audio.kick);
    this.material.setFloat("snare", audio.snare);
    this.material.setFloat("drop", audio.drop);
  }
}
