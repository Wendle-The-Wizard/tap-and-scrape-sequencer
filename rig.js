// Wendle's wooden rig: a frame, four tapping arms and a labeled grid of beat slots.
const canvas = document.getElementById('rig');
const ctx = canvas.getContext('2d');
const W = canvas.width, H = canvas.height;

const STEPS = 8;
const CW = 52, CH = 20, GAP = 4;
const GW = STEPS * CW + (STEPS - 1) * GAP;
const GX = Math.round((W - GW) / 2);
const GY = 388;

const arms = [];
const pitches = [150, 0, 220, 0];
const scrapePitches = [0, 900, 0, 1400];
for (let i = 0; i < 4; i++) {
  arms.push({ x: 130 + i * 127, angle: 0, hit: 0, kind: i % 2 ? 'scrape' : 'tap', name: i % 2 ? 'Scrape' : 'Tap', pitch: i % 2 ? scrapePitches[i] : pitches[i] });
}

const slots = arms.map(() => new Array(STEPS).fill(false));
[0, 4].forEach(s => slots[0][s] = true);
[2, 6].forEach(s => slots[1][s] = true);
[1, 3, 5, 7].forEach(s => slots[2][s] = true);
[7].forEach(s => slots[3][s] = true);

// playback state
let playhead = -1;
let playing = false;
let step = 0;
let nextTime = 0;
let timer = null;
let queue = [];
let bpm = 110; // the tempo slider changes this

function slotRect(r, c) {
  return { x: GX + c * (CW + GAP), y: GY + r * (CH + GAP), w: CW, h: CH };
}

function plank(x, y, w, h, color) {
  ctx.fillStyle = color;
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = 'rgba(60,30,10,0.35)';
  ctx.lineWidth = 1;
  for (let g = 4; g < h; g += 7) {
    ctx.beginPath();
    ctx.moveTo(x, y + g);
    ctx.bezierCurveTo(x + w * 0.3, y + g - 2, x + w * 0.6, y + g + 2, x + w, y + g);
    ctx.stroke();
  }
  ctx.strokeStyle = '#2a160a';
  ctx.lineWidth = 2;
  ctx.strokeRect(x, y, w, h);
}

function drawArm(a) {
  const py = 62, len = 190;
  ctx.save();
  ctx.translate(a.x, py);
  ctx.rotate(a.angle);
  plank(-6, 0, 12, len, a.kind === 'tap' ? '#b9783c' : '#9c6a3a');
  ctx.fillStyle = '#6b3d1a';
  if (a.kind === 'tap') {
    ctx.beginPath(); ctx.arc(0, len + 6, 13, 0, 7); ctx.fill();
  } else {
    ctx.fillRect(-14, len - 2, 28, 10);
    ctx.strokeStyle = '#d8b07a';
    for (let k = -10; k <= 10; k += 5) {
      ctx.beginPath(); ctx.moveTo(k, len - 2); ctx.lineTo(k, len + 8); ctx.stroke();
    }
  }
  ctx.restore();
  ctx.fillStyle = '#d9a93a';
  ctx.beginPath(); ctx.arc(a.x, py, 7, 0, 7); ctx.fill();
  ctx.strokeStyle = '#6d5010'; ctx.lineWidth = 2; ctx.stroke();
}

function drawSlots() {
  plank(40, 346, 560, 154, '#5a3819');
  ctx.fillStyle = '#f3e2c4';
  ctx.font = '12px Georgia, serif';
  ctx.textAlign = 'center';
  ctx.fillText('BEAT GRID: steps 1-8, one row per arm (top to bottom)', W / 2, 362);
  // step numbers; the current one glows (dimmer marker at step 1 when stopped)
  const head = playhead >= 0 ? playhead : 0;
  for (let c = 0; c < STEPS; c++) {
    const s = slotRect(0, c);
    ctx.fillStyle = c === head ? (playing ? '#ffd27a' : '#c9a86a') : '#a88a62';
    ctx.font = (c === head ? 'bold ' : '') + '13px Georgia, serif';
    ctx.fillText(String(c + 1), s.x + CW / 2, GY - 6);
  }
  ctx.fillStyle = playing ? 'rgba(255,255,255,0.32)' : 'rgba(255,255,255,0.10)';
  ctx.fillRect(GX + head * (CW + GAP) - 2, GY - 3, CW + 4, 4 * (CH + GAP) + 2);
  for (let r = 0; r < arms.length; r++) {
    for (let c = 0; c < STEPS; c++) {
      const s = slotRect(r, c);
      const on = slots[r][c];
      const lit = playing && c === playhead && on;
      ctx.fillStyle = on ? (arms[r].kind === 'tap' ? (lit ? '#fff0b0' : '#ffd27a') : (lit ? '#d4ffd5' : '#9fe0a0')) : '#33200f';
      ctx.fillRect(s.x, s.y, s.w, s.h);
      ctx.strokeStyle = on ? '#fff3c4' : '#7a5230';
      ctx.lineWidth = 2;
      ctx.strokeRect(s.x, s.y, s.w, s.h);
    }
  }
}

function draw() {
  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = '#3a281b';
  ctx.fillRect(0, 0, W, H);
  plank(40, 40, 28, 300, '#8a5a2e');
  plank(572, 40, 28, 300, '#8a5a2e');
  plank(40, 40, 560, 36, '#a06a35');
  plank(40, 300, 560, 40, '#7a4c24');
  for (const a of arms) drawArm(a);
  ctx.textAlign = 'center';
  ctx.font = '12px Georgia, serif';
  arms.forEach((a, i) => {
    ctx.fillStyle = a.hit > 0 ? '#ffd27a' : '#4d2f16';
    ctx.fillRect(a.x - 26, 296, 52, 8);
    ctx.fillStyle = '#f3e2c4';
    ctx.fillText((i + 1) + ' ' + a.name, a.x, 324);
  });
  drawSlots();
}

function knock(a) {
  a.hit = 1;
  if (a.kind === 'tap') playTap(a.pitch); else playScrape(a.pitch);
}

// the scheduler looks a little ahead and books sounds at exact audio times.
// stepDur is worked out fresh each time so the tempo slider takes effect right away
function schedule() {
  const ac = audio(); if (!ac) return;
  while (nextTime < ac.currentTime + 0.15) {
    arms.forEach((a, i) => {
      if (slots[i][step]) {
        if (a.kind === 'tap') playTap(a.pitch, nextTime); else playScrape(a.pitch, nextTime);
      }
    });
    queue.push({ t: nextTime, step: step });
    nextTime += 60 / bpm / 2; // eighth notes
    step = (step + 1) % STEPS;
  }
}

const playBtn = document.getElementById('play');
const stopBtn = document.getElementById('stop');
const tempo = document.getElementById('tempo');
const bpmLabel = document.getElementById('bpm');

function startLoop() {
  const ac = audio(); if (!ac || playing) return;
  playing = true;
  step = 0;
  queue = [];
  nextTime = ac.currentTime + 0.08;
  schedule();
  timer = setInterval(schedule, 25);
  playBtn.disabled = true;
  stopBtn.disabled = false;
}

// stop: halt the scheduler, clear the queue and put the playhead back at the start
function stopLoop() {
  playing = false;
  clearInterval(timer);
  queue = [];
  playhead = -1;
  playBtn.disabled = false;
  stopBtn.disabled = true;
}

playBtn.addEventListener('click', startLoop);
stopBtn.addEventListener('click', stopLoop);
tempo.addEventListener('input', () => {
  bpm = +tempo.value;
  bpmLabel.textContent = bpm + ' BPM';
});

function update() {
  if (playing && actx) {
    while (queue.length && queue[0].t <= actx.currentTime) {
      const q = queue.shift();
      playhead = q.step;
      arms.forEach((a, i) => { if (slots[i][q.step]) a.hit = 1; });
    }
  }
  // a bigger swing so the arms clearly move when they hit
  for (const a of arms) {
    if (a.hit > 0) {
      a.hit -= 0.05;
      if (a.hit <= 0) { a.hit = 0; a.angle = 0; }
      else a.angle = Math.sin(a.hit * Math.PI) * 0.5 * (a.x < W / 2 ? 1 : -1);
    }
  }
  draw();
  requestAnimationFrame(update);
}

canvas.addEventListener('pointerdown', e => {
  const r = canvas.getBoundingClientRect();
  const x = (e.clientX - r.left) * W / r.width;
  const y = (e.clientY - r.top) * H / r.height;
  for (let row = 0; row < arms.length; row++) {
    for (let c = 0; c < STEPS; c++) {
      const s = slotRect(row, c);
      if (x >= s.x && x <= s.x + s.w && y >= s.y && y <= s.y + s.h) {
        slots[row][c] = !slots[row][c];
        if (slots[row][c] && !playing) knock(arms[row]);
        return;
      }
    }
  }
  if (y < 346) {
    let best = null;
    for (const a of arms) if (Math.abs(x - a.x) < 60 && (!best || Math.abs(x - a.x) < Math.abs(x - best.x))) best = a;
    if (best) knock(best);
  }
});

update();
