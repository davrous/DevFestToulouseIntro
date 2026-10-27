import { MaterialPluginBase } from "@babylonjs/core/Materials/materialPluginBase";
import type { PBRMaterial } from "@babylonjs/core/Materials/PBR/pbrMaterial";
import type { UniformBuffer } from "@babylonjs/core/Materials/uniformBuffer";

export class TerminatorDestruction extends MaterialPluginBase {
  damage = 0;

  constructor(material: PBRMaterial) {
    super(material, "Cassoulet mechanical destruction", 200, {}, true, true);
  }

  override getClassName(): string { return "TerminatorDestruction"; }

  override getUniforms() {
    return {
      ubo: [{ name: "rescueDamage", size: 1, type: "float" }],
      fragment: "uniform float rescueDamage;",
    };
  }

  override bindForSubMesh(buffer: UniformBuffer): void {
    buffer.updateFloat("rescueDamage", this.damage);
  }

  override getCustomCode(shaderType: string): Record<string, string> | null {
    if (shaderType === "vertex") return {
      CUSTOM_VERTEX_DEFINITIONS: "varying vec3 vRescuePosition;",
      CUSTOM_VERTEX_MAIN_END: "vRescuePosition = positionUpdated;",
    };
    if (shaderType === "fragment") return {
      CUSTOM_FRAGMENT_DEFINITIONS: "varying vec3 vRescuePosition;",
      CUSTOM_FRAGMENT_MAIN_BEGIN: `
        float rescueCell = fract(sin(dot(floor(vRescuePosition*18.0),vec3(12.9898,78.233,45.164)))*43758.5453);
        if(rescueCell < rescueDamage) discard;`,
      CUSTOM_FRAGMENT_BEFORE_FRAGCOLOR: `
        float rescueEdge=(1.0-smoothstep(0.0,.09,rescueCell-rescueDamage))*step(.001,rescueDamage);
        finalColor.rgb+=vec3(1.0,.02,.08)*rescueEdge*1.3;`,
    };
    return null;
  }
}
