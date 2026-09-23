/**
 * Accessibility & Dyslexia Visual Suite
 * Features:
 * - Dyslexia Typography (Lexend, Atkinson Hyperlegible, OpenDyslexic)
 * - Dyslexia Spacing & Contrast Mode (.dyslexic-mode-active)
 * - Bionic Reading (visual fixation bolding)
 * - Syllable Separation
 * - Reading Ruler / Focus Guide
 * - Irlen Syndrome Color Filters & High-Contrast Modes
 */

export class AccessibilityUI {
  constructor() {
    this.readingRulerActive = false;
    this.rulerElement = null;
    this.bionicActive = false;
    this.syllablesActive = false;
    this.dyslexicModeActive = false;
    this.currentFont = 'lexend';
    this.initRuler();
  }

  initRuler() {
    let ruler = document.getElementById('reading-ruler-overlay');
    if (!ruler) {
      ruler = document.createElement('div');
      ruler.id = 'reading-ruler-overlay';
      ruler.className = 'reading-ruler-guide hidden';
      document.body.appendChild(ruler);
    }
    this.rulerElement = ruler;

    window.addEventListener('mousemove', (e) => {
      if (this.readingRulerActive && this.rulerElement) {
        this.rulerElement.style.top = `${e.clientY - 25}px`;
      }
    });
  }

  toggleReadingRuler(force = null) {
    this.readingRulerActive = force !== null ? force : !this.readingRulerActive;
    if (this.rulerElement) {
      if (this.readingRulerActive) {
        this.rulerElement.classList.remove('hidden');
      } else {
        this.rulerElement.classList.add('hidden');
      }
    }
    return this.readingRulerActive;
  }

  /**
   * Move ruler to specific element or word during speech playback
   */
  moveRulerToElement(element) {
    if (!this.readingRulerActive || !this.rulerElement || !element) return;
    const rect = element.getBoundingClientRect();
    this.rulerElement.style.top = `${rect.top - 10}px`;
    this.rulerElement.style.height = `${rect.height + 20}px`;
  }

  /**
   * Apply Bionic Reading fixation bolding to raw text
   * Bolds the first 40% - 50% of each word
   * @param {string} text
   * @returns {string} HTML string with <strong> tags
   */
  toBionicHtml(text) {
    if (!text) return '';

    return text.replace(/([a-zA-Z0-9]+)/g, (match) => {
      const len = match.length;
      let boldLen = 1;
      if (len > 3) {
        boldLen = Math.ceil(len * 0.45);
      }
      const boldPart = match.slice(0, boldLen);
      const restPart = match.slice(boldLen);
      return `<strong>${boldPart}</strong>${restPart}`;
    }).replace(/\n/g, '<br>');
  }

  /**
   * Separate syllables with subtle middle dots
   */
  toSyllableHtml(text) {
    if (!text) return '';

    return text.replace(/\b([a-zA-Z]{4,})\b/g, (match) => {
      return match.replace(/([aeiouy]{1,2})([^aeiouy\s]{1,2})(?=[aeiouy])/gi, '$1·$2');
    }).replace(/\n/g, '<br>');
  }

  /**
   * Set color theme / contrast mode
   */
  setTheme(theme) {
    const root = document.documentElement;
    root.classList.remove(
      'theme-m3-light',
      'theme-m3-dark',
      'theme-high-contrast-oled',
      'theme-yellow-on-black',
      'theme-irlen-cream',
      'theme-irlen-mint',
      'theme-irlen-peach',
      'theme-irlen-blue'
    );
    root.classList.add(`theme-${theme}`);
    localStorage.setItem('clarity-theme', theme);
  }

  /**
   * Set Dyslexic font family ('lexend', 'atkinson', 'opendyslexic', 'system')
   */
  setFontFamily(fontKey) {
    const root = document.documentElement;
    root.classList.remove('font-lexend', 'font-atkinson', 'font-opendyslexic', 'font-system');
    root.classList.add(`font-${fontKey}`);
    this.currentFont = fontKey;
    localStorage.setItem('clarity-font-family', fontKey);
  }

  /**
   * Toggle Dyslexic Mode (Enhanced letter spacing, word spacing, and line height)
   */
  toggleDyslexicMode(force = null) {
    this.dyslexicModeActive = force !== null ? force : !this.dyslexicModeActive;
    if (this.dyslexicModeActive) {
      document.documentElement.classList.add('dyslexic-mode-active');
    } else {
      document.documentElement.classList.remove('dyslexic-mode-active');
    }
    localStorage.setItem('clarity-dyslexic-mode', this.dyslexicModeActive ? '1' : '0');
    return this.dyslexicModeActive;
  }

  /**
   * Set typography scale
   */
  setTextSize(sizePx) {
    document.documentElement.style.setProperty('--reader-font-size', `${sizePx}px`);
    localStorage.setItem('clarity-font-size', sizePx);
  }

  setLineHeight(height) {
    document.documentElement.style.setProperty('--reader-line-height', height);
    localStorage.setItem('clarity-line-height', height);
  }

  setLetterSpacing(spacingEm) {
    document.documentElement.style.setProperty('--reader-letter-spacing', `${spacingEm}em`);
    localStorage.setItem('clarity-letter-spacing', spacingEm);
  }
}

export const accessibilityUI = new AccessibilityUI();
