"""Run with Blender --background --factory-startup --python this_file -- arguments."""

from __future__ import annotations

import argparse
import hashlib
import json
import math
from pathlib import Path
import sys

import bpy
from mathutils import Vector
from pxr import Usd, UsdGeom, UsdUtils


def scalar(value):
    if isinstance(value, (str, int, float, bool)) or value is None:
        return value
    return list(value)


def material_key(material) -> str:
    if not material.node_tree:
        return json.dumps(list(material.diffuse_color))
    nodes = list(material.node_tree.nodes)
    graph = {
        "nodes": [{"type": node.bl_idname,
                   "inputs": {socket.identifier: scalar(socket.default_value) for socket in node.inputs
                              if hasattr(socket, "default_value")},
                   "image": str(Path(bpy.path.abspath(node.image.filepath)).resolve()) if getattr(node, "image", None) else None,
                   "operation": getattr(node, "operation", None),
                   "uv": getattr(node, "uv_map", None)} for node in nodes],
        "links": [(nodes.index(link.from_node), link.from_socket.identifier,
                   nodes.index(link.to_node), link.to_socket.identifier) for link in material.node_tree.links],
    }
    return hashlib.sha256(json.dumps(graph, sort_keys=True).encode()).hexdigest()


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--input", required=True, type=Path)
    parser.add_argument("--output", required=True, type=Path)
    parser.add_argument("--report", required=True, type=Path)
    parser.add_argument("--asset-id", required=True)
    parser.add_argument("--source-url", required=True)
    parser.add_argument("--license", required=True)
    parser.add_argument("--texture-size", type=int, default=1024)
    args = parser.parse_args(sys.argv[sys.argv.index("--") + 1:])
    if args.texture_size < 128:
        parser.error("Texture size must be at least 128.")
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.report.parent.mkdir(parents=True, exist_ok=True)
    stage = Usd.Stage.Open(str(args.input.resolve()))
    if stage is None:
        raise RuntimeError(f"Could not open USD stage: {args.input}")
    stage.SetEditTarget(stage.GetSessionLayer())
    for prim in stage.TraverseAll():
        for name in ("PhysX", "MuJoCo", "Newton"):
            variants = prim.GetVariantSet(name)
            if "Disabled" in variants.GetVariantNames():
                variants.SetVariantSelection("Disabled")
    _, _, missing = UsdUtils.ComputeAllDependencies(stage.GetRootLayer().identifier)
    if missing:
        raise RuntimeError(f"Unresolved USD dependencies: {missing}")
    render_meshes = [prim for prim in stage.Traverse(Usd.TraverseInstanceProxies())
                     if prim.IsA(UsdGeom.Mesh) and UsdGeom.Imageable(prim).ComputePurpose() not in ("proxy", "guide")]
    if not render_meshes:
        raise RuntimeError("USD stage contains no render geometry, including instance proxies.")
    flattened = args.report.with_suffix(".flattened.usdc")
    stage.Flatten().Export(str(flattened))
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.wm.usd_import(
        filepath=str(flattened), import_cameras=False, import_lights=False,
        import_proxy=False, import_guide=False, import_render=True,
        import_materials=True, import_usd_preview=True, read_mesh_uvs=True,
        apply_unit_conversion_scale=True, create_world_material=False,
    )
    meshes = [obj for obj in bpy.context.scene.objects if obj.type == "MESH" and not obj.hide_render]
    if not meshes:
        raise RuntimeError("Blender imported no visible render meshes.")
    warnings = ["Explicit tangents omitted: Babylon derives tangent frames from preserved UVs/normals, avoiding zero-length tangents on degenerate source UV faces."]
    source_triangles = sum(sum(len(poly.vertices) - 2 for poly in obj.data.polygons) for obj in meshes)
    reduced = 0
    for obj in meshes:
        triangles = sum(len(poly.vertices) - 2 for poly in obj.data.polygons)
        limit = 3000 if "spring" in obj.name.lower() else 20000
        if triangles <= limit:
            continue
        bpy.context.view_layer.objects.active = obj
        if obj.data.users > 1:
            obj.data = obj.data.copy()
        modifier = obj.modifiers.new("SimReady runtime triangle budget", "DECIMATE")
        modifier.ratio = limit / triangles
        modifier.use_collapse_triangulate = True
        bpy.ops.object.modifier_apply(modifier=modifier.name)
        reduced += 1
    runtime_triangles = sum(sum(len(poly.vertices) - 2 for poly in obj.data.polygons) for obj in meshes)
    if reduced:
        warnings.append(f"Runtime-only mesh reduction: {source_triangles} to {runtime_triangles} triangles across {reduced} dense meshes; original USDs preserved.")
    images = {}
    for image in list(bpy.data.images):
        if image.source != "FILE":
            continue
        path = Path(bpy.path.abspath(image.filepath)).resolve()
        if not path.is_file():
            raise RuntimeError(f"Missing imported texture: {path}")
        key = (str(path), image.colorspace_settings.name)
        if key in images:
            image.user_remap(images[key])
        else:
            images[key] = image
    for image in images.values():
        width, height = image.size
        if not width or not height:
            raise RuntimeError(f"Unreadable texture: {image.filepath}")
        if max(width, height) > args.texture_size:
            ratio = args.texture_size / max(width, height)
            image.scale(max(1, round(width * ratio)), max(1, round(height * ratio)))
    materials = {}
    for obj in meshes:
        for index, material in enumerate(obj.data.materials):
            if material is None:
                continue
            if "glass" in material.name.lower():
                if not material.get("simready_thin_glass"):
                    material.use_nodes = True
                    nodes = material.node_tree.nodes
                    nodes.clear()
                    shader = nodes.new("ShaderNodeBsdfPrincipled")
                    shader.inputs["Base Color"].default_value = (.8, .93, 1, .16)
                    shader.inputs["Alpha"].default_value = .16
                    shader.inputs["Roughness"].default_value = .08
                    output = nodes.new("ShaderNodeOutputMaterial")
                    material.node_tree.links.new(shader.outputs["BSDF"], output.inputs["Surface"])
                    material.surface_render_method = "DITHERED"
                    material["simready_thin_glass"] = True
                    warnings.append("Glass converted to inexpensive alpha-blended thin PBR glass instead of runtime transmission.")
            key = material_key(material)
            if key in materials:
                obj.data.materials[index] = materials[key]
            else:
                materials[key] = material
    bpy.context.view_layer.update()
    corners = [obj.matrix_world @ Vector(corner) for obj in meshes for corner in obj.bound_box]
    lower = Vector(tuple(min(point[axis] for point in corners) for axis in range(3)))
    upper = Vector(tuple(max(point[axis] for point in corners) for axis in range(3)))
    gltf_min = [lower.x, lower.z, -upper.y]
    gltf_max = [upper.x, upper.z, -lower.y]
    if not all(math.isfinite(value) for value in gltf_min + gltf_max):
        raise RuntimeError("Non-finite model bounds.")
    portal_clearance = None
    if args.asset_id == "donut":
        center = (lower + upper) * .5

        def segment_distance(a, b):
            ax, ay, bx, by = a.x - center.x, a.y - center.y, b.x - center.x, b.y - center.y
            dx, dy = bx - ax, by - ay
            factor = max(0, min(1, -(ax * dx + ay * dy) / max(1e-20, dx * dx + dy * dy)))
            return math.hypot(ax + factor * dx, ay + factor * dy)

        radius = math.inf
        for obj in meshes:
            obj.data.calc_loop_triangles()
            for triangle in obj.data.loop_triangles:
                points = [obj.matrix_world @ obj.data.vertices[index].co for index in triangle.vertices]
                signs = [(points[(i + 1) % 3].x - points[i].x) * (center.y - points[i].y)
                         - (points[(i + 1) % 3].y - points[i].y) * (center.x - points[i].x) for i in range(3)]
                area = abs((points[1].x - points[0].x) * (points[2].y - points[0].y)
                           - (points[1].y - points[0].y) * (points[2].x - points[0].x))
                if area > 1e-14 and (min(signs) >= 0 or max(signs) <= 0):
                    radius = 0
                    break
                radius = min(radius, *(segment_distance(points[i], points[(i + 1) % 3]) for i in range(3)))
        if radius <= 0 or not math.isfinite(radius):
            raise RuntimeError("The donut has no verified clear opening through its projected geometry.")
        portal_clearance = {"sourceHoleRadius": radius, "radiusAt18Units": radius * 18 / max(upper - lower)}
    for obj in bpy.context.scene.objects:
        obj.select_set(obj in meshes or obj.type == "EMPTY" and not any(
            token in obj.name.lower() for token in ("joint", "grasp", "physics", "collision", "referenceprims")))
    bpy.ops.export_scene.gltf(
        filepath=str(args.output), export_format="GLB", use_selection=True,
        export_yup=True, export_materials="EXPORT", export_normals=True,
        export_texcoords=True, export_tangents=False, export_animations=False,
        export_cameras=False, export_lights=False, export_keep_originals=False,
        export_unused_images=False, export_shared_accessors=True,
        export_copyright=f"{args.license}; NVIDIA SimReady; {args.source_url}; converted/optimized for AI4Fun",
    )
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=str(args.output))
    imported = [obj for obj in bpy.context.scene.objects if obj.type == "MESH"]
    used_images = {node.image for obj in imported for material in obj.data.materials
                   if material and material.node_tree for node in material.node_tree.nodes
                   if getattr(node, "image", None)}
    if not imported or any(not image.size[0] or not image.size[1] or not len(image.pixels) for image in used_images):
        raise RuntimeError("GLB reimport failed or has missing texture data.")
    report = {
        "id": args.asset_id, "blenderVersion": bpy.app.version_string,
        "usdRenderMeshes": len(render_meshes), "min": gltf_min, "max": gltf_max,
        "dimensions": [gltf_max[i] - gltf_min[i] for i in range(3)],
        "textureLimit": args.texture_size, "sourceUnits": UsdGeom.GetStageMetersPerUnit(stage),
        "sourceTriangles": source_triangles, "optimizedTriangles": runtime_triangles,
        "sourceUpAxis": str(UsdGeom.GetStageUpAxis(stage)),
        "reimportedMeshes": len(imported),
        "components": [obj.name for obj in imported],
        "warnings": sorted(set(warnings)),
        "portalClearance": portal_clearance,
    }
    args.report.write_text(json.dumps(report, indent=2) + "\n")
    print("SIMREADY_CONVERSION_OK", args.asset_id, args.output.stat().st_size)


if __name__ == "__main__":
    main()
