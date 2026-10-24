import * as THREE from "three";

/**
 * Cel shading for the 3D replay: every lit material becomes a toon material
 * (light in a few flat bands, shadows kept) and solid objects get a black
 * outline of constant width on screen, drawn as their back faces pushed out
 * along the normals.
 */

/** Light falls off in four flat bands */
function gradient() {
  const tones = [70, 140, 205, 255];
  const texture = new THREE.DataTexture(new Uint8Array(tones.flatMap((t) => [t, t, t, 255])), tones.length, 1, THREE.RGBAFormat);
  texture.minFilter = texture.magFilter = THREE.NearestFilter;
  texture.generateMipmaps = false;
  texture.needsUpdate = true;
  return texture;
}

export function outlineMaterial() {
  const uniforms = { thickness: { value: 1.6 }, resolution: { value: new THREE.Vector2(1280, 720) } };
  const material = new THREE.MeshBasicMaterial({ color: "#14110f", side: THREE.BackSide });
  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms);
    shader.vertexShader = shader.vertexShader
      .replace("#include <common>", "#include <common>\nuniform float thickness;\nuniform vec2 resolution;")
      .replace(
        "#include <project_vertex>",
        `#include <project_vertex>
        mat3 outlineBasis = mat3(1.0);
        #ifdef USE_INSTANCING
          outlineBasis = mat3(instanceMatrix);
        #endif
        vec3 outlineNormal = normalize(normalMatrix * (outlineBasis * normal));
        vec2 outlineDir = normalize((projectionMatrix * vec4(outlineNormal, 0.0)).xy + 1e-6);
        gl_Position.xy += outlineDir * thickness * gl_Position.w * 2.0 / resolution;`,
      );
  };
  return {
    material,
    /** Width in device pixels and the size of the drawing buffer */
    setSize(width: number, height: number, pixelRatio: number) {
      uniforms.resolution.value.set(width * pixelRatio, height * pixelRatio);
      uniforms.thickness.value = 1.6 * pixelRatio;
    },
  };
}

/**
 * Swaps every standard (and physical) material under `root` for a toon one
 * with the same colour and textures, and outlines solid objects. Objects
 * marked `userData.flat` (road, grass, kerbs) are not outlined. Returns the
 * swap, so code holding a material (lights that change) can follow it.
 */
export function toonify(root: THREE.Object3D, outline: THREE.Material) {
  const gradientMap = gradient();
  const swapped = new Map<THREE.Material, THREE.Material>();
  const swap = <M extends THREE.Material>(material: M): M => {
    if (!(material instanceof THREE.MeshStandardMaterial)) return material;
    let toon = swapped.get(material);
    if (!toon) {
      const m = material;
      // Surfaces with a flat colour for this look (`userData.toonColor`) drop their texture
      const flatColor = m.userData.toonColor as string | undefined;
      const next = new THREE.MeshToonMaterial({
        color: flatColor ?? m.color,
        map: flatColor ? null : m.map,
        emissive: m.emissive,
        emissiveIntensity: m.emissiveIntensity,
        transparent: m.transparent,
        opacity: m.opacity,
        side: m.side,
        vertexColors: m.vertexColors,
        gradientMap,
      });
      // Keeps custom shading such as the mowing stripes on the grass
      next.onBeforeCompile = m.onBeforeCompile;
      toon = next;
      swapped.set(material, toon);
    }
    return toon as unknown as M;
  };

  const outlines: THREE.Object3D[] = [];
  root.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) return;
    const lit = object.material instanceof THREE.MeshStandardMaterial;
    object.material = Array.isArray(object.material) ? object.material.map(swap) : swap(object.material);
    if (!lit || object.userData.flat) return;
    if (object instanceof THREE.InstancedMesh) {
      const copy = new THREE.InstancedMesh(object.geometry, outline, object.count);
      copy.instanceMatrix = object.instanceMatrix;
      copy.position.copy(object.position);
      copy.rotation.copy(object.rotation);
      copy.scale.copy(object.scale);
      outlines.push(copy);
    } else {
      const copy = new THREE.Mesh(object.geometry, outline);
      copy.userData.parent = object;
      outlines.push(copy);
    }
  });
  for (const copy of outlines) {
    // Plain meshes carry their outline as a child, so it moves with them; instanced ones sit beside them
    const parent = copy.userData.parent as THREE.Object3D | undefined;
    if (parent) parent.add(copy);
    else root.add(copy);
  }
  return { swap, dispose: () => gradientMap.dispose() };
}
