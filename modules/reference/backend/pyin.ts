// pYIN (Mauch and Dixon 2014) as librosa 1.0 computes it with the arguments the computer's machine check used (cmp.py:
// librosa.pyin(seg, fmin=80, fmax=400, sr=16000, frame_length=1024), each minute on its own), so the server reads a
// voice's pitch in the same Hz the thresholds were set in. Plain YIN read the same files up to 48 Hz apart from it
// (10-31: issue 7 as the server read it, minute 8, pyin 243.9 and YIN 195.6), and missed the drift it was there to catch.

const FMIN = 80;
const FMAX = 400;
const FRAME = 1024;
const HOP = FRAME / 4;
const THRESHOLDS = 100;
const BOLTZMANN = 2;
const NO_TROUGH = 0.01;
const SWITCH = 0.01;
const MIN_TRANS = 1e-4;
const BINS_PER_SEMITONE = 10;
const PITCH_BINS = Math.floor(12 * BINS_PER_SEMITONE * Math.log2(FMAX / FMIN)) + 1;
const TINY = 2.2250738585072014e-308;

/** In-place radix-2 FFT of (re, im), length a power of two. */
function fft(re: Float64Array, im: Float64Array) {
  const n = re.length;
  for (let i = 1, j = 0; i < n; i += 1) {
    let bit = n >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) { [re[i], re[j]] = [re[j]!, re[i]!]; [im[i], im[j]] = [im[j]!, im[i]!]; }
  }
  for (let len = 2; len <= n; len <<= 1) {
    const ang = (-2 * Math.PI) / len;
    const wr = Math.cos(ang), wi = Math.sin(ang);
    for (let i = 0; i < n; i += len) {
      let cr = 1, ci = 0;
      for (let k = 0; k < len / 2; k += 1) {
        const a = i + k, b = a + len / 2;
        const tr = re[b]! * cr - im[b]! * ci, ti = re[b]! * ci + im[b]! * cr;
        re[b] = re[a]! - tr; im[b] = im[a]! - ti; re[a] += tr; im[a] += ti;
        const nr = cr * wr - ci * wi; ci = cr * wi + ci * wr; cr = nr;
      }
    }
  }
}

/** Beta(2, 18)'s CDF: for whole-number parameters it is a binomial tail, P(Bin(19, x) ≥ 2). */
const betaCdf = (x: number) => 1 - (1 - x) ** 19 - 19 * x * (1 - x) ** 18;
const BETA_PROBS = Array.from({ length: THRESHOLDS }, (_, i) => betaCdf((i + 1) / THRESHOLDS) - betaCdf(i / THRESHOLDS));
const boltzmann = (k: number, n: number) => ((1 - Math.exp(-BOLTZMANN)) * Math.exp(-BOLTZMANN * k)) / (1 - Math.exp(-BOLTZMANN * n));

/** The triangle-banded pitch transition, both voicing halves, as each state's feasible predecessors and their log weights. */
const PREDECESSORS = (() => {
  const width = Math.round((35.92 * 12 * HOP) / 16_000) * BINS_PER_SEMITONE + 1;
  const half = width >> 1;
  const tri = Array.from({ length: width }, (_, n) => { const m = Math.min(n, width - 1 - n) + 1; return (2 * m) / (width + 1); });
  const rows: number[][] = [];
  for (let i = 0; i < PITCH_BINS; i += 1) {
    const row = new Array<number>(PITCH_BINS).fill(0);
    for (let j = Math.max(0, i - half); j <= Math.min(PITCH_BINS - 1, i + half); j += 1) row[j] = tri[j - i + half]!;
    const sum = row.reduce((s, v) => s + v, 0);
    rows.push(row.map((v) => v / sum));
  }
  const n = 2 * PITCH_BINS;
  const threshold = Math.log(MIN_TRANS + TINY);
  const preds: Array<{ from: Int32Array; log: Float64Array }> = [];
  for (let j = 0; j < n; j += 1) {
    const from: number[] = [], log: number[] = [];
    for (let k = 0; k < n; k += 1) {
      const t = (Math.floor(k / PITCH_BINS) === Math.floor(j / PITCH_BINS) ? 1 - SWITCH : SWITCH) * rows[k % PITCH_BINS]![j % PITCH_BINS]!;
      const l = Math.log(t + TINY);
      if (l >= threshold) { from.push(k); log.push(l); }
    }
    preds.push({ from: Int32Array.from(from), log: Float64Array.from(log) });
  }
  return preds;
})();

/** f0 of each voiced frame of `y` (16 kHz, one piece as librosa.pyin is given it); unvoiced frames are left out. */
export function pyin(y: Float32Array, sr = 16_000): number[] {
  const minPeriod = Math.floor(sr / FMAX);
  const maxPeriod = Math.min(Math.ceil(sr / FMIN), FRAME - 1);
  const padded = new Float32Array(y.length + FRAME);
  padded.set(y, FRAME / 2);
  const frames = 1 + Math.floor((padded.length - FRAME) / HOP);
  const nState = 2 * PITCH_BINS;
  const obs: Float64Array[] = [];
  const size = 2048;
  const re = new Float64Array(size), im = new Float64Array(size);
  const yin = new Float64Array(maxPeriod - minPeriod + 1);
  const d = new Float64Array(maxPeriod + 1);
  for (let f = 0; f < frames; f += 1) {
    const at = f * HOP;
    re.fill(0); im.fill(0);
    for (let i = 0; i < FRAME; i += 1) re[i] = padded[at + i]!;
    fft(re, im);
    for (let i = 0; i < size; i += 1) { re[i] = re[i]! * re[i]! + im[i]! * im[i]!; im[i] = 0; }
    fft(re, im); // the power spectrum is real and even, so a forward transform inverts it up to 1/size
    let energy = 0, cum = 0;
    d[0] = 0;
    for (let k = 1; k <= maxPeriod; k += 1) {
      const v = padded[at + k - 1]!;
      energy += v * v;
      d[k] = (2 * (re[0]! - re[k]!)) / size - energy;
      cum += d[k]!;
      if (k >= minPeriod) yin[k - minPeriod] = d[k]! / (cum / k + TINY);
    }
    const o = new Float64Array(nState);
    const m = yin.length;
    const troughs: number[] = [];
    for (let i = 0; i < m; i += 1) {
      const t = i === 0 ? yin[0]! < yin[1]! : i === m - 1 ? yin[i]! < yin[i - 1]! : yin[i]! < yin[i - 1]! && yin[i]! <= yin[i + 1]!;
      if (t) troughs.push(i);
    }
    let voiced = 0;
    if (troughs.length) {
      const heights = troughs.map((i) => yin[i]!);
      const probs = new Array<number>(troughs.length).fill(0);
      for (let t = 0; t < THRESHOLDS; t += 1) {
        const thr = (t + 1) / THRESHOLDS;
        const below = heights.map((h) => h < thr);
        const count = below.filter(Boolean).length;
        let pos = -1;
        for (let k = 0; k < troughs.length; k += 1) if (below[k]) { pos += 1; probs[k] += boltzmann(pos, count) * BETA_PROBS[t]!; }
      }
      let gmin = 0;
      for (let k = 1; k < heights.length; k += 1) if (heights[k]! < heights[gmin]!) gmin = k;
      let under = 0;
      for (let t = 0; t < THRESHOLDS; t += 1) if (!(heights[gmin]! < (t + 1) / THRESHOLDS)) under += BETA_PROBS[t]!;
      probs[gmin] += NO_TROUGH * under;
      for (let k = 0; k < troughs.length; k += 1) {
        if (!probs[k]) continue;
        const i = troughs[k]!;
        let shift = 0;
        if (i > 0 && i < m - 1) {
          const a = yin[i + 1]! + yin[i - 1]! - 2 * yin[i]!, b = (yin[i + 1]! - yin[i - 1]!) / 2;
          shift = Math.abs(b) >= Math.abs(a) ? 0 : -b / a;
        }
        const f0 = sr / (minPeriod + i + shift);
        const bin = Math.min(PITCH_BINS, Math.max(0, Math.round(12 * BINS_PER_SEMITONE * Math.log2(f0 / FMIN))));
        o[bin] = probs[k]!;
      }
      for (let b = 0; b < PITCH_BINS; b += 1) voiced += o[b]!;
      voiced = Math.min(1, Math.max(0, voiced));
    }
    for (let b = PITCH_BINS; b < nState; b += 1) o[b] = (1 - voiced) / PITCH_BINS;
    for (let b = 0; b < nState; b += 1) o[b] = Math.log(o[b]! + TINY);
    obs.push(o);
  }
  // Viterbi over the frames, as librosa.sequence.viterbi with transition_min_prob.
  const ptr = obs.map(() => new Uint16Array(nState));
  let value = new Float64Array(nState);
  for (let s = 0; s < nState; s += 1) value[s] = obs[0]![s]! + Math.log(1 / nState + TINY);
  for (let t = 1; t < frames; t += 1) {
    const next = new Float64Array(nState);
    for (let j = 0; j < nState; j += 1) {
      const { from, log } = PREDECESSORS[j]!;
      let best = -Infinity, arg = 0;
      for (let q = 0; q < from.length; q += 1) { const c = value[from[q]!]! + log[q]!; if (c > best) { best = c; arg = from[q]!; } }
      ptr[t]![j] = arg;
      next[j] = obs[t]![j]! + best;
    }
    value = next;
  }
  let state = 0;
  for (let s = 1; s < nState; s += 1) if (value[s]! > value[state]!) state = s;
  const out: number[] = [];
  for (let t = frames - 1; t >= 0; t -= 1) {
    if (state < PITCH_BINS) out.push(FMIN * 2 ** (state / (12 * BINS_PER_SEMITONE)));
    if (t > 0) state = ptr[t]![state]!;
  }
  return out.reverse();
}
