// Emberhorn Hunt — main.js
// One job: boot the game. Normal play runs a fixed-timestep loop; a
// `?shot=<name>&seed=N` URL freezes a deterministic staged scene for
// screenshots and sets window.__shotReady once it is painted.

import { World } from './src/world.js';
import { Renderer } from './src/render.js';
import { Input } from './src/input.js';
import { AudioEngine } from './src/audio.js';
import { applyShot } from './src/shots.js';
import { SAVE_KEY } from './src/config.js';

const canvas = document.getElementById('game');
const input = new Input(canvas);
const audio = new AudioEngine();
const world = new World(canvas, input, audio, SAVE_KEY);
const renderer = new Renderer(canvas);

window.__game = { world, input, audio, renderer };

const params = new URLSearchParams(location.search);
const shot = params.get('shot');
const seed = parseInt(params.get('seed') || '7', 10);

if (shot) {
  applyShot(world, shot, Number.isFinite(seed) ? seed : 7);
  renderer.draw(world, input);
  // Canvas 2D painting is synchronous, so the frame is ready immediately.
  window.__shotReady = true;
  document.title = `SHOT:${shot}:READY`;
} else {
  const unlock = () => audio.ensure();
  window.addEventListener('pointerdown', unlock, { once: true });
  window.addEventListener('keydown', unlock, { once: true });

  let last = performance.now();
  let acc = 0;
  function frame(now) {
    const dt = Math.min(0.1, (now - last) / 1000);
    last = now;
    acc += dt;
    let steps = 0;
    while (acc >= 1 / 60 && steps < 5) {
      world.update(1 / 60, input);
      acc -= 1 / 60;
      steps++;
    }
    if (steps === 5) acc = 0;
    renderer.draw(world, input);
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}
