/**
 * Web Audio Procedural Sound Synthesizer for Neon Dash
 * Self-contained procedural audio without external file dependencies.
 */

class SoundManager {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false;
  private isBgmMuted: boolean = false;
  private bgmGainNode: GainNode | null = null;
  private sfxGainNode: GainNode | null = null;
  private bgmIntervalId: number | null = null;
  private bgmStep: number = 0;
  private isBgmPlaying: boolean = false;

  constructor() {
    // Load mute preferences from localStorage if available
    try {
      this.isMuted = localStorage.getItem('neondash_sfx_muted') === 'true';
      this.isBgmMuted = localStorage.getItem('neondash_bgm_muted') === 'true';
    } catch {
      this.isMuted = false;
      this.isBgmMuted = false;
    }
  }

  private initContext() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtx();

      // SFX master gain
      this.sfxGainNode = this.ctx.createGain();
      this.sfxGainNode.gain.value = this.isMuted ? 0 : 0.4;
      this.sfxGainNode.connect(this.ctx.destination);

      // BGM master gain
      this.bgmGainNode = this.ctx.createGain();
      this.bgmGainNode.gain.value = this.isBgmMuted ? 0 : 0.22;
      this.bgmGainNode.connect(this.ctx.destination);
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  public unlock() {
    this.initContext();
  }

  public toggleSfx(): boolean {
    this.isMuted = !this.isMuted;
    try {
      localStorage.setItem('neondash_sfx_muted', String(this.isMuted));
    } catch {}
    if (this.sfxGainNode && this.ctx) {
      this.sfxGainNode.gain.setTargetAtTime(this.isMuted ? 0 : 0.4, this.ctx.currentTime, 0.05);
    }
    return !this.isMuted;
  }

  public toggleBgm(): boolean {
    this.isBgmMuted = !this.isBgmMuted;
    try {
      localStorage.setItem('neondash_bgm_muted', String(this.isBgmMuted));
    } catch {}
    if (this.bgmGainNode && this.ctx) {
      this.bgmGainNode.gain.setTargetAtTime(this.isBgmMuted ? 0 : 0.22, this.ctx.currentTime, 0.05);
    }
    return !this.isBgmMuted;
  }

  public getSfxEnabled(): boolean {
    return !this.isMuted;
  }

  public getBgmEnabled(): boolean {
    return !this.isBgmMuted;
  }

  // --- Sound Effects ---

  public playJump() {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx || !this.sfxGainNode) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(240, t);
    osc.frequency.exponentialRampToValueAtTime(680, t + 0.14);

    gain.gain.setValueAtTime(0.5, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.16);

    osc.connect(gain);
    gain.connect(this.sfxGainNode);

    osc.start(t);
    osc.stop(t + 0.17);
  }

  public playDuck() {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx || !this.sfxGainNode) return;

    const t = this.ctx.currentTime;
    // Filtered noise swoosh for slide
    const bufferSize = this.ctx.sampleRate * 0.15;
    const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }

    const whiteNoise = this.ctx.createBufferSource();
    whiteNoise.buffer = noiseBuffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(1200, t);
    filter.frequency.exponentialRampToValueAtTime(350, t + 0.14);
    filter.Q.value = 3.0;

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.45, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.14);

    whiteNoise.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGainNode);

    whiteNoise.start(t);
    whiteNoise.stop(t + 0.15);
  }

  public playCollectCoin() {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx || !this.sfxGainNode) return;

    const t = this.ctx.currentTime;
    const osc1 = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc1.type = 'sine';
    osc2.type = 'triangle';

    osc1.frequency.setValueAtTime(987.77, t); // B5
    osc1.frequency.setValueAtTime(1318.51, t + 0.08); // E6

    osc2.frequency.setValueAtTime(1975.53, t); // B6
    osc2.frequency.setValueAtTime(2637.02, t + 0.08); // E7

    gain.gain.setValueAtTime(0.35, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.22);

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(this.sfxGainNode);

    osc1.start(t);
    osc2.start(t);
    osc1.stop(t + 0.23);
    osc2.stop(t + 0.23);
  }

  public playShieldPickup() {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx || !this.sfxGainNode) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(220, t);
    osc.frequency.exponentialRampToValueAtTime(880, t + 0.25);

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(600, t);
    filter.frequency.exponentialRampToValueAtTime(3200, t + 0.25);

    gain.gain.setValueAtTime(0.3, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.28);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGainNode);

    osc.start(t);
    osc.stop(t + 0.3);
  }

  public playShieldBreak() {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx || !this.sfxGainNode) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(600, t);
    osc.frequency.exponentialRampToValueAtTime(100, t + 0.25);

    gain.gain.setValueAtTime(0.4, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.25);

    osc.connect(gain);
    gain.connect(this.sfxGainNode);

    osc.start(t);
    osc.stop(t + 0.26);
  }

  public playHit() {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx || !this.sfxGainNode) return;

    const t = this.ctx.currentTime;

    // Sub rumble
    const osc = this.ctx.createOscillator();
    const oscGain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(140, t);
    osc.frequency.exponentialRampToValueAtTime(30, t + 0.35);
    oscGain.gain.setValueAtTime(0.8, t);
    oscGain.gain.exponentialRampToValueAtTime(0.01, t + 0.35);
    osc.connect(oscGain);
    oscGain.connect(this.sfxGainNode);
    osc.start(t);
    osc.stop(t + 0.36);

    // Noise crash burst
    const bufferSize = this.ctx.sampleRate * 0.28;
    const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.3));
    }
    const noiseSource = this.ctx.createBufferSource();
    noiseSource.buffer = noiseBuffer;

    const noiseFilter = this.ctx.createBiquadFilter();
    noiseFilter.type = 'lowpass';
    noiseFilter.frequency.setValueAtTime(2500, t);
    noiseFilter.frequency.exponentialRampToValueAtTime(200, t + 0.28);

    const noiseGain = this.ctx.createGain();
    noiseGain.gain.setValueAtTime(0.7, t);
    noiseGain.gain.exponentialRampToValueAtTime(0.01, t + 0.28);

    noiseSource.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(this.sfxGainNode);

    noiseSource.start(t);
    noiseSource.stop(t + 0.29);
  }

  public playGameOver() {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx || !this.sfxGainNode) return;

    const t = this.ctx.currentTime;
    const notes = [330, 293.66, 261.63, 196]; // E4, D4, C4, G3
    notes.forEach((freq, idx) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();
      osc.type = 'sawtooth';
      osc.frequency.value = freq;

      const startTime = t + idx * 0.14;
      gain.gain.setValueAtTime(0.25, startTime);
      gain.gain.exponentialRampToValueAtTime(0.01, startTime + 0.18);

      osc.connect(gain);
      gain.connect(this.sfxGainNode!);

      osc.start(startTime);
      osc.stop(startTime + 0.2);
    });
  }

  public playClick() {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx || !this.sfxGainNode) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(800, t);
    osc.frequency.exponentialRampToValueAtTime(400, t + 0.04);
    gain.gain.setValueAtTime(0.2, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.05);
    osc.connect(gain);
    gain.connect(this.sfxGainNode);
    osc.start(t);
    osc.stop(t + 0.05);
  }

  // --- Background Synthwave Music Sequencer ---

  public startBgm() {
    if (this.isBgmPlaying) return;
    this.initContext();
    this.isBgmPlaying = true;
    this.bgmStep = 0;

    // 128 BPM -> 16th note = 60 / 128 / 4 = ~0.117s
    const stepDurationMs = 120;

    const bassNotes = [
      65.41, 65.41, 65.41, 73.42, 65.41, 65.41, 87.31, 77.78, // C2..
      65.41, 65.41, 65.41, 73.42, 65.41, 65.41, 98.00, 87.31,
    ];

    const arpHarmonies = [
      261.63, 0, 329.63, 0, 392.00, 0, 523.25, 392.00,
      329.63, 0, 261.63, 0, 392.00, 523.25, 659.25, 0
    ];

    this.bgmIntervalId = window.setInterval(() => {
      if (!this.ctx || !this.bgmGainNode || this.isBgmMuted) {
        this.bgmStep = (this.bgmStep + 1) % 16;
        return;
      }

      const t = this.ctx.currentTime;
      const step = this.bgmStep;

      // Kick drum on beats 0, 4, 8, 12
      if (step % 4 === 0) {
        const kickOsc = this.ctx.createOscillator();
        const kickGain = this.ctx.createGain();
        kickOsc.frequency.setValueAtTime(130, t);
        kickOsc.frequency.exponentialRampToValueAtTime(38, t + 0.09);
        kickGain.gain.setValueAtTime(0.45, t);
        kickGain.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
        kickOsc.connect(kickGain);
        kickGain.connect(this.bgmGainNode);
        kickOsc.start(t);
        kickOsc.stop(t + 0.11);
      }

      // Snare / clap on beats 4, 12
      if (step === 4 || step === 12) {
        const snareOsc = this.ctx.createOscillator();
        const snareGain = this.ctx.createGain();
        snareOsc.type = 'triangle';
        snareOsc.frequency.setValueAtTime(180, t);
        snareOsc.frequency.exponentialRampToValueAtTime(70, t + 0.08);
        snareGain.gain.setValueAtTime(0.25, t);
        snareGain.gain.exponentialRampToValueAtTime(0.01, t + 0.08);
        snareOsc.connect(snareGain);
        snareGain.connect(this.bgmGainNode);
        snareOsc.start(t);
        snareOsc.stop(t + 0.09);
      }

      // Hi-hat on every off-beat (2, 6, 10, 14)
      if (step % 2 === 1) {
        const hatOsc = this.ctx.createOscillator();
        const hatGain = this.ctx.createGain();
        hatOsc.type = 'square';
        hatOsc.frequency.setValueAtTime(7000, t);
        hatGain.gain.setValueAtTime(0.06, t);
        hatGain.gain.exponentialRampToValueAtTime(0.001, t + 0.04);
        hatOsc.connect(hatGain);
        hatGain.connect(this.bgmGainNode);
        hatOsc.start(t);
        hatOsc.stop(t + 0.05);
      }

      // Synth Bass
      const bassFreq = bassNotes[step % bassNotes.length];
      if (bassFreq) {
        const bassOsc = this.ctx.createOscillator();
        const bassFilter = this.ctx.createBiquadFilter();
        const bGain = this.ctx.createGain();

        bassOsc.type = 'sawtooth';
        bassOsc.frequency.setValueAtTime(bassFreq, t);

        bassFilter.type = 'lowpass';
        bassFilter.frequency.setValueAtTime(450, t);
        bassFilter.frequency.exponentialRampToValueAtTime(180, t + 0.1);

        bGain.gain.setValueAtTime(0.25, t);
        bGain.gain.exponentialRampToValueAtTime(0.01, t + 0.1);

        bassOsc.connect(bassFilter);
        bassFilter.connect(bGain);
        bGain.connect(this.bgmGainNode);

        bassOsc.start(t);
        bassOsc.stop(t + 0.11);
      }

      // Arpeggio Lead melody note
      const arpFreq = arpHarmonies[step % arpHarmonies.length];
      if (arpFreq > 0) {
        const arpOsc = this.ctx.createOscillator();
        const aGain = this.ctx.createGain();

        arpOsc.type = 'sine';
        arpOsc.frequency.setValueAtTime(arpFreq, t);

        aGain.gain.setValueAtTime(0.12, t);
        aGain.gain.exponentialRampToValueAtTime(0.001, t + 0.1);

        arpOsc.connect(aGain);
        aGain.connect(this.bgmGainNode);

        arpOsc.start(t);
        arpOsc.stop(t + 0.11);
      }

      this.bgmStep = (this.bgmStep + 1) % 16;
    }, stepDurationMs);
  }

  public stopBgm() {
    if (this.bgmIntervalId !== null) {
      clearInterval(this.bgmIntervalId);
      this.bgmIntervalId = null;
    }
    this.isBgmPlaying = false;
  }
}

export const soundManager = new SoundManager();
