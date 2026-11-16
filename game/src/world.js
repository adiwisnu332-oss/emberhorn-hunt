// Emberhorn Hunt — world.js
// One job: the game itself. Screen state machine (hub → hunt → carve →
// results/failed), quests, carving loot, smithy crafting, save/load, and all
// transient effects (particles, floaters, projectiles, banners, shake).

import { ARENA, MATERIALS, MONSTERS, PLAYER, QUESTS, WEAPONS, ARMORS, rankFor } from './config.js';
import { mulberry32, clamp, range, pick } from './random.js';
import { Player, inSwingArc } from './player.js';
import { Monster } from './monster.js';

const DEFAULT_SAVE = () => ({ materials: {}, weapon: 0, armor: 0, unlocked: 1, best: {}, hunts: 0 });

export class World {
  constructor(canvas, input, audio, saveKey) {
    this.canvas = canvas;
    this.input = input;
    this.audio = audio;
    this.saveKey = saveKey;
    this.arena = ARENA;
    this.rng = mulberry32((Date.now() ^ 0x9e3779b9) >>> 0);
    this.save = this.loadSave();
    this.screen = 'hub'; // hub, hunt, carve, results, failed
    this.hubTab = 'quests'; // quests | smithy
    this.player = null;
    this.monster = null;
    this.quest = null;
    this.questIdx = 0;
    this.timer = 0;
    this.faints = 0;
    this.damageTaken = 0;
    this.partsBroken = 0;
    this.particles = [];
    this.floaters = [];
    this.orbs = [];
    this.banners = [];
    this.shakeT = 0;
    this.shakeMag = 0;
    this.paused = false;
    this.carveT = 0;
    this.carveDone = false;
    this.loot = [];
    this.results = null;
    this.buttons = [];
    this.bannerT = 0;
    this.huntTime = 0;
    this.respawnT = 0;
    this.audio.startMusic('hub');
  }

  // ---------- save ----------
  loadSave() {
    try {
      const raw = localStorage.getItem(this.saveKey);
      if (!raw) return DEFAULT_SAVE();
      const s = JSON.parse(raw);
      return { ...DEFAULT_SAVE(), ...s, materials: { ...(s.materials || {}) } };
    } catch (e) { return DEFAULT_SAVE(); }
  }

  storeSave() {
    try { localStorage.setItem(this.saveKey, JSON.stringify(this.save)); } catch (e) { /* private mode */ }
  }

  matCount(id) { return this.save.materials[id] || 0; }

  // ---------- quests ----------
  startQuest(idx) {
    const q = QUESTS[idx];
    this.questIdx = idx;
    this.quest = q;
    const def = MONSTERS[q.monster];
    this.player = new Player(ARENA.x + ARENA.w / 2, ARENA.y + ARENA.h - 90, WEAPONS[this.save.weapon], ARMORS[this.save.armor]);
    this.monster = new Monster(def, ARENA.x + ARENA.w / 2, ARENA.y + 170, this.rng);
    this.timer = q.time;
    this.huntTime = 0;
    this.faints = 0;
    this.damageTaken = 0;
    this.partsBroken = 0;
    this.particles = []; this.floaters = []; this.orbs = [];
    this.paused = false;
    this.carveT = 0; this.carveDone = false; this.loot = [];
    this.screen = 'hunt';
    this.audio.ensure();
    this.audio.startMusic('hunt');
    this.audio.questStart();
    this.banner(`${q.name.toUpperCase()} — HUNT!`, '#ffd27a');
  }

  // ---------- effects ----------
  sfx(name) { if (this.audio[name]) this.audio[name](); }
  shake(mag) { this.shakeMag = Math.max(this.shakeMag, mag); this.shakeT = 0.35; }
  banner(text, color) { this.banners.push({ text, color: color || '#fff', t: 0 }); }
  burst(x, y, n, color, speed) {
    for (let i = 0; i < n; i++) {
      const a = this.rng() * Math.PI * 2, sp = range(this.rng, 30, speed || 140);
      this.particles.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: range(this.rng, 0.25, 0.6), maxLife: 0.6, color, size: range(this.rng, 2, 5), grav: 220 });
    }
  }
  dust(x, y, n) {
    for (let i = 0; i < n; i++) {
      this.particles.push({ x: x + range(this.rng, -30, 30), y: y + range(this.rng, -10, 20), vx: range(this.rng, -30, 30), vy: range(this.rng, -50, -10), life: range(this.rng, 0.3, 0.7), maxLife: 0.7, color: '#9a8a6a', size: range(this.rng, 3, 7), grav: -40 });
    }
  }
  emberParticle(x, y, dir) {
    this.particles.push({ x, y, vx: Math.cos(dir) * range(this.rng, 180, 320) + range(this.rng, -30, 30), vy: Math.sin(dir) * range(this.rng, 180, 320) + range(this.rng, -30, 30), life: range(this.rng, 0.2, 0.45), maxLife: 0.45, color: pick(this.rng, ['#ff7a3c', '#ffb35c', '#ff4d2e']), size: range(this.rng, 3, 6), grav: 0 });
  }
  floater(x, y, text, color) { this.floaters.push({ x, y, text, color, life: 1.1 }); }
  spawnOrb(x, y, dir, speed, dmg, color) {
    this.orbs.push({ x, y, vx: Math.cos(dir) * speed, vy: Math.sin(dir) * speed, r: 12, dmg, life: 2.2, color });
  }
  knockPlayer(fromX, fromY, force) {
    const dx = this.player.x - fromX, dy = this.player.y - fromY;
    const d = Math.hypot(dx, dy) || 1;
    this.player.x += (dx / d) * force * 0.12;
    this.player.y += (dy / d) * force * 0.12;
  }

  // ---------- combat hooks (called by player / monster) ----------
  tryPlayerHit(player) {
    const m = this.monster;
    if (!m || !m.alive || this.screen !== 'hunt') return;
    const dmg = Math.round(player.weapon.dmg * PLAYER.comboMult[player.swingIndex]);
    if (inSwingArc(player, m.x, m.y, m.radius)) {
      const fromAngle = Math.atan2(player.y - m.y, player.x - m.x);
      m.takeHit(dmg, fromAngle, this);
      this.sfx('hit');
      this.burst(m.x, m.y, 10, '#ffe9a8', 160);
      // Swing sparks at the contact point.
      const tip = player.swingTip();
      this.burst(tip.x, tip.y, 6, '#ffffff', 120);
    }
  }

  aoeHit(x, y, r, dmg, src) {
    const p = this.player;
    if (!p || !p.alive) return;
    if (Math.hypot(p.x - x, p.y - y) < r + PLAYER.radius) p.takeDamage(dmg, this);
  }

  onPlayerHurt(amount) { this.damageTaken += amount; }

  onPartBroken(part) {
    this.partsBroken++;
    this.sfx('partBreak');
    this.banner(`${part.name.toUpperCase()} BROKEN!`, '#7dff9a');
    this.floater(this.monster.x, this.monster.y - this.monster.radius - 44, `${part.name} broken!`, '#7dff9a');
    this.burst(this.monster.x, this.monster.y, 18, '#e8d27a', 190);
  }

  onMonsterDead() {
    this.screen = 'carve';
    this.carveT = 0;
    this.carveDone = false;
    this.audio.stopMusic();
    this.audio.questWin();
    this.banner('MONSTER SLAIN — CARVE IT!', '#ffd27a');
    this.burst(this.monster.x, this.monster.y, 30, '#ffd27a', 200);
  }

  // ---------- carving ----------
  rollLoot() {
    const def = this.monster.def;
    const loot = [];
    for (const l of def.loot) loot.push({ mat: l.mat, n: l.n });
    for (const p of this.monster.parts) {
      if (p.broken) loot.push({ mat: p.loot, n: p.bonus });
    }
    loot.push({ mat: pick(this.rng, def.loot).mat, n: 1 });
    // Merge duplicates.
    const merged = {};
    for (const l of loot) merged[l.mat] = (merged[l.mat] || 0) + l.n;
    return Object.entries(merged).map(([mat, n]) => ({ mat, n }));
  }

  finishCarve() {
    this.loot = this.rollLoot();
    for (const l of this.loot) this.save.materials[l.mat] = (this.save.materials[l.mat] || 0) + l.n;
    this.save.hunts++;
    const secondsLeft = Math.max(0, this.timer);
    const rank = rankFor(secondsLeft, this.quest.time, this.damageTaken, this.partsBroken, this.faints);
    const prev = this.save.best[this.quest.id];
    const order = { S: 4, A: 3, B: 2, C: 1 };
    if (!prev || order[rank] > order[prev]) this.save.best[this.quest.id] = rank;
    if (this.questIdx + 1 < QUESTS.length) this.save.unlocked = Math.max(this.save.unlocked, this.questIdx + 2);
    this.storeSave();
    this.results = { rank, loot: this.loot, timeUsed: this.quest.time - secondsLeft, damageTaken: this.damageTaken, partsBroken: this.partsBroken, faints: this.faints };
    this.screen = 'results';
    this.audio.startMusic('hub');
  }

  failQuest(reason) {
    this.results = { rank: '—', failed: true, reason, loot: [], timeUsed: this.quest.time - Math.max(0, this.timer), damageTaken: this.damageTaken, partsBroken: this.partsBroken, faints: this.faints };
    this.screen = 'failed';
    this.audio.stopMusic();
    this.audio.questFail();
  }

  // ---------- crafting ----------
  canCraft(kind, idx) {
    const list = kind === 'weapon' ? WEAPONS : ARMORS;
    const item = list[idx];
    if (!item || !item.cost) return false;
    return Object.entries(item.cost).every(([m, n]) => this.matCount(m) >= n);
  }

  craft(kind, idx) {
    if (!this.canCraft(kind, idx)) return false;
    const list = kind === 'weapon' ? WEAPONS : ARMORS;
    const item = list[idx];
    for (const [m, n] of Object.entries(item.cost)) this.save.materials[m] -= n;
    if (kind === 'weapon') this.save.weapon = idx; else this.save.armor = idx;
    this.storeSave();
    this.sfx('carve');
    this.banner(`${item.name.toUpperCase()} FORGED!`, '#7dff9a');
    return true;
  }

  // ---------- update ----------
  update(dt, input) {
    // Banners always tick.
    for (const b of this.banners) b.t += dt;
    this.banners = this.banners.filter((b) => b.t < 2.4);
    this.shakeT = Math.max(0, this.shakeT - dt);
    if (this.shakeT <= 0) this.shakeMag = 0;
    this.updateParticles(dt);

    if (this.screen === 'hub') { this.updateHub(dt, input); return; }
    if (this.screen === 'results' || this.screen === 'failed') { this.updateResults(dt, input); return; }
    if (this.screen === 'carve') { this.updateCarve(dt, input); return; }

    // Hunt screen.
    if (input.pressed('KeyP')) this.paused = !this.paused;
    if (input.pressed('Escape')) { this.toHub(); input.endFrame(); return; }
    if (this.paused) { input.endFrame(); return; }
    if (input.pressed('KeyM')) this.audio.setMuted(!this.audio.muted);

    this.timer -= dt;
    this.huntTime += dt;
    if (this.timer <= 0) {
      this.timer = 0;
      this.failQuest('Time ran out — the monster escaped into the wilds.');
      return;
    }
    if (this.respawnT > 0) {
      this.respawnT -= dt;
      if (this.respawnT <= 0 && this.player) this.player.iframes = 1.2;
    }

    if (this.player && this.player.alive) this.player.update(dt, input, this);
    if (this.player && !this.player.alive) {
      this.faints++;
      if (this.faints >= 3) {
        this.failQuest('Three faints — the hunt is over.');
        return;
      }
      this.banner(`FAINTED! ${3 - this.faints} cart${3 - this.faints === 1 ? '' : 's'} left`, '#ff5a4d');
      this.player.reset(ARENA.x + ARENA.w / 2, ARENA.y + ARENA.h - 60, WEAPONS[this.save.weapon], ARMORS[this.save.armor]);
      this.player.hp = Math.round(this.player.maxHp * 0.7);
      this.respawnT = 1.5;
    }
    if (this.monster && this.monster.alive) this.monster.update(dt, this.player, this);
    this.updateOrbs(dt);
    input.endFrame();
  }

  updateParticles(dt) {
    for (const p of this.particles) {
      p.life -= dt;
      p.x += p.vx * dt; p.y += p.vy * dt;
      p.vy += (p.grav || 0) * dt;
    }
    this.particles = this.particles.filter((p) => p.life > 0);
    for (const f of this.floaters) { f.life -= dt; f.y -= 34 * dt; }
    this.floaters = this.floaters.filter((f) => f.life > 0);
  }

  updateOrbs(dt) {
    for (const o of this.orbs) {
      o.life -= dt;
      o.x += o.vx * dt; o.y += o.vy * dt;
      const p = this.player;
      if (p && p.alive && Math.hypot(p.x - o.x, p.y - o.y) < o.r + PLAYER.radius) {
        p.takeDamage(o.dmg, this);
        o.life = 0;
      }
      if (o.x < ARENA.x || o.x > ARENA.x + ARENA.w || o.y < ARENA.y || o.y > ARENA.y + ARENA.h) o.life = 0;
    }
    this.orbs = this.orbs.filter((o) => o.life > 0);
  }

  updateHub(dt, input) {
    this.audio.ensure();
    // Clickable buttons are rebuilt by render; clicks resolved here.
    if (input.mousePressed) {
      const mx = input.mouseX, my = input.mouseY;
      for (const b of this.buttons) {
        if (b.enabled && mx >= b.x && mx <= b.x + b.w && my >= b.y && my <= b.y + b.h) {
          this.audio.ensure();
          this.audio.click();
          b.action();
          break;
        }
      }
    }
    if (input.pressed('Digit1')) this.tryStartQuest(0);
    if (input.pressed('Digit2')) this.tryStartQuest(1);
    if (input.pressed('Digit3')) this.tryStartQuest(2);
    if (input.pressed('KeyC')) this.hubTab = this.hubTab === 'quests' ? 'smithy' : 'quests';
    input.endFrame();
  }

  tryStartQuest(idx) {
    if (idx < this.save.unlocked) this.startQuest(idx);
  }

  updateCarve(dt, input) {
    const m = this.monster;
    const p = this.player;
    if (!m || !p) return;
    // The hunter can walk to the carcass; press E near it to carve.
    p.update(dt, input, this);
    const near = Math.hypot(p.x - m.x, p.y - m.y) < m.radius + 70;
    const carving = near && (input.down('KeyE') || input.mouseDown);
    if (carving && !this.carveDone) {
      this.carveT += dt;
      if (this.rng() < dt * 12) this.burst(m.x + range(this.rng, -30, 30), m.y + range(this.rng, -20, 20), 1, '#ffd27a', 60);
      if (this.carveT >= 2) {
        this.carveDone = true;
        this.sfx('carve');
        this.finishCarve();
      }
    } else {
      this.carveT = Math.max(0, this.carveT - dt * 2);
    }
    input.endFrame();
  }

  updateResults(dt, input) {
    if (input.mousePressed) {
      const mx = input.mouseX, my = input.mouseY;
      for (const b of this.buttons) {
        if (b.enabled && mx >= b.x && mx <= b.x + b.w && my >= b.y && my <= b.y + b.h) {
          this.audio.click();
          b.action();
          break;
        }
      }
    }
    if (input.pressed('Enter') || input.pressed('Space')) this.toHub();
    input.endFrame();
  }

  toHub() {
    this.screen = 'hub';
    this.hubTab = 'quests';
    this.monster = null;
    this.player = null;
    this.results = null;
    this.audio.startMusic('hub');
  }
}
