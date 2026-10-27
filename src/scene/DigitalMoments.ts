import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder";
import type { Mesh } from "@babylonjs/core/Meshes/mesh";
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
import { Color3 } from "@babylonjs/core/Maths/math.color";
import { Matrix, Quaternion, Vector3 } from "@babylonjs/core/Maths/math.vector";
import type { Scene } from "@babylonjs/core/scene";
import "@babylonjs/core/Meshes/thinInstanceMesh";
import { routeAnchor } from "../camera/CameraPath";
import { SPEAKERS, THEME_COLORS } from "../content/speakers";
import { cueEnvelope } from "../content/cues";
import type { AudioFeatures } from "../engine/AudioAnalyzer";
import { smoothstep } from "../engine/Timeline";
import { DATA_ARCH_LIFT } from "../content/showBeats";
import { dataArchLift } from "../content/dataArch";

interface Stream {
  mesh: Mesh;
  matrices: Float32Array;
  gateTime: number;
  start: number;
  end: number;
  yaw: number;
  material: StandardMaterial;
  tint: Color3;
}

export const DIGITAL_PROGRESSION = { start: 114, end: 132, gates: [116, 119, 122, 125, 128, 131] } as const;

export class DigitalMoments {
  private readonly streams: Stream[] = [];
  private readonly position = Vector3.Zero();
  private readonly scale = Vector3.Zero();
  private readonly transform = Matrix.Identity();
  private readonly progression: Mesh;
  private readonly progressionMatrices = new Float32Array(DIGITAL_PROGRESSION.gates.length * 4 * 16);
  private readonly progressionMaterial: StandardMaterial;
  private readonly cool = Color3.FromHexString("#8de5df");
  private readonly warm = Color3.FromHexString("#ffe29e");

  constructor(scene: Scene) {
    this.progressionMaterial = new StandardMaterial("FX/Digital / cyan to golden architecture", scene);
    this.progressionMaterial.disableLighting = true;
    this.progressionMaterial.diffuseColor = Color3.Black();
    this.progression = MeshBuilder.CreateBox("FX/Digital / evolving data corridor", { size: 1 }, scene);
    this.progression.material = this.progressionMaterial;
    this.progression.isPickable = false;
    this.progression.alwaysSelectAsActiveMesh = true;
    this.progression.thinInstanceSetBuffer("matrix", this.progressionMatrices, 16, false);
    for (const speaker of SPEAKERS.filter((entry) => entry.world === "digital")) {
      const material = new StandardMaterial(`FX/Digital / ${speaker.name} data color`, scene);
      material.disableLighting = true;
      material.diffuseColor = Color3.Black();
      const tint = Color3.FromHexString(THEME_COLORS[speaker.visualTheme]);
      material.emissiveColor = tint.scale(1.4);
      const mesh = MeshBuilder.CreateBox(`FX/Digital / ${speaker.name} converging streams`, { size: 1 }, scene);
      mesh.material = material;
      mesh.isPickable = false;
      mesh.alwaysSelectAsActiveMesh = true;
      const matrices = new Float32Array(48 * 16);
      mesh.thinInstanceSetBuffer("matrix", matrices, 16, false);
      this.streams.push({
        mesh, matrices, gateTime: speaker.gateTime, start: speaker.startTime - 2,
        end: speaker.visualTheme === "overclock" ? 155 : speaker.endTime,
        yaw: routeAnchor(speaker.gateTime).yaw, material, tint,
      });
    }
  }

  update(time: number, audio: AudioFeatures): void {
    const progression = cueEnvelope(time, DIGITAL_PROGRESSION.start, DIGITAL_PROGRESSION.end, 1);
    this.progression.setEnabled(progression > 0);
    if (progression > 0) {
      const build = smoothstep((time - DIGITAL_PROGRESSION.start) / 14);
      Color3.LerpToRef(this.cool, this.warm, build, this.progressionMaterial.emissiveColor);
      this.progressionMaterial.emissiveColor.scaleInPlace(progression * (1.2 + audio.kick * .4 + audio.mid * .2));
      for (const [index, gate] of DIGITAL_PROGRESSION.gates.entries()) {
        const anchor = routeAnchor(gate);
        const height = 8 + 20 * smoothstep((time - gate + 6) / 3);
        const lift = gate === DATA_ARCH_LIFT.gateTime ? dataArchLift(time) : 0;
        const pulse = 1 + Math.exp(-((time - gate + 1) ** 2)) * .7;
        for (let part = 0; part < 4; part++) {
          const side = part === 0 ? -1 : part === 1 ? 1 : 0;
          const lateral = side * 11.4;
          this.position.set(anchor.position.x + Math.cos(anchor.yaw) * lateral,
            (side ? height / 2 : part === 2 ? height : .3) + lift,
            anchor.position.z - Math.sin(anchor.yaw) * lateral);
          this.scale.set(side ? .15 * pulse : 22.8, side ? height : .15 * pulse, .22 * pulse);
          Matrix.ComposeToRef(this.scale, Quaternion.RotationYawPitchRoll(anchor.yaw, 0, 0),
            this.position, this.transform);
          this.transform.copyToArray(this.progressionMatrices, (index * 4 + part) * 16);
        }
      }
      this.progression.thinInstanceBufferUpdated("matrix");
    }
    this.streams.forEach(({ mesh, matrices, gateTime, start, end, yaw, material, tint }, stream) => {
      const energy = cueEnvelope(time, start, end, 1);
      mesh.setEnabled(energy > 0);
      if (!mesh.isEnabled()) return;
      const anchor = routeAnchor(gateTime);
      const build = smoothstep((time - start) / 5);
      const climax = stream === 1 ? smoothstep((time - 137) / 6) : 0;
      material.emissiveColor.copyFrom(tint)
        .scaleInPlace((.6 + energy * .8 + climax * .75) * (1 + audio.kick * .35 + audio.drop * .6));
      for (let index = 0; index < 48; index++) {
        const side = index % 2 ? 1 : -1;
        const lane = Math.floor(index / 2) % 6;
        const phase = (time * (stream ? 7 : 4) + index * 1.1) % 25;
        const lateral = side * (11 - 7.5 * build + Math.sin(time * .8 + index) * .45);
        const forward = -20 + phase;
        const rise = 2.5 + (index % 8) * 2.8 + Math.sin(time * 2 + lane) * (stream ? 1.1 : .4);
        this.position.set(anchor.position.x + Math.cos(yaw) * lateral + Math.sin(yaw) * forward,
          rise, anchor.position.z - Math.sin(yaw) * lateral + Math.cos(yaw) * forward);
        this.scale.set(.08 + audio.treble * .1, .3 + climax * 2.5 + audio.mid * .5,
          .5 + audio.bass * 1.2 + climax * 1.6);
        Matrix.ComposeToRef(this.scale, Quaternion.RotationYawPitchRoll(yaw, 0, 0),
          this.position, this.transform);
        this.transform.copyToArray(matrices, index * 16);
      }
      mesh.thinInstanceBufferUpdated("matrix");
    });
  }
}
