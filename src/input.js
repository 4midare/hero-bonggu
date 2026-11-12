// 키보드 + 마우스/터치 드래그(시점) + 휠·핀치(줌) + 터치 조이스틱(이동)
export function createInput(canvas, stickEl) {
  const keys = new Set();
  const pressed = [];           // 이번 프레임에 눌린 키 (한 번만 처리)
  const cam = { yaw: 0, pitch: 0.42, dist: 3.8 };
  let typing = false;
  let drag = null, dragMoved = 0;
  const clicks = [];

  window.addEventListener('keydown', (e) => {
    if (typing) return;
    if (!keys.has(e.code)) pressed.push(e.code);
    keys.add(e.code);
    if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) e.preventDefault();
  });
  window.addEventListener('keyup', (e) => keys.delete(e.code));
  window.addEventListener('blur', () => keys.clear());

  // 캔버스 포인터: 한 손가락 = 시점 회전/탭, 두 손가락 = 핀치 줌
  const pts = new Map(); let pinch = 0;
  const clampDist = (d) => Math.max(1.2, Math.min(8, d));
  // iOS: 브라우저가 스크롤/뒤로가기 제스처로 가져가면 pointercancel 이 나서 시점이 안 돌아간다 → 터치 기본 동작을 막는다
  for (const t of ['touchstart', 'touchmove', 'touchend']) canvas.addEventListener(t, (e) => { if (e.cancelable) e.preventDefault(); }, { passive: false });
  canvas.addEventListener('pointerdown', (e) => {
    if (e.isPrimary) { pts.clear(); pinch = 0; }   // 이전 터치가 정리되지 않고 남아 있으면 핀치로 오인한다
    pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
    try { canvas.setPointerCapture(e.pointerId); } catch {}
    if (pts.size === 1) { drag = { x: e.clientX, y: e.clientY, id: e.pointerId }; dragMoved = 0; }
    else if (pts.size === 2) { const [a, b] = [...pts.values()]; pinch = Math.hypot(a.x - b.x, a.y - b.y); dragMoved = 99; }
  });
  canvas.addEventListener('pointermove', (e) => {
    if (!pts.has(e.pointerId)) return;
    pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pts.size >= 2) {
      const [a, b] = [...pts.values()]; const d = Math.hypot(a.x - b.x, a.y - b.y);
      if (pinch > 0) cam.dist = clampDist(cam.dist * (pinch / Math.max(1, d)));
      pinch = d; return;
    }
    if (!drag || e.pointerId !== drag.id) return;
    const dx = e.clientX - drag.x, dy = e.clientY - drag.y; drag.x = e.clientX; drag.y = e.clientY;
    dragMoved += Math.abs(dx) + Math.abs(dy);
    cam.yaw -= dx * 0.006; cam.pitch = Math.max(-0.15, Math.min(1.2, cam.pitch + dy * 0.005));
  });
  const endPtr = (e, cancel) => {
    if (!pts.has(e.pointerId)) return;
    pts.delete(e.pointerId);
    if (!cancel && drag && e.pointerId === drag.id && dragMoved < 8 && pts.size === 0) clicks.push({ x: e.clientX, y: e.clientY });
    if (pts.size === 1) { const [id, p] = [...pts.entries()][0]; drag = { x: p.x, y: p.y, id }; dragMoved = 99; pinch = 0; }
    else if (pts.size === 0) { drag = null; pinch = 0; }
  };
  canvas.addEventListener('pointerup', (e) => endPtr(e, false));
  canvas.addEventListener('pointercancel', (e) => endPtr(e, true));
  window.addEventListener('blur', () => { pts.clear(); drag = null; pinch = 0; });

  // 터치 조이스틱
  const stick = { x: 0, y: 0, id: null };
  if (stickEl) {
    const knob = stickEl.querySelector('.knob');
    const set = (e) => {
      const r = stickEl.getBoundingClientRect(), R = r.width / 2;
      let x = (e.clientX - (r.left + R)) / R, y = (e.clientY - (r.top + R)) / R;
      const m = Math.hypot(x, y); if (m > 1) { x /= m; y /= m; }
      stick.x = x; stick.y = y;
      knob.style.transform = `translate(${x * R * 0.62}px, ${y * R * 0.62}px)`;
    };
    const end = (e) => { if (e.pointerId !== stick.id) return; stick.id = null; stick.x = stick.y = 0; knob.style.transform = ''; };
    stickEl.addEventListener('pointerdown', (e) => { stick.id = e.pointerId; try { stickEl.setPointerCapture(e.pointerId); } catch {} set(e); e.preventDefault(); });
    stickEl.addEventListener('pointermove', (e) => { if (e.pointerId === stick.id) set(e); });
    stickEl.addEventListener('pointerup', end); stickEl.addEventListener('pointercancel', end);
  }
  canvas.addEventListener('wheel', (e) => { cam.dist = clampDist(cam.dist + e.deltaY * 0.004); e.preventDefault(); }, { passive: false });

  return {
    keys, cam,
    get typing() { return typing; }, set typing(v) { typing = v; if (v) keys.clear(); },
    down: (c) => keys.has(c),
    axis() {
      const f = (keys.has('KeyW') || keys.has('ArrowUp') ? 1 : 0) - (keys.has('KeyS') || keys.has('ArrowDown') ? 1 : 0);
      const r = (keys.has('KeyD') || keys.has('ArrowRight') ? 1 : 0) - (keys.has('KeyA') || keys.has('ArrowLeft') ? 1 : 0);
      const sm = Math.hypot(stick.x, stick.y);
      if (sm > 0.18) return { f: -stick.y, r: stick.x, run: sm > 0.92 };   // 조이스틱: 끝까지 밀면 달리기
      return { f, r, run: keys.has('ShiftLeft') || keys.has('ShiftRight') };
    },
    takePressed() { const p = pressed.splice(0); return p; },
    takeClicks() { return clicks.splice(0); },
    press(code) { pressed.push(code); },  // 화면 버튼용
  };
}
