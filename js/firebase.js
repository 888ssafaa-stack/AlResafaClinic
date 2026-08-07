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
googleProvider.setCustomParameters({ prompt: 'select_account' });

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
   * Strict Authorization Check: Check if user email is Doctor or Accepted Staff
   */
  static async checkUserAuthorization(email) {
    const cleanEmail = email.toLowerCase().trim();

    // PRIMARY OWNER — always granted full doctor access regardless of Firestore
    const PRIMARY_OWNER_EMAIL = '888ssafaa@gmail.com';
    if (cleanEmail === PRIMARY_OWNER_EMAIL) {
      const uid = auth.currentUser?.uid || 'primary-doctor';
      return { isAuthorized: true, isDoctor: true, doctorId: uid };
    }

    try {
      // Step 1: Check if user is a registered doctor in Firestore
      const docQuery = query(collection(db, "doctors"), where("email", "==", cleanEmail));
      const docSnap = await getDocs(docQuery);
      if (!docSnap.empty) {
        return { isAuthorized: true, isDoctor: true, doctorId: docSnap.docs[0].id };
      }

      // Step 2: Check if user is an accepted assistant in clinic_invitations
      const invQuery = query(
        collection(db, "clinic_invitations"),
        where("assistantEmail", "==", cleanEmail),
        where("status", "==", "accepted")
      );
      const invSnap = await getDocs(invQuery);
      if (!invSnap.empty) {
        const invData = invSnap.docs[0].data();
        return { isAuthorized: true, isDoctor: false, doctorId: invData.doctorId, role: invData.role };
      }

      // Step 3: STRICT — not the owner, not a doctor, not accepted staff → deny access
      return { isAuthorized: false, isDoctor: false, doctorId: null };

    } catch (e) {
      // On Firestore error, deny access rather than granting it
      console.warn("Authorization check error:", e);
      return { isAuthorized: false, isDoctor: false, doctorId: null };
    }
  }
}
