import * as THREE from "three";

/* The toon look shared by the workshop and its machines: three-step shading and thick ink outlines. */

export const ink = new THREE.Color("#1d1d1f");
let gradient: THREE.DataTexture | null = null;
function toonGradient() {
  if (gradient) return gradient;
  gradient = new THREE.DataTexture(new Uint8Array([70, 150, 255]), 3, 1, THREE.RedFormat);
  gradient.minFilter = gradient.magFilter = THREE.NearestFilter;
  gradient.needsUpdate = true;
  return gradient;
}
export const toon = (color: string, extra: Partial<THREE.MeshToonMaterialParameters> = {}) => new THREE.MeshToonMaterial({ color, gradientMap: toonGradient(), ...extra });
/** People get gentler shading: the hard three-step bands read as dirt on a face. Skin gets the gentlest of all. */
const gradients: Record<string, THREE.DataTexture> = {};
function soft(levels: number[]) {
  const key = levels.join();
  if (!gradients[key]) {
    const g = new THREE.DataTexture(new Uint8Array(levels), levels.length, 1, THREE.RedFormat);
    g.minFilter = g.magFilter = THREE.NearestFilter;
    g.needsUpdate = true;
    gradients[key] = g;
  }
  return gradients[key];
}
export function softToon(color: string, skin = false) {
  return new THREE.MeshToonMaterial({ color, gradientMap: soft(skin ? [225, 245, 255] : [170, 215, 255]) });
}
const outlineMaterial = new THREE.MeshBasicMaterial({ color: ink, side: THREE.BackSide });

export function mesh(geometry: THREE.BufferGeometry, material: THREE.Material, x = 0, y = 0, z = 0, outline = 0) {
  const m = new THREE.Mesh(geometry, material);
  m.position.set(x, y, z);
  if (outline) {
    // Inverted hull: a slightly larger copy drawn from the inside reads as a thick ink line.
    const hull = new THREE.Mesh(geometry, outlineMaterial);
    geometry.computeBoundingBox();
    const size = geometry.boundingBox!.getSize(new THREE.Vector3());
    hull.scale.set(1 + outline / Math.max(size.x, 0.01), 1 + outline / Math.max(size.y, 0.01), 1 + outline / Math.max(size.z, 0.01));
    hull.raycast = () => undefined;
    m.add(hull);
  }
  return m;
}
export const box = (w: number, h: number, d: number) => new THREE.BoxGeometry(w, h, d);
/** An invisible touch target, much bigger than the part, so fingers on a tablet can hit it. */
export const hitMaterial = new THREE.MeshBasicMaterial({ visible: false });
export const hitArea = (radius: number) => new THREE.Mesh(new THREE.SphereGeometry(radius, 8, 6), hitMaterial);
export const hitBox = (w: number, h: number, d: number) => new THREE.Mesh(box(w, h, d), hitMaterial);

export function canvasTexture(width: number, height: number) {
  const canvas = document.createElement("canvas");
  canvas.width = width; canvas.height = height;
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return { canvas, ctx: canvas.getContext("2d")!, texture };
}
export type CanvasTex = ReturnType<typeof canvasTexture>;
export function labelPlane(width: number, height: number, draw: (ctx: CanvasRenderingContext2D, w: number, h: number) => void, scale = 512, transparent = false) {
  const w = Math.round(scale), h = Math.round(scale * height / width);
  const { ctx, texture } = canvasTexture(w, h);
  draw(ctx, w, h);
  texture.needsUpdate = true;
  return new THREE.Mesh(new THREE.PlaneGeometry(width, height), new THREE.MeshBasicMaterial({ map: texture, transparent, toneMapped: false }));
}
/** A plane showing a canvas that can be redrawn later. */
export const texturePlane = (width: number, height: number, tex: CanvasTex, transparent = false) =>
  new THREE.Mesh(new THREE.PlaneGeometry(width, height), new THREE.MeshBasicMaterial({ map: tex.texture, transparent, toneMapped: false }));

export function wrapText(c: CanvasRenderingContext2D, text: string, x: number, y: number, max: number, line: number) {
  const words = text.split(" ");
  const lines: string[] = [];
  let current = "";
  for (const word of words) { const test = current ? `${current} ${word}` : word; if (c.measureText(test).width > max && current) { lines.push(current); current = word; } else current = test; }
  if (current) lines.push(current);
  lines.forEach((l, i) => c.fillText(l, x, y + (i - (lines.length - 1) / 2) * line));
}

/** The price sticker: yellow, ink border, two bold lines. */
export function drawSticker(tex: CanvasTex, lines: string[]) {
  const { ctx: c, canvas } = tex;
  const w = canvas.width, h = canvas.height;
  c.clearRect(0, 0, w, h);
  c.fillStyle = "#ffd23f";
  // A rounded rectangle drawn by hand: older iPads have no roundRect.
  const r = h * 0.14, x0 = 4, y0 = 4, x1 = w - 4, y1 = h - 4;
  c.beginPath(); c.moveTo(x0 + r, y0); c.arcTo(x1, y0, x1, y1, r); c.arcTo(x1, y1, x0, y1, r); c.arcTo(x0, y1, x0, y0, r); c.arcTo(x0, y0, x1, y0, r); c.closePath(); c.fill();
  c.lineWidth = Math.max(6, h * 0.07); c.strokeStyle = "#1d1d1f"; c.stroke();
  c.fillStyle = "#1d1d1f"; c.textAlign = "center"; c.textBaseline = "middle";
  // Each line shrinks until it fits inside the border.
  const line = (text: string, weight: number, size: number, y: number) => {
    let px = size;
    c.font = `${weight} ${px}px system-ui, sans-serif`;
    while (px > 8 && c.measureText(text).width > w * 0.84) { px -= 2; c.font = `${weight} ${px}px system-ui, sans-serif`; }
    c.fillText(text, w / 2, y);
  };
  line(lines[0] ?? "", 800, h * 0.26, h * 0.32);
  line(lines[1] ?? "", 900, h * 0.34, h * 0.7);
  tex.texture.needsUpdate = true;
}
