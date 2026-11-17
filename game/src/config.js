// Solmar Bay — configuration, palette, mission data. No Rockstar/GTA names, art or music.
export const CFG = {
  VIEW_W: 1280,
  VIEW_H: 720,
  WORLD_W: 3200,
  WORLD_H: 2400,
  ROAD_W: 92,
  BLOCK: 400,
  BEACH_X: 2880,
  WATER_X: 3060,
  PLAYER_SPEED: 190,
  PLAYER_HP: 100,
  CAR_ACCEL: 340,
  CAR_BRAKE: 520,
  CAR_MAX: 470,
  CAR_MAX_SPORT: 540,
  CAR_REVERSE: 170,
  CAR_TURN: 2.6,
  BULLET_SPEED: 780,
  FIRE_RATE: 0.18,
  PUNCH_RANGE: 46,
  PUNCH_DMG: 22,
  SHOT_DMG: 34,
  COP_MAX_CARS: 3,
  COP_MAX_FOOT: 6,
  SAVE_KEY: 'solmar-bay-save-v1',
};

export const PAL = {
  grass: '#8aa860',
  grass2: '#7d9c55',
  sand: '#e9cf8f',
  sandWet: '#dfc07a',
  water: '#2ea8c4',
  waterDeep: '#1d7f9e',
  asphalt: '#3d3d47',
  asphalt2: '#36363f',
  lane: '#d9d9c9',
  sidewalk: '#b7b0a0',
  curb: '#9a927f',
  buildingShadow: 'rgba(0,0,0,0.28)',
  buildings: ['#e07856', '#5fb8a6', '#e8b64c', '#c97b9b', '#7a9cc6', '#f0e6d2', '#d95f4b', '#4fae8f'],
  park: '#5d8a48',
  parkTree: '#3f6b32',
  player: '#37d67a',
  police: '#2f6df6',
  copCar: '#2248c8',
  ped: ['#f2c14e', '#e26d5a', '#7fb069', '#c77dff', '#f4845f', '#5ec4d6'],
  marker: '#ffd23f',
  bullet: '#ffe066',
  smoke: 'rgba(120,120,120,0.55)',
  hudBg: 'rgba(10,10,16,0.62)',
  hudText: '#ffffff',
  star: '#ffd23f',
  starEmpty: 'rgba(255,255,255,0.28)',
};

export const MISSIONS = [
  {
    name: 'The Borrow',
    giver: 'Mara (fixer)',
    briefing: 'Jax, I need wheels and I need them now. Borrow any car you can find and bring it to the Riverside marker.',
    reward: 200,
    dialog: [
      ['Mara', 'Jax, I need wheels. Any car. Bring it to Riverside.'],
      ['Jax', 'Borrow. Right. Nobody has to know.'],
    ],
  },
  {
    name: 'Package Run',
    giver: 'Mara (fixer)',
    briefing: 'A package is waiting at the old docks. Grab it, then shake the heat and get it to the safe house. Do not get caught holding it.',
    reward: 400,
    dialog: [
      ['Mara', 'Package at the docks. Grab it and vanish.'],
      ['Jax', 'And if the law shows up?'],
      ['Mara', 'Then drive like the sun is chasing you.'],
    ],
  },
  {
    name: 'Getaway',
    giver: 'Mara (fixer)',
    briefing: 'The job went loud. The whole bay is looking for you. Reach the hideout in 90 seconds — with two stars already on your tail.',
    reward: 600,
    dialog: [
      ['Mara', 'Ninety seconds to the hideout. The whole bay is awake.'],
      ['Jax', 'Then I better not stop for anything.'],
    ],
  },
  {
    name: 'Cold Chain',
    giver: 'Mara (fixer)',
    briefing: 'Mara has cargo that cannot wait. Pick it up at the Old Docks and run it to Sunset Beach before the ice melts — 90 seconds.',
    reward: 500,
    dialog: [
      ['Mara', 'The cargo is ice-cold and the clock is ticking.'],
      ['Jax', 'Ninety seconds. I can do ninety seconds.'],
    ],
  },
  {
    name: 'Hot Plates',
    giver: 'Benny (garage)',
    briefing: "Benny needs a sports car with clean plates. Steal a sports car and bring it to Benny's Garage.",
    reward: 700,
    dialog: [
      ['Benny', 'Bring me a sports car, Jax. A fast one.'],
      ['Jax', 'Sports car. Benny\u2019s Garage. Got it.'],
    ],
  },
  {
    name: 'Night Shift',
    giver: 'Mara (fixer)',
    briefing: 'Three stashes are hidden around the bay. Collect them all after dark — and stay quiet.',
    reward: 800,
    dialog: [
      ['Mara', 'Three stashes, one night. No noise.'],
      ['Jax', 'Quiet as the tide.'],
    ],
  },
  {
    name: 'The Last Bridge',
    giver: 'Mara (fixer)',
    briefing: 'Four stars and the whole bay behind you. Lose the heat and cross Sunset Bridge — 90 seconds.',
    reward: 1000,
    dialog: [
      ['Mara', 'Four stars, Jax. Cross the bridge and vanish.'],
      ['Jax', 'If the bridge is open, I am gone.'],
    ],
  },
  {
    name: 'Showdown at the Docks',
    giver: 'Mara (fixer)',
    briefing: "Rico's crew is waiting at the docks, and Rico himself. Take them all down and Solmar Bay is yours.",
    reward: 1500,
    dialog: [
      ['Mara', "Rico's crew owns the docks. End it tonight."],
      ['Jax', 'Tonight the docks change owners.'],
    ],
  },
];

// Benny's Garage upgrades: each level costs the next price in the list.
export const UPGRADES = {
  engine: { name: 'Engine Mk II', desc: '+12% top speed & accel per level', prices: [500, 800, 1200], max: 3 },
  armor: { name: 'Armor Plating', desc: '+50 max car HP, -20% damage per level', prices: [400, 700, 1000], max: 3 },
  service: { name: 'Full Service', desc: 'Repair your car to full health', prices: [250], max: 1 },
};

export const RADIO_STATIONS = ['SOLMAR FM 98.4', 'BAY FM 101.2', 'SUNSET 87.9'];

export const CAR_KINDS = {
  sedan: { color: '#c94f43', max: 440, accel: 320 },
  taxi: { color: '#f2c230', max: 450, accel: 330 },
  sport: { color: '#3fa7d6', max: 540, accel: 380 },
  pickup: { color: '#7a9a5b', max: 420, accel: 300 },
  police: { color: '#2248c8', max: 500, accel: 400 },
  van: { color: '#e8e3d8', max: 380, accel: 270 },
};
