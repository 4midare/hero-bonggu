// 창밖: 비 오는 도시, 비 줄기, 가끔 번개
import * as THREE from 'three';
import { ROOM } from '../../shared/world.js';
import { canvasTexture } from './materials.js';

export function buildOutside(scene) {
  const g = new THREE.Group();
  const Z = ROOM.minZ;

  // 하늘
  const skyTex = canvasTexture(16, 256, (c, w, h) => {
    const gr = c.createLinearGradient(0, 0, 0, h);
    gr.addColorStop(0, '#1a2430'); gr.addColorStop(0.5, '#2a3a4c'); gr.addColorStop(1, '#4a6378');
    c.fillStyle = gr; c.fillRect(0, 0, w, h);
  });
  const sky = new THREE.Mesh(new THREE.PlaneGeometry(160, 90), new THREE.MeshBasicMaterial({ map: skyTex, fog: false }));
  sky.position.set(0, 8, Z - 60); g.add(sky);

  // 건물: 어두운 상자 + 불 켜진 창 텍스처
  const winTex = canvasTexture(64, 128, (c, w, h) => {
    c.fillStyle = '#242c36'; c.fillRect(0, 0, w, h);
    for (let y = 6; y < h; y += 16) for (let x = 6; x < w; x += 16) {
      if (Math.random() < 0.45) { c.fillStyle = Math.random() < 0.7 ? '#f2d08a' : '#bcd6e6'; c.globalAlpha = 0.55 + Math.random() * 0.45; c.fillRect(x, y, 8, 10); c.globalAlpha = 1; }
    }
  }, [1, 1]);
  const bMat = new THREE.MeshStandardMaterial({ map: winTex, color: '#8a98a8', roughness: 1, emissive: '#ffe2a8', emissiveMap: winTex, emissiveIntensity: 0.9 });
  let seed = 7; const r = () => { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; };
  for (let i = 0; i < 34; i++) {
    const w = 3 + r() * 5, d = 3 + r() * 4, h = 10 + r() * 30;
    const x = -40 + r() * 80, z = Z - 9 - r() * 36;
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), bMat.clone());
    m.material.map = winTex.clone(); m.material.map.repeat.set(w / 1.2, h / 2.4); m.material.map.needsUpdate = true;
    m.material.emissiveMap = m.material.map;
    m.position.set(x, -14 + h / 2 + r() * 6, z);
    g.add(m);
  }
  // 아래쪽 도로 불빛 느낌의 바닥
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(200, 120), new THREE.MeshStandardMaterial({ color: '#141a21', roughness: 1 }));
  ground.rotation.x = -Math.PI / 2; ground.position.set(0, -14, Z - 40); g.add(ground);

  // 비: 선분 파티클
  const N = 1600;
  const pos = new Float32Array(N * 6);
  const vel = new Float32Array(N);
  const box = { x0: -14, x1: 14, y0: -8, y1: 10, z0: Z - 1.2, z1: Z - 16 };
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
  const rain = new THREE.LineSegments(geo, new THREE.LineBasicMaterial({ color: '#b9d1e3', transparent: true, opacity: 0.42, fog: false }));
  rain.frustumCulled = false; g.add(rain);

  // 창밖 푸른 빛 + 번개
  const windowLight = new THREE.DirectionalLight('#9fc0dc', 0.9);
  windowLight.position.set(0, 4, Z - 6); windowLight.target.position.set(0, 0, 2);
  windowLight.castShadow = true;
  windowLight.shadow.mapSize.set(1024, 1024);
  windowLight.shadow.camera.left = -7; windowLight.shadow.camera.right = 7; windowLight.shadow.camera.top = 7; windowLight.shadow.camera.bottom = -7;
  windowLight.shadow.bias = -0.001;
  g.add(windowLight); g.add(windowLight.target);
  const flash = new THREE.AmbientLight('#dfeaff', 0);
  g.add(flash);
  let nextFlash = 6 + Math.random() * 14, flashT = 0;

  scene.add(g);
  return {
    update(dt) {
      for (let i = 0; i < N; i++) {
        const o = i * 6, dy = vel[i] * dt;
        pos[o + 1] -= dy; pos[o + 4] -= dy; pos[o] += dy * 0.08; pos[o + 3] += dy * 0.08;
        if (pos[o + 4] < box.y0) reset(i, false);
      }
      geo.attributes.position.needsUpdate = true;
      nextFlash -= dt;
      if (nextFlash <= 0) { flashT = 0.18 + Math.random() * 0.15; nextFlash = 8 + Math.random() * 18; }
      if (flashT > 0) { flashT -= dt; flash.intensity = Math.max(0, flashT) * 6 * (Math.random() < 0.7 ? 1 : 0.3); }
      else flash.intensity = 0;
    },
  };
}
