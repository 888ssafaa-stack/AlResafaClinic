// Clinic & Doctor Interface Controller - Production Firebase Version (Auth, Firestore, Storage)
import { StorageManager } from './storage.js';
import { 
  auth, 
  signInWithGoogleAuth, 
  logOutFirebaseUser, 
  uploadProfileImageToStorage, 
  FirestoreBookings, 
  FirestoreInvitations 
} from './firebase.js';

export class DoctorManager {
  constructor(showToastCallback) {
    this.showToast = showToastCallback;
    this.doctors = StorageManager.getDoctors();
    this.selectedDoctorId = this.doctors[0]?.id || 'doc-1';
    this.selectedDate = new Date().toISOString().split('T')[0];
    this.authenticatedUser = null;
    this.invitations = [];
    this.pendingAssistantInvites = [];
    this.firestoreBookings = [];
    this.unsubscribeBookings = null;

    this.init();
  }

  init() {
    this.bindEvents();
    this.initFirebaseAuthState();
  }

  initFirebaseAuthState() {
    const cachedSession = localStorage.getItem('afiacare_auth_user');
    if (cachedSession) {
      try {
        this.authenticatedUser = JSON.parse(cachedSession);
      } catch (_) {}
    }

    this.checkAuthGuardState();
  }

  async checkAuthGuardState() {
    const authGuardContainer = document.getElementById('auth-guard-container');
    const doctorContentContainer = document.getElementById('doctor-content-container');
    
    // STRICT AUTH GUARD: Require active authenticatedUser from Firebase
    if (this.authenticatedUser && this.authenticatedUser.email) {
      const userEmail = this.authenticatedUser.email.toLowerCase().trim();

      // Check Firestore staff authorization status
      const authStatus = await FirestoreInvitations.checkUserAuthorization(userEmail);
      
      if (!authStatus.isAuthorized) {
        if (authGuardContainer) authGuardContainer.classList.remove('hidden');
        if (doctorContentContainer) doctorContentContainer.classList.add('hidden');
        this.showToast('عذراً، هذا البريد الإلكتروني غير موثق ضمن كادر أو مسؤولي العيادة.', 'error');
        return;
      }

      this.selectedDoctorId = authStatus.doctorId || 'doc-1';

      if (authGuardContainer) authGuardContainer.classList.add('hidden');
      
      // Route to Super Admin View if Owner
      const viewSuperAdmin = document.getElementById('view-superadmin');
      if (authStatus.isOwner) {
        if (doctorContentContainer) doctorContentContainer.classList.add('hidden');
        if (viewSuperAdmin) {
          viewSuperAdmin.classList.remove('hidden');
          this.loadSuperAdminDashboard();
        }
      } else {
        if (viewSuperAdmin) viewSuperAdmin.classList.add('hidden');
        if (doctorContentContainer) doctorContentContainer.classList.remove('hidden');
        
        this.updateDoctorHeaderUI();
        this.loadDoctorProfileData();
        this.loadInvitations();
        this.checkPendingAssistantInvitations();
        this.setupFirestoreBookingsListener();
      }
    } else {
      if (authGuardContainer) authGuardContainer.classList.remove('hidden');
      if (doctorContentContainer) doctorContentContainer.classList.add('hidden');
      
      if (this.unsubscribeBookings) {
        this.unsubscribeBookings();
        this.unsubscribeBookings = null;
      }
    }
  }

  updateDoctorHeaderUI() {
    if (!this.authenticatedUser) return;

    const avatarImg = document.getElementById('doctor-auth-avatar');
    const nameElem = document.getElementById('doctor-auth-name');
    const emailElem = document.getElementById('doctor-auth-email');

    if (avatarImg && this.authenticatedUser.photoURL) {
      avatarImg.src = this.authenticatedUser.photoURL;
    }
    if (nameElem && this.authenticatedUser.displayName) {
      nameElem.textContent = this.authenticatedUser.displayName;
    }
    if (emailElem && this.authenticatedUser.email) {
      emailElem.textContent = this.authenticatedUser.email;
    }

    const currentDoc = this.doctors.find(d => d.id === this.selectedDoctorId);
    if (currentDoc && this.authenticatedUser.email) {
      currentDoc.email = this.authenticatedUser.email;
      if (this.authenticatedUser.photoURL) {
        currentDoc.avatar = this.authenticatedUser.photoURL;
      }
    }
  }

  // ==================== DOCTOR PROFILE DATA LOGIC ====================
  async loadDoctorProfileData() {
    try {
      const docSnap = await window.getDoc(window.doc(window.db, 'doctors', this.selectedDoctorId));
      if (docSnap.exists()) {
        const data = docSnap.data();
        document.getElementById('doc-profile-name').value = data.name || this.authenticatedUser?.displayName || '';
        document.getElementById('doc-profile-dob').value = data.dob || '';
        document.getElementById('doc-profile-phone').value = data.phone || '';
        document.getElementById('doc-profile-speciality').value = data.speciality || '';
        document.getElementById('doc-profile-experience').value = data.experience || '';
        document.getElementById('doc-profile-university').value = data.university || '';
        const workplaceRadio = document.querySelector(`input[name="doc-profile-workplace"][value="${data.workplace || 'وزارة الصحة'}"]`);
        if (workplaceRadio) workplaceRadio.checked = true;

        document.getElementById('doc-profile-syndicate').value = data.syndicate || '';
        
        const currencyRadio = document.querySelector(`input[name="doc-profile-currency"][value="${data.currency || 'دينار عراقي'}"]`);
        if (currencyRadio) currencyRadio.checked = true;

        const provinceInput = document.getElementById('doc-profile-province');
        if (provinceInput) provinceInput.value = data.province || 'بغداد';
        document.getElementById('doc-profile-address').value = data.address || '';
        document.getElementById('doc-profile-assistant').value = data.assistantEmail || '';

        const badge = document.getElementById('doc-profile-status-badge');
        if (badge) {
          if (data.status === 'approved') {
            badge.className = 'px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 bg-emerald-100 text-emerald-700';
            badge.innerHTML = '<i class="fas fa-check-circle"></i> حالة الملف: معتمد ومنشور';
          } else {
            badge.className = 'px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 bg-amber-100 text-amber-700';
            badge.innerHTML = '<i class="fas fa-clock"></i> حالة الملف: قيد المراجعة';
          }
        }
      }
    } catch (e) {
      console.warn("Failed to load doctor profile:", e);
    }
  }

  // ==================== SUPER ADMIN LOGIC ====================
  async loadSuperAdminDashboard() {
    try {
      const doctors = await FirestoreInvitations.getAllDoctorsForAdmin();
      const tbody = document.getElementById('superadmin-doctors-tbody');
      if (!tbody) return;

      tbody.innerHTML = '';
      doctors.forEach(docData => {
        const isApproved = docData.status === 'approved';
        const statusBadge = isApproved 
          ? `<span class="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-700 text-[10px] font-bold"><i class="fas fa-check-circle mr-1"></i> معتمد</span>`
          : `<span class="px-2.5 py-1 rounded-full bg-amber-100 text-amber-700 text-[10px] font-bold"><i class="fas fa-clock mr-1"></i> قيد المراجعة</span>`;
        
        const actionBtn = isApproved 
          ? `<button disabled class="px-3 py-1.5 rounded-lg bg-slate-100 text-slate-400 text-[10px] font-bold cursor-not-allowed">تم الاعتماد</button>`
          : `<button onclick="window.approveDoctorProfile('${docData.id}')" class="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-bold shadow-md shadow-emerald-600/20 transition transform hover:-translate-y-0.5">اعتماد ونشر</button>`;

        tbody.innerHTML += `
          <tr class="hover:bg-slate-50 dark:hover:bg-slate-900/50 transition">
            <td class="p-4 flex items-center gap-3">
              <img src="${docData.avatar || 'assets/icon.jpg'}" class="w-8 h-8 rounded-full object-cover">
              <div>
                <div class="font-bold text-slate-900 dark:text-white">${docData.name || 'بدون اسم'}</div>
                <div class="text-[10px] text-slate-500 font-mono">${docData.email}</div>
              </div>
            </td>
            <td class="p-4 text-slate-600 dark:text-slate-400 font-bold">${docData.speciality || '-'}</td>
            <td class="p-4 text-slate-600 dark:text-slate-400 font-mono" dir="ltr">${docData.phone || '-'}</td>
            <td class="p-4 text-slate-600 dark:text-slate-400">${docData.province || '-'}</td>
            <td class="p-4">${statusBadge}</td>
            <td class="p-4 text-center">${actionBtn}</td>
          </tr>
        `;
      });
    } catch (e) {
      this.showToast('تعذر تحميل بيانات الأطباء للوحة الإدارة.', 'error');
    }
  }

  setupFirestoreBookingsListener() {
    if (this.unsubscribeBookings) {
      this.unsubscribeBookings();
    }

    this.unsubscribeBookings = FirestoreBookings.listenDoctorBookings(
      this.selectedDoctorId, 
      (bookings) => {
        if (bookings !== null && bookings !== undefined) {
          this.firestoreBookings = bookings;
        } else {
          const localBookings = StorageManager.getBookings();
          this.firestoreBookings = localBookings.filter(b => b.doctorId === this.selectedDoctorId);
        }
        this.renderFirestoreBookingsTable();
        this.renderSchedule();
        this.renderStats();
      }
    );
  }

  bindEvents() {
    // 1. STRICT GOOGLE OAUTH AUTHENTICATION (BEHIND THE SCENES WITH FIREBASE)
    const btnGoogleSignin = document.getElementById('btn-google-signin');
    if (btnGoogleSignin) {
      btnGoogleSignin.addEventListener('click', async () => {
        btnGoogleSignin.disabled = true;
        btnGoogleSignin.innerHTML = '<i class="fas fa-spinner fa-spin ml-2"></i> <span>جاري تسجيل الدخول...</span>';

        try {
          // Strictly call Firebase Auth API behind the scenes
          const user = await signInWithGoogleAuth();

          if (!user || !user.email) {
            throw new Error('لم يتم استلام بيانات الحساب.');
          }

          this.authenticatedUser = user;
          localStorage.setItem('afiacare_auth_user', JSON.stringify(user));
          this.showToast(`تم تسجيل الدخول بنجاح (${user.email})!`, 'success');
          
          btnGoogleSignin.disabled = false;
          btnGoogleSignin.innerHTML = '<i class="fab fa-google text-xl text-amber-300 ml-2"></i> <span>تسجيل الدخول بواسطة Google</span>';
          
          await this.checkAuthGuardState();
        } catch (error) {
          btnGoogleSignin.disabled = false;
          btnGoogleSignin.innerHTML = '<i class="fab fa-google text-xl text-amber-300 ml-2"></i> <span>تسجيل الدخول بواسطة Google</span>';
          
          this.authenticatedUser = null;
          localStorage.removeItem('afiacare_auth_user');
          this.showToast(`تعذر تسجيل الدخول: ${error.message || 'تم إغلاق النافذة'}`, 'error');
          this.checkAuthGuardState();
        }
      });
    }

    // Logout Button
    const btnLogout = document.getElementById('btn-doctor-logout');
    if (btnLogout) {
      btnLogout.addEventListener('click', async () => {
        await logOutFirebaseUser();
        this.authenticatedUser = null;
        localStorage.removeItem('afiacare_auth_user');
        this.showToast('تم تسجيل الخروج وإغلاق الجلسة بنجاح.', 'info');
        this.checkAuthGuardState();
      });
    }

    // 2. PROMINENT FIREBASE STORAGE IMAGE FILE UPLOADER
    const fileInput = document.getElementById('doctor-avatar-file-input');
    const btnUpload = document.getElementById('btn-trigger-upload');
    const statusIndicator = document.getElementById('upload-status-indicator');

    const handleFileUpload = async (e) => {
      if (e) e.preventDefault();
      const file = fileInput?.files[0];
      if (!file) {
        this.showToast('يرجى اختيار ملف صورة من جهازك أولاً.', 'error');
        return;
      }

      if (btnUpload) {
        btnUpload.disabled = true;
        btnUpload.innerHTML = '<i class="fas fa-spinner fa-spin"></i> <span>جاري المعالجة...</span>';
      }
      if (statusIndicator) statusIndicator.classList.remove('hidden');

      const reader = new FileReader();
      
      reader.onloadend = async () => {
        try {
          const base64Data = reader.result;
          const uid = this.authenticatedUser?.uid || this.selectedDoctorId;
          
          // Save Base64 directly to Firestore (bypassing Storage)
          const finalUrl = await uploadProfileImageToStorage(uid, base64Data);

          // Update avatar in memory and localStorage
          if (this.authenticatedUser) {
            this.authenticatedUser.photoURL = finalUrl;
            localStorage.setItem('afiacare_auth_user', JSON.stringify(this.authenticatedUser));
          }

          // Sync to local doctor record
          const currentDoc = this.doctors.find(d => d.id === this.selectedDoctorId);
          if (currentDoc) {
            currentDoc.avatar = finalUrl;
            StorageManager.setDoctors(this.doctors);
          }

          this.updateDoctorHeaderUI();
          this.showToast('تم رفع وتحديث الصورة بنجاح!', 'success');
          
          if (fileInput) fileInput.value = '';
        } catch (err) {
          this.showToast(`تعذر تحديث الصورة: ${err.message}`, 'error');
        } finally {
          if (statusIndicator) statusIndicator.classList.add('hidden');
          if (btnUpload) {
            btnUpload.disabled = false;
            btnUpload.innerHTML = '<i class="fas fa-camera"></i> <span>تحديث الصورة</span>';
          }
        }
      };

      reader.onerror = () => {
        this.showToast('فشلت عملية قراءة ملف الصورة.', 'error');
        if (statusIndicator) statusIndicator.classList.add('hidden');
        if (btnUpload) {
          btnUpload.disabled = false;
          btnUpload.innerHTML = '<i class="fas fa-camera"></i> <span>تحديث الصورة</span>';
        }
      };

      // Read the image file as a base64 string
      reader.readAsDataURL(file);
    };

    if (btnUpload) {
      btnUpload.addEventListener('click', handleFileUpload);
    }
    // Removed fileInput change event listener to prevent duplicate/stuck uploads

    // ================== TAB NAVIGATION LOGIC ==================
    const tabBtnProfile = document.getElementById('tab-btn-profile');
    const tabBtnManagement = document.getElementById('tab-btn-management');
    const tabDoctorProfile = document.getElementById('tab-doctor-profile');
    const tabClinicManagement = document.getElementById('tab-clinic-management');

    const switchTab = (activeTab) => {
      if (!tabBtnProfile || !tabBtnManagement || !tabDoctorProfile || !tabClinicManagement) return;
      
      const activeBtnClass = ['border-teal-600', 'text-teal-700', 'dark:text-teal-400', 'bg-teal-50/50', 'dark:bg-teal-900/20'];
      const inactiveBtnClass = ['border-transparent', 'text-slate-500', 'dark:text-slate-400', 'hover:bg-slate-50', 'dark:hover:bg-slate-900/50'];

      if (activeTab === 'profile') {
        tabDoctorProfile.classList.remove('hidden');
        tabClinicManagement.classList.add('hidden');
        tabBtnProfile.classList.add(...activeBtnClass);
        tabBtnProfile.classList.remove(...inactiveBtnClass);
        tabBtnManagement.classList.remove(...activeBtnClass);
        tabBtnManagement.classList.add(...inactiveBtnClass);
      } else {
        tabDoctorProfile.classList.add('hidden');
        tabClinicManagement.classList.remove('hidden');
        tabBtnManagement.classList.add(...activeBtnClass);
        tabBtnManagement.classList.remove(...inactiveBtnClass);
        tabBtnProfile.classList.remove(...activeBtnClass);
        tabBtnProfile.classList.add(...inactiveBtnClass);
      }
    };

    if (tabBtnProfile) tabBtnProfile.addEventListener('click', () => switchTab('profile'));
    if (tabBtnManagement) tabBtnManagement.addEventListener('click', () => switchTab('management'));

    const btnSuperAdminLogout = document.getElementById('btn-superadmin-logout');
    if (btnSuperAdminLogout) {
      btnSuperAdminLogout.addEventListener('click', async () => {
        await logOutFirebaseUser();
        this.authenticatedUser = null;
        localStorage.removeItem('afiacare_auth_user');
        this.showToast('تم تسجيل الخروج بنجاح.', 'info');
        
        const viewSuperAdmin = document.getElementById('view-superadmin');
        const authGuardContainer = document.getElementById('auth-guard-container');
        if (viewSuperAdmin) viewSuperAdmin.classList.add('hidden');
        if (authGuardContainer) authGuardContainer.classList.remove('hidden');
        
        this.checkAuthGuardState();
      });
    }

    // ================== DOCTOR PROFILE FORM SUBMIT ==================
    const profileForm = document.getElementById('form-doctor-profile');
    if (profileForm) {
      profileForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const btnSave = document.getElementById('btn-save-profile');
        if (btnSave) {
          btnSave.disabled = true;
          btnSave.innerHTML = '<i class="fas fa-spinner fa-spin"></i> جاري الحفظ...';
        }

        try {
          const safeVal = (id) => (document.getElementById(id)?.value || '').trim();
          const safeRadio = (name) => (document.querySelector(`input[name="${name}"]:checked`)?.value || '').trim();
          
          const profileData = {
            name: safeVal('doc-profile-name'),
            dob: safeVal('doc-profile-dob'),
            phone: safeVal('doc-profile-phone'),
            speciality: safeVal('doc-profile-speciality'),
            experience: safeVal('doc-profile-experience'),
            university: safeVal('doc-profile-university'),
            workplace: safeRadio('doc-profile-workplace'),
            syndicate: safeVal('doc-profile-syndicate'),
            currency: safeRadio('doc-profile-currency'),
            province: safeVal('doc-profile-province'),
            address: safeVal('doc-profile-address'),
            assistantEmail: safeVal('doc-profile-assistant').toLowerCase(),
            email: (this.authenticatedUser?.email || '').toLowerCase().trim(),
            avatar: this.authenticatedUser?.photoURL || ''
          };

          const newStatus = await FirestoreInvitations.saveDoctorProfile(this.selectedDoctorId, profileData);
          this.showToast('تم حفظ البيانات بنجاح! الملف ' + (newStatus === 'approved' ? 'معتمد' : 'قيد المراجعة'), 'success');
          
          // Auto-invite assistant if email provided
          if (profileData.assistantEmail && profileData.assistantEmail.trim() !== '') {
            await FirestoreInvitations.sendInvitation(
              this.selectedDoctorId, 
              profileData.assistantEmail.trim(), 
              'مساعد عيادة - حجز وتنظيم المواعيد'
            );
            this.showToast('تم إرسال دعوة لموظف العيادة تلقائياً.', 'success');
          }

          this.loadDoctorProfileData();
        } catch (err) {
          this.showToast('خطأ أثناء الحفظ: ' + err.message, 'error');
        } finally {
          if (btnSave) {
            btnSave.disabled = false;
            btnSave.innerHTML = '<i class="fas fa-save"></i> <span>حفظ البيانات وإرسال للمراجعة</span>';
          }
        }
      });
    }

    // Toggle Settings Panel
    const btnSettingsToggle = document.getElementById('btn-toggle-doctor-settings');
    const settingsPanel = document.getElementById('doctor-settings-panel');
    if (btnSettingsToggle && settingsPanel) {
      btnSettingsToggle.addEventListener('click', () => {
        settingsPanel.classList.toggle('hidden');
      });
    }

    // 3. REAL FIRESTORE STAFF INVITATIONS SYSTEM
    const formInvitation = document.getElementById('form-send-invitation');
    if (formInvitation) {
      formInvitation.addEventListener('submit', async (e) => {
        e.preventDefault();
        const emailInput = document.getElementById('input-invite-email');
        const roleSelect = document.getElementById('select-invite-role');

        if (!emailInput || !emailInput.value.trim()) return;

        const doctorEmail = this.authenticatedUser?.email || 'd.ahmed@afiacare.iq';
        const doctorName = this.authenticatedUser?.displayName || 'د. أحمد البابلي';

        await FirestoreInvitations.sendInvitation({
          doctorId: this.selectedDoctorId,
          doctorName,
          doctorEmail,
          assistantEmail: emailInput.value.trim(),
          role: roleSelect ? roleSelect.value : 'مساعد عيادة - حجز وتنظيم المواعيد'
        });

        this.showToast(`تم تسجبل وإرسال الدعوة في Firestore بوضع (Pending) إلى (${emailInput.value.trim()}).`, 'success');
        emailInput.value = '';
        await this.loadInvitations();
      });
    }

    // Accept Pending Assistant Invitation Button Handler
    const btnAcceptPending = document.getElementById('btn-accept-pending-invite');
    if (btnAcceptPending) {
      btnAcceptPending.addEventListener('click', async () => {
        if (this.pendingAssistantInvites.length > 0) {
          const inv = this.pendingAssistantInvites[0];
          await FirestoreInvitations.acceptInvitation(inv.id);
          this.showToast('تم قبول الدعوة رسمياً وتفعيل صلاحيات دخولك لمواعيد العيادة!', 'success');
          document.getElementById('pending-invitation-banner')?.classList.add('hidden');
          this.checkAuthGuardState();
        }
      });
    }

    const datePicker = document.getElementById('doctor-schedule-date');
    if (datePicker) {
      datePicker.value = this.selectedDate;
      datePicker.addEventListener('change', (e) => {
        this.selectedDate = e.target.value;
        this.renderFirestoreBookingsTable();
        this.renderSchedule();
        this.renderStats();
      });
    }
  }

  async checkPendingAssistantInvitations() {
    if (!this.authenticatedUser?.email) return;

    const banner = document.getElementById('pending-invitation-banner');
    const descElem = document.getElementById('pending-invitation-desc');

    this.pendingAssistantInvites = await FirestoreInvitations.getPendingInvitationsForAssistant(this.authenticatedUser.email);

    if (this.pendingAssistantInvites.length > 0 && banner) {
      const inv = this.pendingAssistantInvites[0];
      if (descElem) {
        descElem.textContent = `دعوة موجهة من (${inv.doctorName}) لشغل مسمى: [${inv.role}]`;
      }
      banner.classList.remove('hidden');
    } else if (banner) {
      banner.classList.add('hidden');
    }
  }

  formatWhatsAppUrl(phone, patientName = '', appointmentDate = '', appointmentTime = '') {
    let cleanPhone = phone ? phone.toString().replace(/[^\d+]/g, '') : '';
    if (cleanPhone.startsWith('07')) {
      cleanPhone = '964' + cleanPhone.substring(1);
    } else if (cleanPhone.startsWith('7')) {
      cleanPhone = '964' + cleanPhone;
    } else if (cleanPhone.startsWith('+964')) {
      cleanPhone = cleanPhone.substring(1);
    } else if (!cleanPhone.startsWith('964')) {
      cleanPhone = '964' + cleanPhone;
    }

    const docName = this.authenticatedUser?.displayName || 'عيادة عافية الطبية';
    const message = encodeURIComponent(
      `مرحباً ${patientName}، نود تذكيرك بموعدك الطبي لدى (${docName}) بتاريخ ${appointmentDate} الساعة ${appointmentTime} عبر تطبيق عافية Care.`
    );

    return `https://wa.me/${cleanPhone}?text=${message}`;
  }

  renderFirestoreBookingsTable() {
    const tbody = document.getElementById('firestore-bookings-tbody');
    if (!tbody) return;

    const filteredBookings = this.firestoreBookings.filter(b => b.appointmentDate === this.selectedDate || !this.selectedDate);
    const displayList = filteredBookings.length > 0 ? filteredBookings : this.firestoreBookings;

    if (displayList.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="6" class="p-8 text-center text-slate-500 font-medium">
            <i class="fas fa-inbox text-3xl block mb-2 text-slate-400"></i>
            لا توجد حجوزات مسجلة في قاعدة بيانات Firestore لهذا اليوم حتى الآن.
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = displayList.map(b => {
      const waUrl = this.formatWhatsAppUrl(b.patientPhone, b.patientName, b.appointmentDate, b.appointmentTime);
      const statusMap = {
        'pending': { label: 'قيد الانتظار', class: 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border-amber-300' },
        'confirmed': { label: 'مؤكد', class: 'bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-300 border-teal-300' },
        'completed': { label: 'تم الكشف', class: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border-emerald-300' },
        'cancelled': { label: 'ملغي', class: 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 border-rose-300' }
      };

      const currentStatus = statusMap[b.status] || statusMap['confirmed'];

      return `
        <tr class="hover:bg-slate-50 dark:hover:bg-slate-900/60 transition">
          <td class="p-4 font-extrabold text-slate-900 dark:text-white">
            <div class="flex items-center gap-2">
              <span class="w-8 h-8 rounded-full bg-teal-100 dark:bg-teal-950 text-teal-600 flex items-center justify-center font-bold text-xs">
                ${(b.patientName || 'م').charAt(0)}
              </span>
              <span>${b.patientName || 'مريض بدون اسم'}</span>
            </div>
          </td>

          <td class="p-4 font-mono font-bold">
            <a 
              href="${waUrl}" 
              target="_blank" 
              rel="noopener noreferrer"
              class="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-600 hover:text-white transition shadow-sm"
              title="اضغط للتواصل المباشر مع المريض عبر WhatsApp"
            >
              <i class="fab fa-whatsapp text-lg"></i>
              <span>${b.patientPhone || '07700000000'}</span>
            </a>
          </td>

          <td class="p-4 font-medium">
            <div class="flex flex-col">
              <span class="font-bold text-slate-800 dark:text-slate-200"><i class="far fa-calendar-alt text-teal-600 ml-1"></i>${b.appointmentDate}</span>
              <span class="text-[11px] text-teal-600 dark:text-teal-400 font-mono font-bold"><i class="far fa-clock ml-1"></i>${b.appointmentTime}</span>
            </div>
          </td>

          <td class="p-4">
            <select 
              data-booking-status-id="${b.id}"
              class="px-2.5 py-1 rounded-xl text-xs font-bold border cursor-pointer focus:ring-2 focus:ring-teal-500 ${currentStatus.class}"
            >
              <option value="pending" ${b.status === 'pending' ? 'selected' : ''}>⏳ قيد الانتظار</option>
              <option value="confirmed" ${b.status === 'confirmed' ? 'selected' : ''}>✓ مؤكد</option>
              <option value="completed" ${b.status === 'completed' ? 'selected' : ''}>✨ تم الكشف</option>
              <option value="cancelled" ${b.status === 'cancelled' ? 'selected' : ''}>✕ ملغي</option>
            </select>
          </td>

          <td class="p-4">
            <div class="flex items-center gap-2">
              <input 
                type="text" 
                id="note-input-${b.id}"
                value="${b.notes || ''}"
                placeholder="اكتب ملاحظة أو توصية..."
                class="w-48 px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs focus:ring-2 focus:ring-teal-500"
              >
              <button 
                data-save-note-id="${b.id}" 
                class="px-2.5 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-[11px] font-bold transition shadow-sm"
                title="حفظ الملاحظة في Firestore"
              >
                <i class="fas fa-save"></i>
              </button>
            </div>
          </td>

          <td class="p-4 text-center">
            <a 
              href="${waUrl}" 
              target="_blank"
              class="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-emerald-600 hover:text-white transition inline-block"
              title="مراسلة الواتساب"
            >
              <i class="fab fa-whatsapp text-base"></i>
            </a>
          </td>
        </tr>
      `;
    }).join('');

    tbody.querySelectorAll('[data-booking-status-id]').forEach(select => {
      select.addEventListener('change', async (e) => {
        const id = select.dataset.bookingStatusId;
        const newStatus = e.target.value;
        await FirestoreBookings.updateBooking(id, { status: newStatus });
        StorageManager.updateBookingStatus(id, newStatus);
        this.showToast('تم تحديث حالة الحجز مباشرة في Firestore!', 'success');
      });
    });

    tbody.querySelectorAll('[data-save-note-id]').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = btn.dataset.saveNoteId;
        const noteInput = document.getElementById(`note-input-${id}`);
        const notesValue = noteInput ? noteInput.value.trim() : '';

        await FirestoreBookings.updateBooking(id, { notes: notesValue });
        this.showToast('تم حفظ ملاحظات الطبيب بنجاح في قاعدة بيانات Firestore.', 'success');
      });
    });
  }

  async loadInvitations() {
    const doctorEmail = this.authenticatedUser?.email || 'd.ahmed@afiacare.iq';
    this.invitations = await FirestoreInvitations.getDoctorInvitations(doctorEmail);
    this.renderInvitationsList();
  }

  renderInvitationsList() {
    const container = document.getElementById('invitations-list-container');
    if (!container) return;

    if (this.invitations.length === 0) {
      container.innerHTML = `<p class="text-xs text-slate-500 py-3">لا توجد طلبات دعوة مرسلة حالياً.</p>`;
      return;
    }

    // Doctor view: show status only. Acceptance is done by the staff from THEIR OWN session.
    container.innerHTML = this.invitations.map(inv => `
      <div class="p-3.5 rounded-xl glass-panel flex flex-col sm:flex-row sm:items-center justify-between gap-3 border border-slate-200 dark:border-slate-800">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-xl bg-teal-50 dark:bg-teal-950/60 text-teal-600 flex items-center justify-center font-bold text-sm">
            <i class="fas fa-user-${inv.status === 'accepted' ? 'check' : 'clock'}"></i>
          </div>
          <div>
            <div class="flex items-center gap-2">
              <span class="font-extrabold text-sm text-slate-900 dark:text-white">${inv.assistantEmail}</span>
              <span class="px-2 py-0.5 rounded-full text-[10px] font-bold ${
                inv.status === 'accepted'
                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300'
                  : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-300'
              }">
                ${inv.status === 'accepted' ? '✓ مقبول — الموظف وافق على الدعوة' : '⏳ معلق — بانتظار قبول الموظف بنفسه'}
              </span>
            </div>
            <p class="text-xs text-slate-500 mt-0.5">${inv.role}</p>
          </div>
        </div>

        <div class="flex items-center gap-2 self-end sm:self-center">
          ${inv.status === 'accepted'
            ? `<span class="text-xs font-bold text-emerald-600 flex items-center gap-1"><i class="fas fa-shield-check"></i> مسؤول معتمد</span>`
            : `<span class="text-xs text-amber-600 font-bold flex items-center gap-1"><i class="fas fa-hourglass-half"></i> ينتظر قبول الموظف</span>`
          }
        </div>
      </div>
    `).join('');
    // NOTE: No accept button here. The staff member must log in with their own account
    // and click the accept button in the pending-invitation-banner section.
  }

  renderSchedule() {
    const container = document.getElementById('doctor-schedule-container');
    if (!container) return;

    this.doctors = StorageManager.getDoctors();
    const currentDoc = this.doctors.find(d => d.id === this.selectedDoctorId);
    if (!currentDoc) return;

    const blockedSlots = StorageManager.getBlockedSlots();
    const timeSlots = currentDoc.timeSlots;
    const date = this.selectedDate;

    const docBookings = this.firestoreBookings.filter(b => b.doctorId === currentDoc.id && b.appointmentDate === date && b.status !== 'cancelled');

    container.innerHTML = timeSlots.map(time => {
      const activeBooking = docBookings.find(b => b.appointmentTime === time);
      const isBlocked = blockedSlots.some(s => s.doctorId === currentDoc.id && s.date === date && s.time === time);

      return `
        <div class="glass-panel p-4 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all duration-200 ${
          isBlocked 
            ? 'bg-amber-50/50 dark:bg-amber-950/20 border-amber-300 dark:border-amber-900' 
            : activeBooking
              ? 'bg-teal-50/60 dark:bg-teal-950/30 border-teal-500'
              : 'hover:border-slate-300 dark:hover:border-slate-700'
        }">
          <div class="flex items-center gap-4">
            <div class="w-16 h-12 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center font-mono font-extrabold text-teal-600 dark:text-teal-400 text-sm border border-slate-200 dark:border-slate-700">
              ${time}
            </div>

            <div>
              ${isBlocked ? `
                <div class="flex items-center gap-2 text-amber-600 dark:text-amber-400 font-bold text-sm">
                  <i class="fas fa-lock text-xs"></i>
                  <span>موعد مغلق / استراحة طوارئ</span>
                </div>
                <p class="text-xs text-slate-500 dark:text-slate-400">لا يمكن للمرضى الحجز في هذا الوقت لمنع الازدحام والتضارب.</p>
              ` : activeBooking ? `
                <div class="flex items-center gap-2">
                  <span class="font-extrabold text-slate-900 dark:text-slate-100 text-base">${activeBooking.patientName}</span>
                  <span class="text-xs px-2 py-0.5 rounded-full font-bold ${
                    activeBooking.status === 'completed' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200' : 'bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-200'
                  }">
                    ${activeBooking.status === 'completed' ? 'مكتمل' : 'مجهّز للزيارة'}
                  </span>
                </div>
                <div class="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500 dark:text-slate-400 mt-1">
                  <a href="${this.formatWhatsAppUrl(activeBooking.patientPhone, activeBooking.patientName, activeBooking.appointmentDate, activeBooking.appointmentTime)}" target="_blank" class="hover:underline text-emerald-600 font-bold">
                    <i class="fab fa-whatsapp ml-1"></i>${activeBooking.patientPhone}
                  </a>
                  <span><i class="fas fa-user text-teal-600 ml-1"></i>العمر: ${activeBooking.patientAge || '35'} سنة</span>
                  <span><i class="fas fa-stethoscope text-teal-600 ml-1"></i>${activeBooking.type || 'الكشف الأولي'}</span>
                </div>
                ${activeBooking.notes ? `<p class="text-xs text-amber-700 dark:text-amber-300 mt-1 bg-amber-50 dark:bg-amber-950/40 p-2 rounded-lg"><i class="fas fa-sticky-note ml-1"></i>ملاحظات: ${activeBooking.notes}</p>` : ''}
              ` : `
                <div class="text-slate-500 dark:text-slate-400 font-medium text-sm flex items-center gap-2">
                  <i class="far fa-circle-check text-emerald-500"></i>
                  <span>موعد شاغر متاح للحجز</span>
                </div>
              `}
            </div>
          </div>

          <div class="flex items-center gap-2 self-end md:self-center">
            ${activeBooking ? `
              ${activeBooking.status !== 'completed' ? `
                <button 
                  data-complete-id="${activeBooking.id}"
                  class="btn-complete-booking px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1 shadow-md shadow-emerald-600/20"
                >
                  <i class="fas fa-check-circle"></i>
                  <span>إتمام الزيارة</span>
                </button>
              ` : ''}
              <button 
                data-cancel-id="${activeBooking.id}"
                class="btn-cancel-doctor-booking px-3 py-2 rounded-xl bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 text-rose-600 text-xs font-bold flex items-center gap-1"
              >
                <i class="fas fa-user-xmark"></i>
                <span>إلغاء</span>
              </button>
            ` : `
              <button 
                data-toggle-block-time="${time}"
                class="px-3.5 py-2 rounded-xl ${isBlocked ? 'bg-amber-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-amber-50 hover:text-amber-600'} text-xs font-bold flex items-center gap-1.5 transition"
              >
                <i class="fas ${isBlocked ? 'fa-lock-open' : 'fa-lock'} text-xs"></i>
                <span>${isBlocked ? 'إلغاء قفل الموعد' : 'قفل كـ موعد طوارئ'}</span>
              </button>
            `}
          </div>
        </div>
      `;
    }).join('');

    container.querySelectorAll('.btn-complete-booking').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = btn.dataset.completeId;
        await FirestoreBookings.updateBooking(id, { status: 'completed' });
        StorageManager.updateBookingStatus(id, 'completed');
        this.showToast('تمت علمية المعاينة وإتمام الموعد بنجاح.', 'success');
      });
    });

    container.querySelectorAll('.btn-cancel-doctor-booking').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = btn.dataset.cancelId;
        if (confirm('هل ترغب في إلغاء هذا الموعد وتأكيده للعيادة؟')) {
          await FirestoreBookings.updateBooking(id, { status: 'cancelled' });
          StorageManager.cancelBooking(id);
          this.showToast('تم إلغاء الموعد.', 'info');
        }
      });
    });

    container.querySelectorAll('[data-toggle-block-time]').forEach(btn => {
      btn.addEventListener('click', () => {
        const time = btn.dataset.toggleBlockTime;
        StorageManager.toggleBlockSlot(currentDoc.id, date, time);
        this.showToast('تم تحديث حالة قفل الموعد لمنع تضارب الحجوزات.', 'info');
        this.renderSchedule();
      });
    });
  }

  renderStats() {
    const docBookings = this.firestoreBookings.filter(b => b.doctorId === this.selectedDoctorId && b.appointmentDate === this.selectedDate && b.status !== 'cancelled');

    const totalToday = docBookings.length;
    const completedToday = docBookings.filter(b => b.status === 'completed').length;
    const pendingToday = docBookings.filter(b => b.status === 'confirmed' || b.status === 'pending').length;

    const currentDoc = this.doctors.find(d => d.id === this.selectedDoctorId);
    const capacity = currentDoc ? currentDoc.timeSlots.length : 8;
    const occupancyPercent = Math.round((totalToday / capacity) * 100);

    const statTotal = document.getElementById('stat-today-total');
    const statCompleted = document.getElementById('stat-today-completed');
    const statPending = document.getElementById('stat-today-pending');
    const statOccupancy = document.getElementById('stat-today-occupancy');

    if (statTotal) statTotal.textContent = totalToday;
    if (statCompleted) statCompleted.textContent = completedToday;
    if (statPending) statPending.textContent = pendingToday;
    if (statOccupancy) statOccupancy.textContent = `${occupancyPercent}%`;
  }
}

// Global function for Super Admin action
window.approveDoctorProfile = async (doctorId) => {
  try {
    if (confirm('هل أنت متأكد من اعتماد ونشر ملف هذا الطبيب؟')) {
      await window.FirestoreInvitations.approveDoctor(doctorId);
      // Ensure we call loadSuperAdminDashboard on the existing instance if possible
      // But since we are outside the class, we can trigger a reload or custom event
      alert('تم اعتماد ملف الطبيب بنجاح وتفعيله!');
      location.reload();
    }
  } catch (err) {
    console.error(err);
    alert('حدث خطأ أثناء اعتماد الطبيب.');
  }
};
