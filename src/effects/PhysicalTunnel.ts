import { FreeCamera } from "@babylonjs/core/Cameras/freeCamera";
import { Mesh } from "@babylonjs/core/Meshes/mesh";
import { VertexData } from "@babylonjs/core/Meshes/mesh.vertexData";
import { ShaderMaterial } from "@babylonjs/core/Materials/shaderMaterial";
import { RenderTargetTexture } from "@babylonjs/core/Materials/Textures/renderTargetTexture";
import { Color4 } from "@babylonjs/core/Maths/math.color";
import { Vector3, Vector4 } from "@babylonjs/core/Maths/math.vector";
import type { Scene } from "@babylonjs/core/scene";
import { silentFeatures, type AudioFeatures } from "../engine/AudioAnalyzer";
import { CINEMA } from "../content/showBeats";
import { clamp } from "../engine/Timeline";
import { TUNNEL_DISTANCES, TUNNEL_EXIT_INDEX, TUNNEL_POINTS, TUNNEL_RADIUS, tunnelFlightPose } from "../camera/TunnelFlight";
import { SPEAKERS } from "../content/speakers";

export const TUNNEL_LAYER = 0x10000000;
const trailColors = ["#8cffe0", "#ffa999", "#b7a0ff", "#ffe29e"];
export const TUNNEL_SPEAKER_TRAILS = SPEAKERS.map((speaker, index) => ({ name: speaker.name, color: trailColors[index] }));

export function tunnelAudioBands(audio: AudioFeatures): [number, number, number, number] {
  return [clamp(audio.bass), clamp(audio.lowMid), clamp(audio.highMid), clamp(audio.treble)];
}

export class PhysicalTunnel {
  readonly mesh: Mesh;
  readonly material: ShaderMaterial;
  readonly camera: FreeCamera;
  readonly texture: RenderTargetTexture;
  readonly bands = [0, 0, 0, 0];
  private active = false;
  private readonly bandVector = new Vector4(0, 0, 0, 0);

  constructor(private readonly scene: Scene) {
    this.mesh = new Mesh("FX/Tunnel / continuous enclosed 3D labyrinth", scene);
    this.mesh.layerMask = TUNNEL_LAYER;
    this.mesh.isPickable = false;
    const positions: number[] = [], normals: number[] = [], uvs: number[] = [], indices: number[] = [];
    const sides = 64;
    for (const [ring, center] of TUNNEL_POINTS.entries()) {
      if (ring > TUNNEL_EXIT_INDEX) break;
      const direction = TUNNEL_POINTS[Math.min(TUNNEL_POINTS.length - 1, ring + 1)]
        .subtract(TUNNEL_POINTS[Math.max(0, ring - 1)]).normalize();
      const right = Vector3.Cross(Vector3.Up(), direction).normalize();
      const up = Vector3.Cross(direction, right).normalize();
      const distance = TUNNEL_DISTANCES[ring];
      const radius = TUNNEL_RADIUS + Math.sin(distance * .26) * .45 + Math.sin(distance * .11) * .3;
      for (let side = 0; side <= sides; side++) {
        const angle = side / sides * Math.PI * 2;
        const normal = right.scale(Math.cos(angle)).add(up.scale(Math.sin(angle)));
        positions.push(...center.add(normal.scale(radius)).asArray());
        normals.push(...normal.negate().asArray());
        uvs.push(distance, side / sides);
        if (ring && side < sides) {
          const current = ring * (sides + 1) + side, before = current - sides - 1;
          indices.push(before, current, before + 1, before + 1, current, current + 1);
        }
      }
    }
    const data = new VertexData();
    data.positions = positions; data.normals = normals; data.uvs = uvs; data.indices = indices;
    data.applyToMesh(this.mesh);
    this.material = new ShaderMaterial("FX/Tunnel / ribbed sci-fi shell and FFT speaker trails", scene, {
      vertexSource: `
        precision highp float;
        attribute vec3 position, normal;
        attribute vec2 uv;
        uniform mat4 world, worldViewProjection;
        varying vec2 vUV;
        varying vec3 vPosition, vNormal;
        void main() {
          vUV = uv;
          vPosition = (world * vec4(position,1.0)).xyz;
          vNormal = normalize((world * vec4(normal,0.0)).xyz);
          gl_Position = worldViewProjection * vec4(position,1.0);
        }`,
      fragmentSource: `
        precision highp float;
        varying vec2 vUV;
        varying vec3 vPosition, vNormal;
        uniform vec3 eye;
        uniform float clock, kick;
        uniform vec4 bands;
        vec3 trailColor(int i) {
          if (i == 0) return vec3(.55,1.0,.88);
          if (i == 1) return vec3(1.0,.46,.35);
          if (i == 2) return vec3(.58,.35,1.0);
          return vec3(1.0,.78,.30);
        }
        void main() {
          float s = vUV.x;
          float angle = vUV.y * 6.2831853;
          vec3 view = normalize(eye-vPosition);
          float light = .22 + .78 * pow(max(0.0,dot(normalize(vNormal),view)),2.0);
          float ribs = pow(.5+.5*cos(s*.72),16.0);
          float circuit = pow(.5+.5*cos(angle*24.0 + sin(s*.04)),28.0);
          float panels = .5+.5*sin(s*.16 + floor(vUV.y*18.0)*1.7);
          vec3 tint = mix(vec3(.025,.43,.58),vec3(.32,.08,.60),.5+.5*sin(angle*2.0+s*.018));
          vec3 color = vec3(.006,.009,.024) + tint * light * (.18 + ribs*(.6+kick*.4) + circuit*.35 + panels*.12);
          for (int i=0;i<4;i++) {
            float band = i==0 ? bands.x : i==1 ? bands.y : i==2 ? bands.z : bands.w;
            float path = float(i)*1.5707963 + sin(s*.023-clock*.7+float(i))* .48
              + sin(s*.061+clock*.4+float(i)*1.7)*(.16+band*.12);
            float delta = abs(atan(sin(angle-path),cos(angle-path)));
            float core = exp(-pow(delta/(.022+band*.016),2.0));
            float halo = exp(-delta*13.0);
            float packet = pow(.5+.5*sin(s*.19-clock*(26.0+float(i)*3.0)),8.0);
            color += trailColor(i)*(core*(.8+band*1.4)+halo*(.18+band*.45))*(.7+packet*.5);
          }
          float distance = length(eye-vPosition);
          color *= .35+.65*exp(-distance*.008);
          gl_FragColor = vec4(color,1.0);
        }`,
    }, { attributes: ["position", "normal", "uv"], uniforms: ["world", "worldViewProjection", "eye", "clock", "kick", "bands"] });
    this.material.backFaceCulling = false;
    this.mesh.material = this.material;
    this.camera = new FreeCamera("Tunnel / physical flight camera", TUNNEL_POINTS[0].clone(), scene);
    this.camera.layerMask = TUNNEL_LAYER;
    this.camera.minZ = .12;
    this.camera.maxZ = 1400;
    this.camera.inputs.clear();
    this.texture = new RenderTargetTexture("Tunnel / physical interior and lens preview", { ratio: .75 }, scene, false);
    this.texture.activeCamera = this.camera;
    this.texture.samples = Math.max(1, Math.min(4, scene.getEngine().getCaps().maxMSAASamples));
    this.texture.renderList = [this.mesh];
    this.texture.renderParticles = false;
    this.texture.renderSprites = false;
    this.texture.hasAlpha = true;
    this.texture.clearColor = new Color4(0, 0, 0, 0);
    scene.onDisposeObservable.addOnce(() => this.texture.dispose());
    this.update(0, silentFeatures());
  }

  update(time: number, audio: AudioFeatures): void {
    const active = time >= CINEMA.start && time < CINEMA.vortexEnd;
    if (active !== this.active) {
      const index = this.scene.customRenderTargets.indexOf(this.texture);
      if (active && index < 0) this.scene.customRenderTargets.push(this.texture);
      else if (!active && index >= 0) this.scene.customRenderTargets.splice(index, 1);
      this.active = active;
    }
    this.mesh.setEnabled(active);
    const pose = tunnelFlightPose(time);
    this.camera.position.copyFrom(pose.position);
    this.camera.upVector.copyFrom(pose.up);
    this.camera.setTarget(pose.target);
    this.camera.fov = pose.fov;
    this.material.setVector3("eye", pose.position);
    this.material.setFloat("clock", time - CINEMA.lens);
    this.material.setFloat("kick", clamp(audio.kick));
    const bands = tunnelAudioBands(audio);
    this.bands.splice(0, 4, ...bands);
    this.material.setVector4("bands", this.bandVector.set(...bands));
  }
}
