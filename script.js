
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

// Tap code - 5×5 Polybius square, C and K share the same code
const TAP = {
    A: '. .', B: '. ..', C: '. ...', D: '. ....', E: '. .....',
    F: '.. .', G: '.. ..', H: '.. ...', I: '.. ....', J: '.. .....',
    K: '. ...',  // same as C
    L: '... .', M: '... ..', N: '... ...', O: '... ....', P: '... .....',
    Q: '.... .', R: '.... ..', S: '.... ...', T: '.... ....', U: '.... .....',
    V: '..... .', W: '..... ..', X: '..... ...', Y: '..... ....', Z: '..... .....'
};
// Numbers and punctuation stay in Morse only — tap is letters only
const TAP_REVERSE = {};
Object.entries(TAP).forEach(([k, v]) => {
    if (!TAP_REVERSE[v]) TAP_REVERSE[v] = k; // first mapping wins (C before K)
});

let playing = false, stopFlag = false, audioCtx = null;
const speeds = [0.4, 0.65, 1, 1.5, 2.2];
const speedNames = ['Slow', 'Slower', 'Normal', 'Fast', 'Fastest'];
let speedMult = 1;
let mode = 'morse'; // 'morse' | 'tap'



function setMode(m) {
    mode = m;
    document.body.classList.toggle('tap-mode', mode === 'tap');
    const btn = document.getElementById('mode-btn');
    const modeLabel = document.getElementById('mode-label');
    const tapNote = document.getElementById('tap-note');
    const speedRow = document.getElementById('speed-row');

    if (mode === 'tap') {
        btn.textContent = 'Switch to Morse';
        btn.classList.add('active-mode');
        modeLabel.textContent = 'Tap Code';
        tapNote.style.display = 'block';
        speedRow.style.display = 'none'; // tap speed fixed for clarity
    } else {
        btn.textContent = 'Switch to Tap Code';
        btn.classList.remove('active-mode');
        modeLabel.textContent = 'Morse Code';
        tapNote.style.display = 'none';
        speedRow.style.display = 'flex';
    }
    encodeText();
    buildRefGrid();
}

function toggleMode() {
    setMode(mode === 'morse' ? 'tap' : 'morse');
}



function encodeText() {
    const txt = document.getElementById('input-text').value.toUpperCase();
    const el = document.getElementById('morse-out');
    const placeholder = mode === 'morse' ? 'Your morse code appears here' : 'Your tap code appears here';
    if (!txt.trim()) { el.textContent = placeholder; el.classList.add('placeholder'); return; }
    el.classList.remove('placeholder');

    if (mode === 'morse') {
        const enc = txt.split(' ')
            .map(w => w.split('').map(c => MORSE[c] || '').filter(Boolean).join(' '))
            .join(' / ');
        el.textContent = enc || '—';
    } else {
        // Tap: letters only; unknown chars skipped; words separated by |
        const enc = txt.split(' ')
            .map(w => w.split('').map(c => TAP[c] || null).filter(Boolean).join('  ')) // 2 spaces between letters
            .filter(w => w.length)
            .join('  |  ');
        el.textContent = enc || '— (tap code: letters only)';
    }
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

function beep(dur, freq) {
    return new Promise(res => {
        const ctx = getCtx();
        const osc = ctx.createOscillator();
        const g = ctx.createGain();
        osc.connect(g); g.connect(ctx.destination);
        osc.frequency.value = freq || 620;
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
    const placeholder = mode === 'morse' ? 'Your morse code appears here' : 'Your tap code appears here';
    if (!morse || morse === placeholder) return;
    playing = true; stopFlag = false;
    document.getElementById('play-status').textContent = 'Playing…';

    if (mode === 'morse') {
        await playMorseString(morse);
    } else {
        await playTapString(morse);
    }

    flash(false); playing = false;
    document.getElementById('play-status').textContent = stopFlag ? 'Stopped.' : 'Done ?';
    setTimeout(() => { document.getElementById('play-status').textContent = ''; }, 1500);
}

async function playMorseString(morse) {
    const unit = 120 / speedMult;
    for (const ch of morse) {
        if (stopFlag) break;
        if (ch === '.') { flash(true); await beep(unit / 1000); flash(false); await sleep(unit); }
        else if (ch === '-') { flash(true); await beep(unit * 3 / 1000); flash(false); await sleep(unit); }
        else if (ch === ' ') { await sleep(unit * 2); }
        else if (ch === '/') { await sleep(unit * 4); }
    }
}

async function playTapString(tapStr) {
    // Tap code: short sharp taps at fixed tempo
    // '.' = one tap, ' ' = gap between taps in same group (row/col)
    // '  ' (two spaces) = letter gap, '|' = word gap
    const TAP_UNIT = 120; // ms per tap
    const TAP_INTRA = 200; // gap between taps within a group (row dots vs col dots)
    const TAP_INTER = 400; // gap between letters
    const TAP_WORD = 700; // gap between words

    // Split by word separator first
    const words = tapStr.split('|').map(w => w.trim());
    for (let wi = 0; wi < words.length; wi++) {
        if (stopFlag) break;
        if (wi > 0) await sleep(TAP_WORD);

        // Split by letter (double-space separator)
        const letters = words[wi].split('  ').map(l => l.trim()).filter(Boolean);
        for (let li = 0; li < letters.length; li++) {
            if (stopFlag) break;
            if (li > 0) await sleep(TAP_INTER);

            // Each letter is "row col" e.g. '. ...'
            // Single space separates row group from col group
            const groups = letters[li].split(' ').filter(Boolean);
            // groups[0] = row dots, groups[1] = col dots (may be undefined for single-group)
            for (let gi = 0; gi < groups.length; gi++) {
                if (stopFlag) break;
                if (gi > 0) await sleep(TAP_INTRA);
                const dots = groups[gi];
                for (let di = 0; di < dots.length; di++) {
                    if (stopFlag) break;
                    if (di > 0) await sleep(TAP_UNIT * 0.6);
                    flash(true);
                    await beep(0.045, 800); // short sharp tap sound
                    flash(false);
                }
            }
        }
    }
}

function stopMorse() { stopFlag = true; flash(false); }

function copyMorse() {
    const t = document.getElementById('morse-out').textContent;
    const placeholder = mode === 'morse' ? 'Your morse code appears here' : 'Your tap code appears here';
    if (t === placeholder) return;
    navigator.clipboard.writeText(t).catch(() => { }); //change to play sound
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



function buildRefGrid() {
    const grid = document.getElementById('ref-grid');
    grid.innerHTML = '';
    const source = mode === 'morse' ? MORSE : TAP;
    // For tap mode, skip K (duplicate of C) in display
    const entries = Object.entries(source).filter(([k]) => !(mode === 'tap' && k === 'K'));
    entries.forEach(([k, v]) => {
        const cell = document.createElement('div');
        cell.className = 'ref-cell';
        const note = (mode === 'tap' && k === 'C') ? '<div class="ref-note">C / K</div>' : '';
        cell.innerHTML = `<div class="ref-char">${k}</div><div class="ref-morse">${v}</div>${note}`;
        cell.onclick = () => { navigator.clipboard.writeText(v).catch(() => { }); showToast(`Copied ${v}`); };
        grid.appendChild(cell);
    });
}



buildRefGrid();
updateSpeed(3);

// PWA service worker
if ('serviceWorker' in navigator) {
    const swCode = `
    const CACHE='morse-v1';
    self.addEventListener('install',e=>{e.waitUntil(caches.open(CACHE).then(c=>c.addAll([])));self.skipWaiting();});
    self.addEventListener('activate',e=>{e.waitUntil(clients.claim());});
    self.addEventListener('fetch',e=>{e.respondWith(caches.match(e.request).then(r=>r||fetch(e.request)));});
  `;
    const blob = new Blob([swCode], { type: 'application/javascript' });
    const url = URL.createObjectURL(blob);
    navigator.serviceWorker.register(url).catch(() => { });
}

const manifest = {
    name: 'Morse Code',
    short_name: 'Morse',
    description: 'Translate, play, and decode Morse code',
    start_url: '.',
    display: 'standalone',
    background_color: '#0f0f0f',
    theme_color: '#1a1a1a',
    icons: [{
        src: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 512 512'%3E%3Crect width='512' height='512' fill='%231c1c1c'/%3E%3Ccircle cx='160' cy='256' r='60' fill='%23d4a843'/%3E%3Crect x='260' y='216' width='140' height='80' rx='12' fill='%23d4a843'/%3E%3C/svg%3E",
        sizes: '512x512', type: 'image/svg+xml'
    }]
};
const mblob = new Blob([JSON.stringify(manifest)], { type: 'application/json' });
const murl = URL.createObjectURL(mblob);
const mlink = document.createElement('link');
mlink.rel = 'manifest'; mlink.href = murl;
document.head.appendChild(mlink);