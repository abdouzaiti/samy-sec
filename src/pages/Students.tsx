import React, { useState, useEffect } from 'react';
import { Search, Plus, User, Phone, CreditCard, GraduationCap, Loader2, Trash2, Shield, Pencil, AlertCircle, CheckCircle2, Circle, Clock, FileText, Calendar, Check } from 'lucide-react';
import { Student, SchoolClass, PointageLog } from '../types';
import { cn } from '../lib/utils';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { studentsService, classesService, pointageService } from '../services/supabaseService';
import { isSupabaseConfigured, getSupabase } from '../lib/supabase';
import { Modal } from '../components/Modal';
import { motion } from 'motion/react';

export function Students() {
  const { t, tr, isRTL, language } = useLanguage();
  const dateLocale = language === 'ar' ? 'ar-DZ' : language === 'fr' ? 'fr-FR' : 'en-GB';
  const { activeRole } = useAuth();
  const [students, setStudents] = useState<Student[]>([]);
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [allLogs, setAllLogs] = useState<PointageLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isLogsModalOpen, setIsLogsModalOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [studentLogs, setStudentLogs] = useState<PointageLog[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);
  
  const [newStudent, setNewStudent] = useState<Omit<Student, 'id'>>({
    name: '',
    parentPhone: '',
    secondaryPhone: '',
    email: '',
    birthDate: '',
    address: '',
    paymentStatus: 'Pending',
    classId: '',
    classIds: [],
    tokenId: '',
    currentMonth: 1,
    paidMonths: [],
    sessionsCompleted: 0
  });

  const loadData = async (isBackground = false) => {
    try {
      if (!isBackground) setLoading(true);
      const [studentsData, classesData, logsData] = await Promise.all([
        studentsService.getAll(),
        classesService.getAll(),
        pointageService.getAll()
      ]);
      setStudents(studentsData);
      setClasses(classesData);
      setAllLogs(logsData);
    } catch (error) {
      console.error('Error loading students data:', error);
    } finally {
      if (!isBackground) setLoading(false);
    }
  };

  useEffect(() => {
    loadData();

    const handleFocus = () => {
      loadData(true);
    };
    window.addEventListener('focus', handleFocus);

    const interval = setInterval(() => {
      loadData(true);
    }, 8000);

    let channel: any = null;
    if (isSupabaseConfigured()) {
      try {
        const client = getSupabase();
        if (client && typeof client.channel === 'function') {
          channel = client
            .channel('students-page-sync-' + Math.random().toString(36).substring(2, 7))
            .on('postgres_changes', { event: '*', schema: 'public', table: 'students' }, () => {
              loadData(true);
            })
            .on('postgres_changes', { event: '*', schema: 'public', table: 'classes' }, () => {
              loadData(true);
            })
            .subscribe();
        }
      } catch (err) {
        console.warn('Realtime subscription notice in Students page:', err);
      }
    }

    return () => {
      window.removeEventListener('focus', handleFocus);
      clearInterval(interval);
      if (channel && typeof channel.unsubscribe === 'function') {
        try { channel.unsubscribe(); } catch {}
      }
    };
  }, []);

  const handleCreateStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStudent.name.trim() || !newStudent.parentPhone.trim()) {
      alert(tr('يرجى إدخال الاسم ورقم الهاتف.', 'Veuillez renseigner le nom et le numéro de téléphone.', 'Please enter the name and phone number.'));
      return;
    }
    try {
      await studentsService.create(newStudent);
      setIsModalOpen(false);
      setNewStudent({
        name: '',
        parentPhone: '',
        secondaryPhone: '',
        email: '',
        birthDate: '',
        address: '',
        paymentStatus: 'Pending',
        classId: '',
        classIds: [],
        tokenId: '',
        currentMonth: 1,
        paidMonths: [],
        sessionsCompleted: 0
      });
      await loadData(true);
    } catch (error: any) {
      console.error('Error creating student:', error);
      alert(tr('حدث خطأ أثناء إنشاء التلميذ: ', 'Erreur lors de la création de l\'élève : ', 'Error creating student: ') + (error?.message || tr('خطأ في الشبكة', 'Erreur réseau', 'Network error')));
    }
  };

  const handleUpdateStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudent) return;
    try {
      await studentsService.update(selectedStudent.id, selectedStudent);
      setIsEditModalOpen(false);
      setSelectedStudent(null);
      loadData();
    } catch (error) {
      console.error('Error updating student:', error);
    }
  };

  const handleDeleteStudent = async (id: string) => {
    if (!window.confirm(tr('هل تريد حقاً حذف هذا التلميذ؟', 'Voulez-vous vraiment supprimer cet élève ?', 'Do you really want to delete this student?'))) return;
    try {
      await studentsService.delete(id);
      loadData();
    } catch (error) {
      console.error('Error deleting student:', error);
    }
  };

  const handleViewLogs = async (student: Student) => {
    try {
      setSelectedStudent(student);
      setLoadingLogs(true);
      setIsLogsModalOpen(true);
      const logs = await pointageService.getByPerson(student.id);
      setStudentLogs(logs);
    } catch (error) {
      console.error('Error fetching student logs:', error);
    } finally {
      setLoadingLogs(false);
    }
  };

  const filteredStudents = students.filter(student => 
    student.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    student.parentPhone.includes(searchQuery) ||
    (student.tokenId && student.tokenId.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const getClassBadges = (student: Student) => {
    const studentClassIds = (student.classIds && student.classIds.length > 0)
      ? student.classIds
      : (student.classId ? [student.classId] : []);

    if (studentClassIds.length === 0) {
      return [{ id: 'none', name: tr('غير معين', 'Non assigné', 'Unassigned') }];
    }

    return studentClassIds.map(cid => {
      const found = classes.find(c => c.id === cid);
      return {
        id: cid,
        name: found ? found.name : tr('غير معروف', 'Inconnu', 'Unknown')
      };
    });
  };

  // Calculate sessions for current month
  const getSessionCount = (studentId: string) => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    return allLogs.filter(log => {
      const logDate = new Date(log.timestamp);
      return log.personId === studentId && 
             logDate.getMonth() === currentMonth && 
             logDate.getFullYear() === currentYear;
    }).length;
  };

  const handleToggleSessionTrigger = async (student: Student, targetSession: number) => {
    try {
      const now = new Date();
      const currentMonth = now.getMonth();
      const currentYear = now.getFullYear();

      const studentMonthLogs = allLogs.filter(log => {
        const logDate = new Date(log.timestamp);
        return log.personId === student.id && 
               logDate.getMonth() === currentMonth && 
               logDate.getFullYear() === currentYear;
      }).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

      const currentCount = studentMonthLogs.length;

      if (targetSession <= currentCount) {
        // Uncheck or reduce sessions down to targetSession - 1
        const logsToRemoveCount = currentCount - (targetSession - 1);
        for (let i = 0; i < logsToRemoveCount; i++) {
          if (studentMonthLogs[i]) {
            await pointageService.deleteLog(studentMonthLogs[i].id);
          }
        }
      } else {
        // Add sessions up to targetSession
        const logsToAddCount = targetSession - currentCount;
        for (let i = 0; i < logsToAddCount; i++) {
          const sessionNum = currentCount + i + 1;
          await pointageService.log({
            personId: student.id,
            personType: 'student',
            personName: student.name,
            tokenId: student.tokenId || 'S-MANUAL',
            details: `Manual session trigger #${sessionNum}`
          });
        }
      }
      loadData();
    } catch (err) {
      console.error('Error updating session trigger:', err);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4">
        <Loader2 className="w-12 h-12 text-primary animate-spin" />
        <p className="text-sm font-black uppercase tracking-widest text-slate-400">
          {tr('جاري تحميل قائمة التلاميذ...', 'Chargement de la liste des élèves...', 'Loading student list...')}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-12">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-primary/10 text-primary rounded-2xl">
              <GraduationCap size={24} />
            </div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">
              {t('students')}
            </h1>
          </div>
          <p className="text-slate-500 font-medium max-w-md leading-relaxed">
            {t('manage_students')}
          </p>
        </div>

        {activeRole === 'director' && (
          <button 
            onClick={() => setIsModalOpen(true)}
            className="flex items-center justify-center gap-2 bg-primary text-white px-6 py-3.5 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-primary/90 transition-all hover:shadow-xl hover:shadow-primary/20 active:scale-95 group"
          >
            <Plus size={16} className="group-hover:rotate-90 transition-transform duration-300" />
            {t('add_student')}
          </button>
        )}
      </div>

      {/* Stats and Search */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-center">
        <div className="lg:col-span-3 relative group">
          <div className={cn("absolute inset-y-0 flex items-center pointer-events-none text-slate-400 group-focus-within:text-primary transition-colors", isRTL ? "right-0 pr-5" : "left-0 pl-5")}>
            <Search size={20} />
          </div>
          <input
            type="text"
            placeholder={t('search_student')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={cn(
              "block w-full py-4 bg-white border-2 border-slate-100 rounded-2xl text-sm font-bold text-slate-700 placeholder:text-slate-300 focus:outline-none focus:border-primary/30 focus:ring-4 focus:ring-primary/5 transition-all shadow-sm",
              isRTL ? "pr-14 pl-6 text-right" : "pl-14 pr-6"
            )}
          />
        </div>
        <div className="bg-slate-50 border border-slate-100 p-4 rounded-2xl flex items-center justify-between">
          <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">{t('total_students')}</span>
          <span className="text-xl font-black text-primary">{filteredStudents.length}</span>
        </div>
      </div>

      {/* Students List */}
      <div className="bg-white rounded-2xl sm:rounded-[2.5rem] border-2 border-slate-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto w-full">
          <table className="w-full border-collapse min-w-[650px]">
            <thead>
              <tr className="bg-slate-50/50 border-b-2 border-slate-100">
                <th className={cn("px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400", isRTL ? "text-right" : "text-left")}>
                  {t('student_name')}
                </th>
                <th className={cn("px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400", isRTL ? "text-right" : "text-left")}>
                  {t('classes')}
                </th>
                <th className={cn("px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400", isRTL ? "text-right" : "text-left")}>
                  {t('parent_phone')}
                </th>
                <th className={cn("px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400", isRTL ? "text-left" : "text-right")}>
                  {tr('الإجراءات', 'Actions', 'Actions')}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y-2 divide-slate-100">
              {filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-8 py-24 text-center">
                    <div className="flex flex-col items-center gap-4 opacity-30">
                      <Search size={48} className="text-slate-300" />
                      <p className="text-sm font-bold text-slate-400 tracking-wide uppercase">
                        {tr('لا يوجد أي تلميذ يطابق بحثك', 'Aucun élève ne correspond à votre recherche', 'No students match your search')}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredStudents.map((student) => {
                  return (
                    <motion.tr 
                      key={student.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="hover:bg-slate-50/80 transition-colors group"
                    >
                      <td className="px-8 py-6">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-2xl bg-primary/5 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                            <User size={20} />
                          </div>
                          <div>
                            <p className="text-sm font-black text-slate-900 group-hover:text-primary transition-colors">{student.name}</p>
                            {student.tokenId && (
                              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1 flex items-center gap-1">
                                <Shield size={10} />
                                {student.tokenId}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-8 py-6">
                         <div className="flex flex-wrap items-center gap-1.5 max-w-[280px]">
                           {getClassBadges(student).map(b => (
                             <span 
                               key={b.id} 
                               className="inline-flex items-center px-3 py-1.5 rounded-xl text-[10px] font-black tracking-widest uppercase bg-slate-100 text-slate-700 border border-slate-200 shadow-sm"
                             >
                               {b.name}
                             </span>
                           ))}
                         </div>
                      </td>
                      <td className="px-8 py-6">
                        <div className="flex flex-col gap-1 text-xs font-bold text-slate-600">
                          <div className="flex items-center gap-2">
                            <Phone size={14} className="text-slate-300 shrink-0" />
                            <span>{student.parentPhone}</span>
                            {student.secondaryPhone && (
                              <span className="text-slate-400 font-medium"> / {student.secondaryPhone}</span>
                            )}
                          </div>
                          {student.email && (
                            <p className="text-[11px] text-slate-400 font-medium">✉️ {student.email}</p>
                          )}
                          {student.birthDate && (
                            <p className="text-[11px] text-slate-400 font-medium">🎂 {tr('تاريخ الميلاد:', 'Né(e) le:', 'Born:')} {student.birthDate}</p>
                          )}
                          {student.address && (
                            <p className="text-[11px] text-slate-400 font-medium truncate max-w-[200px]">📍 {student.address}</p>
                          )}
                        </div>
                      </td>
                      <td className={cn("px-8 py-6", isRTL ? "text-left" : "text-right")}>
                        <div className={cn("flex items-center gap-3 justify-end", isRTL && "justify-start")}>
                          <button
                             onClick={() => handleViewLogs(student)}
                             className="p-2 text-slate-300 hover:text-primary hover:bg-primary/5 rounded-xl transition-all"
                             title={tr('سجل الحضور', 'Historique de présence', 'Attendance history')}
                          >
                             <FileText size={18} />
                          </button>
                          {activeRole === 'director' && (
                            <>
                              <button 
                                onClick={() => {
                                  setSelectedStudent(student);
                                  setIsEditModalOpen(true);
                                }}
                                className="p-2 text-slate-300 hover:text-primary hover:bg-primary/5 rounded-xl transition-all"
                                title={tr('تعديل', 'Modifier', 'Edit')}
                              >
                                <Pencil size={18} />
                              </button>
                              <button 
                                onClick={() => handleDeleteStudent(student.id)}
                                className="p-2 text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all"
                                title={t('remove')}
                              >
                                <Trash2 size={18} />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </motion.tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Student Modal */}
      <Modal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        title={t('add_student')}
      >
        <form onSubmit={handleCreateStudent} className="space-y-6">
          <div className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-1">{t('student_name')}</label>
                {newStudent.name && (
                  <span className="text-[11px] font-black text-primary bg-primary/10 px-2 py-0.5 rounded-lg">
                    {tr('معاينة:', 'Sortie:', 'Output:')} {newStudent.name}
                  </span>
                )}
              </div>
              <input
                required
                value={newStudent.name}
                onChange={(e) => setNewStudent({...newStudent, name: e.target.value})}
                className="w-full px-5 py-3.5 bg-slate-50 border-2 border-slate-100 rounded-2xl text-sm font-bold focus:outline-none focus:border-primary/20 focus:bg-white transition-all"
              />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-1">{t('parent_phone')}</label>
                  {newStudent.parentPhone && (
                    <a 
                      href={`tel:${newStudent.parentPhone}`} 
                      target="_blank" 
                      rel="noreferrer" 
                      className="text-[11px] font-black text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-2 py-0.5 rounded-lg flex items-center gap-1 transition-colors"
                    >
                      📞 {newStudent.parentPhone}
                    </a>
                  )}
                </div>
                <input
                  required
                  value={newStudent.parentPhone}
                  onChange={(e) => setNewStudent({...newStudent, parentPhone: e.target.value})}
                  className="w-full px-5 py-3.5 bg-slate-50 border-2 border-slate-100 rounded-2xl text-sm font-bold focus:outline-none focus:border-primary/20 focus:bg-white transition-all"
                  placeholder="0550..."
                />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-1">{tr('هاتف ثاني (اختياري)', '2ème Téléphone (Optionnel)', '2nd Phone (Optional)')}</label>
                  {newStudent.secondaryPhone && (
                    <a 
                      href={`tel:${newStudent.secondaryPhone}`} 
                      target="_blank" 
                      rel="noreferrer" 
                      className="text-[11px] font-black text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-2 py-0.5 rounded-lg flex items-center gap-1 transition-colors"
                    >
                      📱 {newStudent.secondaryPhone}
                    </a>
                  )}
                </div>
                <input
                  value={newStudent.secondaryPhone || ''}
                  onChange={(e) => setNewStudent({...newStudent, secondaryPhone: e.target.value})}
                  className="w-full px-5 py-3.5 bg-slate-50 border-2 border-slate-100 rounded-2xl text-sm font-bold focus:outline-none focus:border-primary/20 focus:bg-white transition-all"
                  placeholder="0660..."
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-1">{tr('البريد الإلكتروني (اختياري)', 'Email (Optionnel)', 'Email (Optional)')}</label>
                  {newStudent.email && (
                    <a href={`mailto:${newStudent.email}`} className="text-[11px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-lg truncate max-w-[150px]">
                      ✉️ {newStudent.email}
                    </a>
                  )}
                </div>
                <input
                  type="email"
                  value={newStudent.email || ''}
                  onChange={(e) => setNewStudent({...newStudent, email: e.target.value})}
                  className="w-full px-5 py-3.5 bg-slate-50 border-2 border-slate-100 rounded-2xl text-sm font-bold focus:outline-none focus:border-primary/20 focus:bg-white transition-all"
                  placeholder="student@example.com"
                />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-1">{tr('تاريخ الميلاد (اختياري)', 'Date de naissance (Optionnel)', 'Birth Date (Optional)')}</label>
                  {newStudent.birthDate && (
                    <span className="text-[11px] font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-lg">
                      🎂 {newStudent.birthDate}
                    </span>
                  )}
                </div>
                <input
                  type="date"
                  value={newStudent.birthDate || ''}
                  onChange={(e) => setNewStudent({...newStudent, birthDate: e.target.value})}
                  className="w-full px-5 py-3.5 bg-slate-50 border-2 border-slate-100 rounded-2xl text-sm font-bold focus:outline-none focus:border-primary/20 focus:bg-white transition-all"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-1">{tr('العنوان (اختياري)', 'Adresse (Optionnel)', 'Address (Optional)')}</label>
                  {newStudent.address && (
                    <span className="text-[11px] font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-lg truncate max-w-[150px]">
                      📍 {newStudent.address}
                    </span>
                  )}
                </div>
                <input
                  value={newStudent.address || ''}
                  onChange={(e) => setNewStudent({...newStudent, address: e.target.value})}
                  className="w-full px-5 py-3.5 bg-slate-50 border-2 border-slate-100 rounded-2xl text-sm font-bold focus:outline-none focus:border-primary/20 focus:bg-white transition-all"
                  placeholder={tr('عنوان الإقامة', 'Adresse de résidence', 'Home address')}
                />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-1">{t('token_id')}</label>
                  {newStudent.tokenId && (
                    <span className="text-[11px] font-mono font-black text-primary bg-primary/10 px-2 py-0.5 rounded-lg">
                      🏷️ {newStudent.tokenId}
                    </span>
                  )}
                </div>
                <input
                  value={newStudent.tokenId || ''}
                  onChange={(e) => setNewStudent({...newStudent, tokenId: e.target.value})}
                  className="w-full px-5 py-3.5 bg-slate-50 border-2 border-slate-100 rounded-2xl text-sm font-bold focus:outline-none focus:border-primary/20 focus:bg-white transition-all"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-1">
                {t('classes')} ({tr('اختر قسماً واحداً أو أكثر', 'Sélectionner une ou plusieurs classes', 'Select one or more classes')})
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto p-1">
                {classes.map(c => {
                  const currentClassIds = newStudent.classIds && newStudent.classIds.length > 0 
                    ? newStudent.classIds 
                    : (newStudent.classId ? [newStudent.classId] : []);
                  const isSelected = currentClassIds.includes(c.id);
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => {
                        let nextIds: string[];
                        if (isSelected) {
                          nextIds = currentClassIds.filter(id => id !== c.id);
                        } else {
                          nextIds = [...currentClassIds, c.id];
                        }
                        setNewStudent({
                          ...newStudent,
                          classIds: nextIds,
                          classId: nextIds[0] || ''
                        });
                      }}
                      className={cn(
                        "flex items-center justify-between p-3 rounded-2xl border text-xs font-bold transition-all",
                        isRTL ? "text-right" : "text-left",
                        isSelected 
                          ? "bg-primary/10 border-primary text-primary" 
                          : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                      )}
                    >
                      <span className="truncate">{c.name}</span>
                      {isSelected && <Check size={14} className="shrink-0 text-primary" />}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* LIVE OUTPUT PREVIEW CARD FOR ADD STUDENT */}
            <div className="p-4 bg-slate-900 text-white rounded-2xl space-y-2 border border-slate-800 shadow-lg">
              <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest text-slate-400">
                <span>{tr('معاينة بطاقة التلميذ', 'Aperçu Fiche Élève', 'Student Card Preview')}</span>
                <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-400 rounded-md">{tr('مباشر', 'Temps Réel', 'Live')}</span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs font-bold text-slate-200">
                <div>{tr('الاسم:', 'Nom:', 'Name:')} <span className="text-white font-extrabold">{newStudent.name || '—'}</span></div>
                <div>{tr('هاتف الولي:', 'Tél Parent:', 'Parent Phone:')} <span className="text-emerald-400 font-mono">{newStudent.parentPhone || '—'}</span></div>
                {newStudent.secondaryPhone && <div>{tr('هاتف 2:', 'Tél 2:', 'Phone 2:')} <span className="text-emerald-300 font-mono">{newStudent.secondaryPhone}</span></div>}
                {newStudent.email && <div>{tr('البريد:', 'Email:', 'Email:')} <span className="text-slate-300">{newStudent.email}</span></div>}
                {newStudent.birthDate && <div>{tr('الميلاد:', 'Né(e) le:', 'Born:')} <span className="text-slate-300">{newStudent.birthDate}</span></div>}
                {newStudent.address && <div>{tr('العنوان:', 'Adresse:', 'Address:')} <span className="text-slate-300">{newStudent.address}</span></div>}
                {newStudent.tokenId && <div>{t('token_id')}: <span className="font-mono text-emerald-400">{newStudent.tokenId}</span></div>}
              </div>
            </div>
          </div>

          <button
            type="submit"
            className="w-full py-4 bg-primary text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-primary/90 transition-all hover:shadow-xl hover:shadow-primary/20 active:scale-95 mt-4"
          >
            {t('add_student')}
          </button>
        </form>
      </Modal>

      {/* Edit Student Modal */}
      <Modal 
        isOpen={isEditModalOpen} 
        onClose={() => setIsEditModalOpen(false)} 
        title={tr('تعديل بيانات التلميذ', 'Modifier l\'élève', 'Edit Student')}
      >
        {selectedStudent && (
          <form onSubmit={handleUpdateStudent} className="space-y-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-1">{t('student_name')}</label>
                  {selectedStudent.name && (
                    <span className="text-[11px] font-black text-primary bg-primary/10 px-2 py-0.5 rounded-lg">
                      {tr('معاينة:', 'Sortie:', 'Output:')} {selectedStudent.name}
                    </span>
                  )}
                </div>
                <input
                  required
                  value={selectedStudent.name}
                  onChange={(e) => setSelectedStudent({...selectedStudent, name: e.target.value})}
                  className="w-full px-5 py-3.5 bg-slate-50 border-2 border-slate-100 rounded-2xl text-sm font-bold focus:outline-none focus:border-primary/20 focus:bg-white transition-all"
                />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-1">{t('parent_phone')}</label>
                    {selectedStudent.parentPhone && (
                      <a 
                        href={`tel:${selectedStudent.parentPhone}`} 
                        target="_blank" 
                        rel="noreferrer" 
                        className="text-[11px] font-black text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-2 py-0.5 rounded-lg flex items-center gap-1 transition-colors"
                      >
                        📞 {selectedStudent.parentPhone}
                      </a>
                    )}
                  </div>
                  <input
                    required
                    value={selectedStudent.parentPhone}
                    onChange={(e) => setSelectedStudent({...selectedStudent, parentPhone: e.target.value})}
                    className="w-full px-5 py-3.5 bg-slate-50 border-2 border-slate-100 rounded-2xl text-sm font-bold focus:outline-none focus:border-primary/20 focus:bg-white transition-all"
                  />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-1">{tr('هاتف ثاني (اختياري)', '2ème Téléphone (Optionnel)', '2nd Phone (Optional)')}</label>
                    {selectedStudent.secondaryPhone && (
                      <a 
                        href={`tel:${selectedStudent.secondaryPhone}`} 
                        target="_blank" 
                        rel="noreferrer" 
                        className="text-[11px] font-black text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-2 py-0.5 rounded-lg flex items-center gap-1 transition-colors"
                      >
                        📱 {selectedStudent.secondaryPhone}
                      </a>
                    )}
                  </div>
                  <input
                    value={selectedStudent.secondaryPhone || ''}
                    onChange={(e) => setSelectedStudent({...selectedStudent, secondaryPhone: e.target.value})}
                    className="w-full px-5 py-3.5 bg-slate-50 border-2 border-slate-100 rounded-2xl text-sm font-bold focus:outline-none focus:border-primary/20 focus:bg-white transition-all"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-1">{tr('البريد الإلكتروني (اختياري)', 'Email (Optionnel)', 'Email (Optional)')}</label>
                    {selectedStudent.email && (
                      <a href={`mailto:${selectedStudent.email}`} className="text-[11px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-lg truncate max-w-[150px]">
                        ✉️ {selectedStudent.email}
                      </a>
                    )}
                  </div>
                  <input
                    type="email"
                    value={selectedStudent.email || ''}
                    onChange={(e) => setSelectedStudent({...selectedStudent, email: e.target.value})}
                    className="w-full px-5 py-3.5 bg-slate-50 border-2 border-slate-100 rounded-2xl text-sm font-bold focus:outline-none focus:border-primary/20 focus:bg-white transition-all"
                  />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-1">{tr('تاريخ الميلاد (اختياري)', 'Date de naissance (Optionnel)', 'Birth Date (Optional)')}</label>
                    {selectedStudent.birthDate && (
                      <span className="text-[11px] font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-lg">
                        🎂 {selectedStudent.birthDate}
                      </span>
                    )}
                  </div>
                  <input
                    type="date"
                    value={selectedStudent.birthDate || ''}
                    onChange={(e) => setSelectedStudent({...selectedStudent, birthDate: e.target.value})}
                    className="w-full px-5 py-3.5 bg-slate-50 border-2 border-slate-100 rounded-2xl text-sm font-bold focus:outline-none focus:border-primary/20 focus:bg-white transition-all"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-1">{tr('العنوان (اختياري)', 'Adresse (Optionnel)', 'Address (Optional)')}</label>
                    {selectedStudent.address && (
                      <span className="text-[11px] font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-lg truncate max-w-[150px]">
                        📍 {selectedStudent.address}
                      </span>
                    )}
                  </div>
                  <input
                    value={selectedStudent.address || ''}
                    onChange={(e) => setSelectedStudent({...selectedStudent, address: e.target.value})}
                    className="w-full px-5 py-3.5 bg-slate-50 border-2 border-slate-100 rounded-2xl text-sm font-bold focus:outline-none focus:border-primary/20 focus:bg-white transition-all"
                  />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-1">{t('token_id')}</label>
                    {selectedStudent.tokenId && (
                      <span className="text-[11px] font-mono font-black text-primary bg-primary/10 px-2 py-0.5 rounded-lg">
                        🏷️ {selectedStudent.tokenId}
                      </span>
                    )}
                  </div>
                  <input
                    value={selectedStudent.tokenId || ''}
                    onChange={(e) => setSelectedStudent({...selectedStudent, tokenId: e.target.value})}
                    className="w-full px-5 py-3.5 bg-slate-50 border-2 border-slate-100 rounded-2xl text-sm font-bold focus:outline-none focus:border-primary/20 focus:bg-white transition-all"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-1">
                  {t('classes')} ({tr('اختر قسماً واحداً أو أكثر', 'Sélectionner une ou plusieurs classes', 'Select one or more classes')})
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto p-1">
                  {classes.map(c => {
                    const currentClassIds = selectedStudent.classIds && selectedStudent.classIds.length > 0 
                      ? selectedStudent.classIds 
                      : (selectedStudent.classId ? [selectedStudent.classId] : []);
                    const isSelected = currentClassIds.includes(c.id);
                    return (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => {
                          let nextIds: string[];
                          if (isSelected) {
                            nextIds = currentClassIds.filter(id => id !== c.id);
                          } else {
                            nextIds = [...currentClassIds, c.id];
                          }
                          setSelectedStudent({
                            ...selectedStudent,
                            classIds: nextIds,
                            classId: nextIds[0] || ''
                          });
                        }}
                        className={cn(
                          "flex items-center justify-between p-3 rounded-2xl border text-xs font-bold transition-all",
                          isRTL ? "text-right" : "text-left",
                          isSelected 
                            ? "bg-primary/10 border-primary text-primary" 
                            : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                        )}
                      >
                        <span className="truncate">{c.name}</span>
                        {isSelected && <Check size={14} className="shrink-0 text-primary" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* LIVE OUTPUT PREVIEW CARD FOR EDIT STUDENT */}
            <div className="p-4 bg-slate-900 text-white rounded-2xl space-y-2 border border-slate-800 shadow-lg">
              <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest text-slate-400">
                <span>{tr('معاينة التعديلات', 'Aperçu Fiche Élève Modifiée', 'Updated Student Preview')}</span>
                <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-400 rounded-md">{tr('مباشر', 'En Direct', 'Live')}</span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs font-bold text-slate-200">
                <div>{tr('الاسم:', 'Nom:', 'Name:')} <span className="text-white font-extrabold">{selectedStudent.name || '—'}</span></div>
                <div>{tr('هاتف الولي:', 'Tél Parent:', 'Parent Phone:')} <span className="text-emerald-400 font-mono">{selectedStudent.parentPhone || '—'}</span></div>
                {selectedStudent.secondaryPhone && <div>{tr('هاتف 2:', 'Tél 2:', 'Phone 2:')} <span className="text-emerald-300 font-mono">{selectedStudent.secondaryPhone}</span></div>}
                {selectedStudent.email && <div>{tr('البريد:', 'Email:', 'Email:')} <span className="text-slate-300">{selectedStudent.email}</span></div>}
                {selectedStudent.birthDate && <div>{tr('الميلاد:', 'Né(e) le:', 'Born:')} <span className="text-slate-300">{selectedStudent.birthDate}</span></div>}
                {selectedStudent.address && <div>{tr('العنوان:', 'Adresse:', 'Address:')} <span className="text-slate-300">{selectedStudent.address}</span></div>}
                {selectedStudent.tokenId && <div>{t('token_id')}: <span className="font-mono text-emerald-400">{selectedStudent.tokenId}</span></div>}
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-800 transition-all active:scale-95 mt-4"
            >
              {tr('حفظ التعديلات', 'Enregistrer les modifications', 'Save Changes')}
            </button>
          </form>
        )}
      </Modal>

      {/* Student Attendance Logs Modal */}
      <Modal
        isOpen={isLogsModalOpen}
        onClose={() => setIsLogsModalOpen(false)}
        title={`${tr('سجل الحضور:', 'Historique de présence :', 'Attendance History:')} ${selectedStudent?.name || ''}`}
      >
        <div className="space-y-6">
          <div className="flex items-center justify-between bg-slate-50 p-4 rounded-2xl border border-slate-100">
            <div className="flex items-center gap-3">
              <Clock className="text-primary" size={20} />
              <span className="text-sm font-bold text-slate-600">
                {tr('سجل الشهر الحالي', 'Historique du mois en cours', 'Current month history')}
              </span>
            </div>
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 bg-white px-3 py-1 rounded-full border border-slate-100">
              {new Date().toLocaleDateString(dateLocale, { month: 'long', year: 'numeric' })}
            </span>
          </div>

          <div className="max-h-[60vh] overflow-y-auto pr-2 space-y-3 custom-scrollbar">
            {loadingLogs ? (
              <div className="py-20 flex flex-col items-center justify-center gap-4">
                <Loader2 className="w-8 h-8 text-primary animate-spin" />
                <p className="text-xs font-black uppercase tracking-widest text-slate-400">
                  {tr('جاري التحميل...', 'Chargement...', 'Loading...')}
                </p>
              </div>
            ) : studentLogs.length === 0 ? (
              <div className="py-20 text-center space-y-4 bg-slate-50/50 rounded-3xl border border-dashed border-slate-200">
                <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center mx-auto text-slate-200 border border-slate-100">
                  <FileText size={24} />
                </div>
                <p className="text-sm font-bold text-slate-400">
                  {tr('لا يوجد أي تسجيل حضور لهذا التلميذ هذا الشهر', 'Aucun pointage enregistré pour cet élève ce mois-ci', 'No attendance recorded for this student this month')}
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {studentLogs.map((log) => (
                  <div key={log.id} className="group flex items-center justify-between p-4 bg-white border border-slate-100 rounded-2xl hover:border-primary/20 hover:shadow-lg hover:shadow-primary/5 transition-all">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-slate-50 text-slate-400 rounded-xl flex items-center justify-center group-hover:bg-primary/5 group-hover:text-primary transition-colors">
                        <Calendar size={18} />
                      </div>
                      <div>
                        <p className="text-sm font-black text-primary">
                          {new Date(log.timestamp).toLocaleDateString(dateLocale, { 
                            weekday: 'long', 
                            day: 'numeric', 
                            month: 'short' 
                          })}
                        </p>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                          <Clock size={10} />
                          {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </div>
                    <div className={isRTL ? "text-left" : "text-right"}>
                       <span className="inline-flex items-center px-3 py-1 rounded-full text-[9px] font-black tracking-widest uppercase bg-primary/5 text-primary border border-primary/10">
                         {log.details || tr('تسجيل حضور', 'Pointage', 'Check-in')}
                       </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="pt-4 border-t border-slate-100 flex justify-between items-center">
            <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">
              {tr(`الإجمالي: ${studentLogs.length} حصص`, `Total: ${studentLogs.length} sessions`, `Total: ${studentLogs.length} sessions`)}
            </div>
            <button 
              onClick={() => setIsLogsModalOpen(false)}
              className="bg-slate-900 text-white px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-800 transition-all active:scale-95"
            >
              {tr('إغلاق', 'Fermer', 'Close')}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
