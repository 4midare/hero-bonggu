// WebSocket 클라이언트: 자동 재접속, 콜백 기반
export function connect(name, handlers) {
  let ws = null, closed = false, retry = 0;
  const url = `${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}/ws?name=${encodeURIComponent(name)}`;
  function open() {
    ws = new WebSocket(url);
    ws.onopen = () => { retry = 0; handlers.open?.(); };
    ws.onmessage = (e) => { let m; try { m = JSON.parse(e.data); } catch { return; } handlers.message?.(m); };
    ws.onclose = () => { handlers.close?.(); if (!closed) setTimeout(open, Math.min(8000, 500 * 2 ** retry++)); };
    ws.onerror = () => { try { ws.close(); } catch {} };
  }
  open();
  return {
    send(obj) { if (ws && ws.readyState === 1) ws.send(JSON.stringify(obj)); },
    close() { closed = true; ws?.close(); },
    get ready() { return !!ws && ws.readyState === 1; },
  };
}
