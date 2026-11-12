import * as THREE from 'three';

// 펠트 인형 느낌: 거칠고 광택 없는 재질
export const felt = (color, extra = {}) =>
  new THREE.MeshStandardMaterial({ color, roughness: 0.95, metalness: 0, ...extra });

export function box(w, h, d, mat, x = 0, y = 0, z = 0) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  m.position.set(x, y, z); m.castShadow = true; m.receiveShadow = true;
  return m;
}
export function cyl(rt, rb, h, mat, x = 0, y = 0, z = 0, seg = 24) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), mat);
  m.position.set(x, y, z); m.castShadow = true; m.receiveShadow = true;
  return m;
}
export function sphere(r, mat, x = 0, y = 0, z = 0, w = 18, h = 14) {
  const m = new THREE.Mesh(new THREE.SphereGeometry(r, w, h), mat);
  m.position.set(x, y, z); m.castShadow = true; m.receiveShadow = true;
  return m;
}

export function canvasTexture(w, h, draw, repeat) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  if (repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(repeat[0], repeat[1]); }
  return t;
}

// 머리 위 라벨 (이름표·말풍선)
export function makeLabel(text, { bg = 'rgba(31,41,51,.75)', fg = '#fff', size = 28, pad = 14 } = {}) {
  const c = document.createElement('canvas');
  const ctx = c.getContext('2d');
  const font = `700 ${size}px 'Apple SD Gothic Neo','Malgun Gothic',system-ui,sans-serif`;
  ctx.font = font;
  const tw = Math.ceil(ctx.measureText(text).width);
  c.width = tw + pad * 2; c.height = size + pad * 1.4;
  const ctx2 = c.getContext('2d');
  ctx2.font = font;   // 캔버스 크기를 바꾸면 font 가 초기화되므로 다시 지정
  ctx2.fillStyle = bg;
  const r = c.height / 2;
  ctx2.beginPath(); ctx2.roundRect(0, 0, c.width, c.height, r); ctx2.fill();
  ctx2.fillStyle = fg; ctx2.textBaseline = 'middle'; ctx2.textAlign = 'center';
  ctx2.fillText(text, c.width / 2, c.height / 2 + 1);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, transparent: true, depthWrite: false }));
  const k = 0.0042;
  s.scale.set(c.width * k, c.height * k, 1);
  return s;
}
