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
