const MORSE = {
    A: '.-', B: '-...', C: '-.-.', D: '-..', E: '.', F: '..-.', G: '--.', H: '....', I: '..', J: '.---',
    K: '-.-', L: '.-..', M: '--', N: '-.', O: '---', P: '.--.', Q: '--.-', R: '.-.', S: '...', T: '-',
    U: '..-', V: '...-', W: '.--', X: '-..-', Y: '-.--', Z: '--..',
    '0': '-----', '1': '.----', '2': '..---', '3': '...--', '4': '....-', '5': '.....',
    '6': '-....', '7': '--...', '8': '---..', '9': '----.',
    '.': '.-.-.-', ',': '--..--', '?': '..--..', '!': '-.-.--',
    '/': '-..-.', '@': '.--.-.', '=': '-...-'
};
const REVERSE = {};
Object.entries(MORSE).forEach(([k, v]) => REVERSE[v] = k);

let playing = false, stopFlag = false, audioCtx = null;
const speeds = [0.4, 0.65, 1, 1.5, 2.2];
const speedNames = ['Slow', 'Slower', 'Normal', 'Fast', 'Fastest'];
let speedMult = 1;

function encodeText() {
    const txt = document.getElementById('input-text').value.toUpperCase();
    const el = document.getElementById('morse-out');
    if (!txt.trim()) { el.textContent = 'Your morse code appears here'; el.classList.add('placeholder'); return; }
    el.classList.remove('placeholder');
    const enc = txt.split(' ').map(w => w.split('').map(c => MORSE[c] || '').filter(Boolean).join(' ')).join(' / ');
    el.textContent = enc || '—';
}

function decodeMorse() {
    const raw = document.getElementById('input-morse').value.replace(/[·•]/g, '.').replace(/[–—]/g, '-').trim();
    const el = document.getElementById('decoded-out');
    if (!raw) { el.textContent = 'Decoded text appears here'; el.classList.add('placeholder'); return; }
    el.classList.remove('placeholder');
    const dec = raw.split('/').map(w => w.trim().split(' ').map(s => REVERSE[s.trim()] || '?').join('')).join(' ');
    el.textContent = dec || '—';
}

function updateSpeed(v) {
    speedMult = speeds[v - 1];
    document.getElementById('speed-label').textContent = speedNames[v - 1];
}

function getCtx() {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    if (audioCtx.state === 'suspended') audioCtx.resume();
    return audioCtx;
}

function beep(dur) {
    return new Promise(res => {
        const ctx = getCtx();
        const osc = ctx.createOscillator();
        const g = ctx.createGain();
        osc.connect(g); g.connect(ctx.destination);
        osc.frequency.value = 620;
        g.gain.setValueAtTime(0.5, ctx.currentTime);
        g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur - 0.01);
        osc.start(ctx.currentTime); osc.stop(ctx.currentTime + dur);
        setTimeout(res, dur * 1000);
    });
}
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
function flash(on) { document.getElementById('flash-light').classList.toggle('on', on); }

async function playMorse() {
    if (playing) return;
    const morse = document.getElementById('morse-out').textContent;
    if (!morse || morse === 'Your morse code appears here') return;
    playing = true; stopFlag = false;
    const unit = 120 / speedMult;
    document.getElementById('play-status').textContent = 'Playing…';
    for (const ch of morse) {
        if (stopFlag) break;
        if (ch === '.') { flash(true); await beep(unit / 1000); flash(false); await sleep(unit); }
        else if (ch === '-') { flash(true); await beep(unit * 3 / 1000); flash(false); await sleep(unit); }
        else if (ch === ' ') { await sleep(unit * 2); }
        else if (ch === '/') { await sleep(unit * 4); }
    }
    flash(false); playing = false;
    document.getElementById('play-status').textContent = stopFlag ? 'Stopped.' : 'Done ?';
    setTimeout(() => { document.getElementById('play-status').textContent = ''; }, 1500);
}

function stopMorse() { stopFlag = true; flash(false); }

function copyMorse() {
    const t = document.getElementById('morse-out').textContent;
    if (t === 'Your morse code appears here') return;
    navigator.clipboard.writeText(t).catch(() => { });
    showToast('Copied to clipboard');
}

function showToast(msg) {
    const el = document.getElementById('toast');
    el.textContent = msg; el.classList.add('show');
    setTimeout(() => el.classList.remove('show'), 1800);
}

function switchTab(tab) {
    document.querySelectorAll('.tab').forEach((t, i) => {
        const names = ['encode', 'decode', 'ref'];
        t.classList.toggle('active', names[i] === tab);
    });
    document.querySelectorAll('.panel').forEach(p => {
        p.classList.toggle('active', p.id === 'panel-' + tab);
    });
}

// Build reference grid
const grid = document.getElementById('ref-grid');
Object.entries(MORSE).forEach(([k, v]) => {
    const cell = document.createElement('div');
    cell.className = 'ref-cell';
    cell.innerHTML = `<div class="ref-char">${k}</div><div class="ref-morse">${v}</div>`;
    cell.onclick = () => { navigator.clipboard.writeText(v).catch(() => { }); showToast(`Copied ${v}`); };
    grid.appendChild(cell);
});

updateSpeed(3);

// Register service worker (inline, via blob)
if ('serviceWorker' in navigator) {
    const swCode = `
    const CACHE='morse-v1';
    const ASSETS=['/'];
    self.addEventListener('install',e=>{e.waitUntil(caches.open(CACHE).then(c=>c.addAll([])));self.skipWaiting();});
    self.addEventListener('activate',e=>{e.waitUntil(clients.claim());});
    self.addEventListener('fetch',e=>{e.respondWith(caches.match(e.request).then(r=>r||fetch(e.request)));});
  `;
    const blob = new Blob([swCode], { type: 'application/javascript' });
    const url = URL.createObjectURL(blob);
    navigator.serviceWorker.register(url).catch(() => { });
}

        const manifest={
            name:'Morse Code',
        short_name:'Morse',
        description:'Translate, play, and decode Morse code',
        start_url:'.',
        display:'standalone',
        background_color:'#0f0f0f',
        theme_color:'#1a1a1a',
        icons:[
        {src:"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 512 512'%3E%3Crect width='512' height='512' fill='%231c1c1c'/%3E%3Ccircle cx='160' cy='256' r='60' fill='%23d4a843'/%3E%3Crect x='260' y='216' width='140' height='80' rx='12' fill='%23d4a843'/%3E%3C/svg%3E",sizes:'512x512',type:'image/svg+xml'}
        ]
};
        const blob=new Blob([JSON.stringify(manifest)],{type:'application/json'});
        const url=URL.createObjectURL(blob);
        const link=document.createElement('link');
        link.rel='manifest';link.href=url;
        document.head.appendChild(link);