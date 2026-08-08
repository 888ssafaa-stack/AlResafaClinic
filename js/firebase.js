// Firebase Service Module - Strict Real Integration (Auth, Firestore, Storage)
import { initializeApp, getApps } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { 
  getAuth, 
  GoogleAuthProvider, 
  signInWithPopup, 
  signOut, 
  onAuthStateChanged 
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { 
  getFirestore, 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs, 
  query, 
  where, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  onSnapshot 
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { 
  getStorage, 
  ref, 
  uploadBytes, 
  getDownloadURL 
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-storage.js";

// Firebase Production Config - Al-Resafa Clinic
const firebaseConfig = {
  apiKey: "AIzaSyAKb67NYLwKOcIF7BnkYegsQtDy5gyaHVM",
  authDomain: "al-resafa-clinic.firebaseapp.com",
  projectId: "al-resafa-clinic",
  storageBucket: "al-resafa-clinic.firebasestorage.app",
  messagingSenderId: "738799541155",
  appId: "1:738799541155:web:4c93f682544954c75e5816",
  measurementId: "G-CFS1MRQYFW"
};

// Initialize Firebase App Instance
const app = !getApps().length ? initializeApp(firebaseConfig) : getApps()[0];

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export const googleProvider = new GoogleAuthProvider();

/**
 * 1. STRICT REAL GOOGLE AUTHENTICATION (NO FALLBACKS / NO MOCKS)
 */
export async function signInWithGoogleAuth() {
  const result = await signInWithPopup(auth, googleProvider);
  const user = result.user;

  if (!user || !user.email) {
    throw new Error("فشلت عملية المصادقة: لم يتم استلام بيانات الحساب الموثق من سيرفر Google.");
  }
  
  // Write/merge user to Firestore 'users' collection
  await setDoc(doc(db, "users", user.uid), {
    uid: user.uid,
    displayName: user.displayName,
    email: user.email.toLowerCase().trim(),
    photoURL: user.photoURL,
    lastLogin: new Date().toISOString()
  }, { merge: true });

  return {
    uid: user.uid,
    displayName: user.displayName,
    email: user.email.toLowerCase().trim(),
    photoURL: user.photoURL
  };
}

/**
 * LOGOUT SESSION
 */
export async function logOutFirebaseUser() {
  await signOut(auth);
}

/**
 * 2. REAL FIREBASE STORAGE - UPLOAD DOCTOR PROFILE AVATAR
 */
export async function uploadProfileImageToStorage(doctorId, file) {
  if (!file) throw new Error("لم يتم اختيار أي ملف صورة للرفع.");

  const fileExt = file.name.split('.').pop() || 'jpg';
  const storageRef = ref(storage, `doctors/${doctorId}/profile_${Date.now()}.${fileExt}`);
  
  const snapshot = await uploadBytes(storageRef, file);
  const downloadURL = await getDownloadURL(snapshot.ref);

  // Update profile image in Firestore 'users' and 'doctors'
  if (auth.currentUser) {
    await setDoc(doc(db, "users", auth.currentUser.uid), {
      photoURL: downloadURL
    }, { merge: true });
  }

  return downloadURL;
}

/**
 * 3. REAL FIRESTORE BOOKINGS DATABASE API
 */
export class FirestoreBookings {
  static listenDoctorBookings(doctorId, callback) {
    try {
      const q = query(
        collection(db, "bookings"),
        where("doctorId", "==", doctorId)
      );
      
      return onSnapshot(q, (snapshot) => {
        const bookings = [];
        snapshot.forEach((docSnap) => {
          bookings.push({ id: docSnap.id, ...docSnap.data() });
        });
        callback(bookings);
      }, (error) => {
        console.warn("Firestore listener notice:", error);
        callback(null);
      });
    } catch (e) {
      console.warn("Firestore collection notice:", e);
      callback(null);
      return () => {};
    }
  }

  static async addBooking(bookingData) {
    const docRef = await addDoc(collection(db, "bookings"), {
      ...bookingData,
      createdAt: new Date().toISOString()
    });
    return { id: docRef.id, ...bookingData };
  }

  static async updateBooking(bookingId, updateFields) {
    const bookingRef = doc(db, "bookings", bookingId);
    await updateDoc(bookingRef, {
      ...updateFields,
      updatedAt: new Date().toISOString()
    });
  }
}

/**
 * 4. REAL FIRESTORE STAFF AUTHORIZATION & INVITATIONS API
 */
export class FirestoreInvitations {
  /**
   * Doctor sends invitation to assistant email
   */
  static async sendInvitation({ doctorId, doctorName, doctorEmail, assistantEmail, role }) {
    const cleanDocEmail = doctorEmail.toLowerCase().trim();
    const cleanAssistantEmail = assistantEmail.toLowerCase().trim();

    const invitationData = {
      doctorId,
      doctorName,
      doctorEmail: cleanDocEmail,
      assistantEmail: cleanAssistantEmail,
      role: role || 'مساعد عيادة - حجز وتنسيق المواعيد',
      status: 'pending', // 'pending' | 'accepted' | 'rejected'
      createdAt: new Date().toISOString()
    };

    const docRef = await addDoc(collection(db, "clinic_invitations"), invitationData);
    return { id: docRef.id, ...invitationData };
  }

  /**
   * Fetch all invitations created by doctor
   */
  static async getDoctorInvitations(doctorEmail) {
    try {
      const q = query(
        collection(db, "clinic_invitations"), 
        where("doctorEmail", "==", doctorEmail.toLowerCase().trim())
      );
      const querySnapshot = await getDocs(q);
      const list = [];
      querySnapshot.forEach((docSnap) => {
        list.push({ id: docSnap.id, ...docSnap.data() });
      });
      return list;
    } catch (e) {
      return [];
    }
  }

  /**
   * Fetch pending invitations targeting a logged-in employee email
   */
  static async getPendingInvitationsForAssistant(assistantEmail) {
    try {
      const q = query(
        collection(db, "clinic_invitations"),
        where("assistantEmail", "==", assistantEmail.toLowerCase().trim()),
        where("status", "==", "pending")
      );
      const querySnapshot = await getDocs(q);
      const list = [];
      querySnapshot.forEach((docSnap) => {
        list.push({ id: docSnap.id, ...docSnap.data() });
      });
      return list;
    } catch (e) {
      return [];
    }
  }

  /**
   * Employee accepts pending invitation
   */
  static async acceptInvitation(invitationId) {
    const invRef = doc(db, "clinic_invitations", invitationId);
    await updateDoc(invRef, {
      status: 'accepted',
      acceptedAt: new Date().toISOString()
    });
  }

  /**
   * Authorization Check
   * Order: 1) Primary Owner → 2) Firestore Doctor → 3) Accepted Staff → 4) Deny
   */
  static async checkUserAuthorization(email) {
    const cleanEmail = String(email).toLowerCase().trim();

    // ═══════════════════════════════════════════════════
    // STEP 0: PRIMARY CLINIC OWNER — IMMEDIATE ACCESS
    // This check runs FIRST and exits the function immediately.
    // No Firestore call, no async delay, no interference.
    // ═══════════════════════════════════════════════════
    if (cleanEmail === '888ssafaa@gmail.com') {
      return {
        isAuthorized: true,
        isDoctor: true,
        isOwner: true,
        doctorId: auth.currentUser?.uid ?? 'primary-doctor'
      };
    }

    // ═══════════════════════════════════════════════════
    // STEP 1 & 2: Firestore checks for other users only
    // ═══════════════════════════════════════════════════
    try {
      // Check registered doctors collection
      const docSnap = await getDocs(
        query(collection(db, 'doctors'), where('email', '==', cleanEmail))
      );
      if (!docSnap.empty) {
        return { isAuthorized: true, isDoctor: true, doctorId: docSnap.docs[0].id };
      }

      // Check accepted staff invitations
      const invSnap = await getDocs(
        query(
          collection(db, 'clinic_invitations'),
          where('assistantEmail', '==', cleanEmail),
          where('status', '==', 'accepted')
        )
      );
      if (!invSnap.empty) {
        const inv = invSnap.docs[0].data();
        return { isAuthorized: true, isDoctor: false, doctorId: inv.doctorId, role: inv.role };
      }

      // Not owner, not doctor, not accepted staff → deny
      return { isAuthorized: false, isDoctor: false, doctorId: null };

    } catch (e) {
      console.warn('Authorization check error:', e);
      return { isAuthorized: false, isDoctor: false, doctorId: null };
    }
  }

  /**
   * ================== SUPER ADMIN & DOCTOR PROFILE METHODS ==================
   */

  // 1. Save or Update Doctor Profile (sets status to pending if new)
  static async saveDoctorProfile(doctorId, profileData) {
    const docRef = doc(db, 'doctors', doctorId);
    const docSnap = await getDoc(docRef);
    
    let status = 'pending';
    if (docSnap.exists()) {
      const existingData = docSnap.data();
      // Keep approved status if already approved, otherwise keep pending
      status = existingData.status === 'approved' ? 'approved' : 'pending';
    }

    await setDoc(docRef, {
      ...profileData,
      status: status,
      updatedAt: new Date().toISOString()
    }, { merge: true });

    return status;
  }

  // 2. Fetch all doctors for Super Admin dashboard
  static async getAllDoctorsForAdmin() {
    try {
      const querySnapshot = await getDocs(collection(db, 'doctors'));
      const list = [];
      querySnapshot.forEach((docSnap) => {
        list.push({ id: docSnap.id, ...docSnap.data() });
      });
      return list;
    } catch (e) {
      console.error("Failed to fetch doctors for admin:", e);
      return [];
    }
  }

  // 3. Approve a doctor profile
  static async approveDoctor(doctorId) {
    const docRef = doc(db, 'doctors', doctorId);
    await updateDoc(docRef, {
      status: 'approved',
      approvedAt: new Date().toISOString()
    });
  }
}
