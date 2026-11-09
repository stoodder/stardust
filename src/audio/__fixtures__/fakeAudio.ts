// A fake AudioContext for unit tests (Node has no WebAudio): just the nodes the synth uses, which
// record what they were told, so tests can count voices and read scheduled values.

export class FakeParam {
  value: number;
  readonly calls: [method: string, value: number, time: number][] = [];
  constructor(value = 0) {
    this.value = value;
  }
  setValueAtTime(v: number, t: number): this {
    this.calls.push(['set', v, t]);
    this.value = v;
    return this;
  }
  linearRampToValueAtTime(v: number, t: number): this {
    this.calls.push(['linear', v, t]);
    return this;
  }
  exponentialRampToValueAtTime(v: number, t: number): this {
    if (!(v > 0)) throw new RangeError('exponential ramps need a positive target');
    this.calls.push(['exp', v, t]);
    return this;
  }
  setTargetAtTime(v: number, t: number, _c: number): this {
    this.calls.push(['target', v, t]);
    this.value = v;
    return this;
  }
  cancelScheduledValues(t: number): this {
    this.calls.push(['cancel', 0, t]);
    return this;
  }
}

export class FakeNode {
  readonly ctx: FakeAudioContext;
  readonly kind: string;
  readonly outputs: unknown[] = [];
  constructor(ctx: FakeAudioContext, kind: string) {
    this.ctx = ctx;
    this.kind = kind;
    ctx.created[kind] = (ctx.created[kind] ?? 0) + 1;
  }
  connect<T>(dest: T): T {
    this.outputs.push(dest);
    return dest;
  }
  disconnect(): void {
    this.outputs.length = 0;
  }
}

export class FakeGain extends FakeNode {
  readonly gain = new FakeParam(1);
  constructor(ctx: FakeAudioContext) {
    super(ctx, 'gain');
  }
}

class FakeSource extends FakeNode {
  readonly listeners: (() => void)[] = [];
  addEventListener(_type: 'ended', fn: () => void): void {
    this.listeners.push(fn);
  }
  startAt: number | null = null;
  stopAt: number | null = null;
  start(t = 0): void {
    if (this.startAt !== null) throw new Error('started twice');
    this.startAt = t;
    this.ctx.started.push(this);
  }
  stop(t = 0): void {
    if (this.startAt === null) throw new Error('stopped before start');
    this.stopAt = t;
  }
}

export class FakeOscillator extends FakeSource {
  type = 'sine';
  periodic: unknown = null;
  readonly frequency = new FakeParam(440);
  readonly detune = new FakeParam(0);
  constructor(ctx: FakeAudioContext) {
    super(ctx, 'oscillator');
  }
  setPeriodicWave(w: unknown): void {
    this.periodic = w;
    this.type = 'custom';
  }
}

export class FakeBufferSource extends FakeSource {
  buffer: unknown = null;
  loop = false;
  readonly playbackRate = new FakeParam(1);
  constructor(ctx: FakeAudioContext) {
    super(ctx, 'bufferSource');
  }
}

export class FakeAudioContext {
  currentTime = 0;
  readonly sampleRate = 44_100;
  state: 'running' | 'suspended' | 'closed' = 'running';
  readonly destination: FakeNode;
  readonly created: Record<string, number> = {};
  readonly started: FakeSource[] = [];
  constructor() {
    this.destination = new FakeNode(this, 'destination');
  }
  createGain(): FakeGain {
    return new FakeGain(this);
  }
  createOscillator(): FakeOscillator {
    return new FakeOscillator(this);
  }
  createBufferSource(): FakeBufferSource {
    return new FakeBufferSource(this);
  }
  createBiquadFilter() {
    const n = new FakeNode(this, 'filter');
    return Object.assign(n, {
      type: 'lowpass',
      frequency: new FakeParam(350),
      Q: new FakeParam(1),
    });
  }
  createDynamicsCompressor() {
    const n = new FakeNode(this, 'compressor');
    return Object.assign(n, {
      threshold: new FakeParam(-24),
      knee: new FakeParam(30),
      ratio: new FakeParam(12),
      attack: new FakeParam(0.003),
      release: new FakeParam(0.25),
    });
  }
  createWaveShaper() {
    return Object.assign(new FakeNode(this, 'shaper'), { curve: null as Float32Array | null });
  }
  createPeriodicWave(real: Float32Array, imag: Float32Array) {
    return { real, imag };
  }
  createBuffer(channels: number, length: number, sampleRate: number) {
    const data = Array.from({ length: channels }, () => new Float32Array(length));
    return { length, sampleRate, getChannelData: (i: number) => data[i]! };
  }
  resume(): Promise<void> {
    this.state = 'running';
    return Promise.resolve();
  }
  suspend(): Promise<void> {
    this.state = 'suspended';
    return Promise.resolve();
  }
  /** Oscillators and noise sources started so far. */
  get voices(): number {
    return this.started.length;
  }
}

/** The fake as the synth's context type (tests only: it implements just what the synth uses). */
export function asContext(ctx: FakeAudioContext): AudioContext {
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- a test double for the parts the synth uses
  return ctx as unknown as AudioContext;
}

/** A synth param as the fake that backs it (tests only). */
export function fakeParam(p: AudioParam): FakeParam {
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- every param of a fake context is a FakeParam
  return p as unknown as FakeParam;
}

/** The value a fake param was last set or ramped toward. */
export function lastTarget(p: AudioParam): number | undefined {
  return fakeParam(p).calls.at(-1)?.[1];
}
