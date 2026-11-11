// 사람 아바타: 둥근 펠트 인형 느낌
import * as THREE from 'three';
import { felt, sphere, cyl, box, makeLabel } from './materials.js';

const damp = (a, b, k, dt) => THREE.MathUtils.lerp(a, b, 1 - Math.exp(-k * dt));

export function createAvatar(color, name) {
  const g = new THREE.Group();
  const body = felt(color), skin = felt('#f6d9c3'), hair = felt('#3b2f2f');
  const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.22, 0.5, 6, 14), body);
  torso.position.y = 0.95; torso.castShadow = true; g.add(torso);
  const head = sphere(0.21, skin, 0, 1.5, 0); g.add(head);
  const hairM = sphere(0.215, hair, 0, 1.56, -0.03); hairM.scale.set(1, 0.75, 1); g.add(hairM);
  g.add(sphere(0.025, felt('#1c1c1c'), -0.07, 1.52, 0.18, 8, 6)); g.add(sphere(0.025, felt('#1c1c1c'), 0.07, 1.52, 0.18, 8, 6));
  const arms = [], legs = [];
  for (const s of [-1, 1]) {
    const a = new THREE.Group(); a.position.set(s * 0.28, 1.22, 0);
    const am = new THREE.Mesh(new THREE.CapsuleGeometry(0.07, 0.4, 4, 10), body); am.position.y = -0.25; am.castShadow = true; a.add(am);
    a.add(sphere(0.07, skin, 0, -0.5, 0, 10, 8));
    g.add(a); arms.push(a);
    const l = new THREE.Group(); l.position.set(s * 0.11, 0.62, 0);
    const lm = new THREE.Mesh(new THREE.CapsuleGeometry(0.09, 0.4, 4, 10), felt('#4b5563')); lm.position.y = -0.3; lm.castShadow = true; l.add(lm);
    l.add(box(0.17, 0.08, 0.24, felt('#2d3340'), 0, -0.56, 0.04));
    g.add(l); legs.push(l);
  }
  // 손에 든 간식 (뼈다귀)
  const treat = new THREE.Group(); treat.position.set(0, -0.52, 0.08); treat.visible = false;
  const bone = felt('#f5e6c8');
  const b1 = cyl(0.02, 0.02, 0.16, bone, 0, 0, 0, 8); b1.rotation.z = Math.PI / 2; treat.add(b1);
  for (const [x, y] of [[-0.08, 0.025], [-0.08, -0.025], [0.08, 0.025], [0.08, -0.025]]) treat.add(sphere(0.03, bone, x, y, 0, 8, 6));
  arms[1].add(treat);

  const label = makeLabel(name); label.position.y = 1.95; g.add(label);
  let bubble = null, bubbleT = 0;

  const st = { t: Math.random() * 5 };
  function update(dt, anim, treatOn) {
    st.t += dt;
    const moving = anim !== 'idle', k = anim === 'run' ? 13 : 9;
    const amp = moving ? (anim === 'run' ? 0.9 : 0.6) : 0;
    arms[0].rotation.x = damp(arms[0].rotation.x, Math.sin(st.t * k) * amp, 12, dt);
    arms[1].rotation.x = damp(arms[1].rotation.x, treatOn ? -1.3 : -Math.sin(st.t * k) * amp, 12, dt);
    legs[0].rotation.x = damp(legs[0].rotation.x, -Math.sin(st.t * k) * amp, 12, dt);
    legs[1].rotation.x = damp(legs[1].rotation.x, Math.sin(st.t * k) * amp, 12, dt);
    g.children.forEach(() => {});
    torso.position.y = 0.95 + (moving ? Math.abs(Math.sin(st.t * k)) * 0.03 : Math.sin(st.t * 2) * 0.006);
    treat.visible = !!treatOn;
    if (bubble) { bubbleT -= dt; if (bubbleT <= 0) { g.remove(bubble); bubble.material.map.dispose(); bubble.material.dispose(); bubble = null; } }
  }
  function say(text) {
    if (bubble) { g.remove(bubble); bubble.material.map.dispose(); bubble.material.dispose(); }
    bubble = makeLabel(text, { bg: 'rgba(255,255,255,.94)', fg: '#1f2933', size: 26 });
    bubble.position.y = 2.3; g.add(bubble); bubbleT = 5;
  }
  return { mesh: g, update, say };
}
