// Solmar Bay 3D — configuration, palette, mission data. Original story, no Rockstar/GTA content.
export const CFG = {
  VIEW_W: 1280,
  VIEW_H: 720,
  WORLD_W: 3200, // x: -1600..1600
  WORLD_H: 2400, // z: -1200..1200
  ROAD_W: 92,
  BLOCK: 400,
  BEACH_X: 1400,
  WATER_X: 1560,
  PLAYER_SPEED: 6.5,
  PLAYER_HP: 100,
  CAR_ACCEL: 26,
  CAR_BRAKE: 46,
  CAR_MAX: 42,
  CAR_MAX_SPORT: 50,
  CAR_REVERSE: 14,
  CAR_TURN: 1.9,
  BULLET_RANGE: 70,
  FIRE_RATE: 0.18,
  PUNCH_RANGE: 2.6,
  PUNCH_DMG: 22,
  SHOT_DMG: 34,
  COP_MAX_CARS: 3,
  COP_MAX_FOOT: 4,
  SAVE_KEY: 'solmar-bay-3d-save-v1',
  WORLD_SEED: 1337,
};

export const PAL = {
  grass: 0x95c468,
  grass2: 0x7fb85a,
  sand: 0xf0d698,
  water: 0x35b6dd,
  waterDeep: 0x1d8fb8,
  asphalt: 0x55565f,
  buildings: [0xe07856, 0x5fb8a6, 0xe8b64c, 0xc97b9b, 0x7a9cc6, 0xf0e6d2, 0xd95f4b, 0x4fae8f],
  roof: 0x6b5f4c,
  player: 0x37d67a,
  police: 0x2f6df6,
  copCar: 0x2248c8,
  ped: [0xf2c14e, 0xe26d5a, 0x7fb069, 0xc77dff, 0xf4845f, 0x5ec4d6],
  marker: 0xffd23f,
  sun: 0xffc27a,
  skyDay: 0x9fd8f2,
  skyNight: 0x0b1026,
  fogDay: 0xf6cf9e,
  fogNight: 0x0d1428,
};

export const MISSIONS = [
  { name: 'The Borrow', giver: 'Mara', reward: 200,
    briefing: 'Jax, I need wheels and I need them now. Borrow any car you can find and bring it to the Riverside marker.',
    dialog: [['Mara', 'Jax, I need wheels. Any car. Bring it to Riverside.'], ['Jax', 'Borrow. Right. Nobody has to know.']] },
  { name: 'Package Run', giver: 'Mara', reward: 400,
    briefing: 'A package is waiting at the old docks. Grab it, then shake the heat and get it to the safe house.',
    dialog: [['Mara', 'Package at the docks. Grab it and vanish.'], ['Jax', 'And if the law shows up?'], ['Mara', 'Then drive like the sun is chasing you.']] },
  { name: 'Getaway', giver: 'Mara', reward: 600,
    briefing: 'The job went loud. Reach the hideout in 90 seconds — with two stars already on your tail.',
    dialog: [['Mara', 'Ninety seconds to the hideout. The whole bay is awake.'], ['Jax', 'Then I better not stop for anything.']] },
  { name: 'Cold Chain', giver: 'Mara', reward: 500,
    briefing: 'Mara has cargo that cannot wait. Pick it up at the Old Docks and run it to Sunset Beach before the ice melts — 90 seconds.',
    dialog: [['Mara', 'The cargo is ice-cold and the clock is ticking.'], ['Jax', 'Ninety seconds. I can do ninety seconds.']] },
  { name: 'Hot Plates', giver: 'Benny', reward: 700,
    briefing: "Benny needs a sports car with clean plates. Steal a sports car and bring it to Benny's Garage.",
    dialog: [['Benny', 'Bring me a sports car, Jax. A fast one.'], ['Jax', 'Sports car. Benny’s Garage. Got it.']] },
  { name: 'Night Shift', giver: 'Mara', reward: 800,
    briefing: 'Three stashes are hidden around the bay. Collect them all after dark — and stay quiet.',
    dialog: [['Mara', 'Three stashes, one night. No noise.'], ['Jax', 'Quiet as the tide.']] },
  { name: 'The Last Bridge', giver: 'Mara', reward: 1000,
    briefing: 'Four stars and the whole bay behind you. Lose the heat and cross Sunset Bridge — 90 seconds.',
    dialog: [['Mara', 'Four stars, Jax. Cross the bridge and vanish.'], ['Jax', 'If the bridge is open, I am gone.']] },
  { name: 'Showdown at the Docks', giver: 'Mara', reward: 1500,
    briefing: "Rico's crew is waiting at the docks, and Rico himself. Take them all down and Solmar Bay is yours.",
    dialog: [['Mara', "Rico's crew owns the docks. End it tonight."], ['Jax', 'Tonight the docks change owners.']] },
];

export const RADIO = ['SOLMAR FM 98.4', 'BAY FM 101.2', 'SUNSET 87.9'];

export const GARAGE_UPGRADES = [
  { id: 'engine', name: 'Engine Mk II', desc: '+12% top speed & accel per level', prices: [500, 800, 1200], max: 3 },
  { id: 'armor', name: 'Armor Plating', desc: '+50 max car HP, -20% damage per level', prices: [400, 700, 1000], max: 3 },
  { id: 'service', name: 'Full Service', desc: 'Bring a car in for a service', prices: [250], max: 1 },
];
