/**
 * Local Camera Document Scanner
 * Enables users to point their phone/webcam at documents, pages, or files
 * to snap photos directly into the canvas pipeline for OCR processing.
 */
export class CameraEngine {
  constructor(videoElement, canvasElement) {
    this.video = videoElement;
    this.canvas = canvasElement;
    this.stream = null;
    this.currentFacingMode = 'environment'; // default to rear camera on mobile
    this.isStreaming = false;
  }

  /**
   * Start camera stream
   */
  async start(facingMode = 'environment') {
    this.currentFacingMode = facingMode;

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      throw new Error('Camera access is not supported on this device/browser.');
    }

    this.stop(); // Stop any existing stream

    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: this.currentFacingMode },
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        },
        audio: false
      });

      if (this.video) {
        this.video.srcObject = this.stream;
        await this.video.play();
        this.isStreaming = true;
      }
      return true;
    } catch (err) {
      // Fallback to any available video device
      try {
        this.stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
        if (this.video) {
          this.video.srcObject = this.stream;
          await this.video.play();
          this.isStreaming = true;
        }
        return true;
      } catch (fallbackErr) {
        this.isStreaming = false;
        throw new Error(`Unable to access camera: ${err.message}`);
      }
    }
  }

  /**
   * Capture a still frame from the video stream
   * @returns {string} Data URL of captured image
   */
  captureFrame() {
    if (!this.video || !this.isStreaming) {
      throw new Error('Camera stream is not active.');
    }

    const video = this.video;
    const canvas = this.canvas || document.createElement('canvas');
    const width = video.videoWidth || 1280;
    const height = video.videoHeight || 720;

    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, width, height);

    return canvas.toDataURL('image/jpeg', 0.95);
  }

  /**
   * Switch between front and rear cameras
   */
  async flipCamera() {
    const newFacingMode = this.currentFacingMode === 'environment' ? 'user' : 'environment';
    return await this.start(newFacingMode);
  }

  /**
   * Stop camera stream
   */
  stop() {
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
    }
    if (this.video) {
      this.video.srcObject = null;
    }
    this.isStreaming = false;
  }
}
