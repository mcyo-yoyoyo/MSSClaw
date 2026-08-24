import {
  lstatSync,
  mkdirSync,
  mkdtempSync,
  realpathSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {tmpdir} from 'node:os';
import {dirname, join, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

const VOICE = process.env.MSS_K3_VOICE ?? 'Tingting';
const SAMPLE_RATE = 48_000;
const FFMPEG = process.env.FFMPEG ?? 'ffmpeg';
const FFPROBE = process.env.FFPROBE ?? 'ffprobe';
const SAY = process.env.SAY ?? '/usr/bin/say';

// Locked narration from MSS_AI提效平台宣传片_分镜脚本_V1.2_即梦2.0修正版.xlsx.
// `spokenText` only replaces visual punctuation/symbols with their natural spoken
// equivalent; `text` preserves the approved copy exactly for editorial reference.
const SHOTS = [
  {id: '01', start: 0, duration: 3, text: 'MSS AI 提效平台，'},
  {
    id: '02',
    start: 3,
    duration: 5,
    text: 'AI 资讯、优选工具、高频场景、优秀实践，汇聚到一个入口。',
  },
  {
    id: '03',
    start: 8,
    duration: 4,
    text: '帮助MSS全员AI能力&办公效率快速提升。',
    spokenText: '帮助 MSS 全员 AI 能力与办公效率快速提升。',
  },
  {
    id: '04',
    start: 12,
    duration: 5,
    text: 'AI 快讯————前沿动态，每天 5 分钟，对齐最新技术与应用。',
    spokenText: 'AI 快讯：前沿动态，每天五分钟，对齐最新技术与应用。',
  },
  {id: '05', start: 17, duration: 3, text: '一键订阅、自动推送。'},
  {
    id: '06',
    start: 20,
    duration: 4,
    text: '外部工具精选————优选业界热门 AI 应用，',
    spokenText: '外部工具精选：优选业界热门 AI 应用。',
  },
  {id: '07', start: 24, duration: 3, text: '配图文/视频教学。', spokenText: '配图文、视频教学。'},
  {
    id: '08',
    start: 27,
    duration: 5,
    text: '从最新大小模型到海内外最新热门应用，',
  },
  {id: '09', start: 32, duration: 3, text: '推荐易选、快速上手。'},
  {
    id: '10',
    start: 35,
    duration: 4,
    text: '内部办公推荐————身边好用的合规办公 AI 工具，',
    spokenText: '内部办公推荐：身边好用的合规办公 AI 工具。',
  },
  {
    id: '11',
    start: 39,
    duration: 4,
    text: '连接真实办公场景与沉淀优秀案例。',
  },
  {id: '12', start: 43, duration: 3, text: '好用推荐，快速传播。'},
  {
    id: '13',
    start: 46,
    duration: 4,
    text: 'AI 工具 Hub————MSS AI 优秀实践和案例，',
    spokenText: 'AI 工具 Hub：MSS AI 优秀实践和案例。',
  },
  {id: '14', start: 50, duration: 3, text: '聚焦高频高价值场景，'},
  {
    id: '15',
    start: 53,
    duration: 4,
    text: '打造一个工具，解决一类问题；',
  },
  {
    id: '16',
    start: 57,
    duration: 4,
    text: '沉淀一份经验，服务更多团队。',
  },
  {
    id: '17',
    start: 61,
    duration: 4,
    text: 'MSS AI 提效平台，找得到，易学习，更新快，好分享。',
  },
  {
    id: '18',
    start: 65,
    duration: 5,
    text: '火热内测中，欢迎大家参与体验，期待您的宝贵建议！',
  },
];

const scriptDir = dirname(fileURLToPath(import.meta.url));
const outputDir = resolve(scriptDir, '../public/audio/voice-k3');
const temporaryDir = mkdtempSync(join(tmpdir(), 'mss-k3-voice-'));

const run = (executable, args, options = {}) =>
  execFileSync(executable, args, {
    encoding: 'utf8',
    stdio: options.capture ? ['ignore', 'pipe', 'pipe'] : 'ignore',
  });

const durationOf = (filePath) =>
  Number(
    run(
      FFPROBE,
      [
        '-v',
        'error',
        '-show_entries',
        'format=duration',
        '-of',
        'default=noprint_wrappers=1:nokey=1',
        filePath,
      ],
      {capture: true},
    ).trim(),
  );

const characterCount = (value) =>
  [...value].filter((character) => /[\p{L}\p{N}]/u.test(character)).length;

const fitTempoFilters = (factor) => {
  const filters = [];
  let remaining = factor;
  while (remaining > 2) {
    filters.push('atempo=2');
    remaining /= 2;
  }
  if (remaining > 1.0005) filters.push(`atempo=${remaining.toFixed(6)}`);
  return filters;
};

const trimSpeech = (sourcePath, destinationPath) => {
  run(FFMPEG, [
    '-hide_banner',
    '-loglevel',
    'error',
    '-y',
    '-i',
    sourcePath,
    '-af',
    'silenceremove=start_periods=1:start_duration=0.025:start_threshold=-48dB:stop_periods=-1:stop_duration=0.06:stop_threshold=-48dB',
    '-ar',
    String(SAMPLE_RATE),
    '-ac',
    '1',
    '-c:a',
    'pcm_s16le',
    destinationPath,
  ]);
};

const ensureVoiceExists = () => {
  const voices = run(SAY, ['-v', '?'], {capture: true});
  if (!voices.split('\n').some((line) => line.startsWith(`${VOICE} `))) {
    throw new Error(`macOS voice "${VOICE}" is not installed.`);
  }
};

mkdirSync(outputDir, {recursive: true});
ensureVoiceExists();

const manifest = [];

try {
  for (const shot of SHOTS) {
    const spokenText = shot.spokenText ?? shot.text;
    const leadIn = shot.duration <= 3 ? 0.14 : 0.17;
    const minimumTail = shot.duration <= 3 ? 0.25 : 0.34;
    const speechBudget = shot.duration - leadIn - minimumTail;
    const rawPath = join(temporaryDir, `shot-${shot.id}.aiff`);
    const trimmedPath = join(temporaryDir, `shot-${shot.id}-trimmed.wav`);
    const outputPath = join(outputDir, `shot-${shot.id}.wav`);

    // Tingting averages roughly 42-46 spoken Han/Latin characters per minute
    // for each unit of `say -r`. This estimate starts close to the target while
    // the measured correction below guarantees the locked shot duration.
    let rate = Math.ceil(
      Math.max(
        185,
        Math.min(390, (characterCount(spokenText) / speechBudget) * 44),
      ) / 5,
    ) * 5;
    let speechDuration = Number.POSITIVE_INFINITY;

    for (let attempt = 0; attempt < 5; attempt += 1) {
      run(SAY, ['-v', VOICE, '-r', String(rate), '-o', rawPath, spokenText]);
      trimSpeech(rawPath, trimmedPath);
      speechDuration = durationOf(trimmedPath);
      if (speechDuration <= speechBudget + 0.002) break;
      rate = Math.min(
        500,
        Math.ceil((rate * (speechDuration / speechBudget) * 1.025) / 5) * 5,
      );
    }

    const tempoFactor =
      speechDuration > speechBudget ? speechDuration / speechBudget : 1;
    const processingFilters = [
      ...fitTempoFilters(tempoFactor),
      'highpass=f=72',
      'lowpass=f=10800',
      'acompressor=threshold=-20dB:ratio=2.2:attack=8:release=90:makeup=2dB',
      'alimiter=limit=0.79:attack=5:release=50',
      `adelay=${Math.round(leadIn * 1000)}:all=1`,
      `apad=whole_dur=${shot.duration.toFixed(6)}`,
      `atrim=duration=${shot.duration.toFixed(6)}`,
      'asetpts=N/SR/TB',
    ];

    run(FFMPEG, [
      '-hide_banner',
      '-loglevel',
      'error',
      '-y',
      '-i',
      trimmedPath,
      '-af',
      processingFilters.join(','),
      '-ar',
      String(SAMPLE_RATE),
      '-ac',
      '1',
      '-c:a',
      'pcm_s16le',
      outputPath,
    ]);

    const finalDuration = durationOf(outputPath);
    if (finalDuration > shot.duration + 1 / SAMPLE_RATE) {
      throw new Error(
        `shot-${shot.id} is ${finalDuration}s; limit is ${shot.duration}s`,
      );
    }

    manifest.push({
      shot: shot.id,
      start: shot.start,
      duration: shot.duration,
      text: shot.text,
      spokenText,
      voice: VOICE,
      sayRate: rate,
      activeSpeechDuration: Number(
        (speechDuration / tempoFactor).toFixed(4),
      ),
      leadIn,
      output: `shot-${shot.id}.wav`,
    });

    console.log(
      `shot-${shot.id}.wav  ${finalDuration.toFixed(3)}s  ` +
        `speech ${(speechDuration / tempoFactor).toFixed(3)}s  rate ${rate}`,
    );
  }

  const concatListPath = join(temporaryDir, 'concat.txt');
  writeFileSync(
    concatListPath,
    manifest
      .map(({output}) => `file '${join(outputDir, output).replaceAll("'", "'\\''")}'`)
      .join('\n'),
  );
  run(FFMPEG, [
    '-hide_banner',
    '-loglevel',
    'error',
    '-y',
    '-f',
    'concat',
    '-safe',
    '0',
    '-i',
    concatListPath,
    '-c:a',
    'pcm_s16le',
    join(outputDir, 'full-70s.wav'),
  ]);

  writeFileSync(
    join(outputDir, 'manifest.json'),
    `${JSON.stringify(
      {
        source:
          'MSS_AI提效平台宣传片_分镜脚本_V1.2_即梦2.0修正版.xlsx',
        sampleRate: SAMPLE_RATE,
        channels: 1,
        format: 'PCM signed 16-bit little-endian',
        totalDuration: 70,
        shots: manifest,
      },
      null,
      2,
    )}\n`,
  );

  console.log(`Wrote ${join(outputDir, 'full-70s.wav')}`);
  console.log(`Wrote ${join(outputDir, 'manifest.json')}`);
} finally {
  // Validate the exact mkdtemp-created path before recursive cleanup.
  const resolvedTemporaryDir = realpathSync(temporaryDir);
  const resolvedSystemTemp = realpathSync(tmpdir());
  const temporaryStat = lstatSync(resolvedTemporaryDir);
  const expectedPrefix = `${resolvedSystemTemp}/mss-k3-voice-`;
  if (
    !temporaryStat.isDirectory() ||
    temporaryStat.isSymbolicLink() ||
    !resolvedTemporaryDir.startsWith(expectedPrefix)
  ) {
    throw new Error(`Refusing to clean unexpected path: ${resolvedTemporaryDir}`);
  }
  rmSync(resolvedTemporaryDir, {recursive: true});
}
