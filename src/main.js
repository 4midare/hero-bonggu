import * as THREE from 'three';
import { ROOM, SPAWN, BOWL, DOGS, RANGE, PLAYER_RADIUS, isFree, dist } from '../shared/world.js';
import { buildRoom } from './scene/room.js';
import { buildOutside } from './scene/outside.js';
import { createDog } from './scene/dogs.js';
import { createAvatar } from './scene/avatar.js';
import { createEffects } from './scene/effects.js';
import { createInput } from './input.js';
import { createUI } from './ui.js';
import { connect } from './net.js';

// ---------- 렌더러 / 씬 ----------
const canvas = document.getElementById('game');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
const scene = new THREE.Scene();
scene.background = new THREE.Color('#1a2430');
scene.fog = new THREE.Fog('#2a3a4c', 16, 70);
const camera = new THREE.PerspectiveCamera(60, innerWidth / innerHeight, 0.1, 200);
scene.add(new THREE.HemisphereLight('#fff2e0', '#6b5a4a', 0.55));

const room = buildRoom(scene);
const outside = buildOutside(scene);
const fx = createEffects(scene);
const input = createInput(canvas);
const ui = createUI();

const dogs = {};
for (const id of Object.keys(DOGS)) {
  const d = createDog(id);
  d.net = { x: 0, z: 0, ry: 0, state: 'idle', hunger: 50, happy: 50 };
  d.mesh.position.set(id === 'hero' ? -1.5 : 1.2, 0, id === 'hero' ? 0.2 : -1.2);
  scene.add(d.mesh); dogs[id] = d;
}

// ---------- 플레이어 ----------
const me = { id: null, name: '', color: '#ff8c42', x: SPAWN.x + (Math.random() - 0.5) * 1.6, z: SPAWN.z + (Math.random() - 0.5) * 0.8, ry: Math.PI, anim: 'idle', treat: false, avatar: null };
const others = new Map(); // id -> { id, name, color, avatar, tx, tz, try, anim, treat }

function addOther(p) {
  if (others.has(p.id) || p.id === me.id) return;
  const avatar = createAvatar(p.color, p.name);
  avatar.mesh.position.set(SPAWN.x, 0, SPAWN.z);
  scene.add(avatar.mesh);
  others.set(p.id, { ...p, avatar, tx: SPAWN.x, tz: SPAWN.z, try: 0, anim: 'idle', treat: false });
}
function removeOther(id) { const o = others.get(id); if (!o) return; scene.remove(o.avatar.mesh); others.delete(id); }
function allPlayers() { const m = new Map(others); if (me.id) m.set(me.id, me); return m; }

// ---------- 네트워크 ----------
let net = null;
function join(name) {
  me.name = name;
  me.avatar = createAvatar(me.color, name);
  me.avatar.mesh.position.set(me.x, 0, me.z);
  scene.add(me.avatar.mesh);
  ui.show();
  net = connect(name, {
    open() { ui.conn(true); },
    close() { ui.conn(false); },
    message(m) {
      switch (m.t) {
        case 'w': {
          // 재접속이면 이전 아바타 정리
          for (const id of [...others.keys()]) removeOther(id);
          me.id = m.id; me.color = m.color;
          scene.remove(me.avatar.mesh); me.avatar = createAvatar(me.color, me.name); me.avatar.mesh.position.set(me.x, 0, me.z); scene.add(me.avatar.mesh);
          for (const p of m.players) addOther(p);
          for (const [id, d] of Object.entries(m.dogs)) { const g = dogs[id]; if (!g) continue; g.mesh.position.set(d.x, 0, d.z); g.mesh.rotation.y = d.ry; Object.assign(g.net, d); }
          room.setBowl(m.bowl);
          ui.online(allPlayers(), me.id);
          ui.sys(`${me.name} 님, 히로와 봉구의 집에 오신 걸 환영해요 🐶🐶`);
          net.send({ t: 'treat', on: me.treat });
          break;
        }
        case 'j': addOther(m); ui.online(allPlayers(), me.id); ui.sys(`${m.name} 님이 들어왔어요`); break;
        case 'l': { const o = others.get(m.id); if (o) ui.sys(`${o.name} 님이 나갔어요`); removeOther(m.id); ui.online(allPlayers(), me.id); break; }
        case 's':
          for (const [id, x, z, ry, anim, treat] of m.p) {
            if (id === me.id) continue;
            const o = others.get(id); if (!o) continue;
            o.tx = x; o.tz = z; o.try = ry; o.anim = anim; o.treat = !!treat;
          }
          for (const [id, arr] of Object.entries(m.d)) {
            const g = dogs[id]; if (!g) continue;
            const [x, z, ry, state, hunger, happy] = arr;
            Object.assign(g.net, { x, z, ry, state, hunger, happy });
            ui.dog(id, state, hunger, happy);
          }
          room.setBowl(m.b);
          break;
        case 'c': {
          const p = m.id === me.id ? me : others.get(m.id);
          ui.chat(m.name, m.text, p?.color);
          p?.avatar?.say(m.text);
          break;
        }
        case 'ev': onEvent(m); break;
      }
    },
  });
}

function dogPos(id) { const p = dogs[id].mesh.position; return { x: p.x, y: p.y + 0.45, z: p.z }; }
function onEvent(ev) {
  const who = ev.by === me.id ? '내가' : (others.get(ev.by)?.name || '누군가') + ' 님이';
  const dn = ev.dog ? DOGS[ev.dog].name : '';
  switch (ev.k) {
    case 'pet': fx.spawn(dogPos(ev.dog), '💕', 3); if (ev.by === me.id) ui.toast(`${dn}가 좋아해요 💕`); break;
    case 'treat': fx.spawn(dogPos(ev.dog), '🦴', 1); fx.spawn(dogPos(ev.dog), '💕', 2); ui.sys(`${who} ${dn}에게 간식을 줬어요`);
      if (ev.by === me.id) { me.treat = false; ui.treatButton(false); }
      break;
    case 'obey': fx.spawn(dogPos(ev.dog), '✨', 2); if (ev.by === me.id) ui.toast(`${dn}: ${ev.cmd === 'sit' ? '앉아' : '엎드려'} 성공!`); break;
    case 'ignore': fx.spawn(dogPos(ev.dog), '❓', 1); if (ev.by === me.id) ui.toast(`${dn}가 못 들은 척해요… (기분이 안 좋아요)`); break;
    case 'feed': fx.spawn({ x: BOWL.x, y: 0.4, z: BOWL.z }, '🥣', 1); ui.sys(`${who} 사료를 채웠어요`); break;
  }
}

// ---------- 입장 폼 ----------
const joinForm = document.getElementById('join-form'), nameInput = document.getElementById('join-name');
try { nameInput.value = localStorage.getItem('hb-name') || ''; } catch {}
joinForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const name = nameInput.value.trim().slice(0, 12); if (!name) return;
  try { localStorage.setItem('hb-name', name); } catch {}
  join(name);
});

// 화면 버튼 → 키 입력으로
document.getElementById('actions').addEventListener('click', (e) => { const b = e.target.closest('button'); if (b) input.press(b.dataset.key); });

// 채팅: Enter 는 키다운 즉시 입력창을 연다 (프레임 대기 없이)
window.addEventListener('keydown', (e) => { if (e.key === 'Enter' && net && !input.typing) { e.preventDefault(); input.typing = true; ui.openChat(); } });
ui.input.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') { const t = ui.input.value.trim(); if (t) net?.send({ t: 'chat', text: t }); ui.closeChat(); input.typing = false; e.preventDefault(); }
  else if (e.key === 'Escape') { ui.closeChat(); input.typing = false; }
  e.stopPropagation();
});
ui.input.addEventListener('blur', () => { ui.closeChat(); input.typing = false; });

// ---------- 상호작용 ----------
function nearestDog() {
  let best = null, bd = RANGE.pet;
  for (const d of Object.values(dogs)) { const dd = dist(me.x, me.z, d.mesh.position.x, d.mesh.position.z); if (dd < bd) { bd = dd; best = d; } }
  return best;
}
function handleActions() {
  const keys = input.takePressed();
  const clicks = input.takeClicks();
  if (!net) return;
  const near = nearestDog();
  // 클릭으로 강아지 쓰다듬기
  if (clicks.length && near) {
    const ray = new THREE.Raycaster(); const c = clicks[0];
    ray.setFromCamera(new THREE.Vector2((c.x / innerWidth) * 2 - 1, -(c.y / innerHeight) * 2 + 1), camera);
    const hit = ray.intersectObject(near.mesh, true)[0];
    if (hit) keys.push('KeyE');
  }
  for (const k of keys) {
    if (k === 'KeyE') {
      if (!near) { ui.toast('가까이 있는 강아지가 없어요'); continue; }
      if (me.treat) net.send({ t: 'give', dog: near.id }); else net.send({ t: 'pet', dog: near.id });
    } else if (k === 'Digit1') { me.treat = !me.treat; net.send({ t: 'treat', on: me.treat }); ui.treatButton(me.treat); ui.toast(me.treat ? '간식을 꺼냈어요 🦴 강아지들이 올 거예요' : '간식을 넣었어요'); }
    else if (k === 'Digit2') net.send({ t: 'cmd', type: 'sit' });
    else if (k === 'Digit3') net.send({ t: 'cmd', type: 'down' });
    else if (k === 'KeyF') { if (dist(me.x, me.z, BOWL.x, BOWL.z) > RANGE.bowl) ui.toast('사료 그릇 가까이 가세요 (창가 왼쪽)'); else net.send({ t: 'feed' }); }
  }
  // 안내 문구
  if (near) ui.prompt(me.treat ? `<b>E</b>${DOGS[near.id].name}에게 간식 주기` : `<b>E</b>${DOGS[near.id].name} 쓰다듬기`);
  else if (dist(me.x, me.z, BOWL.x, BOWL.z) <= RANGE.bowl) ui.prompt('<b>F</b>사료 채우기');
  else ui.prompt('');
}

// ---------- 이동 ----------
let sendAcc = 0, lastSent = '';
function movePlayer(dt) {
  if (!me.avatar) return;
  const { f, r, run } = input.typing ? { f: 0, r: 0, run: false } : input.axis();
  const moving = f !== 0 || r !== 0;
  const speed = run ? 4.8 : 2.6;
  if (moving) {
    const yaw = input.cam.yaw;
    // 카메라 기준 방향
    const fx = -Math.sin(yaw), fz = -Math.cos(yaw);
    const rx = Math.cos(yaw), rz = -Math.sin(yaw);
    let dx = fx * f + rx * r, dz = fz * f + rz * r;
    const len = Math.hypot(dx, dz); dx /= len; dz /= len;
    const nx = me.x + dx * speed * dt, nz = me.z + dz * speed * dt;
    if (isFree(nx, me.z, PLAYER_RADIUS)) me.x = nx;
    if (isFree(me.x, nz, PLAYER_RADIUS)) me.z = nz;
    me.ry = Math.atan2(dx, dz);
  }
  me.anim = moving ? (run ? 'run' : 'walk') : 'idle';
  me.avatar.mesh.position.set(me.x, 0, me.z);
  me.avatar.mesh.rotation.y = THREE.MathUtils.lerp(me.avatar.mesh.rotation.y, me.ry + Math.round((me.avatar.mesh.rotation.y - me.ry) / (Math.PI * 2)) * Math.PI * 2, 1 - Math.exp(-14 * dt));
  me.avatar.update(dt, me.anim, me.treat);

  sendAcc += dt;
  if (net && sendAcc > 1 / 15) {
    sendAcc = 0;
    const msg = { t: 'm', x: +me.x.toFixed(3), z: +me.z.toFixed(3), ry: +me.ry.toFixed(3), anim: me.anim };
    const key = JSON.stringify(msg);
    if (key !== lastSent) { lastSent = key; net.send(msg); }
  }
}

function updateOthers(dt) {
  const k = 1 - Math.exp(-12 * dt);
  for (const o of others.values()) {
    const m = o.avatar.mesh;
    m.position.x += (o.tx - m.position.x) * k; m.position.z += (o.tz - m.position.z) * k;
    let d = o.try - m.rotation.y; d = Math.atan2(Math.sin(d), Math.cos(d)); m.rotation.y += d * k;
    o.avatar.update(dt, o.anim, o.treat);
  }
}

function updateDogs(dt) {
  const k = 1 - Math.exp(-10 * dt);
  for (const d of Object.values(dogs)) {
    const m = d.mesh, n = d.net;
    const px = m.position.x, pz = m.position.z;
    m.position.x += (n.x - px) * k; m.position.z += (n.z - pz) * k;
    let r = n.ry - m.rotation.y; r = Math.atan2(Math.sin(r), Math.cos(r)); m.rotation.y += r * k;
    const moving = Math.hypot(n.x - px, n.z - pz) > 0.03 && ['wander', 'toBowl', 'toBed', 'approach'].includes(n.state);
    d.update(dt, n.state, moving);
  }
}

// ---------- 카메라 ----------
function updateCamera(dt) {
  const { yaw, pitch, dist: cd } = input.cam;
  const tx = me.x, ty = 1.35, tz = me.z;
  let cx = tx + Math.sin(yaw) * Math.cos(pitch) * cd, cy = ty + Math.sin(pitch) * cd, cz = tz + Math.cos(yaw) * Math.cos(pitch) * cd;
  // 벽 밖으로 못 나가게
  cx = Math.max(ROOM.minX + 0.25, Math.min(ROOM.maxX - 0.25, cx));
  cz = Math.max(ROOM.minZ + 0.25, Math.min(ROOM.maxZ - 0.25, cz));
  cy = Math.max(0.35, Math.min(ROOM.height - 0.15, cy));
  const k = 1 - Math.exp(-18 * dt);
  camera.position.lerp(new THREE.Vector3(cx, cy, cz), me.avatar ? k : 1);
  camera.lookAt(tx, ty, tz);
}

// ---------- 루프 ----------
function resize() { camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); renderer.setSize(innerWidth, innerHeight); }
addEventListener('resize', resize); resize();

const clock = new THREE.Clock();
renderer.setAnimationLoop(() => {
  const dt = Math.min(0.05, clock.getDelta());
  outside.update(dt);
  fx.update(dt);
  if (me.avatar) { handleActions(); movePlayer(dt); }
  updateOthers(dt);
  updateDogs(dt);
  updateCamera(dt);
  renderer.render(scene, camera);
});

// 개발 중 콘솔 테스트용
if (import.meta.env.DEV || location.hostname === 'localhost') window.__hb = { input, me, dogs, others, camera, get net() { return net; } };
