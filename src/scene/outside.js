// 창밖: 비 오는 날의 숲. 안개 낀 능선, 침엽수·활엽수, 흐르는 안개, 비 줄기, 가끔 번개
import * as THREE from 'three';
import { ROOM } from '../../shared/world.js';
import { canvasTexture } from './materials.js';

export function buildOutside(scene) {
  const g = new THREE.Group();
  const Z = ROOM.minZ;
  const GROUND = -13;                      // 숲 바닥: 고층에서 숲 위를 내려다보는 높이
  const MIST = new THREE.Color('#b6c4bf');
  scene.background = MIST.clone();
  scene.fog = new THREE.Fog(MIST, 22, 86); // 방 안(최대 14m)은 영향 없고 숲은 멀수록 안개에 잠긴다

  let seed = 11; const r = () => { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; };

  // 하늘: 흐린 회녹색
  const skyTex = canvasTexture(16, 256, (c, w, h) => {
    const gr = c.createLinearGradient(0, 0, 0, h);
    gr.addColorStop(0, '#8b9da0'); gr.addColorStop(0.55, '#aebdb9'); gr.addColorStop(1, '#c6d2cd');
    c.fillStyle = gr; c.fillRect(0, 0, w, h);
  });
  const sky = new THREE.Mesh(new THREE.PlaneGeometry(260, 120), new THREE.MeshBasicMaterial({ map: skyTex, fog: false }));
  sky.position.set(0, 14, Z - 95); g.add(sky);

  // 겹겹이 능선 (멀수록 옅게)
  const ridge = (z, base, amp, color) => {
    const sh = new THREE.Shape(); const W = 240, n = 60;
    sh.moveTo(-W / 2, -40);
    let ph = r() * 10;
    for (let i = 0; i <= n; i++) {
      const x = -W / 2 + (W * i) / n;
      const y = base + Math.sin(i * 0.21 + ph) * amp + Math.sin(i * 0.57 + ph * 2) * amp * 0.45 + Math.sin(i * 1.3 + ph) * amp * 0.15;
      sh.lineTo(x, y);
    }
    sh.lineTo(W / 2, -40);
    const m = new THREE.Mesh(new THREE.ShapeGeometry(sh), new THREE.MeshBasicMaterial({ color, fog: false }));
    m.position.set(0, 0, z); g.add(m);
  };
  ridge(Z - 92, 12, 7, '#a3b4b0');
  ridge(Z - 84, 5, 6, '#8ba39d');
  ridge(Z - 76, -1, 5, '#718f85');

  // 숲 바닥
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(260, 140), new THREE.MeshLambertMaterial({ color: '#3f5a45' }));
  ground.rotation.x = -Math.PI / 2; ground.position.set(0, GROUND, Z - 60); g.add(ground);

  // 나무: 인스턴스로 한 번에 그린다
  const dummy = new THREE.Object3D(), col = new THREE.Color();
  const greens = ['#2f5a41', '#376648', '#42724f', '#2a4f3c', '#4d7d58', '#3b6a55'];
  const place = (count, make) => { const list = []; for (let i = 0; i < count; i++) list.push(make(i)); return list; };

  // 침엽수: 줄기 + 3단 원뿔
  const NC = 320;
  const conifers = place(NC, () => {
    const z = Z - 13 - Math.pow(r(), 1.2) * 60, x = (r() - 0.5) * (50 + (Z - z) * 1.9);
    const side = Math.abs(x) > 11 && z > Z - 24;            // 창 양옆 가까운 나무만 키가 커서 화면 가장자리를 감싼다
    const h = 8 + r() * 6 + (side ? 5 + r() * 3 : 0);
    return { x, z, h, w: h * (0.2 + r() * 0.07), c: greens[Math.floor(r() * greens.length)], rot: r() * 6.28, lean: (r() - 0.5) * 0.06 };
  });
  const trunkM = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.12, 0.2, 1, 6), new THREE.MeshLambertMaterial({ color: '#4a3b2f' }), NC);
  conifers.forEach((t, i) => { dummy.position.set(t.x, GROUND + t.h * 0.25, t.z); dummy.scale.set(t.h * 0.12, t.h * 0.5, t.h * 0.12); dummy.rotation.set(0, 0, t.lean); dummy.updateMatrix(); trunkM.setMatrixAt(i, dummy.matrix); });
  g.add(trunkM);
  const tiers = [[0.38, 1.0, 0.5], [0.58, 0.78, 0.42], [0.78, 0.55, 0.34]];   // [높이 위치, 폭, 길이] 비율
  for (const [ty, tw, tl] of tiers) {
    const m = new THREE.InstancedMesh(new THREE.ConeGeometry(1, 1, 7), new THREE.MeshLambertMaterial({ color: '#ffffff' }), NC);
    conifers.forEach((t, i) => {
      dummy.position.set(t.x + Math.sin(t.lean) * t.h * ty, GROUND + t.h * ty, t.z); dummy.scale.set(t.w * tw, t.h * tl, t.w * tw); dummy.rotation.set(0, t.rot, t.lean); dummy.updateMatrix();
      m.setMatrixAt(i, dummy.matrix); m.setColorAt(i, col.set(t.c).multiplyScalar(0.9 + ty * 0.25));
    });
    m.instanceColor.needsUpdate = true; g.add(m);
  }

  // 활엽수: 둥근 수관 덩어리
  const NB = 90;
  const broad = place(NB, () => { const z = Z - 15 - r() * 48, x = (r() - 0.5) * (50 + (Z - z) * 1.8); return { x, z, h: 6 + r() * 4, s: 1.3 + r() * 1.0, c: ['#5c8a57', '#6b9560', '#4f7f58', '#7a9c62'][Math.floor(r() * 4)] }; });
  const bTrunk = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.14, 0.22, 1, 6), new THREE.MeshLambertMaterial({ color: '#54443a' }), NB);
  broad.forEach((t, i) => { dummy.position.set(t.x, GROUND + t.h * 0.5, t.z); dummy.scale.set(1.3, t.h, 1.3); dummy.rotation.set(0, 0, 0); dummy.updateMatrix(); bTrunk.setMatrixAt(i, dummy.matrix); });
  g.add(bTrunk);
  const crown = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 1), new THREE.MeshLambertMaterial({ color: '#ffffff', flatShading: true }), NB * 3);
  let ci = 0;
  broad.forEach((t) => { for (let k = 0; k < 3; k++) { dummy.position.set(t.x + (r() - 0.5) * t.s, GROUND + t.h + (r() - 0.2) * t.s * 0.8, t.z + (r() - 0.5) * t.s); const s = t.s * (0.7 + r() * 0.5); dummy.scale.set(s, s * 0.85, s); dummy.rotation.set(r(), r() * 6, r()); dummy.updateMatrix(); crown.setMatrixAt(ci, dummy.matrix); crown.setColorAt(ci, col.set(t.c).multiplyScalar(0.85 + r() * 0.3)); ci++; } });
  crown.instanceColor.needsUpdate = true; g.add(crown);
  [trunkM, bTrunk, crown].forEach(m => { m.frustumCulled = false; });
  g.children.forEach(m => { if (m.isInstancedMesh) m.frustumCulled = false; });

  // 숲 사이를 흐르는 안개 띠
  const mistTex = canvasTexture(256, 64, (c, w, h) => {
    const gr = c.createRadialGradient(w / 2, h / 2, 4, w / 2, h / 2, w / 2);
    gr.addColorStop(0, 'rgba(255,255,255,.75)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
    c.fillStyle = gr; c.fillRect(0, 0, w, h);
  });
  const mists = [];
  for (let i = 0; i < 9; i++) {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(46 + r() * 30, 7 + r() * 5), new THREE.MeshBasicMaterial({ map: mistTex, transparent: true, opacity: 0.32 + r() * 0.25, depthWrite: false, fog: false, color: '#dfe8e4' }));
    m.position.set((r() - 0.5) * 70, GROUND + 6 + r() * 7, Z - 18 - i * 6);
    g.add(m); mists.push({ m, v: (r() < 0.5 ? -1 : 1) * (0.25 + r() * 0.35) });
  }

  // 숲을 비추는 흐린 하늘빛
  const forestLight = new THREE.DirectionalLight('#dfe9e4', 1.1);
  forestLight.position.set(10, 30, Z + 10); forestLight.target.position.set(0, GROUND, Z - 30);
  g.add(forestLight); g.add(forestLight.target);

  // 비: 선분 파티클
  const N = 1800;
  const pos = new Float32Array(N * 6);
  const vel = new Float32Array(N);
  const box = { x0: -16, x1: 16, y0: -8, y1: 10, z0: Z - 1.2, z1: Z - 18 };
  const reset = (i, randomY) => {
    const x = box.x0 + Math.random() * (box.x1 - box.x0);
    const z = box.z0 + Math.random() * (box.z1 - box.z0);
    const y = randomY ? box.y0 + Math.random() * (box.y1 - box.y0) : box.y1;
    const len = 0.35 + Math.random() * 0.5;
    pos.set([x, y, z, x + 0.06, y - len, z], i * 6);
    vel[i] = 9 + Math.random() * 6;
  };
  for (let i = 0; i < N; i++) reset(i, true);
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const rain = new THREE.LineSegments(geo, new THREE.LineBasicMaterial({ color: '#eef4f2', transparent: true, opacity: 0.38, fog: false }));
  rain.frustumCulled = false; g.add(rain);

  // 창으로 들어오는 흐린 낮빛 + 번개
  const windowLight = new THREE.DirectionalLight('#d5e2de', 1.25);
  windowLight.position.set(0, 4, Z - 6); windowLight.target.position.set(0, 0, 2);
  windowLight.castShadow = true;
  windowLight.shadow.mapSize.set(1024, 1024);
  windowLight.shadow.camera.left = -7; windowLight.shadow.camera.right = 7; windowLight.shadow.camera.top = 7; windowLight.shadow.camera.bottom = -7;
  windowLight.shadow.bias = -0.001;
  g.add(windowLight); g.add(windowLight.target);
  const flash = new THREE.AmbientLight('#eef4ff', 0);
  g.add(flash);
  let nextFlash = 14 + Math.random() * 20, flashT = 0;

  scene.add(g);
  return {
    update(dt) {
      for (let i = 0; i < N; i++) {
        const o = i * 6, dy = vel[i] * dt;
        pos[o + 1] -= dy; pos[o + 4] -= dy; pos[o] += dy * 0.08; pos[o + 3] += dy * 0.08;
        if (pos[o + 4] < box.y0) reset(i, false);
      }
      geo.attributes.position.needsUpdate = true;
      for (const q of mists) { q.m.position.x += q.v * dt; if (q.m.position.x > 60) q.m.position.x = -60; else if (q.m.position.x < -60) q.m.position.x = 60; }
      nextFlash -= dt;
      if (nextFlash <= 0) { flashT = 0.18 + Math.random() * 0.15; nextFlash = 18 + Math.random() * 30; }
      if (flashT > 0) { flashT -= dt; flash.intensity = Math.max(0, flashT) * 5 * (Math.random() < 0.7 ? 1 : 0.3); }
      else flash.intensity = 0;
    },
  };
}
