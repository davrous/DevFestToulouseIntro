import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder";
import { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import { PBRMaterial } from "@babylonjs/core/Materials/PBR/pbrMaterial";
import { Color3 } from "@babylonjs/core/Maths/math.color";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import type { Scene } from "@babylonjs/core/scene";
import type { Mesh } from "@babylonjs/core/Meshes/mesh";
import { cellPosition } from "../content/title";
import { chocolatineStage, cueEnvelope, fridayChoice } from "../content/cues";
import { smoothstep } from "../engine/Timeline";
import { createWorldText, routeAnchor } from "./WorldText";
import { emissive } from "./Labyrinth";
import { BoxBatch } from "./Instances";

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
  private readonly canal: TransformNode;
  private readonly chocolatine: TransformNode;
  private readonly chocolateStages: Mesh[];
  private readonly friday: TransformNode;
  private readonly noDoor: TransformNode;
  private readonly yesLight;
  private readonly noLight;
  private readonly noLabel: Mesh;
  private readonly npm: TransformNode;
  private readonly npmStages: Mesh[];
  private readonly stack: TransformNode;
  private readonly blocks: Mesh[];
  private readonly satellite: TransformNode;
  private readonly orbit: Mesh;
  readonly container: TransformNode;
  private readonly brick: PBRMaterial;

  constructor(scene: Scene) {
    const metal = new PBRMaterial("Easter eggs / titanium", scene);
    metal.albedoColor = Color3.FromHexString("#37535e");
    metal.metallic = .55;
    metal.roughness = .4;
    this.canal = cueRoot(scene, "CANAL DU MIDI / district", 29);
    const canalLabel = createWorldText(scene, {
      name: "CANAL DU MIDI", width: 20, height: 3.6, background: "#091b22", border: "#6af5e0",
      lines: [{ text: "CANAL DU MIDI", color: "#adffe4", size: 180 }, { text: "16 CHANNELS / NO LOCKS / 120 BPM", color: "#70a9a8" }],
    });
    canalLabel.parent = this.canal;
    canalLabel.position.set(0, 15, 0);
    this.container = new TransformNode("Floating shipping container", scene);
    this.container.parent = this.canal;
    this.container.position.set(17, 21, 8);
    box(scene, this.container, "Shipping container shell", Vector3.Zero(), new Vector3(7, 5, 11), metal);
    const containerRibs = new BoxBatch("Container corrugation", metal);
    for (let i = -4; i <= 4; i++) containerRibs.add(0, 0, i * 1.1, 7.2, 5.2, .14);
    const corrugation = containerRibs.build(scene);
    corrugation.unfreezeWorldMatrix();
    corrugation.parent = this.container;
    const containerText = createWorldText(scene, {
      name: "CONTAINER / local delivery", width: 6.4, height: 2.3,
      lines: [{ text: "CONTAINER", color: "#dde2c6" }, { text: "NO CLOUD REQUIRED", color: "#91aaa8" }],
      background: "#1e343b",
    });
    containerText.parent = this.container;
    containerText.position.z = -5.6;

    this.chocolatine = cueRoot(scene, "Toulouse compiler correction", 53);
    const compilerWall = cellPosition(.15, -.39);
    this.chocolatine.position.set(compilerWall.x, 0, compilerWall.z);
    this.chocolatine.rotation.y = 0;
    const chocolateContent = [
      [{ text: "PAIN_AU_CHOCOLAT", color: "#ffdcac" }, { text: "resolve(localVocabulary)", color: "#79989b" }],
      [{ text: "ReferenceError:", color: "#ff9c8f" }, { text: "PAIN_AU_CHOCOLAT is not defined", color: "#ffcdc3" }],
      [{ text: "CHOCOLATINE", color: "#9bffd7" }, { text: "BUILD SUCCEEDED / BIENVENUE A TOULOUSE", color: "#85bbb0" }],
    ];
    this.chocolateStages = chocolateContent.map((lines, index) => {
      const label = createWorldText(scene, { name: `Chocolatine compiler stage ${index}`, width: 22, height: 5.5, background: "#111a24", border: "#6b8f94", lines });
      label.parent = this.chocolatine;
      label.position.y = 19;
      return label;
    });

    const doorPosition = cellPosition(3.48, .05);
    this.friday = new TransformNode("Friday deployment / closed production door", scene);
    this.friday.position.set(doorPosition.x, 0, doorPosition.z);
    this.friday.rotation.y = Math.PI / 2;
    this.yesLight = emissive(scene, "Production warning", "#ff694f", 1.5);
    this.noLight = emissive(scene, "Safe route", "#8bffd2", 1.4);
    const production = createWorldText(scene, {
      name: "DEPLOY ON FRIDAY / ARE YOU SURE?", width: 22, height: 9.5,
      background: "#25181c", border: "#ff815b",
      lines: [
        { text: "PRODUCTION", color: "#ff927c" }, { text: "DEPLOY ON FRIDAY", color: "#fff1d8", size: 160 },
        { text: "ARE YOU SURE?", color: "#ffc5ad" }, { text: "[ YES ]", color: "#ff7b69" },
      ],
    });
    production.parent = this.friday;
    production.position.set(0, 19, -2.8);
    box(scene, this.friday, "Sealed production door", new Vector3(0, 13, 0), new Vector3(24, 26, 1), metal);
    const danger = new BoxBatch("FX/Production warning strips", this.yesLight);
    for (let i = -5; i <= 5; i++) {
      danger.add(i * 2, 3, -2.85, .9, .3, .2);
      danger.add(i * 2, 29, -2.85, .9, .3, .2);
    }
    const warningStrips = danger.build(scene);
    warningStrips.unfreezeWorldMatrix();
    warningStrips.parent = this.friday;
    this.noDoor = new TransformNode("Friday deployment / NO route", scene);
    const noPosition = cellPosition(3.04, .88);
    this.noDoor.position.set(noPosition.x, 0, noPosition.z);
    this.noDoor.rotation.y = Math.PI;
    const safe = new BoxBatch("FX/NO route gate", this.noLight);
    safe.add(-10, 14, 0, .3, 27, .3);
    safe.add(10, 14, 0, .3, 27, .3);
    safe.add(0, 27.5, 0, 20, .3, .3);
    const safeGate = safe.build(scene);
    safeGate.unfreezeWorldMatrix();
    safeGate.parent = this.noDoor;
    this.noLabel = createWorldText(scene, {
      name: "NO / deployment cancelled", width: 19, height: 6.2,
      background: "#0b201f", border: "#84ffd3",
      lines: [{ text: "NO", color: "#b6ffe0", size: 210 }, { text: "DEPLOYMENT CANCELLED", color: "#8ed7bb" }],
    });
    this.noLabel.parent = this.noDoor;
    this.noLabel.position.set(0, 15, -.3);

    this.npm = cueRoot(scene, "Cassoulet package registry", 117);
    this.npmStages = [
      [{ text: "$ npm install cassoulet", color: "#eddfd2" }, { text: "resolving haricots...", color: "#d9a590" }],
      [{ text: "added 1834 packages", color: "#b7f3d1" }, { text: "2387 vulnerabilities found", color: "#ff9f8d" }, { text: "npm audit fix --cassoulet", color: "#b3bac6" }],
    ].map((lines, index) => {
      const label = createWorldText(scene, { name: `npm cassoulet ${index}`, width: 20, height: 6, background: "#151b28", border: "#ffa48a", lines });
      label.parent = this.npm;
      label.position.set(0, 17, 0);
      return label;
    });

    this.stack = cueRoot(scene, "Stack overflow / kinetic sculpture", 145);
    const stackText = createWorldText(scene, {
      name: "STACK OVERFLOW", width: 17, height: 3, background: "#091c28", border: "#dab1ff",
      lines: [{ text: "STACK OVERFLOW", color: "#d9c6ff" }],
    });
    stackText.parent = this.stack;
    stackText.position.set(0, 23, 0);
    this.blocks = Array.from({ length: 9 }, (_, index) => box(
      scene, this.stack, `Stack frame ${index}`, new Vector3(-8, 2 + index * 2.25, 2),
      new Vector3(4.8, 1.9, 4.8), metal,
    ));
    const cap = emissive(scene, "Stack memory indicators", "#c5a0ff", 1.3);
    this.blocks.forEach((block) => {
      const stripe = MeshBuilder.CreateBox("FX/Stack indicator", { width: 3.8, height: .14, depth: .12 }, scene);
      stripe.parent = block;
      stripe.position.set(0, .3, -2.45);
      stripe.material = cap;
    });
    this.satellite = cueRoot(scene, "Toulouse orbital hardware", 140);
    this.satellite.position.y = 26;
    box(scene, this.satellite, "Satellite / instrument bus", Vector3.Zero(), new Vector3(2.3, 2.3, 2.3), metal);
    for (const side of [-1, 1]) {
      box(scene, this.satellite, "Satellite / solar panel", new Vector3(side * 4, 0, 0), new Vector3(5, .18, 3), metal);
    }
    this.orbit = MeshBuilder.CreateTorus("FX/Orbital trajectory", { diameter: 17, thickness: .065, tessellation: 64 }, scene);
    this.orbit.parent = this.satellite;
    this.orbit.material = emissive(scene, "Orbital telemetry", "#ffd5a3", 1.5);
    const orbitText = createWorldText(scene, {
      name: "TOULOUSE / ORBITAL LINK", width: 17, height: 2.5,
      lines: [{ text: "TOULOUSE / ORBITAL LINK", color: "#f5d4b1" }],
    });
    orbitText.parent = this.satellite;
    orbitText.position.y = 4;

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
    this.canal.setEnabled(cueEnvelope(time, 10, 29) > 0);
    this.container.rotation.y = Math.sin(time * .1) * .12;
    this.container.position.y = 21 + Math.sin(time * .3) * .6;
    this.chocolatine.setEnabled(cueEnvelope(time, 44, 58) > 0);
    this.chocolateStages.forEach((mesh, index) => mesh.setEnabled(index === chocolatineStage(time)));
    this.friday.setEnabled(time >= 77 && time < 91);
    this.noDoor.setEnabled(time >= 77 && time < 94);
    const selected = fridayChoice(time) === "NO";
    this.noLight.emissiveColor.set(.3, selected ? 2.5 : .8, selected ? 1.25 : .6);
    this.yesLight.emissiveColor.set(1.2 + .5 * Math.sin(time * 5), .15, .08);
    this.noLabel.visibility = selected ? 1 : .55;
    this.npm.setEnabled(cueEnvelope(time, 105, 120) > 0);
    this.npmStages.forEach((mesh, index) => mesh.setEnabled(index === (time < 110 ? 0 : 1)));
    this.stack.setEnabled(cueEnvelope(time, 137, 154) > 0);
    this.blocks.forEach((mesh, index) => {
      const falling = Math.max(0, time - 142 - index * .22);
      const fall = index > 3 ? Math.min(1, falling / 3.2) : 0;
      mesh.position.set(-8 - Math.sin(index * 2) * fall * 3, 2 + index * 2.25 - fall * (index * 2.25), 2 + fall * index * .6);
      mesh.rotation.set(fall * .5, time * .04 * (1 - fall) + index * .08, fall * (index % 2 ? .8 : -.8));
    });
    this.satellite.setEnabled(cueEnvelope(time, 137, 157) > 0);
    this.satellite.rotation.y = routeAnchor(140).yaw + Math.sin(time * .2) * .18;
    this.orbit.rotation.set(.35, time * .15, .25);
    const warm = smoothstep((time - 95) / 30);
    this.brick.emissiveColor.set(.09 * warm, .035 * warm, .045 * warm);
  }
}
