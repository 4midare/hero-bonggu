// HUD DOM
import { DOGS } from '../shared/world.js';

const STATE_KO = { idle: '멍하니', wander: '산책 중', sleep: '쿨쿨', eat: '냠냠', toBowl: '밥 먹으러', toBed: '방석으로', approach: '달려오는 중!', beg: '간식 기다림', sit: '앉아 ✓', down: '엎드려 ✓', happy: '좋아해요 💕' };

export function createUI() {
  const $ = (id) => document.getElementById(id);
  const dogsEl = $('dogs'), onlineEl = $('online'), promptEl = $('prompt'), toastEl = $('toast');
  const log = $('chat-log'), input = $('chat-input'), conn = $('conn');
  let toastT = null;

  const dogCards = {};
  for (const id of Object.keys(DOGS)) {
    const d = DOGS[id];
    const el = document.createElement('div'); el.className = 'dog';
    el.innerHTML = `<div class="n"><span class="sw" style="background:${d.color}"></span>${d.name} <small style="font-weight:500;color:#66727f">${d.breed}</small><span class="st"></span></div>
      <div class="lbl"><span>배부름</span><span class="hv"></span></div><div class="bar h"><i></i></div>
      <div class="lbl"><span>기분</span><span class="pv"></span></div><div class="bar p"><i></i></div>`;
    dogsEl.appendChild(el);
    dogCards[id] = { st: el.querySelector('.st'), h: el.querySelector('.bar.h i'), p: el.querySelector('.bar.p i'), hv: el.querySelector('.hv'), pv: el.querySelector('.pv') };
  }

  function addLine(html, sys) {
    const d = document.createElement('div'); if (sys) d.className = 'sys'; d.innerHTML = html; log.appendChild(d);
    while (log.children.length > 8) log.removeChild(log.firstChild);
  }
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  return {
    show() { $('join').style.display = 'none'; $('hud').hidden = false; },
    dog(id, state, hunger, happy) {
      const c = dogCards[id]; if (!c) return;
      c.st.textContent = STATE_KO[state] || state;
      c.h.style.width = hunger + '%'; c.p.style.width = happy + '%';
      c.hv.textContent = hunger + '%'; c.pv.textContent = happy + '%';
    },
    online(players, meId) {
      onlineEl.innerHTML = `<b>접속 ${players.size}명</b>` + [...players.values()].map(p => `<div class="pl"><i style="background:${p.color}"></i>${esc(p.name)}${p.id === meId ? ' (나)' : ''}</div>`).join('');
    },
    prompt(html) { if (!html) { promptEl.hidden = true; return; } promptEl.innerHTML = html; promptEl.hidden = false; },
    toast(text, ms = 1800) { toastEl.textContent = text; toastEl.hidden = false; clearTimeout(toastT); toastT = setTimeout(() => { toastEl.hidden = true; }, ms); },
    chat(name, text, color) { addLine(`<b style="color:${color || '#ffd9a8'}">${esc(name)}</b>${esc(text)}`); },
    sys(text) { addLine(esc(text), true); },
    conn(ok) { conn.hidden = ok; },
    treatButton(on) { document.querySelector('[data-key="Digit1"]').classList.toggle('on', on); },
    openChat() { input.hidden = false; input.focus(); },
    closeChat() { input.value = ''; input.hidden = true; input.blur(); },
    input, esc,
  };
}
