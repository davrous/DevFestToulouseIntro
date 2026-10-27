import { describe, expect, it, vi } from "vitest";
import { NullEngine } from "@babylonjs/core/Engines/nullEngine";
import { Scene } from "@babylonjs/core/scene";
import { PBRMaterial } from "@babylonjs/core/Materials/PBR/pbrMaterial";
import { UniformBuffer } from "@babylonjs/core/Materials/uniformBuffer";
import { TerminatorDestruction } from "./TerminatorDestruction";

describe("cross-backend Terminator destruction uniform", () => {
  it("declares damage in the material UBO and in the GLSL fallback", () => {
    const engine = new NullEngine(), scene = new Scene(engine);
    const effect = new TerminatorDestruction(new PBRMaterial("Terminator chrome", scene));
    expect(effect.getUniforms()).toEqual({
      ubo: [{ name: "rescueDamage", size: 1, type: "float" }],
      fragment: "uniform float rescueDamage;",
    });
    expect(effect.getCustomCode("fragment")?.CUSTOM_FRAGMENT_MAIN_BEGIN).toContain("rescueDamage");
    scene.dispose(); engine.dispose();
  });

  it("updates the material buffer instead of an external effect-only uniform, including rewind", () => {
    const engine = new NullEngine(), scene = new Scene(engine);
    const effect = new TerminatorDestruction(new PBRMaterial("Terminator chrome", scene));
    const buffer = new UniformBuffer(engine);
    const update = vi.spyOn(buffer, "updateFloat").mockImplementation(() => {});
    for (const damage of [0, .25, 1, 0]) {
      effect.damage = damage;
      effect.bindForSubMesh(buffer);
    }
    expect(update.mock.calls).toEqual([
      ["rescueDamage", 0], ["rescueDamage", .25], ["rescueDamage", 1], ["rescueDamage", 0],
    ]);
    buffer.dispose(); scene.dispose(); engine.dispose();
  });
});
