// 고층 아파트 거실. shared/world.js 의 OBSTACLES 위치와 맞춰 둔다.
import * as THREE from 'three';
import { ROOM, BOWL, WATER, BEDS } from '../../shared/world.js';
import { felt, box, cyl, sphere, canvasTexture } from './materials.js';

export function buildRoom(scene) {
  const g = new THREE.Group();
  const { minX, maxX, minZ, maxZ, height: H } = ROOM;
  const W = maxX - minX, D = maxZ - minZ;

  // 바닥: 나무 마루
  const floorTex = canvasTexture(512, 512, (c, w, h) => {
    c.fillStyle = '#d6b088'; c.fillRect(0, 0, w, h);
    const rows = 8;
    for (let r = 0; r < rows; r++) {
      const y = (r * h) / rows, off = (r % 2) * 128;
      for (let x = -128; x < w; x += 256) {
        const l = 0.9 + Math.random() * 0.2;
        c.fillStyle = `rgb(${Math.round(214 * l)},${Math.round(176 * l)},${Math.round(136 * l)})`;
        c.fillRect(x + off + 2, y + 2, 252, h / rows - 4);
      }
    }
    c.strokeStyle = 'rgba(90,60,30,.25)'; c.lineWidth = 2;
    for (let r = 0; r <= rows; r++) { c.beginPath(); c.moveTo(0, (r * h) / rows); c.lineTo(w, (r * h) / rows); c.stroke(); }
  }, [W / 2.4, D / 2.4]);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(W, D), new THREE.MeshStandardMaterial({ map: floorTex, roughness: 0.85 }));
  floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; g.add(floor);

  // 천장
  const ceil = new THREE.Mesh(new THREE.PlaneGeometry(W, D), felt('#f8f5ef'));
  ceil.rotation.x = Math.PI / 2; ceil.position.y = H; g.add(ceil);

  // 벽
  const wall = felt('#f1ebe1');
  const T = 0.2;
  g.add(box(T, H, D, wall, minX - T / 2, H / 2, 0));           // 왼쪽
  g.add(box(T, H, D, wall, maxX + T / 2, H / 2, 0));           // 오른쪽
  g.add(box(W + T * 2, H, T, wall, 0, H / 2, maxZ + T / 2));   // 앞(카메라 뒤)
  // 뒤쪽 벽: 창문 구멍
  const wx0 = -3.4, wx1 = 3.4, wy0 = 0.75, wy1 = 2.55;
  const bz = minZ - T / 2;
  g.add(box(wx0 - minX, H, T, wall, (minX + wx0) / 2, H / 2, bz));
  g.add(box(maxX - wx1, H, T, wall, (wx1 + maxX) / 2, H / 2, bz));
  g.add(box(wx1 - wx0, wy0, T, wall, 0, wy0 / 2, bz));
  g.add(box(wx1 - wx0, H - wy1, T, wall, 0, (H + wy1) / 2, bz));
  // 굽도리
  const skirt = felt('#e3dccf');
  g.add(box(W, 0.1, 0.03, skirt, 0, 0.05, maxZ - 0.015));
  g.add(box(0.03, 0.1, D, skirt, minX + 0.015, 0.05, 0));
  g.add(box(0.03, 0.1, D, skirt, maxX - 0.015, 0.05, 0));

  // 창틀 + 유리
  const frame = felt('#3a3f47');
  const fw = 0.08;
  g.add(box(wx1 - wx0 + fw * 2, fw, T + 0.06, frame, 0, wy0, bz));
  g.add(box(wx1 - wx0 + fw * 2, fw, T + 0.06, frame, 0, wy1, bz));
  g.add(box(fw, wy1 - wy0, T + 0.06, frame, wx0, (wy0 + wy1) / 2, bz));
  g.add(box(fw, wy1 - wy0, T + 0.06, frame, wx1, (wy0 + wy1) / 2, bz));
  g.add(box(0.05, wy1 - wy0, T + 0.04, frame, 0, (wy0 + wy1) / 2, bz));
  g.add(box(wx1 - wx0, 0.05, T + 0.04, frame, 0, (wy0 + wy1) / 2, bz));
  g.add(box(wx1 - wx0 + 0.5, 0.06, 0.32, felt('#e9e2d6'), 0, wy0 - 0.03, minZ + 0.1)); // 창턱
  const glass = new THREE.Mesh(
    new THREE.PlaneGeometry(wx1 - wx0, wy1 - wy0),
    new THREE.MeshPhysicalMaterial({ color: '#cfe3ee', transparent: true, opacity: 0.16, roughness: 0.05, metalness: 0, depthWrite: false })
  );
  glass.position.set(0, (wy0 + wy1) / 2, minZ - 0.02); g.add(glass);

  // 소파 (OBSTACLES.sofa: x 1.0~4.0, z 3.0~4.15)
  const sofaM = felt('#7fa6c4'), cushM = felt('#8fb3cf');
  g.add(box(3.0, 0.42, 1.0, sofaM, 2.5, 0.21, 3.55));
  g.add(box(3.0, 0.62, 0.26, sofaM, 2.5, 0.73, 4.0));
  g.add(box(0.26, 0.66, 1.05, sofaM, 1.13, 0.33, 3.55));
  g.add(box(0.26, 0.66, 1.05, sofaM, 3.87, 0.33, 3.55));
  g.add(box(1.22, 0.16, 0.86, cushM, 1.88, 0.5, 3.48));
  g.add(box(1.22, 0.16, 0.86, cushM, 3.12, 0.5, 3.48));
  const pil = box(0.42, 0.4, 0.14, felt('#f2c6a0'), 1.75, 0.78, 3.82); pil.rotation.z = 0.15; g.add(pil);
  g.add(box(0.42, 0.4, 0.14, felt('#f6dcb0'), 3.3, 0.78, 3.82));

  // 러그 + 낮은 탁자 (OBSTACLES.table: x 1.9~3.1, z 1.5~2.1)
  const rug = new THREE.Mesh(new THREE.CircleGeometry(1.5, 40), felt('#e8cbc1'));
  rug.rotation.x = -Math.PI / 2; rug.scale.set(1.25, 1, 0.85); rug.position.set(2.5, 0.012, 1.9); rug.receiveShadow = true; g.add(rug);
  const wood = felt('#b9875a');
  g.add(box(1.2, 0.06, 0.6, wood, 2.5, 0.42, 1.8));
  for (const [dx, dz] of [[-0.5, -0.22], [0.5, -0.22], [-0.5, 0.22], [0.5, 0.22]]) g.add(cyl(0.025, 0.025, 0.4, wood, 2.5 + dx, 0.2, 1.8 + dz, 10));
  g.add(cyl(0.07, 0.05, 0.08, felt('#fff'), 2.25, 0.49, 1.8, 16));   // 머그
  g.add(box(0.3, 0.03, 0.22, felt('#2e8bc0'), 2.75, 0.465, 1.82));  // 책

  // 책장 (OBSTACLES.shelf: x 5.35~6.0, z -2.85~-1.15)
  const shelfM = felt('#c9a37a');
  g.add(box(0.06, 2.0, 1.7, shelfM, 5.97, 1.0, -2.0));
  for (const y of [0.05, 0.55, 1.05, 1.55, 1.98]) g.add(box(0.6, 0.05, 1.7, shelfM, 5.7, y, -2.0));
  g.add(box(0.6, 2.0, 0.05, shelfM, 5.7, 1.0, -2.85));
  g.add(box(0.6, 2.0, 0.05, shelfM, 5.7, 1.0, -1.15));
  const bookColors = ['#e0607e', '#2e8bc0', '#7fb069', '#f2c14e', '#9b7ede', '#ff8c42', '#4fb3bf'];
  for (const y of [0.08, 0.58, 1.08]) {
    let z = -2.75;
    while (z < -1.3) { const w = 0.06 + Math.random() * 0.08, h = 0.28 + Math.random() * 0.14;
      g.add(box(0.42, h, w, felt(bookColors[Math.floor(Math.random() * bookColors.length)]), 5.68, y + h / 2, z + w / 2)); z += w + 0.015; }
  }
  g.add(sphere(0.12, felt('#f3e3c5'), 5.7, 1.7, -2.3));  // 장식
  g.add(box(0.2, 0.26, 0.2, felt('#6fa8dc'), 5.7, 1.71, -1.6));

  // 화분 2개 (OBSTACLES.plant1 / plant2)
  for (const [x, z] of [[5.3, 4.3], [-5.3, -4.3]]) {
    g.add(cyl(0.26, 0.2, 0.38, felt('#c8b7a1'), x, 0.19, z));
    g.add(cyl(0.03, 0.03, 0.5, felt('#6b8e4e'), x, 0.6, z, 8));
    const leaf = felt('#7fb069');
    g.add(sphere(0.3, leaf, x, 0.95, z)); g.add(sphere(0.22, leaf, x + 0.22, 1.15, z - 0.05)); g.add(sphere(0.2, leaf, x - 0.2, 1.1, z + 0.12));
  }

  // 스탠드 조명 (OBSTACLES.lamp)
  g.add(cyl(0.16, 0.16, 0.03, felt('#3a3f47'), 4.8, 0.015, -4.4));
  g.add(cyl(0.02, 0.02, 1.55, felt('#3a3f47'), 4.8, 0.8, -4.4, 8));
  const shade = cyl(0.2, 0.28, 0.32, new THREE.MeshStandardMaterial({ color: '#f6e4c6', emissive: '#ffd9a0', emissiveIntensity: 0.6, roughness: 1, side: THREE.DoubleSide }), 4.8, 1.68, -4.4);
  shade.castShadow = false; g.add(shade);
  const lampLight = new THREE.PointLight('#ffd8a8', 8, 7, 2); lampLight.position.set(4.8, 1.55, -4.4); g.add(lampLight);

  // 강아지 방석
  const bedCol = { hero: '#f2d7c2', bonggu: '#cfd8e3' };
  for (const id of Object.keys(BEDS)) {
    const b = BEDS[id];
    const base = cyl(0.5, 0.52, 0.1, felt(bedCol[id]), b.x, 0.05, b.z, 32); g.add(base);
    const rim = new THREE.Mesh(new THREE.TorusGeometry(0.44, 0.09, 12, 32), felt(bedCol[id]));
    rim.rotation.x = Math.PI / 2; rim.position.set(b.x, 0.12, b.z); rim.castShadow = true; g.add(rim);
  }

  // 사료 그릇 / 물그릇
  const mat = box(1.2, 0.015, 0.7, felt('#dcd3c4'), (BOWL.x + WATER.x) / 2, 0.008, BOWL.z); g.add(mat);
  g.add(cyl(0.17, 0.13, 0.09, felt('#e07b5b'), BOWL.x, 0.045, BOWL.z));
  const kibble = cyl(0.13, 0.13, 0.06, felt('#8c5a2b'), BOWL.x, 0.06, BOWL.z); g.add(kibble);
  g.add(cyl(0.17, 0.13, 0.09, felt('#6fa8dc'), WATER.x, 0.045, WATER.z));
  const water = cyl(0.14, 0.14, 0.02, new THREE.MeshStandardMaterial({ color: '#9fd0f0', roughness: 0.1, transparent: true, opacity: 0.85 }), WATER.x, 0.08, WATER.z); g.add(water);

  // 현관문 (왼쪽 벽) + 액자
  g.add(box(0.05, 2.1, 0.95, felt('#d8c2a3'), minX + 0.03, 1.05, 3.6));
  g.add(sphere(0.03, felt('#c9a227'), minX + 0.07, 1.0, 3.25, 10, 8));
  const pic = (x, y, z, col, w = 0.7, h = 0.5) => {
    g.add(box(0.03, h + 0.08, w + 0.08, felt('#3a3f47'), x, y, z));
    g.add(box(0.035, h, w, felt(col), x + 0.005, y, z));
  };
  pic(minX + 0.015, 1.7, -1.5, '#f6dcb0'); pic(minX + 0.015, 1.7, -0.6, '#cfe3ee', 0.5, 0.5);
  pic(maxX - 0.015, 1.7, 2.0, '#e8cbc1', 0.9, 0.6);
  // 벽시계
  const clock = cyl(0.22, 0.22, 0.03, felt('#fff'), 0, 2.4, maxZ - 0.02); clock.rotation.x = Math.PI / 2; g.add(clock);
  const hand = box(0.02, 0.15, 0.01, felt('#1f2933'), 0, 2.46, maxZ - 0.045); g.add(hand);

  // 천장 조명
  const lampDisc = cyl(0.32, 0.32, 0.06, new THREE.MeshStandardMaterial({ color: '#fff6e6', emissive: '#ffe7c2', emissiveIntensity: 0.9 }), 0, H - 0.03, 0.5);
  lampDisc.castShadow = false; g.add(lampDisc);
  const mainLight = new THREE.PointLight('#ffe9cf', 28, 18, 2);
  mainLight.position.set(0, H - 0.3, 0.5); mainLight.castShadow = true;
  mainLight.shadow.mapSize.set(1024, 1024); mainLight.shadow.bias = -0.002; mainLight.shadow.radius = 4;
  g.add(mainLight);

  scene.add(g);
  return {
    group: g,
    setBowl(food) { const s = Math.max(0.02, food / 100); kibble.scale.y = s; kibble.position.y = 0.03 + 0.03 * s; },
  };
}
