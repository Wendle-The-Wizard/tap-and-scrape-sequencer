// Wendle's sound workshop: all sounds are made from noise and little oscillators.
let actx = null;
let noiseBuf = null;

// browsers only allow audio after a tap, so make the context lazily
function audio() {
  if (!actx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    actx = new AC();
    // one second of white noise to reuse
    noiseBuf = actx.createBuffer(1, actx.sampleRate, actx.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  if (actx.state === 'suspended') actx.resume();
  return actx;
}

// a wooden tap: a short pitched thump that drops fast, plus a tiny click
function playTap(pitch, when) {
  const a = audio(); if (!a) return;
  const t = when || a.currentTime;
  const o = a.createOscillator();
  const g = a.createGain();
  o.type = 'triangle';
  o.frequency.setValueAtTime(pitch * 2, t);
  o.frequency.exponentialRampToValueAtTime(pitch, t + 0.05);
  g.gain.setValueAtTime(0.7, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
  o.connect(g); g.connect(a.destination);
  o.start(t); o.stop(t + 0.2);
  // click
  const n = a.createBufferSource();
  const ng = a.createGain();
  const f = a.createBiquadFilter();
  n.buffer = noiseBuf;
  f.type = 'bandpass'; f.frequency.value = 2500;
  ng.gain.setValueAtTime(0.3, t);
  ng.gain.exponentialRampToValueAtTime(0.001, t + 0.02);
  n.connect(f); f.connect(ng); ng.connect(a.destination);
  n.start(t); n.stop(t + 0.03);
}

// a scrape: filtered noise that sweeps up, wobbled by a fast tremolo for ridges
function playScrape(pitch, when) {
  const a = audio(); if (!a) return;
  const t = when || a.currentTime;
  const dur = 0.28;
  const n = a.createBufferSource();
  n.buffer = noiseBuf;
  const f = a.createBiquadFilter();
  f.type = 'bandpass'; f.Q.value = 3;
  f.frequency.setValueAtTime(pitch, t);
  f.frequency.exponentialRampToValueAtTime(pitch * 2.2, t + dur);
  const g = a.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(0.5, t + 0.05);
  g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  const lfo = a.createOscillator();
  const lg = a.createGain();
  lfo.frequency.value = 38; lg.gain.value = 0.25;
  lfo.connect(lg); lg.connect(g.gain);
  n.connect(f); f.connect(g); g.connect(a.destination);
  n.start(t); n.stop(t + dur + 0.02);
  lfo.start(t); lfo.stop(t + dur + 0.02);
}
