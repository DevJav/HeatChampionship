import * as THREE from "three";

/**
 * Textures for the 3D replay, painted on canvases at load time so there are
 * no image files to download. Surfaces get a colour map plus roughness and
 * normal maps from the same noise, so light catches the grain of the asphalt
 * and the gravel.
 */

/** Deterministic noise so every viewer (and every recording) gets the same scenery */
export function random(seed: number) {
  return () => {
    seed = (seed * 1664525 + 1013904223) % 4294967296;
    return seed / 4294967296;
  };
}

export function canvasTexture(width: number, height: number, draw: (ctx: CanvasRenderingContext2D) => void, { srgb = true } = {}) {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  draw(canvas.getContext("2d")!);
  const texture = new THREE.CanvasTexture(canvas);
  if (srgb) texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  return texture;
}

/** Tileable value noise in 0 … 1, a few octaves from `cells` across upwards. */
function noise(size: number, cells: number, octaves: number, seed: number) {
  const rand = random(seed);
  const out = new Float32Array(size * size);
  let amplitude = 1;
  let total = 0;
  for (let o = 0; o < octaves; o++) {
    const n = cells << o;
    const grid = Float32Array.from({ length: n * n }, () => rand());
    const at = (x: number, y: number) => grid[(((y % n) + n) % n) * n + (((x % n) + n) % n)];
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const [gx, gy] = [(x / size) * n, (y / size) * n];
        const [ix, iy] = [Math.floor(gx), Math.floor(gy)];
        const [fx, fy] = [gx - ix, gy - iy];
        const [sx, sy] = [fx * fx * (3 - 2 * fx), fy * fy * (3 - 2 * fy)];
        const top = at(ix, iy) * (1 - sx) + at(ix + 1, iy) * sx;
        const bottom = at(ix, iy + 1) * (1 - sx) + at(ix + 1, iy + 1) * sx;
        out[y * size + x] += (top * (1 - sy) + bottom * sy) * amplitude;
      }
    }
    total += amplitude;
    amplitude *= 0.5;
  }
  for (let i = 0; i < out.length; i++) out[i] /= total;
  return out;
}

function fromPixels(size: number, pixel: (i: number) => [number, number, number], options?: { srgb?: boolean }) {
  const texture = canvasTexture(
    size,
    size,
    (ctx) => {
      const image = ctx.createImageData(size, size);
      for (let i = 0; i < size * size; i++) {
        const [r, g, b] = pixel(i);
        image.data.set([r, g, b, 255], i * 4);
      }
      ctx.putImageData(image, 0, 0);
    },
    options,
  );
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  return texture;
}

/** Normal map from a height field (wrapping at the edges, so it tiles). */
function normalMap(size: number, height: Float32Array, strength: number) {
  const h = (x: number, y: number) => height[(((y + size) % size) * size + ((x + size) % size)) | 0];
  return fromPixels(
    size,
    (i) => {
      const [x, y] = [i % size, Math.floor(i / size)];
      const dx = (h(x + 1, y) - h(x - 1, y)) * strength;
      const dy = (h(x, y + 1) - h(x, y - 1)) * strength;
      const len = Math.hypot(dx, dy, 1);
      return [((-dx / len) * 0.5 + 0.5) * 255, ((-dy / len) * 0.5 + 0.5) * 255, ((1 / len) * 0.5 + 0.5) * 255];
    },
    { srgb: false },
  );
}

export type Surface = { map: THREE.Texture; normalMap: THREE.Texture; roughnessMap: THREE.Texture };

function surface(
  size: number,
  height: Float32Array,
  color: (h: number, i: number) => [number, number, number],
  roughness: (h: number) => number,
  bump: number,
): Surface {
  return {
    map: fromPixels(size, (i) => color(height[i], i)),
    normalMap: normalMap(size, height, bump),
    roughnessMap: fromPixels(size, (i) => {
      const r = roughness(height[i]) * 255;
      return [r, r, r];
    }, { srgb: false }),
  };
}

/** Fine aggregate with the odd lighter stone, slightly glossier where it is worn smooth */
export function asphalt(): Surface {
  const size = 512;
  const grain = noise(size, 64, 3, 3);
  const patches = noise(size, 4, 3, 9);
  const rand = random(17);
  const stones = Float32Array.from({ length: size * size }, () => (rand() < 0.04 ? rand() : 0));
  const height = grain.map((g, i) => g * 0.8 + stones[i] * 0.6);
  return surface(
    size,
    height,
    (h, i) => {
      const v = 52 + (h - 0.5) * 26 + (patches[i] - 0.5) * 14 + stones[i] * 40;
      return [v, v + 1, v + 4];
    },
    (h) => 0.82 + (0.5 - h) * 0.2,
    6,
  );
}

/** Short grass with clumps; mowing stripes are added in the shader, by world position */
export function grass(): Surface {
  const size = 512;
  const blades = noise(size, 128, 2, 7);
  const clumps = noise(size, 8, 4, 21);
  const height = blades.map((b, i) => b * 0.7 + clumps[i] * 0.3);
  return surface(
    size,
    height,
    (h, i) => {
      const c = clumps[i] - 0.5;
      return [66 + c * 30 + (h - 0.5) * 30, 118 + c * 40 + (h - 0.5) * 46, 46 + c * 16];
    },
    () => 0.95,
    3,
  );
}

export function gravel(): Surface {
  const size = 256;
  const pebbles = noise(size, 96, 2, 11);
  const rand = random(5);
  return surface(
    size,
    pebbles,
    (h) => {
      const v = (h - 0.5) * 60 + (rand() - 0.5) * 18;
      return [204 + v, 184 + v, 146 + v * 0.8];
    },
    () => 0.97,
    9,
  );
}

export function stripes(a: string, b: string) {
  const texture = canvasTexture(64, 8, (ctx) => {
    ctx.fillStyle = a;
    ctx.fillRect(0, 0, 32, 8);
    ctx.fillStyle = b;
    ctx.fillRect(32, 0, 32, 8);
  });
  texture.wrapS = THREE.RepeatWrapping;
  return texture;
}

export function chequered(columns: number, rows: number) {
  const texture = canvasTexture(columns * 8, rows * 8, (ctx) => {
    for (let x = 0; x < columns; x++) {
      for (let y = 0; y < rows; y++) {
        ctx.fillStyle = (x + y) % 2 ? "#111" : "#f4f4f2";
        ctx.fillRect(x * 8, y * 8, 8, 8);
      }
    }
  });
  texture.magFilter = THREE.NearestFilter;
  return texture;
}

/** Rows of spectators: heads, shirts and the odd flag, on grey seats */
export function crowd(seed: number) {
  const rand = random(seed);
  const shirts = ["#e11d48", "#f59e0b", "#2563eb", "#16a34a", "#f4f4f5", "#a855f7", "#111827", "#f97316", "#d10500", "#0ea5e9"];
  const skin = ["#f1c7a5", "#d9a37c", "#a8744f", "#6e4a33"];
  const texture = canvasTexture(512, 128, (ctx) => {
    ctx.fillStyle = "#6b7280";
    ctx.fillRect(0, 0, 512, 128);
    for (let row = 0; row < 8; row++) {
      ctx.fillStyle = "#4b5563";
      ctx.fillRect(0, row * 16 + 13, 512, 3);
      for (let x = 0; x < 512; x += 6 + rand() * 3) {
        if (rand() < 0.12) continue;
        const y = row * 16 + 3;
        ctx.fillStyle = shirts[Math.floor(rand() * shirts.length)];
        ctx.fillRect(x, y + 4, 5, 7);
        ctx.fillStyle = skin[Math.floor(rand() * skin.length)];
        ctx.fillRect(x + 1, y, 3, 4);
      }
    }
  });
  texture.wrapS = THREE.RepeatWrapping;
  return texture;
}

/** A pit building's glass front: two floors of windows over garage doors */
export function pitFront() {
  const texture = canvasTexture(256, 128, (ctx) => {
    ctx.fillStyle = "#e5e7eb";
    ctx.fillRect(0, 0, 256, 128);
    const g = ctx.createLinearGradient(0, 0, 0, 64);
    g.addColorStop(0, "#1e3a5f");
    g.addColorStop(1, "#4a6b8a");
    ctx.fillStyle = g;
    ctx.fillRect(0, 8, 256, 26);
    ctx.fillRect(0, 40, 256, 22);
    ctx.fillStyle = "#cbd5e1";
    for (let x = 0; x < 256; x += 16) ctx.fillRect(x, 8, 2, 54);
    for (let x = 6; x < 256; x += 64) {
      ctx.fillStyle = "#1f2937";
      ctx.fillRect(x, 74, 52, 48);
      ctx.fillStyle = "#374151";
      for (let y = 78; y < 122; y += 6) ctx.fillRect(x + 2, y, 48, 2);
    }
  });
  texture.wrapS = THREE.RepeatWrapping;
  return texture;
}

export function advert(text: string, background: string, color: string) {
  const texture = canvasTexture(512, 96, (ctx) => {
    ctx.fillStyle = background;
    ctx.fillRect(0, 0, 512, 96);
    ctx.fillStyle = color;
    ctx.font = "italic 800 56px system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(text, 256, 50, 480);
  });
  return texture;
}

export function speedSign(limit: number) {
  return canvasTexture(256, 256, (ctx) => {
    ctx.beginPath();
    ctx.arc(128, 128, 120, 0, Math.PI * 2);
    ctx.fillStyle = "#fff";
    ctx.fill();
    ctx.lineWidth = 26;
    ctx.strokeStyle = "#d10500";
    ctx.stroke();
    ctx.fillStyle = "#111";
    ctx.font = "bold 140px system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(String(limit), 128, 136);
  });
}

export function smoke() {
  return canvasTexture(64, 64, (ctx) => {
    const g = ctx.createRadialGradient(32, 32, 2, 32, 32, 32);
    g.addColorStop(0, "rgba(240,240,240,0.9)");
    g.addColorStop(0.5, "rgba(220,220,220,0.45)");
    g.addColorStop(1, "rgba(210,210,210,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 64, 64);
  });
}

/** A soft round glow, white so a sprite's colour tints it */
export function glow() {
  return canvasTexture(64, 64, (ctx) => {
    const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    g.addColorStop(0, "rgba(255,255,255,1)");
    g.addColorStop(0.3, "rgba(255,255,255,0.5)");
    g.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 64, 64);
  });
}
