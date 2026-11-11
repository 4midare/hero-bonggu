// 키보드 + 마우스/터치 드래그(시점) + 휠(줌)
export function createInput(canvas) {
  const keys = new Set();
  const pressed = [];           // 이번 프레임에 눌린 키 (한 번만 처리)
  const cam = { yaw: 0, pitch: 0.38, dist: 4.6 };
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

  canvas.addEventListener('pointerdown', (e) => { drag = { x: e.clientX, y: e.clientY, id: e.pointerId }; dragMoved = 0; canvas.setPointerCapture(e.pointerId); });
  canvas.addEventListener('pointermove', (e) => {
    if (!drag || e.pointerId !== drag.id) return;
    const dx = e.clientX - drag.x, dy = e.clientY - drag.y; drag.x = e.clientX; drag.y = e.clientY;
    dragMoved += Math.abs(dx) + Math.abs(dy);
    cam.yaw -= dx * 0.006; cam.pitch = Math.max(-0.15, Math.min(1.2, cam.pitch + dy * 0.005));
  });
  canvas.addEventListener('pointerup', (e) => {
    if (drag && dragMoved < 6) clicks.push({ x: e.clientX, y: e.clientY });
    drag = null;
  });
  canvas.addEventListener('pointercancel', () => { drag = null; });
  canvas.addEventListener('wheel', (e) => { cam.dist = Math.max(1.8, Math.min(8, cam.dist + e.deltaY * 0.004)); e.preventDefault(); }, { passive: false });

  return {
    keys, cam,
    get typing() { return typing; }, set typing(v) { typing = v; if (v) keys.clear(); },
    down: (c) => keys.has(c),
    axis() {
      const f = (keys.has('KeyW') || keys.has('ArrowUp') ? 1 : 0) - (keys.has('KeyS') || keys.has('ArrowDown') ? 1 : 0);
      const r = (keys.has('KeyD') || keys.has('ArrowRight') ? 1 : 0) - (keys.has('KeyA') || keys.has('ArrowLeft') ? 1 : 0);
      return { f, r, run: keys.has('ShiftLeft') || keys.has('ShiftRight') };
    },
    takePressed() { const p = pressed.splice(0); return p; },
    takeClicks() { return clicks.splice(0); },
    press(code) { pressed.push(code); },  // 화면 버튼용
  };
}
