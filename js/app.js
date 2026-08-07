// Main Application Entry Point
import { StorageManager } from './storage.js';
import { SplashManager } from './splash.js';
import { PatientManager } from './patient.js';
import { DoctorManager } from './doctor.js';
import { AppIconViewManager } from './appIconView.js';

class App {
  constructor() {
    this.splashManager = null;
    this.patientManager = null;
    this.doctorManager = null;
    this.appIconViewManager = null;
    this.currentView = 'patient';

    this.init();
  }

  init() {
    // Apply saved theme
    this.applyTheme(StorageManager.getTheme());

    // Initialize modules
    this.splashManager = new SplashManager();
    this.patientManager = new PatientManager((msg, type) => this.showToast(msg, type));
    this.doctorManager = new DoctorManager((msg, type) => this.showToast(msg, type));
    this.appIconViewManager = new AppIconViewManager();

    this.bindNavigation();
    this.bindThemeToggle();
    this.bindModals();
  }

  bindNavigation() {
    const navLinks = document.querySelectorAll('.nav-tab');
    navLinks.forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        const targetView = link.dataset.view;
        this.switchView(targetView);
      });
    });
  }

  switchView(viewName) {
    this.currentView = viewName;

    // Update nav links styling
    document.querySelectorAll('.nav-tab').forEach(link => {
      if (link.dataset.view === viewName) {
        link.classList.add('bg-teal-600', 'text-white', 'shadow-md', 'shadow-teal-600/30');
        link.classList.remove('text-slate-600', 'dark:text-slate-300', 'hover:bg-slate-100', 'dark:hover:bg-slate-800');
      } else {
        link.classList.remove('bg-teal-600', 'text-white', 'shadow-md', 'shadow-teal-600/30');
        link.classList.add('text-slate-600', 'dark:text-slate-300', 'hover:bg-slate-100', 'dark:hover:bg-slate-800');
      }
    });

    // Hide all view containers
    document.querySelectorAll('.app-view').forEach(view => {
      view.classList.add('hidden');
    });

    // Show target view container
    const activeView = document.getElementById(`view-${viewName}`);
    if (activeView) {
      activeView.classList.remove('hidden');
      activeView.classList.add('animate-fade-in');
    }

    // Refresh view specific data if needed
    if (viewName === 'doctor') {
      this.doctorManager.renderSchedule();
      this.doctorManager.renderStats();
    } else if (viewName === 'patient') {
      this.patientManager.renderDoctorCards();
      this.patientManager.renderMyBookings();
    }
  }

  bindThemeToggle() {
    const toggleBtn = document.getElementById('btn-theme-toggle');
    if (!toggleBtn) return;

    toggleBtn.addEventListener('click', () => {
      const currentTheme = StorageManager.getTheme();
      const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
      StorageManager.setTheme(newTheme);
      this.applyTheme(newTheme);
    });
  }

  applyTheme(theme) {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark', 'dark-mode');
    } else {
      document.documentElement.classList.remove('dark', 'dark-mode');
    }
  }

  bindModals() {
    // Close booking modal
    const closeBookingBtn = document.getElementById('btn-close-booking-modal');
    if (closeBookingBtn) {
      closeBookingBtn.addEventListener('click', () => {
        document.getElementById('booking-modal').classList.add('hidden');
      });
    }

    // Close ticket modal
    const closeTicketBtn = document.getElementById('btn-close-ticket-modal');
    if (closeTicketBtn) {
      closeTicketBtn.addEventListener('click', () => {
        document.getElementById('ticket-modal').classList.add('hidden');
      });
    }
  }

  showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `fixed bottom-6 right-6 z-50 px-5 py-3.5 rounded-2xl shadow-2xl font-bold text-sm flex items-center gap-3 transition-all transform translate-y-10 opacity-0 ${
      type === 'success' ? 'bg-emerald-600 text-white' :
      type === 'error' ? 'bg-rose-600 text-white' :
      'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900'
    }`;

    toast.innerHTML = `
      <i class="fas ${type === 'success' ? 'fa-check-circle' : type === 'error' ? 'fa-exclamation-circle' : 'fa-info-circle'} text-lg"></i>
      <span>${message}</span>
    `;

    document.body.appendChild(toast);

    setTimeout(() => {
      toast.classList.remove('translate-y-10', 'opacity-0');
    }, 10);

    setTimeout(() => {
      toast.classList.add('translate-y-10', 'opacity-0');
      setTimeout(() => toast.remove(), 300);
    }, 4000);
  }
}

// Instantiate App when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  window.afiaApp = new App();
});
