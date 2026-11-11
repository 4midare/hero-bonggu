// 히로(장모 치와와)·봉구(대플 닥스훈트) 절차 생성 메시 + 상태별 포즈 애니메이션
// 사진(양모펠트 인형)의 특징을 옮긴다: 큰 반짝이는 눈, 웃는 입, 풍성한 털, 펠트 질감.
import * as THREE from 'three';
import { felt, sphere, cyl, canvasTexture } from './materials.js';

const lerp = THREE.MathUtils.lerp;
const damp = (a, b, k, dt) => lerp(a, b, 1 - Math.exp(-k * dt));

// 펠트 섬유 느낌의 밝은 노이즈 (color 와 곱해짐)
let feltTex = null;
function feltTexture() {
  if (feltTex) return feltTex;
  feltTex = canvasTexture(256, 256, (c, w, h) => {
    c.fillStyle = '#f4f4f4'; c.fillRect(0, 0, w, h);
    for (let i = 0; i < 9000; i++) {
      const v = 200 + Math.floor(Math.random() * 56);
      c.strokeStyle = `rgba(${v},${v},${v},0.55)`;
      const x = Math.random() * w, y = Math.random() * h, a = Math.random() * Math.PI;
      c.beginPath(); c.moveTo(x, y); c.lineTo(x + Math.cos(a) * 3, y + Math.sin(a) * 3); c.stroke();
    }
  }, [2, 2]);
  return feltTex;
}
const fur = (color) => new THREE.MeshStandardMaterial({ color, map: feltTexture(), roughness: 1, metalness: 0 });
const glossy = (color) => new THREE.MeshStandardMaterial({ color, roughness: 0.25, metalness: 0 });

function merleTexture() {
  return canvasTexture(512, 512, (c, w, h) => {
    c.fillStyle = '#55585e'; c.fillRect(0, 0, w, h);
    const blob = (col, n, rmin, rmax, alpha) => {
      for (let i = 0; i < n; i++) {
        c.fillStyle = col; c.globalAlpha = alpha * (0.6 + Math.random() * 0.4);
        c.beginPath();
        c.ellipse(Math.random() * w, Math.random() * h, rmin + Math.random() * (rmax - rmin), rmin * 0.6 + Math.random() * (rmax - rmin) * 0.6, Math.random() * Math.PI, 0, Math.PI * 2);
        c.fill();
      }
    };
    blob('#a3a6ad', 70, 14, 46, 0.95);   // 밝은 회색 얼룩 (대플)
    blob('#2c2d31', 55, 10, 36, 0.9);    // 검은 얼룩
    blob('#b9bcc2', 40, 4, 14, 0.8);     // 작은 밝은 점
    c.globalAlpha = 1;
    for (let i = 0; i < 2500; i++) { c.fillStyle = Math.random() < 0.5 ? '#232428' : '#c6c9ce'; c.fillRect(Math.random() * w, Math.random() * h, 2, 2); }
  });
}

// 눈: 크고 까맣고 반짝이는 눈 (하이라이트 2개)
function eye(parent, x, y, z, r) {
  const e = sphere(r, glossy('#111111'), x, y, z, 16, 12); e.castShadow = false; parent.add(e);
  const h1 = sphere(r * 0.34, new THREE.MeshBasicMaterial({ color: '#ffffff' }), x + r * 0.35, y + r * 0.4, z + r * 0.75, 8, 6); h1.castShadow = false; parent.add(h1);
  const h2 = sphere(r * 0.16, new THREE.MeshBasicMaterial({ color: '#ffffff' }), x - r * 0.3, y - r * 0.35, z + r * 0.8, 8, 6); h2.castShadow = false; parent.add(h2);
}

// 다리: 엉덩이 피벗 그룹
function leg(r, h, mat, x, y, z, pawMat) {
  const g = new THREE.Group(); g.position.set(x, y, z);
  g.add(cyl(r, r * 0.95, h, mat, 0, -h / 2, 0, 12));
  g.add(sphere(r * 1.25, pawMat || mat, 0, -h, 0.015, 12, 10));
  return g;
}

function buildHero() {
  const cream = fur('#f1dcb8'), white = fur('#fff9f0'), pink = felt('#f0a8ad');
  const g = new THREE.Group(), pose = new THREE.Group(); g.add(pose);

  // 몸통: 둥글고 앞가슴이 풍성
  const body = sphere(0.15, cream, 0, 0.22, -0.02); body.scale.set(1, 0.95, 1.25); pose.add(body);
  const ruff = sphere(0.13, white, 0, 0.2, 0.12); ruff.scale.set(1.05, 1, 0.9); pose.add(ruff);
  for (const [x, y, z] of [[-0.1, 0.3, 0.08], [0.1, 0.3, 0.08], [0, 0.12, 0.17], [-0.08, 0.14, 0.14], [0.08, 0.14, 0.14]]) pose.add(sphere(0.055, white, x, y, z, 10, 8));

  // 머리: 사과 머리 + 흰 얼굴
  const head = new THREE.Group(); head.position.set(0, 0.4, 0.13); pose.add(head);
  head.add(sphere(0.15, cream, 0, 0.01, -0.01));
  const face = sphere(0.135, white, 0, -0.03, 0.05); face.scale.set(0.98, 0.9, 0.95); head.add(face);
  const muz = sphere(0.062, white, 0, -0.07, 0.15); muz.scale.set(1.15, 0.8, 1); head.add(muz);
  head.add(sphere(0.03, glossy('#2a1f1f'), 0, -0.05, 0.2, 10, 8));                      // 코
  const mouth = sphere(0.028, felt('#3a2323'), 0, -0.105, 0.165, 10, 8); mouth.scale.set(1.5, 0.6, 0.8); head.add(mouth);  // 웃는 입
  const tongue = sphere(0.02, felt('#f08a95'), 0, -0.115, 0.185, 10, 8); tongue.scale.set(1, 0.6, 1.2); head.add(tongue);
  eye(head, -0.062, 0.02, 0.115, 0.04); eye(head, 0.062, 0.02, 0.115, 0.04);
  // 눈가·이마 크림 무늬
  const blaze = sphere(0.05, cream, 0, 0.1, 0.1); blaze.scale.set(0.5, 1.2, 0.7); head.add(blaze);

  // 귀: 크고 쫑긋, 긴 털 술 + 분홍 안쪽
  const ears = [];
  for (const s of [-1, 1]) {
    const e = new THREE.Group(); e.position.set(s * 0.1, 0.1, -0.02); e.rotation.z = -s * 0.55; e.rotation.x = -0.12;
    const outer = new THREE.Mesh(new THREE.ConeGeometry(0.085, 0.22, 18), cream); outer.scale.z = 0.42; outer.position.y = 0.1; outer.castShadow = true; e.add(outer);
    const inner = new THREE.Mesh(new THREE.ConeGeometry(0.052, 0.15, 14), pink); inner.scale.z = 0.4; inner.position.set(0, 0.085, 0.022); e.add(inner);
    const fringe = sphere(0.055, cream, -s * 0.045, 0.02, 0, 10, 8); fringe.scale.set(1, 1.3, 0.6); e.add(fringe);   // 귀 아래 긴 털
    const tuft = sphere(0.035, white, -s * 0.03, -0.05, 0.01, 8, 6); e.add(tuft);
    head.add(e); ears.push(e);
  }

  const legs = [leg(0.032, 0.14, cream, -0.075, 0.16, 0.1, white), leg(0.032, 0.14, cream, 0.075, 0.16, 0.1, white), leg(0.032, 0.14, cream, -0.075, 0.16, -0.1, white), leg(0.032, 0.14, cream, 0.075, 0.16, -0.1, white)];
  legs.forEach(l => pose.add(l));

  // 꼬리: 등 위로 말린 깃털 꼬리
  const tail = new THREE.Group(); tail.position.set(0, 0.32, -0.18); tail.rotation.x = -1.3;
  tail.add(cyl(0.02, 0.035, 0.12, cream, 0, 0.06, 0, 8));
  const plume = sphere(0.06, white, 0, 0.14, 0, 10, 8); plume.scale.set(1, 1.4, 0.8); tail.add(plume);
  tail.add(sphere(0.04, white, 0, 0.2, 0.02, 8, 6));
  pose.add(tail);
  return { g, pose, head, legs, tail, ears, size: { low: 0.11, sitTilt: -0.4 } };
}

function buildBonggu() {
  const merle = new THREE.MeshStandardMaterial({ map: merleTexture(), roughness: 1 });
  const tan = fur('#c88a4e'), tanLight = fur('#d9a36a');
  const g = new THREE.Group(), pose = new THREE.Group(); g.add(pose);

  // 몸통: 길고 낮은 소시지 + 황갈 가슴
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.135, 0.44, 8, 16), merle);
  body.rotation.x = Math.PI / 2; body.position.set(0, 0.2, 0); body.castShadow = true; body.receiveShadow = true; pose.add(body);
  const chest = sphere(0.085, tan, 0, 0.13, 0.22); chest.scale.set(1.1, 0.8, 0.8); pose.add(chest);

  // 머리 + 긴 주둥이
  const head = new THREE.Group(); head.position.set(0, 0.33, 0.3); pose.add(head);
  head.add(sphere(0.125, merle, 0, 0, 0));
  const snout = new THREE.Mesh(new THREE.CapsuleGeometry(0.052, 0.15, 6, 12), merle); snout.rotation.x = Math.PI / 2; snout.position.set(0, -0.03, 0.15); snout.castShadow = true; head.add(snout);
  const jaw = new THREE.Mesh(new THREE.CapsuleGeometry(0.045, 0.13, 6, 12), tan); jaw.rotation.x = Math.PI / 2; jaw.position.set(0, -0.065, 0.14); head.add(jaw);
  head.add(sphere(0.034, glossy('#141414'), 0, -0.01, 0.245, 12, 10));                 // 코
  const mouth = sphere(0.02, felt('#3a2323'), 0, -0.07, 0.22, 8, 6); mouth.scale.set(1.6, 0.5, 0.8); head.add(mouth);
  eye(head, -0.055, 0.04, 0.1, 0.037); eye(head, 0.055, 0.04, 0.1, 0.037);
  // 황갈색 눈썹 점·볼
  for (const s of [-1, 1]) {
    const brow = sphere(0.022, tanLight, s * 0.058, 0.095, 0.085, 8, 6); brow.scale.set(1.3, 0.8, 0.8); head.add(brow);
    const cheek = sphere(0.03, tan, s * 0.085, -0.045, 0.1, 8, 6); cheek.scale.set(0.6, 1, 1.2); head.add(cheek);
  }
  // 늘어진 귀: 넓고 둥글게 떨어지는 플랩
  const ears = [];
  for (const s of [-1, 1]) {
    const e = new THREE.Group(); e.position.set(s * 0.1, 0.06, -0.02);
    const flap = new THREE.Mesh(new THREE.CapsuleGeometry(0.05, 0.12, 6, 12), merle);
    flap.scale.set(1, 1, 0.35); flap.position.set(s * 0.02, -0.1, 0); flap.rotation.z = s * 0.25; flap.rotation.x = 0.15; flap.castShadow = true; e.add(flap);
    head.add(e); ears.push(e);
  }

  const legs = [leg(0.036, 0.1, merle, -0.085, 0.11, 0.2, tan), leg(0.036, 0.1, merle, 0.085, 0.11, 0.2, tan), leg(0.036, 0.1, merle, -0.085, 0.11, -0.2, tan), leg(0.036, 0.1, merle, 0.085, 0.11, -0.2, tan)];
  legs.forEach(l => pose.add(l));

  const tail = new THREE.Group(); tail.position.set(0, 0.27, -0.34); tail.rotation.x = -0.9;
  tail.add(cyl(0.012, 0.03, 0.22, merle, 0, 0.11, 0, 8));
  tail.add(sphere(0.02, tan, 0, 0.02, 0.0, 8, 6));
  pose.add(tail);
  return { g, pose, head, legs, tail, ears, size: { low: 0.1, sitTilt: -0.3 } };
}

export function createDog(id) {
  const d = id === 'hero' ? buildHero() : buildBonggu();
  d.g.scale.setScalar(0.9);
  d.g.traverse(o => { if (o.isMesh && o.castShadow !== false) { o.castShadow = true; o.receiveShadow = true; } });
  const st = { time: Math.random() * 10, headX: 0, poseY: 0, tilt: 0, legFold: 0 };
  d.g.userData.dogId = id;

  function update(dt, state, moving) {
    st.time += dt;
    const t = st.time;
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
    d.head.rotation.z = state === 'beg' || state === 'happy' ? Math.sin(t * 3) * 0.12 : 0;   // 고개 갸웃
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
    d.tail.rotation.z = Math.sin(t * wag) * (wag > 10 ? 0.6 : 0.3);
    d.ears.forEach((e, i) => { e.rotation.y = Math.sin(t * 2 + i) * (0.08 + earTw) * (state === 'sleep' ? 0.3 : 1); });
  }
  return { id, mesh: d.g, head: d.head, update };
}
