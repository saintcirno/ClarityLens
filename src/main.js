import { ocrEngine } from './modules/ocr-engine.js';
import { translationEngine } from './modules/translation-engine.js';
import { speechEngine } from './modules/speech-engine.js';
import { accessibilityUI } from './modules/accessibility-ui.js';
import { CameraEngine } from './modules/camera-engine.js';
import { pdfEngine } from './modules/pdf-engine.js';

// ============================================================================
// Application State
// ============================================================================
const state = {
  currentImage: null, // HTMLImageElement or Canvas
  currentPdf: null,
  currentPdfPage: 1,
  totalPdfPages: 0,
  pdfPageTexts: [],
  currentRotation: 0,
  preprocessOptions: {
    contrast: 1.2,
    brightness: 8,
    invert: false,
    binarize: false,
    rotation: 0
  },
  rawOcrText: '',
  ocrConfidence: null,
  ocrLinesCount: 0,
  ocrWordsCount: 0,
  translatedResult: null,
  activeTab: 'translated', // 'translated' | 'original'
  bionicActive: false,
  syllablesActive: false,
  selectedLanguage: 'ml',
  currentFontSize: 18,
  renderedWords: []
};

// ============================================================================
// DOM References
// ============================================================================
const dropzone = document.getElementById('dropzone');
const fileInput = document.getElementById('file-input');
const btnBrowse = document.getElementById('btn-browse');
const btnCamera = document.getElementById('btn-camera');
const btnPaste = document.getElementById('btn-paste');
const btnToggleTextInput = document.getElementById('btn-toggle-text-input');
const directTextWrapper = document.getElementById('direct-text-wrapper');
const directTextInput = document.getElementById('direct-text-input');
const btnProcessDirectText = document.getElementById('btn-process-direct-text');

const previewContainer = document.getElementById('preview-container');
const imagePreview = document.getElementById('image-preview');
const pdfPaginationBar = document.getElementById('pdf-pagination-bar');
const btnPdfPrev = document.getElementById('btn-pdf-prev');
const btnPdfNext = document.getElementById('btn-pdf-next');
const pdfPageIndicator = document.getElementById('pdf-page-indicator');
const btnEnhanceContrast = document.getElementById('btn-enhance-contrast');
const btnBinarize = document.getElementById('btn-binarize');
const btnRotate = document.getElementById('btn-rotate');
const btnClearImage = document.getElementById('btn-clear-image');
const btnRunOcr = document.getElementById('btn-run-ocr');
const ocrLangSelect = document.getElementById('ocr-lang-select');

const ocrProgressContainer = document.getElementById('ocr-progress-container');
const ocrStatusText = document.getElementById('ocr-status-text');
const ocrPercentText = document.getElementById('ocr-percent-text');
const ocrProgressFill = document.getElementById('ocr-progress-fill');

// Tesseract OCR Confidence Score Elements
const ocrStatsCard = document.getElementById('ocr-stats-card');
const ocrConfidenceBadge = document.getElementById('ocr-confidence-badge');
const ocrConfidenceMeter = document.getElementById('ocr-confidence-meter');
const ocrConfidenceMeterFill = document.getElementById('ocr-confidence-meter-fill');
const ocrConfidenceValue = document.getElementById('ocr-confidence-value');
const ocrStatLines = document.getElementById('ocr-stat-lines');
const ocrStatWords = document.getElementById('ocr-stat-words');
const ocrStatQuality = document.getElementById('ocr-stat-quality');

const readerDisplay = document.getElementById('reader-display');
const tabTranslated = document.getElementById('tab-translated');
const tabOriginal = document.getElementById('tab-original');
const translationBar = document.getElementById('translation-bar');
const targetLangSelect = document.getElementById('target-lang-select');
const translationCoverage = document.getElementById('translation-coverage');

// OCR Meta Banner in Reader Display
const ocrMetaBanner = document.getElementById('ocr-meta-banner');
const ocrMetaConfidence = document.getElementById('ocr-meta-confidence');
const ocrMetaTierBadge = document.getElementById('ocr-meta-tier-badge');
const ocrMetaDetails = document.getElementById('ocr-meta-details');

const btnToggleBionic = document.getElementById('btn-toggle-bionic');
const btnToggleSyllables = document.getElementById('btn-toggle-syllables');
const btnCopyText = document.getElementById('btn-copy-text');

const btnAudioPlay = document.getElementById('btn-audio-play');
const audioPlayIcon = document.getElementById('audio-play-icon');
const audioPlayLabel = document.getElementById('audio-play-label');
const btnAudioStop = document.getElementById('btn-audio-stop');
const voiceSelect = document.getElementById('voice-select');
const speedSlider = document.getElementById('speed-slider');
const speedVal = document.getElementById('speed-val');
const pitchSlider = document.getElementById('pitch-slider');

const btnFontDecrease = document.getElementById('btn-font-decrease');
const btnFontIncrease = document.getElementById('btn-font-increase');
const fontSizeIndicator = document.getElementById('font-size-indicator');
const lineHeightSelect = document.getElementById('line-height-select');

const themeSelector = document.getElementById('theme-selector');
const fontFamilySelect = document.getElementById('font-family-select');
const toggleDyslexicMode = document.getElementById('toggle-dyslexic-mode');
const toggleReadingRuler = document.getElementById('toggle-reading-ruler');

const cameraModal = document.getElementById('camera-modal');
const cameraVideo = document.getElementById('camera-video');
const btnCloseCamera = document.getElementById('btn-close-camera');
const btnFlipCamera = document.getElementById('btn-flip-camera');
const btnSnapPhoto = document.getElementById('btn-snap-photo');
const snackbar = document.getElementById('snackbar');
const srAnnouncements = document.getElementById('sr-announcements');

let cameraEngine = null;

// ============================================================================
// Notifications & Screen Reader Helper
// ============================================================================
function showToast(message, duration = 3000) {
  snackbar.textContent = message;
  snackbar.classList.add('visible');
  if (srAnnouncements) srAnnouncements.textContent = message;

  setTimeout(() => {
    snackbar.classList.remove('visible');
  }, duration);
}

// ============================================================================
// Initialization & Voice Enumeration
// ============================================================================
function init() {
  populateLanguages();
  populateVoices();

  if (speechSynthesis.onvoiceschanged !== undefined) {
    speechSynthesis.onvoiceschanged = populateVoices;
  }

  // Restore saved preferences
  const savedTheme = localStorage.getItem('clarity-theme') || 'm3-light';
  themeSelector.value = savedTheme;
  accessibilityUI.setTheme(savedTheme);

  const savedFontFamily = localStorage.getItem('clarity-font-family') || 'lexend';
  fontFamilySelect.value = savedFontFamily;
  accessibilityUI.setFontFamily(savedFontFamily);

  const savedDyslexicMode = localStorage.getItem('clarity-dyslexic-mode') === '1';
  if (savedDyslexicMode) {
    accessibilityUI.toggleDyslexicMode(true);
    toggleDyslexicMode.classList.add('active');
  }

  const savedFontSize = parseInt(localStorage.getItem('clarity-font-size'), 10) || 18;
  state.currentFontSize = savedFontSize;
  accessibilityUI.setTextSize(savedFontSize);
  fontSizeIndicator.textContent = `${savedFontSize}px`;

  const savedLineHeight = localStorage.getItem('clarity-line-height') || '1.7';
  lineHeightSelect.value = savedLineHeight;
  accessibilityUI.setLineHeight(savedLineHeight);

  // Setup camera engine
  cameraEngine = new CameraEngine(cameraVideo);

  // Setup speech boundary listener for word-by-word tracking
  setupSpeechTracking();
}

function populateLanguages() {
  const languages = translationEngine.getSupportedLanguages();
  targetLangSelect.innerHTML = languages.map(lang =>
    `<option value="${lang.code}">${lang.flag} ${lang.name} (${lang.nativeName})</option>`
  ).join('');

  targetLangSelect.value = state.selectedLanguage;
}

function populateVoices() {
  const activeLang = state.activeTab === 'translated' ? state.selectedLanguage : 'en';
  const voices = speechEngine.getVoices(activeLang);

  if (!voices || voices.length === 0) return;

  voiceSelect.innerHTML = voices.map(v =>
    `<option value="${v.voiceURI}">${v.name} (${v.lang})</option>`
  ).join('');
}

// ============================================================================
// Speech Engine Boundary Tracking (Visual Word-by-Word Glow)
// ============================================================================
function setupSpeechTracking() {
  speechEngine.onBoundary(({ charIndex }) => {
    if (charIndex === -1) {
      clearWordHighlights();
      return;
    }

    highlightWordAtCharIndex(charIndex);
  });

  speechEngine.onStateChange(({ state: speechState, isPlaying, isPaused }) => {
    if (isPlaying) {
      audioPlayIcon.textContent = '⏸️';
      audioPlayLabel.textContent = 'Pause';
      btnAudioPlay.classList.add('m3-btn-tonal');
      btnAudioPlay.classList.remove('m3-btn-filled');
    } else if (isPaused) {
      audioPlayIcon.textContent = '▶️';
      audioPlayLabel.textContent = 'Resume';
      btnAudioPlay.classList.remove('m3-btn-tonal');
      btnAudioPlay.classList.add('m3-btn-filled');
    } else {
      audioPlayIcon.textContent = '▶️';
      audioPlayLabel.textContent = 'Play Audio';
      btnAudioPlay.classList.remove('m3-btn-tonal');
      btnAudioPlay.classList.add('m3-btn-filled');
      clearWordHighlights();
    }
  });
}

function clearWordHighlights() {
  const activeWords = readerDisplay.querySelectorAll('.word-active-spoken');
  activeWords.forEach(el => el.classList.remove('word-active-spoken'));
}

function highlightWordAtCharIndex(charIndex) {
  clearWordHighlights();

  for (const item of state.renderedWords) {
    if (charIndex >= item.startIndex && charIndex < item.endIndex) {
      const el = document.getElementById(item.id);
      if (el) {
        el.classList.add('word-active-spoken');
        el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        accessibilityUI.moveRulerToElement(el);
      }
      break;
    }
  }
}

// ============================================================================
// Image & PDF File Handling & Preprocessing
// ============================================================================
async function loadFile(file) {
  if (!file) return;

  const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
  const isImage = file.type.startsWith('image/');

  if (!isPdf && !isImage) {
    showToast('Please select a valid image or PDF document.');
    return;
  }

  if (isPdf) {
    await loadPdfDocument(file);
  } else {
    loadImageFromFile(file);
  }
}

async function loadPdfDocument(file) {
  showToast(`Loading PDF document: ${file.name}...`);
  resetOcrStats();
  try {
    const pdfDoc = await pdfEngine.loadPdf(file);
    state.currentPdf = pdfDoc;
    state.totalPdfPages = pdfDoc.numPages;
    state.currentPdfPage = 1;

    // Render page 1 to canvas for preview
    const canvas = await pdfEngine.renderPageToCanvas(1, 1.75, pdfDoc);
    state.currentImage = canvas;
    state.currentRotation = 0;
    state.preprocessOptions.rotation = 0;
    updateImagePreview();
    previewContainer.style.display = 'block';

    // Show pagination bar if multi-page
    if (pdfPaginationBar) {
      if (pdfDoc.numPages > 1) {
        pdfPaginationBar.style.display = 'flex';
        updatePdfPaginationUI();
      } else {
        pdfPaginationBar.style.display = 'none';
      }
    }

    // Extract text from document pages
    showToast(`Extracting text from PDF (${pdfDoc.numPages} page${pdfDoc.numPages > 1 ? 's' : ''})...`);
    const { fullText, pageTexts, hasEmbeddedText } = await pdfEngine.extractText(pdfDoc);
    state.pdfPageTexts = pageTexts;

    if (hasEmbeddedText) {
      state.rawOcrText = fullText;
      processTextPipeline(fullText);
      showToast(`PDF loaded successfully (${pdfDoc.numPages} page${pdfDoc.numPages > 1 ? 's' : ''}). Ready to read & translate.`);
    } else {
      showToast(`Scanned PDF detected (${pdfDoc.numPages} pages). Click "Read Whole Document with Tesseract OCR" to read.`);
    }
  } catch (err) {
    console.error('PDF loading error:', err);
    showToast(`Error reading PDF: ${err.message}`);
  }
}

async function renderPdfPage(pageNum) {
  if (!state.currentPdf || pageNum < 1 || pageNum > state.totalPdfPages) return;
  state.currentPdfPage = pageNum;
  updatePdfPaginationUI();

  try {
    const canvas = await pdfEngine.renderPageToCanvas(pageNum, 1.75, state.currentPdf);
    state.currentImage = canvas;
    updateImagePreview();

    // If PDF text was extracted per page
    if (state.pdfPageTexts && state.pdfPageTexts[pageNum - 1]) {
      const pageText = state.pdfPageTexts[pageNum - 1];
      if (pageText.trim().length > 0) {
        state.rawOcrText = pageText;
        processTextPipeline(pageText);
      }
    }
  } catch (err) {
    console.error('Error rendering PDF page:', err);
  }
}

function updatePdfPaginationUI() {
  if (!pdfPageIndicator) return;
  pdfPageIndicator.textContent = `Page ${state.currentPdfPage} of ${state.totalPdfPages}`;
  if (btnPdfPrev) btnPdfPrev.disabled = state.currentPdfPage <= 1;
  if (btnPdfNext) btnPdfNext.disabled = state.currentPdfPage >= state.totalPdfPages;
}

function loadImageFromFile(file) {
  if (!file || !file.type.startsWith('image/')) {
    showToast('Please select a valid image or PDF file.');
    return;
  }

  resetOcrStats();

  // Reset PDF state
  state.currentPdf = null;
  state.totalPdfPages = 0;
  state.pdfPageTexts = [];
  if (pdfPaginationBar) pdfPaginationBar.style.display = 'none';

  const reader = new FileReader();
  reader.onload = (e) => {
    const img = new Image();
    img.onload = () => {
      state.currentImage = img;
      state.currentRotation = 0;
      state.preprocessOptions.rotation = 0;
      updateImagePreview();
      previewContainer.style.display = 'block';
      showToast('Image loaded. Ready for reading & translation.');
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
}

function updateImagePreview() {
  if (!state.currentImage) return;

  const canvas = ocrEngine.preprocessImage(state.currentImage, state.preprocessOptions);
  imagePreview.src = canvas.toDataURL('image/jpeg', 0.92);
}

// ============================================================================
// OCR Confidence & Stats UI Handlers
// ============================================================================
function updateOcrConfidenceUI(confidence, linesCount = 0, wordsCount = 0) {
  if (confidence === null || confidence === undefined || isNaN(confidence)) {
    resetOcrStats();
    return;
  }

  const roundedConf = Math.min(100, Math.max(0, Math.round(confidence)));
  state.ocrConfidence = roundedConf;
  state.ocrLinesCount = linesCount;
  state.ocrWordsCount = wordsCount;

  // Classify Confidence Quality Tier
  let tierLabel = 'High Accuracy';
  let tierClass = 'confidence-high';
  let meterClass = 'meter-high';
  if (roundedConf >= 80) {
    tierLabel = 'High Accuracy';
    tierClass = 'confidence-high';
    meterClass = 'meter-high';
  } else if (roundedConf >= 60) {
    tierLabel = 'Moderate';
    tierClass = 'confidence-medium';
    meterClass = 'meter-medium';
  } else {
    tierLabel = 'Low Accuracy';
    tierClass = 'confidence-low';
    meterClass = 'meter-low';
  }

  // Update Left Studio Card
  if (ocrStatsCard) {
    ocrStatsCard.style.display = 'flex';
  }
  if (ocrConfidenceBadge) {
    ocrConfidenceBadge.className = `confidence-badge ${tierClass}`;
    ocrConfidenceBadge.textContent = `${roundedConf}% · ${tierLabel}`;
  }
  if (ocrConfidenceMeterFill) {
    ocrConfidenceMeterFill.className = `confidence-meter-fill ${meterClass}`;
    ocrConfidenceMeterFill.style.width = `${roundedConf}%`;
  }
  if (ocrConfidenceMeter) {
    ocrConfidenceMeter.setAttribute('aria-valuenow', roundedConf);
  }
  if (ocrConfidenceValue) {
    ocrConfidenceValue.textContent = `${roundedConf}%`;
  }
  if (ocrStatLines) {
    ocrStatLines.textContent = linesCount;
  }
  if (ocrStatWords) {
    ocrStatWords.textContent = wordsCount;
  }
  if (ocrStatQuality) {
    ocrStatQuality.textContent = tierLabel;
    ocrStatQuality.style.color = roundedConf >= 80 ? '#2b8a3e' : (roundedConf >= 60 ? '#d9480f' : '#c92a2a');
  }

  // Update Right Reader Meta Banner
  if (ocrMetaConfidence) {
    ocrMetaConfidence.textContent = `${roundedConf}%`;
  }
  if (ocrMetaTierBadge) {
    ocrMetaTierBadge.className = `confidence-badge ${tierClass}`;
    ocrMetaTierBadge.textContent = tierLabel;
  }
  if (ocrMetaDetails) {
    ocrMetaDetails.textContent = `${linesCount} lines · ${wordsCount} words`;
  }

  if (state.activeTab === 'original' && ocrMetaBanner) {
    ocrMetaBanner.style.display = 'flex';
  }
}

function resetOcrStats() {
  state.ocrConfidence = null;
  state.ocrLinesCount = 0;
  state.ocrWordsCount = 0;
  if (ocrStatsCard) ocrStatsCard.style.display = 'none';
  if (ocrMetaBanner) ocrMetaBanner.style.display = 'none';
}

// ============================================================================
// Full Document OCR & Translation Pipeline
// ============================================================================
async function runFullDocumentOCR() {
  if (!state.currentImage) {
    showToast('Please upload or snap a photo first.');
    return;
  }

  const selectedOcrLang = ocrLangSelect ? ocrLangSelect.value : 'eng';

  ocrProgressContainer.style.display = 'block';
  btnRunOcr.disabled = true;
  btnRunOcr.innerHTML = '<span>⏳ Tesseract Processing...</span>';
  showToast(`Reading whole document with Tesseract OCR [${selectedOcrLang}]...`);

  try {
    const ocrResult = await ocrEngine.recognize(
      state.currentImage,
      selectedOcrLang,
      ({ status, progress }) => {
        ocrStatusText.textContent = `${status}...`;
        ocrPercentText.textContent = `${progress}%`;
        ocrProgressFill.style.width = `${progress}%`;
      },
      state.preprocessOptions
    );

    state.rawOcrText = ocrResult.text;

    if (!state.rawOcrText || state.rawOcrText.trim().length === 0) {
      showToast('No clear text detected by Tesseract. Try adjusting contrast or rotation.');
      resetOcrStats();
      return;
    }

    const conf = Number.isFinite(ocrResult.confidence) ? ocrResult.confidence : 0;
    const linesCount = ocrResult.lines ? ocrResult.lines.length : 0;
    const wordsCount = ocrResult.words ? ocrResult.words.length : 0;
    updateOcrConfidenceUI(conf, linesCount, wordsCount);

    processTextPipeline(state.rawOcrText);
    showToast(`Successfully read document with Tesseract OCR (${linesCount} lines, confidence ${Math.round(conf)}%).`);
  } catch (err) {
    console.error('Tesseract OCR Error:', err);
    showToast(`Tesseract OCR error: ${err.message}`);
  } finally {
    ocrProgressContainer.style.display = 'none';
    btnRunOcr.disabled = false;
    btnRunOcr.innerHTML = '<span>🔍 Read Whole Document with Tesseract OCR</span>';
  }
}

async function processTextPipeline(rawText) {
  state.translatedResult = await translationEngine.translate(rawText, state.selectedLanguage);
  renderActiveTab();
}

// ============================================================================
// Reader Display Rendering (Word spans, Bionic, Syllables)
// ============================================================================
function renderActiveTab() {
  let textToRender = '';

  if (state.activeTab === 'translated') {
    textToRender = state.translatedResult ? state.translatedResult.translatedText : '';
    translationBar.style.display = 'flex';
    if (ocrMetaBanner) ocrMetaBanner.style.display = 'none';

    if (state.translatedResult) {
      translationCoverage.textContent = `Vocabulary Coverage: ${state.translatedResult.coveragePercentage}%`;
    }
  } else if (state.activeTab === 'original') {
    textToRender = state.rawOcrText;
    translationBar.style.display = 'none';
    if (ocrMetaBanner) {
      ocrMetaBanner.style.display = state.ocrConfidence !== null ? 'flex' : 'none';
    }
  }

  if (!textToRender || textToRender.trim().length === 0) {
    readerDisplay.innerHTML = `
      <div style="color: var(--md-sys-color-on-surface-variant); text-align: center; margin-top: 4rem;">
        <div style="font-size: 2.5rem; margin-bottom: 0.5rem;">📖</div>
        <p style="font-weight: 600; font-size: 1.1rem;">No text available for this tab</p>
      </div>`;
    return;
  }

  populateVoices();
  renderWordSpans(textToRender);
}

function renderWordSpans(rawText) {
  state.renderedWords = [];
  readerDisplay.innerHTML = '';

  // Tokenize words and non-words (including English and Malayalam Unicode block \u0D00-\u0D7F)
  const regex = /([a-zA-Z0-9\u00C0-\u024F\u0D00-\u0D7F'-]+|[^\s\w]+|\s+)/gu;
  let match;
  let wordCounter = 0;
  let cursor = 0;
  const fragment = document.createDocumentFragment();

  while ((match = regex.exec(rawText)) !== null) {
    const token = match[0];
    const startIndex = cursor;
    const endIndex = cursor + token.length;
    cursor = endIndex;

    const isWord = /^[a-zA-Z0-9\u00C0-\u024F\u0D00-\u0D7F'-]+$/u.test(token);

    if (isWord) {
      const spanId = `word-span-${wordCounter++}`;
      state.renderedWords.push({
        id: spanId,
        word: token,
        startIndex,
        endIndex
      });

      const span = document.createElement('span');
      span.id = spanId;
      span.className = 'reader-word';

      if (state.bionicActive) {
        span.innerHTML = accessibilityUI.toBionicHtml(token);
        span.classList.add('bionic-text');
      } else if (state.syllablesActive) {
        span.innerHTML = accessibilityUI.toSyllableHtml(token);
        span.classList.add('syllable-text');
      } else {
        span.textContent = token;
      }

      span.style.cursor = 'pointer';
      span.title = 'Click to hear word';
      span.addEventListener('click', (e) => {
        e.stopPropagation();
        speechEngine.speak(token, getActiveTtsLanguage());
      });

      fragment.appendChild(span);
    } else {
      if (token.includes('\n')) {
        const parts = token.split('\n');
        for (let i = 0; i < parts.length; i++) {
          if (parts[i]) fragment.appendChild(document.createTextNode(parts[i]));
          if (i < parts.length - 1) fragment.appendChild(document.createElement('br'));
        }
      } else {
        fragment.appendChild(document.createTextNode(token));
      }
    }
  }

  readerDisplay.appendChild(fragment);
}

function getActiveTtsLanguage() {
  if (state.activeTab === 'translated') {
    const selectedLangObj = translationEngine.getSupportedLanguages().find(l => l.code === state.selectedLanguage);
    return selectedLangObj?.ttsLang || 'ml-IN';
  }
  return 'en-US';
}

function getActiveText() {
  if (state.activeTab === 'translated') {
    return state.translatedResult ? state.translatedResult.translatedText : '';
  }
  return state.rawOcrText;
}

// ============================================================================
// Event Listeners
// ============================================================================

btnBrowse.addEventListener('click', () => fileInput.click());
fileInput.addEventListener('change', (e) => {
  if (e.target.files && e.target.files[0]) {
    loadFile(e.target.files[0]);
  }
});

dropzone.addEventListener('dragover', (e) => {
  e.preventDefault();
  dropzone.classList.add('drag-over');
});

dropzone.addEventListener('dragleave', () => {
  dropzone.classList.remove('drag-over');
});

dropzone.addEventListener('drop', (e) => {
  e.preventDefault();
  dropzone.classList.remove('drag-over');
  if (e.dataTransfer.files && e.dataTransfer.files[0]) {
    loadFile(e.dataTransfer.files[0]);
  }
});

btnPaste.addEventListener('click', async () => {
  try {
    const items = await navigator.clipboard.read();
    for (const item of items) {
      const imageType = item.types.find(type => type.startsWith('image/'));
      if (imageType) {
        const blob = await item.getType(imageType);
        loadImageFromFile(blob);
        return;
      }
    }
    showToast('No image in clipboard. Copy an image or screenshot first!');
  } catch (err) {
    showToast('Press Ctrl+V to paste image from clipboard.');
  }
});

window.addEventListener('paste', (e) => {
  if (e.clipboardData && e.clipboardData.items) {
    for (let i = 0; i < e.clipboardData.items.length; i++) {
      if (e.clipboardData.items[i].type.indexOf('image') !== -1) {
        const file = e.clipboardData.items[i].getAsFile();
        loadImageFromFile(file);
        break;
      }
    }
  }
});

btnToggleTextInput.addEventListener('click', () => {
  const isHidden = directTextWrapper.style.display === 'none';
  directTextWrapper.style.display = isHidden ? 'block' : 'none';
  if (isHidden) directTextInput.focus();
});

btnProcessDirectText.addEventListener('click', () => {
  const text = directTextInput.value.trim();
  if (!text) {
    showToast('Please enter some text first.');
    return;
  }
  resetOcrStats();
  state.rawOcrText = text;
  processTextPipeline(text);
  showToast('Text processed and translated.');
});

btnEnhanceContrast.addEventListener('click', () => {
  state.preprocessOptions.contrast = state.preprocessOptions.contrast === 1.2 ? 1.6 : 1.2;
  updateImagePreview();
  showToast(`Contrast set to ${state.preprocessOptions.contrast}x`);
});

btnBinarize.addEventListener('click', () => {
  state.preprocessOptions.binarize = !state.preprocessOptions.binarize;
  updateImagePreview();
  showToast(state.preprocessOptions.binarize ? 'Binarization (black/white) ON' : 'Binarization OFF');
});

btnRotate.addEventListener('click', () => {
  state.preprocessOptions.rotation = (state.preprocessOptions.rotation + 90) % 360;
  updateImagePreview();
  showToast(`Rotated to ${state.preprocessOptions.rotation}°`);
});

btnClearImage.addEventListener('click', () => {
  state.currentImage = null;
  state.currentPdf = null;
  state.totalPdfPages = 0;
  state.pdfPageTexts = [];
  if (pdfPaginationBar) pdfPaginationBar.style.display = 'none';
  imagePreview.src = '';
  previewContainer.style.display = 'none';
  fileInput.value = '';
  resetOcrStats();
  showToast('File removed.');
});

if (btnPdfPrev) {
  btnPdfPrev.addEventListener('click', () => renderPdfPage(state.currentPdfPage - 1));
}
if (btnPdfNext) {
  btnPdfNext.addEventListener('click', () => renderPdfPage(state.currentPdfPage + 1));
}

btnRunOcr.addEventListener('click', runFullDocumentOCR);

btnCamera.addEventListener('click', async () => {
  try {
    cameraModal.classList.remove('hidden');
    await cameraEngine.start('environment');
    showToast('Camera active. Align document inside the box.');
  } catch (err) {
    showToast(err.message);
    cameraModal.classList.add('hidden');
  }
});

btnCloseCamera.addEventListener('click', () => {
  cameraEngine.stop();
  cameraModal.classList.add('hidden');
});

btnFlipCamera.addEventListener('click', async () => {
  try {
    await cameraEngine.flipCamera();
  } catch (err) {
    showToast(err.message);
  }
});

btnSnapPhoto.addEventListener('click', () => {
  try {
    const dataUrl = cameraEngine.captureFrame();
    const img = new Image();
    img.onload = () => {
      state.currentImage = img;
      state.currentRotation = 0;
      state.preprocessOptions.rotation = 0;
      updateImagePreview();
      previewContainer.style.display = 'block';
      cameraEngine.stop();
      cameraModal.classList.add('hidden');
      showToast('Photo captured! Reading whole document with Tesseract OCR...');
      runFullDocumentOCR();
    };
    img.src = dataUrl;
  } catch (err) {
    showToast(`Capture failed: ${err.message}`);
  }
});

// --- Tabs Switcher ---
function switchTab(newTab) {
  state.activeTab = newTab;
  tabTranslated.classList.toggle('active', newTab === 'translated');
  tabOriginal.classList.toggle('active', newTab === 'original');

  tabTranslated.setAttribute('aria-selected', newTab === 'translated');
  tabOriginal.setAttribute('aria-selected', newTab === 'original');

  renderActiveTab();
}

tabTranslated.addEventListener('click', () => switchTab('translated'));
tabOriginal.addEventListener('click', () => switchTab('original'));

targetLangSelect.addEventListener('change', async (e) => {
  state.selectedLanguage = e.target.value;
  if (state.rawOcrText) {
    state.translatedResult = await translationEngine.translate(state.rawOcrText, state.selectedLanguage);
    renderActiveTab();
    showToast(`Target language: ${e.target.options[e.target.selectedIndex].text}`);
  }
});

btnToggleBionic.addEventListener('click', () => {
  state.bionicActive = !state.bionicActive;
  if (state.bionicActive) state.syllablesActive = false;
  btnToggleBionic.classList.toggle('m3-btn-filled', state.bionicActive);
  btnToggleBionic.classList.toggle('m3-btn-tonal', !state.bionicActive);
  btnToggleSyllables.classList.remove('m3-btn-filled');
  btnToggleSyllables.classList.add('m3-btn-tonal');
  renderActiveTab();
  showToast(state.bionicActive ? 'Bionic Reading Enabled' : 'Bionic Reading Disabled');
});

btnToggleSyllables.addEventListener('click', () => {
  state.syllablesActive = !state.syllablesActive;
  if (state.syllablesActive) state.bionicActive = false;
  btnToggleSyllables.classList.toggle('m3-btn-filled', state.syllablesActive);
  btnToggleSyllables.classList.toggle('m3-btn-tonal', !state.syllablesActive);
  btnToggleBionic.classList.remove('m3-btn-filled');
  btnToggleBionic.classList.add('m3-btn-tonal');
  renderActiveTab();
  showToast(state.syllablesActive ? 'Syllable Separation Enabled' : 'Syllable Separation Disabled');
});

btnCopyText.addEventListener('click', () => {
  const text = getActiveText();
  if (text) {
    navigator.clipboard.writeText(text);
    showToast('Text copied to clipboard.');
  }
});

btnAudioPlay.addEventListener('click', () => {
  const text = getActiveText();
  if (!text) {
    showToast('No text available to read.');
    return;
  }
  speechEngine.toggle(text, getActiveTtsLanguage());
});

btnAudioStop.addEventListener('click', () => {
  speechEngine.stop();
  showToast('Audio stopped.');
});

speedSlider.addEventListener('input', (e) => {
  const val = parseFloat(e.target.value);
  speechEngine.setRate(val);
  speedVal.textContent = `${val.toFixed(1)}x`;
});

pitchSlider.addEventListener('input', (e) => {
  speechEngine.setPitch(parseFloat(e.target.value));
});

voiceSelect.addEventListener('change', (e) => {
  speechEngine.setVoice(e.target.value);
});

btnFontIncrease.addEventListener('click', () => {
  if (state.currentFontSize < 32) {
    state.currentFontSize += 2;
    accessibilityUI.setTextSize(state.currentFontSize);
    fontSizeIndicator.textContent = `${state.currentFontSize}px`;
  }
});

btnFontDecrease.addEventListener('click', () => {
  if (state.currentFontSize > 14) {
    state.currentFontSize -= 2;
    accessibilityUI.setTextSize(state.currentFontSize);
    fontSizeIndicator.textContent = `${state.currentFontSize}px`;
  }
});

lineHeightSelect.addEventListener('change', (e) => {
  accessibilityUI.setLineHeight(e.target.value);
});

themeSelector.addEventListener('change', (e) => {
  accessibilityUI.setTheme(e.target.value);
  showToast(`Theme changed to ${e.target.options[e.target.selectedIndex].text}`);
});

fontFamilySelect.addEventListener('change', (e) => {
  accessibilityUI.setFontFamily(e.target.value);
  showToast(`Font set to ${e.target.options[e.target.selectedIndex].text}`);
});

toggleDyslexicMode.addEventListener('click', () => {
  const active = accessibilityUI.toggleDyslexicMode();
  toggleDyslexicMode.classList.toggle('active', active);
  showToast(active ? 'Dyslexic Spacing Enabled' : 'Standard Spacing Restored');
});

toggleReadingRuler.addEventListener('click', () => {
  const active = accessibilityUI.toggleReadingRuler();
  toggleReadingRuler.classList.toggle('active', active);
  showToast(active ? 'Reading Ruler Active' : 'Reading Ruler Disabled');
});

// Run initialization
init();
