// Isometric drawing helpers for the agent office (plain SVG, no 3D library).
// World axes: x runs down-right on screen, y runs down-left, z runs up. One unit = K px.

export const K = 22;
export const C = K * Math.cos(Math.PI / 6);
export const S = K * 0.5;
export const H = K;

export type Pt = [number, number];

export function P(x: number, y: number, z = 0): Pt {
  return [(x - y) * C, (x + y) * S - z * H];
}

export function pts(list: Pt[]): string {
  return list.map(([a, b]) => `${a.toFixed(1)},${b.toFixed(1)}`).join(" ");
}

/** f > 1 mixes toward white by (f - 1); f < 1 darkens by factor f. */
export function shade(hex: string, f: number): string {
  const n = parseInt(hex.slice(1), 16);
  let r = (n >> 16) & 255;
  let g = (n >> 8) & 255;
  let b = n & 255;
  if (f >= 1) {
    const t = f - 1;
    r += (255 - r) * t;
    g += (255 - g) * t;
    b += (255 - b) * t;
  } else {
    r *= f;
    g *= f;
    b *= f;
  }
  return `#${[r, g, b].map((v) => Math.round(v).toString(16).padStart(2, "0")).join("")}`;
}

type BoxProps = {
  x: number;
  y: number;
  z?: number;
  w: number;
  d: number;
  h: number;
  color: string;
  top?: string;
  left?: string;
  right?: string;
  fillOpacity?: number;
  stroke?: string;
};

/** A box with its three visible faces: top, front-left (y + d) and front-right (x + w). */
export function IsoBox({ x, y, z = 0, w, d, h, color, top, left, right, fillOpacity, stroke }: BoxProps) {
  const zt = z + h;
  const topFace = pts([P(x, y, zt), P(x + w, y, zt), P(x + w, y + d, zt), P(x, y + d, zt)]);
  const leftFace = pts([P(x, y + d, zt), P(x + w, y + d, zt), P(x + w, y + d, z), P(x, y + d, z)]);
  const rightFace = pts([P(x + w, y, zt), P(x + w, y + d, zt), P(x + w, y + d, z), P(x + w, y, z)]);
  return (
    <g stroke={stroke} strokeWidth={stroke ? 0.7 : undefined} strokeLinejoin="round" fillOpacity={fillOpacity}>
      <polygon points={leftFace} fill={left ?? shade(color, 0.88)} />
      <polygon points={rightFace} fill={right ?? shade(color, 0.74)} />
      <polygon points={topFace} fill={top ?? shade(color, 1.12)} />
    </g>
  );
}

/**
 * SVG transform that maps a flat W×Hh drawing onto the front-left face (the plane y = yFace)
 * of a box spanning x..x+w and zTop-h..zTop. Used for monitor screens, the vault door and the shelf.
 */
export function leftFaceMatrix(x: number, yFace: number, zTop: number, w: number, h: number, W = 100, Hh = 70): string {
  const [ox, oy] = P(x, yFace, zTop);
  return `matrix(${(C * w) / W} ${(S * w) / W} 0 ${(H * h) / Hh} ${ox} ${oy})`;
}

/**
 * Same as leftFaceMatrix for the front-right face (the plane x = xFace) of a box spanning y..y+d.
 * The drawing runs left to right as the viewer sees it, i.e. from y + d towards y.
 */
export function rightFaceMatrix(xFace: number, y: number, zTop: number, d: number, h: number, W = 100, Hh = 70): string {
  const [ox, oy] = P(xFace, y + d, zTop);
  return `matrix(${(C * d) / W} ${(-S * d) / W} 0 ${(H * h) / Hh} ${ox} ${oy})`;
}

/** SVG transform for text painted flat on the floor, running along +x. 10 local units = 1 world unit. */
export function floorMatrix(x: number, y: number): string {
  const [ox, oy] = P(x, y, 0);
  const s = 0.1;
  return `matrix(${C * s} ${S * s} ${-C * s} ${S * s} ${ox} ${oy})`;
}
