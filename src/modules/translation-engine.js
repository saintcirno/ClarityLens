import { setupI18n } from '@lingui/core';
import translationDataset from '../data/translation-dataset.json' with { type: 'json' };
import enMessages from '../locales/en.js';
import mlMessages from '../locales/ml.js';

/**
 * LinguiJS-Powered Client-Side Translation & Locale Engine
 * Manages target language state, Lingui message catalogs, and local translation matrix.
 */
export class TranslationEngine {
  constructor() {
    this.dataset = translationDataset;

    // Initialize LinguiJS i18n instance with English and Malayalam catalogs
    this.i18n = setupI18n({
      locale: 'ml',
      messages: {
        en: enMessages,
        ml: mlMessages
      }
    });

    this.activeLocale = 'ml';
  }

  /**
   * Set and activate target language using LinguiJS
   * @param {string} langCode - 'ml' or 'en'
   */
  setTargetLanguage(langCode = 'ml') {
    const supported = this.getSupportedLanguages().some(l => l.code === langCode);
    const target = supported ? langCode : 'ml';
    this.activeLocale = target;
    this.i18n.activate(target);
    return target;
  }

  /**
   * Get currently active target language
   */
  getTargetLanguage() {
    return this.i18n.locale || this.activeLocale;
  }

  /**
   * Get supported target languages
   */
  getSupportedLanguages() {
    return this.dataset.languages || [];
  }

  /**
   * Translate a UI or phrase key directly using LinguiJS message catalog
   * @param {string} id - Message ID or phrase
   * @param {Object} values - Interpolation values
   */
  t(id, values = {}) {
    return this.i18n._(id, values);
  }

  /**
   * Translate text into target language using LinguiJS catalog + local matrix
   * @param {string} text
   * @param {string} targetLangCode - 'ml' (Malayalam) or 'en' (English)
   */
  async translate(text, targetLangCode = 'ml') {
    this.setTargetLanguage(targetLangCode);

    if (!text || text.trim().length === 0) {
      return {
        translatedText: '',
        targetLang: targetLangCode,
        translatedPhrasesCount: 0,
        translatedWordsCount: 0,
        coveragePercentage: 100,
        engine: 'LinguiJS + Local Matrix'
      };
    }

    let output = text;
    let phrasesCount = 0;
    let wordsCount = 0;
    let totalTokens = 0;

    const phrases = this.dataset.phrases || {};
    const words = this.dataset.words || {};

    // 1. LinguiJS & Phrase translation: Match multi-word phrases and catalog expressions
    const sortedPhrases = Object.keys(phrases).sort((a, b) => b.length - a.length);
    for (const phraseKey of sortedPhrases) {
      // Check Lingui catalog first, then fallback to dataset
      const catalogTranslation = this.i18n._(phraseKey);
      const datasetTranslation = phrases[phraseKey] ? phrases[phraseKey][targetLangCode] : null;
      const translatedPhrase = (catalogTranslation && catalogTranslation !== phraseKey)
        ? catalogTranslation
        : datasetTranslation;

      if (translatedPhrase) {
        const regex = new RegExp(`\\b${this.escapeRegex(phraseKey)}\\b`, 'gi');
        if (regex.test(output)) {
          output = output.replace(regex, match => {
            phrasesCount++;
            return this.matchCase(match, translatedPhrase);
          });
        }
      }
    }

    // 2. Tokenize remaining words and match against translation dictionary
    const tokens = output.split(/([a-zA-Z0-9'-]+|[\s\p{P}]+)/u).filter(Boolean);
    const translatedTokens = [];

    for (const token of tokens) {
      const cleanWord = token.toLowerCase().trim();
      const isWord = /^[a-zA-Z0-9'-]+$/.test(cleanWord);

      if (isWord) {
        totalTokens++;
        if (words[cleanWord] && words[cleanWord][targetLangCode]) {
          wordsCount++;
          const targetTranslation = words[cleanWord][targetLangCode];
          translatedTokens.push(this.matchCase(token, targetTranslation));
        } else {
          // Check without common plural/verb suffixes
          const singular = cleanWord.replace(/(?:s|es|ed|ing)$/, '');
          if (singular !== cleanWord && words[singular] && words[singular][targetLangCode]) {
            wordsCount++;
            translatedTokens.push(this.matchCase(token, words[singular][targetLangCode]));
          } else {
            translatedTokens.push(token);
          }
        }
      } else {
        translatedTokens.push(token);
      }
    }

    const finalTranslatedText = translatedTokens.join('');
    const coveragePercentage = totalTokens > 0
      ? Math.round(((wordsCount + phrasesCount * 2) / totalTokens) * 100)
      : 100;

    return {
      translatedText: finalTranslatedText,
      targetLang: targetLangCode,
      translatedPhrasesCount: phrasesCount,
      translatedWordsCount: wordsCount,
      coveragePercentage: Math.min(100, coveragePercentage),
      engine: 'LinguiJS + Local Matrix'
    };
  }

  matchCase(source, replacement) {
    if (source === source.toUpperCase()) {
      return replacement.toUpperCase();
    }
    if (source[0] === source[0].toUpperCase()) {
      return replacement.charAt(0).toUpperCase() + replacement.slice(1);
    }
    return replacement.toLowerCase();
  }

  escapeRegex(str) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
}

export const translationEngine = new TranslationEngine();
export const i18n = translationEngine.i18n;
