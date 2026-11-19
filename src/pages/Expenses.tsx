import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Search, 
  Trash2, 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Receipt, 
  Building2, 
  Zap, 
  Wrench, 
  ShoppingBag, 
  Megaphone, 
  Landmark, 
  HelpCircle,
  Calendar,
  FileSpreadsheet,
  PieChart,
  Edit2
} from 'lucide-react';
import { cn } from '../lib/utils';
import { useLanguage } from '../context/LanguageContext';
import { Modal } from '../components/Modal';
import { Expense, ExpenseCategory, Student, Teacher, SchoolClass, RentVaultConfig } from '../types';
import { expensesService, studentsService, teachersService, classesService, rentVaultService } from '../services/supabaseService';

const CATEGORY_CONFIG: Record<ExpenseCategory, { ar: string; fr: string; en: string; icon: React.ElementType; color: string }> = {
  rent: { ar: 'كراء المقر', fr: 'Loyer des locaux', en: 'Premises Rent', icon: Building2, color: 'bg-amber-50 text-amber-700 border-amber-200' },
  utilities: { ar: 'الكهرباء والماء والأنترنت', fr: 'Électricité, Eau & Web', en: 'Electricity, Water & Web', icon: Zap, color: 'bg-blue-50 text-blue-700 border-blue-200' },
  salaries: { ar: 'الرواتب والمكافآت', fr: 'Salaires & Primes', en: 'Salaries & Bonuses', icon: DollarSign, color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  supplies: { ar: 'اللوازم والأدوات', fr: 'Fournitures & Matériel', en: 'Supplies & Equipment', icon: ShoppingBag, color: 'bg-purple-50 text-purple-700 border-purple-200' },
  maintenance: { ar: 'الصيانة والإصلاح', fr: 'Maintenance & Entretien', en: 'Maintenance & Repairs', icon: Wrench, color: 'bg-orange-50 text-orange-700 border-orange-200' },
  marketing: { ar: 'التسويق والإعلانات', fr: 'Marketing & Pub', en: 'Marketing & Ads', icon: Megaphone, color: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
  taxes: { ar: 'الضرائب والرسوم', fr: 'Taxes & Impôts', en: 'Taxes & Fees', icon: Landmark, color: 'bg-rose-50 text-rose-700 border-rose-200' },
  other: { ar: 'مصاريف أخرى', fr: 'Autres charges', en: 'Other Expenses', icon: HelpCircle, color: 'bg-slate-50 text-slate-700 border-slate-200' },
};

const MONTH_NAMES_AR = [
  'يناير', 'فبراير', 'مارس', 'أبريل', 
  'ماي', 'يونيو', 'يوليو', 'أوت', 
  'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'
];

const MONTH_NAMES_FR = [
  'Janvier', 'Février', 'Mars', 'Avril', 
  'Mai', 'Juin', 'Juillet', 'Août', 
  'Septembre', 'Octobre', 'Novembre', 'Décembre'
];

const MONTH_NAMES_EN = [
  'January', 'February', 'March', 'April',
  'May', 'June', 'July', 'August',
  'September', 'October', 'November', 'December'
];

export function Expenses() {
  const { t, tr, language, isRTL } = useLanguage();
  
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [rentVault, setRentVault] = useState<RentVaultConfig>({ targetAnnualRent: 180000, deposits: [] });
  const [isLoading, setIsLoading] = useState(true);

  const [selectedYear, setSelectedYear] = useState<number>(2026);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('all');

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newAmount, setNewAmount] = useState('');
  const [newCategory, setNewCategory] = useState<ExpenseCategory>('utilities');
  const [newDate, setNewDate] = useState(new Date().toISOString().split('T')[0]);
  const [newNotes, setNewNotes] = useState('');

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingExpenseId, setEditingExpenseId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editAmount, setEditAmount] = useState('');
  const [editCategory, setEditCategory] = useState<ExpenseCategory>('utilities');
  const [editDate, setEditDate] = useState('');
  const [editNotes, setEditNotes] = useState('');

  const [isDepositModalOpen, setIsDepositModalOpen] = useState(false);
  const [depositAmount, setDepositAmount] = useState('');
  const [depositMonth, setDepositMonth] = useState(new Date().getMonth() + 1);
  const [depositNote, setDepositNote] = useState('');

  const [isEditTargetModalOpen, setIsEditTargetModalOpen] = useState(false);
  const [editTargetRentAmount, setEditTargetRentAmount] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [expData, studData, teachData, classData, vaultData] = await Promise.all([
        expensesService.getAll(),
        studentsService.getAll(),
        teachersService.getAll(),
        classesService.getAll(),
        rentVaultService.getConfig()
      ]);
      setExpenses(expData);
      setStudents(studData);
      setTeachers(teachData);
      setClasses(classData);
      setRentVault(vaultData);
      setEditTargetRentAmount(String(vaultData.targetAnnualRent));
    } catch (err) {
      console.error('Failed to load expenses or financial data', err);
    } finally {
      setIsLoading(false);
    }
  };

  const getCategoryLabel = (cat: ExpenseCategory) => {
    const conf = CATEGORY_CONFIG[cat] || CATEGORY_CONFIG.other;
    return conf[language] || conf.ar;
  };

  const classMap = new Map<string, SchoolClass>(classes.map(c => [c.id, c]));

  const totalRevenue = students.reduce((acc, student) => {
    const cls = classMap.get(student.classId);
    const price = cls ? cls.price : 2000;
    const paidCount = student.paidMonths ? student.paidMonths.length : 0;
    return acc + (paidCount * price);
  }, 0);

  const yearExpenses = expenses.filter(e => e.year === selectedYear || new Date(e.date).getFullYear() === selectedYear);
  const loggedExpensesTotal = yearExpenses.reduce((sum, e) => sum + e.amount, 0);

  const teacherPayrollTotal = teachers.reduce((sum, teacher) => {
    const monthsPaid = teacher.paidMonths ? teacher.paidMonths.length : (teacher.paymentStatus === 'Paid' ? 1 : 0);
    return sum + (teacher.salary * monthsPaid);
  }, 0);

  const yearVaultDeposits = rentVault.deposits.filter(d => d.year === selectedYear || new Date(d.date).getFullYear() === selectedYear);
  const totalSavedInVault = yearVaultDeposits.reduce((acc, d) => acc + d.amount, 0);
  const targetRent = rentVault.targetAnnualRent || 180000;
  const suggestedMonthlySavings = Math.round(targetRent / 12);

  const grandTotalExpenses = loggedExpensesTotal + teacherPayrollTotal;
  const netProfitOrLoss = totalRevenue - grandTotalExpenses;
  const netProfitAfterRentVault = netProfitOrLoss - totalSavedInVault;
  const isProfit = netProfitOrLoss >= 0;

  const categoryBreakdown = (Object.keys(CATEGORY_CONFIG) as ExpenseCategory[]).map(cat => {
    const catExpenses = yearExpenses.filter(e => e.category === cat);
    const total = catExpenses.reduce((s, e) => s + e.amount, 0);
    return { category: cat, total, count: catExpenses.length };
  }).filter(c => c.total > 0);

  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newAmount || Number(newAmount) <= 0) return;

    setIsSubmitting(true);
    try {
      const expenseDate = new Date(newDate);
      const created = await expensesService.create({
        title: newTitle.trim(),
        amount: Number(newAmount),
        category: newCategory,
        date: newDate,
        month: expenseDate.getMonth() + 1,
        year: expenseDate.getFullYear(),
        notes: newNotes.trim()
      });

      setExpenses(prev => [created, ...prev]);
      setIsAddModalOpen(false);
      setNewTitle('');
      setNewAmount('');
      setNewNotes('');
    } catch (err) {
      console.error('Failed to create expense', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteExpense = async (id: string) => {
    if (!window.confirm(tr('هل أنت متأكد من حذف هذا المصروف؟', 'Voulez-vous vraiment supprimer cette charge ?', 'Are you sure you want to delete this expense?'))) return;
    try {
      await expensesService.delete(id);
      setExpenses(prev => prev.filter(e => e.id !== id));
    } catch (err) {
      console.error('Failed to delete expense', err);
    }
  };

  const handleStartEdit = (expense: Expense) => {
    setEditingExpenseId(expense.id);
    setEditTitle(expense.title);
    setEditAmount(String(expense.amount));
    setEditCategory(expense.category);
    setEditDate(expense.date);
    setEditNotes(expense.notes || '');
    setIsEditModalOpen(true);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingExpenseId || !editTitle.trim() || !editAmount || Number(editAmount) <= 0) return;

    setIsSubmitting(true);
    try {
      const expenseDate = new Date(editDate);
      const updated = await expensesService.update(editingExpenseId, {
        title: editTitle.trim(),
        amount: Number(editAmount),
        category: editCategory,
        date: editDate,
        month: expenseDate.getMonth() + 1,
        year: expenseDate.getFullYear(),
        notes: editNotes.trim()
      });

      setExpenses(prev => prev.map(exp => exp.id === editingExpenseId ? updated : exp));
      setIsEditModalOpen(false);
      setEditingExpenseId(null);
    } catch (err) {
      console.error('Failed to update expense', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddVaultDeposit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!depositAmount || Number(depositAmount) <= 0) return;

    setIsSubmitting(true);
    try {
      const today = new Date().toISOString().split('T')[0];
      const updatedVault = await rentVaultService.addDeposit({
        amount: Number(depositAmount),
        date: today,
        month: Number(depositMonth),
        year: selectedYear,
        note: depositNote.trim() || tr(
          `اقتطاع شهري للكراء - ${MONTH_NAMES_AR[depositMonth - 1] || depositMonth}`,
          `Épargne mensuelle du loyer - ${MONTH_NAMES_FR[depositMonth - 1] || depositMonth}`,
          `Monthly rent savings - ${MONTH_NAMES_EN[depositMonth - 1] || depositMonth}`
        )
      });

      setRentVault(updatedVault);
      setIsDepositModalOpen(false);
      setDepositAmount('');
      setDepositNote('');
    } catch (err) {
      console.error('Failed to add deposit to rent piggy bank', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateTargetRent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editTargetRentAmount || Number(editTargetRentAmount) <= 0) return;

    setIsSubmitting(true);
    try {
      const updatedVault = await rentVaultService.updateTarget(Number(editTargetRentAmount));
      setRentVault(updatedVault);
      setIsEditTargetModalOpen(false);
    } catch (err) {
      console.error('Failed to update target rent amount', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredExpenses = yearExpenses.filter(exp => {
    const matchesSearch = exp.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          (exp.notes && exp.notes.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesCategory = selectedCategoryFilter === 'all' || exp.category === selectedCategoryFilter;
    return matchesSearch && matchesCategory;
  });

  const monthList = language === 'ar' ? MONTH_NAMES_AR : language === 'fr' ? MONTH_NAMES_FR : MONTH_NAMES_EN;

  return (
    <div className={cn("space-y-8 pb-12", isRTL && "text-right")}>
      {/* Page Header */}
      <div className={cn("flex flex-col sm:flex-row sm:items-center justify-between gap-4", isRTL && "sm:flex-row-reverse")}>
        <div>
          <div className={cn("flex items-center gap-3", isRTL && "flex-row-reverse")}>
            <div className="w-12 h-12 bg-rose-50 text-rose-600 rounded-2xl flex items-center justify-center shrink-0 border border-rose-100">
              <Receipt size={26} />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-black text-primary tracking-tight">
                {tr('إدارة المصاريف والميزانية', 'Gestion des Charges', 'Expenses & P&L Management')}
              </h1>
            </div>
          </div>
        </div>

        <div className={cn("flex items-center gap-3", isRTL && "flex-row-reverse")}>
          <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-2xl border-2 border-slate-100 shadow-sm">
            <Calendar size={18} className="text-slate-400" />
            <span className="text-xs font-bold text-slate-500">{tr('السنة:', 'Année:', 'Year:')}</span>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="bg-transparent text-sm font-black text-primary focus:outline-none cursor-pointer"
            >
              <option value={2026}>2026</option>
              <option value={2025}>2025</option>
              <option value={2024}>2024</option>
            </select>
          </div>

          <button
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-2 bg-rose-600 hover:bg-rose-700 text-white px-4 py-2.5 rounded-2xl font-bold text-sm shadow-lg shadow-rose-600/20 transition-all active:scale-95"
          >
            <Plus size={18} />
            <span>{tr('إضافة مصروف', 'Ajouter une Charge', 'Add Expense')}</span>
          </button>
        </div>
      </div>

      {/* Main Financial Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="bg-white p-6 rounded-3xl border-2 border-slate-100 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              {tr('مداخيل التلاميذ', 'Recettes Étudiants', 'Student Revenue')}
            </span>
            <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl">
              <TrendingUp size={22} />
            </div>
          </div>
          <div className="mt-4">
            <p className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              {totalRevenue.toLocaleString()} <span className="text-sm font-bold text-slate-400">{t('currency')}</span>
            </p>
            <p className="text-xs font-semibold text-emerald-600 mt-1 flex items-center gap-1">
              <span>✓</span> {tr('محسوبة من الاشتراكات المدفوعة', "Calculé d'après les cotisations", 'Calculated from paid tuitions')}
            </p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-3xl border-2 border-slate-100 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              {tr('مصاريف التسيير', "Charges d'Exploitation", 'Operating Expenses')}
            </span>
            <div className="p-3 bg-rose-50 text-rose-600 rounded-2xl">
              <Receipt size={22} />
            </div>
          </div>
          <div className="mt-4">
            <p className="text-2xl sm:text-3xl font-black text-rose-600 tracking-tight">
              {loggedExpensesTotal.toLocaleString()} <span className="text-sm font-bold text-slate-400">{t('currency')}</span>
            </p>
            <p className="text-xs font-semibold text-slate-500 mt-1">
              {yearExpenses.length} {tr('مصروف مسجل', 'charges enregistrées', 'logged expenses')}
            </p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-3xl border-2 border-slate-100 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              {t('total_payroll')}
            </span>
            <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl">
              <DollarSign size={22} />
            </div>
          </div>
          <div className="mt-4">
            <p className="text-2xl sm:text-3xl font-black text-indigo-900 tracking-tight">
              {teacherPayrollTotal.toLocaleString()} <span className="text-sm font-bold text-slate-400">{t('currency')}</span>
            </p>
            <p className="text-xs font-semibold text-slate-500 mt-1">
              {teachers.length} {tr('أستاذ', 'enseignants', 'teachers')}
            </p>
          </div>
        </div>

        <div className={cn(
          "p-6 rounded-3xl border-2 shadow-md relative overflow-hidden flex flex-col justify-between transition-all",
          isProfit 
            ? "bg-emerald-900 text-white border-emerald-800" 
            : "bg-rose-950 text-white border-rose-800"
        )}>
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-emerald-200/80 uppercase tracking-wider">
                {tr('النتيجة الصافية (الميزانية)', 'Résultat Net (Bilan)', 'Net Result (P&L)')}
              </span>
              <div className={cn("p-2 rounded-xl text-white", isProfit ? "bg-emerald-700/60" : "bg-rose-800/80")}>
                {isProfit ? <TrendingUp size={22} /> : <TrendingDown size={22} />}
              </div>
            </div>

            <div className="mt-3">
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-black tracking-tight">
                  {netProfitOrLoss > 0 ? `+${netProfitOrLoss.toLocaleString()}` : netProfitOrLoss.toLocaleString()}
                </span>
                <span className="text-xs font-bold text-emerald-200/80">{t('currency')}</span>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between">
            <span className={cn(
              "px-2.5 py-1 rounded-full text-xs font-black uppercase tracking-wider flex items-center gap-1",
              isProfit ? "bg-emerald-500/30 text-emerald-200 border border-emerald-400/30" : "bg-rose-500/30 text-rose-200 border border-rose-400/30"
            )}>
              {isProfit ? (
                <><span>✓</span> {tr('ربح صافي', 'Profit Net', 'Net Profit')}</>
              ) : (
                <><span>⚠</span> {tr('عجز', 'Déficit', 'Deficit')}</>
              )}
            </span>
            <span className="text-xs font-semibold opacity-80">
              {tr('السيولة:', 'Liquides:', 'Liquid:')} {netProfitAfterRentVault.toLocaleString()} {t('currency')}
            </span>
          </div>
        </div>
      </div>

      {/* Breakdown Box & Formula */}
      <div className="bg-primary text-white rounded-3xl p-6 sm:p-8 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-accent/20 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20"></div>
        
        <div className={cn("relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6", isRTL && "lg:flex-row-reverse")}>
          <div className="space-y-2 max-w-xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/10 rounded-full text-xs font-bold text-amber-300">
              <PieChart size={14} />
              <span>{tr('حاسبة الميزانية', 'Calculateur de Bilan', 'P&L Calculator')}</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black tracking-tight">
              {tr('كيف يتم احتساب النتيجة المالية؟', 'Comment le résultat financier est-il calculé ?', 'How is the financial result calculated?')}
            </h2>
            <p className="text-slate-300 text-xs sm:text-sm leading-relaxed">
              {tr(
                'النتيجة = مداخيل الاشتراكات - (كتلة الأجور + مصاريف التسيير الإجمالية).',
                "Résultat = Recettes cotisations - (Masse salariale + Charges d'exploitation globales).",
                'Result = Tuition Revenue - (Staff Payroll + Operating Expenses).'
              )}
            </p>
          </div>

          <div className="w-full lg:w-auto bg-white/5 border border-white/10 rounded-2xl p-4 space-y-2 font-mono text-xs text-slate-200">
            <div className="flex justify-between items-center gap-6">
              <span className="text-emerald-400 font-bold">+ {tr('المداخيل:', 'Recettes:', 'Revenue:')}</span>
              <span>{totalRevenue.toLocaleString()} {t('currency')}</span>
            </div>
            <div className="flex justify-between items-center gap-6">
              <span className="text-rose-400 font-bold">- {tr('الرواتب:', 'Salaires:', 'Salaries:')}</span>
              <span>{teacherPayrollTotal.toLocaleString()} {t('currency')}</span>
            </div>
            <div className="flex justify-between items-center gap-6">
              <span className="text-rose-400 font-bold">- {tr('المصاريف:', 'Charges:', 'Expenses:')}</span>
              <span>{loggedExpensesTotal.toLocaleString()} {t('currency')}</span>
            </div>
            <div className="pt-2 border-t border-white/20 flex justify-between items-center gap-6 text-sm font-bold">
              <span className={isProfit ? "text-emerald-400" : "text-rose-400"}>
                = {isProfit ? tr('ربح صافي', 'Profit Net', 'Net Profit') : tr('خسارة صافية', 'Perte Nette', 'Net Loss')}:
              </span>
              <span className={isProfit ? "text-emerald-400" : "text-rose-400"}>
                {netProfitOrLoss.toLocaleString()} {t('currency')}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Category Distribution Breakdown */}
      {categoryBreakdown.length > 0 && (
        <div className="bg-white p-6 rounded-3xl border-2 border-slate-100 shadow-sm space-y-4">
          <h3 className={cn("text-base font-bold text-primary flex items-center gap-2", isRTL && "flex-row-reverse")}>
            <FileSpreadsheet size={18} className="text-accent" />
            <span>{tr('توزيع المصاريف حسب الفئات', 'Répartition des charges par catégorie', 'Expenses by Category')}</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {categoryBreakdown.map((item) => {
              const conf = CATEGORY_CONFIG[item.category];
              const percentage = loggedExpensesTotal > 0 ? ((item.total / loggedExpensesTotal) * 100).toFixed(0) : '0';
              const Icon = conf.icon;

              return (
                <div key={item.category} className="p-4 rounded-2xl border border-slate-100 bg-slate-50/50 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className={cn("px-2.5 py-1 rounded-xl text-xs font-bold border flex items-center gap-1.5", conf.color)}>
                      <Icon size={14} />
                      {getCategoryLabel(item.category)}
                    </span>
                    <span className="text-xs font-bold text-slate-400">{percentage}%</span>
                  </div>
                  <p className="text-lg font-black text-slate-800">
                    {item.total.toLocaleString()} <span className="text-xs text-slate-400">{t('currency')}</span>
                  </p>
                  <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                    <div className="bg-rose-500 h-full rounded-full" style={{ width: `${percentage}%` }}></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Filters & Expenses List */}
      <div className="bg-white rounded-3xl border-2 border-slate-100 shadow-sm overflow-hidden p-6 space-y-6">
        <div className={cn("flex flex-col sm:flex-row items-center justify-between gap-4", isRTL && "sm:flex-row-reverse")}>
          <div className="relative w-full sm:w-72">
            <Search className={cn("absolute top-3 text-slate-400", isRTL ? "right-3" : "left-3")} size={18} />
            <input
              type="text"
              placeholder={tr('بحث في المصاريف...', 'Rechercher une charge...', 'Search expenses...')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={cn(
                "w-full bg-slate-50 border border-slate-200 py-2.5 rounded-2xl text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-primary/20",
                isRTL ? "pr-10 pl-4 text-right" : "pl-10 pr-4"
              )}
            />
          </div>

          <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto pb-2 sm:pb-0 custom-scrollbar">
            <button
              onClick={() => setSelectedCategoryFilter('all')}
              className={cn(
                "px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all",
                selectedCategoryFilter === 'all' ? "bg-primary text-white shadow-sm" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              )}
            >
              {tr('الكل', 'Tous', 'All')}
            </button>
            {(Object.keys(CATEGORY_CONFIG) as ExpenseCategory[]).map(cat => (
              <button
                key={cat}
                onClick={() => setSelectedCategoryFilter(cat)}
                className={cn(
                  "px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all border",
                  selectedCategoryFilter === cat ? "bg-primary text-white shadow-sm border-primary" : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                )}
              >
                {getCategoryLabel(cat)}
              </button>
            ))}
          </div>
        </div>

        {/* Expenses Table */}
        <div className="overflow-x-auto w-full">
          {filteredExpenses.length === 0 ? (
            <div className="text-center py-12 space-y-3">
              <div className="w-16 h-16 bg-slate-100 text-slate-400 rounded-full flex items-center justify-center mx-auto">
                <Receipt size={32} />
              </div>
              <p className="text-slate-600 font-bold text-base">
                {tr('لا توجد مصاريف مسجلة لهذه الفئة أو السنة.', 'Aucune charge enregistrée pour cette sélection.', 'No expenses logged for this selection.')}
              </p>
              <button
                onClick={() => setIsAddModalOpen(true)}
                className="text-xs font-bold text-rose-600 hover:underline"
              >
                + {tr('إضافة مصروف جديد الآن', 'Ajouter une charge maintenant', 'Add an expense now')}
              </button>
            </div>
          ) : (
            <table className={cn("w-full text-left min-w-[650px]", isRTL && "text-right")}>
              <thead>
                <tr className="bg-slate-50/70 border-b border-slate-100 text-slate-400 text-[10px] font-black uppercase tracking-[0.2em]">
                  <th className="px-6 py-4">{tr('عنوان المصروف', 'Intitulé de la charge', 'Expense Title')}</th>
                  <th className="px-6 py-4">{tr('الفئة', 'Catégorie', 'Category')}</th>
                  <th className="px-6 py-4">{tr('المبلغ', 'Montant', 'Amount')} ({t('currency')})</th>
                  <th className="px-6 py-4">{tr('التاريخ', 'Date', 'Date')}</th>
                  <th className="px-6 py-4">{tr('ملاحظات', 'Notes', 'Notes')}</th>
                  <th className="px-6 py-4 text-center">{tr('إجراءات', 'Actions', 'Actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm font-semibold text-slate-700">
                {filteredExpenses.map((expense) => {
                  const categoryConf = CATEGORY_CONFIG[expense.category] || CATEGORY_CONFIG.other;
                  const Icon = categoryConf.icon;

                  return (
                    <tr key={expense.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4 font-black text-slate-900">
                        {expense.title}
                      </td>
                      <td className="px-6 py-4">
                        <span className={cn("px-2.5 py-1 rounded-xl text-xs font-bold border inline-flex items-center gap-1.5", categoryConf.color)}>
                          <Icon size={14} />
                          {getCategoryLabel(expense.category)}
                        </span>
                      </td>
                      <td className="px-6 py-4 font-black text-rose-600">
                        {expense.amount.toLocaleString()} <span className="text-xs text-slate-400 font-normal">{t('currency')}</span>
                      </td>
                      <td className="px-6 py-4 text-xs font-bold text-slate-500">
                        {expense.date}
                      </td>
                      <td className="px-6 py-4 text-xs text-slate-500 max-w-xs truncate">
                        {expense.notes || '—'}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => handleStartEdit(expense)}
                            className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all"
                            title={tr('تعديل', 'Modifier', 'Edit')}
                          >
                            <Edit2 size={16} />
                          </button>
                          <button
                            onClick={() => handleDeleteExpense(expense.id)}
                            className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all"
                            title={tr('حذف', 'Supprimer', 'Delete')}
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Add Expense Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title={tr('إضافة مصروف جديد للمدرسة', 'Ajouter une nouvelle charge', 'Add New Expense')}
      >
        <form onSubmit={handleAddExpense} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1.5">
              {tr('عنوان / بيان المصروف', 'Intitulé de la charge', 'Expense title')} *
            </label>
            <input
              type="text"
              required
              placeholder={tr('مثال: فاتورة الكهرباء، أدوات طباعة، صيانة قاعة', "Ex: Facture d'électricité...", 'Ex: Electricity bill, supplies...')}
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 px-4 py-2.5 rounded-2xl text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-500/20"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1.5">
                {tr('المبلغ بالدينار الجزائري (د.ج)', 'Montant (DA)', 'Amount (DA)')} *
              </label>
              <input
                type="number"
                required
                min="1"
                placeholder="0"
                value={newAmount}
                onChange={(e) => setNewAmount(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 px-4 py-2.5 rounded-2xl text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-500/20"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1.5">
                {tr('فئة المصروف', 'Catégorie', 'Category')} *
              </label>
              <select
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value as ExpenseCategory)}
                className="w-full bg-slate-50 border border-slate-200 px-4 py-2.5 rounded-2xl text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-500/20"
              >
                {(Object.keys(CATEGORY_CONFIG) as ExpenseCategory[]).map(cat => (
                  <option key={cat} value={cat}>
                    {getCategoryLabel(cat)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1.5">
              {tr('تاريخ المصروف', 'Date de la charge', 'Expense date')} *
            </label>
            <input
              type="date"
              required
              value={newDate}
              onChange={(e) => setNewDate(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 px-4 py-2.5 rounded-2xl text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-500/20"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1.5">
              {tr('ملاحظات وتفاصيل إضافية', 'Notes supplémentaires', 'Additional notes')}
            </label>
            <textarea
              rows={2}
              placeholder={tr('أي تفاصيل إضافية عن المصروف...', 'Détails ou remarques...', 'Any extra details...')}
              value={newNotes}
              onChange={(e) => setNewNotes(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 px-4 py-2.5 rounded-2xl text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-500/20 resize-none"
            />
          </div>

          <div className="pt-2 flex justify-end gap-3">
            <button
              type="button"
              onClick={() => setIsAddModalOpen(false)}
              className="px-4 py-2.5 rounded-2xl text-xs font-bold text-slate-500 hover:bg-slate-100 transition-colors"
            >
              {tr('إلغاء', 'Annuler', 'Cancel')}
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2.5 rounded-2xl bg-rose-600 text-white font-bold text-xs shadow-lg shadow-rose-600/20 hover:bg-rose-700 transition-all disabled:opacity-50"
            >
              {isSubmitting ? tr('جاري الحفظ...', 'Enregistrement...', 'Saving...') : tr('حفظ المصروف', 'Enregistrer', 'Save Expense')}
            </button>
          </div>
        </form>
      </Modal>

      {/* Edit Expense Modal */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title={tr('تعديل المصروف', 'Modifier la charge', 'Edit Expense')}
      >
        <form onSubmit={handleSaveEdit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1.5">
              {tr('عنوان / بيان المصروف', 'Intitulé de la charge', 'Expense title')} *
            </label>
            <input
              type="text"
              required
              placeholder={tr('مثال: فاتورة الكهرباء، أدوات طباعة، صيانة قاعة', "Ex: Facture d'électricité...", 'Ex: Electricity bill...')}
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 px-4 py-2.5 rounded-2xl text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1.5">
                {tr('المبلغ بالدينار الجزائري (د.ج)', 'Montant (DA)', 'Amount (DA)')} *
              </label>
              <input
                type="number"
                required
                min="1"
                placeholder="0"
                value={editAmount}
                onChange={(e) => setEditAmount(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 px-4 py-2.5 rounded-2xl text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1.5">
                {tr('فئة المصروف', 'Catégorie', 'Category')} *
              </label>
              <select
                value={editCategory}
                onChange={(e) => setEditCategory(e.target.value as ExpenseCategory)}
                className="w-full bg-slate-50 border border-slate-200 px-4 py-2.5 rounded-2xl text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              >
                {(Object.keys(CATEGORY_CONFIG) as ExpenseCategory[]).map(cat => (
                  <option key={cat} value={cat}>
                    {getCategoryLabel(cat)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1.5">
              {tr('تاريخ المصروف', 'Date de la charge', 'Expense date')} *
            </label>
            <input
              type="date"
              required
              value={editDate}
              onChange={(e) => setEditDate(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 px-4 py-2.5 rounded-2xl text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1.5">
              {tr('ملاحظات وتفاصيل إضافية', 'Notes supplémentaires', 'Additional notes')}
            </label>
            <textarea
              rows={2}
              placeholder={tr('أي تفاصيل إضافية عن المصروف...', 'Détails ou remarques...', 'Any extra details...')}
              value={editNotes}
              onChange={(e) => setEditNotes(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 px-4 py-2.5 rounded-2xl text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 resize-none"
            />
          </div>

          <div className="pt-2 flex justify-end gap-3">
            <button
              type="button"
              onClick={() => setIsEditModalOpen(false)}
              className="px-4 py-2.5 rounded-2xl text-xs font-bold text-slate-500 hover:bg-slate-100 transition-colors"
            >
              {tr('إلغاء', 'Annuler', 'Cancel')}
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2.5 rounded-2xl bg-blue-600 text-white font-bold text-xs shadow-lg shadow-blue-600/20 hover:bg-blue-700 transition-all disabled:opacity-50"
            >
              {isSubmitting ? tr('جاري التحديث...', 'Mise à jour...', 'Updating...') : tr('حفظ التعديلات', 'Enregistrer les modifications', 'Save Changes')}
            </button>
          </div>
        </form>
      </Modal>

      {/* Add Deposit to Rent Vault Modal */}
      <Modal
        isOpen={isDepositModalOpen}
        onClose={() => setIsDepositModalOpen(false)}
        title={tr('وضع اقتطاع في حصالة الكراء السنوي 🏦', 'Nouveau versement dans le coffre du loyer', 'New Rent Vault Deposit')}
      >
        <form onSubmit={handleAddVaultDeposit} className="space-y-4">
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-2xl text-xs text-amber-900 space-y-1">
            <p className="font-bold">{tr('💡 الادخار الشهري للكراء:', '💡 Épargne progressive du loyer:', '💡 Monthly Rent Savings:')}</p>
            <p>
              {tr(
                `تقتطع حصالة الكراء مبالغ مالية شهرية لتصل إلى الهدف السنوي (${targetRent.toLocaleString()} د.ج).`,
                `Ajoutez vos économies mensuelles pour atteindre l'objectif du loyer (${targetRent.toLocaleString()} DA).`,
                `Add your monthly savings to reach the annual rent goal (${targetRent.toLocaleString()} DA).`
              )}
            </p>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1.5">
              {tr('المبلغ المقتطع وإيداعه في الحصالة (د.ج)', 'Montant à ajouter au coffre (DA)', 'Amount to deposit (DA)')} *
            </label>
            <input
              type="number"
              required
              min="1"
              placeholder={`${tr('مثال:', 'Ex:', 'Ex:')} ${suggestedMonthlySavings}`}
              value={depositAmount}
              onChange={(e) => setDepositAmount(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 px-4 py-2.5 rounded-2xl text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1.5">
              {tr('الشهر المستهدف', 'Mois concerné', 'Target Month')} *
            </label>
            <select
              value={depositMonth}
              onChange={(e) => setDepositMonth(Number(e.target.value))}
              className="w-full bg-slate-50 border border-slate-200 px-4 py-2.5 rounded-2xl text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
            >
              {monthList.map((m, idx) => (
                <option key={idx + 1} value={idx + 1}>{m}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1.5">
              {tr('ملاحظة (اختياري)', 'Note (optionnelle)', 'Note (optional)')}
            </label>
            <input
              type="text"
              placeholder={tr('مثال: اقتطاع شهر مارس للكراء', 'Ex: Épargne du mois de Mars...', 'Ex: March rent savings...')}
              value={depositNote}
              onChange={(e) => setDepositNote(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 px-4 py-2.5 rounded-2xl text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
            />
          </div>

          <div className="pt-2 flex justify-end gap-3">
            <button
              type="button"
              onClick={() => setIsDepositModalOpen(false)}
              className="px-4 py-2.5 rounded-2xl text-xs font-bold text-slate-500 hover:bg-slate-100 transition-colors"
            >
              {tr('إلغاء', 'Annuler', 'Cancel')}
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2.5 rounded-2xl bg-amber-600 text-white font-bold text-xs shadow-lg shadow-amber-600/20 hover:bg-amber-700 transition-all disabled:opacity-50"
            >
              {isSubmitting ? tr('جاري الإيداع...', 'Enregistrement...', 'Saving...') : tr('إيداع في الحصالة', 'Ajouter au coffre', 'Add to Vault')}
            </button>
          </div>
        </form>
      </Modal>

      {/* Edit Target Rent Amount Modal */}
      <Modal
        isOpen={isEditTargetModalOpen}
        onClose={() => setIsEditTargetModalOpen(false)}
        title={tr('تعديل قيمة الكراء السنوي للمدرسة', 'Modifier le montant du loyer annuel', 'Edit Annual Rent Target')}
      >
        <form onSubmit={handleUpdateTargetRent} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1.5">
              {tr('مبلغ الكراء السنوي الإجمالي (د.ج)', 'Loyer annuel total (DA)', 'Total annual rent (DA)')} *
            </label>
            <input
              type="number"
              required
              min="1"
              value={editTargetRentAmount}
              onChange={(e) => setEditTargetRentAmount(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 px-4 py-2.5 rounded-2xl text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
            />
            <p className="text-[11px] text-slate-400 mt-1">
              {tr('مثال: 180,000 د.ج لكامل السنة', "Ex: 180,000 DA pour toute l'année", 'Ex: 180,000 DA for the whole year')}
            </p>
          </div>

          <div className="pt-2 flex justify-end gap-3">
            <button
              type="button"
              onClick={() => setIsEditTargetModalOpen(false)}
              className="px-4 py-2.5 rounded-2xl text-xs font-bold text-slate-500 hover:bg-slate-100 transition-colors"
            >
              {tr('إلغاء', 'Annuler', 'Cancel')}
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2.5 rounded-2xl bg-primary text-white font-bold text-xs shadow-lg hover:bg-primary/90 transition-all disabled:opacity-50"
            >
              {isSubmitting ? tr('جاري التحديث...', 'Mise à jour...', 'Updating...') : tr('حفظ المبلغ الجديد', 'Enregistrer', 'Save Amount')}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
