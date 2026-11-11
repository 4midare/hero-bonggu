// 하트·물음표 같은 짧은 이펙트
import * as THREE from 'three';
import { canvasTexture } from './materials.js';

export function createEffects(scene) {
  const texOf = {};
  const tex = (ch) => texOf[ch] || (texOf[ch] = canvasTexture(64, 64, (c) => { c.font = '52px serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(ch, 32, 36); }));
  const live = [];
  function spawn(pos, ch, n = 1) {
    for (let i = 0; i < n; i++) {
      const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex(ch), transparent: true, depthWrite: false }));
      s.position.set(pos.x + (Math.random() - 0.5) * 0.3, pos.y + 0.2 + Math.random() * 0.15, pos.z + (Math.random() - 0.5) * 0.3);
      s.scale.setScalar(0.22 + Math.random() * 0.1);
      scene.add(s); live.push({ s, t: 1.2 + Math.random() * 0.4, vx: (Math.random() - 0.5) * 0.3 });
    }
  }
  function update(dt) {
    for (let i = live.length - 1; i >= 0; i--) {
      const e = live[i]; e.t -= dt;
      e.s.position.y += dt * 0.7; e.s.position.x += e.vx * dt;
      e.s.material.opacity = Math.min(1, e.t);
      if (e.t <= 0) { scene.remove(e.s); e.s.material.dispose(); live.splice(i, 1); }
    }
  }
  return { spawn, update };
}
