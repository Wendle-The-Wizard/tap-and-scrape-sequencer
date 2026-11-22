// Wendle's wooden rig: a frame, a drum board, four tapping arms and a grid of beat slots.
const canvas = document.getElementById('rig');
const ctx = canvas.getContext('2d');
const W = canvas.width, H = canvas.height;

// four arms, each hangs from a pivot on the top beam
const arms = [];
for (let i = 0; i < 4; i++) {
  arms.push({ x: 130 + i * 127, angle: 0, hit: 0, kind: i % 2 ? 'scrape' : 'tap' });
}

// beat slots: one row per arm, 8 steps each. true = on
const STEPS = 8;
const slots = arms.map(() => new Array(STEPS).fill(false));
// a starting pattern so it isn't empty
[0, 4].forEach(s => slots[0][s] = true);
[2, 6].forEach(s => slots[1][s] = true);

// where the slot grid lives (below the rig)
const GX = 100, GY = 358, CW = 52, CH = 20, GAP = 4;
function slotRect(r, c) {
  return { x: GX + c * (CW + GAP) - 20 + 20, y: GY + r * (CH + GAP), w: CW, h: CH };
}

// wood grain helper: a plank with a few lines
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

// the slot grid: glowing pegs when on, dark wood when off
function drawSlots() {
  plank(40, 346, 560, 108, '#5a3819');
  for (let r = 0; r < arms.length; r++) {
    for (let c = 0; c < STEPS; c++) {
      const s = slotRect(r, c);
      const on = slots[r][c];
      ctx.fillStyle = on ? (arms[r].kind === 'tap' ? '#ffd27a' : '#9fe0a0') : '#33200f';
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
  for (const a of arms) {
    ctx.fillStyle = a.hit > 0 ? '#ffd27a' : '#4d2f16';
    ctx.fillRect(a.x - 26, 296, 52, 8);
  }
  drawSlots();
}

function knock(a) { a.hit = 1; }

function update() {
  for (const a of arms) {
    if (a.hit > 0) {
      a.hit -= 0.06;
      a.angle = Math.sin(a.hit * Math.PI) * 0.35 * (a.hit > 0.5 ? -1 : 1) * 0.6;
      if (a.hit <= 0) { a.hit = 0; a.angle = 0; }
    }
  }
  draw();
  requestAnimationFrame(update);
}

// tap a slot to flip it; tap above the grid to knock an arm
canvas.addEventListener('pointerdown', e => {
  const r = canvas.getBoundingClientRect();
  const x = (e.clientX - r.left) * W / r.width;
  const y = (e.clientY - r.top) * H / r.height;
  for (let row = 0; row < arms.length; row++) {
    for (let c = 0; c < STEPS; c++) {
      const s = slotRect(row, c);
      if (x >= s.x && x <= s.x + s.w && y >= s.y && y <= s.y + s.h) {
        slots[row][c] = !slots[row][c];
        if (slots[row][c]) knock(arms[row]); // a little knock as feedback
        return;
      }
    }
  }
  if (y < 346) for (const a of arms) if (Math.abs(x - a.x) < 60) knock(a);
});

update();
