// 서버 권위 강아지 시뮬레이션. 모든 접속자가 같은 히로·봉구를 본다.
import { BOWL, BEDS, DOGS, RANGE, DOG_RADIUS, isFree, pathFree, dist } from '../shared/world.js';

const rnd = (a, b) => a + Math.random() * (b - a);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

function createDog(id, x, z) {
  return {
    id, x, z, ry: 0,
    state: 'idle', t: rnd(1, 3),   // state 남은 시간
    tx: x, tz: z,                   // 이동 목표
    follow: null,                   // 따라갈 플레이어 id (간식·부르기)
    called: false,                  // '이리 와'로 오는 중
    eatSrc: null,                   // 'bowl' | 'treat'
    hunger: 72, happy: 70,          // 0~100
  };
}

export function initialSim() {
  return {
    dogs: { hero: createDog('hero', -1.5, 0.2), bonggu: createDog('bonggu', 1.2, -1.2) },
    bowl: { food: 35 },
  };
}

// 저장했던 상태를 복원할 때 빠진 필드 보정
export function reviveSim(saved) {
  const sim = initialSim();
  if (!saved) return sim;
  for (const id of Object.keys(sim.dogs)) {
    if (saved.dogs?.[id]) Object.assign(sim.dogs[id], saved.dogs[id], { follow: null });
    const d = sim.dogs[id];
    if (!isFree(d.x, d.z, DOG_RADIUS)) { d.x = sim.dogs[id].tx = 0; d.z = sim.dogs[id].tz = 0; }
    if (['approach', 'beg', 'eat', 'happy'].includes(d.state)) { d.state = 'idle'; d.t = 1; }
  }
  if (saved.bowl) sim.bowl.food = clamp(saved.bowl.food ?? 35, 0, 100);
  return sim;
}

function pickWanderTarget(d) {
  for (let i = 0; i < 12; i++) {
    const x = rnd(-5.3, 5.3), z = rnd(-4.3, 4.3);
    if (dist(d.x, d.z, x, z) < 1.2) continue;
    if (isFree(x, z, DOG_RADIUS) && pathFree(d.x, d.z, x, z, DOG_RADIUS)) { d.tx = x; d.tz = z; return true; }
  }
  return false;
}

function setState(d, state, t) { d.state = state; d.t = t; }

function goIdle(d) { setState(d, 'idle', rnd(1.5, 4)); d.follow = null; d.eatSrc = null; d.called = false; }

function face(d, x, z) {
  const dx = x - d.x, dz = z - d.z;
  if (Math.abs(dx) + Math.abs(dz) > 1e-4) d.ry = Math.atan2(dx, dz);
}

// 목표로 한 걸음. 도착하면 true.
function stepTo(d, x, z, speed, dt) {
  const dx = x - d.x, dz = z - d.z;
  const len = Math.hypot(dx, dz);
  if (len < 0.08) return true;
  const step = Math.min(len, speed * dt);
  const nx = d.x + (dx / len) * step, nz = d.z + (dz / len) * step;
  d.ry = Math.atan2(dx, dz);
  if (isFree(nx, nz, DOG_RADIUS)) { d.x = nx; d.z = nz; return false; }
  // 막히면 좌우로 비껴 본다
  for (const a of [0.9, -0.9, 1.8, -1.8]) {
    const ang = Math.atan2(dx, dz) + a;
    const sx = d.x + Math.sin(ang) * step, sz = d.z + Math.cos(ang) * step;
    if (isFree(sx, sz, DOG_RADIUS)) { d.x = sx; d.z = sz; return false; }
  }
  return true; // 완전히 막힘 → 도착 처리
}

function nearestTreatPlayer(d, players) {
  let best = null, bd = RANGE.treatCall;
  for (const p of players.values()) {
    if (!p.treat) continue;
    const dd = dist(d.x, d.z, p.x, p.z);
    if (dd < bd) { bd = dd; best = p; }
  }
  return best;
}

export function tick(sim, players, dt, emit) {
  for (const d of Object.values(sim.dogs)) {
    const def = DOGS[d.id];
    const sleeping = d.state === 'sleep';
    d.hunger = clamp(d.hunger - dt / (sleeping ? 14 : 7), 0, 100);
    d.happy = clamp(d.happy - dt / (sleeping ? 24 : 12), 0, 100);

    // 간식 든 사람이 가까이 있으면 달려간다 (먹는 중/명령 수행 중/쓰다듬 중 제외)
    if (!['eat', 'sit', 'down', 'happy', 'approach', 'beg'].includes(d.state)) {
      const p = nearestTreatPlayer(d, players);
      if (p) { d.follow = p.id; setState(d, 'approach', 0); }
    }

    switch (d.state) {
      case 'idle': {
        d.t -= dt;
        if (d.t > 0) break;
        if (d.hunger < 45 && sim.bowl.food > 0) { setState(d, 'toBowl', 0); break; }
        const r = Math.random();
        if (r < 0.58 && pickWanderTarget(d)) setState(d, 'wander', 0);
        else if (r < 0.80 || d.happy > 40) setState(d, 'idle', rnd(2, 5));
        else setState(d, 'toBed', 0);
        break;
      }
      case 'wander':
        if (stepTo(d, d.tx, d.tz, def.speed, dt)) goIdle(d);
        break;
      case 'toBowl': {
        if (sim.bowl.food <= 0) { goIdle(d); break; }
        const bx = BOWL.x + 0.32, bz = BOWL.z + 0.1;
        if (stepTo(d, bx, bz, def.speed, dt)) { face(d, BOWL.x, BOWL.z); d.eatSrc = 'bowl'; setState(d, 'eat', rnd(4, 7)); }
        break;
      }
      case 'toBed': {
        const b = BEDS[d.id];
        if (stepTo(d, b.x, b.z, def.speed * 0.8, dt)) setState(d, 'sleep', rnd(18, 45));
        break;
      }
      case 'sleep':
        d.t -= dt;
        if (d.t <= 0 || d.hunger < 22) goIdle(d);
        break;
      case 'eat':
        d.t -= dt;
        if (d.eatSrc === 'bowl') {
          const bite = Math.min(sim.bowl.food, 9 * dt);
          sim.bowl.food -= bite; d.hunger = clamp(d.hunger + bite * 0.9, 0, 100);
          if (sim.bowl.food <= 0.01) { sim.bowl.food = 0; d.t = 0; }
        }
        if (d.t <= 0) { d.happy = clamp(d.happy + 3, 0, 100); goIdle(d); }
        break;
      case 'approach': {
        const p = players.get(d.follow);
        const called = d.called;   // '이리 와'로 오는 중이면 간식이 없어도 온다
        if (!p || (!p.treat && !called) || dist(d.x, d.z, p.x, p.z) > RANGE.treatCall + 1) { d.called = false; goIdle(d); break; }
        const arrive = () => { face(d, p.x, p.z); if (p.treat) setState(d, 'beg', 0); else { d.called = false; setState(d, 'sit', 8); } };
        if (dist(d.x, d.z, p.x, p.z) < 0.95) { arrive(); break; }
        if (stepTo(d, p.x, p.z, def.speed * 1.35, dt)) arrive();
        break;
      }
      case 'beg': {
        const p = players.get(d.follow);
        if (!p || !p.treat) { goIdle(d); break; }
        face(d, p.x, p.z);
        if (dist(d.x, d.z, p.x, p.z) > 1.4) setState(d, 'approach', 0);
        break;
      }
      case 'sit': case 'down': case 'happy':
        d.t -= dt;
        if (d.t <= 0) {
          const p = d.follow && players.get(d.follow);
          if (p && p.treat) setState(d, 'beg', 0); else goIdle(d);
        }
        break;
      default: goIdle(d);
    }
  }
}

// ---- 플레이어 행동 ----
export const actions = {
  pet(sim, p, dogId, emit) {
    const d = sim.dogs[dogId]; if (!d) return;
    if (dist(d.x, d.z, p.x, p.z) > RANGE.pet) return;
    if (d.state === 'eat') return;
    face(d, p.x, p.z);
    d.happy = clamp(d.happy + 8, 0, 100);
    setState(d, 'happy', 1.8);
    emit({ t: 'ev', k: 'pet', dog: dogId, by: p.id });
  },
  come(sim, p, emit) {
    let any = false;
    for (const d of Object.values(sim.dogs)) {
      if (['eat', 'happy'].includes(d.state)) continue;
      if (dist(d.x, d.z, p.x, p.z) < 1.2) { face(d, p.x, p.z); setState(d, 'happy', 1.2); emit({ t: 'ev', k: 'pet', dog: d.id, by: p.id }); any = true; continue; }
      if (d.happy < 20 && Math.random() < 0.5) { emit({ t: 'ev', k: 'ignore', dog: d.id, by: p.id }); continue; }
      d.follow = p.id; d.called = true; setState(d, 'approach', 0); any = true;
      emit({ t: 'ev', k: 'come', dog: d.id, by: p.id });
    }
    return any;
  },
  command(sim, p, type, emit) {
    if (type !== 'sit' && type !== 'down') return;
    let any = false;
    for (const d of Object.values(sim.dogs)) {
      if (dist(d.x, d.z, p.x, p.z) > RANGE.cmd) continue;
      if (!['beg', 'approach', 'idle', 'wander', 'sit', 'down'].includes(d.state)) continue;
      // 기분이 나쁘면 가끔 못 들은 척
      if (d.happy < 25 && Math.random() < 0.5) { emit({ t: 'ev', k: 'ignore', dog: d.id, by: p.id }); continue; }
      face(d, p.x, p.z);
      d.follow = p.treat ? p.id : d.follow;
      setState(d, type, 7);
      d.happy = clamp(d.happy + 3, 0, 100);
      any = true;
      emit({ t: 'ev', k: 'obey', dog: d.id, cmd: type, by: p.id });
    }
    return any;
  },
  give(sim, p, dogId, emit) {
    const d = sim.dogs[dogId]; if (!d || !p.treat) return;
    if (dist(d.x, d.z, p.x, p.z) > RANGE.pet) return;
    p.treat = false;
    face(d, p.x, p.z);
    d.eatSrc = 'treat';
    d.hunger = clamp(d.hunger + 12, 0, 100);
    d.happy = clamp(d.happy + 12, 0, 100);
    setState(d, 'eat', 2.4);
    emit({ t: 'ev', k: 'treat', dog: dogId, by: p.id });
  },
  feed(sim, p, emit) {
    if (dist(BOWL.x, BOWL.z, p.x, p.z) > RANGE.bowl) return;
    sim.bowl.food = 100;
    emit({ t: 'ev', k: 'feed', by: p.id });
  },
};
