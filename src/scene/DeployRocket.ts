import { Mesh } from "@babylonjs/core/Meshes/mesh";
import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder";
import { VertexData } from "@babylonjs/core/Meshes/mesh.vertexData";
import { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import { ShaderMaterial } from "@babylonjs/core/Materials/shaderMaterial";
import { PBRMaterial } from "@babylonjs/core/Materials/PBR/pbrMaterial";
import { Color3 } from "@babylonjs/core/Maths/math.color";
import type { Scene } from "@babylonjs/core/scene";
import { routeAnchor } from "../camera/CameraPath";
import { DEPLOY_ROCKET, rocketLift } from "../content/showBeats";
import { SEED, seededRandom } from "../content/title";
import { smoothstep } from "../engine/Timeline";
import { emissive } from "./Labyrinth";

export class DeployRocket {
  readonly root: TransformNode;
  readonly airframe: TransformNode;
  readonly particles: Mesh;
  private readonly exhaust: Mesh;
  private readonly burst: TransformNode;
  private readonly particleMaterial: ShaderMaterial;
  private readonly flash: Mesh;
  private readonly shock: Mesh;

  constructor(scene: Scene, metal: PBRMaterial) {
    const anchor = routeAnchor(DEPLOY_ROCKET.time, DEPLOY_ROCKET.lateral);
    this.root = new TransformNode("Toulouse / npm run launch", scene);
    this.root.position.set(anchor.position.x, 0, anchor.position.z);
    this.root.rotation.y = DEPLOY_ROCKET.yaw;
    this.airframe = new TransformNode("Rocket / flying airframe", scene);
    this.airframe.parent = this.root;
    const ceramic = new PBRMaterial("Rocket / warm ceramic", scene);
    ceramic.albedoColor = Color3.FromHexString("#dfebe7");
    ceramic.emissiveColor = Color3.FromHexString("#182b2f");
    ceramic.metallic = .35;
    ceramic.roughness = .4;
    const accent = emissive(scene, "Rocket / Toulouse coral fins", "#ffb39b", .8);
    const pad = MeshBuilder.CreateCylinder("Rocket / launch pad", { diameter: 7, height: .45, tessellation: 24 }, scene);
    pad.parent = this.root;
    pad.position.y = .225;
    pad.material = metal;
    const body = MeshBuilder.CreateCylinder("Rocket / deployment stage", { diameter: 3, height: 12, tessellation: 24 }, scene);
    body.parent = this.airframe;
    body.position.y = 8;
    body.material = ceramic;
    const nose = MeshBuilder.CreateCylinder("Rocket / payload fairing", {
      diameterBottom: 3, diameterTop: 0, height: 4, tessellation: 24,
    }, scene);
    nose.parent = this.airframe;
    nose.position.y = 16;
    nose.material = ceramic;
    for (const side of [-1, 1]) {
      const booster = MeshBuilder.CreateCylinder(`Rocket / booster ${side}`, { diameter: 1.25, height: 9, tessellation: 16 }, scene);
      booster.parent = this.airframe;
      booster.position.set(side * 2.1, 6, 0);
      booster.material = ceramic;
      const cap = MeshBuilder.CreateCylinder(`Rocket / booster cap ${side}`, {
        diameterBottom: 1.25, diameterTop: 0, height: 2, tessellation: 16,
      }, scene);
      cap.parent = this.airframe;
      cap.position.set(side * 2.1, 11.5, 0);
      cap.material = accent;
      const fin = MeshBuilder.CreateBox(`Rocket / stabilizer ${side}`, { width: .3, height: 3.5, depth: 2.7 }, scene);
      fin.parent = this.airframe;
      fin.position.set(side * 2.3, 3, 0);
      fin.rotation.z = side * -.18;
      fin.material = accent;
    }
    for (const y of [3, 10, 13.5]) {
      const ring = MeshBuilder.CreateTorus("FX/Rocket / telemetry band", { diameter: 3.06, thickness: .1, tessellation: 32 }, scene);
      ring.parent = this.airframe;
      ring.position.y = y;
      ring.material = emissive(scene, `Rocket / telemetry ${y}`, "#91eadd", 1.1);
    }
    this.exhaust = MeshBuilder.CreateCylinder("FX/Rocket / ion engine warmup", {
      diameterTop: 1.1, diameterBottom: .1, height: 1.6, tessellation: 16,
    }, scene);
    this.exhaust.parent = this.airframe;
    this.exhaust.position.y = 1.2;
    this.exhaust.material = emissive(scene, "Rocket / deployment flame", "#91eadd", 1.5);
    this.burst = new TransformNode("Rocket / ceiling impact", scene);
    this.burst.position.set(anchor.position.x, DEPLOY_ROCKET.ceiling - .05, anchor.position.z);
    this.particles = new Mesh("FX/Rocket / explosion particles", scene);
    this.particles.parent = this.burst;
    this.particles.isPickable = false;
    this.particles.alwaysSelectAsActiveMesh = true;
    const random = seededRandom(`${SEED}/ROCKET_IMPACT`);
    const positions: number[] = [], colors: number[] = [];
    for (let i = 0; i < DEPLOY_ROCKET.particleCount; i++) {
      const angle = random() * Math.PI * 2;
      const speed = 1.5 + random() * 6;
      positions.push(Math.cos(angle) * speed, -1 - random() * 4, Math.sin(angle) * speed);
      colors.push(random(), random(), random(), 1);
    }
    const data = new VertexData();
    data.positions = positions;
    data.colors = colors;
    data.indices = Array.from({ length: DEPLOY_ROCKET.particleCount }, (_, i) => i);
    data.applyToMesh(this.particles);
    this.particleMaterial = new ShaderMaterial("Rocket / deterministic ceiling sparks", scene, {
      vertexSource: `
        precision highp float;
        attribute vec3 position;
        attribute vec4 color;
        uniform mat4 worldViewProjection;
        uniform float age;
        varying vec3 tint;
        varying float opacity;
        void main() {
          float life = 1.1 + color.z * 1.4;
          vec3 p = position * age;
          p.y -= 5.5 * age * age;
          gl_Position = worldViewProjection * vec4(p, 1.0);
          gl_PointSize = (5.0 + color.y * 10.0) * (1.0 - smoothstep(life * 0.6, life, age));
          opacity = (1.0 - smoothstep(life * 0.55, life, age)) * 0.9;
          tint = mix(vec3(1.7, 0.75, 0.22), vec3(0.55, 1.3, 1.1), step(0.75, color.x));
        }`,
      fragmentSource: `
        precision highp float;
        varying vec3 tint;
        varying float opacity;
        void main() {
          float radius = length(gl_PointCoord - 0.5);
          if (radius > 0.5 || opacity <= 0.0) discard;
          gl_FragColor = vec4(tint, (1.0 - smoothstep(0.12, 0.5, radius)) * opacity);
        }`,
    }, { attributes: ["position", "color"], uniforms: ["worldViewProjection", "age"], needAlphaBlending: true });
    this.particleMaterial.pointsCloud = true;
    this.particleMaterial.disableDepthWrite = true;
    this.particles.material = this.particleMaterial;
    this.flash = MeshBuilder.CreateSphere("FX/Rocket / impact flash", { diameter: 2, segments: 12 }, scene);
    this.flash.parent = this.burst;
    this.flash.position.y = -1;
    this.flash.isPickable = false;
    const fire = emissive(scene, "Rocket / orange flash", "#ffce8a", 2.2);
    fire.alpha = .65;
    this.flash.material = fire;
    this.shock = MeshBuilder.CreateTorus("FX/Rocket / ceiling shockwave", { diameter: 1, thickness: .07, tessellation: 48 }, scene);
    this.shock.parent = this.burst;
    this.shock.isPickable = false;
    const wave = emissive(scene, "Rocket / shockwave", "#ffc08b", 1.25);
    wave.alpha = .55;
    this.shock.material = wave;
    this.update(0);
  }

  update(time: number): void {
    this.root.setEnabled(time >= 95 && time < 159);
    this.airframe.position.y = rocketLift(time);
    this.airframe.setEnabled(time < DEPLOY_ROCKET.impact);
    const ignition = smoothstep((time - DEPLOY_ROCKET.launch + .4) / .4);
    this.exhaust.visibility = time < DEPLOY_ROCKET.impact ? ignition : 0;
    this.exhaust.scaling.y = 1 + ignition * 1.8 + Math.sin(time * 18) * ignition * .12;
    this.exhaust.position.y = 2 - this.exhaust.scaling.y * .8;
    const age = Math.max(0, time - DEPLOY_ROCKET.impact);
    this.burst.setEnabled(time >= DEPLOY_ROCKET.impact && time < DEPLOY_ROCKET.end);
    this.particleMaterial.setFloat("age", age);
    this.flash.setEnabled(this.burst.isEnabled() && age < .45);
    this.flash.visibility = 1 - smoothstep(age / .45);
    this.flash.scaling.setAll(1 + age * 10);
    this.shock.setEnabled(this.burst.isEnabled() && age < 1.2);
    this.shock.visibility = 1 - smoothstep(age / 1.2);
    this.shock.scaling.setAll(1 + age * 9);
  }
}
