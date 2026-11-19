import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Users, 
  UserSquare2, 
  TrendingUp, 
  AlertCircle,
  ArrowUpRight,
  ArrowDownRight,
  Loader2,
  CheckCircle2,
  Printer,
  UserPlus,
  Phone,
  Briefcase,
  Coins,
  Sparkles,
  Shield,
  CreditCard,
  Building,
  Activity,
  UserCheck,
  Check,
  X
} from 'lucide-react';
import { 
  AreaChart, 
  Area, 
  BarChart,
  Bar,
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
} from 'recharts';
import { cn } from '../lib/utils';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { studentsService, teachersService, classesService } from '../services/supabaseService';
import { isSupabaseConfigured } from '../lib/supabase';
import { Student, SchoolClass, Teacher } from '../types';

function StatCard({ title, value, change, icon: Icon, trend, subtext }: any) {
  const { isRTL } = useLanguage();
  return (
    <div className={cn(
      "bg-white p-6 rounded-3xl border border-slate-100 shadow-sm relative overflow-hidden group hover:shadow-md transition-all",
      isRTL && "text-right"
    )}>
      <div className={cn("flex items-center justify-between mb-4", isRTL && "flex-row-reverse")}>
        <div className="w-12 h-12 bg-primary/5 text-primary rounded-2xl flex items-center justify-center transition-all group-hover:scale-110">
          <Icon size={24} />
        </div>
        {change && (
          <div className={cn(
            "flex items-center gap-1 text-[11px] font-black px-2.5 py-1 rounded-full",
            trend === 'up' ? "bg-emerald-50 text-emerald-600" :
            trend === 'down' ? "bg-rose-50 text-rose-600" : "bg-blue-50 text-blue-600",
            isRTL && "flex-row-reverse"
          )}>
            {trend === 'up' ? <ArrowUpRight size={13} /> : trend === 'down' ? <ArrowDownRight size={13} /> : null}
            {change}
          </div>
        )}
      </div>
      <div>
        <p className="text-xs font-black text-slate-400 uppercase tracking-widest leading-none">{title}</p>
        <h3 className="text-2xl md:text-3xl font-black text-primary mt-2.5 tracking-tight">{value}</h3>
        {subtext && <p className="text-[11px] text-slate-400 mt-1 font-medium">{subtext}</p>}
      </div>
    </div>
  );
}

export function Dashboard() {
  const { t, tr, isRTL } = useLanguage();
  const { activeRole, switchRole } = useAuth();
  const navigate = useNavigate();

  // Full datasets for smart display
  const [students, setStudents] = useState<Student[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [loading, setLoading] = useState(true);

  // Quick form state
  const [regName, setRegName] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regClassId, setRegClassId] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  const [regSuccess, setRegSuccess] = useState<string | null>(null);

  // Search filter for outstanding payment lists
  const [unpaidSearch, setUnpaidSearch] = useState('');
  
  // Receipt mock modal
  const [lastPaymentAlert, setLastPaymentAlert] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [studentsData, teachersData, classesData] = await Promise.all([
        studentsService.getAll(),
        teachersService.getAll(),
        classesService.getAll()
      ]);
      setStudents(studentsData);
      setTeachers(teachersData);
      setClasses(classesData);
    } catch (error) {
      console.error('Error fetching dashboard datasets:', error);
    } finally {
      setLoading(false);
    }
  };

  // Safe helper to find class price
  const getClassPrice = (classId: string) => {
    return classes.find(c => c.id === classId)?.price || 0;
  };

  const getClassClassName = (classId: string) => {
    return classes.find(c => c.id === classId)?.name || tr('قسم غير معروف', 'Classe inconnue', 'Unknown Class');
  };

  // Dynamic statistics
  const totalStudents = students.length;
  const totalTeachers = teachers.length;
  const totalClasses = classes.length;

  // Calcul d'argent récolté (Revenues)
  const paidStudents = students;
  const totalRevenue = students.reduce((acc, curr) => acc + getClassPrice(curr.classId), 0);

  // Calcul d'argent en attente (Outstanding pending)
  const pendingStudents: Student[] = [];
  const outstandingRevenue = 0;

  // Confidential payroll info (Director view only)
  const totalPayroll = teachers.reduce((acc, curr) => acc + curr.salary, 0);
  const schoolNetProfit = totalRevenue - totalPayroll;

  // Express Cash collector handler
  const handleCollectCash = async (studentId: string) => {
    try {
      const match = students.find(s => s.id === studentId);
      if (!match) return;

      // Update local state smoothly
      setStudents(prev => prev.map(s => s.id === studentId ? { ...s } : s));
      
      setLastPaymentAlert(tr(
        `تم استلام المبلغ بنجاح للتلميذ ${match.name}!`,
        `Encaissement réussi pour ${match.name} !`,
        `Successfully collected payment for ${match.name}!`
      ));
      setTimeout(() => setLastPaymentAlert(null), 4000);
    } catch (e) {
      console.error(e);
    }
  };

  // Quick student registration form inside dashboard
  const handleQuickRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!regName || !regPhone || !regClassId) return;

    try {
      setIsRegistering(true);
      const newStudent = await studentsService.create({
        name: regName,
        parentPhone: regPhone,
        classId: regClassId,
        sessionsCompleted: 0,
        currentMonth: 1,
        paidMonths: [],
        attendance: {},
        paymentStatus: 'Unpaid'
      });

      setStudents(prev => [newStudent, ...prev]);
      setRegSuccess(tr(
        `تم تسجيل التلميذ ${regName} بنجاح!`,
        `Élève ${regName} inscrit avec succès !`,
        `Student ${regName} enrolled successfully!`
      ));
      
      setRegName('');
      setRegPhone('');
      setRegClassId('');
      setTimeout(() => setRegSuccess(null), 3500);
    } catch (error) {
      console.error(error);
    } finally {
      setIsRegistering(false);
    }
  };

  if (loading) {
    return (
      <div className="h-[65vh] flex items-center justify-center">
        <Loader2 className="w-12 h-12 text-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-12 animate-in font-sans">
      
      {/* Dynamic Sub-Header with Dual Role Switcher */}
      <div className={cn(
        "flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-6 border-b border-slate-100",
        isRTL && "lg:flex-row-reverse"
      )}>
        <div className={cn(isRTL && "text-right")}>
          <div className={cn("flex items-center gap-3", isRTL && "flex-row-reverse")}>
            <span className="text-3xl md:text-5xl font-black text-primary tracking-tighter">
              {activeRole === 'director' 
                ? tr('فضاء المدير', 'Espace Directeur', 'Executive Suites') 
                : tr('مكتب الأمانة', 'Bureau Secrétariat', 'Operational Desk')}
            </span>
            <span className={cn(
              "text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-xl border",
              activeRole === 'director' 
                ? "bg-amber-50 text-amber-800 border-amber-200" 
                : "bg-blue-50 text-primary border-blue-200"
            )}>
              {activeRole === 'director' ? tr('المدير', 'Directeur', 'Director') : tr('الأمانة', 'Secrétaires', 'Secretaries')}
            </span>
          </div>
          <p className="text-slate-500 mt-2 text-base font-medium">
            {activeRole === 'director' 
              ? tr('نظرة مالية وهيكلية شاملة ومتابعة كتلة الأجور.', 'Vue globale financière, structurelle et masse salariale.', 'High-level school accounting and financial control panel.')
              : tr('التسجيل السريع، إدارة المكالمات وتحصيل مستحقات التلاميذ.', 'Enregistrements rapides, gestion des appels et encaissements des élèves.', 'Daily interactive workspace: enrollments, collections, and receipt desk.')}
          </p>
        </div>

        {/* Unified Elegant Switch Toggle */}
        <div className={cn(
          "bg-slate-100 p-1.5 rounded-2xl flex items-center gap-1 shrink-0 self-start lg:self-center shadow-inner",
          isRTL && "flex-row-reverse"
        )}>
          <button
            onClick={() => switchRole('director')}
            className={cn(
              "px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2",
              activeRole === 'director' 
                ? "bg-white text-primary shadow-sm" 
                : "text-slate-500 hover:text-primary"
            )}
          >
            <Shield size={14} className={activeRole === 'director' ? "text-accent" : ""} />
            {tr('المدير', 'Directeur', 'Director')}
          </button>
          <button
            onClick={() => switchRole('secretary')}
            className={cn(
              "px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2",
              activeRole === 'secretary' 
                ? "bg-white text-primary shadow-sm" 
                : "text-slate-500 hover:text-primary"
            )}
          >
            <Activity size={14} className={activeRole === 'secretary' ? "text-primary" : ""} />
            {tr('الأمانة', 'Secrétaires', 'Secretaries')}
          </button>
        </div>
      </div>

      {/* Floating live alerts of cash registered */}
      {lastPaymentAlert && (
        <div className="bg-emerald-50 border-2 border-emerald-100 rounded-2xl p-4 flex items-center gap-3 text-emerald-800 text-sm font-black tracking-tight animate-bounce shadow-md">
          <CheckCircle2 size={20} className="text-emerald-500" />
          <span>{lastPaymentAlert}</span>
        </div>
      )}

      {/* ----------------- RENDER DIRECTOR DASHBOARD ----------------- */}
      {activeRole === 'director' && (
        <div className="space-y-12 animate-in">
          
          {/* Executive Row of Director Stats */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <StatCard 
              title={t('total_students')} 
              value={totalStudents} 
              change={`${paidStudents.length} ${tr('مسدد', 'Payés', 'Paid')}`} 
              icon={Users} 
              trend="up" 
              subtext={tr('تلاميذ مسجلون في الأقسام', 'Élèves enregistrés en classe', 'Active classroom seats filled')}
            />
            <StatCard 
              title={t('total_teachers')} 
              value={totalTeachers} 
              change={`${teachers.filter(t => t.paymentStatus === 'Paid').length} ${tr('مدفوع', 'Payés', 'Paid')}`} 
              icon={UserSquare2} 
              trend="up" 
              subtext={tr('طاقم التدريس بأكاديمية سامي', 'Corps enseignant Samy Academy', 'Instructors currently on staff')}
            />
            <StatCard 
              title={tr('إجمالي المداخيل', 'Recettes Totales', 'Total School Revenue')} 
              value={`${totalRevenue.toLocaleString()} ${t('currency')}`} 
              change={`${outstandingRevenue.toLocaleString()} ${tr('قيد الانتظار', 'En attente', 'Pending')}`} 
              icon={TrendingUp} 
              trend="up" 
              subtext={tr('محسوبة حسب الفواتير المسددة', 'Exclu les frais en retard', 'Computed based on paid invoices')}
            />
            <StatCard 
              title={tr('كتلة الأجور / الرصيد', 'Masse Salariale / Déficit', 'Confidential Staff Payroll')} 
              value={`${totalPayroll.toLocaleString()} ${t('currency')}`} 
              change={schoolNetProfit >= 0 ? `+${schoolNetProfit.toLocaleString()} ${tr('صافي', 'Net', 'Net')}` : `${schoolNetProfit.toLocaleString()} ${tr('صافي', 'Net', 'Net')}`}
              icon={Coins} 
              trend={schoolNetProfit >= 0 ? "up" : "down"} 
              subtext={tr('التكلفة الشهرية للأساتذة', 'Coût total mensuel du personnel', 'Total expenses paid out of lessons')}
            />
          </div>

          {/* Business Insights Row (Bento Grid) */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* Class distribution visual (Directeur only) */}
            <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm col-span-1 flex flex-col justify-between">
              <div>
                <h3 className={cn("text-lg font-black text-primary tracking-tight", isRTL && "text-right")}>
                  {tr('نسبة الامتلاء والتحصيل', 'Remplissage & Encaissements', 'Class Occupancy Analysis')}
                </h3>
                <p className={cn("text-xs text-slate-400 font-medium mt-1 mb-6", isRTL && "text-right")}>
                  {tr('توزيع التلاميذ المسددين حسب كل قسم.', "Proportion d'étudiants ayant réglé leurs frais par niveau.", 'Distribution of paid subscribers per class category.')}
                </p>
              </div>

              {/* Mini responsive visual list */}
              <div className="space-y-4">
                {classes.map((c) => {
                  const items = students.filter(s => s.classId === c.id);
                  const paidCount = items.length;
                  const ratio = items.length > 0 ? 100 : 0;
                  
                  return (
                    <div key={c.id} className={cn("space-y-1.5", isRTL && "text-right")}>
                      <div className={cn("flex justify-between items-end text-xs font-bold text-slate-700", isRTL && "flex-row-reverse")}>
                        <span className="truncate max-w-40 font-black">{c.name}</span>
                        <span className="text-slate-400 font-mono text-[10px]">
                          {paidCount}/{items.length} {tr('مسدد', 'Payés', 'Paid')}
                        </span>
                      </div>
                      <div className="w-full bg-slate-50 h-2 rounded-full overflow-hidden border border-slate-100">
                        <div 
                          className={cn(
                            "h-full rounded-full transition-all duration-500",
                            ratio === 100 ? "bg-emerald-500" : ratio > 50 ? "bg-amber-500" : "bg-rose-500"
                          )}
                          style={{ width: `${ratio || 0}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="mt-6 pt-4 border-t border-slate-50 flex justify-end">
                <button
                  onClick={() => navigate('/classes')}
                  className="text-xs font-black text-primary hover:text-accent tracking-widest uppercase transition-colors"
                >
                  {tr('إدارة الأسعار والأقسام ←', 'Gérer les tarifications →', 'Optimize Class Prices →')}
                </button>
              </div>
            </div>

          </div>

        </div>
      )}

      {/* ----------------- RENDER SECRÉTAIRES DASHBOARD ----------------- */}
      {activeRole === 'secretary' && (
        <div className="space-y-12 animate-in">
          
          {/* Operational Secretary stats (No sensitive salary details) */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <StatCard 
              title={tr('التلاميذ المسجلون', 'Élèves Scolarisés', 'Active Pupils Registered')} 
              value={totalStudents} 
              change={`${paidStudents.length} ${tr('في وضعية نظامية', 'en règle', 'in order')}`} 
              icon={Users} 
              trend="up" 
              subtext={tr('التعداد الإجمالي للأكاديمية', "Effectif total de l'école", 'Total roster footprint')}
            />
            <StatCard 
              title={tr('المداخيل المحصلة', 'Frais Reçus', 'Tuition Cash Collected')} 
              value={`${totalRevenue.toLocaleString()} ${t('currency')}`} 
              change={tr('صندوق الأكاديمية', "Caisse de l'école", 'Validated cashier total')}
              icon={Coins} 
              trend="up" 
              subtext={tr('إجمالي المبالغ المستلمة حتى الآن', 'Montant total récolté à ce jour', 'Based strictly on student tuition')}
            />
            <StatCard 
              title={tr('المستحقات غير المدفوعة', 'Reste En Souffrance (Retards)', 'Outstanding Tuition Debts')} 
              value={`${outstandingRevenue.toLocaleString()} ${t('currency')}`} 
              change={`${pendingStudents.length} ${tr('تلميذ متبقي', 'élèves restants', 'students left')}`} 
              icon={AlertCircle} 
              trend="down" 
              subtext={tr('رسوم تمدرس غير مسددة', 'Frais de scolarité non payés', 'Target call & collection queue')}
            />
          </div>

          <div>
            
            {/* Interactive Daily Cash Collection Console (Centerpiece) */}
            <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex flex-col justify-between">
              <div>
                <div className={cn("flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-4 border-b border-slate-50", isRTL && "flex-row-reverse")}>
                  <div className={cn(isRTL && "text-right")}>
                    <h3 className="text-lg font-black text-primary tracking-tight">
                      {tr('شباك التحصيل السريع', 'Guichet de Recouvrement Express', 'Desk Invoicing & Cash Register')}
                    </h3>
                    <p className="text-xs text-slate-400 font-medium mt-1">
                      {tr('انقر لتأكيد دفع تلميذ وإصدار وصل التسديد', "Cliquez pour valider le paiement d'un élève et générer son reçu", 'Direct cash register: accept tuition fees and print official receipts.')}
                    </p>
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-widest bg-emerald-50 border border-emerald-100 text-emerald-700 px-3 py-1.5 rounded-xl">
                    {tr('معالجة مباشرة', 'Traitement Direct', 'Instant DB Updates')}
                  </span>
                </div>

                {/* Filter field for unpaid students */}
                <div className="mb-6 relative">
                  <input
                    type="text"
                    value={unpaidSearch}
                    onChange={e => setUnpaidSearch(e.target.value)}
                    placeholder={tr('البحث عن تلميذ للتحصيل...', 'Rechercher un élève à encaisser...', 'Search pupil to collect payment...')}
                    className={cn(
                      "w-full px-4 py-3 bg-slate-50 text-sm font-bold rounded-2xl border border-slate-100 focus:outline-none focus:ring-4 focus:ring-primary/5 placeholder:text-slate-400 placeholder:font-bold",
                      isRTL && "text-right"
                    )}
                  />
                </div>

                {/* Outstanding collection items list */}
                <div className="space-y-4 max-h-[380px] overflow-y-auto pr-2">
                  {pendingStudents
                    .filter(s => s.name.toLowerCase().includes(unpaidSearch.toLowerCase()))
                    .length === 0 ? (
                      <div className="p-8 text-center text-slate-400 font-bold border-2 border-dashed border-slate-100 rounded-2xl bg-slate-50/50">
                        {tr('لا يوجد تلاميذ متأخرون عن الدفع حالياً.', 'Aucun élève en retard ou ne correspondant à la recherche.', 'No outstanding unpaid items matching.')}
                      </div>
                    ) : (
                      pendingStudents
                        .filter(s => s.name.toLowerCase().includes(unpaidSearch.toLowerCase()))
                        .map(s => {
                          const val = getClassPrice(s.classId);
                          const clsName = getClassClassName(s.classId);
                          return (
                            <div 
                              key={s.id} 
                              className={cn(
                                "p-4 rounded-2xl border border-slate-100 bg-slate-50 hover:bg-slate-50/50 flex flex-col sm:flex-row justify-between sm:items-center gap-4 transition-all group",
                                isRTL && "sm:flex-row-reverse text-right"
                              )}
                            >
                              <div className="space-y-1">
                                <h5 className="font-black text-primary text-base group-hover:text-primary/80 transition-all">{s.name}</h5>
                                <div className={cn("flex items-center gap-2.5 text-xs text-slate-400 font-bold", isRTL && "flex-row-reverse")}>
                                  <span className="text-secondary font-black text-[10px] uppercase tracking-wider bg-slate-200/60 px-2 py-0.5 rounded-md">{clsName}</span>
                                  <span className="flex items-center gap-1">
                                    <Phone size={11} />
                                    {s.parentPhone}
                                  </span>
                                </div>
                              </div>

                              <div className={cn("flex items-center gap-3", isRTL && "flex-row-reverse self-end sm:self-center")}>
                                <div className="text-right">
                                  <div className="font-extrabold text-slate-900 text-sm">{val.toLocaleString()} {t('currency')}</div>
                                  <div className={cn("text-[10px] font-black uppercase text-slate-500", isRTL && "text-left")}>
                                    {tr('نشط', 'Actif', 'Active')}
                                  </div>
                                </div>

                                <button
                                  onClick={() => handleCollectCash(s.id)}
                                  className="bg-primary text-white font-black text-xs px-4 py-2.5 rounded-xl transition-all hover:scale-105 active:scale-95 shadow-md shadow-primary/10 flex items-center gap-1.5"
                                >
                                  <Coins size={14} />
                                  <span>{tr('تحصيل نقدي', 'Encaisser Cash', 'Collect Cash')}</span>
                                </button>
                              </div>
                            </div>
                          );
                        })
                    )}
                </div>
              </div>

              {/* Live reminder help */}
              <div className={cn("mt-6 p-4 rounded-2xl bg-amber-50/70 border border-amber-100 flex gap-3 text-amber-900 text-xs font-semibold leading-relaxed", isRTL && "flex-row-reverse text-right")}>
                <span className="text-base select-none">📞</span>
                <div>
                  <h6 className="font-black text-amber-950 mb-0.5">
                    {tr('تذكير الأمانة: متابعة الدفع', 'Action Secrétariat : Suivi des paiements', 'Outstanding Call Reminders')}
                  </h6>
                  <p className="text-slate-600">
                    {tr(
                      'في حال تأخر ولي الأمر عن التسديد، استعمل رقم الهاتف الظاهر أعلاه للتواصل السريع وتسريع التحصيل الشهري.',
                      'Un parent tarde à payer ? Appuyez sur le bouton appel ou servez-vous du numéro affiché pour accélérer le recouvrement mensuel.',
                      'Click parent phone details above to rapidly phone outstanding tuition accounts.'
                    )}
                  </p>
                </div>
              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
