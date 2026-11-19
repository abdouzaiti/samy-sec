import React, { createContext, useContext, useState, useEffect } from 'react';

export type Language = 'ar' | 'fr' | 'en';

interface Translations {
  [key: string]: {
    [key in Language]: string;
  };
}

export const translations: Translations = {
  // Sidebar & Navigation
  dashboard: { ar: 'لوحة التحكم', fr: 'Tableau de bord', en: 'Dashboard' },
  timetable: { ar: 'جدول التوقيت', fr: 'Emploi du temps', en: 'Timetable' },
  classes: { ar: 'الأقسام', fr: 'Classes', en: 'Classes' },
  students: { ar: 'التلاميذ', fr: 'Étudiants', en: 'Students' },
  sessions: { ar: 'الحصص', fr: 'Séances', en: 'Sessions' },
  teachers: { ar: 'الأساتذة', fr: 'Enseignants', en: 'Teachers' },
  payments: { ar: 'المدفوعات', fr: 'Paiements', en: 'Payments' },
  expenses: { ar: 'المصاريف والميزانية', fr: 'Charges & Bilan', en: 'Expenses & P&L' },
  notifications: { ar: 'التنبيهات', fr: 'Notifications', en: 'Notifications' },
  signOut: { ar: 'تسجيل الخروج', fr: 'Déconnexion', en: 'Sign Out' },

  // Dashboard
  overview: { ar: 'نظرة عامة', fr: 'Aperçu', en: 'Overview' },
  welcome_back: { ar: 'مرحباً بكم في بوابة أكاديمية سامي.', fr: 'Bienvenue sur le portail Samy Academy.', en: 'Welcome back to Samy Academy portal.' },
  total_students: { ar: 'إجمالي التلاميذ', fr: 'Total Étudiants', en: 'Total Students' },
  total_teachers: { ar: 'إجمالي الأساتذة', fr: 'Total Enseignants', en: 'Total Teachers' },
  current_month_sessions: { ar: 'متابعة 4 حصص (شهرياً)', fr: 'Suivi des 4 séances (Mois)', en: '4 Sessions Tracking (Monthly)' },
  manage_students: { ar: 'إدارة التسجيلات ومتابعة التلاميذ.', fr: 'Gérez les inscriptions et suivis.', en: 'Manage student enrollments and tracking.' },
  monthly_revenue: { ar: 'المداخيل الشهرية', fr: 'Recettes Mensuelles', en: 'Monthly Revenue' },
  pending_payments: { ar: 'المدفوعات المعلقة', fr: 'Paiements en Attente', en: 'Pending Payments' },
  revenue_growth: { ar: 'نمو المداخيل', fr: 'Croissance des Recettes', en: 'Revenue Growth' },
  real_time_alerts: { ar: 'تنبيهات فورية', fr: 'Alertes en Temps Réel', en: 'Real-time Alerts' },
  view_all: { ar: 'عرض الكل', fr: 'Voir tout', en: 'View all' },

  // Classes Page
  academic_classes: { ar: 'الأقسام الدراسية', fr: 'Classes Académiques', en: 'Academic Classes' },
  manage_rosters: { ar: 'إدارة قوائم التلاميذ وأسعار الاشتراكات.', fr: 'Gérez les listes et les tarifs.', en: 'Manage class rosters and subscription prices.' },
  create_class: { ar: 'قسم جديد', fr: 'Nouvelle Classe', en: 'New Class' },
  class_name: { ar: 'اسم القسم', fr: 'Nom de la classe', en: 'Class Name' },
  description: { ar: 'الوصف', fr: 'Description', en: 'Description' },
  program_selector: { ar: 'قائمة الأقسام', fr: 'Sélecteur de Programme', en: 'Program Selector' },
  subscription: { ar: 'الاشتراك', fr: 'Abonnement', en: 'Subscription' },
  monthly_price: { ar: 'السعر الشهري', fr: 'Prix Mensuel', en: 'Monthly Price' },
  search_student: { ar: 'البحث عن تلميذ...', fr: 'Rechercher un étudiant...', en: 'Search student...' },
  student_name: { ar: 'اسم التلميذ', fr: "Nom de l'étudiant", en: 'Student Name' },
  parent_phone: { ar: 'هاتف الولي', fr: 'Tél Parent', en: 'Parent Phone' },
  status: { ar: 'الحالة', fr: 'État', en: 'Status' },
  print_receipt: { ar: 'طباعة الوصل', fr: 'Imprimer Reçu', en: 'Print Receipt' },
  remove: { ar: 'حذف', fr: 'Supprimer', en: 'Remove' },
  add_student: { ar: 'إضافة تلميذ', fr: 'Ajouter Étudiant', en: 'Add Student' },
  paid: { ar: 'مدفوع', fr: 'Payé', en: 'Paid' },
  unpaid: { ar: 'غير مدفوع', fr: 'Non Payé', en: 'Unpaid' },
  pending: { ar: 'قيد الانتظار', fr: 'En attente', en: 'Pending' },

  // Teachers Page
  staff_management: { ar: 'إدارة الرواتب وتعيينات الأساتذة.', fr: 'Gérez les salaires et affectations.', en: 'Manage staff salaries and assignments.' },
  staff_member: { ar: 'الأستاذ', fr: 'Membre du staff', en: 'Staff Member' },
  subject: { ar: 'المادة', fr: 'Matière', en: 'Subject' },
  salary: { ar: 'الراتب', fr: 'Salaire', en: 'Salary' },
  pay_salary: { ar: 'دفع الراتب', fr: 'Payer Salaire', en: 'Pay Salary' },
  payment_month: { ar: 'شهر الدفع', fr: 'Mois de paiement', en: 'Payment Month' },
  total_payroll: { ar: 'كتلة الأجور', fr: 'Masse Salariale', en: 'Total Payroll' },
  batch_pay: { ar: 'دفع للجميع', fr: 'Tout Payer', en: 'Batch Pay All' },
  upcoming_exams: { ar: 'الامتحانات القادمة', fr: 'Examens à venir', en: 'Upcoming Exams' },

  // Login
  welcome: { ar: 'مرحباً بكم في أكاديمية سامي', fr: 'Bienvenue à Samy Academy', en: 'Welcome to Samy Academy' },
  login_desc: { ar: 'أدخل بيانات الدخول للوصول إلى البوابة.', fr: 'Entrez vos identifiants pour accéder au portail.', en: 'Enter your credentials to access the portal.' },
  signin: { ar: 'تسجيل الدخول', fr: 'Se Connecter', en: 'Sign In' },
  email: { ar: 'البريد الإلكتروني', fr: 'Email', en: 'Email' },
  password: { ar: 'كلمة المرور', fr: 'Mot de passe', en: 'Password' },

  // Misc
  currency: { ar: 'د.ج', fr: 'DA', en: 'DA' },
  cash_payment: { ar: 'دفع نقدي', fr: 'Paiement en espèces', en: 'Cash payment' },

  // Pointage Terminal
  pointage_terminal: { ar: 'بوابة تسجيل الحضور', fr: "Terminal d'Entrée", en: 'Gate Token Terminal' },
  scan_instruction: { ar: 'يرجى تمرير البطاقة (RFID أو تجريبي)', fr: 'Veuillez scanner un jeton (RFID/Simulation)', en: 'Please scan a token (RFID or Simulation)' },
  pointage_logs: { ar: 'سجل الحضور والدخول', fr: 'Historique des Pointages', en: 'Scans & Attendance Log' },
  assign_token: { ar: 'ربط بطاقة', fr: 'Associer Jeton', en: 'Assign Token' },
  token_id: { ar: 'رمز البطاقة', fr: 'Code Jeton', en: 'Token ID' },
  no_token_assigned: { ar: 'لا توجد بطاقة', fr: 'Aucun jeton associé', en: 'No token assigned' },
  student_scan_outcome_paid: { ar: 'التلميذ مسدد - الدخول مسموح ✓', fr: 'Élève en règle - Accès Autorisé ✓', en: 'Student paid - Access authorized ✓' },
  student_scan_outcome_unpaid: { ar: 'التلميذ غير مسدد - الدخول مرفوض ✗', fr: 'Élève non à jour - Accès Bloqué ✗', en: 'Student unpaid - Access blocked! ✗' },
  teacher_scan_outcome: { ar: 'تم تسجيل حضور الأستاذ ✓', fr: 'Présence Enseignante Enregistrée ✓', en: 'Teacher clock-in attendance registered ✓' },
  clear_logs: { ar: 'مسح السجل', fr: "Effacer l'historique", en: 'Clear logs' },
};

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
  tr: (ar: string, fr: string, en: string) => string;
  isRTL: boolean;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguage] = useState<Language>(() => {
    if (!localStorage.getItem('lang_default_ar_v1')) {
      localStorage.setItem('lang_default_ar_v1', '1');
      localStorage.setItem('lang', 'ar');
      return 'ar';
    }
    const saved = localStorage.getItem('lang') as Language;
    return (saved === 'ar' || saved === 'fr' || saved === 'en') ? saved : 'ar';
  });

  useEffect(() => {
    localStorage.setItem('lang', language);
    document.documentElement.dir = language === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = language;
  }, [language]);

  const t = (key: string) => {
    if (!translations[key]) return key;
    return translations[key][language] || translations[key]['ar'];
  };

  const tr = (ar: string, fr: string, en: string) => {
    if (language === 'ar') return ar;
    if (language === 'fr') return fr;
    return en;
  };

  const isRTL = language === 'ar';

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t, tr, isRTL }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) throw new Error('useLanguage must be used within LanguageProvider');
  return context;
}
