// Emberhorn Hunt — render.js
// One job: everything drawn on the canvas. Arena, hunter, the three monster
// species (each an original silhouette in code), telegraphs, particles, HUD,
// hub menus, carve prompt and results screens. No images, no network.

import { VIEW_W, VIEW_H, ARENA, MATERIALS, QUESTS, WEAPONS, ARMORS, PLAYER } from './config.js';
import { mulberry32, clamp } from './random.js';

const FONT = (px, bold) => `${bold ? 'bold ' : ''}${px}px system-ui, -apple-system, 'Segoe UI', sans-serif`;

// Fixed decorative layout so the arena looks the same every run.
const DECOR = (() => {
  const rng = mulberry32(20261116);
  const grass = [], rocks = [], flowers = [];
  for (let i = 0; i < 90; i++) grass.push({ x: ARENA.x + rng() * ARENA.w, y: ARENA.y + rng() * ARENA.h, r: 3 + rng() * 7 });
  for (let i = 0; i < 10; i++) rocks.push({ x: ARENA.x + rng() * ARENA.w, y: ARENA.y + rng() * ARENA.h, r: 8 + rng() * 16 });
  for (let i = 0; i < 26; i++) flowers.push({ x: ARENA.x + rng() * ARENA.w, y: ARENA.y + rng() * ARENA.h, c: ['#ff8fb3', '#ffd27a', '#9adcff'][i % 3] });
  return { grass, rocks, flowers };
})();

function rr(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function ellipse(ctx, x, y, rx, ry) {
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
  ctx.fill();
}

function bar(ctx, x, y, w, h, frac, fg, bg) {
  ctx.fillStyle = bg || 'rgba(0,0,0,0.55)';
  rr(ctx, x, y, w, h, h / 2); ctx.fill();
  ctx.fillStyle = fg;
  if (frac > 0) { rr(ctx, x, y, Math.max(h, w * clamp(frac, 0, 1)), h, h / 2); ctx.fill(); }
}

export class Renderer {
  constructor(canvas) {
    this.cv = canvas;
    this.ctx = canvas.getContext('2d');
  }

  draw(world, input) {
    const ctx = this.ctx;
    ctx.save();
    ctx.clearRect(0, 0, VIEW_W, VIEW_H);
    // Screen shake.
    if (world.shakeMag > 0 && world.shakeT > 0) {
      ctx.translate((Math.random() - 0.5) * world.shakeMag, (Math.random() - 0.5) * world.shakeMag);
    }
    world.buttons = [];
    if (world.screen === 'hub') this.drawHub(world, input);
    else if (world.screen === 'hunt' || world.screen === 'carve') this.drawHunt(world, input);
    else if (world.screen === 'results') this.drawResults(world, input, false);
    else if (world.screen === 'failed') this.drawResults(world, input, true);
    this.drawBanners(world);
    ctx.restore();
  }

  // ---------------- arena ----------------
  drawArena(ctx, world) {
    // Ground.
    const g = ctx.createLinearGradient(0, ARENA.y, 0, ARENA.y + ARENA.h);
    g.addColorStop(0, '#2c4a26');
    g.addColorStop(1, '#1d3320');
    ctx.fillStyle = g;
    ctx.fillRect(ARENA.x, ARENA.y, ARENA.w, ARENA.h);
    // Grass tufts, flowers, rocks.
    ctx.fillStyle = 'rgba(120,180,90,0.5)';
    for (const t of DECOR.grass) ellipse(ctx, t.x, t.y, t.r, t.r * 0.4);
    for (const f of DECOR.flowers) { ctx.fillStyle = f.c; ellipse(ctx, f.x, f.y, 3, 3); }
    ctx.fillStyle = '#5a6a72';
    for (const r of DECOR.rocks) ellipse(ctx, r.x, r.y, r.r, r.r * 0.7);
    // Arena border: wooden fence posts + rope.
    ctx.strokeStyle = '#8a6b42';
    ctx.lineWidth = 5;
    ctx.strokeRect(ARENA.x, ARENA.y, ARENA.w, ARENA.h);
    ctx.fillStyle = '#6b4f2a';
    for (let x = ARENA.x; x <= ARENA.x + ARENA.w; x += 116) {
      ctx.fillRect(x - 4, ARENA.y - 10, 8, 18);
      ctx.fillRect(x - 4, ARENA.y + ARENA.h - 8, 8, 18);
    }
    // Camp corner (bottom-left): tent + fire.
    this.drawCamp(ctx, ARENA.x + 70, ARENA.y + ARENA.h - 60);
  }

  drawCamp(ctx, x, y) {
    ctx.fillStyle = '#c98f4e';
    ctx.beginPath(); ctx.moveTo(x - 42, y + 18); ctx.lineTo(x, y - 34); ctx.lineTo(x + 42, y + 18); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#7a4a22';
    ctx.beginPath(); ctx.moveTo(x - 12, y + 18); ctx.lineTo(x, y - 8); ctx.lineTo(x + 12, y + 18); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#ff9a3c';
    ellipse(ctx, x + 62, y + 12, 10, 6);
    ctx.fillStyle = '#ffd27a';
    ellipse(ctx, x + 62, y + 6, 6, 9);
  }

  // ---------------- telegraphs ----------------
  drawTelegraph(ctx, world) {
    const m = world.monster;
    if (!m || m.state !== 'telegraph' || !m.attack) return;
    const a = m.attack;
    const d = m.attackData;
    const pulse = 0.35 + 0.2 * Math.sin(world.huntTime * 14);
    ctx.save();
    if (a.kind === 'charge') {
      const len = 560;
      const x2 = m.x + Math.cos(d.dir) * len, y2 = m.y + Math.sin(d.dir) * len;
      ctx.strokeStyle = `rgba(255,70,50,${pulse})`;
      ctx.lineWidth = m.radius * 1.1;
      ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(m.x, m.y); ctx.lineTo(x2, y2); ctx.stroke();
    } else if (a.kind === 'slam' || a.kind === 'leap' || a.kind === 'dive') {
      const r = a.kind === 'dive' ? 190 : a.kind === 'leap' ? 150 : 150;
      ctx.fillStyle = `rgba(255,70,50,${pulse * 0.8})`;
      ctx.beginPath(); ctx.arc(d.tx, d.ty, r, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = 'rgba(255,120,80,0.9)'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(d.tx, d.ty, r, 0, Math.PI * 2); ctx.stroke();
    } else if (a.kind === 'breath') {
      ctx.fillStyle = `rgba(255,120,40,${pulse * 0.7})`;
      ctx.beginPath();
      ctx.moveTo(m.x, m.y);
      ctx.arc(m.x, m.y, a.range, m.facing - 0.42, m.facing + 0.42);
      ctx.closePath(); ctx.fill();
    } else if (a.kind === 'screech') {
      ctx.strokeStyle = `rgba(183,140,255,${pulse})`;
      ctx.lineWidth = 6;
      ctx.beginPath(); ctx.arc(m.x, m.y, 300, 0, Math.PI * 2); ctx.stroke();
    } else if (a.kind === 'gust' || a.kind === 'swipe') {
      ctx.strokeStyle = `rgba(255,200,80,${pulse})`;
      ctx.lineWidth = 4;
      ctx.beginPath(); ctx.arc(m.x, m.y, a.range, m.facing - 1.1, m.facing + 1.1); ctx.stroke();
    }
    ctx.restore();
  }

  // ---------------- monster ----------------
  drawMonster(ctx, world) {
    const m = world.monster;
    if (!m) return;
    const def = m.def;
    const s = def.scale;
    ctx.save();
    ctx.translate(m.x, m.y);
    // Leap arc: rise and shrink the shadow.
    const arc = m.leapArc || 0;
    ctx.translate(0, -arc);
    // Shadow.
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ellipse(ctx, 0, m.radius * 0.55 + arc, m.radius * 0.9, m.radius * 0.28);
    if (m.state === 'dying' || m.state === 'dead') {
      ctx.rotate(1.35);
      ctx.globalAlpha = m.state === 'dead' ? 0.85 : 1 - m.stateT / 1.6 * 0.15;
    } else {
      ctx.rotate(m.facing);
    }
    const R = m.radius * s;
    const broken = (id) => m.parts.find((p) => p.id === id)?.broken;
    // Tail (behind).
    ctx.fillStyle = def.dark;
    ctx.beginPath();
    if (def.id === 'galehorn') {
      ctx.moveTo(-R * 0.7, 0); ctx.lineTo(-R * 1.7, -R * 0.35); ctx.lineTo(-R * 1.7, R * 0.35); ctx.closePath();
    } else if (def.id === 'embermaw') {
      ctx.moveTo(-R * 0.7, 0); ctx.lineTo(-R * 1.9, -R * 0.22); ctx.lineTo(-R * 1.9, R * 0.22); ctx.closePath();
    } else {
      ctx.moveTo(-R * 0.7, 0); ctx.lineTo(-R * 1.35, -R * 0.3); ctx.lineTo(-R * 1.35, R * 0.3); ctx.closePath();
    }
    ctx.fill();
    if (!broken('tail')) {
      ctx.fillStyle = def.accent;
      ellipse(ctx, -R * 1.45, 0, R * 0.22, R * 0.22);
    }
    // Wings / back plates.
    if (def.id === 'galehorn' && !broken('wing')) {
      ctx.fillStyle = def.color;
      ctx.beginPath(); ctx.moveTo(-R * 0.2, -R * 0.5); ctx.lineTo(-R * 0.9, -R * 1.5); ctx.lineTo(R * 0.5, -R * 0.7); ctx.closePath(); ctx.fill();
      ctx.beginPath(); ctx.moveTo(-R * 0.2, R * 0.5); ctx.lineTo(-R * 0.9, R * 1.5); ctx.lineTo(R * 0.5, R * 0.7); ctx.closePath(); ctx.fill();
      ctx.fillStyle = def.accent;
      ellipse(ctx, -R * 0.55, -R * 1.05, R * 0.16, R * 0.3);
      ellipse(ctx, -R * 0.55, R * 1.05, R * 0.16, R * 0.3);
    }
    if ((def.id === 'thornback' || def.id === 'embermaw') && !broken('back') && !broken('belly')) {
      ctx.fillStyle = def.accent;
      for (let i = -1; i <= 1; i++) {
        ctx.beginPath();
        ctx.moveTo(-R * 0.5 + i * R * 0.45, -R * 0.62);
        ctx.lineTo(-R * 0.35 + i * R * 0.45, -R * 1.05);
        ctx.lineTo(-R * 0.2 + i * R * 0.45, -R * 0.62);
        ctx.closePath(); ctx.fill();
      }
    }
    // Body.
    ctx.fillStyle = def.color;
    ellipse(ctx, 0, 0, R, R * 0.78);
    ctx.fillStyle = def.belly;
    ellipse(ctx, R * 0.15, R * 0.28, R * 0.62, R * 0.42);
    // Legs.
    ctx.fillStyle = def.dark;
    const step = Math.sin(m.walkCycle) * R * 0.12;
    ellipse(ctx, -R * 0.4, -R * 0.72 + step, R * 0.2, R * 0.3);
    ellipse(ctx, R * 0.35, -R * 0.72 - step, R * 0.2, R * 0.3);
    ellipse(ctx, -R * 0.4, R * 0.72 - step, R * 0.2, R * 0.3);
    ellipse(ctx, R * 0.35, R * 0.72 + step, R * 0.2, R * 0.3);
    // Head.
    ctx.fillStyle = def.color;
    ellipse(ctx, R * 0.98, 0, R * 0.58, R * 0.5);
    // Horn / fang.
    if (!broken('horn') && !broken('fang')) {
      ctx.fillStyle = def.accent;
      ctx.beginPath();
      ctx.moveTo(R * 1.15, -R * 0.34);
      ctx.lineTo(R * 2.0, -R * 0.12);
      ctx.lineTo(R * 1.15, R * 0.08);
      ctx.closePath(); ctx.fill();
      // Lower tusk.
      ctx.beginPath();
      ctx.moveTo(R * 1.2, R * 0.3);
      ctx.lineTo(R * 1.8, R * 0.42);
      ctx.lineTo(R * 1.2, R * 0.52);
      ctx.closePath(); ctx.fill();
    } else {
      ctx.fillStyle = '#5a5148';
      ctx.beginPath(); ctx.moveTo(R * 1.15, -R * 0.25); ctx.lineTo(R * 1.4, -R * 0.08); ctx.lineTo(R * 1.15, R * 0.02); ctx.closePath(); ctx.fill();
    }
    // Eye.
    ctx.fillStyle = m.enraged ? '#ff2e1f' : '#ffd27a';
    ellipse(ctx, R * 1.05, -R * 0.16, R * 0.1, R * 0.1);
    ctx.fillStyle = '#1a1a1a';
    ellipse(ctx, R * 1.08, -R * 0.16, R * 0.045, R * 0.045);
    // Mouth line.
    ctx.strokeStyle = def.dark; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(R * 1.05, R * 0.22); ctx.lineTo(R * 1.42, R * 0.14); ctx.stroke();
    // Hit flash.
    if (m.flash > 0) {
      ctx.globalAlpha = Math.min(0.7, m.flash * 4);
      ctx.fillStyle = '#ffffff';
      ellipse(ctx, 0, 0, R, R * 0.78);
      ctx.globalAlpha = 1;
    }
    // Enrage tint.
    if (m.enraged && m.state !== 'dying' && m.state !== 'dead') {
      ctx.globalAlpha = 0.12 + 0.06 * Math.sin(world.huntTime * 8);
      ctx.fillStyle = '#ff2e1f';
      ellipse(ctx, 0, 0, R, R * 0.78);
      ctx.globalAlpha = 1;
    }
    ctx.restore();
    // Breath cone fire while attacking.
    if (m.state === 'attack' && m.attack && m.attack.kind === 'breath') {
      ctx.save();
      ctx.translate(m.x, m.y);
      ctx.rotate(m.facing);
      ctx.fillStyle = 'rgba(255,120,40,0.5)';
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.arc(0, 0, m.attack.range, -0.42, 0.42); ctx.closePath(); ctx.fill();
      ctx.fillStyle = 'rgba(255,200,90,0.55)';
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.arc(0, 0, m.attack.range * 0.7, -0.28, 0.28); ctx.closePath(); ctx.fill();
      ctx.restore();
    }
    // Screech ring.
    if (m.state === 'attack' && m.attack && m.attack.kind === 'screech' && m.attackData?.ringR) {
      ctx.strokeStyle = 'rgba(183,140,255,0.8)';
      ctx.lineWidth = 8;
      ctx.beginPath(); ctx.arc(m.x, m.y, m.attackData.ringR, 0, Math.PI * 2); ctx.stroke();
    }
    // HP bar + name above the monster (clamped below the top HUD panels).
    if (m.state !== 'dead') {
      const bw = 260;
      const labelY = Math.max(m.y - m.radius - 52, 100);
      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      rr(ctx, m.x - bw / 2, labelY, bw, 16, 8); ctx.fill();
      ctx.fillStyle = m.enraged ? '#ff5a4d' : '#ffb35c';
      const fw = (bw - 4) * clamp(m.hp / m.maxHp, 0, 1);
      if (fw > 0) { rr(ctx, m.x - bw / 2 + 2, labelY + 2, fw, 12, 6); ctx.fill(); }
      ctx.fillStyle = '#fff';
      ctx.font = FONT(15, true);
      ctx.textAlign = 'center';
      ctx.fillText(`${m.def.name}  ·  ${m.def.title}`, m.x, labelY - 6);
      // Part pips.
      m.parts.forEach((p, i) => {
        ctx.fillStyle = p.broken ? '#5a5148' : '#e8d27a';
        ellipse(ctx, m.x - 30 + i * 30, labelY + 28, 7, 7);
      });
    }
  }

  // ---------------- player ----------------
  drawPlayer(ctx, world) {
    const p = world.player;
    if (!p) return;
    ctx.save();
    ctx.translate(p.x, p.y);
    if (p.iframes > 0 && Math.floor(world.huntTime * 14) % 2 === 0) ctx.globalAlpha = 0.45;
    // Shadow.
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ellipse(ctx, 0, 14, 16, 6);
    ctx.rotate(p.facing);
    // Cloak.
    ctx.fillStyle = p.hurtFlash > 0 ? '#ffffff' : '#3f6fb5';
    ctx.beginPath(); ctx.moveTo(-14, -11); ctx.lineTo(6, 0); ctx.lineTo(-14, 11); ctx.closePath(); ctx.fill();
    // Body.
    ctx.fillStyle = p.hurtFlash > 0 ? '#ffffff' : '#d8b25c';
    ellipse(ctx, 0, 0, 13, 12);
    // Head + hood.
    ctx.fillStyle = p.hurtFlash > 0 ? '#ffffff' : '#8a5a2e';
    ellipse(ctx, 4, 0, 8, 8);
    // Sword: swings in an arc while attacking.
    const swing = p.swingTimer > 0 ? (1 - p.swingTimer / PLAYER.swingTime) : 0;
    const bladeAngle = p.swingTimer > 0 ? -1.3 + swing * 2.6 : -0.5;
    ctx.save();
    ctx.rotate(bladeAngle);
    ctx.fillStyle = '#e8ecf2';
    ctx.fillRect(10, -3.5, 34, 7);
    ctx.fillStyle = '#c98f2e';
    ctx.fillRect(6, -5.5, 6, 11);
    ctx.restore();
    ctx.restore();
    // Swing arc swoosh.
    if (p.swingTimer > 0) {
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.strokeStyle = `rgba(255,240,180,${0.7 * (p.swingTimer / PLAYER.swingTime)})`;
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.arc(0, 0, p.weapon.reach * 0.75, p.facing - 0.95, p.facing + 0.95);
      ctx.stroke();
      ctx.restore();
    }
  }

  drawOrbs(ctx, world) {
    for (const o of world.orbs) {
      ctx.fillStyle = o.color;
      ellipse(ctx, o.x, o.y, o.r, o.r);
      ctx.fillStyle = 'rgba(255,255,255,0.7)';
      ellipse(ctx, o.x - 3, o.y - 3, o.r * 0.35, o.r * 0.35);
    }
  }

  drawParticles(ctx, world) {
    for (const p of world.particles) {
      ctx.globalAlpha = clamp(p.life / p.maxLife, 0, 1);
      ctx.fillStyle = p.color;
      ellipse(ctx, p.x, p.y, p.size, p.size);
    }
    ctx.globalAlpha = 1;
    ctx.font = FONT(16, true);
    ctx.textAlign = 'center';
    for (const f of world.floaters) {
      ctx.globalAlpha = clamp(f.life, 0, 1);
      ctx.fillStyle = f.color;
      ctx.fillText(f.text, f.x, f.y);
    }
    ctx.globalAlpha = 1;
  }

  // ---------------- HUD ----------------
  drawHUD(ctx, world) {
    const p = world.player;
    const q = world.quest;
    // Top bar: quest + timer.
    ctx.fillStyle = 'rgba(10,14,20,0.72)';
    rr(ctx, VIEW_W / 2 - 260, 12, 520, 64, 12); ctx.fill();
    ctx.fillStyle = '#ffd27a';
    ctx.font = FONT(17, true);
    ctx.textAlign = 'center';
    ctx.fillText(q.name.toUpperCase(), VIEW_W / 2, 36);
    const t = Math.max(0, Math.ceil(world.timer));
    const mm = Math.floor(t / 60), ss = String(t % 60).padStart(2, '0');
    ctx.fillStyle = t < 60 ? '#ff5a4d' : '#fff';
    ctx.font = FONT(22, true);
    ctx.fillText(`${mm}:${ss}`, VIEW_W / 2, 64);
    // Player vitals bottom-left.
    ctx.fillStyle = 'rgba(10,14,20,0.72)';
    rr(ctx, 16, VIEW_H - 92, 320, 76, 12); ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.font = FONT(14, true);
    ctx.textAlign = 'left';
    ctx.fillText('HUNTER', 30, VIEW_H - 68);
    bar(ctx, 30, VIEW_H - 58, 240, 12, p.hp / p.maxHp, '#e5484d');
    bar(ctx, 30, VIEW_H - 40, 240, 8, p.stamina / PLAYER.stamina, '#4dc36a');
    ctx.fillStyle = '#ffd27a';
    ctx.font = FONT(14, true);
    ctx.fillText(`POTIONS ${'●'.repeat(p.potions)}${'○'.repeat(PLAYER.potions - p.potions)}  [Q]`, 30, VIEW_H - 22);
    // Faints top-right.
    ctx.fillStyle = 'rgba(10,14,20,0.72)';
    rr(ctx, VIEW_W - 236, 12, 220, 64, 12); ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.font = FONT(15, true);
    ctx.textAlign = 'center';
    ctx.fillText(`FAINTS  ${world.faints} / 3`, VIEW_W - 126, 38);
    ctx.fillStyle = '#9adcff';
    ctx.font = FONT(13, false);
    ctx.fillText('[P] pause   [M] mute', VIEW_W - 126, 60);
    // Controls hint bottom-right.
    ctx.fillStyle = 'rgba(10,14,20,0.55)';
    rr(ctx, VIEW_W - 316, VIEW_H - 52, 300, 36, 10); ctx.fill();
    ctx.fillStyle = '#cfd6e4';
    ctx.font = FONT(13, false);
    ctx.fillText('WASD move · Click/J attack · Space dodge', VIEW_W - 166, VIEW_H - 30);
    if (world.paused) {
      ctx.fillStyle = 'rgba(5,8,12,0.72)';
      ctx.fillRect(0, 0, VIEW_W, VIEW_H);
      ctx.fillStyle = '#fff';
      ctx.font = FONT(44, true);
      ctx.fillText('PAUSED', VIEW_W / 2, VIEW_H / 2 - 10);
      ctx.font = FONT(18, false);
      ctx.fillStyle = '#cfd6e4';
      ctx.fillText('Press P to resume · Esc abandons the quest', VIEW_W / 2, VIEW_H / 2 + 30);
    }
  }

  drawHunt(world, input) {
    const ctx = this.ctx;
    this.drawArena(ctx, world);
    this.drawTelegraph(ctx, world);
    this.drawMonster(ctx, world);
    this.drawPlayer(ctx, world);
    this.drawOrbs(ctx, world);
    this.drawParticles(ctx, world);
    this.drawHUD(ctx, world);
    if (world.screen === 'carve') this.drawCarvePrompt(ctx, world);
  }

  drawCarvePrompt(ctx, world) {
    const m = world.monster, p = world.player;
    const near = Math.hypot(p.x - m.x, p.y - m.y) < m.radius + 70;
    ctx.fillStyle = 'rgba(10,14,20,0.78)';
    rr(ctx, VIEW_W / 2 - 300, VIEW_H - 160, 600, 100, 12); ctx.fill();
    ctx.fillStyle = '#ffd27a';
    ctx.font = FONT(20, true);
    ctx.textAlign = 'center';
    ctx.fillText(near ? 'HOLD E TO CARVE THE MONSTER' : 'WALK TO THE CARCASS AND HOLD E TO CARVE', VIEW_W / 2, VIEW_H - 128);
    if (near) {
      bar(ctx, VIEW_W / 2 - 200, VIEW_H - 106, 400, 14, world.carveT / 2, '#ffd27a');
      ctx.fillStyle = '#cfd6e4';
      ctx.font = FONT(14, false);
      ctx.fillText('Carving yields materials for the smithy — broken parts pay extra!', VIEW_W / 2, VIEW_H - 76);
    }
  }

  // ---------------- hub ----------------
  button(world, x, y, w, h, label, action, enabled, style) {
    const b = { x, y, w, h, label, action, enabled: enabled !== false };
    world.buttons.push(b);
    const ctx = this.ctx;
    ctx.fillStyle = !b.enabled ? 'rgba(90,95,105,0.85)' : (style === 'gold' ? '#c98f2e' : style === 'green' ? '#2e7d46' : 'rgba(46,58,74,0.95)');
    rr(ctx, x, y, w, h, 10); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.25)'; ctx.lineWidth = 1.5;
    rr(ctx, x, y, w, h, 10); ctx.stroke();
    ctx.fillStyle = '#fff';
    ctx.font = FONT(16, true);
    ctx.textAlign = 'center';
    ctx.fillText(label, x + w / 2, y + h / 2 + 6);
  }

  drawHub(world, input) {
    const ctx = this.ctx;
    // Village backdrop: dusk sky, hills, houses, torches.
    const sky = ctx.createLinearGradient(0, 0, 0, VIEW_H);
    sky.addColorStop(0, '#1c2340'); sky.addColorStop(0.55, '#59342e'); sky.addColorStop(1, '#241a16');
    ctx.fillStyle = sky; ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    ctx.fillStyle = '#ffd27a';
    ellipse(ctx, 1080, 110, 42, 42);
    ctx.fillStyle = '#2a2118';
    ctx.beginPath(); ctx.moveTo(0, 520); ctx.lineTo(240, 380); ctx.lineTo(520, 520); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(760, 520); ctx.lineTo(1020, 360); ctx.lineTo(1280, 520); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#171310'; ctx.fillRect(0, 520, VIEW_W, 200);
    // Houses.
    this.drawHouse(ctx, 180, 470, '#6b4a2e');
    this.drawHouse(ctx, 420, 490, '#54402a');
    this.drawHouse(ctx, 980, 480, '#6b4a2e');
    // Torches.
    for (const tx of [120, 640, 1160]) {
      ctx.fillStyle = '#ff9a3c'; ellipse(ctx, tx, 480, 7, 12);
      ctx.fillStyle = '#ffd27a'; ellipse(ctx, tx, 474, 4, 7);
    }
    // Title.
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffd27a';
    ctx.font = FONT(64, true);
    ctx.fillText('EMBERHORN HUNT', VIEW_W / 2, 118);
    ctx.fillStyle = '#f2e3c2';
    ctx.font = FONT(20, false);
    ctx.fillText('Track it. Break it. Carve it. Forge it. — Cinderhold Village', VIEW_W / 2, 152);
    // Tabs.
    this.button(world, VIEW_W / 2 - 220, 180, 210, 44, 'QUEST BOARD  [1-3]', () => { world.hubTab = 'quests'; }, true, world.hubTab === 'quests' ? 'gold' : null);
    this.button(world, VIEW_W / 2 + 10, 180, 210, 44, 'SMITHY  [C]', () => { world.hubTab = 'smithy'; }, true, world.hubTab === 'smithy' ? 'gold' : null);
    if (world.hubTab === 'quests') this.drawQuestBoard(world);
    else this.drawSmithy(world);
    // Materials strip.
    const mats = Object.entries(world.save.materials).filter(([, n]) => n > 0);
    ctx.fillStyle = 'rgba(10,14,20,0.7)';
    rr(ctx, 16, VIEW_H - 46, VIEW_W - 32, 32, 8); ctx.fill();
    ctx.fillStyle = '#cfd6e4';
    ctx.font = FONT(14, false);
    ctx.textAlign = 'left';
    ctx.fillText(mats.length ? `MATERIALS:  ${mats.map(([m, n]) => `${MATERIALS[m].name} ×${n}`).join('   ·   ')}` : 'MATERIALS: none yet — your first hunt awaits.', 30, VIEW_H - 25);
    // Hunter line.
    ctx.textAlign = 'right';
    ctx.fillStyle = '#ffd27a';
    ctx.font = FONT(14, true);
    ctx.fillText(`${WEAPONS[world.save.weapon].name}  ·  ${ARMORS[world.save.armor].name}  ·  Hunts: ${world.save.hunts}`, VIEW_W - 30, VIEW_H - 58);
  }

  drawHouse(ctx, x, y, color) {
    ctx.fillStyle = color;
    ctx.fillRect(x - 60, y - 40, 120, 70);
    ctx.fillStyle = '#3a2a18';
    ctx.beginPath(); ctx.moveTo(x - 72, y - 38); ctx.lineTo(x, y - 84); ctx.lineTo(x + 72, y - 38); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#ffd27a';
    ctx.fillRect(x - 34, y - 22, 18, 18);
    ctx.fillRect(x + 16, y - 22, 18, 18);
  }

  drawQuestBoard(world) {
    const ctx = this.ctx;
    QUESTS.forEach((q, i) => {
      const x = 90 + i * 380, y = 250, w = 350, h = 250;
      const unlocked = i < world.save.unlocked;
      const best = world.save.best[q.id];
      ctx.fillStyle = unlocked ? 'rgba(16,22,32,0.88)' : 'rgba(16,22,32,0.55)';
      rr(ctx, x, y, w, h, 14); ctx.fill();
      ctx.strokeStyle = unlocked ? '#c98f2e' : '#555';
      ctx.lineWidth = 2; rr(ctx, x, y, w, h, 14); ctx.stroke();
      ctx.textAlign = 'left';
      ctx.fillStyle = unlocked ? '#ffd27a' : '#888';
      ctx.font = FONT(21, true);
      ctx.fillText(q.name, x + 20, y + 38);
      ctx.fillStyle = '#f2e3c2';
      ctx.font = FONT(15, false);
      const words = this.wrapText(ctx, q.desc, 310);
      words.forEach((ln, li) => ctx.fillText(ln, x + 20, y + 66 + li * 20));
      ctx.fillStyle = '#9adcff';
      ctx.font = FONT(14, true);
      ctx.fillText(`Time limit: ${Math.floor(q.time / 60)}:${String(q.time % 60).padStart(2, '0')}   ·   Best rank: ${best || '—'}`, x + 20, y + 158);
      ctx.fillStyle = '#cfd6e4';
      ctx.font = FONT(13, false);
      ctx.fillText(q.reward, x + 20, y + 184);
      this.button(world, x + 20, y + h - 52, w - 40, 40, unlocked ? `HUNT  [${i + 1}]` : `LOCKED — CLEAR QUEST ${i} FIRST`, () => world.tryStartQuest(i), unlocked, unlocked ? 'green' : null);
    });
    ctx.textAlign = 'center';
    ctx.fillStyle = '#cfd6e4';
    ctx.font = FONT(14, false);
    ctx.fillText('Click a quest or press 1 / 2 / 3. Finish a quest to unlock the next. Rank S needs speed, few hits and broken parts.', VIEW_W / 2, 530);
  }

  drawSmithy(world) {
    const ctx = this.ctx;
    ctx.textAlign = 'left';
    ctx.fillStyle = '#ffd27a';
    ctx.font = FONT(20, true);
    ctx.fillText('SMITHY — forge with carved materials', 90, 268);
    const drawRow = (y, title, cur, next, kind) => {
      ctx.fillStyle = 'rgba(16,22,32,0.88)';
      rr(ctx, 90, y, 1100, 96, 12); ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.font = FONT(19, true);
      ctx.fillText(title, 112, y + 32);
      ctx.fillStyle = '#cfd6e4';
      ctx.font = FONT(15, false);
      ctx.fillText(`Now: ${cur.name}`, 112, y + 58);
      if (!next) {
        ctx.fillStyle = '#7dff9a';
        ctx.font = FONT(15, true);
        ctx.fillText('MAX TIER — the finest steel in Cinderhold.', 112, y + 82);
        return;
      }
      const cost = Object.entries(next.cost).map(([m, n]) => `${MATERIALS[m].name} ${world.matCount(m)}/${n}`).join('  ·  ');
      ctx.fillStyle = world.canCraft(kind, next.tier - 1) ? '#7dff9a' : '#ff9a8a';
      ctx.font = FONT(15, false);
      ctx.fillText(`Next: ${next.name} — ${cost}`, 112, y + 82);
      const idx = next.tier - 1;
      this.button(world, 980, y + 28, 180, 44, 'FORGE', () => world.craft(kind, idx), world.canCraft(kind, idx), 'gold');
    };
    const wNext = WEAPONS[world.save.weapon + 1] || null;
    const aNext = ARMORS[world.save.armor + 1] || null;
    drawRow(290, 'BLADE', WEAPONS[world.save.weapon], wNext, 'weapon');
    drawRow(402, 'ARMOR', ARMORS[world.save.armor], aNext, 'armor');
    ctx.fillStyle = '#cfd6e4';
    ctx.font = FONT(14, false);
    ctx.textAlign = 'center';
    ctx.fillText('Weapons raise swing damage and reach. Armor cuts damage taken and raises max HP. Materials come from carving monsters — broken parts pay extra.', VIEW_W / 2, 530);
  }

  wrapText(ctx, text, maxW) {
    const words = text.split(' ');
    const lines = [];
    let line = '';
    for (const w of words) {
      const test = line ? line + ' ' + w : w;
      if (ctx.measureText(test).width > maxW && line) { lines.push(line); line = w; }
      else line = test;
    }
    if (line) lines.push(line);
    return lines;
  }

  // ---------------- results ----------------
  drawResults(world, input, failed) {
    const ctx = this.ctx;
    this.drawArena(ctx, world);
    if (world.monster) this.drawMonster(ctx, world);
    this.drawParticles(ctx, world);
    ctx.fillStyle = 'rgba(5,8,12,0.66)';
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    const r = world.results || { rank: '—', loot: [], timeUsed: 0, damageTaken: 0, partsBroken: 0, faints: 0 };
    ctx.textAlign = 'center';
    ctx.fillStyle = failed ? '#ff5a4d' : '#ffd27a';
    ctx.font = FONT(52, true);
    ctx.fillText(failed ? 'QUEST FAILED' : 'QUEST COMPLETE!', VIEW_W / 2, 130);
    if (failed) {
      ctx.fillStyle = '#f2e3c2';
      ctx.font = FONT(19, false);
      ctx.fillText(r.reason || '', VIEW_W / 2, 168);
    }
    // Rank.
    ctx.fillStyle = failed ? '#666' : (r.rank === 'S' ? '#ffd27a' : r.rank === 'A' ? '#7dff9a' : '#9adcff');
    ctx.font = FONT(120, true);
    ctx.fillText(r.rank, VIEW_W / 2, 300);
    ctx.fillStyle = '#cfd6e4';
    ctx.font = FONT(16, false);
    const mins = Math.floor(r.timeUsed / 60), secs = String(Math.floor(r.timeUsed % 60)).padStart(2, '0');
    ctx.fillText(`Time ${mins}:${secs}   ·   Damage taken ${r.damageTaken}   ·   Parts broken ${r.partsBroken}   ·   Faints ${r.faints}`, VIEW_W / 2, 340);
    // Loot.
    if (!failed && r.loot.length) {
      ctx.fillStyle = '#ffd27a';
      ctx.font = FONT(19, true);
      ctx.fillText('CARVED MATERIALS', VIEW_W / 2, 392);
      ctx.fillStyle = '#f2e3c2';
      ctx.font = FONT(17, false);
      r.loot.forEach((l, i) => ctx.fillText(`${MATERIALS[l.mat].name} ×${l.n}`, VIEW_W / 2, 424 + i * 26));
    }
    const baseY = failed ? 420 : 424 + r.loot.length * 26 + 30;
    if (!failed) {
      this.button(world, VIEW_W / 2 - 240, baseY, 220, 48, 'RETURN TO VILLAGE', () => world.toHub(), true, 'gold');
      const nextQ = QUESTS[world.questIdx + 1];
      if (nextQ && world.questIdx + 1 < world.save.unlocked) {
        this.button(world, VIEW_W / 2 + 20, baseY, 220, 48, `NEXT QUEST [${world.questIdx + 2}]`, () => world.startQuest(world.questIdx + 1), true, 'green');
      }
    } else {
      this.button(world, VIEW_W / 2 - 240, baseY, 220, 48, 'RETRY QUEST', () => world.startQuest(world.questIdx), true, 'green');
      this.button(world, VIEW_W / 2 + 20, baseY, 220, 48, 'RETURN TO VILLAGE', () => world.toHub(), true, 'gold');
    }
    ctx.fillStyle = '#9aa5b5';
    ctx.font = FONT(14, false);
    ctx.fillText('Press Enter to return to the village', VIEW_W / 2, baseY + 84);
  }

  drawBanners(world) {
    const ctx = this.ctx;
    world.banners.forEach((b, i) => {
      const a = b.t < 0.3 ? b.t / 0.3 : b.t > 1.8 ? (2.4 - b.t) / 0.6 : 1;
      ctx.globalAlpha = clamp(a, 0, 1);
      ctx.fillStyle = b.color;
      ctx.font = FONT(40, true);
      ctx.textAlign = 'center';
      ctx.fillText(b.text, VIEW_W / 2, 190 + i * 52);
    });
    ctx.globalAlpha = 1;
  }
}
