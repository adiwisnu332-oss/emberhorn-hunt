// Emberhorn Hunt — monster.js
// One job: the monster. A data-driven state machine shared by all three
// species: approach → telegraph → attack → recover, with stagger, enrage and
// breakable parts. Attack kinds are shared implementations parameterized by
// the monster's config (charge, slam, breath, leap, swipe, dive, gust,
// screech). Parts break by the angle the hunter's swing came from.

import { angleDiff, clamp, lerp, range } from './random.js';

// Part angles relative to the monster's facing: horn = front, tail = rear,
// back/belly/wing = flank.
const PART_ANGLE = { horn: 0, fang: 0, back: Math.PI / 2, belly: Math.PI / 2, wing: Math.PI / 2, tail: Math.PI };

export class Monster {
  constructor(def, x, y, rng) {
    this.def = def;
    this.rng = rng;
    this.x = x; this.y = y;
    this.facing = Math.PI / 2;
    this.hp = def.hp;
    this.maxHp = def.hp;
    this.radius = def.radius;
    this.speed = def.speed;
    this.state = 'intro'; // intro, approach, telegraph, attack, recover, stagger, dying, dead
    this.stateT = 0;
    this.attack = null;   // current attack def
    this.attackData = null; // locked telegraph data (target point, direction)
    this.cooldowns = {};
    this.parts = def.parts.map((p) => ({ ...p, hp: p.hp, broken: false }));
    this.enraged = false;
    this.staggerAt = 0.75; // next HP fraction that staggers
    this.flash = 0;
    this.walkCycle = 0;
    this.roarDone = false;
    this.chargeVx = 0; this.chargeVy = 0;
    this.leapFrom = null; this.leapTo = null;
    this.orbsFired = 0;
  }

  get alive() { return this.hp > 0 && this.state !== 'dead'; }
  get enrageMult() { return this.enraged ? 1.25 : 1; }
  get teleMult() { return this.enraged ? 0.72 : 1; }

  update(dt, player, ctx) {
    this.flash = Math.max(0, this.flash - dt);
    this.stateT += dt;
    const dx = player.x - this.x, dy = player.y - this.y;
    const dist = Math.hypot(dx, dy);
    const toPlayer = Math.atan2(dy, dx);

    switch (this.state) {
      case 'intro': {
        // Roar, then begin.
        if (!this.roarDone) { this.roarDone = true; ctx.sfx('roar'); ctx.shake(5); }
        this.facing += angleDiff(this.facing, toPlayer) * Math.min(1, dt * 3);
        if (this.stateT > 1.4) this.toState('approach');
        break;
      }
      case 'approach': {
        this.facing += angleDiff(this.facing, toPlayer) * Math.min(1, dt * 4);
        // Pick an attack whose range we are inside (or almost), off cooldown.
        const ready = this.def.attacks.filter((a) => {
          const cd = this.cooldowns[a.kind] || 0;
          return cd <= 0 && dist < a.range * 1.15;
        });
        if (ready.length > 0 && this.stateT > 0.4) {
          this.attack = ready[Math.floor(this.rng() * ready.length)];
          this.toState('telegraph');
          ctx.sfx('telegraph');
          this.lockTelegraph(player);
        } else {
          // Walk toward the player, keeping some distance for ranged kinds.
          const want = this.def.attacks.some((a) => a.kind === 'breath' || a.kind === 'gust')
            ? 320 : this.radius + 46;
          if (dist > want) {
            const sp = this.speed * this.enrageMult;
            this.x += (dx / dist) * sp * dt;
            this.y += (dy / dist) * sp * dt;
            this.walkCycle += dt * 8;
          }
        }
        for (const k in this.cooldowns) this.cooldowns[k] -= dt;
        break;
      }
      case 'telegraph': {
        const tele = this.attack.tele * this.teleMult;
        // Track the player slowly during wind-up (except charge/dive lock).
        if (this.attack.kind !== 'charge' && this.attack.kind !== 'dive' && this.attack.kind !== 'leap') {
          this.facing += angleDiff(this.facing, toPlayer) * Math.min(1, dt * 1.6);
        }
        if (this.stateT >= tele) {
          this.toState('attack');
          this.beginAttack(ctx, player);
        }
        break;
      }
      case 'attack': {
        this.runAttack(dt, player, ctx);
        break;
      }
      case 'recover': {
        if (this.stateT > (this.attack && this.attack.kind === 'dive' ? 0.9 : 0.55)) {
          this.toState('approach');
        }
        break;
      }
      case 'stagger': {
        if (this.stateT > 1.25) this.toState('approach');
        break;
      }
      case 'dying': {
        if (this.stateT > 1.6) { this.state = 'dead'; ctx.onMonsterDead(); }
        break;
      }
      case 'dead': break;
    }
    // Keep inside the arena.
    const a = ctx.arena;
    this.x = clamp(this.x, a.x + this.radius * 0.6, a.x + a.w - this.radius * 0.6);
    this.y = clamp(this.y, a.y + this.radius * 0.6, a.y + a.h - this.radius * 0.6);
  }

  toState(s) { this.state = s; this.stateT = 0; }

  // Lock the telegraph's target at wind-up start (fair: the player can dodge).
  lockTelegraph(player) {
    const a = this.attack;
    this.attackData = {
      tx: player.x, ty: player.y,
      dir: Math.atan2(player.y - this.y, player.x - this.x),
      fromX: this.x, fromY: this.y,
    };
  }

  beginAttack(ctx, player) {
    const a = this.attack;
    this.cooldowns[a.kind] = a.cd;
    if (a.kind === 'charge') {
      const d = this.attackData.dir;
      this.chargeVx = Math.cos(d); this.chargeVy = Math.sin(d);
      ctx.sfx('roar');
    } else if (a.kind === 'leap' || a.kind === 'dive') {
      this.leapFrom = { x: this.x, y: this.y };
      this.leapTo = { x: this.attackData.tx, y: this.attackData.ty };
    } else if (a.kind === 'gust') {
      this.orbsFired = 0;
    } else if (a.kind === 'screech') {
      ctx.sfx('roar');
      ctx.shake(6);
    }
  }

  runAttack(dt, player, ctx) {
    const a = this.attack;
    const dur = a.kind === 'breath' ? 0.85 : a.kind === 'charge' ? 0.55 : a.kind === 'gust' ? 0.9 : 0.45;
    switch (a.kind) {
      case 'charge': {
        const sp = 560 * this.enrageMult;
        this.x += this.chargeVx * sp * dt;
        this.y += this.chargeVy * sp * dt;
        // Contact damage while charging.
        if (Math.hypot(player.x - this.x, player.y - this.y) < this.radius + 18) {
          if (player.takeDamage(a.dmg, ctx)) ctx.knockPlayer(this.x, this.y, 260);
        }
        ctx.dust(this.x, this.y, 2);
        if (this.stateT >= dur) this.toState('recover');
        break;
      }
      case 'slam': {
        if (this.stateT >= 0.12 && !this.attackData.done) {
          this.attackData.done = true;
          const { tx, ty } = this.attackData;
          ctx.aoeHit(tx, ty, 150, a.dmg, this);
          ctx.shake(9);
          ctx.burst(tx, ty, 22, '#c9a86a', 200);
        }
        if (this.stateT >= dur) this.toState('recover');
        break;
      }
      case 'breath': {
        // Cone damage ticks while breathing.
        const dir = this.facing;
        const px = player.x - this.x, py = player.y - this.y;
        const d = Math.hypot(px, py);
        const ang = Math.abs(angleDiff(dir, Math.atan2(py, px)));
        if (d < a.range && ang < 0.42) {
          if (!this.attackData.tick || this.stateT - this.attackData.tick > 0.3) {
            this.attackData.tick = this.stateT;
            player.takeDamage(Math.round(a.dmg * 0.45), ctx);
          }
        }
        if (this.rng() < dt * 40) ctx.emberParticle(this.x + Math.cos(dir) * this.radius, this.y + Math.sin(dir) * this.radius, dir);
        if (this.stateT >= dur) this.toState('recover');
        break;
      }
      case 'leap':
      case 'dive': {
        const t = Math.min(1, this.stateT / 0.45);
        const arc = Math.sin(t * Math.PI) * 130;
        this.x = lerp(this.leapFrom.x, this.leapTo.x, t);
        this.y = lerp(this.leapFrom.y, this.leapTo.y, t);
        this.leapArc = arc;
        if (t >= 1 && !this.attackData.done) {
          this.attackData.done = true;
          const r = a.kind === 'dive' ? 190 : 150;
          ctx.aoeHit(this.x, this.y, r, a.dmg, this);
          ctx.shake(11);
          ctx.burst(this.x, this.y, 26, '#b9c4d6', 220);
        }
        if (this.stateT >= 0.7) { this.leapArc = 0; this.toState('recover'); }
        break;
      }
      case 'swipe': {
        if (this.stateT >= 0.1 && !this.attackData.done) {
          this.attackData.done = true;
          const px = player.x - this.x, py = player.y - this.y;
          const d = Math.hypot(px, py);
          const ang = Math.abs(angleDiff(this.facing, Math.atan2(py, px)));
          if (d < a.range && ang < 1.1) player.takeDamage(a.dmg, ctx);
          ctx.sfx('swing');
        }
        if (this.stateT >= dur) this.toState('recover');
        break;
      }
      case 'gust': {
        if (this.stateT > this.orbsFired * 0.28 && this.orbsFired < 3) {
          this.orbsFired++;
          const spread = (this.orbsFired - 2) * 0.28;
          const dir = Math.atan2(player.y - this.y, player.x - this.x) + spread;
          ctx.spawnOrb(this.x, this.y, dir, 300, a.dmg, this.def.accent);
        }
        if (this.stateT >= dur) this.toState('recover');
        break;
      }
      case 'screech': {
        // Expanding ring: damage when the ring passes the player.
        const ringR = this.stateT / dur * 320;
        const pd = Math.hypot(player.x - this.x, player.y - this.y);
        if (!this.attackData.done && Math.abs(pd - ringR) < 26) {
          this.attackData.done = true;
          player.takeDamage(a.dmg, ctx);
        }
        this.attackData.ringR = ringR;
        if (this.stateT >= dur) this.toState('recover');
        break;
      }
      default:
        this.toState('recover');
    }
  }

  // The hunter's swing landed. `fromAngle` is the direction the swing came
  // from, relative to world axes; the nearest part by angle takes part damage.
  takeHit(dmg, fromAngle, ctx) {
    if (!this.alive) return;
    const staggered = this.state === 'stagger';
    const total = Math.round(dmg * (staggered ? 1.5 : 1));
    this.hp -= total;
    this.flash = 0.14;
    ctx.floater(this.x + range(this.rng, -20, 20), this.y - this.radius - 8, `${total}`, '#ffe9a8');
    ctx.burst(this.x, this.y, 6, '#ffd27a', 130);
    // Part damage: nearest part by relative angle.
    const rel = angleDiff(this.facing, fromAngle); // where the hunter stands, rel. to monster facing
    let best = null, bestD = Infinity;
    for (const p of this.parts) {
      if (p.broken) continue;
      const d = Math.abs(angleDiff(rel, PART_ANGLE[p.id] ?? Math.PI / 2));
      if (d < bestD) { bestD = d; best = p; }
    }
    if (best && bestD < 1.2) {
      best.hp -= total;
      if (best.hp <= 0) {
        best.broken = true;
        ctx.onPartBroken(best);
      }
    }
    if (this.hp <= 0) {
      this.hp = 0;
      this.toState('dying');
      ctx.sfx('roar');
      ctx.shake(10);
      return;
    }
    // Enrage.
    if (!this.enraged && this.hp / this.maxHp <= this.def.enrageAt) {
      this.enraged = true;
      ctx.banner('ENRAGED!', '#ff5a4d');
      ctx.sfx('roar');
      ctx.shake(6);
    }
    // Stagger at each 25% HP chunk.
    if (this.hp / this.maxHp <= this.staggerAt && this.state !== 'stagger') {
      this.staggerAt -= 0.25;
      this.toState('stagger');
      ctx.floater(this.x, this.y - this.radius - 30, 'STAGGERED', '#7dff9a');
    }
  }
}
