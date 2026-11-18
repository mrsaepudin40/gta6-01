// Solmar Bay 3D — REBUILD. Shared config: world, palette, missions, districts,
// markers, radio, garage upgrades, characters. Original game, no Rockstar/GTA content.

export const CFG = {
  WORLD_W: 3200,
  WORLD_H: 2400,
  WORLD_SEED: 1337,
  ROAD_W: 40,
  SAVE_KEY: 'solmar-bay-3d-save-v2',
  PLAYER_HP: 100,
  PLAYER_SPEED: 9,
  PUNCH_DMG: 25,
  PUNCH_RANGE: 6,
  SHOT_DMG: 34,
  BULLET_RANGE: 120,
  CAR_ACCEL: 22,
  CAR_BRAKE: 40,
  CAR_MAX: 34,
  CAR_MAX_SPORT: 50,
  CAR_REVERSE: 12,
  CAR_TURN: 2.2,
  COP_MAX_CARS: 4,
  COP_MAX_FOOT: 4,
};

export const PAL = {
  asphalt: 0x4b4753,
  grass: 0x7fae62,
  sand: 0xe9cd8f,
  sidewalk: 0xbfae90,
  water: 0x2f7fc0,
  roof: 0x8a5a4a,
  ped: [0xe05a5a, 0x5a8de0, 0x5ad08a, 0xe0c95a, 0x9a6ad0, 0xe08a3c, 0x54c8d0, 0xd06a9a],
};

export const MISSIONS = [
  {
    name: 'The Borrow',
    reward: 250,
    briefing: 'Steal any car on the street and bring it to Riverside.',
    dialog: [['Mara', 'Borrow a car, any car. Don\'t scratch it. Much.']],
  },
  {
    name: 'Package Run',
    reward: 400,
    briefing: 'Grab the package at the Old Docks, then lose the cops at the Safe House.',
    dialog: [['Mara', 'Package is at the docks. The cops will notice — be quick.']],
  },
  {
    name: 'Getaway',
    reward: 600,
    briefing: 'Reach the Hideout in 90 seconds with the law on your tail.',
    dialog: [['Mara', 'Two stars already, Jax. Ninety seconds to the Hideout. Go.']],
  },
  {
    name: 'Cold Chain',
    reward: 500,
    briefing: 'Haul the frozen cargo from the docks to Sunset Beach before the ice melts — 90 seconds.',
    dialog: [['Mara', 'Frozen cargo, hot sun. Ninety seconds to the beach.']],
  },
  {
    name: 'Hot Plates',
    reward: 700,
    briefing: 'Steal a sports car and deliver it to Benny\'s Garage.',
    dialog: [['Benny', 'Bring me a sports car, Jax. A fast one.']],
  },
  {
    name: 'Night Shift',
    reward: 800,
    briefing: 'Collect 3 stashes across the city. Stay quiet, stay dark.',
    dialog: [['Mara', 'Three stashes, one night. No noise.']],
  },
  {
    name: 'The Last Bridge',
    reward: 1000,
    briefing: 'Four stars on your tail — cross Sunset Bridge and vanish. 90 seconds.',
    dialog: [['Mara', 'Four stars, Jax. Cross the bridge and vanish.']],
  },
  {
    name: 'Showdown at the Docks',
    reward: 1500,
    briefing: 'Rico\'s crew is waiting at the docks. Finish it.',
    dialog: [
      ['Rico', 'Jax Marlowe. You should have stayed away from my docks.'],
      ['Mara', 'Take them all down — crew and Rico both.'],
    ],
  },
];

export const MARKERS = {
  riverside: { x: 1200, z: 800 },
  docks: { x: -1400, z: -800 },
  safehouse: { x: -400, z: 800 },
  hideout: { x: 400, z: -800 },
  beach: { x: 1480, z: 0 },
  garage: { x: -800, z: 800 },
  bridge: { x: 1350, z: -800 },
};

export const DISTRICTS = [
  { name: 'NORTHSIDE', x0: -1600, z0: -1200, x1: 1600, z1: -800, blurb: 'Quiet streets, loud secrets.' },
  { name: 'OLD DOCKS', x0: -1600, z0: -800, x1: -800, z1: 1200, blurb: 'Rico runs the crates here. Careful.' },
  { name: 'DOWNTOWN', x0: -800, z0: -800, x1: 800, z1: 400, blurb: 'Neon, noise, and nowhere to hide.' },
  { name: "BENNY'S ROW", x0: -800, z0: 400, x1: 400, z1: 1200, blurb: 'Benny fixes cars. And problems.' },
  { name: 'RIVERSIDE', x0: 400, z0: -800, x1: 1400, z1: 1200, blurb: 'Money lives east of the river road.' },
  { name: 'SUNSET BEACH', x0: 1400, z0: -1200, x1: 1600, z1: 1200, blurb: 'Sun, sand, and a perfect getaway.' },
];

export const RADIO = ['SOLMAR FM 98.4', 'BAY FM 101.2', 'SUNSET 87.9'];
export const RADIO_TRACKS = [
  'Sunset Static — The Bay Riders',
  'Neon Tide — Marina Lights',
  'Golden Hour — Jax & The Palms',
];

// stage totals per mission (for the mission stage bar)
export const STAGE_TOTALS = [2, 2, 1, 2, 1, 3, 1, 2];

export const REP_RANKS = [
  'NOBODY', 'SMALL TIME', 'STREET KID', 'KNOWN DRIVER',
  'BAY HUSTLER', 'BIG SHOT', 'KINGPIN', 'LEGEND', 'KING OF THE BAY',
];

// Solmar Bay Police unit callsigns (own names, not copied from any entry)
export const COP_UNITS = ['SBP-11', 'SBP-24', 'SBP-37', 'SBP-52', 'AIR-1'];

export const GARAGE_UPGRADES = [
  { id: 'engine', name: 'Engine Mk II', desc: '+12% top speed & acceleration per level', prices: [500, 800, 1200], max: 3 },
  { id: 'armor', name: 'Armor Plating', desc: '+50 max car HP, −20% damage taken', prices: [400, 700, 1000], max: 3 },
  { id: 'service', name: 'Full Service', desc: 'Full repair — car and driver, good as new', prices: [250], max: 1 },
];

export const CHARACTERS = [
  { short: 'Jax', init: 'JM', color: '#ff5a5a', role: 'Wheelman', name: 'Jax Marlowe' },
  { short: 'Mara', init: 'M', color: '#7dff8a', role: 'Handler', name: 'Mara' },
  { short: 'Rico', init: 'R', color: '#e05a5a', role: 'Dock Boss', name: 'Rico' },
  { short: 'Benny', init: 'B', color: '#ff9a3c', role: 'Garage', name: 'Benny' },
  { short: 'Vera', init: 'V', color: '#54e0ff', role: 'Informant', name: 'Vera' },
  { short: 'Otto', init: 'O', color: '#c9a86a', role: 'Fence', name: 'Otto' },
];
