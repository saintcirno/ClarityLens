# 👓 ClarityLens — Accessible Document Reader (Zero-API)

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Vite](https://img.shields.io/badge/Vite-5.4-646CFF?logo=vite&logoColor=white)](https://vitejs.dev/)
[![Tesseract.js](https://img.shields.io/badge/Tesseract.js-5.1-4BA158?logo=tesseract)](https://tesseract.projectnaptha.com/)
[![PDF.js](https://img.shields.io/badge/PDF.js-4.10-FF0000?logo=adobe-acrobat-reader&logoColor=white)](https://mozilla.github.io/pdf.js/)
[![Material Design 3](https://img.shields.io/badge/UI-Material%20Design%203-7986CB)](https://m3.material.io/)

> **ClarityLens** is a 100% client-side, zero-API accessibility reader designed for visually impaired and dyslexic users. It transforms physical documents, photos, and PDFs into readable text, translations, and spoken audio with real-time word tracking.

---

## 🌟 Key Features

### 1. 🔍 Full-Document OCR & Confidence Scoring
- **Client-Side WASM Engine**: Powered by [Tesseract.js](https://github.com/naptha/tesseract.js) running locally via WebAssembly.
- **Multilingual Support**: Recognition for English (`eng`) and Malayalam (`mal`).
- **Real-Time Confidence Score**:
  - Displays Tesseract mean confidence (0–100%) with dynamic quality tiers (**High Accuracy**, **Moderate**, **Low Accuracy**).
  - Visual color-coded confidence meter bar.
  - OCR metadata summary showing total lines recognized and word count.
  - Reader metadata banner on the **Original File / OCR Text** tab.
- **Image Enhancement Studio**:
  - 🌓 Auto Contrast enhancement.
  - ⬛ Otsu Binarization (black & white separation).
  - 🔄 90° Image Rotation.

### 2. 📄 Multi-Page PDF Processing
- Integrated with [PDF.js](https://mozilla.github.io/pdf.js/) for in-browser PDF parsing.
- Automatically extracts embedded vector text.
- Full pagination controls (`Page X of Y`, Prev / Next).
- Seamless OCR fallback for scanned, image-only PDFs.

### 3. 👁️ Dyslexia & Low-Vision Accessibility Suite
- **Dyslexia-Optimized Fonts**:
  - ✨ *Lexend* (scientifically proven to improve reading fluency)
  - 👁️ *Atkinson Hyperlegible* (designed for low-vision distinction)
  - 🔤 *OpenDyslexic* (weighted bottoms to prevent letter inversion)
  - 📱 *System Sans*
- **Reading Assist Modes**:
  - **Bionic Reading**: Emphasizes initial fixation points to guide eye movement.
  - **Syllable Segmentation**: Inserts subtle mid-dots between syllables to reduce visual crowding.
  - **Reading Ruler**: An adjustable, high-contrast horizontal line guide following the mouse or touch cursor.
  - **Dyslexic Spacing Mode**: One-click toggling of increased line-height, letter-spacing, and word-spacing.
- **Color & Contrast Themes**:
  - ☀️ Material 3 Light & 🌙 M3 Dark
  - ⚡ High Contrast (OLED true black)
  - 🟡 Yellow on Black
  - 📜 Irlen Soft Cream, 🌿 Irlen Mint Green, 🍑 Irlen Soft Peach, 🌊 Irlen Sky Blue (for Meares-Irlen syndrome & visual stress)

### 4. 🔊 Accessible Text-to-Speech (TTS)
- Offline voice synthesis via the Web Speech API.
- **Word-by-Word Glow Tracking**: Highlights the active word in real-time as it is spoken.
- **Interactive Word Pronunciation**: Click on any individual word to hear its pronunciation.
- Customizable speech rate (`0.5x` – `2.0x`), pitch control, and voice selector.

### 5. 🌐 Local Offline Translation
- Built-in offline dictionary & phrase translation engine (e.g., English to Malayalam).
- Provides instant translation coverage metrics.
- Tabbed interface switching between **Translated Text** and **Original / OCR Text**.

### 6. 📸 Multi-Input Ingestion
- 📁 Drag-and-drop document upload (Images: JPG, PNG, WEBP, BMP; Documents: PDF).
- 📸 In-app Camera Scanner with video viewfinder, guide crosshairs, and front/rear camera toggle.
- 📋 Screenshot clipboard paste (`Ctrl+V`).
- ✍️ Direct manual text input.

---

## 🔒 Privacy & Zero-API Philosophy

ClarityLens operates with strict privacy guarantees:
- **No API Keys Needed**: Does not depend on Google Cloud Vision, OpenAI, AWS, or any remote AI service.
- **100% Local Execution**: All OCR processing, PDF rendering, translation, and speech generation happen entirely on your device.
- **No Data Telemetry**: Your uploaded files, documents, and camera feeds never leave your browser.

---

## 🛠️ Tech Stack

| Component | Technology |
|---|---|
| **Bundler & Dev Server** | [Vite 5](https://vitejs.dev/) |
| **Language** | Modern ES Modules (JavaScript) |
| **Styling** | Google Material Design 3 (Vanilla CSS with design tokens) |
| **OCR Engine** | [Tesseract.js 5.1](https://github.com/naptha/tesseract.js) (WASM) |
| **PDF Engine** | [PDF.js 4.10](https://mozilla.github.io/pdf.js/) |
| **Audio & Speech** | Web Speech API (`SpeechSynthesis`) |
| **Fonts** | Google Fonts (*Lexend*, *Atkinson Hyperlegible*, *Noto Sans Malayalam*) |

---

## 🚀 Getting Started

### Prerequisites
- [Node.js](https://nodejs.org/) (version 18+ recommended)
- [npm](https://www.npmjs.com/) or [pnpm](https://pnpm.io/)

### Installation

1. **Clone the repository**:
   ```bash
   git clone https://github.com/your-username/ClarityLens.git
   cd ClarityLens
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Start the development server**:
   ```bash
   npm run dev
   ```

4. **Open your browser**:
   Navigate to `http://localhost:3000` (or the port specified in your terminal).

---

## 📦 Available Scripts

| Command | Description |
|---|---|
| `npm run dev` | Starts Vite dev server with hot module replacement (HMR) |
| `npm run build` | Compiles and optimizes assets into `dist/` production bundle |
| `npm run preview` | Serves the production build locally for verification |

---

## 📁 Project Structure

```text
ClarityLens/
├── index.html                 # Main application markup & UI layout
├── package.json               # Dependencies and build scripts
├── vite.config.js             # Vite configuration
├── public/                    # Static public assets (favicon, etc.)
└── src/
    ├── main.js                # Core controller, state management & event listeners
    ├── modules/
    │   ├── ocr-engine.js      # Tesseract.js WASM engine & canvas preprocessors
    │   ├── pdf-engine.js      # PDF.js document loader, renderer & text extractor
    │   ├── speech-engine.js   # Web Speech API wrapper with word-boundary events
    │   ├── translation-engine.js # Local offline dictionary translation logic
    │   ├── accessibility-ui.js   # Bionic reading & syllable transformation utilities
    │   └── camera-engine.js   # MediaDevices camera feed capture & frame snapping
    ├── styles/
    │   ├── material3.css      # Material Design 3 design system tokens & components
    │   └── accessibility.css  # Dyslexia typography, ruler & color contrast themes
    └── data/
        └── translation-dataset.json # Local vocabulary and word mappings
```

---

## ♿ Accessibility Compliance

ClarityLens is built with accessibility (a11y) at its core:
- **WCAG 2.1 AAA Contrast**: Supported through high-contrast OLED and Irlen overlay modes.
- **ARIA Live Regions**: Live announcements for screen readers when documents load or status changes.
- **Keyboard Navigation**: Complete tab indexing and `:focus-visible` focus rings across all interactive controls.
- **Reduced Motion**: Respects prefers-reduced-motion media query settings.

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).
