// 클라이언트(Three.js)와 서버(Durable Object)가 같이 쓰는 월드 정의.
// 좌표: x 좌우, z 앞뒤(창문이 -z 벽), y 높이. 단위 m.

export const ROOM = { minX: -6, maxX: 6, minZ: -5, maxZ: 5, height: 3 };
export const SPAWN = { x: 0, z: 2.6 };

// 이동을 막는 가구 (바닥 투영 AABB: [minX, minZ, maxX, maxZ])
export const OBSTACLES = [
  { id: 'sofa',   box: [1.0, 3.0, 4.0, 4.15] },
  { id: 'table',  box: [1.9, 1.5, 3.1, 2.1] },
  { id: 'shelf',  box: [5.35, -2.85, 6.0, -1.15] },
  { id: 'plant1', box: [4.9, 3.9, 5.7, 4.7] },
  { id: 'plant2', box: [-5.7, -4.7, -4.9, -3.9] },
  { id: 'lamp',   box: [4.5, -4.7, 5.1, -4.1] },
];

export const BOWL = { x: -4.5, z: -3.6 };          // 사료 그릇
export const WATER = { x: -3.8, z: -3.6 };         // 물그릇 (장식)
export const BEDS = { hero: { x: -4.4, z: 2.6 }, bonggu: { x: -4.4, z: 0.9 } };

export const DOGS = {
  hero:   { name: '히로', breed: '치와와',   speed: 1.3, color: '#f3dfc0' },
  bonggu: { name: '봉구', breed: '닥스훈트', speed: 1.05, color: '#4a4c52' },
};

// 상호작용 거리
export const RANGE = { pet: 1.4, cmd: 2.2, treatCall: 9, bowl: 1.7 };

export const PLAYER_RADIUS = 0.32;
export const DOG_RADIUS = 0.22;

export function hitsObstacle(x, z, r) {
  for (const o of OBSTACLES) {
    const b = o.box;
    if (x + r > b[0] && x - r < b[2] && z + r > b[1] && z - r < b[3]) return o;
  }
  return null;
}

export function inRoom(x, z, r) {
  return x > ROOM.minX + r && x < ROOM.maxX - r && z > ROOM.minZ + r && z < ROOM.maxZ - r;
}

export function isFree(x, z, r) {
  return inRoom(x, z, r) && !hitsObstacle(x, z, r);
}

// a→b 직선 경로가 비어 있는지 (샘플링)
export function pathFree(ax, az, bx, bz, r) {
  const dx = bx - ax, dz = bz - az;
  const len = Math.hypot(dx, dz);
  const n = Math.max(2, Math.ceil(len / 0.2));
  for (let i = 1; i <= n; i++) {
    const t = i / n;
    if (!isFree(ax + dx * t, az + dz * t, r)) return false;
  }
  return true;
}

export const dist = (ax, az, bx, bz) => Math.hypot(bx - ax, bz - az);
