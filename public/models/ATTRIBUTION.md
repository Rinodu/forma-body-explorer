# Anatomy model attribution and licenses

**Z-Anatomy - The libre 3D atlas of anatomy - CC BY-SA 4.0**

Creators: Gauthier Kervyn (design, 3D, anatomy), Marcin Zielinski (Blender add-on), and Z-Anatomy contributors.

**BodyParts3D - The Database Center for Life Science - CC BY-SA 2.1 Japan**

Original model: Kousaku Okubo. Source: https://dbarchive.biosciencedbc.jp/en/bodyparts3d/download.html

The organ assets are redistributed browser-oriented adaptations from **Vanatome**, pinned at commit `8185b3fa46a1dbefdd907390918c57954fd9b816`:

https://github.com/vixotic/Vanatome/tree/8185b3fa46a1dbefdd907390918c57954fd9b816/public/models

| Local file | Upstream file |
| --- | --- |
| organ-reference.glb | z-anatomy-1.3.0-skeletal.glb (hidden alignment reference) |
| digestive.glb | z-anatomy-1.3.0-digestive.glb |
| respiratory.glb | z-anatomy-1.3.0-respiratory.glb |

These files are byte-identical to the upstream GLBs, renamed only. Vanatome's adaptations include web export, selection identifiers, material adjustments, curve-to-mesh conversion, and geometry optimization. These assets remain under **Creative Commons Attribution-ShareAlike 4.0 International**.

## Complete skeleton and muscle reference

`anatomy.glb` is a byte-identical copy of `kinetra-anatomy.glb` from **Kinetra** at commit `ebf33d6a05b4fa09a91d42ee27f39ee5b7223d2a`:

https://github.com/Schmiedey/kinetra/tree/ebf33d6a05b4fa09a91d42ee27f39ee5b7223d2a/public/models

The source selects 200 unique bone meshes and 280 unique muscle meshes, merged into 13 bone segments and 42 muscle regions. It adjusts proportions to a generic simulation body, poses fingers, recomputes normals, and uses lossless meshopt compression. BodyParts3D components retain **CC BY-SA 2.1 Japan**; supplementary Z-Anatomy components retain **CC BY-SA 4.0**. See [preserved Kinetra attribution](KINETRA-ATTRIBUTION.md) and [per-component source manifest](kinetra-manifest.json).

Forma applies display-only material colors, visibility selection, axis rotation, and uniform scaling to input height. Geometry files are unmodified. Keep all relevant source attributions and ShareAlike terms when redistributing model assets. These model licenses do not relicense independent application code.

BodyParts3D license: https://creativecommons.org/licenses/by-sa/2.1/jp/deed.en

License: https://creativecommons.org/licenses/by-sa/4.0/

Upstream Z-Anatomy: https://github.com/Z-Anatomy/Models-of-human-anatomy

Preserved source notices: [Z-Anatomy license and credits](Z-ANATOMY-LICENSE.txt), [Vanatome asset notice](VANATOME-ASSET-LICENSE.md).

The atlas is a reference adult anatomy, not a reconstruction of the visitor. Organ view is limited to the supplied digestive and respiratory systems.

## Connected body surface

`surface.glb` is a Forma adaptation of **BodyParts3D / DBCLS**, CC BY-SA 2.1 Japan, skin element **FJ2810 / BP22617 / FMA7163**, compatibility version 4.3.

Source distributor: Oliver Case's verified BodyParts3D mesh set, pinned at `fd527e6f4daf732fd814314d9257df5877b844bc`:

https://github.com/olivercase/body_parts_3d_api/blob/fd527e6f4daf732fd814314d9257df5877b844bc/meshes/FJ2810_BP22617_FMA7163_Skin.obj

Actual OBJ download: https://media.githubusercontent.com/media/olivercase/body_parts_3d_api/fd527e6f4daf732fd814314d9257df5877b844bc/meshes/FJ2810_BP22617_FMA7163_Skin.obj

Source SHA-256: `b96705b91fb861e4f63ca116c5fdc2c79d772083e9595ba1c0122a86ff2f7282` (14,465,138 bytes).

Forma retained the largest connected outward-facing surface (109,183 triangles, 54,949 vertices), removed the internal skin surface and small fragments, applied the same BodyExplorer-to-Kinetra affine fit as the atlas, computed smooth normals and converted to GLB. `scripts/build-surface.mjs` reproduces this transformation. Display-time body morphs and the attached fat illustration are derivative visualizations under the same **CC BY-SA 2.1 Japan** model license. Fat thickness and morphs are heuristic and not measured anatomy.

The source dataset license is distinct from the distributor's MIT software license. BodyParts3D / DBCLS attribution and ShareAlike terms apply to the mesh and derivatives. License: https://creativecommons.org/licenses/by-sa/2.1/jp/deed.en

## Visceral location illustration

`visceral.glb` adapts **BodyParts3D / DBCLS**, CC BY-SA 2.1 Japan, element **FJ3396 / BP22743 / FMA14643**, mesentery of small intestine, compatibility version 4.3. This is an anatomical mesenteric reference, **not a mesh of segmented visceral fat** and not a personal fat reconstruction.

Pinned source OBJ: https://media.githubusercontent.com/media/olivercase/body_parts_3d_api/fd527e6f4daf732fd814314d9257df5877b844bc/meshes/FJ3396_BP22743_FMA14643_Mesentery%20of%20small%20intestine.obj

SHA-256: `ae276a914a727f048b35de9b7d72660122b3b74d328e5609f3144cc73bdd8f73` (4,629,558 bytes).

Forma preserves the source mesh components, applies the shared source coordinate fit, recomputes normals, exports GLB and applies an orange display material. `scripts/build-surface.mjs <mesentery-obj-path>` reproduces the asset. The adaptation remains CC BY-SA 2.1 Japan.

## Reference organ registration

Forma applies a fitted affine transform to the Vanatome digestive and respiratory assets at display time, preserving their asset licenses. Registration uses 13 corresponding bone centers from the bundled Vanatome skeletal model and the original BodyExplorer skeleton at commit `7d04bf3c4de2bd9cb234dd51d7e6857c099afafd`. Source: https://github.com/JohanBellander/BodyExplorer/blob/7d04bf3c4de2bd9cb234dd51d7e6857c099afafd/public/skeleton.glb . Source Git blob SHA-1: `46e5ccc6f02e26727246aa78106dedb6f6d65da3`.

The reproducible fit, landmark residuals and limitations are recorded in `src/organ-registration.json` and `scripts/register-organs.mjs`. The reference fit is not a medical claim of patient organ accuracy.
