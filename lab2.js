// ---- Key map ----
const keyboardFrequencyMap = {
  // octave 1 (Z row)
  "90": 261.6255653005986,  // Z - C
  "83": 277.1826309768721,  // S - C#
  "88": 293.6647679174076,  // X - D
  "68": 311.1269837220809,  // D - D#
  "67": 329.6275569128699,  // C - E
  "86": 349.2282314330039,  // V - F
  "71": 369.9944227116344,  // G - F#
  "66": 391.9954359817493,  // B - G
  "72": 415.3046975799451,  // H - G#
  "78": 440.0,              // N - A
  "74": 466.1637615180899,  // J - A#
  "77": 493.8833012561241,  // M - B

  // octave 2 (Q row + number row)
  "81": 523.2511306011972,  // Q - C
  "50": 554.3652619537442,  // 2 - C#
  "87": 587.3295358348151,  // W - D
  "51": 622.2539674441618,  // 3 - D#
  "69": 659.2551138257398,  // E - E
  "82": 698.4564628660078,  // R - F
  "53": 739.9888454232688,  // 5 - F#
  "84": 783.9908719634985,  // T - G
  "54": 830.6093951598903,  // 6 - G#
  "89": 880.0,              // Y - A
  "55": 932.3275230361798,  // 7 - A#
  "85": 987.7666025122483   // U - B
};

// UI -> list of keys to show as piano
const KEY_LAYOUT = [
  // octave 1
  { code: "90", label: "Z", note: "C",  black: false },
  { code: "83", label: "S", note: "C#", black: true  },
  { code: "88", label: "X", note: "D",  black: false },
  { code: "68", label: "D", note: "D#", black: true  },
  { code: "67", label: "C", note: "E",  black: false },
  { code: "86", label: "V", note: "F",  black: false },
  { code: "71", label: "G", note: "F#", black: true  },
  { code: "66", label: "B", note: "G",  black: false },
  { code: "72", label: "H", note: "G#", black: true  },
  { code: "78", label: "N", note: "A",  black: false },
  { code: "74", label: "J", note: "A#", black: true  },
  { code: "77", label: "M", note: "B",  black: false },

  // octave 2
  { code: "81", label: "Q", note: "C",  black: false },
  { code: "50", label: "2", note: "C#", black: true  },
  { code: "87", label: "W", note: "D",  black: false },
  { code: "51", label: "3", note: "D#", black: true  },
  { code: "69", label: "E", note: "E",  black: false },
  { code: "82", label: "R", note: "F",  black: false },
  { code: "53", label: "5", note: "F#", black: true  },
  { code: "84", label: "T", note: "G",  black: false },
  { code: "54", label: "6", note: "G#", black: true  },
  { code: "89", label: "Y", note: "A",  black: false },
  { code: "55", label: "7", note: "A#", black: true  },
  { code: "85", label: "U", note: "B",  black: false }
];

// ---- Audio globals ----
let audioCtx = null;
let masterGain = null;

let lfoOsc = null;
let lfoGain = null;

let audioRunning = false;

// active voices: keyCodeStr -> voice object
const activeVoices = {}; // { key: { stop()..., highlightEl } }

// ---- DOM ----
const startBtn = document.getElementById("start");
const modeSel = document.getElementById("mode");
const waveSel = document.getElementById("wave");

const masterVol = document.getElementById("masterVol");
const masterVolVal = document.getElementById("masterVolVal");

const partials = document.getElementById("partials");
const partialsVal = document.getElementById("partialsVal");

const amFreq = document.getElementById("amFreq");
const amFreqVal = document.getElementById("amFreqVal");
const amDepth = document.getElementById("amDepth");
const amDepthVal = document.getElementById("amDepthVal");

const fmFreq = document.getElementById("fmFreq");
const fmFreqVal = document.getElementById("fmFreqVal");
const fmDepth = document.getElementById("fmDepth");
const fmDepthVal = document.getElementById("fmDepthVal");

const attack = document.getElementById("attack");
const attackVal = document.getElementById("attackVal");
const decay = document.getElementById("decay");
const decayVal = document.getElementById("decayVal");
const sustain = document.getElementById("sustain");
const sustainVal = document.getElementById("sustainVal");
const release = document.getElementById("release");
const releaseVal = document.getElementById("releaseVal");

const lfoOn = document.getElementById("lfoOn");
const lfoRate = document.getElementById("lfoRate");
const lfoRateVal = document.getElementById("lfoRateVal");
const lfoDepth = document.getElementById("lfoDepth");
const lfoDepthVal = document.getElementById("lfoDepthVal");

const audioStatus = document.getElementById("audioStatus");
const pressed = document.getElementById("pressed");

const additiveControls = document.getElementById("additiveControls");
const amControls = document.getElementById("amControls");
const fmControls = document.getElementById("fmControls");

const piano = document.getElementById("piano");

// map code -> DOM element for highlight
const keyDomMap = {};

// ============================
// UI helpers
// ============================
function setText(el, v) { el.textContent = v; }

function updateControlVisibility() {
  const m = modeSel.value;
  additiveControls.style.display = (m === "additive") ? "block" : "none";
  amControls.style.display = (m === "am") ? "block" : "none";
  fmControls.style.display = (m === "fm") ? "block" : "none";
}

function updatePressedUI() {
  const keys = Object.keys(activeVoices);
  if (keys.length === 0) {
    setText(pressed, "(none)");
    return;
  }
  const labels = keys
    .map(k => KEY_LAYOUT.find(x => x.code === k)?.label || k)
    .join(", ");
  setText(pressed, labels);
}

function bindRange(input, out, fmt = (x)=>String(x)) {
  const update = () => out.textContent = fmt(input.value);
  input.addEventListener("input", update);
  update();
}

bindRange(masterVol, masterVolVal, (v)=>Number(v).toFixed(2));
bindRange(partials, partialsVal, (v)=>String(v));

bindRange(amFreq, amFreqVal, (v)=>Number(v).toFixed(1));
bindRange(amDepth, amDepthVal, (v)=>Number(v).toFixed(2));

bindRange(fmFreq, fmFreqVal, (v)=>Number(v).toFixed(1));
bindRange(fmDepth, fmDepthVal, (v)=>String(v));

bindRange(attack, attackVal, (v)=>Number(v).toFixed(3));
bindRange(decay, decayVal, (v)=>Number(v).toFixed(3));
bindRange(sustain, sustainVal, (v)=>Number(v).toFixed(2));
bindRange(release, releaseVal, (v)=>Number(v).toFixed(3));

bindRange(lfoRate, lfoRateVal, (v)=>Number(v).toFixed(1));
bindRange(lfoDepth, lfoDepthVal, (v)=>String(v));

modeSel.addEventListener("change", updateControlVisibility);
updateControlVisibility();

// ============================
// Piano UI (DOM build)
// ============================
function buildPiano() {
  // We place 14 white keys evenly, black keys positioned over gaps.
  // White index increases only for white keys.
  const whiteW = 44; // must match CSS var --whiteW (for positioning)
  const blackOffsets = {
    "C#": 0.72, "D#": 1.72, "F#": 3.72, "G#": 4.72, "A#": 5.72
  };

  let whiteIndex = 0;

  KEY_LAYOUT.forEach((k) => {
    const el = document.createElement("div");
    el.classList.add("key", k.black ? "black" : "white");
    el.dataset.code = k.code;

    el.innerHTML = `${k.label}<span class="sub">${k.note}</span>`;

    if (!k.black) {
      el.style.left = `${whiteIndex * whiteW}px`;
      whiteIndex += 1;
    } else {
      const whichOctave = (keyboardFrequencyMap[k.code] >= 523.25) ? 1 : 0; // 0: first, 1: second
      const octaveBaseWhite = whichOctave * 7;

      // Determine local offset
      const local = blackOffsets[k.note];
      const x = (octaveBaseWhite + local) * whiteW;
      el.style.left = `${x}px`;
    }

    // Mouse support
    el.addEventListener("mousedown", () => {
      if (!audioRunning) return;
      noteOn(k.code);
    });
    el.addEventListener("mouseup", () => {
      if (!audioRunning) return;
      noteOff(k.code);
    });
    el.addEventListener("mouseleave", () => {
      if (!audioRunning) return;
      // if mouse leaves while pressed, stop it
      noteOff(k.code);
    });

    piano.appendChild(el);
    keyDomMap[k.code] = el;
  });
}
buildPiano();

// ============================
// Audio initialization
// ============================
function ensureAudio() {
  if (audioCtx) return;

  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  audioCtx = new AudioContextClass();

  masterGain = audioCtx.createGain();
  // Keep some headroom to avoid clipping when many voices
  masterGain.gain.setValueAtTime(Number(masterVol.value), audioCtx.currentTime);
  masterGain.connect(audioCtx.destination);

  // Global LFO (vibrato) -> detune (cents)
  lfoOsc = audioCtx.createOscillator();
  lfoOsc.type = "sine";
  lfoGain = audioCtx.createGain();
  lfoGain.gain.setValueAtTime(Number(lfoDepth.value), audioCtx.currentTime); // cents

  lfoOsc.frequency.setValueAtTime(Number(lfoRate.value), audioCtx.currentTime);
  lfoOsc.connect(lfoGain);
  lfoOsc.start();

  // update LFO when sliders change
  lfoRate.addEventListener("input", () => {
    if (!audioCtx) return;
    lfoOsc.frequency.setValueAtTime(Number(lfoRate.value), audioCtx.currentTime);
  });
  lfoDepth.addEventListener("input", () => {
    if (!audioCtx) return;
    lfoGain.gain.setValueAtTime(Number(lfoDepth.value), audioCtx.currentTime);
  });

  lfoOn.addEventListener("change", () => {
    // We don't stop LFO oscillator; we just set depth to 0 when off
    if (!audioCtx) return;
    const depth = lfoOn.checked ? Number(lfoDepth.value) : 0;
    lfoGain.gain.setValueAtTime(depth, audioCtx.currentTime);
  });

  masterVol.addEventListener("input", () => {
    if (!audioCtx) return;
    masterGain.gain.setValueAtTime(Number(masterVol.value), audioCtx.currentTime);
  });
}

// Start button: resume context and enable audio
startBtn.addEventListener("click", async () => {
  ensureAudio();
  if (audioCtx.state !== "running") {
    await audioCtx.resume();
  }
  audioRunning = true;
  setText(audioStatus, "running");
});

// ============================
// Envelope helpers (ADSR)
// ============================
function getADSR() {
  return {
    A: Number(attack.value),
    D: Number(decay.value),
    S: Number(sustain.value),
    R: Number(release.value)
  };
}

function applyEnvelopeOn(gainParam, peak = 1.0) {
  const { A, D, S } = getADSR();
  const now = audioCtx.currentTime;

  gainParam.cancelScheduledValues(now);
  gainParam.setValueAtTime(0.0001, now);

  // Attack -> peak
  gainParam.exponentialRampToValueAtTime(Math.max(0.0001, peak), now + A);

  // Decay -> sustain level
  const sustainLevel = Math.max(0.0001, peak * S);
  gainParam.exponentialRampToValueAtTime(sustainLevel, now + A + D);
}

function applyEnvelopeOff(gainParam) {
  const { R } = getADSR();
  const now = audioCtx.currentTime;

  gainParam.cancelScheduledValues(now);
  // Avoid 0 exactly for exponential ramps
  const current = Math.max(0.0001, gainParam.value || 0.0001);
  gainParam.setValueAtTime(current, now);
  gainParam.exponentialRampToValueAtTime(0.0001, now + R);
  return R;
}

// ============================
// Voice builders (Additive / AM / FM)
// ============================

function makeVoiceGain() {
  const voiceGain = audioCtx.createGain();

  // voicePeak chosen to avoid clipping
  // also reduce with polyphony count
  const poly = Math.max(1, Object.keys(activeVoices).length + 1);
  const base = 0.22 / poly; // global normalization

  voiceGain.gain.setValueAtTime(0.0001, audioCtx.currentTime);
  voiceGain.connect(masterGain);

  return { voiceGain, basePeak: base };
}

// Additive: >= 3 partials, same envelope (voiceGain)
function buildAdditiveVoice(freq) {
  const N = Number(partials.value);
  const waveform = waveSel.value;

  const { voiceGain, basePeak } = makeVoiceGain();

  // Mix partials before voiceGain (optional, but clean)
  const mixGain = audioCtx.createGain();
  mixGain.gain.setValueAtTime(1.0, audioCtx.currentTime);
  mixGain.connect(voiceGain);

  const oscs = [];

  // weights: 1/(i+1) then normalize to sum=1
  const weights = Array.from({ length: N }, (_, i) => 1 / (i + 1));
  const sumW = weights.reduce((a, b) => a + b, 0);

  for (let i = 0; i < N; i++) {
    const osc = audioCtx.createOscillator();
    osc.type = waveform;

    const partialFreq = freq * (i + 1);
    osc.frequency.setValueAtTime(partialFreq, audioCtx.currentTime);

    // per-partial gain
    const g = audioCtx.createGain();
    const w = weights[i] / sumW;
    g.gain.setValueAtTime(w, audioCtx.currentTime);

    osc.connect(g);
    g.connect(mixGain);

    oscs.push(osc);
  }

  // LFO -> detune for ALL oscillators (vibrato)
  if (lfoGain) {
    oscs.forEach(o => lfoGain.connect(o.detune));
  }

  // envelope on voiceGain
  applyEnvelopeOn(voiceGain.gain, basePeak);

  oscs.forEach(o => o.start());

  return {
    stop() {
      const rel = applyEnvelopeOff(voiceGain.gain);
      const stopAt = audioCtx.currentTime + rel + 0.03;
      oscs.forEach(o => {
        try { o.stop(stopAt); } catch {}
      });
      // Disconnect LFO targets (safe)
      if (lfoGain) {
        oscs.forEach(o => { try { lfoGain.disconnect(o.detune); } catch {} });
      }
      // cleanup graph later
      setTimeout(() => {
        try { mixGain.disconnect(); } catch {}
        try { voiceGain.disconnect(); } catch {}
      }, (rel + 0.1) * 1000);
    }
  };
}

// AM: carrier freq = pressed key freq; mod freq hardcoded or UI; depth UI
function buildAMVoice(freq) {
  const waveform = waveSel.value;

  const { voiceGain, basePeak } = makeVoiceGain();

  const carrier = audioCtx.createOscillator();
  carrier.type = waveform;
  carrier.frequency.setValueAtTime(freq, audioCtx.currentTime);

  // carrierGain will be amplitude-modulated
  const carrierGain = audioCtx.createGain();
  carrierGain.gain.setValueAtTime(0.0001, audioCtx.currentTime); // will be set by AM graph
  carrier.connect(carrierGain);
  carrierGain.connect(voiceGain);

  // mod oscillator
  const mod = audioCtx.createOscillator();
  mod.type = "sine";
  mod.frequency.setValueAtTime(Number(amFreq.value), audioCtx.currentTime);

  // Depth: 0..1
  const depth = Number(amDepth.value);

  // AM needs offset so gain never negative:
  // gain = offset + mod * amount, where offset >= amount
  const offset = audioCtx.createConstantSource();
  offset.offset.setValueAtTime(1 - depth / 2, audioCtx.currentTime);

  const modGain = audioCtx.createGain();
  modGain.gain.setValueAtTime(depth / 2, audioCtx.currentTime);

  mod.connect(modGain);
  modGain.connect(carrierGain.gain);
  offset.connect(carrierGain.gain);
  offset.start();

  // LFO -> detune on carrier (vibrato)
  if (lfoGain) lfoGain.connect(carrier.detune);

  // envelope on voiceGain
  applyEnvelopeOn(voiceGain.gain, basePeak);

  carrier.start();
  mod.start();

  return {
    stop() {
      const rel = applyEnvelopeOff(voiceGain.gain);
      const stopAt = audioCtx.currentTime + rel + 0.03;
      try { carrier.stop(stopAt); } catch {}
      try { mod.stop(stopAt); } catch {}
      try { offset.stop(stopAt); } catch {}

      if (lfoGain) { try { lfoGain.disconnect(carrier.detune); } catch {} }

      setTimeout(() => {
        try { carrierGain.disconnect(); } catch {}
        try { voiceGain.disconnect(); } catch {}
        try { modGain.disconnect(); } catch {}
        try { offset.disconnect(); } catch {}
      }, (rel + 0.1) * 1000);
    }
  };
}

// FM: carrier freq = pressed key freq; mod freq UI; depth UI (Hz)
function buildFMVoice(freq) {
  const waveform = waveSel.value;

  const { voiceGain, basePeak } = makeVoiceGain();

  const carrier = audioCtx.createOscillator();
  carrier.type = waveform;
  carrier.frequency.setValueAtTime(freq, audioCtx.currentTime);

  // FM mod oscillator
  const mod = audioCtx.createOscillator();
  mod.type = "sine";
  mod.frequency.setValueAtTime(Number(fmFreq.value), audioCtx.currentTime);

  const depthHz = Number(fmDepth.value); // how far frequency deviates
  const modGain = audioCtx.createGain();
  modGain.gain.setValueAtTime(depthHz, audioCtx.currentTime);

  mod.connect(modGain);
  modGain.connect(carrier.frequency); // THIS is FM

  // carrier output
  const outGain = audioCtx.createGain();
  outGain.gain.setValueAtTime(1.0, audioCtx.currentTime);
  carrier.connect(outGain);
  outGain.connect(voiceGain);

  // LFO -> detune on carrier (vibrato)
  if (lfoGain) lfoGain.connect(carrier.detune);

  // envelope on voiceGain
  applyEnvelopeOn(voiceGain.gain, basePeak);

  carrier.start();
  mod.start();

  return {
    stop() {
      const rel = applyEnvelopeOff(voiceGain.gain);
      const stopAt = audioCtx.currentTime + rel + 0.03;

      try { carrier.stop(stopAt); } catch {}
      try { mod.stop(stopAt); } catch {}

      if (lfoGain) { try { lfoGain.disconnect(carrier.detune); } catch {} }

      setTimeout(() => {
        try { outGain.disconnect(); } catch {}
        try { voiceGain.disconnect(); } catch {}
        try { modGain.disconnect(); } catch {}
      }, (rel + 0.1) * 1000);
    }
  };
}

// ============================
// Note on/off (keyboard + mouse)
// ============================
function noteOn(keyCodeStr) {
  if (!audioRunning) return;
  if (!keyboardFrequencyMap[keyCodeStr]) return;
  if (activeVoices[keyCodeStr]) return; // already playing

  const freq = keyboardFrequencyMap[keyCodeStr];
  const m = modeSel.value;

  let voice;
  if (m === "additive") voice = buildAdditiveVoice(freq);
  else if (m === "am") voice = buildAMVoice(freq);
  else voice = buildFMVoice(freq);

  activeVoices[keyCodeStr] = voice;

  // highlight key
  if (keyDomMap[keyCodeStr]) keyDomMap[keyCodeStr].classList.add("active");
  updatePressedUI();
}

function noteOff(keyCodeStr) {
  const v = activeVoices[keyCodeStr];
  if (!v) return;

  v.stop();
  delete activeVoices[keyCodeStr];

  if (keyDomMap[keyCodeStr]) keyDomMap[keyCodeStr].classList.remove("active");
  updatePressedUI();
}

// Keyboard listeners
window.addEventListener("keydown", (event) => {
  const keyCodeStr = (event.keyCode || event.which).toString();
  if (keyboardFrequencyMap[keyCodeStr] && !activeVoices[keyCodeStr]) {
    noteOn(keyCodeStr);
  }
});

window.addEventListener("keyup", (event) => {
  const keyCodeStr = (event.keyCode || event.which).toString();
  if (keyboardFrequencyMap[keyCodeStr] && activeVoices[keyCodeStr]) {
    noteOff(keyCodeStr);
  }
});

// When mode changes, stop all notes to avoid stuck graphs
modeSel.addEventListener("change", () => {
  Object.keys(activeVoices).forEach(k => noteOff(k));
});

// Keep AM/FM values reactive (changes affect next notes)
amFreq.addEventListener("input", () => {});
amDepth.addEventListener("input", () => {});
fmFreq.addEventListener("input", () => {});
fmDepth.addEventListener("input", () => {});

// ADSR slider changes affect next envelopes; to keep it simple we don't retarget currently-held notes.

// Initialize status text
setText(audioStatus, "stopped");
