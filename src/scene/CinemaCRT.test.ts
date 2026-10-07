import { describe, expect, it } from "vitest";
import { NullEngine } from "@babylonjs/core/Engines/nullEngine";
import { Scene } from "@babylonjs/core/scene";
import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder";
import { Mesh } from "@babylonjs/core/Meshes/mesh";
import { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import { VertexData } from "@babylonjs/core/Meshes/mesh.vertexData";
import { VertexBuffer } from "@babylonjs/core/Buffers/buffer";
import { CRT_PROGRAMS, fitCrtScreen } from "./CinemaCRT";

describe("retro CRT screens", () => {
  it("maps the entire program onto the actual curved screen rather than a smaller floating rectangle", () => {
    const engine = new NullEngine();
    const scene = new Scene(engine);
    const support = new TransformNode("support", scene);
    support.position.set(20, 4.3, 30);
    support.rotation.y = .7;
    const tv = new TransformNode("tv", scene);
    tv.parent = support;
    const front = new Mesh("instance of Object_8", scene);
    front.parent = tv;
    const rear = MeshBuilder.CreatePlane("instance of Object_6", {}, scene);
    rear.parent = tv;
    const data = new VertexData();
    data.positions = [];
    data.indices = [];
    for (let row = 0; row < 3; row++) {
      for (let col = 0; col < 3; col++) {
        data.positions.push((col - 1) * 1.7, (row - 1) * 1.25 + .2, -1.4 + ((row - 1) ** 2 + (col - 1) ** 2) * .1);
        if (row < 2 && col < 2) {
          const i = row * 3 + col;
          data.indices.push(i, i + 1, i + 3, i + 1, i + 4, i + 3);
        }
      }
    }
    data.applyToMesh(front);
    const screen = MeshBuilder.CreatePlane("new screen", {}, scene);
    screen.parent = support;
    screen.position.set(0, .1, -1.5);
    fitCrtScreen(screen, tv);
    expect(screen.getTotalVertices()).toBe(front.getTotalVertices());
    expect(screen.position.length()).toBe(0);
    const positions = screen.getVerticesData(VertexBuffer.PositionKind)!;
    for (let index = 0; index < positions.length; index++) {
      expect(positions[index]).toBeCloseTo(data.positions[index] - (index % 3 === 2 ? .008 : 0));
    }
    const uvs = screen.getVerticesData(VertexBuffer.UVKind)!;
    expect(Math.min(...uvs)).toBeCloseTo(0);
    expect(Math.max(...uvs)).toBeCloseTo(1);
    expect(new Set(Array.from(uvs))).toContain(.5);
    expect(front.isEnabled()).toBe(false);
    expect(rear.isEnabled()).toBe(false);
    expect(CRT_PROGRAMS).toHaveLength(8);
    expect(new Set(CRT_PROGRAMS.map((program) => program.title)).size).toBe(8);
    expect(CRT_PROGRAMS.some((program) => program.title.startsWith("MS-DOS"))).toBe(true);
    expect(CRT_PROGRAMS.some((program) => program.title.startsWith("Windows 95"))).toBe(true);
    expect(CRT_PROGRAMS.filter((program) => program.style === "blue")).toHaveLength(2);
    scene.dispose();
    engine.dispose();
  });
});
