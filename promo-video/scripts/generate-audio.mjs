import {mkdirSync, writeFileSync} from 'node:fs';
import {dirname, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

const SAMPLE_RATE = 48_000;
const DURATION_SECONDS = 45;
const CHANNELS = 2;
const TOTAL_FRAMES = SAMPLE_RATE * DURATION_SECONDS;
const BAR_SECONDS = DURATION_SECONDS / 12;
const BEAT_SECONDS = BAR_SECONDS / 4;
const TAU = Math.PI * 2;

// Three repetitions of a restrained four-bar Am9–Fmaj7–Cmaj9–G6 progression.
// The twelve-bar phrase lasts exactly 45 seconds, so musical events line up when
// the render is looped. The requested head/tail fades keep standalone edits clean.
const CHORDS = [
  {root: 45, notes: [57, 60, 64, 67, 71]}, // Am9
  {root: 41, notes: [53, 57, 60, 64]}, // Fmaj7
  {root: 36, notes: [52, 55, 59, 62, 64]}, // Cmaj9
  {root: 43, notes: [55, 59, 62, 64, 67]}, // G6
];

const CUES = [5, 8.5, 15, 20.5, 25.5, 32, 38, 41];
const CUE_MIDI = [81, 84, 79, 83, 81, 86, 84, 88];

const outputPath = resolve(
  dirname(fileURLToPath(import.meta.url)),
  '../public/audio/brand-bed.wav',
);

const midiToHz = (midi) => 440 * 2 ** ((midi - 69) / 12);
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const smoothstep = (edge0, edge1, value) => {
  const x = clamp((value - edge0) / (edge1 - edge0), 0, 1);
  return x * x * (3 - 2 * x);
};

// Hash noise is deterministic and independent per sample, making repeat builds
// byte-identical without carrying mutable random state through the render.
const hashNoise = (index) => {
  let value = (index + 0x6d2b79f5) | 0;
  value = Math.imul(value ^ (value >>> 15), value | 1);
  value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
  return ((value ^ (value >>> 14)) >>> 0) / 2 ** 31 - 1;
};

const noteSample = (midi, time, side) => {
  const frequency = midiToHz(midi);
  const detune = side === 0 ? 0.9992 : 1.0008;
  const phase = side === 0 ? 0.15 : 0.72;
  const fundamental = Math.sin(TAU * frequency * detune * time + phase);
  const overtone = Math.sin(TAU * frequency * 2.001 * time + phase * 0.6);
  return fundamental * 0.88 + overtone * 0.12;
};

const chordSample = (chord, time, side) => {
  let value = 0;
  for (let index = 0; index < chord.notes.length; index += 1) {
    const voice = noteSample(chord.notes[index], time, side);
    value += voice / Math.sqrt(chord.notes.length);
  }
  return value;
};

const left = new Float32Array(TOTAL_FRAMES);
const right = new Float32Array(TOTAL_FRAMES);
let filteredNoiseLeft = 0;
let filteredNoiseRight = 0;

for (let frame = 0; frame < TOTAL_FRAMES; frame += 1) {
  const time = frame / SAMPLE_RATE;
  const barPosition = time / BAR_SECONDS;
  const barIndex = Math.floor(barPosition);
  const barPhase = barPosition - barIndex;
  const currentChord = CHORDS[barIndex % CHORDS.length];
  const nextChord = CHORDS[(barIndex + 1) % CHORDS.length];

  // Crossfade harmonies over the final 0.72 s of each bar.
  const crossfadeStart = 1 - 0.72 / BAR_SECONDS;
  const chordMix = smoothstep(crossfadeStart, 1, barPhase);
  const padBreath = 0.88 + 0.12 * Math.sin(TAU * time / 7.5 - 0.4);

  const padLeft =
    (chordSample(currentChord, time, 0) * (1 - chordMix) +
      chordSample(nextChord, time, 0) * chordMix) *
    padBreath *
    0.035;
  const padRight =
    (chordSample(currentChord, time, 1) * (1 - chordMix) +
      chordSample(nextChord, time, 1) * chordMix) *
    padBreath *
    0.035;

  // A quiet low foundation follows each chord root and shares the crossfade.
  const subCurrent = Math.sin(TAU * midiToHz(currentChord.root) * time);
  const subNext = Math.sin(TAU * midiToHz(nextChord.root) * time);
  const sub = (subCurrent * (1 - chordMix) + subNext * chordMix) * 0.018;

  // A soft, damped pulse marks each beat without behaving like a drum kit.
  const beatPosition = time / BEAT_SECONDS;
  const beatIndex = Math.floor(beatPosition);
  const beatAge = (beatPosition - beatIndex) * BEAT_SECONDS;
  const beatAccent = beatIndex % 4 === 0 ? 1 : 0.68;
  const pulseEnvelope =
    (1 - Math.exp(-beatAge * 90)) * Math.exp(-beatAge * 13.5);
  const pulseFrequency = beatIndex % 2 === 0 ? 146.83 : 164.81;
  const pulse =
    (Math.sin(TAU * pulseFrequency * beatAge) * 0.78 +
      Math.sin(TAU * pulseFrequency * 2.01 * beatAge) * 0.22) *
    pulseEnvelope *
    beatAccent *
    0.055;
  const pulsePan = beatIndex % 2 === 0 ? 0.43 : 0.57;

  // Very low "air" gives the bed presence after compression, while remaining
  // deterministic and unobtrusive beneath narration.
  filteredNoiseLeft +=
    (hashNoise(frame * 2) - filteredNoiseLeft) * 0.012;
  filteredNoiseRight +=
    (hashNoise(frame * 2 + 1) - filteredNoiseRight) * 0.012;
  const airLeft = filteredNoiseLeft * 0.0055;
  const airRight = filteredNoiseRight * 0.0055;

  let cueLeft = 0;
  let cueRight = 0;
  for (let cueIndex = 0; cueIndex < CUES.length; cueIndex += 1) {
    const age = time - CUES[cueIndex];
    if (age < 0 || age > 1.35) continue;

    const attack = smoothstep(0, 0.012, age);
    const release = Math.exp(-age * 4.2);
    const frequency = midiToHz(CUE_MIDI[cueIndex]);
    const bell =
      Math.sin(TAU * frequency * age) * 0.7 +
      Math.sin(TAU * frequency * 2.005 * age + 0.25) * 0.2 +
      Math.sin(TAU * frequency * 3.01 * age + 0.5) * 0.1;
    const cue = bell * attack * release * 0.034;
    const cuePan = cueIndex % 2 === 0 ? 0.38 : 0.62;
    cueLeft += cue * Math.sqrt(1 - cuePan);
    cueRight += cue * Math.sqrt(cuePan);
  }

  // Short equal-power fades avoid clicks and leave clean handles for an editor.
  const fadeIn = Math.sin(smoothstep(0, 0.8, time) * Math.PI * 0.5);
  const fadeOut = Math.sin(
    smoothstep(0, 0.9, DURATION_SECONDS - time) * Math.PI * 0.5,
  );
  const masterEnvelope = fadeIn * fadeOut;

  left[frame] =
    (padLeft + sub + pulse * Math.sqrt(1 - pulsePan) + airLeft + cueLeft) *
    masterEnvelope;
  right[frame] =
    (padRight + sub + pulse * Math.sqrt(pulsePan) + airRight + cueRight) *
    masterEnvelope;
}

// Keep the background deliberately quiet, with a reproducible -10 dBFS ceiling.
let rawPeak = 0;
for (let frame = 0; frame < TOTAL_FRAMES; frame += 1) {
  rawPeak = Math.max(rawPeak, Math.abs(left[frame]), Math.abs(right[frame]));
}

const targetPeak = 10 ** (-10 / 20);
const gain = rawPeak > 0 ? targetPeak / rawPeak : 1;
const bytesPerSample = 2;
const dataSize = TOTAL_FRAMES * CHANNELS * bytesPerSample;
const wav = Buffer.alloc(44 + dataSize);

wav.write('RIFF', 0);
wav.writeUInt32LE(36 + dataSize, 4);
wav.write('WAVE', 8);
wav.write('fmt ', 12);
wav.writeUInt32LE(16, 16);
wav.writeUInt16LE(1, 20);
wav.writeUInt16LE(CHANNELS, 22);
wav.writeUInt32LE(SAMPLE_RATE, 24);
wav.writeUInt32LE(SAMPLE_RATE * CHANNELS * bytesPerSample, 28);
wav.writeUInt16LE(CHANNELS * bytesPerSample, 32);
wav.writeUInt16LE(bytesPerSample * 8, 34);
wav.write('data', 36);
wav.writeUInt32LE(dataSize, 40);

let peak = 0;
let sumSquares = 0;
let offset = 44;
for (let frame = 0; frame < TOTAL_FRAMES; frame += 1) {
  const sampleLeft = clamp(left[frame] * gain, -1, 1);
  const sampleRight = clamp(right[frame] * gain, -1, 1);
  peak = Math.max(peak, Math.abs(sampleLeft), Math.abs(sampleRight));
  sumSquares += sampleLeft ** 2 + sampleRight ** 2;
  wav.writeInt16LE(Math.round(sampleLeft * 32767), offset);
  wav.writeInt16LE(Math.round(sampleRight * 32767), offset + 2);
  offset += 4;
}

mkdirSync(dirname(outputPath), {recursive: true});
writeFileSync(outputPath, wav);

const peakDb = 20 * Math.log10(peak);
const rms = Math.sqrt(sumSquares / (TOTAL_FRAMES * CHANNELS));
const rmsDb = 20 * Math.log10(rms);
console.log(`Wrote ${outputPath}`);
console.log(`${DURATION_SECONDS.toFixed(3)} s, ${SAMPLE_RATE} Hz, stereo PCM16`);
console.log(`Peak ${peakDb.toFixed(2)} dBFS; RMS ${rmsDb.toFixed(2)} dBFS`);
