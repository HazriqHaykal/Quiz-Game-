/**
 * Synthesized sound effects via the Web Audio API — no audio files, no licensing.
 * The AudioContext is created lazily on the first user gesture (browser autoplay rules).
 */

export type SoundName =
  | 'start'
  | 'tick'
  | 'warning'
  | 'timeUp'
  | 'clue'
  | 'correct'
  | 'incorrect'
  | 'score'
  | 'steal'
  | 'boss'
  | 'winner'
  | 'click'

type Wave = OscillatorType

interface Note {
  freq: number
  /** Start offset in seconds. */
  at: number
  dur: number
  wave?: Wave
  gain?: number
  /** Glide to this frequency over the note. */
  slideTo?: number
}

const PATTERNS: Record<SoundName, Note[]> = {
  click: [{ freq: 880, at: 0, dur: 0.04, wave: 'square', gain: 0.25 }],
  start: [
    { freq: 262, at: 0, dur: 0.12, wave: 'square' },
    { freq: 330, at: 0.1, dur: 0.12, wave: 'square' },
    { freq: 392, at: 0.2, dur: 0.12, wave: 'square' },
    { freq: 523, at: 0.3, dur: 0.35, wave: 'square' },
    { freq: 1046, at: 0.3, dur: 0.35, wave: 'triangle', gain: 0.4 },
  ],
  tick: [{ freq: 1200, at: 0, dur: 0.05, wave: 'square', gain: 0.3 }],
  warning: [
    { freq: 740, at: 0, dur: 0.12, wave: 'sawtooth', gain: 0.5 },
    { freq: 740, at: 0.16, dur: 0.12, wave: 'sawtooth', gain: 0.5 },
  ],
  timeUp: [
    { freq: 440, at: 0, dur: 0.6, wave: 'sawtooth', slideTo: 80 },
    { freq: 220, at: 0, dur: 0.6, wave: 'square', gain: 0.4, slideTo: 55 },
  ],
  clue: [
    { freq: 600, at: 0, dur: 0.08, wave: 'triangle' },
    { freq: 900, at: 0.07, dur: 0.08, wave: 'triangle' },
    { freq: 1350, at: 0.14, dur: 0.2, wave: 'triangle' },
  ],
  correct: [
    { freq: 523, at: 0, dur: 0.1, wave: 'square' },
    { freq: 659, at: 0.09, dur: 0.1, wave: 'square' },
    { freq: 784, at: 0.18, dur: 0.1, wave: 'square' },
    { freq: 1046, at: 0.27, dur: 0.3, wave: 'square' },
  ],
  incorrect: [
    { freq: 196, at: 0, dur: 0.25, wave: 'sawtooth' },
    { freq: 147, at: 0.22, dur: 0.45, wave: 'sawtooth', slideTo: 110 },
  ],
  score: [
    { freq: 988, at: 0, dur: 0.06, wave: 'square', gain: 0.4 },
    { freq: 1319, at: 0.06, dur: 0.14, wave: 'square', gain: 0.4 },
  ],
  steal: [
    { freq: 300, at: 0, dur: 0.25, wave: 'sawtooth', slideTo: 1200 },
    { freq: 1200, at: 0.25, dur: 0.15, wave: 'square', gain: 0.4 },
  ],
  boss: [
    { freq: 55, at: 0, dur: 1.2, wave: 'sawtooth', gain: 0.9 },
    { freq: 82, at: 0, dur: 1.2, wave: 'square', gain: 0.4 },
    { freq: 110, at: 0.4, dur: 0.15, wave: 'square' },
    { freq: 104, at: 0.6, dur: 0.15, wave: 'square' },
    { freq: 98, at: 0.8, dur: 0.5, wave: 'square' },
  ],
  winner: [
    { freq: 523, at: 0, dur: 0.15, wave: 'square' },
    { freq: 523, at: 0.15, dur: 0.15, wave: 'square' },
    { freq: 523, at: 0.3, dur: 0.15, wave: 'square' },
    { freq: 698, at: 0.45, dur: 0.5, wave: 'square' },
    { freq: 784, at: 0.95, dur: 0.15, wave: 'square' },
    { freq: 698, at: 1.1, dur: 0.15, wave: 'square' },
    { freq: 1046, at: 1.25, dur: 0.8, wave: 'square' },
    { freq: 523, at: 1.25, dur: 0.8, wave: 'triangle', gain: 0.5 },
  ],
}

class SoundEngine {
  private ctx: AudioContext | null = null
  private master: GainNode | null = null
  enabled = true
  volume = 0.6

  /** Must be called from a user gesture before sounds can play. */
  unlock(): void {
    if (typeof window === 'undefined') return
    try {
      if (!this.ctx) {
        const Ctor =
          window.AudioContext ??
          (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
        if (!Ctor) return
        this.ctx = new Ctor()
        this.master = this.ctx.createGain()
        this.master.connect(this.ctx.destination)
      }
      if (this.ctx.state === 'suspended') void this.ctx.resume()
      this.applyVolume()
    } catch {
      this.ctx = null
    }
  }

  configure(enabled: boolean, volume: number): void {
    this.enabled = enabled
    this.volume = volume
    this.applyVolume()
  }

  private applyVolume(): void {
    if (this.master && this.ctx) this.master.gain.setValueAtTime(this.volume * 0.35, this.ctx.currentTime)
  }

  play(name: SoundName): void {
    if (!this.enabled || this.volume <= 0 || !this.ctx || !this.master) return
    if (this.ctx.state !== 'running') return
    const t0 = this.ctx.currentTime + 0.01
    for (const n of PATTERNS[name]) {
      const osc = this.ctx.createOscillator()
      const g = this.ctx.createGain()
      osc.type = n.wave ?? 'square'
      osc.frequency.setValueAtTime(n.freq, t0 + n.at)
      if (n.slideTo) osc.frequency.exponentialRampToValueAtTime(n.slideTo, t0 + n.at + n.dur)
      const peak = n.gain ?? 0.6
      g.gain.setValueAtTime(0.0001, t0 + n.at)
      g.gain.exponentialRampToValueAtTime(peak, t0 + n.at + 0.01)
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + n.at + n.dur)
      osc.connect(g).connect(this.master)
      osc.start(t0 + n.at)
      osc.stop(t0 + n.at + n.dur + 0.02)
    }
  }
}

export const sound = new SoundEngine()
