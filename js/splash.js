// Splash Screen Controller with Calligraphic Prayer Animation

export class SplashManager {
  constructor() {
    this.splashElement = document.getElementById('splash-screen');
    this.enterBtn = document.getElementById('btn-enter-app');
    this.replayBtns = document.querySelectorAll('.btn-replay-prayer');
    this.audioElement = document.getElementById('audio-prayer');
    this.autoTimer = null;

    this.init();
  }

  init() {
    if (!this.splashElement) return;

    // Show splash screen on launch
    this.showSplash();

    // Event listeners
    if (this.enterBtn) {
      this.enterBtn.addEventListener('click', () => this.hideSplash());
    }

    // Header buttons to replay prayer anytime
    this.replayBtns.forEach(btn => {
      btn.addEventListener('click', () => this.showSplash(true));
    });
  }

  showSplash(manualReplay = false) {
    if (!this.splashElement) return;

    this.splashElement.classList.remove('hidden-splash');
    
    // Play subtle ambient sound if enabled or available
    if (this.audioElement) {
      this.audioElement.currentTime = 0;
      this.audioElement.play().catch(() => {
        // Autoplay policy fallback
      });
    }

    // Auto fade out after 7 seconds if user doesn't click enter
    if (this.autoTimer) clearTimeout(this.autoTimer);
    this.autoTimer = setTimeout(() => {
      if (!this.splashElement.classList.contains('hidden-splash')) {
        this.hideSplash();
      }
    }, 7000);
  }

  hideSplash() {
    if (!this.splashElement) return;
    this.splashElement.classList.add('hidden-splash');
    if (this.autoTimer) clearTimeout(this.autoTimer);
    
    if (this.audioElement) {
      this.audioElement.pause();
    }
  }
}
