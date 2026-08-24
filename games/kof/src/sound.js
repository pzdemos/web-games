// WebAudio 合成音效 + 简易 BGM 音序器（无音频文件）
let AC = null, master = null, musicGain = null, sfxGain = null;
let muted = localStorage.getItem('kof.mute') === '1';

function ctx() {
  if (!AC) {
    AC = new (window.AudioContext || window.webkitAudioContext)();
    master = AC.createGain();
    master.gain.value = muted ? 0 : 1;
    master.connect(AC.destination);
    musicGain = AC.createGain(); musicGain.gain.value = 0.16; musicGain.connect(master);
    sfxGain = AC.createGain(); sfxGain.gain.value = 0.5; sfxGain.connect(master);
  }
  if (AC.state === 'suspended') AC.resume();
  return AC;
}

export function toggleMute() {
  muted = !muted;
  localStorage.setItem('kof.mute', muted ? '1' : '0');
  if (master) master.gain.setTargetAtTime(muted ? 0 : 1, AC.currentTime, .02);
  return muted;
}
export const isMuted = () => muted;

function env(g, t0, a, d, peak = 1) {
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.linearRampToValueAtTime(peak, t0 + a);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + a + d);
}
function osc(type, freq, t0, dur, vol, dest, freqEnd) {
  const o = AC.createOscillator(), g = AC.createGain();
  o.type = type; o.frequency.setValueAtTime(freq, t0);
  if (freqEnd) o.frequency.exponentialRampToValueAtTime(Math.max(1, freqEnd), t0 + dur);
  env(g, t0, .005, dur, vol);
  o.connect(g); g.connect(dest || sfxGain);
  o.start(t0); o.stop(t0 + dur + .05);
}
function noise(t0, dur, vol, f0, f1, q = 1) {
  const len = Math.max(1, (dur + .05) * AC.sampleRate) | 0;
  const buf = AC.createBuffer(1, len, AC.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  const src = AC.createBufferSource(); src.buffer = buf;
  const flt = AC.createBiquadFilter(); flt.type = 'bandpass'; flt.Q.value = q;
  flt.frequency.setValueAtTime(f0, t0);
  flt.frequency.exponentialRampToValueAtTime(Math.max(40, f1), t0 + dur);
  const g = AC.createGain(); env(g, t0, .004, dur, vol);
  src.connect(flt); flt.connect(g); g.connect(sfxGain);
  src.start(t0); src.stop(t0 + dur + .05);
}

export function sfx(name) {
  if (muted) return;
  try { ctx(); } catch (e) { return; }
  const t = AC.currentTime;
  switch (name) {
    case 'light':  noise(t, .08, .5, 1800, 400, 1.2); osc('sine', 190, t, .07, .35, null, 90); break;
    case 'heavy':  noise(t, .14, .7, 900, 180, 1); osc('sine', 130, t, .13, .6, null, 45); break;
    case 'sweep':  noise(t, .18, .65, 700, 120, .8); osc('sine', 100, t, .16, .55, null, 32); break;
    case 'block':  noise(t, .07, .45, 3200, 1400, 3); osc('square', 520, t, .05, .12, null, 420); break;
    case 'whoosh': noise(t, .12, .28, 500, 2400, .9); break;
    case 'jump':   noise(t, .1, .16, 300, 1300, .8); break;
    case 'land':   noise(t, .09, .3, 300, 90, .8); break;
    case 'fire':   noise(t, .3, .5, 400, 2200, .6); osc('sawtooth', 220, t, .25, .18, null, 660); break;
    case 'bolt':   noise(t, .22, .55, 5200, 900, 2.2); osc('square', 1400, t, .06, .1, null, 300); break;
    case 'special': noise(t, .35, .55, 300, 3400, .7); osc('sawtooth', 140, t, .32, .3, null, 560); break;
    case 'super':  noise(t, .8, .6, 200, 5000, .5); osc('sawtooth', 80, t, .7, .4, null, 640); osc('square', 220, t + .1, .5, .15, null, 880); break;
    case 'ko':     osc('sine', 220, t, .8, .8, null, 36); noise(t, .6, .6, 800, 60, .6); break;
    case 'gong':   osc('sine', 392, t, 1.4, .5, null, 380); osc('sine', 587, t, 1.1, .25); break;
    case 'select': osc('square', 660, t, .06, .12); break;
    case 'confirm': osc('square', 520, t, .05, .12); osc('square', 780, t + .07, .09, .12); break;
    case 'cancel': osc('square', 330, t, .08, .12); break;
    case 'gauge':  osc('sine', 880, t, .12, .2); osc('sine', 1320, t + .1, .15, .18); break;
    case 'count':  osc('square', 880, t, .07, .14); break;
  }
}

// ---------- BGM：步进音序器 ----------
const NOTE = n => 440 * Math.pow(2, (n - 69) / 12);
// 音高用 MIDI 编号。0 = 休止
const TRACKS = {
  menu: { bpm: 96, steps: 32,
    bass: [45,0,45,0, 52,0,45,0, 43,0,43,0, 50,0,43,0, 41,0,41,0, 48,0,41,0, 40,0,40,0, 47,0,52,0],
    lead: [76,0,0,74, 72,0,69,0, 71,0,0,67, 69,0,71,0, 72,0,0,74, 76,0,79,0, 77,0,76,0, 74,0,71,0],
    hat:  [1,0,1,0, 1,0,1,0, 1,0,1,0, 1,0,1,1, 1,0,1,0, 1,0,1,0, 1,0,1,0, 1,1,1,1] },
  battle: { bpm: 152, steps: 32,
    bass: [40,40,0,40, 47,0,40,0, 38,38,0,38, 45,0,50,0, 36,36,0,36, 43,0,36,0, 41,0,43,0, 45,47,48,50],
    lead: [64,0,67,69, 71,0,69,67, 62,0,65,67, 69,0,67,65, 60,0,64,67, 72,0,71,69, 65,0,64,0, 62,64,65,67],
    hat:  [1,1,1,0, 1,1,1,0, 1,1,1,0, 1,1,1,1, 1,1,1,0, 1,1,1,0, 1,1,1,0, 1,1,1,1] }
};
let bgmName = null, bgmTimer = null, step = 0, nextT = 0;

function schedule() {
  if (!bgmName || muted) return;
  const tr = TRACKS[bgmName], spb = 60 / tr.bpm / 2; // 8 分音符
  while (nextT < AC.currentTime + 0.25) {
    const t = nextT, s = step % tr.steps;
    const b = tr.bass[s];
    if (b) { const o = AC.createOscillator(), g = AC.createGain(); o.type = 'square'; o.frequency.value = NOTE(b - 12);
      env(g, t, .01, spb * .9, .5); o.connect(g); g.connect(musicGain); o.start(t); o.stop(t + spb); }
    const l = tr.lead[s];
    if (l) { const o = AC.createOscillator(), g = AC.createGain(); o.type = 'triangle'; o.frequency.value = NOTE(l);
      env(g, t, .01, spb * 1.4, .4); o.connect(g); g.connect(musicGain); o.start(t); o.stop(t + spb * 1.5); }
    if (tr.hat[s]) {
      const len = .03 * AC.sampleRate | 0, buf = AC.createBuffer(1, len, AC.sampleRate), d = buf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
      const src = AC.createBufferSource(); src.buffer = buf;
      const f = AC.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = 7000;
      const g = AC.createGain(); env(g, t, .002, .03, .16);
      src.connect(f); f.connect(g); g.connect(musicGain); src.start(t);
    }
    nextT += spb; step++;
  }
}

export function bgm(name) {
  try { ctx(); } catch (e) { return; }
  if (bgmName === name) return;
  bgmName = name; step = 0; nextT = AC.currentTime + .05;
  if (!bgmTimer) bgmTimer = setInterval(schedule, 90);
}

export function stopBgm() { bgmName = null; }
