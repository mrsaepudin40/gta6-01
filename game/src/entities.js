// Model builders: box-built cars (with glass + wheels + lights), pedestrians,
// police cars, helicopter. All original, low-poly.
import * as THREE from 'three';
import { PAL } from './config.js';
import { pick } from './random.js';

const CAR_COLORS = [0xe8b64c, 0xe05a5a, 0x5fb8a6, 0x7a9cc6, 0xf0e6d2, 0xc77dff, 0x37d67a, 0xff8fa3];
const SPORT_COLORS = [0xff2e88, 0xffc93c, 0x54e0ff, 0xe05a5a];

// Small canvas text textures: license plates + police door decals.
function textTexture(text, fg, bg, w = 128, h = 32, font = 'bold 22px Arial, sans-serif') {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const g = c.getContext('2d');
  g.fillStyle = bg; g.fillRect(0, 0, w, h);
  g.strokeStyle = fg; g.lineWidth = 3; g.strokeRect(2, 2, w - 4, h - 4);
  g.font = font; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillStyle = fg; g.fillText(text, w / 2, h / 2 + 1);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
const PLATE_TEX = textTexture('SOLMAR', '#1a1a2a', '#f0f0e8');
const POLICE_TEX = textTexture('POLICE', '#f0f0f0', '#2248c8', 256, 48, 'bold 34px Arial, sans-serif');

export function buildCar(color, sport = false) {
  const car = new THREE.Group();
  // glossy paint: moderate metalness + a touch of the paint color as emissive,
  // so the color still reads on the shadow side (high metalness + no env map
  // turned the pink sports car dark brown from behind)
  const bodyMat = new THREE.MeshStandardMaterial({
    color, roughness: sport ? 0.3 : 0.4, metalness: sport ? 0.35 : 0.3,
    emissive: color, emissiveIntensity: sport ? 0.25 : 0.15,
  });
  const glassMat = new THREE.MeshStandardMaterial({ color: 0x18242e, roughness: 0.15, metalness: 0.7 });
  const body = new THREE.Mesh(new THREE.BoxGeometry(4.4, 1.5, 2.2), bodyMat);
  body.position.y = 1.05; body.castShadow = true; car.add(body);
  const cabin = new THREE.Mesh(new THREE.BoxGeometry(2.4, 1.1, 2.0), glassMat);
  cabin.position.set(-0.2, 2.2, 0); cabin.castShadow = true; car.add(cabin);
  const nose = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.8, 2.1), bodyMat);
  nose.position.set(2.4, 0.85, 0); nose.castShadow = true; car.add(nose);
  // slanted windshield + rear window (dark glass, proud of the cabin box)
  const shield = new THREE.Mesh(new THREE.BoxGeometry(0.08, 1.05, 1.9), glassMat);
  shield.position.set(1.02, 2.2, 0); shield.rotation.z = -0.28; car.add(shield);
  const rearWin = new THREE.Mesh(new THREE.BoxGeometry(0.08, 1.05, 1.9), glassMat);
  rearWin.position.set(-1.42, 2.2, 0); rearWin.rotation.z = 0.28; car.add(rearWin);
  // side mirrors
  const mirrorMat = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.4, metalness: 0.5 });
  for (const s of [-1, 1]) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.18, 0.12), mirrorMat);
    m.position.set(0.9, 1.95, s * 1.18); car.add(m);
  }
  // door seams + handles on both flanks
  const seamMat = new THREE.MeshBasicMaterial({ color: 0x111114 });
  for (const s of [-1, 1]) {
    for (const dx of [0.7, -0.7]) {
      const seam = new THREE.Mesh(new THREE.BoxGeometry(0.06, 1.0, 0.04), seamMat);
      seam.position.set(dx, 1.05, s * 1.11); car.add(seam);
    }
    const handle = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.08, 0.05),
      new THREE.MeshStandardMaterial({ color: 0x888888, roughness: 0.3, metalness: 0.8 }));
    handle.position.set(0.35, 1.45, s * 1.12); car.add(handle);
  }
  // bumpers (chrome-dark) + license plates mounted on them
  const bumperMat = new THREE.MeshStandardMaterial({ color: 0x2a2a30, roughness: 0.35, metalness: 0.7 });
  const bf = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.3, 2.35), bumperMat);
  bf.position.set(2.82, 0.35, 0); car.add(bf);
  const br = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.3, 2.35), bumperMat);
  br.position.set(-2.32, 0.35, 0); car.add(br);
  const plateMat = new THREE.MeshBasicMaterial({ map: PLATE_TEX });
  const pf = new THREE.Mesh(new THREE.PlaneGeometry(1.0, 0.26), plateMat);
  pf.position.set(3.01, 0.35, 0); pf.rotation.y = Math.PI / 2; car.add(pf);
  const pr = new THREE.Mesh(new THREE.PlaneGeometry(1.0, 0.26), plateMat);
  pr.position.set(-2.51, 0.35, 0); pr.rotation.y = -Math.PI / 2; car.add(pr);
  // exhaust pipe at the rear
  const exhaust = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.5, 8),
    new THREE.MeshStandardMaterial({ color: 0x555560, roughness: 0.4, metalness: 0.8 }));
  exhaust.rotation.z = Math.PI / 2; exhaust.position.set(-2.4, 0.45, 0.7); car.add(exhaust);
  // front grille + bumper
  const grille = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.5, 1.6),
    new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.5, metalness: 0.6 }));
  grille.position.set(2.86, 0.8, 0); car.add(grille);
  if (sport) {
    // big wing spoiler on struts + side skirts + hood scoop
    const spoiler = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.22, 2.4), bodyMat);
    spoiler.position.set(-2.45, 2.35, 0); spoiler.castShadow = true; car.add(spoiler);
    for (const s of [-0.8, 0.8]) {
      const strut = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.5, 0.18), bodyMat);
      strut.position.set(-2.45, 2.0, s); car.add(strut);
    }
    const skirt = new THREE.Mesh(new THREE.BoxGeometry(4.6, 0.4, 2.35),
      new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.6 }));
    skirt.position.y = 0.45; car.add(skirt);
    const scoop = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.35, 0.9), bodyMat);
    scoop.position.set(1.4, 1.95, 0); car.add(scoop);
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
  const hubMat = new THREE.MeshStandardMaterial({ color: 0xb8bcc4, roughness: 0.3, metalness: 0.85 });
  for (const [wx, wz] of [[1.5, 1.05], [1.5, -1.05], [-1.5, 1.05], [-1.5, -1.05]]) {
    const w = new THREE.Mesh(wheelGeo, wheelMat);
    w.rotation.x = Math.PI / 2; w.position.set(wx, 0.62, wz); w.castShadow = true;
    // hubcap disc on the outward face (child of the wheel, spins with it)
    const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.1, 10), hubMat);
    hub.position.set(0, wz > 0 ? 0.28 : -0.28, 0);
    w.add(hub);
    car.add(w); wheels.push(w);
  }
  car.userData.wheels = wheels;
  return car;
}

export function randomCarColor(rng, sport = false) {
  return pick(rng, sport ? SPORT_COLORS : CAR_COLORS);
}

const SKINS = [0xe8b98a, 0xc98d64, 0x8a5a3a, 0xf2c9a0, 0x6b4423];
const HAIRS = [0x1a1a1a, 0x4a2f18, 0x8a6a2a, 0xd8d8d8, 0x6a1a1a, 0x2a4a6a];
const PANTS = [0x2a2a3a, 0x3a3a4a, 0x4a2f28, 0x5a5a6a, 0x2f4a3a];

// Articulated humanoid: head + hair, torso, two-part arms on shoulder pivots,
// two-part legs on hip pivots. Replaces the old round-head box-body ped.
// opts: { skin, hair, hairStyle ('cap'|'flat'|'long'|'band'), shirt, pants,
// jacket (bool: torso + arms share jacket color), role ('jax'|'crew'|'cop'|'ped') }
export function buildPed(color, opts = {}) {
  const rng = Math.random;
  const skin = opts.skin ?? SKINS[Math.floor(rng() * SKINS.length)];
  const hairC = opts.hair ?? HAIRS[Math.floor(rng() * HAIRS.length)];
  const shirtC = color;
  const pantsC = opts.pants ?? PANTS[Math.floor(rng() * PANTS.length)];
  const p = new THREE.Group();
  const skinMat = new THREE.MeshStandardMaterial({ color: skin, roughness: 0.75 });
  const shirtMat = new THREE.MeshStandardMaterial({ color: shirtC, roughness: 0.8 });
  const pantsMat = new THREE.MeshStandardMaterial({ color: pantsC, roughness: 0.85 });
  const hairMat = new THREE.MeshStandardMaterial({ color: hairC, roughness: 0.9 });
  const sleeveMat = opts.jacket
    ? new THREE.MeshStandardMaterial({ color: shirtC, roughness: 0.7 })
    : shirtMat;

  // legs: hip pivots at y 1.35
  const legs = [];
  for (const s of [-1, 1]) {
    const hip = new THREE.Group();
    hip.position.set(s * 0.28, 1.35, 0);
    const thigh = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.72, 0.46), pantsMat);
    thigh.position.y = -0.36; thigh.castShadow = true; hip.add(thigh);
    const shin = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.62, 0.42), pantsMat);
    shin.position.y = -1.0; hip.add(shin);
    const shoe = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.18, 0.62),
      new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.9 }));
    shoe.position.set(0, -1.32, 0.08); hip.add(shoe);
    p.add(hip); legs.push(hip);
  }
  // torso
  const torso = new THREE.Mesh(new THREE.BoxGeometry(1.15, 1.5, 0.62), shirtMat);
  torso.position.y = 2.1; torso.castShadow = true; p.add(torso);
  if (opts.jacket) {
    // open jacket: darker chest panel + collar
    const chest = new THREE.Mesh(new THREE.BoxGeometry(0.7, 1.1, 0.1),
      new THREE.MeshStandardMaterial({ color: 0xf0e6d2, roughness: 0.8 }));
    chest.position.set(0, 2.05, 0.33); p.add(chest);
  }
  // arms: shoulder pivots at y 2.7
  const arms = [];
  for (const s of [-1, 1]) {
    const shoulder = new THREE.Group();
    shoulder.position.set(s * 0.72, 2.72, 0);
    const upper = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.78, 0.36), sleeveMat);
    upper.position.y = -0.39; upper.castShadow = true; shoulder.add(upper);
    const fore = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.68, 0.32), skinMat);
    fore.position.y = -1.08; shoulder.add(fore);
    const hand = new THREE.Mesh(new THREE.SphereGeometry(0.17, 8, 6), skinMat);
    hand.position.y = -1.48; shoulder.add(hand);
    p.add(shoulder); arms.push(shoulder);
  }
  // head + hair + FACE (eyes, nose, mouth — must read at the new close cameras)
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.5, 12, 10), skinMat);
  head.position.y = 3.28; head.castShadow = true; p.add(head);
  // face points forward (+z): eyes + nose + mouth sit on the head surface,
  // just below the hairline (hair hemispheres end at 81° from vertical)
  const eyeMat = new THREE.MeshBasicMaterial({ color: 0x14100c });
  for (const s of [-1, 1]) {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.085, 8, 6), eyeMat);
    eye.position.set(s * 0.18, 3.34, 0.46); p.add(eye);
  }
  const nose = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.16, 0.12), skinMat);
  nose.position.set(0, 3.18, 0.5); p.add(nose);
  const mouth = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.06, 0.06),
    new THREE.MeshBasicMaterial({ color: 0x3a2020 }));
  mouth.position.set(0, 3.06, 0.46); p.add(mouth);
  // hair: styles end at 81° from vertical so the face stays visible
  const style = opts.hairStyle || ['flat', 'long', 'band', 'cap'][Math.floor(rng() * 4)];
  const capMat = new THREE.MeshStandardMaterial({ color: opts.capColor ?? hairC, roughness: 0.85 });
  if (style === 'cap') {
    const cap = new THREE.Mesh(new THREE.SphereGeometry(0.53, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.45), capMat);
    cap.position.y = 3.34; p.add(cap);
    const brim = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.08, 0.4), capMat);
    brim.position.set(0, 3.42, 0.42); p.add(brim);
  } else if (style === 'long') {
    const back = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.9, 0.3), hairMat);
    back.position.set(0, 3.0, -0.38); p.add(back);
    const top = new THREE.Mesh(new THREE.SphereGeometry(0.52, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.45), hairMat);
    top.position.y = 3.32; p.add(top);
  } else if (style === 'band') {
    const top = new THREE.Mesh(new THREE.SphereGeometry(0.52, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.45), hairMat);
    top.position.y = 3.32; p.add(top);
    const band = new THREE.Mesh(new THREE.TorusGeometry(0.5, 0.07, 6, 14),
      new THREE.MeshStandardMaterial({ color: 0x37d67a, roughness: 0.6 }));
    band.rotation.x = Math.PI / 2; band.position.y = 3.38; p.add(band);
  } else if (style === 'fringe') {
    // Jax: short dark hair with a fringe across the forehead
    const top = new THREE.Mesh(new THREE.SphereGeometry(0.52, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.45), hairMat);
    top.position.y = 3.32; p.add(top);
    const fringe = new THREE.Mesh(new THREE.BoxGeometry(0.75, 0.2, 0.14), hairMat);
    fringe.position.set(0, 3.52, 0.38); fringe.rotation.x = -0.15; p.add(fringe);
  } else {
    const top = new THREE.Mesh(new THREE.SphereGeometry(0.52, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.45), hairMat);
    top.position.y = 3.32; p.add(top);
  }
  p.userData.body = torso;
  p.userData.legs = legs;
  p.userData.arms = arms;
  p.userData.head = head;
  p.userData.pose = 'walk';
  p.userData.phase = Math.random() * Math.PI * 2;
  return p;
}

// Animate an articulated ped. phase advances with movement; pose:
// 'walk' (arms swing opposite legs), 'fear' (both arms up, fast legs),
// 'aim' (both arms forward, holding a gun), 'idle' (slight sway).
export function animatePed(mesh, dt, moving, pose = 'walk') {
  const u = mesh.userData;
  if (!u.legs || !u.arms) return;
  const t = u.phase + (moving ? dt * 9 : 0);
  u.phase = t;
  const swing = moving ? Math.sin(t) * 0.55 : 0;
  if (pose === 'fear') {
    // arms thrown up, legs pumping fast
    u.arms[0].rotation.set(0, 0, 2.6);
    u.arms[1].rotation.set(0, 0, -2.6);
    u.legs[0].rotation.x = Math.sin(t * 1.6) * 0.7;
    u.legs[1].rotation.x = -Math.sin(t * 1.6) * 0.7;
    u.head.rotation.x = -0.15;
  } else if (pose === 'aim') {
    u.arms[0].rotation.set(-1.35, 0, -0.25);
    u.arms[1].rotation.set(-1.35, 0, 0.25);
    u.legs[0].rotation.x = swing * 0.6;
    u.legs[1].rotation.x = -swing * 0.6;
    u.head.rotation.x = 0;
  } else if (pose === 'idle') {
    u.arms[0].rotation.set(Math.sin(t * 0.8) * 0.06, 0, 0.08);
    u.arms[1].rotation.set(-Math.sin(t * 0.8) * 0.06, 0, -0.08);
    u.legs[0].rotation.x = 0; u.legs[1].rotation.x = 0;
    u.head.rotation.x = 0;
  } else {
    u.arms[0].rotation.set(swing, 0, 0.08);
    u.arms[1].rotation.set(-swing, 0, -0.08);
    u.legs[0].rotation.x = -swing;
    u.legs[1].rotation.x = swing;
    u.head.rotation.x = 0;
  }
  mesh.position.y = moving ? Math.abs(Math.sin(t)) * 0.1 : 0;
}

// Jax Marlowe: red jacket, dark swept hair with a fringe, distinct from every other ped.
export function buildJax() {
  return buildPed(0xc22e2e, { skin: 0xe8b98a, hair: 0x1a1a1a, hairStyle: 'fringe', jacket: true, pants: 0x2a2a3a });
}

// Rico's crew: dark red/brown shirts, caps (Rico: red cap, crew: brown caps).
export function buildCrewMember(rico = false) {
  if (rico) return buildPed(0xe05a5a, { skin: 0xc98d64, hair: 0x1a1a1a, hairStyle: 'cap', capColor: 0xc22e2e, jacket: true, pants: 0x1a1a1a });
  return buildPed(0x8a5a3a, { skin: 0xe8b98a, hair: 0x2a2a2a, hairStyle: 'cap', capColor: 0x6a3a2a, pants: 0x2f4a3a });
}

// Solmar Bay Police officer: navy uniform + navy cap.
export function buildCopPed() {
  return buildPed(0x2248c8, { skin: 0xf2c9a0, hair: 0x1a1a1a, hairStyle: 'cap', capColor: 0x2248c8, pants: 0x1a2248 });
}

export function buildCopCar() {
  const car = buildCar(0xf2f2f2, false);
  const stripe = new THREE.Mesh(new THREE.BoxGeometry(4.5, 0.35, 2.25),
    new THREE.MeshStandardMaterial({ color: 0x2248c8, roughness: 0.5 }));
  stripe.position.y = 1.35; car.add(stripe);
  // POLICE door decals (both flanks)
  const decalMat = new THREE.MeshBasicMaterial({ map: POLICE_TEX });
  for (const s of [-1, 1]) {
    const d = new THREE.Mesh(new THREE.PlaneGeometry(1.7, 0.32), decalMat);
    d.position.set(0, 1.35, s * 1.14);
    if (s < 0) d.rotation.y = Math.PI;
    car.add(d);
  }
  // lightbar: dark base rail + red/blue domes
  const base = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.14, 1.5),
    new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.5, metalness: 0.4 }));
  base.position.set(-0.2, 2.82, 0); car.add(base);
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
