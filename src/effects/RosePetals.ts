import { Mesh } from "@babylonjs/core/Meshes/mesh";
import { VertexData } from "@babylonjs/core/Meshes/mesh.vertexData";
import { ShaderMaterial } from "@babylonjs/core/Materials/shaderMaterial";
import type { Scene } from "@babylonjs/core/scene";
import "@babylonjs/core/Meshes/thinInstanceMesh";
import "@babylonjs/core/Shaders/ShadersInclude/instancesDeclaration";
import "@babylonjs/core/Shaders/ShadersInclude/instancesVertex";

export function createRosePetals(scene: Scene, count: number): { mesh: Mesh; material: ShaderMaterial } {
  const mesh = new Mesh("FX/Cassoulet / red rose petals", scene);
  const data = new VertexData();
  const positions: number[] = [], uvs: number[] = [], indices: number[] = [], normals: number[] = [];
  const columns = 8, rows = 12;
  for (let row = 0; row <= rows; row++) {
    const v = row / rows;
    const width = .48 * Math.sqrt(Math.max(.001, Math.sin(Math.PI * v)));
    for (let column = 0; column <= columns; column++) {
      const u = column / columns * 2 - 1;
      positions.push(u * width, v - .5 - .045 * (1 - u * u) * v * v, .16 * u * u + .18 * v * v);
      uvs.push(column / columns, v);
      if (row && column < columns) {
        const at = row * (columns + 1) + column, before = at - columns - 1;
        indices.push(before, at, before + 1, before + 1, at, at + 1);
      }
    }
  }
  VertexData.ComputeNormals(positions, indices, normals);
  data.positions = positions; data.normals = normals; data.uvs = uvs; data.indices = indices;
  data.applyToMesh(mesh);
  const material = new ShaderMaterial("Cassoulet / curved crimson petal flutter", scene, {
    vertexSource: `
      precision highp float;
      attribute vec3 position,normal;
      attribute vec2 uv;
      attribute float petalSeed;
      uniform mat4 viewProjection;
      uniform float time;
      #include<instancesDeclaration>
      varying vec2 vUV;
      varying vec3 vNormal;
      varying float vSeed;
      void main() {
        #include<instancesVertex>
        vec3 p=position;
        float phase=time*5.5+petalSeed*6.2831853;
        p.z+=sin(phase+uv.y*3.0)*.065*(.2+uv.y);
        p.x+=sin(phase*.63)*.025*uv.y;
        vUV=uv; vSeed=petalSeed;
        vNormal=normalize(mat3(finalWorld)*normal);
        gl_Position=viewProjection*finalWorld*vec4(p,1.0);
      }`,
    fragmentSource: `
      precision highp float;
      varying vec2 vUV;
      varying vec3 vNormal;
      varying float vSeed;
      void main() {
        vec3 n=normalize(vNormal)*(gl_FrontFacing?1.0:-1.0);
        float light=.48+.52*abs(dot(n,normalize(vec3(-.35,.7,-.5))));
        float vein=pow(.5+.5*cos((vUV.x-.5)*105.0+vUV.y*7.0),16.0)*.045;
        float edge=pow(abs(vUV.x-.5)*2.0,3.0);
        vec3 red=mix(vec3(.35,.003,.018),vec3(.95,.018,.065),.35+vSeed*.4);
        vec3 color=red*(light+vein)*(1.0-edge*.2);
        gl_FragColor=vec4(color,1.0);
      }`,
  }, { attributes: ["position", "normal", "uv", "petalSeed"], uniforms: ["world", "viewProjection", "time"] });
  material.backFaceCulling = false;
  material.setFloat("time", 0);
  mesh.material = material;
  mesh.isPickable = false;
  mesh.alwaysSelectAsActiveMesh = true;
  mesh.thinInstanceSetBuffer("petalSeed", Float32Array.from({ length: count }, (_, index) => index * .61803398875 % 1), 1, true);
  return { mesh, material };
}
