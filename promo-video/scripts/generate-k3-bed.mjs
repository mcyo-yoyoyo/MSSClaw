import {mkdirSync, writeFileSync} from 'node:fs';
import {dirname, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

const SAMPLE_RATE = 48_000;
const DURATION_SECONDS = 72;
const CHANNELS = 2;
const TOTAL_FRAMES = SAMPLE_RATE * DURATION_SECONDS;
const BPM = 120;
const BEAT_SECONDS = 60 / BPM;
const BAR_SECONDS = BEAT_SECONDS * 4;
const TAU = Math.PI * 2;

// An original 24-bar cold-white technology bed. The six-bar harmonic cycle is
// repeated with changing orchestration, leaving ample midrange space for voice.
const CHORDS = [
  {root: 38, notes: [62, 66, 69, 73, 76]}, // Dmaj9
  {root: 33, notes: [57, 61, 64, 71]}, // Aadd9
  {root: 40, notes: [52, 56, 59, 61, 64]}, // E6
  {root: 35, notes: [59, 62, 66, 69]}, // Bm7
  {root: 31, notes: [55, 59, 62, 66, 69]}, // Gmaj9
  {root: 33, notes: [57, 59, 64, 66]}, // Asus2/6
];

const SHOT_BOUNDARIES = [3, 8, 12, 17, 20, 24, 27, 32, 35, 39, 43, 46, 50, 53, 57, 61, 65, 70];
const SECTION_CUES = [12, 20, 35, 46, 61, 65];
const CUE_NOTES = [81, 85, 83, 88, 86, 90];

const outputPath = resolve(
  dirname(fileURLToPath(import.meta.url)),
  '../public/audio/brand-bed-k3.wav',
);

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const smoothstep = (edge0, edge1, value) => {
  const normalized = clamp((value - edge0) / (edge1 - edge0), 0, 1);
  return normalized * normalized * (3 - 2 * normalized);
};
const midiToHz = (midi) => 440 * 2 ** ((midi - 69) / 12);

const hashNoise = (index) => {
  let value = (index + 0x9e3779b9) | 0;
  value = Math.imul(value ^ (value >>> 16), 0x21f0aaad);
  value = Math.imul(value ^ (value >>> 15), 0x735a2d97);
  value ^= value >>> 15;
  return (value >>> 0) / 2 ** 31 - 1;
};

const padVoice = (midi, time, side) => {
  const detune = side === 0 ? 0.99935 : 1.00065;
  const phase = side === 0 ? 0.18 : 0.77;
  const frequency = midiToHz(midi) * detune;
  return (
    Math.sin(TAU * frequency * time + phase) * 0.82 +
    Math.sin(TAU * frequency * 2.002 * time + phase * 0.47) * 0.13 +
    Math.sin(TAU * frequency * 3.997 * time + phase * 1.2) * 0.05
  );
};

const chordVoice = (chord, time, side) => {
  let sample = 0;
  for (let index = 0; index < chord.notes.length; index += 1) {
    sample += padVoice(chord.notes[index], time, side) / chord.notes.length;
  }
  return sample;
};

const left = new Float32Array(TOTAL_FRAMES);
const right = new Float32Array(TOTAL_FRAMES);
let airLowLeft = 0;
let airLowRight = 0;
let airSlowLeft = 0;
let airSlowRight = 0;

for (let frame = 0; frame < TOTAL_FRAMES; frame += 1) {
  const time = frame / SAMPLE_RATE;
  const barPosition = time / BAR_SECONDS;
  const barIndex = Math.floor(barPosition);
  const barPhase = barPosition - barIndex;
  const currentChord = CHORDS[barIndex % CHORDS.length];
  const nextChord = CHORDS[(barIndex + 1) % CHORDS.length];
  const crossfade = smoothstep(0.74, 1, barPhase);
  const arrangement = Math.floor(barIndex / 6);

  const padBreath = 0.9 + 0.1 * Math.sin(TAU * time / 9.5 - 0.6);
  const padLevel = [0.031, 0.035, 0.039, 0.034][arrangement] ?? 0.034;
  const padLeft =
    (chordVoice(currentChord, time, 0) * (1 - crossfade) +
      chordVoice(nextChord, time, 0) * crossfade) *
    padBreath *
    padLevel;
  const padRight =
    (chordVoice(currentChord, time, 1) * (1 - crossfade) +
      chordVoice(nextChord, time, 1) * crossfade) *
    padBreath *
    padLevel;

  const bassCurrent = Math.sin(TAU * midiToHz(currentChord.root) * time);
  const bassNext = Math.sin(TAU * midiToHz(nextChord.root) * time);
  const bassFadeIn = smoothstep(2.7, 5.5, time);
  const bass =
    (bassCurrent * (1 - crossfade) + bassNext * crossfade) *
    0.014 *
    bassFadeIn;

  const beatPosition = time / BEAT_SECONDS;
  const beatIndex = Math.floor(beatPosition);
  const beatAge = (beatPosition - beatIndex) * BEAT_SECONDS;
  const beatAccent = beatIndex % 4 === 0 ? 1 : 0.56;
  const pulseEnvelope =
    (1 - Math.exp(-beatAge * 75)) * Math.exp(-beatAge * 15.5);
  const pulseFrequency = 78 - 22 * smoothstep(0, 0.22, beatAge);
  const pulse =
    Math.sin(TAU * pulseFrequency * beatAge) *
    pulseEnvelope *
    beatAccent *
    0.035 *
    smoothstep(0.8, 3.5, time);
  const pulsePan = beatIndex % 2 === 0 ? 0.46 : 0.54;

  const halfBeat = BEAT_SECONDS / 2;
  const stepPosition = time / halfBeat;
  const stepIndex = Math.floor(stepPosition);
  const stepAge = (stepPosition - stepIndex) * halfBeat;
  const arpeggioNote = currentChord.notes[(stepIndex + barIndex) % currentChord.notes.length] + 12;
  const arpeggioEnvelope =
    smoothstep(0, 0.006, stepAge) * Math.exp(-stepAge * 8.4);
  const arpeggioPhase = TAU * midiToHz(arpeggioNote) * stepAge;
  const arpeggio =
    (Math.sin(arpeggioPhase) * 0.72 +
      Math.sin(arpeggioPhase * 2.006 + 0.3) * 0.2 +
      Math.sin(arpeggioPhase * 3.99 + 0.7) * 0.08) *
    arpeggioEnvelope *
    0.016 *
    smoothstep(7, 13, time);
  const arpeggioPan = 0.32 + (stepIndex % 5) * 0.09;

  // A nearly subliminal glass tick at every edit point helps cuts feel intentional.
  let editTickLeft = 0;
  let editTickRight = 0;
  for (let index = 0; index < SHOT_BOUNDARIES.length; index += 1) {
    const age = time - SHOT_BOUNDARIES[index];
    if (age < 0 || age > 0.48) continue;
    const envelope = smoothstep(0, 0.004, age) * Math.exp(-age * 13);
    const note = 93 + (index % 4) * 2;
    const tick = Math.sin(TAU * midiToHz(note) * age) * envelope * 0.008;
    const pan = index % 2 === 0 ? 0.38 : 0.62;
    editTickLeft += tick * Math.sqrt(1 - pan);
    editTickRight += tick * Math.sqrt(pan);
  }

  let cueLeft = 0;
  let cueRight = 0;
  for (let index = 0; index < SECTION_CUES.length; index += 1) {
    const age = time - SECTION_CUES[index];
    if (age < 0 || age > 1.7) continue;
    const envelope = smoothstep(0, 0.012, age) * Math.exp(-age * 3.4);
    const frequency = midiToHz(CUE_NOTES[index]);
    const shimmer =
      Math.sin(TAU * frequency * age) * 0.7 +
      Math.sin(TAU * frequency * 2.003 * age + 0.4) * 0.22 +
      Math.sin(TAU * frequency * 4.01 * age + 0.9) * 0.08;
    const cue = shimmer * envelope * 0.022;
    const pan = index % 2 === 0 ? 0.35 : 0.65;
    cueLeft += cue * Math.sqrt(1 - pan);
    cueRight += cue * Math.sqrt(pan);
  }

  // Difference between two one-pole filters produces a soft, band-limited air.
  const noiseLeft = hashNoise(frame * 2);
  const noiseRight = hashNoise(frame * 2 + 1);
  airLowLeft += (noiseLeft - airLowLeft) * 0.065;
  airLowRight += (noiseRight - airLowRight) * 0.065;
  airSlowLeft += (noiseLeft - airSlowLeft) * 0.006;
  airSlowRight += (noiseRight - airSlowRight) * 0.006;
  const airLeft = (airLowLeft - airSlowLeft) * 0.0032;
  const airRight = (airLowRight - airSlowRight) * 0.0032;

  const fadeIn = Math.sin(smoothstep(0, 1.05, time) * Math.PI * 0.5);
  const fadeOut = Math.sin(
    smoothstep(0, 1.7, DURATION_SECONDS - time) * Math.PI * 0.5,
  );
  const masterEnvelope = fadeIn * fadeOut;

  left[frame] =
    (padLeft +
      bass +
      pulse * Math.sqrt(1 - pulsePan) +
      arpeggio * Math.sqrt(1 - arpeggioPan) +
      airLeft +
      editTickLeft +
      cueLeft) *
    masterEnvelope;
  right[frame] =
    (padRight +
      bass +
      pulse * Math.sqrt(pulsePan) +
      arpeggio * Math.sqrt(arpeggioPan) +
      airRight +
      editTickRight +
      cueRight) *
    masterEnvelope;
}

let rawPeak = 0;
for (let frame = 0; frame < TOTAL_FRAMES; frame += 1) {
  rawPeak = Math.max(rawPeak, Math.abs(left[frame]), Math.abs(right[frame]));
}

const targetPeak = 10 ** (-13 / 20);
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
