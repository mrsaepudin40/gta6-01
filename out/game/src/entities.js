// Model builders: box-built cars (with glass + wheels + lights), pedestrians,
// police cars, helicopter. All original, low-poly.
import * as THREE from 'three';
import { PAL } from './config.js';
import { pick } from './random.js';

const CAR_COLORS = [0xe8b64c, 0xe05a5a, 0x5fb8a6, 0x7a9cc6, 0xf0e6d2, 0xc77dff, 0x37d67a, 0xff8fa3];
const SPORT_COLORS = [0xff2e88, 0xffc93c, 0x54e0ff, 0xe05a5a];

export function buildCar(color, sport = false) {
  const car = new THREE.Group();
  const bodyMat = new THREE.MeshStandardMaterial({ color, roughness: 0.35, metalness: 0.45 });
  const glassMat = new THREE.MeshStandardMaterial({ color: 0x18242e, roughness: 0.15, metalness: 0.7 });
  const body = new THREE.Mesh(new THREE.BoxGeometry(4.4, 1.5, 2.2), bodyMat);
  body.position.y = 1.05; body.castShadow = true; car.add(body);
  const cabin = new THREE.Mesh(new THREE.BoxGeometry(2.4, 1.1, 2.0), glassMat);
  cabin.position.set(-0.2, 2.2, 0); cabin.castShadow = true; car.add(cabin);
  const nose = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.8, 2.1), bodyMat);
  nose.position.set(2.4, 0.85, 0); nose.castShadow = true; car.add(nose);
  if (sport) {
    const spoiler = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.25, 2.3), bodyMat);
    spoiler.position.set(-2.4, 2.0, 0); car.add(spoiler);
    const skirt = new THREE.Mesh(new THREE.BoxGeometry(4.6, 0.4, 2.35),
      new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.6 }));
    skirt.position.y = 0.45; car.add(skirt);
  }
  // headlights + taillights (emissive so they read at sunset/night)
  const hl = new THREE.MeshBasicMaterial({ color: 0xfff2b0 });
  const tl = new THREE.MeshBasicMaterial({ color: 0xff2a2a });
  for (const s of [-0.8, 0.8]) {
    const h = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.4, 0.5), hl);
    h.position.set(2.9, 1.0, s); car.add(h);
    const t = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.4, 0.5), tl);
    t.position.set(-2.25, 1.0, s); car.add(t);
  }
  const wheels = [];
  const wheelGeo = new THREE.CylinderGeometry(0.62, 0.62, 0.5, 12);
  const wheelMat = new THREE.MeshStandardMaterial({ color: 0x141414, roughness: 0.9 });
  for (const [wx, wz] of [[1.5, 1.05], [1.5, -1.05], [-1.5, 1.05], [-1.5, -1.05]]) {
    const w = new THREE.Mesh(wheelGeo, wheelMat);
    w.rotation.x = Math.PI / 2; w.position.set(wx, 0.62, wz); w.castShadow = true;
    car.add(w); wheels.push(w);
  }
  car.userData.wheels = wheels;
  return car;
}

export function randomCarColor(rng, sport = false) {
  return pick(rng, sport ? SPORT_COLORS : CAR_COLORS);
}

export function buildPed(color) {
  const p = new THREE.Group();
  const shirt = new THREE.MeshStandardMaterial({ color, roughness: 0.8 });
  const skin = new THREE.MeshStandardMaterial({ color: 0xe8b98a, roughness: 0.8 });
  const pants = new THREE.MeshStandardMaterial({ color: 0x2a2a3a, roughness: 0.8 });
  const body = new THREE.Mesh(new THREE.BoxGeometry(1.1, 1.6, 0.6), shirt);
  body.position.y = 1.9; body.castShadow = true; p.add(body);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.55, 10, 8), skin);
  head.position.y = 3.1; head.castShadow = true; p.add(head);
  const legs = new THREE.Mesh(new THREE.BoxGeometry(0.9, 1.3, 0.55), pants);
  legs.position.y = 0.65; p.add(legs);
  p.userData.body = body;
  return p;
}

export function buildCopCar() {
  const car = buildCar(0xf2f2f2, false);
  const stripe = new THREE.Mesh(new THREE.BoxGeometry(4.5, 0.35, 2.25),
    new THREE.MeshStandardMaterial({ color: 0x2248c8, roughness: 0.5 }));
  stripe.position.y = 1.35; car.add(stripe);
  const barMat = new THREE.MeshBasicMaterial({ color: 0xff2a2a });
  const barMat2 = new THREE.MeshBasicMaterial({ color: 0x2a6bff });
  const b1 = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.3, 0.6), barMat);
  b1.position.set(-0.2, 2.95, 0.55); car.add(b1);
  const b2 = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.3, 0.6), barMat2);
  b2.position.set(-0.2, 2.95, -0.55); car.add(b2);
  car.userData.lightbar = [b1, b2];
  return car;
}

export function buildHeli() {
  const h = new THREE.Group();
  const bodyMat = new THREE.MeshStandardMaterial({ color: 0x2248c8, roughness: 0.4, metalness: 0.3 });
  const body = new THREE.Mesh(new THREE.BoxGeometry(7, 2.6, 3.2), bodyMat);
  body.castShadow = true; h.add(body);
  const glass = new THREE.Mesh(new THREE.BoxGeometry(2.4, 1.6, 2.8),
    new THREE.MeshStandardMaterial({ color: 0x18242e, roughness: 0.15, metalness: 0.7 }));
  glass.position.set(3.6, -0.2, 0); h.add(glass);
  const tail = new THREE.Mesh(new THREE.BoxGeometry(6, 0.9, 0.9), bodyMat);
  tail.position.set(-6, 0.6, 0); h.add(tail);
  const fin = new THREE.Mesh(new THREE.BoxGeometry(0.6, 2.4, 0.4), bodyMat);
  fin.position.set(-8.8, 1.6, 0); h.add(fin);
  const rotorMat = new THREE.MeshBasicMaterial({ color: 0x222222, transparent: true, opacity: 0.55 });
  const rotor = new THREE.Mesh(new THREE.BoxGeometry(15, 0.15, 1.1), rotorMat);
  rotor.position.y = 2.0; h.add(rotor);
  const rotor2 = rotor.clone(); rotor2.rotation.y = Math.PI / 2; h.add(rotor2);
  const spot = new THREE.Mesh(new THREE.ConeGeometry(9, 42, 12, 1, true),
    new THREE.MeshBasicMaterial({ color: 0xfff2b0, transparent: true, opacity: 0.16, side: THREE.DoubleSide, depthWrite: false }));
  spot.rotation.x = Math.PI; spot.position.y = -22; h.add(spot);
  h.userData.rotors = [rotor, rotor2];
  return h;
}
