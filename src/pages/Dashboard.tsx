import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  UserSquare2,
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
  Loader2,
  Coins
} from 'lucide-react';
import { cn } from '../lib/utils';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { studentsService, teachersService, classesService } from '../services/supabaseService';
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
  const { user } = useAuth();
  const navigate = useNavigate();

  const [students, setStudents] = useState<Student[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [loading, setLoading] = useState(true);

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

  const getClassPrice = (classId: string) => {
    return classes.find(c => c.id === classId)?.price || 0;
  };

  const totalStudents = students.length;
  const totalTeachers = teachers.length;
  const paidStudents = students;
  const totalRevenue = students.reduce((acc, curr) => acc + getClassPrice(curr.classId), 0);
  const outstandingRevenue = 0;
  const totalPayroll = teachers.reduce((acc, curr) => acc + curr.salary, 0);
  const schoolNetProfit = totalRevenue - totalPayroll;

  if (loading) {
    return (
      <div className="h-[65vh] flex items-center justify-center">
        <Loader2 className="w-12 h-12 text-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-12 animate-in font-sans">
      {/* Unified Header for both Director & Secretary */}
      <div className={cn(
        "flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-6 border-b border-slate-100",
        isRTL && "lg:flex-row-reverse"
      )}>
        <div className={cn(isRTL && "text-right")}>
          <div className={cn("flex items-center gap-3", isRTL && "flex-row-reverse")}>
            <span className="text-3xl md:text-5xl font-black text-primary tracking-tighter">
              {t('dashboard')}
            </span>
            <span className={cn(
              "text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-xl border",
              user?.role === 'director'
                ? "bg-amber-50 text-amber-800 border-amber-200"
                : "bg-blue-50 text-primary border-blue-200"
            )}>
              {user?.role === 'director' ? tr('المدير', 'Directeur', 'Director') : tr('الأمانة', 'Secrétariat', 'Secretary')}
            </span>
          </div>
          <p className="text-slate-500 mt-2 text-base font-medium">
            {tr(
              'نظرة مالية وهيكلية شاملة ومتابعة الأقسام وكتلة الأجور.',
              'Vue globale financière, structurelle, classes et masse salariale.',
              'Complete financial overview, class occupancy, and staff payroll control panel.'
            )}
          </p>
        </div>
      </div>

      {/* Unified Executive Dashboard Content */}
      <div className="space-y-12 animate-in">
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
            title={tr('كتلة الأجور / الرصيد', 'Masse Salariale / Déficit', 'Staff Payroll / Balance')}
            value={`${totalPayroll.toLocaleString()} ${t('currency')}`}
            change={schoolNetProfit >= 0 ? `+${schoolNetProfit.toLocaleString()} ${tr('صافي', 'Net', 'Net')}` : `${schoolNetProfit.toLocaleString()} ${tr('صافي', 'Net', 'Net')}`}
            icon={Coins}
            trend={schoolNetProfit >= 0 ? "up" : "down"}
            subtext={tr('التكلفة الشهرية للأساتذة', 'Coût total mensuel du personnel', 'Total monthly staff payroll')}
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm col-span-1 flex flex-col justify-between">
            <div>
              <h3 className={cn("text-lg font-black text-primary tracking-tight", isRTL && "text-right")}>
                {tr('نسبة الامتلاء والتحصيل', 'Remplissage & Encaissements', 'Class Occupancy Analysis')}
              </h3>
              <p className={cn("text-xs text-slate-400 font-medium mt-1 mb-6", isRTL && "text-right")}>
                {tr('توزيع التلاميذ المسددين حسب كل قسم.', "Proportion d'étudiants ayant réglé leurs frais par niveau.", 'Distribution of paid subscribers per class category.')}
              </p>
            </div>

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
    </div>
  );
}
