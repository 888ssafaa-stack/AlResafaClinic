// LocalStorage Manager for AfiaCare
import { INITIAL_DOCTORS, INITIAL_BOOKINGS, INITIAL_BLOCKED_SLOTS } from './data.js';

const KEYS = {
  BOOKINGS: 'afiacare_bookings',
  DOCTORS: 'afiacare_doctors',
  BLOCKED_SLOTS: 'afiacare_blocked_slots',
  THEME: 'afiacare_theme',
  SPLASH_SEEN: 'afiacare_splash_seen'
};

export class StorageManager {
  static getDoctors() {
    const data = localStorage.getItem(KEYS.DOCTORS);
    if (!data) {
      this.setDoctors(INITIAL_DOCTORS);
      return INITIAL_DOCTORS;
    }
    return JSON.parse(data);
  }

  static setDoctors(doctors) {
    localStorage.setItem(KEYS.DOCTORS, JSON.stringify(doctors));
  }

  static getBookings() {
    const data = localStorage.getItem(KEYS.BOOKINGS);
    if (!data) {
      this.setBookings(INITIAL_BOOKINGS);
      return INITIAL_BOOKINGS;
    }
    return JSON.parse(data);
  }

  static setBookings(bookings) {
    localStorage.setItem(KEYS.BOOKINGS, JSON.stringify(bookings));
  }

  static addBooking(booking) {
    const bookings = this.getBookings();
    bookings.push(booking);
    this.setBookings(bookings);
    return booking;
  }

  static updateBookingStatus(id, newStatus) {
    const bookings = this.getBookings();
    const index = bookings.findIndex(b => b.id === id);
    if (index !== -1) {
      bookings[index].status = newStatus;
      this.setBookings(bookings);
      return bookings[index];
    }
    return null;
  }

  static cancelBooking(id) {
    return this.updateBookingStatus(id, 'cancelled');
  }

  static getBlockedSlots() {
    const data = localStorage.getItem(KEYS.BLOCKED_SLOTS);
    if (!data) {
      this.setBlockedSlots(INITIAL_BLOCKED_SLOTS);
      return INITIAL_BLOCKED_SLOTS;
    }
    return JSON.parse(data);
  }

  static setBlockedSlots(slots) {
    localStorage.setItem(KEYS.BLOCKED_SLOTS, JSON.stringify(slots));
  }

  static toggleBlockSlot(doctorId, date, time, reason = 'موعد طوارئ / مغلق') {
    const slots = this.getBlockedSlots();
    const existingIndex = slots.findIndex(s => s.doctorId === doctorId && s.date === date && s.time === time);
    
    if (existingIndex !== -1) {
      slots.splice(existingIndex, 1); // Unblock
    } else {
      slots.push({ doctorId, date, time, reason }); // Block
    }
    this.setBlockedSlots(slots);
    return slots;
  }

  /**
   * Conflict Detection Engine
   * Checks if a specific doctor is available at the given date and time slot.
   */
  static isSlotAvailable(doctorId, date, time, excludeBookingId = null) {
    const bookings = this.getBookings();
    const blockedSlots = this.getBlockedSlots();

    // Check if slot is blocked by doctor/clinic
    const isBlocked = blockedSlots.some(s => s.doctorId === doctorId && s.date === date && s.time === time);
    if (isBlocked) {
      return { available: false, reason: 'الموعد مغلق من قبل إدارة العيادة لظروف طارئة.' };
    }

    // Check existing confirmed/pending bookings
    const activeBooking = bookings.find(b => 
      b.doctorId === doctorId && 
      b.appointmentDate === date && 
      b.appointmentTime === time && 
      b.status !== 'cancelled' &&
      b.id !== excludeBookingId
    );

    if (activeBooking) {
      return {
        available: false,
        reason: `الموعد محجوز مسبقاً للمريض (${activeBooking.patientName}) لمنع تضارب المواعيد.`,
        booking: activeBooking
      };
    }

    return { available: true };
  }

  static getTheme() {
    return localStorage.getItem(KEYS.THEME) || 'light';
  }

  static setTheme(theme) {
    localStorage.setItem(KEYS.THEME, theme);
  }
}
