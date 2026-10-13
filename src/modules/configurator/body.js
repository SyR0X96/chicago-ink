import * as THREE from 'three';
import { lerp3 } from './body-sdf.js';

export { makeBody, zoneAt } from './body-sdf.js';

const v3 = (a) => new THREE.Vector3(a[0], a[1], a[2]);

// Erzeugt das Körper-Mesh im Web Worker (blockiert das Scrollen nicht)
export function buildBodyGeometry(cell, sex, build) {
  return new Promise((resolve, reject) => {
    const worker = new Worker(new URL('./body.worker.js', import.meta.url), { type: 'module' });
    worker.onmessage = ({ data }) => {
      worker.terminate();
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.BufferAttribute(data.positions, 3));
      geo.setAttribute('normal', new THREE.BufferAttribute(data.normals, 3));
      geo.setIndex(new THREE.BufferAttribute(data.indices, 1));
      geo.computeBoundingBox();
      geo.computeBoundingSphere();
      resolve(geo);
    };
    worker.onerror = (e) => {
      worker.terminate();
      reject(e);
    };
    worker.postMessage({ cell, sex, build });
  });
}

// Vordefinierte Stellen, relativ zu den Gelenken des jeweiligen Körpers.
// target = Zielpunkt, dir = Projektionsrichtung, cam = Kamera-Versatz zum Ziel
export function zonesFor(body) {
  const { shoulder: S, elbow: E, wrist: W, hip: H, knee: K, ankle: A } = body.J;
  const w = body.sex === 'w';
  const list = [
    { id: 'forearm', label: 'Unterarm', target: lerp3(E, W, 0.45), dir: [0.35, 0, 1], cam: [40, 8, 85] },
    { id: 'upperarm', label: 'Oberarm', target: lerp3(S, E, 0.55), dir: [1, 0.05, 0.35], cam: [72, 6, 56] },
    { id: 'shoulder', label: 'Schulter', target: [S[0] + 1.5, S[1] + 2, S[2]], dir: [0.6, 0.75, 0.25], cam: [50, 22, 61] },
    { id: 'chest', label: w ? 'Dekolleté' : 'Brust', target: [w ? 0 : 8, S[1] - (w ? 2 : 8), 8], dir: [0, 0.1, 1], cam: [2, 2, 112] },
    { id: 'ribs', label: 'Rippen', target: [w ? 10.5 : 12.5, S[1] - 23, 4], dir: [0.6, 0, 0.8], cam: [82, 5, 91] },
    { id: 'back', label: 'Rücken', target: [0, S[1] - 12, -8], dir: [0, 0, -1], cam: [0, 1, -127] },
    { id: 'neck', label: 'Nacken', target: [0, S[1] + 11.5, -5.5], dir: [0, 0.25, -1], cam: [0, 8, -80] },
    { id: 'thigh', label: 'Oberschenkel', target: [H[0] + 0.8, lerp3(H, K, 0.45)[1], 6], dir: [0.15, 0, 1], cam: [30, 5, 104] },
    { id: 'calf', label: 'Wade', target: [K[0] + 0.2, lerp3(K, A, 0.36)[1], -4], dir: [0.1, 0, -1], cam: [24, 6, -96] },
    { id: 'hand', label: 'Hand', target: [W[0] + 2.1, W[1] - 10, W[2] + 3], dir: [1, 0, 0.3], cam: [45, 6, 46] },
  ];
  return list.map((z) => {
    const target = v3(z.target);
    return { ...z, target, dir: v3(z.dir).normalize(), cam: target.clone().add(v3(z.cam)) };
  });
}
