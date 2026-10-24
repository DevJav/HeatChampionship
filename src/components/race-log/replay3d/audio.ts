import { carPose, START_LIGHTS, type CameraPose, type Replay } from "./director";

/**
 * The sound of the 3D replay, made on the fly with the Web Audio API (no
 * recordings): a sixties V8 per car, each a little different, that climbs
 * through the gears with its speed, heard from where the camera is (louder close by, panned left or
 * right, pitched up coming and down going), tyres squealing in spins, the
 * start-light beeps, the crowd that cheers the big moments, and the wind
 * on board.
 *
 * Everything but the beeps is worked out from the replay time, so seeking
 * sounds right straight away. The same sound can be rendered offline for a
 * video (renderRaceAudio), faster than real time and frame-exact.
 */

export type RaceAudio = {
  /** Call every frame while playing; `at` is the clock in seconds (the wall clock unless rendering offline) */
  update(t: number, camera: CameraPose, at?: number): void;
  /** Fade out: paused, scrubbing or recording elsewhere */
  silence(): void;
  setMuted(muted: boolean): void;
  /** Starts the sound after a tap (browsers keep it off until then) */
  resume(): Promise<void>;
  /** The sound as a track, when made for a recording */
  stream: MediaStream | null;
  dispose(): void;
};

/** Speed of sound in scene units a second: a car (about 4 m) is 11 units long */
const SOUND_SPEED = 950;
/** Engines are at half volume this far from the camera */
const HALF_VOLUME_AT = 40;
const GEARS = 6;
const VOLUME = 0.75;

const clamp = (x: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, x));

/** Crowd excitement: a quick rise then a long fall, in rounds after the moment */
function swell(k: number, length: number) {
  if (k < 0 || k > length) return 0;
  return k < 0.08 ? k / 0.08 : Math.exp(-(k - 0.08) * (3 / length));
}

/** Engine speed (0 … 1) for a car going at a share of its top speed: up through the gears */
function revs(share: number) {
  const x = clamp(share, 0, 1) * GEARS;
  const gear = Math.min(GEARS - 1, Math.floor(x));
  const within = x - gear;
  return gear === 0 ? 0.3 + 0.7 * within : 0.58 + 0.42 * within;
}

/**
 * What makes each car's engine its own, the same every time for the same car:
 * a little higher or lower, lumpier or smoother, brighter or duller. Engines
 * that differ don't stack up into one loud drone.
 */
function traits(i: number) {
  let seed = Math.imul(i + 1, 0x9e3779b9);
  const random = () => {
    seed = Math.imul(seed ^ (seed >>> 15), 0x2c1b3c6d);
    seed = Math.imul(seed ^ (seed >>> 12), 0x297a2d39);
    return ((seed ^ (seed >>> 15)) >>> 0) / 4294967296;
  };
  return {
    // Spread across ±7%, but not in grid order
    pitch: 1 + (((i * 0.618034) % 1) - 0.5) * 0.14,
    rough: 1.002 + random() * 0.006,
    lump: 0.18 + random() * 0.16,
    lumpRate: [0.25, 0.25, 0.5, 1 / 3][Math.floor(random() * 4)],
    throat: 2.6 + random() * 0.8,
    tone: 500 + random() * 250,
    level: 0.85 + random() * 0.25,
    blip: random() * 40,
  };
}

function noiseBuffer(ctx: BaseAudioContext) {
  const buffer = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  // Brownish noise: softer at the top than plain white noise
  let last = 0;
  for (let i = 0; i < data.length; i++) {
    last = (last + 0.04 * (Math.random() * 2 - 1)) / 1.04;
    data[i] = last * 3.5 + (Math.random() * 2 - 1) * 0.08;
  }
  return buffer;
}

function distortion(amount: number) {
  const curve = new Float32Array(1024);
  for (let i = 0; i < curve.length; i++) {
    const x = (i / (curve.length - 1)) * 2 - 1;
    curve[i] = Math.tanh(x * amount) / Math.tanh(amount);
  }
  return curve;
}

export function createRaceAudio(replay: Replay, { record = false, context }: { record?: boolean; context?: BaseAudioContext } = {}): RaceAudio {
  const { stage } = replay;
  const { motion } = stage;
  const ctx = context ?? new AudioContext();
  // Offline (for a video) there's nothing to pause or resume
  const live = ctx instanceof AudioContext ? ctx : null;
  const now = () => ctx.currentTime;

  const compressor = ctx.createDynamicsCompressor();
  compressor.threshold.value = -18;
  compressor.ratio.value = 4;
  const master = ctx.createGain();
  master.gain.value = 0;
  master.connect(compressor);
  const recording = record && live ? live.createMediaStreamDestination() : null;
  compressor.connect(recording ?? ctx.destination);
  const noise = noiseBuffer(ctx);
  const loop = () => {
    const source = ctx.createBufferSource();
    source.buffer = noise;
    source.loop = true;
    source.loopStart = Math.random();
    source.start(0, Math.random() * 2);
    return source;
  };

  // Top speed on the long straights (not the odd burst), so engines run up through every gear
  const speeds: number[] = [];
  for (let t = 0; t < motion.end; t += 0.05) for (const id of motion.ids) speeds.push(motion.at(id, t).speed);
  speeds.sort((a, b) => a - b);
  const top = Math.max(1, speeds[Math.floor(speeds.length * 0.97)] ?? 1);

  const shaper = distortion(3);
  // Packs are quieter per car, so seven together don't add up to a wall of sound
  const packLevel = Math.sqrt(3 / Math.max(3, motion.ids.length));
  const engines = motion.ids.map((id, i) => {
    const trait = traits(i);
    // A sixties V8: a sawtooth at the firing rate, a square an octave down for the body,
    // a second sawtooth a hair apart for the roughness, and a lumpy pulse for the burble
    const saw = ctx.createOscillator();
    saw.type = "sawtooth";
    const body = ctx.createOscillator();
    body.type = "square";
    const bodyLevel = ctx.createGain();
    bodyLevel.gain.value = 0.5;
    const rough = ctx.createOscillator();
    rough.type = "sawtooth";
    const roughLevel = ctx.createGain();
    roughLevel.gain.value = 0.4;
    const lump = ctx.createOscillator();
    const lumpDepth = ctx.createGain();
    lumpDepth.gain.value = trait.lump;
    const rasp = ctx.createBiquadFilter();
    rasp.type = "bandpass";
    rasp.Q.value = 1.2;
    const raspLevel = ctx.createGain();
    raspLevel.gain.value = 0;
    const raspDepth = ctx.createGain();
    raspDepth.gain.value = 0.15;
    const raspNoise = loop();
    const mix = ctx.createGain();
    mix.gain.value = 0.6;
    const drive = ctx.createWaveShaper();
    drive.curve = shaper;
    drive.oversample = "2x";
    // The throat: a resonance that climbs with the revs
    const throat = ctx.createBiquadFilter();
    throat.type = "peaking";
    throat.Q.value = 1.5;
    throat.gain.value = 5;
    const tone = ctx.createBiquadFilter();
    tone.type = "lowpass";
    tone.Q.value = 1.2;
    const level = ctx.createGain();
    level.gain.value = 0;
    const pan = ctx.createStereoPanner();
    saw.connect(mix);
    body.connect(bodyLevel).connect(mix);
    rough.connect(roughLevel).connect(mix);
    lump.connect(lumpDepth).connect(mix.gain);
    raspNoise.connect(rasp).connect(raspLevel).connect(mix);
    saw.connect(raspDepth).connect(raspLevel.gain);
    mix.connect(drive).connect(throat).connect(tone).connect(level).connect(pan).connect(master);
    for (const osc of [saw, body, rough, lump]) osc.start();
    return {
      id,
      trait,
      sources: [saw, body, rough, lump, raspNoise],
      saw,
      body,
      rough,
      lump,
      rasp,
      throat,
      tone,
      level,
      pan,
      distance: null as number | null,
      doppler: 1,
    };
  });

  /** A bang from the exhaust when the driver lifts: overrun pops and crackles */
  function pop(volume: number, side: number) {
    const source = ctx.createBufferSource();
    source.buffer = noise;
    const crack = ctx.createBiquadFilter();
    crack.type = "lowpass";
    crack.frequency.value = 900 + Math.random() * 1500;
    const env = ctx.createGain();
    env.gain.setValueAtTime(volume, now());
    env.gain.setTargetAtTime(0, now() + 0.008, 0.012);
    const place = ctx.createStereoPanner();
    place.pan.value = side;
    source.connect(crack).connect(env).connect(place).connect(master);
    source.start(0, Math.random() * 1.5);
    source.stop(now() + 0.08);
  }

  // One squealing tyre voice, for whichever spin is loudest
  const squeal = ctx.createBiquadFilter();
  squeal.type = "bandpass";
  squeal.Q.value = 9;
  squeal.frequency.value = 2400;
  const squealLevel = ctx.createGain();
  squealLevel.gain.value = 0;
  const squealPan = ctx.createStereoPanner();
  const squealNoise = loop();
  squealNoise.connect(squeal).connect(squealLevel).connect(squealPan).connect(master);

  // The crowd: a broad murmur that swells with the big moments
  const crowd = ctx.createBiquadFilter();
  crowd.type = "bandpass";
  crowd.frequency.value = 900;
  crowd.Q.value = 0.6;
  const crowdLevel = ctx.createGain();
  crowdLevel.gain.value = 0;
  const crowdNoise = loop();
  crowdNoise.connect(crowd).connect(crowdLevel).connect(master);

  // Wind past the helmet on board
  const wind = ctx.createBiquadFilter();
  wind.type = "highpass";
  wind.frequency.value = 600;
  const windLevel = ctx.createGain();
  windLevel.gain.value = 0;
  const windNoise = loop();
  windNoise.connect(wind).connect(windLevel).connect(master);

  const moments = motion.events.flatMap((e) => {
    if (e.kind === "finish") return [{ t: e.t, amount: e.position === 1 ? 0.55 : 0.18, length: e.position === 1 ? 2.2 : 0.9 }];
    if (e.kind === "spin") return [{ t: e.t + 0.1, amount: 0.3, length: 1.2 }];
    if (e.kind === "pass") return [{ t: e.t, amount: e.lead ? 0.32 : 0.1, length: e.lead ? 1.4 : 0.7 }];
    return [];
  });

  /** A short high beep as each start light comes on */
  function beep() {
    const osc = ctx.createOscillator();
    osc.type = "square";
    osc.frequency.value = 880;
    const env = ctx.createGain();
    env.gain.setValueAtTime(0, now());
    env.gain.linearRampToValueAtTime(0.12, now() + 0.012);
    env.gain.setTargetAtTime(0, now() + 0.12, 0.04);
    osc.connect(env).connect(master);
    osc.start();
    osc.stop(now() + 0.6);
  }

  let muted = false;
  let silent = true;
  // Once faded out, the sound is switched off altogether until it plays again
  let sleep: ReturnType<typeof setTimeout> | undefined;
  let last: { t: number; at: number } | null = null;

  return {
    stream: recording?.stream ?? null,
    async resume() {
      if (live?.state === "suspended") await live.resume();
    },
    setMuted(value) {
      muted = value;
      if (!silent) master.gain.setTargetAtTime(muted ? 0 : VOLUME, now(), 0.05);
    },
    silence() {
      silent = true;
      last = null;
      master.gain.setTargetAtTime(0, now(), 0.06);
      clearTimeout(sleep);
      if (live) sleep = setTimeout(() => void live.suspend(), 400);
      for (const engine of engines) engine.distance = null;
    },
    update(t, camera, at = performance.now() / 1000) {
      // Real seconds since the last frame, unless the replay jumped (a seek)
      const dt = last && t > last.t && t - last.t < 0.2 ? at - last.at : 0;
      if (last && dt > 0) for (const lit of START_LIGHTS) if (last.t < lit && t >= lit) beep();
      last = { t, at };
      if (silent) {
        silent = false;
        clearTimeout(sleep);
        if (live?.state === "suspended") void live.resume();
        master.gain.setTargetAtTime(muted ? 0 : VOLUME, now(), 0.08);
      }

      const eye = camera.position;
      const look = Math.hypot(camera.target.x - eye.x, camera.target.z - eye.z) || 1;
      // Camera's right, flat on the ground
      const right = { x: -(camera.target.z - eye.z) / look, z: (camera.target.x - eye.x) / look };
      // Quick enough for crisp gear changes
      const smooth = 0.02;
      let nearest = { d: Infinity, share: 0 };
      let loudestSpin = { gain: 0, pan: 0 };

      for (const engine of engines) {
        const car = carPose(stage, engine.id, t);
        const state = motion.at(engine.id, t);
        const share = state.speed / top;
        let rpm = revs(share);
        // On the grid: idling, with a blip of the throttle now and then
        if (t < 0) rpm = 0.3 + 0.35 * Math.max(0, Math.sin(t * 38 + engine.trait.blip)) ** 6;
        const spinning = motion.events.some((e) => e.kind === "spin" && e.id === engine.id && t >= e.t && t < e.end);
        if (spinning) rpm = 0.95;
        // Off the throttle when braking: quieter and duller
        const throttle = spinning || state.accel > -6 ? 1 : 0.45;

        const d = Math.hypot(car.x - eye.x, 1 - eye.y, car.z - eye.z);
        // Pitch up coming towards the camera, down going away; ignore jumps (a cut to another camera)
        if (engine.distance !== null && dt > 0) {
          const closing = (d - engine.distance) / dt;
          const target = Math.abs(closing) < SOUND_SPEED * 0.5 ? SOUND_SPEED / (SOUND_SPEED + closing) : 1;
          engine.doppler += (target - engine.doppler) * 0.25;
        }
        engine.distance = d;

        const trait = engine.trait;
        // Firing rate, about 55 Hz idling to 235 Hz flat out, each engine pitched a little apart
        const freq = (55 + 180 * clamp((rpm - 0.3) / 0.7, 0, 1)) * trait.pitch * engine.doppler;
        engine.saw.frequency.setTargetAtTime(freq, now(), smooth);
        engine.body.frequency.setTargetAtTime(freq / 2, now(), smooth);
        engine.rough.frequency.setTargetAtTime(freq * trait.rough, now(), smooth);
        engine.lump.frequency.setTargetAtTime(freq * trait.lumpRate, now(), smooth);
        engine.rasp.frequency.setTargetAtTime(freq * 2.5, now(), smooth);
        engine.throat.frequency.setTargetAtTime(freq * trait.throat, now(), smooth);
        engine.tone.frequency.setTargetAtTime((trait.tone + rpm * 1800) * (throttle === 1 ? 1 : 0.5), now(), smooth);
        // Gently, like a TV mix: the pack can still be heard from the helicopter
        const volume = HALF_VOLUME_AT / (HALF_VOLUME_AT + d);
        engine.level.gain.setTargetAtTime(Math.min(0.9, volume * (0.4 + 0.6 * throttle) * 0.6 * trait.level * packLevel), now(), smooth);
        const side = d > 0.5 ? ((car.x - eye.x) * right.x + (car.z - eye.z) * right.z) / d : 0;
        engine.pan.pan.setTargetAtTime(clamp(side, -1, 1) * 0.85, now(), smooth);

        // Lifting at speed: the odd crackle from the exhaust
        if (throttle < 1 && share > 0.3 && dt > 0 && Math.random() < dt * 9) pop(volume * 0.5 * packLevel, clamp(side, -1, 1) * 0.85);

        if (d < nearest.d) nearest = { d, share };
        if (spinning && volume > loudestSpin.gain) loudestSpin = { gain: volume, pan: clamp(side, -1, 1) * 0.85 };
      }

      squealLevel.gain.setTargetAtTime(Math.min(0.5, loudestSpin.gain * 0.9), now(), 0.05);
      squealPan.pan.setTargetAtTime(loudestSpin.pan, now(), 0.05);
      squeal.frequency.setTargetAtTime(2200 + Math.sin(at * 23) * 500, now(), 0.02);

      const excitement = moments.reduce((sum, m) => sum + m.amount * swell(t - m.t, m.length), 0);
      crowdLevel.gain.setTargetAtTime(0.05 + Math.min(0.6, excitement) * 0.7, now(), 0.15);

      // The camera is in the cockpit when a car is right on top of it
      const onboard = nearest.d < 3;
      windLevel.gain.setTargetAtTime(onboard ? 0.05 + nearest.share * 0.12 : 0, now(), 0.1);
    },
    dispose() {
      clearTimeout(sleep);
      for (const engine of engines) for (const source of engine.sources) source.stop();
      for (const source of [squealNoise, crowdNoise, windNoise]) source.stop();
      recording?.stream.getTracks().forEach((track) => track.stop());
      void live?.close();
    },
  };
}

const SAMPLE_RATE = 48000;
/** How often the engines are updated while rendering offline: like a frame at 60 fps */
const OFFLINE_STEP = 1 / 60;

/**
 * The whole soundtrack of a video, rendered offline: `frame(second)` says
 * what's on screen at each moment (the race time and the camera), exactly as
 * the pictures will show it.
 */
export async function renderRaceAudio(replay: Replay, duration: number, frame: (second: number) => { time: number; camera: CameraPose }) {
  const ctx = new OfflineAudioContext(2, Math.ceil(duration * SAMPLE_RATE), SAMPLE_RATE);
  const audio = createRaceAudio(replay, { context: ctx });
  // Stop at every step, move the engines on, carry on rendering
  for (let step = 1; step * OFFLINE_STEP < duration; step++) {
    const second = step * OFFLINE_STEP;
    ctx.suspend(second).then(() => {
      const { time, camera } = frame(second);
      audio.update(time, camera, second);
      void ctx.resume();
    });
  }
  const first = frame(0);
  audio.update(first.time, first.camera, 0);
  return ctx.startRendering();
}
