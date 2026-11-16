// Emberhorn Hunt — config.js
// One job: every tunable number, monster, quest, weapon, armor and material
// definition. All art is drawn in code; all names are original.

export const VIEW_W = 1280;
export const VIEW_H = 720;
export const ARENA = { x: 60, y: 90, w: 1160, h: 560 }; // hunt field bounds

export const SAVE_KEY = 'emberhorn-hunt-save-v1';

export const MATERIALS = {
  thorn: { name: 'Thorn Shard', color: '#8fce6e' },
  moss: { name: 'Mossy Hide', color: '#6fae5f' },
  horn: { name: 'Thornback Horn', color: '#e8d27a' },
  ember_scale: { name: 'Ember Scale', color: '#ff7a3c' },
  fire_gland: { name: 'Fire Gland', color: '#ff4d2e' },
  ember_fang: { name: 'Embermaw Fang', color: '#ffd27a' },
  gale_feather: { name: 'Gale Feather', color: '#7ad4ff' },
  storm_horn: { name: 'Stormcaller Horn', color: '#b78cff' },
  tempest_sac: { name: 'Tempest Sac', color: '#5fe8d4' },
};

// Weapons: blade tiers. dmg = base swing damage, reach in px, combo mults.
export const WEAPONS = [
  { id: 'ironfang', name: 'Ironfang Blade', tier: 1, dmg: 14, reach: 92, cost: null },
  { id: 'emberfang', name: 'Emberfang Blade', tier: 2, dmg: 20, reach: 100, cost: { ember_scale: 3, fire_gland: 2, thorn: 4 } },
  { id: 'stormfang', name: 'Stormfang Blade', tier: 3, dmg: 28, reach: 110, cost: { gale_feather: 4, storm_horn: 2, tempest_sac: 2, ember_fang: 2 } },
];

// Armors: defense reduces incoming damage, maxHp bonus.
export const ARMORS = [
  { id: 'hide', name: 'Trailhide Garb', tier: 1, def: 0, hp: 0, cost: null },
  { id: 'thornplate', name: 'Thornplate Mail', tier: 2, def: 4, hp: 25, cost: { moss: 4, thorn: 3, ember_scale: 2 } },
  { id: 'galeplate', name: 'Galeplate Mail', tier: 3, def: 8, hp: 50, cost: { gale_feather: 3, storm_horn: 1, tempest_sac: 1, moss: 4 } },
];

// Monster definitions. Attacks are shared implementations in monster.js,
// parameterized here: kind, telegraph seconds, damage, range, cooldown.
export const MONSTERS = {
  thornback: {
    id: 'thornback', name: 'Thornback', title: 'The Mossy Brute',
    color: '#6fae5f', dark: '#3e6b34', belly: '#c9d68a', accent: '#e8d27a',
    hp: 420, speed: 95, radius: 64, scale: 1,
    parts: [
      { id: 'horn', name: 'Horn', hp: 60, loot: 'horn', bonus: 1 },
      { id: 'back', name: 'Thorn Plate', hp: 70, loot: 'thorn', bonus: 2 },
      { id: 'tail', name: 'Tail', hp: 50, loot: 'moss', bonus: 2 },
    ],
    loot: [{ mat: 'thorn', n: 2 }, { mat: 'moss', n: 2 }, { mat: 'horn', n: 1 }],
    attacks: [
      { kind: 'charge', dmg: 22, tele: 0.9, range: 520, cd: 4.5 },
      { kind: 'slam', dmg: 26, tele: 1.0, range: 200, cd: 5.5 },
    ],
    enrageAt: 0.4,
  },
  embermaw: {
    id: 'embermaw', name: 'Embermaw', title: 'The Cinder Lizard',
    color: '#c65a2e', dark: '#7a2f16', belly: '#ffb35c', accent: '#ff4d2e',
    hp: 680, speed: 110, radius: 70, scale: 1.1,
    parts: [
      { id: 'fang', name: 'Fang', hp: 80, loot: 'ember_fang', bonus: 1 },
      { id: 'belly', name: 'Belly Scale', hp: 90, loot: 'ember_scale', bonus: 2 },
      { id: 'tail', name: 'Tail', hp: 70, loot: 'fire_gland', bonus: 1 },
    ],
    loot: [{ mat: 'ember_scale', n: 2 }, { mat: 'fire_gland', n: 1 }, { mat: 'ember_fang', n: 1 }],
    attacks: [
      { kind: 'breath', dmg: 18, tele: 1.0, range: 380, cd: 5.0 },
      { kind: 'leap', dmg: 30, tele: 1.1, range: 460, cd: 6.5 },
      { kind: 'swipe', dmg: 20, tele: 0.7, range: 220, cd: 3.5 },
    ],
    enrageAt: 0.4,
  },
  galehorn: {
    id: 'galehorn', name: 'Galehorn', title: 'The Storm Wyvern',
    color: '#5a6fd4', dark: '#2e3a7a', belly: '#bcd4ff', accent: '#b78cff',
    hp: 980, speed: 130, radius: 78, scale: 1.25,
    parts: [
      { id: 'horn', name: 'Storm Horn', hp: 110, loot: 'storm_horn', bonus: 1 },
      { id: 'wing', name: 'Wing', hp: 100, loot: 'gale_feather', bonus: 2 },
      { id: 'tail', name: 'Tail', hp: 90, loot: 'tempest_sac', bonus: 1 },
    ],
    loot: [{ mat: 'gale_feather', n: 2 }, { mat: 'tempest_sac', n: 1 }, { mat: 'storm_horn', n: 1 }],
    attacks: [
      { kind: 'dive', dmg: 34, tele: 1.2, range: 600, cd: 7.0 },
      { kind: 'gust', dmg: 14, tele: 0.8, range: 520, cd: 4.0 },
      { kind: 'screech', dmg: 12, tele: 0.9, range: 300, cd: 5.0 },
    ],
    enrageAt: 0.4,
  },
};

export const QUESTS = [
  {
    id: 'q1', monster: 'thornback', name: 'Hunt the Thornback',
    desc: 'A thorn-covered brute is trampling the Cinderhold farms. Drive it off — for good.',
    time: 300, unlock: 0, reward: 'Unlocks the Emberfang Blade at the smithy.',
  },
  {
    id: 'q2', monster: 'embermaw', name: 'Hunt the Embermaw',
    desc: 'A fire-lizard nests in the ash fields, and its breath has set the granary alight twice.',
    time: 300, unlock: 1, reward: 'Embermaw parts unlock the Stormfang Blade.',
  },
  {
    id: 'q3', monster: 'galehorn', name: 'Hunt the Galehorn',
    desc: 'The storm wyvern circles the peak, calling down lightning. Only a master hunter returns.',
    time: 360, unlock: 2, reward: 'Slay the Galehorn and Cinderhold is safe.',
  },
];

// Player tuning
export const PLAYER = {
  radius: 18,
  speed: 265,
  dodgeSpeed: 620,
  dodgeTime: 0.22,
  dodgeCost: 22,
  dodgeCd: 0.55,
  swingCost: 10,
  swingTime: 0.28,
  swingArc: 1.9, // radians, centered on aim
  comboWindow: 0.55,
  comboMult: [1, 1.15, 1.45],
  maxHp: 100,
  stamina: 100,
  staminaRegen: 30,
  potionHeal: 45,
  potions: 3,
  iframes: 0.55, // seconds after taking a hit
};

export function rankFor(secondsLeft, totalTime, damageTaken, partsBroken, faints) {
  let score = 100;
  score += (secondsLeft / totalTime) * 40; // fast hunts score more
  score -= damageTaken * 0.12;
  score -= faints * 15;
  score += partsBroken * 8;
  if (score >= 115) return 'S';
  if (score >= 95) return 'A';
  if (score >= 75) return 'B';
  return 'C';
}
