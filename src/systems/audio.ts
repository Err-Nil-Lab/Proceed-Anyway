export type WarningSound = "falling" | "projectile" | "wall";

export interface AudioManagerConfig {
  bgmPath: string;
  bgmVolume: number;
}

export class AudioManager {
  private readonly bgm: HTMLAudioElement | null;
  private context: AudioContext | null = null;
  private bgmStarted = false;

  constructor(config: AudioManagerConfig) {
    if (typeof Audio === "undefined") {
      this.bgm = null;
      return;
    }

    this.bgm = new Audio(config.bgmPath);
    this.bgm.loop = true;
    this.bgm.preload = "auto";
    this.bgm.volume = Math.min(1, Math.max(0, config.bgmVolume));
  }

  unlock(): void {
    try {
      this.context ??= new AudioContext();
      if (this.context.state === "suspended") {
        void this.context.resume();
      }
      this.startBgm();
    } catch {
      this.context = null;
    }
  }

  private startBgm(): void {
    if (!this.bgm || this.bgmStarted) {
      return;
    }

    this.bgmStarted = true;
    void this.bgm.play().catch(() => {
      this.bgmStarted = false;
    });
  }

  stopBgm(): void {
    if (!this.bgm) {
      return;
    }

    this.bgm.pause();
    this.bgm.currentTime = 0;
    this.bgmStarted = false;
  }

  jump(): void {
    this.tone(220, 0.09, 0.045, "square", 340);
  }

  warning(kind: WarningSound): void {
    const frequency = kind === "falling" ? 150 : kind === "projectile" ? 190 : 110;
    this.tone(frequency, kind === "wall" ? 0.18 : 0.11, 0.035, "square");
  }

  error(): void {
    this.tone(95, 0.28, 0.055, "sawtooth", 62);
    this.tone(190, 0.18, 0.025, "square", 125, 0.08);
  }

  restored(): void {
    this.tone(180, 0.16, 0.035, "sine", 320);
  }

  nearMiss(): void {
    this.tone(420, 0.08, 0.04, "square", 620);
    this.tone(620, 0.11, 0.025, "sine", 820, 0.05);
  }

  death(): void {
    this.tone(120, 0.34, 0.07, "sawtooth", 42);
    this.noise(0.13, 0.055);
  }

  private tone(
    startFrequency: number,
    durationSeconds: number,
    volume: number,
    type: OscillatorType,
    endFrequency = startFrequency,
    delaySeconds = 0,
  ): void {
    const context = this.context;
    if (!context || context.state !== "running") {
      return;
    }

    const startTime = context.currentTime + delaySeconds;
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(startFrequency, startTime);
    oscillator.frequency.exponentialRampToValueAtTime(
      Math.max(1, endFrequency),
      startTime + durationSeconds,
    );
    gain.gain.setValueAtTime(0.0001, startTime);
    gain.gain.exponentialRampToValueAtTime(volume, startTime + 0.008);
    gain.gain.exponentialRampToValueAtTime(
      0.0001,
      startTime + durationSeconds,
    );
    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start(startTime);
    oscillator.stop(startTime + durationSeconds + 0.01);
  }

  private noise(durationSeconds: number, volume: number): void {
    const context = this.context;
    if (!context || context.state !== "running") {
      return;
    }

    const sampleCount = Math.ceil(context.sampleRate * durationSeconds);
    const buffer = context.createBuffer(1, sampleCount, context.sampleRate);
    const samples = buffer.getChannelData(0);
    for (let index = 0; index < samples.length; index += 1) {
      samples[index] = Math.random() * 2 - 1;
    }

    const source = context.createBufferSource();
    const gain = context.createGain();
    source.buffer = buffer;
    gain.gain.setValueAtTime(volume, context.currentTime);
    gain.gain.exponentialRampToValueAtTime(
      0.0001,
      context.currentTime + durationSeconds,
    );
    source.connect(gain);
    gain.connect(context.destination);
    source.start();
  }
}
