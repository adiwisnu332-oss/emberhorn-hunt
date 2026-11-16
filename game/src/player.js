// Emberhorn Hunt — player.js
// One job: the hunter. Movement, dodge roll with i-frames, a 3-swing combo,
// potions, stamina and taking damage. The world owns the monster, timer and
// particles; the player only reports what happened through `ctx` callbacks.

import { PLAYER } from './config.js';
import { angleDiff, clamp } from './random.js';

export class Player {
  constructor(x, y, weapon, armor) {
    this.x = x;
    this.y = y;
    this.vx = 0;
    this.vy = 0;
    this.facing = -Math.PI / 2;
    this.weapon = weapon;
    this.armor = armor;
    this.maxHp = PLAYER.maxHp + armor.hp;
    this.hp = this.maxHp;
    this.stamina = PLAYER.stamina;
    this.potions = PLAYER.potions;
    this.swingTimer = 0;      // time left in the current swing
    this.swingIndex = 0;      // 0,1,2 combo step
    this.comboTimer = 0;      // window to continue the combo
    this.swingHitDone = false;
    this.dodgeTimer = 0;
    this.dodgeCd = 0;
    this.dodgeDirX = 0;
    this.dodgeDirY = -1;
    this.iframes = 0;
    this.hurtFlash = 0;
    this.walkCycle = 0;
    this.moving = false;
  }

  get alive() { return this.hp > 0; }

  reset(x, y, weapon, armor) {
    this.x = x; this.y = y;
    this.weapon = weapon; this.armor = armor;
    this.maxHp = PLAYER.maxHp + armor.hp;
    this.hp = this.maxHp;
    this.stamina = PLAYER.stamina;
    this.potions = PLAYER.potions;
    this.swingTimer = 0; this.swingIndex = 0; this.comboTimer = 0;
    this.dodgeTimer = 0; this.dodgeCd = 0; this.iframes = 0; this.hurtFlash = 0;
  }

  // Aim follows the mouse; attack is a swing arc around that aim.
  update(dt, input, ctx) {
    const arena = ctx.arena;
    this.iframes = Math.max(0, this.iframes - dt);
    this.hurtFlash = Math.max(0, this.hurtFlash - dt);
    this.dodgeCd = Math.max(0, this.dodgeCd - dt);
    this.stamina = Math.min(PLAYER.stamina, this.stamina + PLAYER.staminaRegen * dt);

    // Aim at the mouse (canvas coords).
    this.facing = Math.atan2(input.mouseY - this.y, input.mouseX - this.x);

    // --- Dodge roll ---
    const wantDodge = (input.pressed('Space') || input.pressed('ShiftLeft') || input.pressed('ShiftRight'));
    if (wantDodge && this.dodgeCd <= 0 && this.dodgeTimer <= 0 && this.stamina >= PLAYER.dodgeCost) {
      let dx = input.axisX(), dy = input.axisY();
      if (dx === 0 && dy === 0) { dx = Math.cos(this.facing); dy = Math.sin(this.facing); }
      const len = Math.hypot(dx, dy);
      this.dodgeDirX = dx / len; this.dodgeDirY = dy / len;
      this.dodgeTimer = PLAYER.dodgeTime;
      this.dodgeCd = PLAYER.dodgeCd;
      this.stamina -= PLAYER.dodgeCost;
      this.iframes = Math.max(this.iframes, PLAYER.dodgeTime + 0.1);
      ctx.sfx('dodge');
      ctx.burst(this.x, this.y, 8, '#cfd6e4', 120);
    }

    // --- Attack: 3-swing combo ---
    const wantSwing = input.mousePressed || input.pressed('KeyJ');
    if (wantSwing && this.swingTimer <= 0 && this.dodgeTimer <= 0) {
      const inCombo = this.comboTimer > 0;
      this.swingIndex = inCombo ? (this.swingIndex + 1) % 3 : 0;
      if (this.stamina >= PLAYER.swingCost) {
        this.stamina -= PLAYER.swingCost;
        this.swingTimer = PLAYER.swingTime;
        this.swingHitDone = false;
        this.comboTimer = PLAYER.comboWindow;
        ctx.sfx('swing');
      }
    }
    if (this.swingTimer > 0) {
      this.swingTimer -= dt;
      if (!this.swingHitDone && this.swingTimer < PLAYER.swingTime * 0.55) {
        this.swingHitDone = true;
        ctx.tryPlayerHit(this);
      }
    }
    this.comboTimer = Math.max(0, this.comboTimer - dt);

    // --- Potion ---
    if (input.pressed('KeyQ') && this.potions > 0 && this.hp < this.maxHp) {
      this.potions--;
      this.hp = Math.min(this.maxHp, this.hp + PLAYER.potionHeal);
      ctx.sfx('potion');
      ctx.burst(this.x, this.y, 14, '#7dff9a', 90);
      ctx.floater(this.x, this.y - 30, `+${PLAYER.potionHeal}`, '#7dff9a');
    }

    // --- Movement ---
    this.moving = false;
    if (this.dodgeTimer > 0) {
      this.dodgeTimer -= dt;
      this.x += this.dodgeDirX * PLAYER.dodgeSpeed * dt;
      this.y += this.dodgeDirY * PLAYER.dodgeSpeed * dt;
      this.moving = true;
    } else if (this.swingTimer <= 0) {
      const ax = input.axisX(), ay = input.axisY();
      if (ax !== 0 || ay !== 0) {
        const len = Math.hypot(ax, ay);
        this.x += (ax / len) * PLAYER.speed * dt;
        this.y += (ay / len) * PLAYER.speed * dt;
        this.moving = true;
        this.walkCycle += dt * 11;
      }
    }
    this.x = clamp(this.x, arena.x + PLAYER.radius, arena.x + arena.w - PLAYER.radius);
    this.y = clamp(this.y, arena.y + PLAYER.radius, arena.y + arena.h - PLAYER.radius);
  }

  takeDamage(amount, ctx) {
    if (this.iframes > 0 || this.dodgeTimer > 0 || !this.alive) return false;
    const reduced = Math.max(1, Math.round(amount - this.armor.def));
    this.hp -= reduced;
    this.iframes = PLAYER.iframes;
    this.hurtFlash = 0.35;
    ctx.sfx('hurt');
    ctx.shake(7);
    ctx.burst(this.x, this.y, 12, '#ff5a4d', 150);
    ctx.floater(this.x, this.y - 26, `-${reduced}`, '#ff6a5e');
    ctx.onPlayerHurt(reduced);
    return true;
  }

  // Where the swing's damage lands: monster centre + aim direction.
  swingTip() {
    return {
      x: this.x + Math.cos(this.facing) * (this.weapon.reach * 0.6),
      y: this.y + Math.sin(this.facing) * (this.weapon.reach * 0.6),
    };
  }
}

// The swing arc test: is point p inside the hunter's swing?
export function inSwingArc(player, px, py, extraRadius) {
  const dx = px - player.x, dy = py - player.y;
  const d = Math.hypot(dx, dy);
  if (d > player.weapon.reach + extraRadius) return false;
  const ang = Math.atan2(dy, dx);
  return Math.abs(angleDiff(player.facing, ang)) < PLAYER.swingArc / 2 + 0.35;
}
