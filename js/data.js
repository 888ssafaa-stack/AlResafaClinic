// Initial Data for AfiaCare Medical System

export const INITIAL_SPECIALTIES = [
  { id: 'all', name: 'جميع التخصصات', icon: 'fa-user-md' },
  { id: 'cardiology', name: 'أمراض القلب والشرايين', icon: 'fa-heartbeat' },
  { id: 'pediatrics', name: 'طب الأطفال وحديثي الولادة', icon: 'fa-baby' },
  { id: 'orthopedics', name: 'جراحة العظام والمفاصل', icon: 'fa-bone' },
  { id: 'dentistry', name: 'طب وجراحة الأسنان', icon: 'fa-tooth' },
  { id: 'ophthalmology', name: 'طب وجراحة العيون', icon: 'fa-eye' },
  { id: 'general', name: 'الطب العام والباطنية', icon: 'fa-stethoscope' }
];

export const INITIAL_DOCTORS = [
  {
    id: 'doc-1',
    name: 'د. أحمد البابلي',
    specialtyId: 'cardiology',
    specialtyName: 'استشاري أمراض القلب والشرايين',
    rating: 4.9,
    reviewsCount: 128,
    experienceYears: 15,
    fee: 35,
    clinic: 'مركز البابلي للقلب - الطابق الثالث',
    phone: '+964 770 111 2233',
    availableDays: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday'],
    timeSlots: ['09:00', '10:00', '11:00', '12:00', '16:00', '17:00', '18:00', '19:00'],
    avatar: 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=400&auto=format&fit=crop&q=80',
    bio: 'حاصل على الدكتوراه والزمالة الملكية في جراحة وقسطرة القلب. خبرة تزيد عن 15 عاماً في العلاج المتقدم للحالات الحرجة.'
  },
  {
    id: 'doc-2',
    name: 'د. سارة الكاظمي',
    specialtyId: 'pediatrics',
    specialtyName: 'أخصائية طب الأطفال وحديثي الولادة',
    rating: 4.95,
    reviewsCount: 210,
    experienceYears: 12,
    fee: 25,
    clinic: 'عيادة الأطفال السعيدة - الطابق الأول',
    phone: '+964 780 222 3344',
    availableDays: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Saturday'],
    timeSlots: ['09:00', '10:00', '11:00', '16:00', '17:00', '18:00'],
    avatar: 'https://images.unsplash.com/photo-1594824813566-78a9c39ce131?w=400&auto=format&fit=crop&q=80',
    bio: 'خبيرة في متابعة نمو الأطفال والتطعيمات ورعاية حديثي الولادة والمبتسرين.'
  },
  {
    id: 'doc-3',
    name: 'د. حيدر الحلي',
    specialtyId: 'orthopedics',
    specialtyName: 'استشاري جراحة العظام والعمود الفقري',
    rating: 4.85,
    reviewsCount: 94,
    experienceYears: 18,
    fee: 40,
    clinic: 'مستشفى الشفاء - مجمع الجراحة',
    phone: '+964 771 333 4455',
    availableDays: ['Sunday', 'Tuesday', 'Thursday'],
    timeSlots: ['10:00', '11:00', '12:00', '17:00', '18:00', '19:00'],
    avatar: 'https://images.unsplash.com/photo-1537368910025-700350fe46c7?w=400&auto=format&fit=crop&q=80',
    bio: 'متخصص في عمليات تبديل المفاصل وعلاج مناظير الركبة والكتف وإصابات الملعب.'
  },
  {
    id: 'doc-4',
    name: 'د. مريم الرسام',
    specialtyId: 'dentistry',
    specialtyName: 'أخصائية تجميل وطب الأسنان الرقمي',
    rating: 4.9,
    reviewsCount: 165,
    experienceYears: 10,
    fee: 30,
    clinic: 'مركز اللؤلؤة للأسنان - الطابق الثاني',
    phone: '+964 781 444 5566',
    availableDays: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Saturday'],
    timeSlots: ['09:00', '10:00', '11:00', '12:00', '15:00', '16:00', '17:00'],
    avatar: 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=400&auto=format&fit=crop&q=80',
    bio: 'متخصصة في مبتسمات ابتسامة هوليوود وزراعة الأسنان بدون ألم باستخدام أحدث التقنيات.'
  },
  {
    id: 'doc-5',
    name: 'د. عمر الفاروق',
    specialtyId: 'ophthalmology',
    specialtyName: 'أخصائي طب وجراحة العيون والليزك',
    rating: 4.8,
    reviewsCount: 88,
    experienceYears: 14,
    fee: 30,
    clinic: 'مركز النور للعيون - جناح الليزك',
    phone: '+964 772 555 6677',
    availableDays: ['Monday', 'Wednesday', 'Thursday'],
    timeSlots: ['09:30', '10:30', '11:30', '16:30', '17:30'],
    avatar: 'https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=400&auto=format&fit=crop&q=80',
    bio: 'خبير تصحيح النظر بالفيزوليزك والمياه البيضاء وزراعة العدسات الـ IOL.'
  }
];

// Initial bookings sample to demonstrate active calendar & conflict detection out of the box
const todayStr = new Date().toISOString().split('T')[0];

export const INITIAL_BOOKINGS = [
  {
    id: 'BK-1001',
    doctorId: 'doc-1',
    doctorName: 'د. أحمد البابلي',
    patientName: 'محمد علي الحسين',
    patientPhone: '07709876543',
    patientAge: 45,
    appointmentDate: todayStr,
    appointmentTime: '10:00',
    type: 'الكشف الأولي',
    status: 'confirmed', // confirmed, pending, completed, cancelled
    createdAt: new Date(Date.now() - 86400000).toISOString(),
    notes: 'يعاني من ارتفاع في ضغط الدم وضيق تنفس عند المجهود.'
  },
  {
    id: 'BK-1002',
    doctorId: 'doc-1',
    doctorName: 'د. أحمد البابلي',
    patientName: 'زهراء عبد القادر',
    patientPhone: '07801234567',
    patientAge: 32,
    appointmentDate: todayStr,
    appointmentTime: '11:00',
    type: 'متابعة وفحوصات',
    status: 'confirmed',
    createdAt: new Date(Date.now() - 43200000).toISOString(),
    notes: 'متابعة نتيجة تخطيط القلب والشرايين.'
  },
  {
    id: 'BK-1003',
    doctorId: 'doc-2',
    doctorName: 'د. سارة الكاظمي',
    patientName: 'يوسف رامي (طفل)',
    patientPhone: '07715556677',
    patientAge: 5,
    appointmentDate: todayStr,
    appointmentTime: '09:00',
    type: 'استشارة طفح جلدي',
    status: 'completed',
    createdAt: new Date(Date.now() - 172800000).toISOString(),
    notes: 'تم إعطاء الوصفة الطبية وتحديد المتابعة بعد أسبوعين.'
  }
];

export const INITIAL_BLOCKED_SLOTS = [
  {
    doctorId: 'doc-1',
    date: todayStr,
    time: '12:00',
    reason: 'استراحة العيادة والطوارئ'
  }
];
