// ============================================================================
//  Prozeduraler Körper – reine Mathematik (läuft auch im Web Worker).
//  Maße in cm, Füße bei y=0, Blick Richtung +z. Die linke Seite der Figur
//  liegt bei +x. Aus weich verschmolzenen Grundformen (SDF) wird per
//  "Surface Nets" ein glattes Mesh erzeugt.
//  makeBody(sex, build): sex = 'm' | 'w', build = 'slim' | 'normal' | 'strong'
// ============================================================================

function ellipsoid(c, r) {
  const [cx, cy, cz] = c, [rx, ry, rz] = r;
  return (x, y, z) => {
    const px = (x - cx) / rx, py = (y - cy) / ry, pz = (z - cz) / rz;
    const k0 = Math.sqrt(px * px + py * py + pz * pz);
    const qx = px / rx, qy = py / ry, qz = pz / rz;
    const k1 = Math.sqrt(qx * qx + qy * qy + qz * qz);
    return k1 === 0 ? -Math.min(rx, ry, rz) : (k0 * (k0 - 1)) / k1;
  };
}

// Abgerundeter Kegel (Inigo Quilez)
function roundCone(a, b, r1, r2) {
  const [ax, ay, az] = a;
  const bax = b[0] - ax, bay = b[1] - ay, baz = b[2] - az;
  const l2 = bax * bax + bay * bay + baz * baz;
  const rr = r1 - r2;
  const a2 = l2 - rr * rr;
  const il2 = 1 / l2;
  return (x, y, z) => {
    const pax = x - ax, pay = y - ay, paz = z - az;
    const yy = pax * bax + pay * bay + paz * baz;
    const zz = yy - l2;
    const xvx = pax * l2 - bax * yy, xvy = pay * l2 - bay * yy, xvz = paz * l2 - baz * yy;
    const x2 = xvx * xvx + xvy * xvy + xvz * xvz;
    const y2 = yy * yy * l2;
    const z2 = zz * zz * l2;
    const k = Math.sign(rr) * rr * rr * x2;
    if (Math.sign(zz) * a2 * z2 > k) return Math.sqrt(x2 + z2) * il2 - r2;
    if (Math.sign(yy) * a2 * y2 < k) return Math.sqrt(x2 + y2) * il2 - r1;
    return (Math.sqrt(x2 * a2 * il2) + yy * rr) * il2 - r1;
  };
}

function smin(a, b, k) {
  const h = Math.max(k - Math.abs(a - b), 0) / k;
  return Math.min(a, b) - h * h * k * 0.25;
}

export const lerp3 = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];

const BUILD = { slim: 0.9, normal: 1, strong: 1.13 };

// ---------------------------------------------------------------------------
//  Körperdefinition
// ---------------------------------------------------------------------------
export function makeBody(sex = 'm', build = 'normal') {
  const b = BUILD[build] ?? 1;
  const bb = b * b; // Bauch/Rumpf reagieren stärker auf die Statur
  const w = sex === 'w';
  // Breiten- und Tiefenradien skalieren, Höhen bleiben
  const E = (c, r, k = b) => ellipsoid(c, [r[0] * k, r[1], r[2] * k]);
  const C = (p1, p2, r1, r2, k = b) => roundCone(p1, p2, r1 * k, r2 * k);

  const J = w
    ? { shoulder: [16.2, 132.2, -0.7], elbow: [24.4, 106.5, -1.8], wrist: [29.8, 82.5, 1.0], hip: [9.6, 87.5, 0], knee: [9.5, 47, 1.2], ankle: [9.7, 8, -1.6], height: 167 }
    : { shoulder: [18.2, 136.5, -0.8], elbow: [26.5, 109, -2.0], wrist: [32.5, 84, 1.0], hip: [9.6, 90, 0], knee: [10.6, 49, 1.2], ankle: [10.9, 8.5, -1.8], height: 176 };
  const { shoulder: S, elbow: El, wrist: W, hip: H, knee: K, ankle: A } = J;

  const hand = [
    ellipsoid(add(W, [1.8, -8.5, 1.2]), w ? [1.7, 5.9, 3.9] : [1.9, 6.4, 4.3]),
    ellipsoid(add(W, [2.7, -16.5, 1.6]), w ? [1.35, 4.8, 3.5] : [1.5, 5.2, 3.9]),
    roundCone(add(W, [0.7, -6.5, 4.4]), add(W, [1.3, -13.5, 6.6]), w ? 1.2 : 1.35, w ? 0.95 : 1.05),
  ];

  let parts;
  if (w) {
    parts = {
      head: [ellipsoid([0, 157.5, 1], [7.8, 10.6, 9.3]), ellipsoid([0, 150.6, 3.9], [5.2, 4.8, 5.1])],
      neck: [roundCone([0, 136.5, -0.6], [0, 148.8, 0.3], 5.2, 4.5)],
      torso: [
        E([0, 123.5, 0], [14.2, 14, 9.4]),
        E([0, 104.5, 0], [11.4, 12, 8.4], bb),
        E([0, 89.5, -0.6], [15.6, 12, 10.4]),
        C([3.6, 137.8, -1.4], [14.6, 133.6, -0.7], 4.7, 4.5),
        C([-3.6, 137.8, -1.4], [-14.6, 133.6, -0.7], 4.7, 4.5),
        ellipsoid([7.4, 120.5, 6.3], [6.5 * b, 6.3, 5.4 * b]),
        ellipsoid([-7.4, 120.5, 6.3], [6.5 * b, 6.3, 5.4 * b]),
        E([7.8, 85, -6], [8.6, 10, 7.2]),
        E([-7.8, 85, -6], [8.6, 10, 7.2]),
        E([0, 115, -5], [11.5, 14, 5]),
      ],
      upperArm: [C(S, El, 4.9, 3.6), E(lerp3(S, El, 0.12), [5.5, 7.2, 5.5]), E(lerp3(S, El, 0.5), [4.1, 7.6, 4.5])],
      forearm: [C(El, W, 3.5, 2.5), E(lerp3(El, W, 0.28), [3.8, 7.6, 3.9])],
      hand,
      thigh: [C(H, K, 8.9, 5.3), E([9.7, 68, 1.2], [7.7, 15.5, 7.7])],
      calf: [C(K, A, 5, 3), E([9.7, 34, -1.1], [5.1, 10, 5.2])],
      foot: [roundCone([A[0], 4, -3.3], [A[0] + 0.6, 2.6, 11.4], 3, 2.2)],
    };
  } else {
    parts = {
      head: [ellipsoid([0, 163.5, 1], [8.3, 11.2, 9.8]), ellipsoid([0, 156.5, 4.2], [5.8, 5.2, 5.6])],
      neck: [roundCone([0, 141, -0.8], [0, 154, 0.4], 6.2, 5.3)],
      torso: [
        E([0, 127.5, 0.2], [16.6, 15.5, 10.6]),
        E([0, 108, 0], [13.9, 13, 9.4], bb),
        E([0, 93, -0.6], [15.3, 11, 10.2]),
        C([4, 142.5, -1.5], [16.5, 138, -0.8], 5.6, 5.4),
        C([-4, 142.5, -1.5], [-16.5, 138, -0.8], 5.6, 5.4),
        E([8.4, 128.5, 5.8], [8.2, 6.6, 4.6]),
        E([-8.4, 128.5, 5.8], [8.2, 6.6, 4.6]),
        E([7.6, 87.5, -5.6], [8.6, 9.6, 6.6]),
        E([-7.6, 87.5, -5.6], [8.6, 9.6, 6.6]),
        E([0, 120, -5.5], [13.5, 15, 5.5]),
      ],
      upperArm: [C(S, El, 5.9, 4.3), E(lerp3(S, El, 0.12), [6.6, 8.2, 6.6]), E(lerp3(S, El, 0.5), [4.9, 8.5, 5.4])],
      forearm: [C(El, W, 4.2, 2.9), E(lerp3(El, W, 0.28), [4.5, 8.4, 4.6])],
      hand,
      thigh: [C(H, K, 8.7, 5.6), E([10.1, 71, 1.6], [7.7, 15.5, 7.8])],
      calf: [C(K, A, 5.3, 3.2), E([10.8, 36, -1.2], [5.5, 10.5, 5.6])],
      foot: [roundCone([A[0], 4.2, -3.6], [A[0] + 0.7, 2.8, 13], 3.4, 2.5)],
    };
  }

  const mirrored = new Set(['upperArm', 'forearm', 'hand', 'thigh', 'calf', 'foot']);
  const partDist = (name, x, y, z) => {
    const px = mirrored.has(name) ? Math.abs(x) : x;
    let d = Infinity;
    for (const f of parts[name]) d = smin(d, f(px, y, z), name === 'torso' ? 7 : name === 'head' ? 5 : 4.5);
    return d;
  };
  const armJoinY = S[1] - 18;
  const sdf = (x, y, z) => {
    let d = partDist('head', x, y, z);
    d = smin(d, partDist('neck', x, y, z), 3.5);
    d = smin(d, partDist('torso', x, y, z), 3);
    let arm = partDist('upperArm', x, y, z);
    arm = smin(arm, partDist('forearm', x, y, z), 2.6);
    arm = smin(arm, partDist('hand', x, y, z), 2.2);
    // Arme nur an der Schulter weich verschmelzen, nicht mit dem Rumpf in Hüfthöhe
    d = y > armJoinY ? smin(d, arm, 4) : Math.min(d, arm);
    let leg = partDist('thigh', x, y, z);
    leg = smin(leg, partDist('calf', x, y, z), 3.2);
    leg = smin(leg, partDist('foot', x, y, z), 2.6);
    return smin(d, leg, 3.5);
  };
  return { sex, build, J, parts, partDist, sdf };
}

// ---------------------------------------------------------------------------
//  Surface Nets
// ---------------------------------------------------------------------------
export function computeBodyMesh(cell = 1.0, sex = 'm', build = 'normal') {
  const body = makeBody(sex, build);
  const sdf = body.sdf;
  const min = [-44, -1, -18], max = [44, body.J.height + 1.5, 20];
  const nx = Math.ceil((max[0] - min[0]) / cell) + 1;
  const ny = Math.ceil((max[1] - min[1]) / cell) + 1;
  const nz = Math.ceil((max[2] - min[2]) / cell) + 1;
  const field = new Float32Array(nx * ny * nz);
  const idx = (x, y, z) => x + nx * (y + ny * z);

  for (let z = 0; z < nz; z++) {
    const pz = min[2] + z * cell;
    for (let y = 0; y < ny; y++) {
      const py = min[1] + y * cell;
      for (let x = 0; x < nx; x++) field[idx(x, y, z)] = sdf(min[0] + x * cell, py, pz);
    }
  }

  const cellVert = new Int32Array(nx * ny * nz).fill(-1);
  const positions = [];
  const corners = [
    [0, 0, 0], [1, 0, 0], [0, 1, 0], [1, 1, 0],
    [0, 0, 1], [1, 0, 1], [0, 1, 1], [1, 1, 1],
  ];
  const edges = [
    [0, 1], [2, 3], [4, 5], [6, 7],
    [0, 2], [1, 3], [4, 6], [5, 7],
    [0, 4], [1, 5], [2, 6], [3, 7],
  ];
  const vals = new Float32Array(8);

  for (let z = 0; z < nz - 1; z++) {
    for (let y = 0; y < ny - 1; y++) {
      for (let x = 0; x < nx - 1; x++) {
        let mask = 0;
        for (let c = 0; c < 8; c++) {
          const [cx, cy, cz] = corners[c];
          const v = field[idx(x + cx, y + cy, z + cz)];
          vals[c] = v;
          if (v < 0) mask |= 1 << c;
        }
        if (mask === 0 || mask === 255) continue;
        let sx = 0, sy = 0, sz = 0, n = 0;
        for (const [a, b] of edges) {
          const va = vals[a], vb = vals[b];
          if (va < 0 === vb < 0) continue;
          const t = va / (va - vb);
          const ca = corners[a], cb = corners[b];
          sx += ca[0] + (cb[0] - ca[0]) * t;
          sy += ca[1] + (cb[1] - ca[1]) * t;
          sz += ca[2] + (cb[2] - ca[2]) * t;
          n++;
        }
        cellVert[idx(x, y, z)] = positions.length / 3;
        positions.push(min[0] + (x + sx / n) * cell, min[1] + (y + sy / n) * cell, min[2] + (z + sz / n) * cell);
      }
    }
  }

  const indices = [];
  const quad = (a, b, c, d, flip) => {
    if (a < 0 || b < 0 || c < 0 || d < 0) return;
    if (flip) indices.push(a, c, b, a, d, c);
    else indices.push(a, b, c, a, c, d);
  };
  for (let z = 1; z < nz - 1; z++) {
    for (let y = 1; y < ny - 1; y++) {
      for (let x = 1; x < nx - 1; x++) {
        const inside = field[idx(x, y, z)] < 0;
        if (inside !== field[idx(x + 1, y, z)] < 0) {
          quad(cellVert[idx(x, y - 1, z - 1)], cellVert[idx(x, y, z - 1)], cellVert[idx(x, y, z)], cellVert[idx(x, y - 1, z)], !inside);
        }
        if (inside !== field[idx(x, y + 1, z)] < 0) {
          quad(cellVert[idx(x - 1, y, z - 1)], cellVert[idx(x - 1, y, z)], cellVert[idx(x, y, z)], cellVert[idx(x, y, z - 1)], !inside);
        }
        if (inside !== field[idx(x, y, z + 1)] < 0) {
          quad(cellVert[idx(x - 1, y - 1, z)], cellVert[idx(x, y - 1, z)], cellVert[idx(x, y, z)], cellVert[idx(x - 1, y, z)], !inside);
        }
      }
    }
  }

  // Normalen aus dem SDF-Gradienten -> sehr glatte Schattierung
  const normals = new Float32Array(positions.length);
  const e = cell * 0.5;
  for (let i = 0; i < positions.length; i += 3) {
    const x = positions[i], y = positions[i + 1], z = positions[i + 2];
    const gx = sdf(x + e, y, z) - sdf(x - e, y, z);
    const gy = sdf(x, y + e, z) - sdf(x, y - e, z);
    const gz = sdf(x, y, z + e) - sdf(x, y, z - e);
    const l = Math.hypot(gx, gy, gz) || 1;
    normals[i] = gx / l;
    normals[i + 1] = gy / l;
    normals[i + 2] = gz / l;
  }

  const pos = new Float32Array(positions);
  const ind = new Uint32Array(indices);
  // Wicklungsrichtung prüfen: zeigen Flächen gegen die Normalen -> alles drehen
  let agree = 0;
  for (let i = 0; i < Math.min(ind.length, 6000); i += 3) {
    const a = ind[i] * 3, b = ind[i + 1] * 3, c = ind[i + 2] * 3;
    const ux = pos[b] - pos[a], uy = pos[b + 1] - pos[a + 1], uz = pos[b + 2] - pos[a + 2];
    const vx = pos[c] - pos[a], vy = pos[c + 1] - pos[a + 1], vz = pos[c + 2] - pos[a + 2];
    const fx = uy * vz - uz * vy, fy = uz * vx - ux * vz, fz = ux * vy - uy * vx;
    agree += Math.sign(fx * normals[a] + fy * normals[a + 1] + fz * normals[a + 2]);
  }
  if (agree < 0) {
    for (let i = 0; i < ind.length; i += 3) {
      const t = ind[i + 1];
      ind[i + 1] = ind[i + 2];
      ind[i + 2] = t;
    }
  }
  return { positions: pos, normals, indices: ind };
}

// ---------------------------------------------------------------------------
//  Zonen: Punkt -> lesbare Körperstelle
// ---------------------------------------------------------------------------
export function zoneAt(p, body) {
  let best = 'torso', bd = Infinity;
  for (const name of Object.keys(body.parts)) {
    const d = body.partDist(name, p.x, p.y, p.z);
    if (d < bd) { bd = d; best = name; }
  }
  const S = body.J.shoulder;
  const side = p.x >= 0 ? 'links' : 'rechts';
  const front = p.z > 0;
  switch (best) {
    case 'head': return 'Kopf';
    case 'neck': return front ? 'Hals' : 'Nacken';
    case 'upperArm': return p.y > S[1] - 6 ? `Schulter ${side}` : `Oberarm ${side}`;
    case 'forearm': return `Unterarm ${side}`;
    case 'hand': return `Hand ${side}`;
    case 'thigh': return `Oberschenkel ${side}`;
    case 'calf': return p.y < 18 ? `Knöchel ${side}` : `Wade / Schienbein ${side}`;
    case 'foot': return `Fuß ${side}`;
    default: {
      const top = S[1];
      const flank = Math.abs(p.x) > 10 && Math.abs(p.z) < 6;
      if (flank && p.y > top - 36 && p.y < top - 4) return `Rippen ${side}`;
      if (p.y > top + 3.5) return front ? 'Hals / Schlüsselbein' : 'Nacken';
      if (front) {
        if (p.y > top - 18) return 'Brust';
        if (p.y > top - 39) return 'Bauch';
        return 'Hüfte / Leiste';
      }
      if (p.y > top - 14) return 'Oberer Rücken';
      if (p.y > top - 36) return 'Rücken Mitte';
      return 'Unterer Rücken';
    }
  }
}
