import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder";
import { Mesh } from "@babylonjs/core/Meshes/mesh";
import { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
import { DynamicTexture } from "@babylonjs/core/Materials/Textures/dynamicTexture";
import { Texture } from "@babylonjs/core/Materials/Textures/texture";
import { Color3 } from "@babylonjs/core/Maths/math.color";
import { Matrix, Vector3 } from "@babylonjs/core/Maths/math.vector";
import { SpotLight } from "@babylonjs/core/Lights/spotLight";
import type { Scene } from "@babylonjs/core/scene";
import { silentFeatures, type AudioFeatures } from "../engine/AudioAnalyzer";
import { routeAnchor } from "../camera/CameraPath";
import { ASTRONAUT_FINALE, CINEMA } from "../content/showBeats";
import { SPEAKERS, type SpeakerConfig } from "../content/speakers";
import { cueEnvelope } from "../content/cues";
import { smoothstep } from "../engine/Timeline";
import { BoxBatch } from "./Instances";
import { CinemaAssets, CLAPPER_CLOSE } from "./CinemaAssets";
import { CRT_LIGHTNING_PROGRAM, createCrtMaterial, fitCrtScreen } from "./CinemaCRT";
import { createWorldText } from "./WorldText";
import { emissive } from "./Labyrinth";
import { CINEMA_FLOOR_TOP, POPCORN_SOURCES, popcornTilt } from "./CinemaPopcorn";
import { LensTunnelPreview } from "../effects/TunnelRendering";
import { TerminatorWalk } from "./TerminatorWalk";

export const SEAT_ROWS = [-25, -15, -5, 5, 15, 25] as const;
export const SEAT_HEIGHT = 4.2;
export const DIRECTOR_CHAIR_HEIGHT = 4.2;
export const FOYER_ROWS = [-8, 0, 8, 16, 24, 32, 40] as const;

function at(scene: Scene, name: string, time: number): TransformNode {
  const anchor = routeAnchor(time);
  const node = new TransformNode(name, scene);
  node.position.set(anchor.position.x, 0, anchor.position.z);
  node.rotation.y = anchor.yaw;
  return node;
}

function glow(scene: Scene, name: string, color: string, alpha: number): StandardMaterial {
  const material = emissive(scene, name, color, 1.4);
  material.alpha = alpha;
  material.backFaceCulling = false;
  material.disableDepthWrite = true;
  return material;
}

export class CinemaWorld {
  readonly assets: CinemaAssets;
  readonly davidRoot: TransformNode;
  readonly davidConfig: SpeakerConfig;
  readonly astronautRoot: TransformNode;
  readonly terminator: TerminatorWalk;
  private astronautLoaded = false;
  private readonly clapperRoot: TransformNode;
  private readonly architecture: TransformNode;
  private readonly foyer: TransformNode;
  private readonly auditorium: TransformNode;
  private readonly televisionRoot: TransformNode;
  private readonly reelsRoot: TransformNode;
  private readonly lensRoot: TransformNode;
  private readonly projectorRoot: TransformNode;
  private readonly spaceRoot: TransformNode;
  private readonly reelNodes: TransformNode[] = [];
  private readonly televisions: { screen: Mesh; material: StandardMaterial; tint: Color3 }[] = [];
  private readonly spotBeams: Mesh[] = [];
  private readonly optical: Mesh[] = [];
  private readonly cameraRim: Mesh;
  readonly tunnelPreview: LensTunnelPreview;
  private readonly crtSupports: TransformNode[] = [];
  private readonly spaceProps: { node: TransformNode; yaw: number; speed: number }[] = [];
  private readonly buckets: { node: TransformNode; side: number }[] = [];
  private cameraModel?: TransformNode;
  private readonly cameraLights: SpotLight[] = [];
  private readonly spotlightMaterial: StandardMaterial;
  private readonly screenLight: SpotLight;
  private readonly premiereBeam: Mesh;
  private readonly premiereSideBeams: Mesh[] = [];
  private readonly premiereLights: SpotLight[] = [];
  private readonly screenText: Mesh;
  private readonly projectorBeam: Mesh;
  private readonly filmTexture: DynamicTexture;
  private clapper?: ReturnType<CinemaAssets["takeClapper"]>;

  constructor(scene: Scene) {
    this.assets = new CinemaAssets(scene);
    this.terminator = new TerminatorWalk(scene);
    this.clapperRoot = at(scene, "Cinema / clapperboard transition", CINEMA.clapperAnchor);
    const clapperAnchor = routeAnchor(CINEMA.clapperAnchor);
    this.clapperRoot.position.y = clapperAnchor.position.y;
    this.clapperRoot.rotation.y += Math.PI / 2;
    this.architecture = new TransformNode("Cinema / impossible auditorium", scene);
    this.foyer = at(scene, "Cinema / symmetrical foyer", 58);
    this.foyer.parent = this.architecture;
    this.auditorium = at(scene, "Cinema / symmetrical seat cathedral", 76);
    this.auditorium.parent = this.architecture;
    this.auditorium.position.y = CINEMA_FLOOR_TOP - .08;
    const velvet = new StandardMaterial("Cinema / dark burgundy curtains", scene);
    velvet.disableLighting = true;
    velvet.diffuseColor = Color3.FromHexString("#24151c");
    velvet.emissiveColor = Color3.FromHexString("#2b1724").scale(.55);
    velvet.specularColor = Color3.Black();
    const copper = emissive(scene, "Cinema / restrained copper architecture", "#b88760", .6);
    for (const [root, rows] of [[this.foyer, FOYER_ROWS], [this.auditorium, SEAT_ROWS]] as const) {
      const rails = new BoxBatch(`${root.name} / aisle lighting`, copper);
      for (const z of rows) {
        for (const side of [-1, 1]) rails.add(side * 8, .22, z, .12, .12, 8);
      }
      const mesh = rails.build(scene);
      mesh.unfreezeWorldMatrix();
      mesh.parent = root;
      for (const side of [-1, 1]) {
        for (let level = 1; level < 3; level++) {
          const roll = side * level * .42;
          const shelf = MeshBuilder.CreateBox(`${root.name} / tier ${side} ${level}`, {
            width: 3.8, height: .18, depth: rows[rows.length - 1] - rows[0] + 6,
          }, scene);
          shelf.parent = root;
          shelf.position.set(side * (9.6 + level * .45) + Math.sin(roll) * SEAT_HEIGHT / 2,
            SEAT_HEIGHT / 2 + level * 6.5 - Math.cos(roll) * SEAT_HEIGHT / 2,
            (rows[0] + rows[rows.length - 1]) / 2);
          shelf.rotation.z = roll;
          shelf.material = copper;
        }
      }
    }
    const curtains = new BoxBatch("Cinema / aligned acoustic architecture", velvet);
    for (const side of [-1, 1]) {
      curtains.add(side * 13, 15, 30, .25, 30, 35);
      for (let z = 14; z <= 46; z += 4) curtains.add(side * 12.8, 15, z, .3, 30, .4);
    }
    curtains.add(0, 30.2, 5, 26, .25, 90);
    curtains.add(0, .04, 5, 26, .08, 90);
    const acoustic = curtains.build(scene);
    acoustic.unfreezeWorldMatrix();
    acoustic.parent = this.auditorium;
    this.spotlightMaterial = glow(scene, "Cinema / concert spotlight haze", "#ffc590", .035);
    for (const side of [-1, 1]) {
      const beam = MeshBuilder.CreateTube("FX/Cinema / symmetrical foyer light",
        { path: [new Vector3(side * 10, 25, 36), new Vector3(side * 5, 13, 36), new Vector3(0, 1, 36)],
          radiusFunction: (index) => [.1, 1.5, 3][index], tessellation: 12 }, scene);
      beam.material = this.spotlightMaterial;
      beam.isPickable = false;
      beam.parent = this.foyer;
      this.spotBeams.push(beam);
    }

    this.televisionRoot = at(scene, "Cinema / aligned CRT installation", 58);
    this.televisionRoot.parent = this.architecture;
    const syncMaterial = createCrtMaterial(scene, 8, CRT_LIGHTNING_PROGRAM);
    syncMaterial.name = "Cinema / lightning AI update screen";
    syncMaterial.transparencyMode = StandardMaterial.MATERIAL_OPAQUE;
    for (let i = 0; i < 8; i++) {
      const side = i % 2 ? 1 : -1;
      const support = new TransformNode(`Cinema / CRT support ${i}`, scene);
      support.parent = this.televisionRoot;
      support.position.set(side * 6, 4.3 + Math.floor(i / 2) % 2 * 4.1, 20 + Math.floor(i / 4) * 8);
      this.crtSupports.push(support);
      const shelf = MeshBuilder.CreateBox(`Cinema / CRT shelf ${i}`, { width: 4.1, height: .2, depth: 3.4 }, scene);
      shelf.parent = support;
      shelf.position.y = -1.9;
      shelf.material = velvet;
      const screen = MeshBuilder.CreatePlane(`Cinema / CRT display ${i}`, { width: 2.6, height: 1.85 }, scene);
      screen.parent = support;
      screen.position.set(0, .1, -1.5);
      screen.isPickable = false;
      const material = createCrtMaterial(scene, i);
      screen.material = material;
      this.televisions.push({ screen, material, tint: material.emissiveColor.clone() });
    }
    this.syncMaterial = syncMaterial;

    const david = SPEAKERS.find((speaker) => speaker.world === "cinema");
    if (!david) throw new Error("Cinema world requires a configured speaker.");
    this.davidConfig = david;
    this.davidRoot = at(scene, "Cinema / David premiere screen", david.gateTime);
    this.screenText = createWorldText(scene, {
      name: `Cinema premiere / ${david.name}`, width: 21, height: 9,
      background: "#0b1421", border: "#ffcca1",
      lines: [
        { text: david.name.toUpperCase(), color: "#fff4dd", size: 320 },
        { text: david.demoTitle, color: "#ffd3b0", size: 180 },
      ],
    });
    this.screenText.parent = this.davidRoot;
    this.screenText.position.set(0, 17, -.12);
    if (this.screenText.material instanceof StandardMaterial) {
      this.screenText.material.transparencyMode = StandardMaterial.MATERIAL_OPAQUE;
      this.screenText.material.disableLighting = false;
      this.screenText.material.maxSimultaneousLights = 8;
      this.screenText.material.emissiveColor.set(.35, .37, .4);
      this.screenText.material.diffuseColor.set(.65, .65, .65);
    }
    const hardware = new StandardMaterial("Cinema / illuminated premiere hardware", scene);
    hardware.diffuseColor = Color3.FromHexString("#574337");
    hardware.emissiveColor = Color3.FromHexString("#100d09");
    hardware.specularColor = Color3.Black();
    const screenFrame = new BoxBatch("Cinema / physical premiere screen support", hardware);
    for (const side of [-1, 1]) screenFrame.add(side * 10.8, 11, .2, .35, 22, .4);
    for (const y of [12.4, 21.6]) screenFrame.add(0, y, .2, 22, .25, .4);
    const support = screenFrame.build(scene);
    support.unfreezeWorldMatrix();
    support.parent = this.davidRoot;
    const screenFocus = routeAnchor(david.gateTime).position;
    screenFocus.y = 17;
    const projectorSource = screenFocus.add(new Vector3(
      Math.sin(this.davidRoot.rotation.y) * 22 + Math.cos(this.davidRoot.rotation.y) * 8, 8,
      Math.cos(this.davidRoot.rotation.y) * 22 - Math.sin(this.davidRoot.rotation.y) * 8));
    this.screenLight = new SpotLight("Cinema / one real premiere projector",
      projectorSource, screenFocus.subtract(projectorSource).normalize(),
      Math.PI / 3, 2, scene);
    this.screenLight.diffuse = Color3.FromHexString("#ffe3bd");
    this.screenLight.range = 85;
    this.screenLight.falloffType = SpotLight.FALLOFF_PHYSICAL;
    this.screenLight.intensity = 0;
    this.screenLight.includedOnlyMeshes = [support, this.screenText];
    this.premiereBeam = MeshBuilder.CreateTube("FX/Cinema / premiere projector light",
      { path: [projectorSource, Vector3.Lerp(projectorSource, screenFocus, .5),
          screenFocus.add(new Vector3(Math.sin(this.davidRoot.rotation.y) * 6, 0, Math.cos(this.davidRoot.rotation.y) * 6))],
        radiusFunction: (index) => [.2, 1.8, 4.2][index], tessellation: 16 }, scene);
    this.premiereBeam.material = glow(scene, "Cinema / premiere beam dust", "#ffe2b4", .065);
    this.premiereBeam.isPickable = false;
    for (const side of [-1, 1]) {
      const start = new Vector3(side * 8, 1.8, -12);
      const end = new Vector3(side * .3, 17, -.12);
      const beam = MeshBuilder.CreateTube(`FX/Cinema / premiere aisle spotlight ${side}`, {
        path: [start, Vector3.Lerp(start, end, .5), end],
        radiusFunction: (index) => [.12, 1.5, 3][index], tessellation: 12, updatable: true,
      }, scene);
      beam.parent = this.davidRoot;
      beam.material = glow(scene, `Cinema / premiere aisle haze ${side}`, "#ffe2b4", .018);
      beam.isPickable = false;
      this.premiereSideBeams.push(beam);
      const spot = new SpotLight(`Cinema / premiere aisle lighting ${side}`, start, end.subtract(start).normalize(), .36, 2, scene);
      spot.parent = this.davidRoot;
      spot.diffuse = Color3.FromHexString("#ffe2b4");
      spot.range = 60;
      spot.falloffType = SpotLight.FALLOFF_PHYSICAL;
      spot.includedOnlyMeshes = [this.screenText];
      spot.intensity = 0;
      this.premiereLights.push(spot);
    }

    this.reelsRoot = new TransformNode("Cinema / reels and moving film architecture", scene);
    const strip = new BoxBatch("Cinema / perforated travelling film",
      emissive(scene, "Cinema / film frames", "#b5a2be", .85));
    const filmAnchor = routeAnchor(81);
    const filmTransform = Matrix.RotationY(filmAnchor.yaw)
      .multiply(Matrix.Translation(filmAnchor.position.x, 0, filmAnchor.position.z));
    const filmPath = Array.from({ length: 17 }, (_, i) =>
      Vector3.TransformCoordinates(new Vector3(-8.5 + i * 17 / 16,
        16.8 - Math.sin(i / 16 * Math.PI) * 3.8, -.8), filmTransform));
    const edges = [-.85, .85].map((offset) => filmPath.map((point) =>
      point.add(new Vector3(0, offset, 0))));
    const ribbon = MeshBuilder.CreateRibbon("Cinema / film mechanically links reels",
      { pathArray: edges, sideOrientation: Mesh.DOUBLESIDE }, scene);
    ribbon.parent = this.reelsRoot;
    this.filmTexture = new DynamicTexture("Cinema / moving film frames", { width: 1024, height: 128 }, scene, true);
    const filmContext = this.filmTexture.getContext();
    filmContext.fillStyle = "#1b1b2a";
    filmContext.fillRect(0, 0, 1024, 128);
    for (let frame = 0; frame < 16; frame++) {
      filmContext.fillStyle = frame % 2 === 0 ? "#d1c4af" : "#5f5a53";
      filmContext.fillRect(frame * 64 + 9, 18, 46, 92);
      filmContext.fillStyle = "#0e0f1c";
      for (const x of [2, 58]) {
        filmContext.fillRect(frame * 64 + x, 12, 3, 9);
        filmContext.fillRect(frame * 64 + x, 106, 3, 9);
      }
    }
    this.filmTexture.update();
    this.filmTexture.wrapU = Texture.WRAP_ADDRESSMODE;
    const stock = new StandardMaterial("Cinema / moving film stock", scene);
    stock.disableLighting = true;
    stock.diffuseTexture = this.filmTexture;
    stock.emissiveTexture = this.filmTexture;
    stock.emissiveColor = new Color3(.75, .8, .85);
    stock.backFaceCulling = false;
    ribbon.material = stock;
    ribbon.isPickable = false;
    for (const edge of edges) {
      const rail = MeshBuilder.CreateTube("FX/Cinema / film edge with sprockets",
        { path: edge, radius: .12, tessellation: 8 }, scene);
      rail.parent = this.reelsRoot;
      rail.material = emissive(scene, "Cinema / silver film sprockets", "#ffc795", 1.1);
    }
    for (let i = 1; i < filmPath.length - 1; i++) {
      const point = filmPath[i];
      strip.add(point.x, point.y, point.z - .02, .08, 1.55, .08, filmAnchor.yaw);
    }
    const film = strip.build(scene);
    film.unfreezeWorldMatrix();
    film.parent = this.reelsRoot;

    this.lensRoot = new TransformNode("Cinema / camera iris to projector", scene);
    const lensAnchor = routeAnchor(CINEMA.lensAnchor);
    this.cameraRim = MeshBuilder.CreateTorus("Cinema / frontal camera lens rim",
      { diameter: 13.6, thickness: .24, tessellation: 64 }, scene);
    this.cameraRim.parent = this.lensRoot;
    this.cameraRim.position.copyFrom(lensAnchor.position);
    this.cameraRim.rotation.set(Math.PI / 2, lensAnchor.yaw, 0);
    this.cameraRim.material = emissive(scene, "Cinema / physical lens rim", "#c0b7a4", .8);
    this.tunnelPreview = new LensTunnelPreview(scene, this.lensRoot, lensAnchor.position, lensAnchor.yaw);
    for (const side of [-1, 1]) {
      const position = lensAnchor.position.add(new Vector3(side * 14, 10, -8));
      const light = new SpotLight(`Cinema / camera hero key ${side}`, position,
        lensAnchor.position.subtract(position).normalize(), 1.2, 2, scene);
      light.diffuse = Color3.FromHexString(side < 0 ? "#ffe0b9" : "#b7d4e1");
      light.intensity = 0;
      this.cameraLights.push(light);
    }
    for (let i = 0; i < 4; i++) {
      const time = CINEMA.lens + i * .55;
      const anchor = routeAnchor(time);
      const ring = MeshBuilder.CreateTorus(`FX/Cinema / optical element ${i}`,
        { diameter: 13.2 + i * 1.2, thickness: .08, tessellation: 48 }, scene);
      ring.parent = this.lensRoot;
      ring.position.copyFrom(anchor.position);
      ring.rotation.y = anchor.yaw;
      ring.rotation.x = Math.PI / 2;
      ring.material = emissive(scene, `Cinema / optical glass ${i}`, "#c7e7e5", .7);
      ring.isPickable = false;
      this.optical.push(ring);
    }
    this.projectorRoot = new TransformNode("Cinema / projector emerging after lens", scene);
    this.projectorRoot.parent = this.lensRoot;
    const projectorAnchor = routeAnchor(CINEMA.space, 7);
    const projector = MeshBuilder.CreateBox("Cinema / procedural projector body",
      { width: 5, height: 5, depth: 8 }, scene);
    projector.parent = this.projectorRoot;
    projector.position.set(projectorAnchor.position.x, 13, projectorAnchor.position.z);
    projector.rotation.y = projectorAnchor.yaw;
    projector.material = emissive(scene, "Cinema / brushed projector metal", "#44535f", .8);
    const aperture = MeshBuilder.CreateCylinder("FX/Cinema / projector aperture",
      { diameter: 4.5, height: 1, tessellation: 32 }, scene);
    aperture.parent = this.projectorRoot;
    aperture.position.copyFrom(Vector3.TransformCoordinates(new Vector3(0, 13, 4),
      Matrix.RotationY(projectorAnchor.yaw)
        .multiply(Matrix.Translation(projectorAnchor.position.x, 0, projectorAnchor.position.z))));
    aperture.rotation.set(Math.PI / 2, projectorAnchor.yaw, 0);
    aperture.material = emissive(scene, "Cinema / projector lamp", "#fff6db", 2.6);
    this.projectorBeam = MeshBuilder.CreateTube("FX/Cinema / projector beam becomes hyperspace",
      { path: [aperture.position, routeAnchor(95).position, routeAnchor(98).position],
        radiusFunction: (index) => [1.2, 4, 7][index], tessellation: 14 }, scene);
    this.projectorBeam.parent = this.projectorRoot;
    this.projectorBeam.material = glow(scene, "Cinema / projector beam glow", "#c9eaff", .065);
    this.projectorBeam.isPickable = false;
    const deck = new BoxBatch("Cinema / projected sci-fi force-field floor",
      glow(scene, "Cinema / projected floor field", "#405963", .18));
    const lanes = new BoxBatch("FX/Cinema / projected bridge guide lights",
      emissive(scene, "Cinema / projected bridge lanes", "#a6e8df", 1.2));
    for (let time = 91.5; time <= 98; time += .5) {
      const anchor = routeAnchor(time);
      deck.add(anchor.position.x, .04, anchor.position.z, 20, .08, 8, anchor.yaw);
      for (const side of [-1, 1]) {
        lanes.add(anchor.position.x + Math.cos(anchor.yaw) * side * 8, .12,
          anchor.position.z - Math.sin(anchor.yaw) * side * 8, .14, .08, 8, anchor.yaw);
      }
    }
    for (const batch of [deck, lanes]) {
      const mesh = batch.build(scene);
      mesh.unfreezeWorldMatrix();
      mesh.parent = this.projectorRoot;
    }

    this.spaceRoot = new TransformNode("Cinema / brief Toulouse space crossing", scene);
    const trails = new BoxBatch("FX/Cinema / projector dust to starlight",
      emissive(scene, "Cinema / warp dust", "#bdf8ff", 2));
    for (let i = 0; i < 80; i++) {
      const anchor = routeAnchor(91 + i % 12 * .7);
      const lane = (i % 9 - 4) * 2.1;
      trails.add(anchor.position.x + Math.cos(anchor.yaw) * lane,
        4 + (i * 13 % 21), anchor.position.z - Math.sin(anchor.yaw) * lane,
        .14, .14, .6 + i % 5 * .65, anchor.yaw);
    }
    const warp = trails.build(scene);
    warp.unfreezeWorldMatrix();
    warp.parent = this.spaceRoot;
    const astronaut = routeAnchor(ASTRONAUT_FINALE.anchor, ASTRONAUT_FINALE.lateral);
    this.astronautRoot = new TransformNode("Digital / astronaut behind Orbital Link", scene);
    this.astronautRoot.position.set(astronaut.position.x + Math.sin(astronaut.yaw) * ASTRONAUT_FINALE.depth,
      ASTRONAUT_FINALE.height / 2, astronaut.position.z + Math.cos(astronaut.yaw) * ASTRONAUT_FINALE.depth);
    const approach = routeAnchor(ASTRONAUT_FINALE.anchor - 3).position;
    this.astronautRoot.rotation.y = Math.atan2(this.astronautRoot.position.x - approach.x,
      this.astronautRoot.position.z - approach.z) + Math.PI;
    this.update(0, silentFeatures());
  }

  private readonly syncMaterial: StandardMaterial;

  get crtScreens(): readonly Mesh[] { return this.televisions.map(({ screen }) => screen); }

  async prepare(): Promise<void> {
    await this.assets.prepare();
    this.terminator.prepare(this.assets);
    this.clapper = this.assets.takeClapper(this.clapperRoot, 22);
    for (const [root, rows, levels] of [
      [this.foyer, FOYER_ROWS, 3], [this.auditorium, SEAT_ROWS, 3],
    ] as const) {
      for (const z of rows) {
        for (let level = 0; level < levels; level++) {
          for (const side of [-1, 1]) {
            const seat = this.assets.create("seat", root,
              `${root.name} / seat ${z} ${level} ${side}`, SEAT_HEIGHT, "height");
            if (!seat) continue;
            seat.position.set(side * (9.6 + level * .45), SEAT_HEIGHT / 2 + level * 6.5, z);
            seat.rotation.set(0, Math.PI, side * level * .42);
          }
        }
      }
    }
    for (const side of [-1, 1]) {
      const spot = this.assets.create("spotlight", this.foyer, `Cinema / foyer spotlight ${side}`, 3);
      if (spot) {
        spot.position.set(side * 10, 25, 36);
        spot.rotation.set(.7, side * -.4, 0);
      }
    }
    const premiereSpot = this.assets.create("spotlight", this.architecture, "Cinema / premiere lighting fixture", 3);
    if (premiereSpot) {
      premiereSpot.position.copyFrom(this.screenLight.position);
      premiereSpot.rotation.set(.4, this.davidRoot.rotation.y, 0);
    }
    for (const side of [-1, 1]) {
      const fixture = this.assets.create("spotlight", this.davidRoot, `Cinema / premiere floor fixture ${side}`, 2);
      if (fixture) {
        fixture.position.set(side * 8, 1.8, -12);
        fixture.rotation.x = -.95;
      }
    }
    const chair = this.assets.create("chair", this.auditorium, "Cinema / lone director chair",
      DIRECTOR_CHAIR_HEIGHT, "height");
    if (chair) {
      chair.position.set(-9, DIRECTOR_CHAIR_HEIGHT / 2, -10);
      chair.rotation.y = Math.PI;
    }
    for (const [index, support] of this.crtSupports.entries()) {
      const tv = this.assets.create("television", support, `Cinema / aligned CRT ${index}`, 3.6);
      if (tv) {
        tv.rotation.y = -Math.PI / 2;
        fitCrtScreen(this.televisions[index].screen, tv);
      }
    }
    for (const side of [-1, 1]) {
      const tape = this.assets.create("vhs", this.auditorium, `Cinema / VHS Easter egg ${side}`, 1.2);
      if (tape) tape.position.set(side * 8, .6, -10);
    }
    for (const side of [-1, 1]) {
      const rotor = at(this.reelsRoot.getScene(), `Cinema / reel axle ${side}`, 81);
      rotor.parent = this.reelsRoot;
      const anchor = routeAnchor(81, side * 8.5);
      rotor.position.set(anchor.position.x, 12.5, anchor.position.z);
      rotor.rotation.x = Math.PI / 2;
      const reel = this.assets.create("reel", rotor, `Cinema / giant reel ${side}`, 9.5);
      if (!reel) continue;
      const steel = emissive(this.reelsRoot.getScene(), `Cinema / reel sprocket metal ${side}`, "#a5aaa9", .6);
      const spokes = new BoxBatch(`Cinema / rotating reel spokes ${side}`, steel);
      for (let index = 0; index < 5; index++) {
        const angle = index * Math.PI * 2 / 5;
        spokes.add(Math.sin(angle) * 2, -1.04, Math.cos(angle) * 2, .25, .12, 3.5, angle);
      }
      const face = spokes.build(this.reelsRoot.getScene());
      face.unfreezeWorldMatrix();
      face.parent = reel;
      this.reelNodes.push(reel);
    }
    this.cameraModel = this.assets.create("camera", this.lensRoot, "Cinema / giant camera pointing at viewer", 40);
    if (this.cameraModel) {
      const anchor = routeAnchor(CINEMA.lensAnchor);
      this.cameraModel.rotation.y = anchor.yaw + Math.PI;
      const lens = this.cameraModel.getChildMeshes().find((mesh) => mesh.parent?.name.includes("lenses_low_40"));
      if (!lens) throw new Error("The cinema camera asset needs its front lens landmark to align the fly-through.");
      lens.computeWorldMatrix(true);
      this.cameraModel.position.copyFrom(anchor.position.subtract(lens.getBoundingInfo().boundingBox.centerWorld));
      const cameraMeshes = this.cameraModel.getChildMeshes();
      this.cameraLights.forEach((light) => { light.includedOnlyMeshes = cameraMeshes; });
    }
    for (const [name, time, side, size] of [
      ["satellite", 96, -7, 7],
    ] as const) {
      const prop = this.assets.create(name, this.spaceRoot, `Cinema / passing ${name}`, size);
      if (!prop) continue;
      const anchor = routeAnchor(time, side);
      prop.position.set(anchor.position.x, 15, anchor.position.z);
      prop.rotation.y = anchor.yaw;
      this.spaceProps.push({ node: prop, yaw: anchor.yaw, speed: .5 });
    }
    this.astronautLoaded = !!this.assets.create("astronaut", this.astronautRoot, "Digital / final orbital astronaut", ASTRONAUT_FINALE.height, "height");
    for (const source of POPCORN_SOURCES) {
      const anchor = routeAnchor(source.time, source.lateral);
      const pivot = new TransformNode(`Cinema / popcorn support ${source.side}`, this.reelsRoot.getScene());
      pivot.parent = this.reelsRoot;
      pivot.position.set(anchor.position.x, source.height, anchor.position.z);
      pivot.rotation.y = anchor.yaw;
      const bucket = this.assets.create("popcorn", pivot,
        `Cinema / tipping popcorn bucket ${source.side}`, source.size, "height");
      if (bucket) this.buckets.push({ node: bucket, side: source.side });
    }
    this.update(0, silentFeatures());
  }

  update(time: number, audio: AudioFeatures, cameraTime = time): void {
    this.clapperRoot.setEnabled(time < CINEMA.start);
    if (this.clapper?.animation) {
      const group = this.clapper.animation;
      group.goToFrame(CLAPPER_CLOSE.from + (CLAPPER_CLOSE.to - CLAPPER_CLOSE.from) * smoothstep(
        (time - CINEMA.clapperClose) / (CINEMA.clap - CINEMA.clapperClose)));
    } else {
      this.clapperRoot.rotation.z = -smoothstep(
        (time - CINEMA.clapperClose) / (CINEMA.clap - CINEMA.clapperClose)) * .16;
    }
    this.architecture.setEnabled(time >= CINEMA.start && time < CINEMA.auditoriumEnd);
    this.davidRoot.setEnabled(time >= CINEMA.start && time < CINEMA.auditoriumEnd);
    const reveal = cueEnvelope(time, this.davidConfig.startTime, this.davidConfig.endTime, 1.2);
    this.screenText.visibility = 1;
    this.screenLight.intensity = 180 * reveal * (1 + audio.kick * .12);
    this.premiereBeam.setEnabled(reveal > 0 && this.davidRoot.isEnabled());
    if (!this.davidRoot.isEnabled()) this.screenLight.intensity = 0;
    this.premiereBeam.visibility = reveal;
    this.premiereLights.forEach((spot, index) => {
      spot.intensity = this.davidRoot.isEnabled() ? 4200 * reveal : 0;
      const beam = this.premiereSideBeams[index];
      beam.visibility = reveal;
      if (!this.davidRoot.isEnabled() || reveal <= 0) return;
      const side = index ? 1 : -1;
      const sweep = .5 - .5 * Math.cos(Math.max(0, time - this.davidConfig.startTime) * Math.PI / 2.4);
      const end = new Vector3(side * (.3 + sweep * 7.3), 18.6 + Math.sin(time * .8) * 1.3, -.12);
      spot.direction.copyFrom(end.subtract(spot.position).normalize());
      MeshBuilder.CreateTube(beam.name, {
        path: [spot.position, Vector3.Lerp(spot.position, end, .5), end], instance: beam,
      });
    });
    this.reelsRoot.setEnabled(time >= CINEMA.start && time < CINEMA.auditoriumEnd);
    this.filmTexture.uOffset = -time * .2;
    this.buckets.forEach(({ node, side }) => { node.rotation.z = popcornTilt(time, side); });
    this.reelNodes.forEach((reel, index) => {
      reel.rotation.y = (index ? -1 : 1) * time * .55;
    });
    this.televisions.forEach(({ screen, material, tint }) => {
      screen.material = cameraTime >= CINEMA.crtSync ? this.syncMaterial : material;
      material.emissiveColor.copyFrom(tint).scaleInPlace(1 + audio.snare * .18);
    });
    this.spotlightMaterial.alpha = .035 + audio.kick * .015;
    this.lensRoot.setEnabled(time >= CINEMA.start && time < 99);
    this.cameraModel?.setEnabled(cameraTime < CINEMA.lens);
    this.cameraModel?.getChildMeshes().forEach((mesh) => {
      mesh.visibility = 1 - smoothstep((cameraTime - CINEMA.lens + .08) / .08);
    });
    this.cameraLights.forEach((light) => {
      light.intensity = 900 * cueEnvelope(time, CINEMA.start, CINEMA.lens, .5);
    });
    this.cameraRim.setEnabled(cameraTime < CINEMA.lens + .15);
    this.tunnelPreview.update(cameraTime);
    this.optical.forEach((ring) => {
      ring.setEnabled(time >= CINEMA.lens - .15 && time < CINEMA.projector + 1);
    });
    this.projectorRoot.setEnabled(time >= CINEMA.projector && time < CINEMA.tunnelRoomReady);
    this.projectorBeam.visibility = .6 * cueEnvelope(time, CINEMA.projector, 99, .7);
    this.spaceRoot.setEnabled(time >= CINEMA.space && time < CINEMA.tunnelRoomReady);
    this.spaceProps.forEach(({ node, yaw, speed }) => {
      node.rotation.y = yaw + (time - CINEMA.space) * speed;
    });
    const astronautActive = this.astronautLoaded && time >= ASTRONAUT_FINALE.start && time < ASTRONAUT_FINALE.end;
    this.astronautRoot.setEnabled(astronautActive);
  }
}
