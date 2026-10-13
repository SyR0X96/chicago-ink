import { computeBodyMesh } from './body-sdf.js';

self.onmessage = ({ data }) => {
  const mesh = computeBodyMesh(data.cell, data.sex, data.build);
  self.postMessage(mesh, [mesh.positions.buffer, mesh.normals.buffer, mesh.indices.buffer]);
};
