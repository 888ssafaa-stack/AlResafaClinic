// Patient Interface Controller
import { StorageManager } from './storage.js';
import { INITIAL_SPECIALTIES } from './data.js';
import { FirestoreBookings } from './firebase.js';

export class PatientManager {
  constructor(showToastCallback) {
    this.showToast = showToastCallback;
    this.doctors = StorageManager.getDoctors();
    this.specialties = INITIAL_SPECIALTIES;
    this.selectedSpecialty = 'all';
    this.searchQuery = '';
    
    this.activeBookingDoctor = null;
    this.selectedDate = new Date().toISOString().split('T')[0];
    this.selectedTimeSlot = null;

    this.init();
  }

  init() {
    this.renderSpecialtyFilters();
    this.renderDoctorCards();
    this.renderMyBookings();
    this.bindEvents();
  }

  bindEvents() {
    // Search input
    const searchInput = document.getElementById('patient-search');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        this.searchQuery = e.target.value.trim().toLowerCase();
        this.renderDoctorCards();
      });
    }

    // Booking form submission
    const bookingForm = document.getElementById('booking-form');
    if (bookingForm) {
      bookingForm.addEventListener('submit', (e) => this.handleBookingSubmit(e));
    }

    // Booking date change handler
    const dateInput = document.getElementById('booking-date');
    if (dateInput) {
      dateInput.min = new Date().toISOString().split('T')[0];
      dateInput.value = this.selectedDate;
      dateInput.addEventListener('change', (e) => {
        this.selectedDate = e.target.value;
        this.renderTimeSlots();
      });
    }

    // Tabs for My Bookings (Upcoming vs Past)
    const upcomingTabBtn = document.getElementById('tab-upcoming');
    const pastTabBtn = document.getElementById('tab-past');
    if (upcomingTabBtn && pastTabBtn) {
      upcomingTabBtn.addEventListener('click', () => {
        upcomingTabBtn.classList.add('bg-teal-600', 'text-white');
        upcomingTabBtn.classList.remove('bg-gray-100', 'text-gray-700', 'dark:bg-slate-800', 'dark:text-slate-300');
        pastTabBtn.classList.remove('bg-teal-600', 'text-white');
        pastTabBtn.classList.add('bg-gray-100', 'text-gray-700', 'dark:bg-slate-800', 'dark:text-slate-300');
        this.renderMyBookings('upcoming');
      });

      pastTabBtn.addEventListener('click', () => {
        pastTabBtn.classList.add('bg-teal-600', 'text-white');
        pastTabBtn.classList.remove('bg-gray-100', 'text-gray-700', 'dark:bg-slate-800', 'dark:text-slate-300');
        upcomingTabBtn.classList.remove('bg-teal-600', 'text-white');
        upcomingTabBtn.classList.add('bg-gray-100', 'text-gray-700', 'dark:bg-slate-800', 'dark:text-slate-300');
        this.renderMyBookings('past');
      });
    }
  }

  renderSpecialtyFilters() {
    const container = document.getElementById('specialty-filters');
    if (!container) return;

    container.innerHTML = this.specialties.map(spec => `
      <button 
        data-specialty="${spec.id}"
        class="specialty-btn flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium transition-all duration-200 ${
          this.selectedSpecialty === spec.id 
            ? 'bg-teal-600 text-white shadow-lg shadow-teal-600/30 scale-105' 
            : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 hover:border-teal-500'
        }"
      >
        <i class="fas ${spec.icon} text-sm"></i>
        <span>${spec.name}</span>
      </button>
    `).join('');

    container.querySelectorAll('.specialty-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        this.selectedSpecialty = btn.dataset.specialty;
        this.renderSpecialtyFilters();
        this.renderDoctorCards();
      });
    });
  }

  renderDoctorCards() {
    const grid = document.getElementById('doctors-grid');
    if (!grid) return;

    this.doctors = StorageManager.getDoctors();

    let filtered = this.doctors.filter(doc => {
      const matchSpec = this.selectedSpecialty === 'all' || doc.specialtyId === this.selectedSpecialty;
      const matchSearch = doc.name.toLowerCase().includes(this.searchQuery) || 
                          doc.specialtyName.toLowerCase().includes(this.searchQuery) ||
                          doc.clinic.toLowerCase().includes(this.searchQuery);
      return matchSpec && matchSearch;
    });

    if (filtered.length === 0) {
      grid.innerHTML = `
        <div class="col-span-full py-16 text-center">
          <div class="w-20 h-20 mx-auto mb-4 rounded-full bg-teal-50 dark:bg-slate-800 flex items-center justify-center text-teal-600 text-3xl">
            <i class="fas fa-user-md"></i>
          </div>
          <h3 class="text-xl font-bold text-slate-800 dark:text-slate-100">لم يتم العثور على أطباء مطبقين للبحث</h3>
          <p class="text-slate-500 mt-2">جرب تغيير التخصص أو كلمة البحث.</p>
        </div>
      `;
      return;
    }

    grid.innerHTML = filtered.map(doc => `
      <div class="glass-panel p-6 rounded-2xl flex flex-col justify-between hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
        <div>
          <div class="flex items-start gap-4 mb-4">
            <img src="${doc.avatar}" alt="${doc.name}" class="w-20 h-20 rounded-2xl object-cover border-2 border-teal-500 shadow-md">
            <div class="flex-1">
              <div class="flex items-center justify-between">
                <span class="text-xs font-semibold px-2.5 py-1 rounded-full bg-teal-100 dark:bg-teal-900/40 text-teal-700 dark:text-teal-300">
                  ${doc.specialtyName}
                </span>
                <span class="flex items-center text-amber-500 font-bold text-sm">
                  <i class="fas fa-star text-xs ml-1"></i> ${doc.rating}
                  <span class="text-slate-400 font-normal text-xs mr-1">(${doc.reviewsCount})</span>
                </span>
              </div>
              <h3 class="text-lg font-extrabold text-slate-900 dark:text-slate-100 mt-2">${doc.name}</h3>
              <p class="text-xs text-slate-500 dark:text-slate-400 flex items-center mt-1">
                <i class="fas fa-clinic-medical text-teal-600 ml-1.5"></i> ${doc.clinic}
              </p>
            </div>
          </div>

          <p class="text-xs text-slate-600 dark:text-slate-300 line-clamp-2 mb-4 leading-relaxed bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl">
            ${doc.bio}
          </p>

          <div class="grid grid-cols-2 gap-2 text-xs py-3 border-t border-b border-slate-100 dark:border-slate-800 mb-4">
            <div class="flex items-center text-slate-600 dark:text-slate-400">
              <i class="fas fa-award text-amber-500 ml-2"></i>
              <span>خبرة: ${doc.experienceYears} عاماً</span>
            </div>
            <div class="flex items-center text-slate-600 dark:text-slate-400">
              <i class="fas fa-money-bill-wave text-emerald-500 ml-2"></i>
              <span>الكشفية: ${doc.fee} $</span>
            </div>
          </div>
        </div>

        <button 
          data-doctor-id="${doc.id}"
          class="btn-open-booking w-full py-3 px-4 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-teal-600/30 transition-all duration-200"
        >
          <i class="fas fa-calendar-check"></i>
          <span>حجز موعد الآن</span>
        </button>
      </div>
    `).join('');

    // Attach click events for booking buttons
    grid.querySelectorAll('.btn-open-booking').forEach(btn => {
      btn.addEventListener('click', () => {
        const docId = btn.dataset.doctorId;
        this.openBookingModal(docId);
      });
    });
  }

  openBookingModal(doctorId) {
    this.doctors = StorageManager.getDoctors();
    this.activeBookingDoctor = this.doctors.find(d => d.id === doctorId);
    if (!this.activeBookingDoctor) return;

    this.selectedTimeSlot = null;

    // Fill doctor info in modal
    document.getElementById('modal-doctor-name').textContent = this.activeBookingDoctor.name;
    document.getElementById('modal-doctor-spec').textContent = this.activeBookingDoctor.specialtyName;
    document.getElementById('modal-doctor-avatar').src = this.activeBookingDoctor.avatar;
    document.getElementById('modal-doctor-fee').textContent = `${this.activeBookingDoctor.fee} $`;

    // Reset date & time slots
    const dateInput = document.getElementById('booking-date');
    if (dateInput) {
      dateInput.value = this.selectedDate;
    }

    this.renderTimeSlots();

    // Hide conflict alert initially
    const conflictAlert = document.getElementById('conflict-alert');
    if (conflictAlert) conflictAlert.classList.add('hidden');

    // Show modal
    const modal = document.getElementById('booking-modal');
    if (modal) modal.classList.remove('hidden');
  }

  renderTimeSlots() {
    const container = document.getElementById('time-slots-container');
    if (!container || !this.activeBookingDoctor) return;

    const slots = this.activeBookingDoctor.timeSlots;
    const date = this.selectedDate;

    container.innerHTML = slots.map(time => {
      const check = StorageManager.isSlotAvailable(this.activeBookingDoctor.id, date, time);
      const isAvailable = check.available;
      const isSelected = this.selectedTimeSlot === time;

      return `
        <button 
          type="button"
          data-time="${time}"
          data-available="${isAvailable}"
          class="slot-btn p-3 rounded-xl font-bold text-sm flex flex-col items-center justify-center transition-all ${
            !isAvailable 
              ? 'bg-rose-50 text-rose-400 dark:bg-rose-950/40 dark:text-rose-400 border border-rose-200 dark:border-rose-900 cursor-not-allowed opacity-75'
              : isSelected
                ? 'bg-teal-600 text-white shadow-lg shadow-teal-600/30 scale-105 border-2 border-teal-600'
                : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 hover:border-teal-500'
          }"
        >
          <span>${time}</span>
          <span class="text-[10px] font-normal mt-0.5">
            ${!isAvailable ? 'محجوز / مغلق' : 'متاح'}
          </span>
        </button>
      `;
    }).join('');

    // Attach click events
    container.querySelectorAll('.slot-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const time = btn.dataset.time;
        const available = btn.dataset.available === 'true';
        const check = StorageManager.isSlotAvailable(this.activeBookingDoctor.id, this.selectedDate, time);

        const conflictAlert = document.getElementById('conflict-alert');

        if (!available) {
          if (conflictAlert) {
            conflictAlert.classList.remove('hidden');
            document.getElementById('conflict-alert-msg').textContent = check.reason || 'هذا الموعد غير متاح لمنع تضارب الحجوزات.';
          }
          return;
        }

        if (conflictAlert) conflictAlert.classList.add('hidden');
        this.selectedTimeSlot = time;
        this.renderTimeSlots();
      });
    });
  }

  handleBookingSubmit(e) {
    e.preventDefault();
    if (!this.activeBookingDoctor) return;

    if (!this.selectedTimeSlot) {
      this.showToast('يرجى اختيار وقت الموعد المتاح أولاً', 'error');
      return;
    }

    const patientName = document.getElementById('patient-name').value.trim();
    const patientPhone = document.getElementById('patient-phone').value.trim();
    const patientAge = document.getElementById('patient-age').value.trim();
    const visitType = document.getElementById('visit-type').value;
    const notes = document.getElementById('booking-notes').value.trim();

    if (!patientName || !patientPhone) {
      this.showToast('يرجى ملء جميع الحقول المطلوبة', 'error');
      return;
    }

    // Double check conflict engine before finalizing
    const check = StorageManager.isSlotAvailable(this.activeBookingDoctor.id, this.selectedDate, this.selectedTimeSlot);
    if (!check.available) {
      const conflictAlert = document.getElementById('conflict-alert');
      if (conflictAlert) {
        conflictAlert.classList.remove('hidden');
        document.getElementById('conflict-alert-msg').textContent = check.reason;
      }
      this.showToast('تعذر الحجز: الموعد تم اختياره من قبل مريض آخر حديثاً لمنع التضارب.', 'error');
      return;
    }

    const newBooking = {
      id: 'BK-' + Math.floor(100000 + Math.random() * 900000),
      doctorId: this.activeBookingDoctor.id,
      doctorName: this.activeBookingDoctor.name,
      patientName,
      patientPhone,
      patientAge: parseInt(patientAge) || 30,
      appointmentDate: this.selectedDate,
      appointmentTime: this.selectedTimeSlot,
      type: visitType,
      status: 'confirmed',
      createdAt: new Date().toISOString(),
      notes
    };

    StorageManager.addBooking(newBooking);
    FirestoreBookings.addBooking(newBooking).catch(err => console.warn("Firestore add booking notice:", err));

    // Close modal
    document.getElementById('booking-modal').classList.add('hidden');
    document.getElementById('booking-form').reset();

    this.showToast(`تم حجز موعدك بنجاح برقم (${newBooking.id})!`, 'success');

    // Update UI
    this.renderDoctorCards();
    this.renderMyBookings();
    
    // Open Ticket view
    this.showTicketModal(newBooking);
  }

  renderMyBookings(filter = 'upcoming') {
    const container = document.getElementById('my-bookings-list');
    if (!container) return;

    const bookings = StorageManager.getBookings();
    const today = new Date().toISOString().split('T')[0];

    let list = bookings;
    if (filter === 'upcoming') {
      list = bookings.filter(b => b.appointmentDate >= today && b.status !== 'cancelled');
    } else {
      list = bookings.filter(b => b.appointmentDate < today || b.status === 'cancelled' || b.status === 'completed');
    }

    if (list.length === 0) {
      container.innerHTML = `
        <div class="py-12 text-center text-slate-400">
          <i class="fas fa-calendar-times text-4xl mb-3 text-slate-300 dark:text-slate-600"></i>
          <p class="font-medium text-slate-600 dark:text-slate-300">لا توجد مواعيد ${filter === 'upcoming' ? 'قادمة' : 'سابقة'} مخرنة</p>
        </div>
      `;
      return;
    }

    container.innerHTML = list.map(b => `
      <div class="glass-panel p-5 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4 border-r-4 ${
        b.status === 'confirmed' ? 'border-r-teal-500' : b.status === 'completed' ? 'border-r-emerald-500' : 'border-r-rose-500'
      }">
        <div class="flex items-start gap-4">
          <div class="w-14 h-14 rounded-2xl bg-teal-50 dark:bg-teal-950/60 flex flex-col items-center justify-center text-teal-600 font-bold border border-teal-100 dark:border-teal-900">
            <span class="text-xs text-slate-500 dark:text-slate-400">${b.appointmentDate.split('-')[1]}</span>
            <span class="text-lg leading-none">${b.appointmentDate.split('-')[2]}</span>
          </div>

          <div>
            <div class="flex items-center gap-2">
              <span class="text-xs font-mono font-bold text-teal-600 dark:text-teal-400">#${b.id}</span>
              <span class="px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                b.status === 'confirmed' ? 'bg-teal-100 text-teal-800 dark:bg-teal-900/50 dark:text-teal-200' :
                b.status === 'completed' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-200' :
                'bg-rose-100 text-rose-800 dark:bg-rose-900/50 dark:text-rose-200'
              }">
                ${b.status === 'confirmed' ? 'مؤكد' : b.status === 'completed' ? 'مكتمل' : 'ملغى'}
              </span>
            </div>
            <h4 class="font-extrabold text-slate-900 dark:text-slate-100 text-base mt-1">${b.doctorName}</h4>
            <p class="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-3 mt-1">
              <span><i class="far fa-clock ml-1 text-teal-600"></i>${b.appointmentTime}</span>
              <span><i class="far fa-user ml-1 text-teal-600"></i>المريض: ${b.patientName}</span>
              <span><i class="fas fa-tag ml-1 text-teal-600"></i>${b.type}</span>
            </p>
          </div>
        </div>

        <div class="flex items-center gap-2 self-end md:self-center">
          <button 
            data-booking-id="${b.id}"
            class="btn-print-ticket p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-teal-50 text-slate-700 dark:text-slate-200 text-xs font-bold flex items-center gap-1.5 transition"
          >
            <i class="fas fa-print text-teal-600"></i>
            <span>تذكرة الحجز</span>
          </button>
          
          ${b.status === 'confirmed' ? `
            <button 
              data-cancel-id="${b.id}"
              class="btn-cancel-booking p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 text-rose-600 text-xs font-bold flex items-center gap-1 transition"
            >
              <i class="fas fa-times"></i>
              <span>إلغاء</span>
            </button>
          ` : ''}
        </div>
      </div>
    `).join('');

    // Attach events
    container.querySelectorAll('.btn-print-ticket').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.bookingId;
        const booking = bookings.find(b => b.id === id);
        if (booking) this.showTicketModal(booking);
      });
    });

    container.querySelectorAll('.btn-cancel-booking').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.cancelId;
        if (confirm('هل أنت تأكد من رغبتك في إلغاء هذا الموعد؟')) {
          StorageManager.cancelBooking(id);
          this.showToast('تم إلغاء الموعد بنجاح.', 'info');
          this.renderDoctorCards();
          this.renderMyBookings();
        }
      });
    });
  }

  showTicketModal(booking) {
    const modal = document.getElementById('ticket-modal');
    if (!modal) return;

    document.getElementById('ticket-id').textContent = booking.id;
    document.getElementById('ticket-doctor').textContent = booking.doctorName;
    document.getElementById('ticket-patient').textContent = booking.patientName;
    document.getElementById('ticket-date').textContent = booking.appointmentDate;
    document.getElementById('ticket-time').textContent = booking.appointmentTime;
    document.getElementById('ticket-type').textContent = booking.type;

    modal.classList.remove('hidden');

    const printBtn = document.getElementById('btn-do-print');
    if (printBtn) {
      printBtn.onclick = () => window.print();
    }
  }
}
