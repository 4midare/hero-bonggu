// 집 하나 = Durable Object 하나. WebSocket Hibernation API 사용.
import { initialSim, reviveSim, tick, actions } from './sim.js';
import { SPAWN } from '../shared/world.js';

const TICK_MS = 50;         // 시뮬레이션 20Hz
const SEND_EVERY = 2;       // 상태 전송 10Hz
const SAVE_MS = 20000;
const COLORS = ['#ff8c42', '#2e8bc0', '#7fb069', '#e0607e', '#9b7ede', '#f2c14e', '#4fb3bf', '#c97b5a'];

const clean = (s, n) => String(s ?? '').replace(/[\u0000-\u001f<>]/g, '').trim().slice(0, n);

export class Room {
  constructor(ctx, env) {
    this.ctx = ctx;
    this.players = new Map();   // id -> { id, name, color, x, z, ry, anim, treat, ws }
    this.sim = initialSim();
    this.timer = null;
    this.frame = 0;
    this.lastSave = Date.now();

    this.ctx.blockConcurrencyWhile(async () => {
      this.sim = reviveSim(await this.ctx.storage.get('sim'));
      // 휴면에서 깨어난 경우 기존 소켓 복원
      for (const ws of this.ctx.getWebSockets()) {
        const a = ws.deserializeAttachment();
        if (a?.id) this.players.set(a.id, this.newPlayer(a.id, a.name, a.color, ws));
      }
      if (this.players.size) this.ensureLoop();
    });
  }

  newPlayer(id, name, color, ws) {
    return { id, name, color, x: SPAWN.x, z: SPAWN.z, ry: 0, anim: 'idle', treat: false, ws };
  }

  async fetch(req) {
    if (req.headers.get('Upgrade') !== 'websocket') return new Response('websocket only', { status: 426 });
    const url = new URL(req.url);
    const name = clean(url.searchParams.get('name'), 12) || '손님';
    const pair = new WebSocketPair();
    const [client, server] = Object.values(pair);
    this.ctx.acceptWebSocket(server);

    const id = crypto.randomUUID().slice(0, 8);
    const color = COLORS[this.players.size % COLORS.length];
    server.serializeAttachment({ id, name, color });
    const p = this.newPlayer(id, name, color, server);
    this.players.set(id, p);

    this.send(server, {
      t: 'w', id, name, color,
      players: [...this.players.values()].map(q => ({ id: q.id, name: q.name, color: q.color })),
      dogs: this.sim.dogs, bowl: this.sim.bowl.food,
    });
    this.broadcast({ t: 'j', id, name, color }, id);
    this.ensureLoop();
    return new Response(null, { status: 101, webSocket: client });
  }

  playerOf(ws) {
    const a = ws.deserializeAttachment();
    return a?.id ? this.players.get(a.id) : null;
  }

  webSocketMessage(ws, raw) {
    const p = this.playerOf(ws); if (!p) return;
    let m; try { m = JSON.parse(raw); } catch { return; }
    const emit = (ev) => this.broadcast(ev);
    switch (m.t) {
      case 'm': // 이동
        if (Number.isFinite(m.x) && Number.isFinite(m.z)) { p.x = m.x; p.z = m.z; }
        if (Number.isFinite(m.ry)) p.ry = m.ry;
        p.anim = ['walk', 'run', 'sit', 'floor'].includes(m.anim) ? m.anim : 'idle';
        break;
      case 'treat': p.treat = !!m.on; break;
      case 'pet': actions.pet(this.sim, p, String(m.dog), emit); break;
      case 'cmd': actions.command(this.sim, p, String(m.type), emit); break;
      case 'come': actions.come(this.sim, p, emit); break;
      case 'give': actions.give(this.sim, p, String(m.dog), emit); break;
      case 'feed': actions.feed(this.sim, p, emit); break;
      case 'flick': {   // 딱밤: 가까이 있는 다른 사람에게만, 1.2초에 한 번
        const q = this.players.get(String(m.to)), now = Date.now();
        if (!q || q.id === p.id || now - (p.lastFlick || 0) < 1200) break;
        if (Math.hypot(q.x - p.x, q.z - p.z) > 2) break;
        p.lastFlick = now;
        this.broadcast({ t: 'ev', k: 'flick', by: p.id, to: q.id });
        break;
      }
      case 'chat': {
        const text = clean(m.text, 120);
        if (text) this.broadcast({ t: 'c', id: p.id, name: p.name, text });
        break;
      }
    }
  }

  webSocketClose(ws) { this.drop(ws); }
  webSocketError(ws) { this.drop(ws); }

  drop(ws) {
    const p = this.playerOf(ws);
    try { ws.close(1000, 'bye'); } catch {}
    if (!p) return;
    this.players.delete(p.id);
    this.broadcast({ t: 'l', id: p.id });
    if (this.players.size === 0) {
      clearInterval(this.timer); this.timer = null;
      this.ctx.storage.put('sim', this.sim);
    }
  }

  ensureLoop() {
    if (this.timer) return;
    let last = Date.now();
    this.timer = setInterval(() => {
      const now = Date.now();
      const dt = Math.min(0.25, (now - last) / 1000); last = now;
      tick(this.sim, this.players, dt, (ev) => this.broadcast(ev));
      if (++this.frame % SEND_EVERY === 0) this.broadcast(this.snapshot());
      if (now - this.lastSave > SAVE_MS) { this.lastSave = now; this.ctx.storage.put('sim', this.sim); }
    }, TICK_MS);
  }

  snapshot() {
    const p = [];
    for (const q of this.players.values()) p.push([q.id, +q.x.toFixed(3), +q.z.toFixed(3), +q.ry.toFixed(3), q.anim, q.treat ? 1 : 0]);
    const d = {};
    for (const g of Object.values(this.sim.dogs)) d[g.id] = [+g.x.toFixed(3), +g.z.toFixed(3), +g.ry.toFixed(3), g.state, Math.round(g.hunger), Math.round(g.happy)];
    return { t: 's', p, d, b: Math.round(this.sim.bowl.food) };
  }

  send(ws, obj) { try { ws.send(JSON.stringify(obj)); } catch {} }
  broadcast(obj, exceptId) {
    const s = JSON.stringify(obj);
    for (const q of this.players.values()) {
      if (q.id === exceptId) continue;
      try { q.ws.send(s); } catch {}
    }
  }
}
