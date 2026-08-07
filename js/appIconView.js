// App Icon Visualizer & Downloader
export class AppIconViewManager {
  constructor() {
    this.init();
  }

  init() {
    const downloadBtn = document.getElementById('btn-download-icon');
    if (downloadBtn) {
      downloadBtn.addEventListener('click', () => this.downloadIcon());
    }
  }

  downloadIcon() {
    const link = document.createElement('a');
    link.href = 'assets/icon.jpg';
    link.download = 'AfiaCare_FullBleed_AppIcon.jpg';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}
