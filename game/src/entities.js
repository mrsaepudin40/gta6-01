// 3D meshes: cars (box-built), pedestrians, police cars.
import * as THREE from 'three';
import { PAL } from './config.js';

const wheelGeo = new THREE.CylinderGeometry(0.42, 0.42, 0.36, 10);
const wheelMat = new THREE.MeshLambertMaterial({ color: 0x141414 });

function box(w, h, d, color, x = 0, y = 0, z = 0) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), new THREE.MeshLambertMaterial({ color }));
  m.position.set(x, y, z);
  return m;
}

export function makeCarMesh(color, opts = {}) {
  const g = new THREE.Group();
  const sport = !!opts.sport;
  const bodyH = sport ? 0.5 : 0.62;
  const body = box(sport ? 2.1 : 2.0, bodyH, sport ? 4.6 : 4.2, color, 0, 0.55, 0);
  g.add(body);
  const cabin = box(1.7, 0.52, sport ? 2.0 : 2.1, 0x1a2028, 0, 0.55 + bodyH / 2 + 0.26, sport ? -0.2 : -0.1);
  g.add(cabin);
  if (sport) {
    const spoiler = box(1.9, 0.09, 0.5, 0x141414, 0, 1.18, -2.1);
    g.add(spoiler);
    const strutL = box(0.08, 0.3, 0.08, 0x141414, -0.7, 1.0, -2.1);
    const strutR = box(0.08, 0.3, 0.08, 0x141414, 0.7, 1.0, -2.1);
    g.add(strutL, strutR);
  }
  // headlights + taillights
  const hlMat = new THREE.MeshBasicMaterial({ color: 0xfff6c8 });
  const tlMat = new THREE.MeshBasicMaterial({ color: 0xff2a2a });
  for (const sx of [-0.65, 0.65]) {
    const hl = box(0.42, 0.16, 0.06, 0xfff6c8, sx, 0.62, 2.12);
    hl.material = hlMat; g.add(hl);
    const tl = box(0.42, 0.16, 0.06, 0xff2a2a, sx, 0.62, -2.12);
    tl.material = tlMat; g.add(tl);
  }
  // wheels
  const wheels = [];
  for (const [wx, wz] of [[-0.95, 1.4], [0.95, 1.4], [-0.95, -1.4], [0.95, -1.4]]) {
    const w = new THREE.Mesh(wheelGeo, wheelMat);
    w.rotation.z = Math.PI / 2;
    w.position.set(wx, 0.42, wz);
    g.add(w); wheels.push(w);
  }
  g.userData.wheels = wheels;
  return g;
}

export function makeCopCarMesh() {
  const g = makeCarMesh(PAL.copCar);
  const bar = box(1.5, 0.22, 0.5, 0xffffff, 0, 1.32, -0.1);
  g.add(bar);
  const red = box(0.7, 0.24, 0.52, 0xff2222, -0.38, 1.32, -0.1);
  red.material = new THREE.MeshBasicMaterial({ color: 0xff2222 });
  const blue = box(0.7, 0.24, 0.52, 0x2244ff, 0.38, 1.32, -0.1);
  blue.material = new THREE.MeshBasicMaterial({ color: 0x2244ff });
  g.add(red, blue);
  return g;
}

export function makePedMesh(color, opts = {}) {
  const g = new THREE.Group();
  const skin = new THREE.MeshLambertMaterial({ color: 0xe8b88a });
  const shirt = new THREE.MeshLambertMaterial({ color });
  const pants = new THREE.MeshLambertMaterial({ color: 0x2a2f3a });
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.5, 1.05, 8), shirt);
  body.position.y = 1.05;
  g.add(body);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.34, 10, 8), skin);
  head.position.y = 1.85;
  g.add(head);
  const legL = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.55, 6), pants);
  legL.position.set(-0.2, 0.28, 0);
  const legR = legL.clone(); legR.position.x = 0.2;
  g.add(legL, legR);
  if (opts.cop) {
    const hat = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.38, 0.16, 8), new THREE.MeshLambertMaterial({ color: 0x1a2a6b }));
    hat.position.y = 2.12;
    g.add(hat);
  }
  g.userData.legs = [legL, legR];
  return g;
}

export function makeHeliMesh() {
  const g = new THREE.Group();
  const body = box(2.6, 1.3, 5.2, PAL.copCar, 0, 0, 0);
  g.add(body);
  const nose = box(2.2, 1.0, 1.6, 0x1a2028, 0, -0.1, 2.8);
  g.add(nose);
  const tail = box(0.7, 0.7, 4.2, PAL.copCar, 0, 0.25, -4.4);
  g.add(tail);
  const fin = box(0.25, 1.6, 1.0, PAL.copCar, 0, 0.9, -6.2);
  g.add(fin);
  const mast = box(0.3, 0.6, 0.3, 0x141414, 0, 0.7, 0);
  g.add(mast);
  const rotor = box(11, 0.14, 0.7, 0x141414, 0, 1.0, 0);
  g.add(rotor);
  // spotlight beam: apex at the heli, base just at the ground below
  // (heli hovers ~15u up — a 42u cone would stab through the ground)
  const beamMat = new THREE.MeshBasicMaterial({ color: 0xfff2b0, transparent: true, opacity: 0.08, side: THREE.DoubleSide, depthWrite: false });
  const beam = new THREE.Mesh(new THREE.ConeGeometry(5, 15, 16, 1, true), beamMat);
  beam.position.set(0, -7.5, 0);
  g.add(beam);
  g.userData.rotor = rotor;
  return g;
}
