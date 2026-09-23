import * as pdfjsLib from 'pdfjs-dist/build/pdf.mjs';

// Configure worker for browser environment
if (typeof window !== 'undefined' && pdfjsLib.GlobalWorkerOptions) {
  try {
    pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
      'pdfjs-dist/build/pdf.worker.mjs',
      import.meta.url
    ).href;
  } catch (err) {
    console.warn('Could not initialize PDF worker via URL, fallback to local bundle', err);
  }
}

/**
 * Client-Side Zero-API PDF Document Processing Engine
 * Extracts text content directly from PDF pages and renders pages to canvas
 * for preview and OCR when dealing with scanned PDF documents.
 */
export class PDFEngine {
  constructor() {
    this.currentPdf = null;
    this.totalPages = 0;
  }

  /**
   * Load PDF from File, Blob, or ArrayBuffer
   * @param {File|Blob|ArrayBuffer} input
   * @returns {Promise<any>} pdfjs document instance
   */
  async loadPdf(input) {
    let arrayBuffer;
    if (input instanceof ArrayBuffer) {
      arrayBuffer = input;
    } else if (input instanceof Uint8Array) {
      arrayBuffer = input.buffer;
    } else if (input && typeof input.arrayBuffer === 'function') {
      arrayBuffer = await input.arrayBuffer();
    } else {
      throw new Error('Invalid PDF input source.');
    }

    const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer) });
    const pdf = await loadingTask.promise;
    this.currentPdf = pdf;
    this.totalPages = pdf.numPages;
    return pdf;
  }

  /**
   * Extract all embedded text from every page of the PDF
   * @param {any} pdfDoc - pdfjs document (defaults to currentPdf)
   * @param {Function} onProgress - Callback ({ current, total, percent })
   * @returns {Promise<{ fullText: string, pageTexts: string[], hasEmbeddedText: boolean }>}
   */
  async extractText(pdfDoc = null, onProgress = null) {
    const doc = pdfDoc || this.currentPdf;
    if (!doc) throw new Error('No PDF document loaded.');

    const pageTexts = [];
    let combinedText = '';

    for (let pageNum = 1; pageNum <= doc.numPages; pageNum++) {
      const page = await doc.getPage(pageNum);
      const textContent = await page.getTextContent();
      
      let lastY = null;
      let pageStr = '';

      for (const item of textContent.items) {
        if (!item.str) continue;

        // Add line break if vertical position changed significantly
        if (lastY !== null && Math.abs(item.transform[5] - lastY) > 8) {
          pageStr += '\n';
        } else if (pageStr.length > 0 && !pageStr.endsWith(' ') && !pageStr.endsWith('\n')) {
          pageStr += ' ';
        }

        pageStr += item.str;
        lastY = item.transform[5];
      }

      const cleanPageStr = pageStr.trim();
      pageTexts.push(cleanPageStr);
      combinedText += (combinedText ? '\n\n' : '') + cleanPageStr;

      if (onProgress && typeof onProgress === 'function') {
        onProgress({
          current: pageNum,
          total: doc.numPages,
          percent: Math.round((pageNum / doc.numPages) * 100)
        });
      }
    }

    const hasEmbeddedText = combinedText.trim().length > 30;

    return {
      fullText: combinedText.trim(),
      pageTexts,
      hasEmbeddedText
    };
  }

  /**
   * Render a specific PDF page to an HTML5 canvas
   * @param {number} pageNumber - 1-based page index
   * @param {number} scale - rendering resolution multiplier
   * @param {any} pdfDoc
   * @returns {Promise<HTMLCanvasElement>}
   */
  async renderPageToCanvas(pageNumber = 1, scale = 1.75, pdfDoc = null) {
    const doc = pdfDoc || this.currentPdf;
    if (!doc) throw new Error('No PDF document loaded.');

    const page = await doc.getPage(pageNumber);
    const viewport = page.getViewport({ scale });

    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    canvas.width = viewport.width;
    canvas.height = viewport.height;

    await page.render({
      canvasContext: context,
      viewport
    }).promise;

    return canvas;
  }
}

export const pdfEngine = new PDFEngine();
