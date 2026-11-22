// Wendle's wooden rig: a frame, a drum board and four tapping arms.
const canvas = document.getElementById('rig');
const ctx = canvas.getContext('2d');
const W = canvas.width, H = canvas.height;

// four arms, each hangs from a pivot on the top beam
const arms = [];
for (let i = 0; i < 4; i++) {
  arms.push({ x: 130 + i * 127, angle: 0, hit: 0, kind: i % 2 ? 'scrape' : 'tap' });
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
  // the tip: round knob for taps, ridged for scrapes
  if (a.kind === 'tap') {
    ctx.fillStyle = '#6b3d1a';
    ctx.beginPath(); ctx.arc(0, len + 6, 13, 0, 7); ctx.fill();
  } else {
    ctx.fillStyle = '#6b3d1a';
    ctx.fillRect(-14, len - 2, 28, 10);
    ctx.strokeStyle = '#d8b07a';
    for (let k = -10; k <= 10; k += 5) {
      ctx.beginPath(); ctx.moveTo(k, len - 2); ctx.lineTo(k, len + 8); ctx.stroke();
    }
  }
  ctx.restore();
  // brass pivot pin
  ctx.fillStyle = '#d9a93a';
  ctx.beginPath(); ctx.arc(a.x, py, 7, 0, 7); ctx.fill();
  ctx.strokeStyle = '#6d5010'; ctx.lineWidth = 2; ctx.stroke();
}

function draw() {
  ctx.clearRect(0, 0, W, H);
  // back wall
  ctx.fillStyle = '#3a281b';
  ctx.fillRect(0, 0, W, H);
  // frame: two posts and a top beam
  plank(40, 40, 28, 300, '#8a5a2e');
  plank(572, 40, 28, 300, '#8a5a2e');
  plank(40, 40, 560, 36, '#a06a35');
  // drum board at the bottom
  plank(40, 300, 560, 40, '#7a4c24');
  for (const a of arms) drawArm(a);
  // little pads on the board under each arm
  for (const a of arms) {
    ctx.fillStyle = a.hit > 0 ? '#ffd27a' : '#4d2f16';
    ctx.fillRect(a.x - 26, 296, 52, 8);
  }
}

// swing an arm: it rises a bit, then drops and knocks
function knock(a) { a.hit = 1; }

function update() {
  for (const a of arms) {
    if (a.hit > 0) {
      a.hit -= 0.06;
      // swing back then forward as hit goes 1 -> 0
      a.angle = Math.sin(a.hit * Math.PI) * 0.35 * (a.hit > 0.5 ? -1 : 1) * 0.6;
      if (a.hit <= 0) { a.hit = 0; a.angle = 0; }
    }
  }
  draw();
  requestAnimationFrame(update);
}

// tap an arm (or its pad) to make it knock
canvas.addEventListener('pointerdown', e => {
  const r = canvas.getBoundingClientRect();
  const x = (e.clientX - r.left) * W / r.width;
  for (const a of arms) if (Math.abs(x - a.x) < 60) knock(a);
});

update();
