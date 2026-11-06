import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder";
import { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
import { PBRMaterial } from "@babylonjs/core/Materials/PBR/pbrMaterial";
import { DynamicTexture } from "@babylonjs/core/Materials/Textures/dynamicTexture";
import { Texture } from "@babylonjs/core/Materials/Textures/texture";
import { Color3 } from "@babylonjs/core/Maths/math.color";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import type { Scene } from "@babylonjs/core/scene";
import { createDisplayQuad } from "./ArcadeScreenController";
import { BALL_RADIUS, BUMPER_RADIUS, BUMPERS, FLIPPER_PIVOTS, PINBALL_ROUTE, PINBALL_SLOPE, PLAYFIELD_HEIGHT,
  pinballState, samplePinball } from "./pinballState";
import type { ArcadeSettings } from "./config";

export class PinballAttractController {
  readonly root: TransformNode;
  readonly playfield: TransformNode;
  readonly state = pinballState();
  readonly balls;
  readonly flippers: TransformNode[] = [];
  readonly bumpers: StandardMaterial[] = [];
  readonly lamps: StandardMaterial[] = [];
  private readonly colors = ["#ff8059", "#5de6d7", "#ffd572"].map(Color3.FromHexString);
  private readonly scoreTexture: DynamicTexture;
  private readonly score;
  private readonly launcher;
  private readonly guides: ReturnType<typeof MeshBuilder.CreateLines>[];
  private readonly pivots: ReturnType<typeof MeshBuilder.CreateSphere>[] = [];
  private scoreText = "";

  constructor(scene: Scene, readonly cabinet: number, parent: TransformNode, readonly index: number,
    readonly featured: boolean) {
    this.root = new TransformNode(`Pinball attract / ${cabinet}`, scene);
    this.root.parent = parent;
    this.playfield = new TransformNode(`Pinball inclined playfield / ${cabinet}`, scene);
    this.playfield.parent = this.root;
    this.playfield.position.set(0, PLAYFIELD_HEIGHT - .025 / 6, .025);
    this.playfield.rotation.x = PINBALL_SLOPE;
    const chrome = new PBRMaterial(`Pinball chrome / ${cabinet}`, scene);
    chrome.albedoColor.set(.78, .82, .88);
    chrome.metallic = 1; chrome.roughness = .16;
    chrome.environmentIntensity = 1.7;
    chrome.directIntensity = .3;
    const steel = chrome.clone(`Pinball steel reflections / ${cabinet}`);
    steel.environmentIntensity = 2.5;
    steel.emissiveColor.set(.035, .035, .035);
    const ball = MeshBuilder.CreateSphere(`Pinball steel ball / ${cabinet} / 0`,
      { diameter: BALL_RADIUS * 2, segments: 12 }, scene);
    ball.material = steel; ball.parent = this.playfield; ball.isPickable = false;
    this.balls = [ball, ...[1, 2].map((at) => ball.clone(`Pinball steel ball / ${cabinet} / ${at}`, this.playfield))];
    const board = MeshBuilder.CreateGround(`Pinball fitted board / ${cabinet}`, { width: .342, height: .49 }, scene);
    board.parent = this.playfield;
    board.rotation.y = Math.PI;
    const artwork = new DynamicTexture(`Pinball printed playfield / ${cabinet}`, { width: 384, height: 640 }, scene, false);
    const ctx = artwork.getContext();
    ctx.fillStyle = "#132b37"; ctx.fillRect(0, 0, 384, 640);
    ctx.strokeStyle = "#e5ba72"; ctx.lineWidth = 3;
    ctx.strokeRect(12, 12, 360, 616);
    ctx.strokeStyle = "#3e8893";
    for (let row = 0; row < 7; row++) {
      ctx.beginPath(); ctx.moveTo(20, 50 + row * 80); ctx.lineTo(360, 100 + row * 75); ctx.stroke();
    }
    ctx.fillStyle = "#eebc78"; ctx.font = "bold 36px monospace";
    ctx.fillText("AI4FUN", (384 - ctx.measureText("AI4FUN").width) / 2, 65);
    ctx.font = "20px monospace"; ctx.fillText("TOULOUSE '86", (384 - ctx.measureText("TOULOUSE '86").width) / 2, 96);
    ctx.font = "bold 23px monospace"; ctx.fillText("BONUS x 3", (384 - ctx.measureText("BONUS x 3").width) / 2, 350);
    artwork.update();
    const boardMaterial = new StandardMaterial(`Pinball board ink / ${cabinet}`, scene);
    boardMaterial.disableLighting = true;
    boardMaterial.diffuseTexture = boardMaterial.emissiveTexture = artwork;
    boardMaterial.emissiveColor.set(.65, .65, .65);
    boardMaterial.specularColor.set(0, 0, 0);
    board.material = boardMaterial;
    for (const x of [-.173, .132, .173]) {
      const rail = MeshBuilder.CreateBox(`Pinball rail / ${cabinet} / ${x}`,
        { width: .003, height: .009, depth: x === .132 ? .39 : .49 }, scene);
      rail.position.set(x, .0045, 0); rail.parent = this.playfield; rail.material = chrome;
    }
    const apron = MeshBuilder.CreateBox(`Pinball front apron / ${cabinet}`,
      { width: .304, height: .009, depth: .045 }, scene);
    apron.position.set(-.02, .003, .233); apron.parent = this.playfield; apron.material = boardMaterial;
    for (const [at, [x, z]] of BUMPERS.entries()) {
      const material = new StandardMaterial(`Pinball bumper flash / ${cabinet} / ${at}`, scene);
      material.disableLighting = true;
      material.diffuseColor.copyFrom(this.colors[at]).scaleInPlace(.5);
      material.emissiveColor.copyFrom(this.colors[at]).scaleInPlace(.15);
      material.specularColor.set(0, 0, 0);
      const ring = MeshBuilder.CreateCylinder(`Pinball bumper ring / ${cabinet} / ${at}`,
        { diameter: BUMPER_RADIUS * 2.15, height: .004, tessellation: 16 }, scene);
      ring.position.set(x, .002, z); ring.parent = this.playfield; ring.material = chrome;
      const cap = MeshBuilder.CreateCylinder(`Pinball illuminated bumper / ${cabinet} / ${at}`,
        { diameter: BUMPER_RADIUS * 2, height: .011, tessellation: 16 }, scene);
      cap.position.set(x, .0075, z); cap.parent = this.playfield; cap.material = material;
      this.bumpers.push(material);
    }
    for (let at = 0; at < 8; at++) {
      const material = new StandardMaterial(`Pinball insert light / ${cabinet} / ${at}`, scene);
      material.disableLighting = true;
      const lamp = MeshBuilder.CreateCylinder(`Pinball lamp / ${cabinet} / ${at}`,
        { diameter: .009, height: .0015, tessellation: 8 }, scene);
      lamp.position.set((at % 2 ? 1 : -1) * .112, .001, -.18 + Math.floor(at / 2) * .09);
      lamp.parent = this.playfield; lamp.material = material; lamp.isPickable = false;
      this.lamps.push(material);
    }
    for (const [at, [x, z]] of FLIPPER_PIVOTS.entries()) {
      const pivot = new TransformNode(`Pinball mechanical pivot / ${cabinet} / ${at}`, scene);
      pivot.position.set(x, .007, z); pivot.parent = this.playfield;
      const bat = MeshBuilder.CreateCapsule(`Pinball flipper / ${cabinet} / ${at}`,
        { radius: .008, height: .086, tessellation: 8, subdivisions: 1 }, scene);
      bat.rotation.z = Math.PI / 2; bat.scaling.z = .65;
      bat.position.x = at ? -.035 : .035; bat.parent = pivot;
      const material = new StandardMaterial(`Pinball flipper rubber / ${cabinet} / ${at}`, scene);
      material.disableLighting = true;
      material.diffuseColor = Color3.FromHexString(at ? "#fff0bc" : "#ee725b");
      material.emissiveColor.copyFrom(material.diffuseColor).scaleInPlace(.65);
      bat.material = material; this.flippers.push(pivot);
      const marker = MeshBuilder.CreateSphere(`Debug pinball pivot / ${cabinet} / ${at}`, { diameter: .016, segments: 8 }, scene);
      marker.parent = pivot; marker.position.y = .016; marker.material = material; marker.setEnabled(false);
      this.pivots.push(marker);
    }
    this.scoreTexture = new DynamicTexture(`Pinball dot matrix / ${cabinet}`, { width: 512, height: 160 }, scene,
      false, Texture.NEAREST_SAMPLINGMODE);
    const scoreMaterial = new StandardMaterial(`Pinball score emission / ${cabinet}`, scene);
    scoreMaterial.disableLighting = true;
    scoreMaterial.diffuseTexture = scoreMaterial.emissiveTexture = this.scoreTexture;
    scoreMaterial.emissiveColor.set(1, .75, .45);
    scoreMaterial.backFaceCulling = false;
    this.score = createDisplayQuad(scene, `Pinball score screen / ${cabinet}`, this.root, .294, .443, .540, -.1985, -.1985);
    this.score.material = scoreMaterial;
    this.launcher = MeshBuilder.CreateCylinder(`Pinball plunger rod / ${cabinet}`,
      { diameter: .012, height: .04, tessellation: 8 }, scene);
    this.launcher.rotation.x = Math.PI / 2;
    this.launcher.parent = this.root; this.launcher.material = chrome;
    this.guides = [MeshBuilder.CreateLines(`Debug pinball trajectory / ${cabinet}`,
      { points: PINBALL_ROUTE.map((point) => new Vector3(point.x, .013, point.z)) }, scene)];
    this.guides[0].parent = this.playfield; this.guides[0].color.set(1, .8, .2); this.guides[0].setEnabled(false);
  }

  update(time: number, settings: ArcadeSettings): void {
    this.root.setEnabled(settings.enablePinballAttractMode);
    if (!settings.enablePinballAttractMode) return;
    samplePinball(time, settings.pinballOffsets[this.index], this.featured, settings, this.state);
    const state = this.state;
    const pull = state.phase < .65 ? Math.sin(state.phase / .65 * Math.PI) * .014 : 0;
    this.launcher.position.set(.075, .265, .341 + pull);
    for (let at = 0; at < this.balls.length; at++) {
      const ball = state.balls[at];
      this.balls[at].position.set(ball.x, BALL_RADIUS + ball.lift, ball.z);
    }
    for (let at = 0; at < 3; at++) {
      this.bumpers[at].emissiveColor.copyFrom(this.colors[at]).scaleInPlace(.16 + state.bumpers[at] * settings.bumperIntensity);
    }
    for (let at = 0; at < this.flippers.length; at++) {
      this.flippers[at].rotation.y = (at ? 1 : -1) * (.25 - state.flippers[at] * settings.flipperAngle * Math.PI / 180);
      this.pivots[at].setEnabled(settings.pivots);
    }
    for (let at = 0; at < this.lamps.length; at++) {
      const chasing = .5 + .5 * Math.sin(state.phase * (state.multiball ? 10 : 4) - at * .9);
      this.lamps[at].emissiveColor.copyFrom(this.colors[at % 3]).scaleInPlace(.18 + chasing * (state.multiball ? 1.3 : .65));
    }
    this.guides.forEach((guide) => guide.setEnabled(settings.trajectories));
    const text = `${state.label}\n${state.score.toString().padStart(7, "0")}`;
    if (text !== this.scoreText) {
      this.scoreText = text;
      const ctx = this.scoreTexture.getContext();
      ctx.fillStyle = "#100703"; ctx.fillRect(0, 0, 512, 160);
      ctx.fillStyle = "#ffb65c";
      const highScore = state.label === "HIGH SCORE / AI4FUN";
      for (const [line, y, size] of [[highScore ? "HIGH SCORE" : state.label, 57, 40],
        [highScore ? "AI4FUN" : state.score.toString().padStart(7, "0"), 125, highScore ? 40 : 52]] as const) {
        ctx.font = `bold ${size}px monospace`;
        ctx.fillText(line, (512 - ctx.measureText(line).width) / 2, y);
      }
      ctx.fillStyle = "#100703";
      for (let y = 0; y < 160; y += 4) ctx.fillRect(0, y, 512, 1);
      this.scoreTexture.update();
    }
  }
}
