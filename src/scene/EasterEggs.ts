import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder";
import { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import { PBRMaterial } from "@babylonjs/core/Materials/PBR/pbrMaterial";
import { Color3 } from "@babylonjs/core/Maths/math.color";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import type { Scene } from "@babylonjs/core/scene";
import type { Mesh } from "@babylonjs/core/Meshes/mesh";
import { cellPosition } from "../content/title";
import { CHOCOLATINE, chocolatineStage, cueEnvelope } from "../content/cues";
import { smoothstep } from "../engine/Timeline";
import { createWorldText, routeAnchor } from "./WorldText";
import { emissive } from "./Labyrinth";
import { BoxBatch } from "./Instances";
import { DeployRocket } from "./DeployRocket";
import { NpmCassouletTerminal } from "./NpmCassouletTerminal";
import { CASSOULET_SIGN, CINEMA, ORBIT_LINK } from "../content/showBeats";
export { CASSOULET_SIGN, DEPLOY_ROCKET, ORBIT_LINK } from "../content/showBeats";

export const T_SIGN_ANCHORS = {
  chocolatine: { time: CHOCOLATINE.anchor, height: CHOCOLATINE.height, width: CHOCOLATINE.width },
} as const;

function box(scene: Scene, root: TransformNode, name: string, position: Vector3, size: Vector3, material: PBRMaterial): Mesh {
  const mesh = MeshBuilder.CreateBox(name, { width: size.x, height: size.y, depth: size.z }, scene);
  mesh.parent = root;
  mesh.position.copyFrom(position);
  mesh.material = material;
  mesh.isPickable = false;
  return mesh;
}

function cueRoot(scene: Scene, name: string, time: number): TransformNode {
  const root = new TransformNode(name, scene);
  const anchor = routeAnchor(time);
  root.position.set(anchor.position.x, 0, anchor.position.z);
  root.rotation.y = anchor.yaw;
  return root;
}

export class EasterEggs {
  private readonly chocolatine: TransformNode;
  private readonly chocolateStages: Mesh[];
  private readonly npm: TransformNode;
  private readonly npmTerminal: NpmCassouletTerminal;
  private readonly satellite: TransformNode;
  private readonly satelliteYaw: number;
  private readonly orbit: Mesh;
  private readonly brick: PBRMaterial;
  private readonly rocket: DeployRocket;

  get rocketParticles(): Mesh { return this.rocket.particles; }

  constructor(scene: Scene) {
    const metal = new PBRMaterial("Easter eggs / titanium", scene);
    metal.albedoColor = Color3.FromHexString("#37535e");
    metal.metallic = .55;
    metal.roughness = .4;
    this.chocolatine = cueRoot(scene, "Toulouse HTTP redirect", T_SIGN_ANCHORS.chocolatine.time);
    this.chocolatine.rotation.y = CHOCOLATINE.yaw;
    const chocolateContent = [
      [{ text: "GET /pain-au-chocolat", color: "#ffdcac" }, { text: "localhost:31000", color: "#79989b" }],
      [{ text: "HTTP/1.1 301 Moved Permanently", color: "#ffcdc3" },
        { text: "Location: /chocolatine", color: "#9bffd7" }],
    ];
    this.chocolateStages = chocolateContent.map((lines, index) => {
      const label = createWorldText(scene, { name: `Chocolatine compiler stage ${index}`, width: T_SIGN_ANCHORS.chocolatine.width, height: 4.5, background: "#111a24", border: "#6b8f94", lines });
      label.parent = this.chocolatine;
      label.position.y = T_SIGN_ANCHORS.chocolatine.height;
      return label;
    });

    this.npm = cueRoot(scene, "Cassoulet / oversized package", CASSOULET_SIGN.time);
    this.npmTerminal = new NpmCassouletTerminal(scene, this.npm);

    this.satellite = cueRoot(scene, "Toulouse orbital hardware", ORBIT_LINK.time);
    const satelliteAnchor = routeAnchor(ORBIT_LINK.time);
    this.satelliteYaw = satelliteAnchor.yaw;
    this.satellite.position.set(
      satelliteAnchor.position.x + Math.sin(this.satelliteYaw) * ORBIT_LINK.depth, 9,
      satelliteAnchor.position.z + Math.cos(this.satelliteYaw) * ORBIT_LINK.depth,
    );
    box(scene, this.satellite, "Satellite / instrument bus", Vector3.Zero(), new Vector3(2.3, 2.3, 2.3), metal);
    for (const side of [-1, 1]) {
      box(scene, this.satellite, "Satellite / solar panel", new Vector3(side * 4, 0, 0), new Vector3(5, .18, 3), metal);
    }
    this.orbit = MeshBuilder.CreateTorus("FX/Orbital trajectory", { diameter: 12, thickness: .065, tessellation: 64 }, scene);
    this.orbit.parent = this.satellite;
    this.orbit.material = emissive(scene, "Orbital telemetry", "#ffd5a3", 1.5);
    const orbitText = createWorldText(scene, {
      name: "TOULOUSE / ORBITAL LINK", width: ORBIT_LINK.width, height: 4.2,
      background: "#111d2a", border: "#f5d4b1",
      lines: [
        { text: "TOULOUSE", color: "#f5d4b1" },
        { text: "/ ORBITAL LINK", color: "#f5d4b1" },
      ],
    });
    orbitText.parent = this.satellite;
    orbitText.position.y = 4;

    this.rocket = new DeployRocket(scene, metal);

    this.brick = new PBRMaterial("Toulouse / future pink brick", scene);
    this.brick.albedoColor = Color3.FromHexString("#955a64");
    this.brick.metallic = .2;
    this.brick.roughness = .7;
    const bricks = new BoxBatch("Pink-brick data wall", this.brick);
    const east = cellPosition(4, 3.8);
    for (let row = 0; row < 14; row++) {
      for (let column = 0; column < 12; column++) {
        bricks.add(east.x + 12.8, 4 + row * 1.55, east.z - 28 + column * 4.6 + (row % 2) * 2.3, .65, 1.3, 4.2);
      }
    }
    bricks.build(scene);
    this.update(0);
  }

  update(time: number): void {
    this.chocolatine.setEnabled(time >= 0 && time < CINEMA.start);
    this.chocolateStages.forEach((mesh, index) => mesh.setEnabled(index === chocolatineStage(time)));
    this.npm.setEnabled(cueEnvelope(time, CASSOULET_SIGN.start, CASSOULET_SIGN.end, .5) > 0);
    if (this.npm.isEnabled()) this.npmTerminal.update(time);
    this.satellite.setEnabled(cueEnvelope(time, ORBIT_LINK.start, ORBIT_LINK.end, 1) > 0);
    this.satellite.rotation.y = this.satelliteYaw;
    this.rocket.update(time);
    this.orbit.rotation.set(.35, time * .15, .25);
    const warm = smoothstep((time - 110) / 25);
    this.brick.emissiveColor.set(.09 * warm, .035 * warm, .045 * warm);
  }
}
