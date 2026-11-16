// Emberhorn Hunt — shots.js
// One job: deterministic staged scenes for screenshots. `?shot=hunt|hub|
// carve|win&seed=N` freezes the world in a readable state and the main loop
// renders it without advancing time, so the same seed always yields the
// same pixels. Nothing here is reachable from normal play.

import { MONSTERS, QUESTS, WEAPONS, ARMORS, MATERIALS } from './config.js';
import { mulberry32, range } from './random.js';

function seedWorld(world, seed) {
  world.rng = mulberry32(seed);
  world.particles = [];
  world.floaters = [];
  world.orbs = [];
  world.banners = [];
  world.shakeT = 0;
  world.shakeMag = 0;
  world.paused = false;
}

export function applyShot(world, name, seed) {
  seedWorld(world, seed || 7);
  if (name === 'hub') {
    // A lived-in village: one quest cleared, materials in the pouch.
    world.save.materials = { thorn: 6, moss: 4, horn: 1, ember_scale: 2 };
    world.save.best = { q1: 'A' };
    world.save.unlocked = 2;
    world.save.hunts = 3;
    world.save.weapon = 0;
    world.save.armor = 0;
    world.screen = 'hub';
    world.hubTab = 'quests';
    world.storeSave();
    return;
  }

  if (name === 'hunt') {
    // Mid-fight against the Embermaw: breath attack telegraphed, hunter
    // closing in, one part already broken, embers in the air.
    world.startQuest(1);
    seedWorld(world, seed || 7);
    const m = world.monster;
    const p = world.player;
    p.x = 470; p.y = 480;
    p.hp = 78; p.stamina = 62; p.potions = 2;
    p.facing = Math.atan2(m.y - p.y, m.x - p.x);
    m.x = 780; m.y = 300;
    m.hp = Math.round(m.maxHp * 0.55);
    m.facing = Math.atan2(p.y - m.y, p.x - m.x);
    m.parts[0].hp = 0; m.parts[0].broken = true;
    world.partsBroken = 1;
    m.attack = m.def.attacks.find((a) => a.kind === 'breath');
    m.attackData = { tx: p.x, ty: p.y, dir: m.facing, fromX: m.x, fromY: m.y };
    m.state = 'telegraph';
    m.stateT = 0.55;
    world.timer = 231;
    world.huntTime = 69;
    world.damageTaken = 34;
    for (let i = 0; i < 14; i++) {
      world.particles.push({
        x: range(world.rng, 600, 900), y: range(world.rng, 220, 420),
        vx: range(world.rng, -20, 20), vy: range(world.rng, -60, -10),
        life: 0.5, maxLife: 0.5, color: ['#ff7a3c', '#ffb35c', '#ff4d2e'][i % 3],
        size: range(world.rng, 3, 6), grav: 0,
      });
    }
    world.floaters.push({ x: m.x, y: m.y + m.radius + 44, text: 'FANG BROKEN!', color: '#7dff9a', life: 1.1 });
    return;
  }

  if (name === 'carve') {
    // The Thornback is down; the hunter kneels at the carcass, carve bar half full.
    world.startQuest(0);
    seedWorld(world, seed || 7);
    const m = world.monster;
    const p = world.player;
    m.hp = 0;
    m.state = 'dead';
    m.x = 640; m.y = 330;
    p.x = 560; p.y = 430;
    p.facing = Math.atan2(m.y - p.y, m.x - p.x);
    p.hp = 64;
    world.screen = 'carve';
    world.carveT = 1.1;
    world.timer = 142;
    world.damageTaken = 36;
    world.partsBroken = 2;
    m.parts[0].broken = true;
    m.parts[1].broken = true;
    world.burst(m.x, m.y, 12, '#ffd27a', 90);
    return;
  }

  if (name === 'win') {
    // Quest complete: Rank S, carve loot listed, next quest unlocked.
    world.startQuest(0);
    seedWorld(world, seed || 7);
    const m = world.monster;
    m.hp = 0;
    m.state = 'dead';
    m.x = 640; m.y = 330;
    world.results = {
      rank: 'S',
      loot: [
        { mat: 'thorn', n: 3 },
        { mat: 'moss', n: 2 },
        { mat: 'horn', n: 2 },
      ],
      timeUsed: 187, damageTaken: 34, partsBroken: 2, faints: 0,
    };
    world.screen = 'results';
    world.save.best = { q1: 'S' };
    world.save.unlocked = 2;
    world.save.materials = { thorn: 3, moss: 2, horn: 2 };
    return;
  }

  // Unknown shot name: fall back to the hub.
  world.screen = 'hub';
  world.hubTab = 'quests';
}
