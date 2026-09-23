import translationDataset from '../data/translation-dataset.json' with { type: 'json' };

/**
 * Client-Side Dataset-Driven Translation Engine
 * Translates without any cloud or API requests.
 * Uses local parallel dictionary and phrase matrix dataset for English and Malayalam.
 */
class TranslationEngine {
  constructor() {
    this.dataset = translationDataset;
  }

  /**
   * Get supported target languages
   */
  getSupportedLanguages() {
    return this.dataset.languages || [];
  }

  /**
   * Translate text into target language purely using local dataset
   * @param {string} text
   * @param {string} targetLangCode - 'ml' (Malayalam) or 'en' (English)
   */
  async translate(text, targetLangCode = 'ml') {
    if (!text || text.trim().length === 0) {
      return {
        translatedText: '',
        targetLang: targetLangCode,
        translatedPhrasesCount: 0,
        translatedWordsCount: 0,
        coveragePercentage: 100
      };
    }

    let output = text;
    let phrasesCount = 0;
    let wordsCount = 0;
    let totalTokens = 0;

    const phrases = this.dataset.phrases || {};
    const words = this.dataset.words || {};

    // 1. Phrase translation: Match multi-word phrases and document expressions
    const sortedPhrases = Object.keys(phrases).sort((a, b) => b.length - a.length);
    for (const phraseKey of sortedPhrases) {
      const translations = phrases[phraseKey];
      if (translations && translations[targetLangCode]) {
        const regex = new RegExp(`\\b${this.escapeRegex(phraseKey)}\\b`, 'gi');
        if (regex.test(output)) {
          output = output.replace(regex, match => {
            phrasesCount++;
            return this.matchCase(match, translations[targetLangCode]);
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
      coveragePercentage: Math.min(100, coveragePercentage)
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
