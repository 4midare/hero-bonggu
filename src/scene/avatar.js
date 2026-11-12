// 사람 아바타: 둥근 펠트 인형 느낌. 무릎이 있어 앉을 수 있다.
import * as THREE from 'three';
import { felt, sphere, cyl, box, makeLabel } from './materials.js';

const damp = (a, b, k, dt) => THREE.MathUtils.lerp(a, b, 1 - Math.exp(-k * dt));

export const AVATAR_SCALE = 0.5;   // 사람이 화면을 가리지 않게 절반 크기
const LABEL_K = 0.8 / AVATAR_SCALE; // 이름표·말풍선은 읽을 수 있는 크기로 유지

export function createAvatar(color, name) {
  const g = new THREE.Group(); g.scale.setScalar(AVATAR_SCALE);
  const pose = new THREE.Group(); g.add(pose);         // 앉을 때 전체를 내리는 그룹
  const body = felt(color), skin = felt('#f6d9c3'), hair = felt('#3b2f2f'), pants = felt('#4b5563');
  const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.22, 0.5, 6, 14), body);
  torso.position.y = 0.95; torso.castShadow = true; pose.add(torso);
  const head = sphere(0.21, skin, 0, 1.5, 0); pose.add(head);
  const hairM = sphere(0.215, hair, 0, 1.56, -0.03); hairM.scale.set(1, 0.75, 1); pose.add(hairM);
  pose.add(sphere(0.025, felt('#1c1c1c'), -0.07, 1.52, 0.18, 8, 6)); pose.add(sphere(0.025, felt('#1c1c1c'), 0.07, 1.52, 0.18, 8, 6));
  const arms = [], thighs = [], shins = [];
  for (const s of [-1, 1]) {
    const a = new THREE.Group(); a.position.set(s * 0.28, 1.22, 0);
    const am = new THREE.Mesh(new THREE.CapsuleGeometry(0.07, 0.4, 4, 10), body); am.position.y = -0.25; am.castShadow = true; a.add(am);
    a.add(sphere(0.07, skin, 0, -0.5, 0, 10, 8));
    pose.add(a); arms.push(a);
    // 허벅지(엉덩이 피벗) → 정강이(무릎 피벗)
    const th = new THREE.Group(); th.position.set(s * 0.11, 0.62, 0);
    const thm = new THREE.Mesh(new THREE.CapsuleGeometry(0.09, 0.16, 4, 10), pants); thm.position.y = -0.14; thm.castShadow = true; th.add(thm);
    const sh = new THREE.Group(); sh.position.y = -0.3;
    const shm = new THREE.Mesh(new THREE.CapsuleGeometry(0.08, 0.16, 4, 10), pants); shm.position.y = -0.14; shm.castShadow = true; sh.add(shm);
    sh.add(box(0.17, 0.08, 0.24, felt('#2d3340'), 0, -0.28, 0.04));
    th.add(sh); pose.add(th); thighs.push(th); shins.push(sh);
  }
  // 손에 든 간식 (뼈다귀)
  const treat = new THREE.Group(); treat.position.set(0, -0.52, 0.08); treat.visible = false;
  const bone = felt('#f5e6c8');
  const b1 = cyl(0.02, 0.02, 0.16, bone, 0, 0, 0, 8); b1.rotation.z = Math.PI / 2; treat.add(b1);
  for (const [x, y] of [[-0.08, 0.025], [-0.08, -0.025], [0.08, 0.025], [0.08, -0.025]]) treat.add(sphere(0.03, bone, x, y, 0, 8, 6));
  arms[1].add(treat);

  const label = makeLabel(name); label.scale.multiplyScalar(LABEL_K); label.position.y = 2.05; g.add(label);
  let bubble = null, bubbleT = 0;

  const st = { t: Math.random() * 5 };
  let flickT = 0, hitT = 0;
  function update(dt, anim, treatOn) {
    st.t += dt;
    const sitting = anim === 'sit' || anim === 'floor';
    const moving = anim === 'walk' || anim === 'run', k = anim === 'run' ? 13 : 9;
    const amp = moving ? (anim === 'run' ? 0.9 : 0.6) : 0;
    const kd = 1 - Math.exp(-12 * dt);
    arms[0].rotation.x = damp(arms[0].rotation.x, sitting ? -0.3 : Math.sin(st.t * k) * amp, 12, dt);
    arms[1].rotation.x = damp(arms[1].rotation.x, treatOn ? -1.3 : sitting ? -0.3 : -Math.sin(st.t * k) * amp, 12, dt);
    // 앉기: 소파는 무릎을 굽히고, 바닥은 다리를 쭉 편다
    const thighX = anim === 'sit' ? -1.5 : anim === 'floor' ? -1.45 : 0;
    const shinX = anim === 'sit' ? 1.5 : anim === 'floor' ? 0.15 : 0;
    for (let i = 0; i < 2; i++) {
      const swing = moving ? (i ? 1 : -1) * Math.sin(st.t * k) * amp : 0;
      thighs[i].rotation.x += (thighX + swing - thighs[i].rotation.x) * kd;
      shins[i].rotation.x += (shinX + (moving ? Math.max(0, -swing) * 0.8 : 0) - shins[i].rotation.x) * kd;
    }
    const poseY = anim === 'floor' ? -0.5 : anim === 'sit' ? -0.17 : 0;
    pose.position.y += (poseY - pose.position.y) * kd;
    label.position.y = 2.05 + pose.position.y;
    torso.position.y = 0.95 + (moving ? Math.abs(Math.sin(st.t * k)) * 0.03 : Math.sin(st.t * 2) * 0.006);
    treat.visible = !!treatOn;
    // 딱밤: 때리는 쪽은 팔을 휘두르고, 맞는 쪽은 뒤로 휘청
    if (flickT > 0) { flickT -= dt; const q = 1 - Math.max(0, flickT) / 0.35; arms[1].rotation.x = -1.2 - Math.sin(q * Math.PI) * 1.1; }
    if (hitT > 0) { hitT -= dt; const q = Math.max(0, hitT) / 0.7; pose.rotation.x = -Math.sin((1 - q) * Math.PI * 3) * 0.3 * q; head.position.z = -0.06 * q; }
    else { pose.rotation.x = 0; head.position.z = 0; }
    if (bubble) { bubble.position.y = 2.6 + pose.position.y; bubbleT -= dt; if (bubbleT <= 0) { g.remove(bubble); bubble.material.map.dispose(); bubble.material.dispose(); bubble = null; } }
  }
  function say(text) {
    if (bubble) { g.remove(bubble); bubble.material.map.dispose(); bubble.material.dispose(); }
    bubble = makeLabel(text, { bg: 'rgba(255,255,255,.94)', fg: '#1f2933', size: 26 });
    bubble.scale.multiplyScalar(LABEL_K); bubble.position.y = 2.6; g.add(bubble); bubbleT = 5;
  }
  return { mesh: g, update, say, flick() { flickT = 0.35; }, hit() { hitT = 0.7; } };
}
