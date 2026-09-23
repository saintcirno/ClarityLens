/**
 * Offline Browser-Native Text-to-Speech Engine
 * Zero cloud or API requirements. Runs purely on client system voices
 * with real-time word boundary tracking and accessible auditory feedback.
 */
class SpeechEngine {
  constructor() {
    this.synth = typeof window !== 'undefined' ? window.speechSynthesis : null;
    this.voices = [];
    this.currentUtterance = null;
    this.isPlaying = false;
    this.isPaused = false;
    this.rate = 1.0;
    this.pitch = 1.0;
    this.volume = 1.0;
    this.selectedVoice = null;

    this.onBoundaryCallback = null;
    this.onStateChangeCallback = null;

    this.initVoices();
  }

  initVoices() {
    if (!this.synth) return;

    const populate = () => {
      this.voices = this.synth.getVoices();
    };

    populate();
    if (this.synth.onvoiceschanged !== undefined) {
      this.synth.onvoiceschanged = populate;
    }
  }

  /**
   * Get all installed system voices
   * @param {string} langCode - Optional filter e.g. 'en', 'es', 'fr'
   */
  getVoices(langCode = null) {
    if (!this.voices || this.voices.length === 0) {
      if (this.synth) this.voices = this.synth.getVoices();
    }

    if (!langCode) return this.voices;

    const prefix = langCode.toLowerCase().split('-')[0];
    const filtered = this.voices.filter(v => v.lang.toLowerCase().startsWith(prefix));
    return filtered.length > 0 ? filtered : this.voices;
  }

  /**
   * Set speech parameters
   */
  setRate(rate) {
    this.rate = Math.max(0.5, Math.min(2.0, parseFloat(rate) || 1.0));
  }

  setPitch(pitch) {
    this.pitch = Math.max(0.5, Math.min(1.5, parseFloat(pitch) || 1.0));
  }

  setVolume(volume) {
    this.volume = Math.max(0, Math.min(1.0, parseFloat(volume) || 1.0));
  }

  setVoice(voiceURI) {
    const found = this.voices.find(v => v.voiceURI === voiceURI);
    if (found) {
      this.selectedVoice = found;
    }
  }

  /**
   * Register callbacks for speech state and word boundary
   */
  onBoundary(callback) {
    this.onBoundaryCallback = callback;
  }

  onStateChange(callback) {
    this.onStateChangeCallback = callback;
  }

  notifyState(state, details = {}) {
    if (typeof this.onStateChangeCallback === 'function') {
      this.onStateChangeCallback({ state, isPlaying: this.isPlaying, isPaused: this.isPaused, ...details });
    }
  }

  /**
   * Speak the given text with word-by-word tracking
   * @param {string} text
   * @param {string} lang - Optional target language code (e.g. 'es-ES')
   */
  speak(text, lang = 'en-US') {
    if (!this.synth) {
      alert('Speech synthesis is not supported on this browser.');
      return;
    }

    // Cancel any active speech
    this.stop();

    if (!text || text.trim().length === 0) return;

    const utterance = new SpeechSynthesisUtterance(text);
    this.currentUtterance = utterance;

    utterance.rate = this.rate;
    utterance.pitch = this.pitch;
    utterance.volume = this.volume;

    // Pick voice: either user-selected or best match for language
    if (this.selectedVoice && (this.selectedVoice.lang.startsWith(lang.split('-')[0]) || !lang)) {
      utterance.voice = this.selectedVoice;
    } else {
      const matchingVoices = this.getVoices(lang);
      if (matchingVoices.length > 0) {
        // Prefer local natural voices
        const localVoice = matchingVoices.find(v => v.localService) || matchingVoices[0];
        utterance.voice = localVoice;
      }
    }

    utterance.lang = lang;

    // Word boundary event for synchronized visual highlighting
    utterance.onboundary = (event) => {
      if (event.name === 'word' || typeof event.charIndex === 'number') {
        if (typeof this.onBoundaryCallback === 'function') {
          this.onBoundaryCallback({
            charIndex: event.charIndex,
            charLength: event.charLength || 5,
            elapsedTime: event.elapsedTime
          });
        }
      }
    };

    utterance.onstart = () => {
      this.isPlaying = true;
      this.isPaused = false;
      this.notifyState('start');
    };

    utterance.onend = () => {
      this.isPlaying = false;
      this.isPaused = false;
      this.notifyState('end');
      if (typeof this.onBoundaryCallback === 'function') {
        this.onBoundaryCallback({ charIndex: -1, charLength: 0 });
      }
    };

    utterance.onpause = () => {
      this.isPlaying = false;
      this.isPaused = true;
      this.notifyState('pause');
    };

    utterance.onresume = () => {
      this.isPlaying = true;
      this.isPaused = false;
      this.notifyState('resume');
    };

    utterance.onerror = (err) => {
      this.isPlaying = false;
      this.isPaused = false;
      this.notifyState('error', { error: err });
    };

    this.synth.speak(utterance);
  }

  pause() {
    if (this.synth && this.isPlaying) {
      this.synth.pause();
    }
  }

  resume() {
    if (this.synth && this.isPaused) {
      this.synth.resume();
    }
  }

  stop() {
    if (this.synth) {
      this.synth.cancel();
      this.isPlaying = false;
      this.isPaused = false;
      this.notifyState('stop');
      if (typeof this.onBoundaryCallback === 'function') {
        this.onBoundaryCallback({ charIndex: -1, charLength: 0 });
      }
    }
  }

  toggle(text, lang = 'en-US') {
    if (this.isPlaying) {
      this.pause();
    } else if (this.isPaused) {
      this.resume();
    } else {
      this.speak(text, lang);
    }
  }
}

export const speechEngine = new SpeechEngine();
