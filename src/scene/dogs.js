// 히로(치와와)·봉구(닥스훈트) 절차 생성 메시 + 상태별 포즈 애니메이션
import * as THREE from 'three';
import { felt, sphere, cyl, canvasTexture } from './materials.js';

const lerp = THREE.MathUtils.lerp;
const damp = (a, b, k, dt) => lerp(a, b, 1 - Math.exp(-k * dt));

// 다리: 엉덩이에 피벗을 두는 그룹
function leg(r, h, mat, x, y, z, pawMat) {
  const g = new THREE.Group(); g.position.set(x, y, z);
  const m = cyl(r, r * 0.9, h, mat, 0, -h / 2, 0, 10); g.add(m);
  if (pawMat) g.add(sphere(r * 1.15, pawMat, 0, -h, 0.01, 10, 8));
  return g;
}

function merleTexture() {
  return canvasTexture(256, 256, (c, w, h) => {
    c.fillStyle = '#3f4147'; c.fillRect(0, 0, w, h);
    for (let i = 0; i < 90; i++) {
      c.fillStyle = Math.random() < 0.6 ? '#8f939a' : '#60646b';
      c.globalAlpha = 0.5 + Math.random() * 0.5;
      c.beginPath(); c.ellipse(Math.random() * w, Math.random() * h, 6 + Math.random() * 18, 4 + Math.random() * 12, Math.random() * Math.PI, 0, Math.PI * 2); c.fill();
    }
    c.globalAlpha = 1;
    for (let i = 0; i < 400; i++) { c.fillStyle = Math.random() < 0.5 ? '#2c2e33' : '#a7aab0'; c.fillRect(Math.random() * w, Math.random() * h, 2, 2); }
  });
}

function buildHero() {
  const cream = felt('#f3dfc0'), white = felt('#fff8ee'), pink = felt('#f1b3b3');
  const dark = felt('#1c1c1c', { roughness: 0.4 });
  const g = new THREE.Group(), pose = new THREE.Group(); g.add(pose);
  const body = sphere(0.14, cream, 0, 0.21, 0); body.scale.set(1, 0.95, 1.3); pose.add(body);
  pose.add(sphere(0.11, white, 0, 0.19, 0.1));                          // 가슴털
  const head = new THREE.Group(); head.position.set(0, 0.36, 0.13); pose.add(head);
  head.add(sphere(0.135, cream, 0, 0, 0));
  const face = sphere(0.1, white, 0, -0.01, 0.07); face.scale.set(1, 0.9, 0.9); head.add(face);
  const muz = sphere(0.055, white, 0, -0.04, 0.13); muz.scale.set(1.1, 0.8, 1); head.add(muz);
  head.add(sphere(0.025, dark, 0, -0.025, 0.18, 10, 8));                // 코
  head.add(sphere(0.03, dark, -0.055, 0.025, 0.11, 10, 8)); head.add(sphere(0.03, dark, 0.055, 0.025, 0.11, 10, 8));
  const ears = [];
  for (const s of [-1, 1]) {
    const e = new THREE.Group(); e.position.set(s * 0.09, 0.1, -0.02); e.rotation.z = -s * 0.5; e.rotation.x = -0.15;
    const outer = new THREE.Mesh(new THREE.ConeGeometry(0.075, 0.19, 14), cream); outer.scale.z = 0.45; outer.position.y = 0.08; outer.castShadow = true; e.add(outer);
    const inner = new THREE.Mesh(new THREE.ConeGeometry(0.045, 0.13, 12), pink); inner.scale.z = 0.4; inner.position.set(0, 0.075, 0.025); e.add(inner);
    head.add(e); ears.push(e);
  }
  const legs = [leg(0.03, 0.14, cream, -0.07, 0.15, 0.1), leg(0.03, 0.14, cream, 0.07, 0.15, 0.1), leg(0.03, 0.14, cream, -0.07, 0.15, -0.1), leg(0.03, 0.14, cream, 0.07, 0.15, -0.1)];
  legs.forEach(l => pose.add(l));
  const tail = new THREE.Group(); tail.position.set(0, 0.3, -0.17); tail.rotation.x = -1.0;
  const t1 = cyl(0.02, 0.035, 0.14, cream, 0, 0.07, 0, 8); tail.add(t1); tail.add(sphere(0.05, white, 0, 0.14, 0, 10, 8));
  pose.add(tail);
  return { g, pose, head, legs, tail, ears, size: { low: 0.1, sitTilt: -0.38 } };
}

function buildBonggu() {
  const tex = merleTexture();
  const merle = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.95 });
  const tan = felt('#c08a4a'), dark = felt('#1c1c1c', { roughness: 0.4 });
  const g = new THREE.Group(), pose = new THREE.Group(); g.add(pose);
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.13, 0.42, 6, 14), merle);
  body.rotation.x = Math.PI / 2; body.position.set(0, 0.2, 0); body.castShadow = true; body.receiveShadow = true; pose.add(body);
  const chest = sphere(0.09, tan, 0, 0.14, 0.2); chest.scale.set(1, 0.8, 0.8); pose.add(chest);
  const head = new THREE.Group(); head.position.set(0, 0.32, 0.3); pose.add(head);
  head.add(sphere(0.12, merle, 0, 0, 0));
  const snout = new THREE.Mesh(new THREE.CapsuleGeometry(0.05, 0.12, 4, 10), merle); snout.rotation.x = Math.PI / 2; snout.position.set(0, -0.03, 0.13); snout.castShadow = true; head.add(snout);
  const snoutTan = new THREE.Mesh(new THREE.CapsuleGeometry(0.045, 0.1, 4, 10), tan); snoutTan.rotation.x = Math.PI / 2; snoutTan.position.set(0, -0.06, 0.13); head.add(snoutTan);
  head.add(sphere(0.03, dark, 0, -0.01, 0.215, 10, 8));
  head.add(sphere(0.028, dark, -0.05, 0.035, 0.095, 10, 8)); head.add(sphere(0.028, dark, 0.05, 0.035, 0.095, 10, 8));
  head.add(sphere(0.018, tan, -0.055, 0.08, 0.09, 8, 6)); head.add(sphere(0.018, tan, 0.055, 0.08, 0.09, 8, 6)); // 눈썹
  const ears = [];
  for (const s of [-1, 1]) {
    const e = new THREE.Group(); e.position.set(s * 0.1, 0.05, -0.01);
    const flap = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.17, 0.09), merle); flap.position.y = -0.08; flap.rotation.z = s * 0.18; flap.castShadow = true; e.add(flap);
    head.add(e); ears.push(e);
  }
  const legs = [leg(0.035, 0.1, merle, -0.08, 0.11, 0.2, tan), leg(0.035, 0.1, merle, 0.08, 0.11, 0.2, tan), leg(0.035, 0.1, merle, -0.08, 0.11, -0.2, tan), leg(0.035, 0.1, merle, 0.08, 0.11, -0.2, tan)];
  legs.forEach(l => pose.add(l));
  const tail = new THREE.Group(); tail.position.set(0, 0.26, -0.33); tail.rotation.x = -0.9;
  tail.add(cyl(0.012, 0.028, 0.2, merle, 0, 0.1, 0, 8));
  pose.add(tail);
  return { g, pose, head, legs, tail, ears, size: { low: 0.1, sitTilt: -0.3 } };
}

export function createDog(id) {
  const d = id === 'hero' ? buildHero() : buildBonggu();
  d.g.scale.setScalar(0.85);
  d.g.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  const st = { time: Math.random() * 10, state: 'idle', moving: false, headX: 0, poseY: 0, tilt: 0, legFold: 0, hop: 0, ry: 0 };
  d.g.userData.dogId = id;

  function update(dt, state, moving) {
    st.time += dt;
    const t = st.time;
    // 목표 포즈
    let headX = 0, poseY = 0, tilt = 0, legFold = 0, wag = 4, hop = 0, earTw = 0;
    switch (state) {
      case 'sit':   tilt = d.size.sitTilt; poseY = -0.03; legFold = 1; wag = 7; break;
      case 'down':  poseY = -d.size.low; legFold = 2; headX = 0.1; wag = 3; break;
      case 'sleep': poseY = -d.size.low; legFold = 2; headX = 0.35; wag = 0.6; break;
      case 'eat':   headX = 0.75 + Math.sin(t * 7) * 0.12; wag = 9; break;
      case 'beg':   headX = -0.45; wag = 16; earTw = 0.2; break;
      case 'happy': hop = Math.abs(Math.sin(t * 11)) * 0.07; wag = 20; headX = -0.2; break;
      case 'approach': wag = 14; break;
      default: wag = moving ? 8 : 3 + Math.sin(t * 0.7) * 2;
    }
    st.headX = damp(st.headX, headX, 8, dt);
    st.poseY = damp(st.poseY, poseY, 8, dt);
    st.tilt = damp(st.tilt, tilt, 8, dt);
    st.legFold = damp(st.legFold, legFold, 8, dt);
    d.pose.position.y = st.poseY + hop + (state === 'idle' || state === 'sleep' ? Math.sin(t * (state === 'sleep' ? 1.6 : 2.4)) * 0.006 : 0);
    d.pose.rotation.x = st.tilt;
    d.head.rotation.x = st.headX + (state === 'idle' ? Math.sin(t * 1.3) * 0.05 : 0);
    d.head.rotation.y = state === 'idle' ? Math.sin(t * 0.9) * 0.25 : 0;
    // 다리
    for (let i = 0; i < 4; i++) {
      const L = d.legs[i];
      let rx = 0;
      if (moving) rx = Math.sin(t * 13 + (i % 2 ? Math.PI : 0) + (i > 1 ? Math.PI : 0)) * 0.7;
      if (state === 'beg' && i < 2) rx = i === 0 ? Math.max(0, Math.sin(t * 6)) * -1.2 : Math.max(0, -Math.sin(t * 6)) * -1.2;
      if (st.legFold > 0.01) {
        const fold = st.legFold >= 1 ? (i > 1 ? 1.35 : (st.legFold - 1) * 1.4) : st.legFold * (i > 1 ? 1.35 : 0);
        rx = lerp(rx, i > 1 ? fold : -fold, Math.min(1, st.legFold));
      }
      L.rotation.x = damp(L.rotation.x, rx, 14, dt);
    }
    if (moving) d.pose.position.y += Math.abs(Math.sin(t * 13)) * 0.015;
    // 꼬리·귀
    d.tail.rotation.z = Math.sin(t * wag) * (wag > 10 ? 0.6 : 0.3);
    d.ears.forEach((e, i) => { e.rotation.y = Math.sin(t * 2 + i) * (0.08 + earTw) * (state === 'sleep' ? 0.3 : 1); });
    st.state = state; st.moving = moving;
  }
  return { id, mesh: d.g, head: d.head, update };
}
