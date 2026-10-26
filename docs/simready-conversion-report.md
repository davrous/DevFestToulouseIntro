# SimReady conversion report

Converter: Blender 4.5.4 LTS.

| Asset | Source MB | GLB MB | Meshes | Triangles | Materials | Textures | Status |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| croissant | 13.24 | 3.54 | 1 | 8206 | 1 | 3 | converted-reimported |
| snackVendingMachine | 879.29 | 32.19 | 44 | 152085 | 13 | 34 | converted-reimported |
| pongPaddle | 171.80 | 6.16 | 1 | 4182 | 1 | 3 | converted-reimported |
| pongBall | 168.10 | 6.06 | 1 | 1620 | 1 | 3 | converted-reimported |
| cassouletCan | 66.71 | 3.13 | 1 | 20000 | 1 | 3 | converted-reimported |
| donut | 37.43 | 4.87 | 1 | 15544 | 1 | 3 | converted-reimported |
| smallRobot | 622.62 | 5.85 | 11 | 77546 | 4 | 6 | converted-reimported |
| forklift | 41.60 | 3.59 | 15 | 58646 | 4 | 1 | converted-reimported |
| robotArm | 1449.60 | 17.65 | 15 | 247139 | 12 | 34 | converted-reimported |

## Conversion notes

**croissant:** Explicit tangents omitted: Babylon derives tangent frames from preserved UVs/normals, avoiding zero-length tangents on degenerate source UV faces. More than one shader node tex image used for a texture. The resulting glTF sampler will behave like the first shader node tex image.


**snackVendingMachine:** Explicit tangents omitted: Babylon derives tangent frames from preserved UVs/normals, avoiding zero-length tangents on degenerate source UV faces. Glass converted to inexpensive alpha-blended thin PBR glass instead of runtime transmission. More than one shader node tex image used for a texture. The resulting glTF sampler will behave like the first shader node tex image. Runtime-only mesh reduction: 994038 to 152085 triangles across 38 dense meshes; original USDs preserved.


**pongPaddle:** Explicit tangents omitted: Babylon derives tangent frames from preserved UVs/normals, avoiding zero-length tangents on degenerate source UV faces. More than one shader node tex image used for a texture. The resulting glTF sampler will behave like the first shader node tex image. The active Vertex Color will not be exported, as it is not used in the node tree of the material


**pongBall:** Explicit tangents omitted: Babylon derives tangent frames from preserved UVs/normals, avoiding zero-length tangents on degenerate source UV faces. More than one shader node tex image used for a texture. The resulting glTF sampler will behave like the first shader node tex image. The active Vertex Color will not be exported, as it is not used in the node tree of the material


**cassouletCan:** Explicit tangents omitted: Babylon derives tangent frames from preserved UVs/normals, avoiding zero-length tangents on degenerate source UV faces. More than one shader node tex image used for a texture. The resulting glTF sampler will behave like the first shader node tex image. Runtime-only mesh reduction: 118456 to 20000 triangles across 1 dense meshes; original USDs preserved. The active Vertex Color will not be exported, as it is not used in the node tree of the material


**donut:** Explicit tangents omitted: Babylon derives tangent frames from preserved UVs/normals, avoiding zero-length tangents on degenerate source UV faces. More than one shader node tex image used for a texture. The resulting glTF sampler will behave like the first shader node tex image.

Donut verified clear-hole radius at the 18-unit runtime size: 2.375 world units.

**smallRobot:** Explicit tangents omitted: Babylon derives tangent frames from preserved UVs/normals, avoiding zero-length tangents on degenerate source UV faces. Glass converted to inexpensive alpha-blended thin PBR glass instead of runtime transmission. More than one shader node tex image used for a texture. The resulting glTF sampler will behave like the first shader node tex image. Runtime-only mesh reduction: 559808 to 101436 triangles across 2 dense meshes; original USDs preserved. The active Vertex Color will not be exported, as it is not used in the node tree of the material Warning: in _EnqueueDependency at line 103 of /Users/jonas/blender-dev/build_darwin/deps_arm64/build/usd/src/external_usd/pxr/usd/usdUtils/assetLocalization.cpp -- Failed to resolve reference @../Textures/t_robotics_small_bot_a01_albedo.<UDIM>.png@ with computed asset path @/Users/davrous/Dev/DevFestToulouseIntro/assets/simready/source/robotics_small_bot_a01/simready_usd/Textures/t_robotics_small_bot_a01_albedo.<UDIM>.png@ found in layer @/Users/davrous/Dev/DevFestToulouseIntro/assets/simready/source/robotics_small_bot_a01/simready_usd/payloads/materials.usda@. Warning: in _EnqueueDependency at line 103 of /Users/jonas/blender-dev/build_darwin/deps_arm64/build/usd/src/external_usd/pxr/usd/usdUtils/assetLocalization.cpp -- Failed to resolve reference @../Textures/t_robotics_small_bot_a01_normal.<UDIM>.png@ with computed asset path @/Users/davrous/Dev/DevFestToulouseIntro/assets/simready/source/robotics_small_bot_a01/simready_usd/Textures/t_robotics_small_bot_a01_normal.<UDIM>.png@ found in layer @/Users/davrous/Dev/DevFestToulouseIntro/assets/simready/source/robotics_small_bot_a01/simready_usd/payloads/materials.usda@. Warning: in _EnqueueDependency at line 103 of /Users/jonas/blender-dev/build_darwin/deps_arm64/build/usd/src/external_usd/pxr/usd/usdUtils/assetLocalization.cpp -- Failed to resolve reference @../Textures/t_robotics_small_bot_a01_orm.<UDIM>.png@ with computed asset path @/Users/davrous/Dev/DevFestToulouseIntro/assets/simready/source/robotics_small_bot_a01/simready_usd/Textures/t_robotics_small_bot_a01_orm.<UDIM>.png@ found in layer @/Users/davrous/Dev/DevFestToulouseIntro/assets/simready/source/robotics_small_bot_a01/simready_usd/payloads/materials.usda@.


**forklift:** Explicit tangents omitted: Babylon derives tangent frames from preserved UVs/normals, avoiding zero-length tangents on degenerate source UV faces. Glass converted to inexpensive alpha-blended thin PBR glass instead of runtime transmission. More than one shader node tex image used for a texture. The resulting glTF sampler will behave like the first shader node tex image. Runtime-only mesh reduction: 329976 to 84641 triangles across 3 dense meshes; original USDs preserved. The active Vertex Color will not be exported, as it is not used in the node tree of the material Warning: in _EnqueueDependency at line 103 of /Users/jonas/blender-dev/build_darwin/deps_arm64/build/usd/src/external_usd/pxr/usd/usdUtils/assetLocalization.cpp -- Failed to resolve reference @../Textures/T_Forklift_A1_Albedo.<UDIM>.png@ with computed asset path @/Users/davrous/Dev/DevFestToulouseIntro/assets/simready/source/vehicle_forklift_orange_a01/simready_usd/Textures/T_Forklift_A1_Albedo.<UDIM>.png@ found in layer @/Users/davrous/Dev/DevFestToulouseIntro/assets/simready/source/vehicle_forklift_orange_a01/simready_usd/payloads/materials.usda@. Warning: in _EnqueueDependency at line 103 of /Users/jonas/blender-dev/build_darwin/deps_arm64/build/usd/src/external_usd/pxr/usd/usdUtils/assetLocalization.cpp -- Failed to resolve reference @../Textures/T_Forklift_A1_Normal.<UDIM>.png@ with computed asset path @/Users/davrous/Dev/DevFestToulouseIntro/assets/simready/source/vehicle_forklift_orange_a01/simready_usd/Textures/T_Forklift_A1_Normal.<UDIM>.png@ found in layer @/Users/davrous/Dev/DevFestToulouseIntro/assets/simready/source/vehicle_forklift_orange_a01/simready_usd/payloads/materials.usda@. Warning: in _EnqueueDependency at line 103 of /Users/jonas/blender-dev/build_darwin/deps_arm64/build/usd/src/external_usd/pxr/usd/usdUtils/assetLocalization.cpp -- Failed to resolve reference @../Textures/T_Forklift_A1_ORM.<UDIM>.png@ with computed asset path @/Users/davrous/Dev/DevFestToulouseIntro/assets/simready/source/vehicle_forklift_orange_a01/simready_usd/Textures/T_Forklift_A1_ORM.<UDIM>.png@ found in layer @/Users/davrous/Dev/DevFestToulouseIntro/assets/simready/source/vehicle_forklift_orange_a01/simready_usd/payloads/materials.usda@.


**robotArm:** Explicit tangents omitted: Babylon derives tangent frames from preserved UVs/normals, avoiding zero-length tangents on degenerate source UV faces. More than one shader node tex image used for a texture. The resulting glTF sampler will behave like the first shader node tex image. Runtime-only mesh reduction: 785902 to 247139 triangles across 7 dense meshes; original USDs preserved.


Official Khronos validation is recorded in `public/assets/simready/validation.json`.
Missing explicit tangents are intentional; Babylon uses derivative-based normal mapping. No normal textures are removed.
