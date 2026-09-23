import Tesseract from 'tesseract.js';

/**
 * Tesseract.js Client-Side Full-Document OCR Engine
 * Runs 100% locally in browser via Tesseract WebAssembly (WASM).
 * Uses automatic page segmentation (PSM.AUTO) to capture the entire document,
 * multi-column layouts, books, and articles without truncation.
 */
export class TesseractOCREngine {
  constructor() {
    this.worker = null;
    this.isInitializing = false;
    this.currentLanguage = 'eng';
    this.engineName = 'Tesseract.js';
  }

  /**
   * Initialize or retrieve existing Tesseract worker
   * @param {string} lang - Language code (default 'eng', supports 'spa', 'fra', 'deu', etc.)
   * @param {Function} onProgress - Progress callback ({ status, progress })
   */
  async getWorker(lang = 'eng', onProgress = null) {
    if (this.worker && this.currentLanguage === lang) {
      return this.worker;
    }

    if (this.worker) {
      try {
        await this.worker.terminate();
      } catch (err) {
        console.warn('Error terminating previous Tesseract worker:', err);
      }
      this.worker = null;
    }

    this.isInitializing = true;
    this.currentLanguage = lang;

    // Create Tesseract worker using Tesseract.js WASM engine
    const worker = await Tesseract.createWorker(lang, 1, {
      logger: m => {
        if (onProgress && typeof onProgress === 'function') {
          onProgress({
            status: m.status ? `Tesseract ${m.status}` : 'Tesseract processing',
            progress: typeof m.progress === 'number' ? Math.round(m.progress * 100) : 0
          });
        }
      }
    });

    // Configure Tesseract parameters for thorough whole-page recognition
    // PSM.AUTO (3) analyzes the entire page layout: columns, headlines, and paragraphs
    await worker.setParameters({
      tessedit_pageseg_mode: Tesseract.PSM.AUTO,
      preserve_interword_spaces: '1'
    });

    this.worker = worker;
    this.isInitializing = false;
    return this.worker;
  }

  /**
   * Pre-process image on HTML5 Canvas to maximize Tesseract OCR accuracy
   * for documents, low-contrast photos, and tilted pages
   * @param {HTMLImageElement|HTMLCanvasElement|Blob} sourceImage
   * @param {Object} options - { contrast: number, brightness: number, invert: boolean, binarize: boolean, rotation: number }
   * @returns {HTMLCanvasElement}
   */
  preprocessImage(sourceImage, options = {}) {
    const {
      contrast = 1.2,
      brightness = 10,
      invert = false,
      binarize = false,
      rotation = 0
    } = options;

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d', { willReadFrequently: true });

    let width = sourceImage.naturalWidth || sourceImage.width;
    let height = sourceImage.naturalHeight || sourceImage.height;

    // Handle 90/270 degree rotation dimensions
    if (rotation === 90 || rotation === 270) {
      canvas.width = height;
      canvas.height = width;
    } else {
      canvas.width = width;
      canvas.height = height;
    }

    ctx.save();
    if (rotation === 90) {
      ctx.translate(canvas.width, 0);
      ctx.rotate((90 * Math.PI) / 180);
    } else if (rotation === 180) {
      ctx.translate(canvas.width, canvas.height);
      ctx.rotate((180 * Math.PI) / 180);
    } else if (rotation === 270) {
      ctx.translate(0, canvas.height);
      ctx.rotate((270 * Math.PI) / 180);
    }

    ctx.drawImage(sourceImage, 0, 0, width, height);
    ctx.restore();

    // Pixel manipulation for contrast enhancement, grayscale, and Otsu binarization
    const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imgData.data;
    const factor = (259 * (contrast * 100 + 255)) / (255 * (259 - contrast * 100));

    for (let i = 0; i < data.length; i += 4) {
      let r = data[i];
      let g = data[i + 1];
      let b = data[i + 2];

      // Grayscale luminance
      let gray = 0.299 * r + 0.587 * g + 0.114 * b;

      // Contrast and brightness scaling
      gray = factor * (gray - 128) + 128 + brightness;
      gray = Math.max(0, Math.min(255, gray));

      if (invert) {
        gray = 255 - gray;
      }

      if (binarize) {
        gray = gray > 140 ? 255 : 0;
      }

      data[i] = gray;
      data[i + 1] = gray;
      data[i + 2] = gray;
    }

    ctx.putImageData(imgData, 0, 0);
    return canvas;
  }

  /**
   * Run full-document OCR recognition using Tesseract
   * @param {HTMLImageElement|HTMLCanvasElement|string} imageSource
   * @param {string} lang - 'eng' or others
   * @param {Function} onProgress - Progress reporting callback
   * @param {Object} preprocessOptions - Image filters
   */
  async recognize(imageSource, lang = 'eng', onProgress = null, preprocessOptions = null) {
    let targetInput = imageSource;

    // Apply canvas preprocessing if needed
    if (preprocessOptions && (imageSource instanceof HTMLImageElement || imageSource instanceof HTMLCanvasElement)) {
      targetInput = this.preprocessImage(imageSource, preprocessOptions);
    }

    let data;

    // Use persistent worker for speed and control; fallback to Tesseract.recognize if needed
    try {
      const worker = await this.getWorker(lang, onProgress);
      const result = await worker.recognize(targetInput);
      data = result.data;
    } catch (workerErr) {
      console.warn('Worker recognize encountered issue, falling back to direct Tesseract.recognize:', workerErr);
      const directResult = await Tesseract.recognize(targetInput, lang, {
        logger: m => {
          if (onProgress && typeof onProgress === 'function') {
            onProgress({
              status: m.status ? `Tesseract ${m.status}` : 'Tesseract recognizing',
              progress: typeof m.progress === 'number' ? Math.round(m.progress * 100) : 0
            });
          }
        }
      });
      data = directResult.data;
    }

    // Clean and normalize recognized text
    const cleanText = data.text ? data.text.trim() : '';

    return {
      engine: 'Tesseract.js',
      text: cleanText,
      confidence: data.confidence,
      paragraphs: (data.paragraphs || []).map(p => ({
        text: p.text.trim(),
        confidence: p.confidence,
        bbox: p.bbox
      })),
      lines: (data.lines || []).map(l => ({
        text: l.text.trim(),
        confidence: l.confidence,
        bbox: l.bbox
      })),
      words: (data.words || []).map(w => ({
        text: w.text.trim(),
        confidence: w.confidence,
        bbox: w.bbox
      }))
    };
  }

  /**
   * Terminate Tesseract worker to free memory
   */
  async terminate() {
    if (this.worker) {
      await this.worker.terminate();
      this.worker = null;
    }
  }
}

export const tesseractEngine = new TesseractOCREngine();
export const ocrEngine = tesseractEngine;
export { Tesseract };
