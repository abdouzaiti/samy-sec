import React, { useState, useEffect } from 'react';
import { Search, Plus, Phone, CheckCircle2, XCircle, Clock, BookOpen, Users, Loader2, Trash2, AlertCircle, Pencil, UserCheck, GraduationCap, UserPlus, Check, X, Printer, Calendar, CheckCheck, FileText, Sparkles, Shield, User } from 'lucide-react';
import { Student, SchoolClass, Teacher } from '../types';
import { cn } from '../lib/utils';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { classesService, studentsService, pointageService, teachersService, paymentsService } from '../services/supabaseService';
import { isSupabaseConfigured, getSupabase } from '../lib/supabase';
import { Modal } from '../components/Modal';

const findTeacher = (teachersList: Teacher[], identifier?: string): Teacher | undefined => {
  if (!identifier) return undefined;
  return teachersList.find(t => 
    t.id === identifier || 
    t.name.toLowerCase() === identifier.toLowerCase() ||
    t.tokenId === identifier ||
    t.email?.toLowerCase() === identifier.toLowerCase()
  );
};

const getStudentAttendance = (s: Student, classId: string, month: number): (boolean | string)[] => {
  if (!s || !s.attendance) return [false, false, false, false];
  
  if (classId) {
    const classObj = (s.attendance as any)[classId];
    if (classObj && typeof classObj === 'object' && !Array.isArray(classObj)) {
      if (classObj[month] && Array.isArray(classObj[month])) {
        return classObj[month];
      }
    }
  }

  if ((s.attendance as any)[month] && Array.isArray((s.attendance as any)[month])) {
    return (s.attendance as any)[month];
  }

  return [false, false, false, false];
};

const getStudentAttendanceDates = (s: Student, classId: string, month: number): string[] => {
  if (!s || !s.attendanceDates) return ['', '', '', ''];

  if (classId) {
    const classObj = (s.attendanceDates as any)[classId];
    if (classObj && typeof classObj === 'object' && !Array.isArray(classObj)) {
      if (classObj[month] && Array.isArray(classObj[month])) {
        return classObj[month];
      }
    }
  }

  if ((s.attendanceDates as any)[month] && Array.isArray((s.attendanceDates as any)[month])) {
    return (s.attendanceDates as any)[month];
  }

  return ['', '', '', ''];
};

export function Classes() {
  const { t, tr, isRTL, language } = useLanguage();
  const dateLocale = language === 'ar' ? 'ar-DZ' : language === 'fr' ? 'fr-FR' : 'en-GB';
  const { activeRole } = useAuth();
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [allLogs, setAllLogs] = useState<any[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string>(() => {
    return localStorage.getItem('samy_selected_class_id') || localStorage.getItem('marin_selected_class_id') || localStorage.getItem('everest_selected_class_id') || '';
  });
  const [search, setSearch] = useState('');
  const [openMonthDropdownId, setOpenMonthDropdownId] = useState<string | null>(null);
  const [attendanceStudent, setAttendanceStudent] = useState<Student | null>(null);
  const [isSubmittingStudent, setIsSubmittingStudent] = useState(false);
  const [studentActionSuccess, setStudentActionSuccess] = useState<string | null>(null);

  // Multi-column attendance view state
  const [viewMode, setViewMode] = useState<'attendance' | 'details'>('attendance');
  const [selectedAttendanceMonth, setSelectedAttendanceMonth] = useState<number>(1);
  const [isBulkSaving, setIsBulkSaving] = useState(false);

  const [printReceiptData, setPrintReceiptData] = useState<{
    student: Student;
    month: number;
    schoolClass?: SchoolClass;
  } | null>(null);

  const [printClassAttendanceData, setPrintClassAttendanceData] = useState<{
    schoolClass: SchoolClass;
    month: number;
    students: Student[];
    teacher?: Teacher;
  } | null>(null);

  const [loading, setLoading] = useState(true);

  // Modal states
  const [isClassModalOpen, setIsClassModalOpen] = useState(false);
  const [isStudentModalOpen, setIsStudentModalOpen] = useState(false);
  const [isEditClassModalOpen, setIsEditClassModalOpen] = useState(false);
  const [isEditStudentModalOpen, setIsEditStudentModalOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [selectedStudentForPayment, setSelectedStudentForPayment] = useState<Student | null>(null);
  const [scanToken, setScanToken] = useState('');

  // Student choice / enrollment mode state
  const [studentAddMode, setStudentAddMode] = useState<'choose' | 'new'>('choose');
  const [existingStudentSearch, setExistingStudentSearch] = useState('');

  // Form states
  const [newClass, setNewClass] = useState<Omit<SchoolClass, 'id'>>({ name: '', price: 0, description: '', teacherId: '' });
  const [newStudent, setNewStudent] = useState<Omit<Student, 'id'>>({
    name: '',
    parentPhone: '',
    secondaryPhone: '',
    email: '',
    birthDate: '',
    address: '',
    classId: '',
    tokenId: '',
    currentMonth: 1,
    paidMonths: [],
    sessionsCompleted: 0,
    paymentStatus: 'Pending'
  });

  const [editingClassId, setEditingClassId] = useState<string>('');
  const [editClass, setEditClass] = useState<Omit<SchoolClass, 'id'>>({ name: '', price: 0, description: '', teacherId: '' });

  const [editingStudentId, setEditingStudentId] = useState<string>('');
  const [editStudent, setEditStudent] = useState<Omit<Student, 'id'>>({
    name: '',
    parentPhone: '',
    secondaryPhone: '',
    email: '',
    birthDate: '',
    address: '',
    classId: '',
    tokenId: '',
    currentMonth: 1,
    paidMonths: [],
    sessionsCompleted: 0,
    paymentStatus: 'Pending'
  });

  const fetchData = async (isBackground = false) => {
    try {
      if (!isBackground) setLoading(true);
      const [classesData, studentsData, logsData, teachersData] = await Promise.all([
        classesService.getAll(),
        studentsService.getAll(),
        pointageService.getAll(),
        teachersService.getAll()
      ]);
      setClasses(classesData);
      setStudents(studentsData);
      setAllLogs(logsData);
      setTeachers(teachersData);

      const savedId = localStorage.getItem('samy_selected_class_id') || localStorage.getItem('marin_selected_class_id') || localStorage.getItem('everest_selected_class_id');
      if (savedId && classesData.some(c => c.id === savedId)) {
        setSelectedClassId(savedId);
      } else if (classesData.length > 0) {
        setSelectedClassId(prev => (prev && classesData.some(c => c.id === prev)) ? prev : classesData[0].id);
      }
    } catch (error: any) {
      console.error('Error fetching data:', error);
    } finally {
      if (!isBackground) setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();

    // Multi-browser / tab focus refresh
    const handleFocus = () => {
      fetchData(true);
    };
    window.addEventListener('focus', handleFocus);

    // Periodic synchronization to ensure live data across different devices/browsers
    const interval = setInterval(() => {
      fetchData(true);
    }, 8000);

    // Supabase Realtime channel subscription
    let channel: any = null;
    if (isSupabaseConfigured()) {
      try {
        const client = getSupabase();
        if (client && typeof client.channel === 'function') {
          channel = client
            .channel('classes-sync-' + Math.random().toString(36).substring(2, 7))
            .on('postgres_changes', { event: '*', schema: 'public', table: 'students' }, () => {
              fetchData(true);
            })
            .on('postgres_changes', { event: '*', schema: 'public', table: 'classes' }, () => {
              fetchData(true);
            })
            .subscribe();
        }
      } catch (err) {
        console.warn('Realtime subscription notice:', err);
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

  const handleIncrementSession = async (student: Student) => {
    try {
      let { sessionsCompleted, currentMonth, paymentStatus } = student;
      
      sessionsCompleted = Math.min(sessionsCompleted + 1, 4);
      
      if (sessionsCompleted >= 4) {
        paymentStatus = 'Unpaid';
      }
      
      const updated = await studentsService.update(student.id, {
        ...student,
        sessionsCompleted,
        paymentStatus
      });
      setStudents(prev => prev.map(s => s.id === student.id ? updated : s));
    } catch (err) {
      console.error('Error incrementing session:', err);
    }
  };

  const handleUpdateStudentMonthStatus = async (student: Student, newMonth: number) => {
    const updatedStudent: Student = {
      ...student,
      currentMonth: newMonth
    };
    setStudents(prev => prev.map(s => s.id === student.id ? updatedStudent : s));
    try {
      await studentsService.update(student.id, updatedStudent);
    } catch (error) {
      console.error('Error updating student month:', error);
    }
  };

  const handleToggleAttendance = async (student: Student, month: number, sessionIndex: number) => {
    const attendance = { ...(student.attendance || {}) };
    const attendanceDates = { ...(student.attendanceDates || {}) };

    const currentAttendanceList = getStudentAttendance(student, selectedClassId, month);
    const currentDatesList = getStudentAttendanceDates(student, selectedClassId, month);

    const monthAttendance: (boolean | string)[] = [...currentAttendanceList];
    const monthDates: string[] = [...currentDatesList];
    
    const currentVal: any = monthAttendance[sessionIndex];
    let nextState: boolean | string;
    let nextDate = '';

    if (currentVal === true || currentVal === 'present') {
      // 1. Green (Present) -> Red (Absent)
      nextState = 'absent';
      nextDate = monthDates[sessionIndex] || new Date().toISOString();
    } else if (currentVal === 'absent') {
      // 2. Red (Absent) -> Normal White (false)
      nextState = false;
      nextDate = '';
    } else {
      // 3. Normal White (false / null / undefined) -> Green (Present)
      nextState = true;
      nextDate = new Date().toISOString();
    }

    monthAttendance[sessionIndex] = nextState;
    monthDates[sessionIndex] = nextDate;
    
    // Update nested structure
    const classAttendance = typeof attendance[selectedClassId] === 'object' && !Array.isArray(attendance[selectedClassId])
      ? { ...(attendance[selectedClassId] as any) }
      : {};
    classAttendance[month] = monthAttendance;

    const classDates = typeof attendanceDates[selectedClassId] === 'object' && !Array.isArray(attendanceDates[selectedClassId])
      ? { ...(attendanceDates[selectedClassId] as any) }
      : {};
    classDates[month] = monthDates;

    attendance[selectedClassId] = classAttendance;
    attendanceDates[selectedClassId] = classDates;
    
    const updatedStudent: Student = {
      ...student,
      attendance,
      attendanceDates
    };
    
    setStudents(prev => prev.map(s => s.id === student.id ? updatedStudent : s));
    if (attendanceStudent && attendanceStudent.id === student.id) {
      setAttendanceStudent(updatedStudent);
    }
    
    try {
      await studentsService.update(student.id, updatedStudent);
    } catch (error) {
      console.error('Error updating attendance:', error);
      // Revert on error
      setStudents(prev => prev.map(s => s.id === student.id ? student : s));
    }
  };

  // Bulk Attendance: Mark ALL students in this class Present or Absent for a specific session (S1, S2, S3, or S4)
  const handleBulkSessionAttendance = async (sessionIndex: number, isPresent: boolean) => {
    if (!selectedClassId) return;
    const currentClass = classes.find(c => c.id === selectedClassId);
    const targetStudents = students.filter(s => {
      const studentClassIds = (s.classIds && s.classIds.length > 0) ? s.classIds : (s.classId ? [s.classId] : []);
      return studentClassIds.includes(selectedClassId) || (currentClass && studentClassIds.includes(currentClass.name)) || s.classId === selectedClassId;
    });
    if (targetStudents.length === 0) return;

    setIsBulkSaving(true);
    const now = new Date().toISOString();

    const updatedStudents = targetStudents.map(student => {
      const attendance = { ...(student.attendance || {}) };
      const attendanceDates = { ...(student.attendanceDates || {}) };

      const currentList = getStudentAttendance(student, selectedClassId, selectedAttendanceMonth);
      const currentDates = getStudentAttendanceDates(student, selectedClassId, selectedAttendanceMonth);

      const monthAttendance = [...currentList];
      const monthDates = [...currentDates];

      const attVal = isPresent ? true : 'absent';
      monthAttendance[sessionIndex] = attVal;
      monthDates[sessionIndex] = now;

      const classAttendance = typeof attendance[selectedClassId] === 'object' && !Array.isArray(attendance[selectedClassId])
        ? { ...(attendance[selectedClassId] as any) }
        : {};
      classAttendance[selectedAttendanceMonth] = monthAttendance;

      const classDates = typeof attendanceDates[selectedClassId] === 'object' && !Array.isArray(attendanceDates[selectedClassId])
        ? { ...(attendanceDates[selectedClassId] as any) }
        : {};
      classDates[selectedAttendanceMonth] = monthDates;

      attendance[selectedClassId] = classAttendance;
      attendanceDates[selectedClassId] = classDates;

      return {
        ...student,
        attendance,
        attendanceDates
      };
    });

    setStudents(prev => prev.map(s => {
      const found = updatedStudents.find(u => u.id === s.id);
      return found || s;
    }));

    try {
      await Promise.all(updatedStudents.map(s => studentsService.update(s.id, s)));
    } catch (err) {
      console.error('Error saving bulk attendance:', err);
    } finally {
      setIsBulkSaving(false);
    }
  };

  // Bulk Attendance: Mark ALL sessions (S1..S4) for ALL students in this class
  const handleBulkAllSessions = async (isPresent: boolean) => {
    if (!selectedClassId) return;
    const currentClass = classes.find(c => c.id === selectedClassId);
    const targetStudents = students.filter(s => {
      const studentClassIds = (s.classIds && s.classIds.length > 0) ? s.classIds : (s.classId ? [s.classId] : []);
      return studentClassIds.includes(selectedClassId) || (currentClass && studentClassIds.includes(currentClass.name)) || s.classId === selectedClassId;
    });
    if (targetStudents.length === 0) return;

    setIsBulkSaving(true);
    const now = new Date().toISOString();
    const attVal = isPresent ? true : 'absent';

    const updatedStudents = targetStudents.map(student => {
      const attendance = { ...(student.attendance || {}) };
      const attendanceDates = { ...(student.attendanceDates || {}) };

      const classAttendance = typeof attendance[selectedClassId] === 'object' && !Array.isArray(attendance[selectedClassId])
        ? { ...(attendance[selectedClassId] as any) }
        : {};
      classAttendance[selectedAttendanceMonth] = [attVal, attVal, attVal, attVal];

      const classDates = typeof attendanceDates[selectedClassId] === 'object' && !Array.isArray(attendanceDates[selectedClassId])
        ? { ...(attendanceDates[selectedClassId] as any) }
        : {};
      classDates[selectedAttendanceMonth] = [now, now, now, now];

      attendance[selectedClassId] = classAttendance;
      attendanceDates[selectedClassId] = classDates;

      return {
        ...student,
        attendance,
        attendanceDates
      };
    });

    setStudents(prev => prev.map(s => {
      const found = updatedStudents.find(u => u.id === s.id);
      return found || s;
    }));

    try {
      await Promise.all(updatedStudents.map(s => studentsService.update(s.id, s)));
    } catch (err) {
      console.error('Error saving bulk all sessions:', err);
    } finally {
      setIsBulkSaving(false);
    }
  };

  // Bulk Payment: Mark all students in class as Paid/Unpaid for the selected month
  const handleBulkMonthPayment = async (isPaid: boolean) => {
    if (!selectedClassId) return;
    const currentClass = classes.find(c => c.id === selectedClassId);
    const targetStudents = students.filter(s => {
      const studentClassIds = (s.classIds && s.classIds.length > 0) ? s.classIds : (s.classId ? [s.classId] : []);
      return studentClassIds.includes(selectedClassId) || (currentClass && studentClassIds.includes(currentClass.name)) || s.classId === selectedClassId;
    });
    if (targetStudents.length === 0) return;

    setIsBulkSaving(true);
    const updatedStudents = targetStudents.map(student => {
      const paidMonths = student.paidMonths || [];
      let updatedPaidMonths: number[];
      if (isPaid) {
        updatedPaidMonths = paidMonths.includes(selectedAttendanceMonth) ? paidMonths : [...paidMonths, selectedAttendanceMonth];
      } else {
        updatedPaidMonths = paidMonths.filter(m => m !== selectedAttendanceMonth);
      }
      return {
        ...student,
        paidMonths: updatedPaidMonths,
        paymentStatus: updatedPaidMonths.includes(student.currentMonth) ? 'Paid' : 'Unpaid' as any
      };
    });

    setStudents(prev => prev.map(s => {
      const found = updatedStudents.find(u => u.id === s.id);
      return found || s;
    }));

    try {
      await Promise.all(updatedStudents.map(s => studentsService.update(s.id, s)));
    } catch (err) {
      console.error('Error updating bulk payments:', err);
    } finally {
      setIsBulkSaving(false);
    }
  };

  const handlePrintMonthReceipt = (student: Student, month: number) => {
    const currentClass = classes.find(c => c.id === selectedClassId || c.id === student.classId || (student.classIds && student.classIds.includes(c.id))) || undefined;
    setPrintReceiptData({
      student,
      month,
      schoolClass: currentClass
    });
    setTimeout(() => {
      window.print();
    }, 150);
  };

  const handlePrintClassAttendanceSheet = () => {
    const currentClass = classes.find(c => c.id === selectedClassId);
    if (!currentClass) return;
    const classSts = students.filter(s => {
      const studentClassIds = (s.classIds && s.classIds.length > 0) ? s.classIds : (s.classId ? [s.classId] : []);
      return studentClassIds.includes(selectedClassId) || (currentClass && studentClassIds.includes(currentClass.name)) || s.classId === selectedClassId;
    });
    const currentTeacher = findTeacher(teachers, currentClass.teacherId);
    
    setPrintClassAttendanceData({
      schoolClass: currentClass,
      month: selectedAttendanceMonth,
      students: classSts,
      teacher: currentTeacher
    });
    setTimeout(() => {
      window.print();
    }, 500);
  };

  const handleToggleMonthPayment = async (student: Student, month: number) => {
    try {
      const paidMonths = student.paidMonths || [];
      const isPaid = paidMonths.includes(month);
      let updatedPaidMonths: number[];

      if (isPaid) {
        updatedPaidMonths = paidMonths.filter(m => m !== month);
      } else {
        updatedPaidMonths = [...paidMonths, month];
      }

      const isCurrentMonth = month === student.currentMonth;
      const newPaymentStatus = updatedPaidMonths.includes(student.currentMonth) ? 'Paid' : 'Unpaid';

      const updatedStudent: Student = {
        ...student,
        paidMonths: updatedPaidMonths,
        paymentStatus: isCurrentMonth ? newPaymentStatus : student.paymentStatus
      };

      setStudents(prev => prev.map(s => s.id === student.id ? updatedStudent : s));
      if (attendanceStudent && attendanceStudent.id === student.id) {
        setAttendanceStudent(updatedStudent);
      }

      await studentsService.update(student.id, updatedStudent);

      if (!isPaid) {
        const schoolClass = classes.find(c => c.id === student.classId);
        if (schoolClass) {
          await paymentsService.create({
            studentId: student.id,
            studentName: student.name,
            classId: student.classId,
            month: month,
            amountPaid: schoolClass.price,
            sarf: schoolClass.price * 0.5,
            sessionDates: [],
            timestamp: new Date().toISOString()
          });
        }
      }
    } catch (error) {
      console.error('Error toggling month payment:', error);
    }
  };

  const handleTogglePaymentStatus = async (student: Student) => {
    try {
      let { paymentStatus, currentMonth, sessionsCompleted, paidMonths = [] } = student;
      
      if (paymentStatus !== 'Paid') {
        paymentStatus = 'Paid';
        
        // Reset sessions if they have finished the 4 sessions for the current month
        if (sessionsCompleted >= 4) {
            sessionsCompleted = 0;
        }

        if (!paidMonths.includes(currentMonth)) {
          paidMonths = [...paidMonths, currentMonth];
        }
        
        const schoolClass = classes.find(c => c.id === student.classId);
        if (schoolClass) {
          await paymentsService.create({
              studentId: student.id,
              studentName: student.name,
              classId: student.classId,
              month: currentMonth,
              amountPaid: schoolClass.price,
              sarf: schoolClass.price * 0.5,
              sessionDates: [],
              timestamp: new Date().toISOString()
          });
        }
      } else {
        paymentStatus = 'Unpaid';
        paidMonths = paidMonths.filter(m => m !== currentMonth);
      }
      
      const updated = await studentsService.update(student.id, {
        ...student,
        paymentStatus,
        paidMonths,
        sessionsCompleted
      });
      setStudents(prev => prev.map(s => s.id === student.id ? updated : s));
    } catch (err) {
      console.error('Error updating payment status:', err);
    }
  };

  const handleCreateClass = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const created = await classesService.create(newClass);
      setClasses(prev => [...prev, created]);
      setSelectedClassId(created.id);
      setIsClassModalOpen(false);
      setNewClass({ name: '', price: 0, description: '', teacherId: '' });
    } catch (error) {
      console.error('Error creating class:', error);
    }
  };

  const handleDeleteClass = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm(tr('هل أنت متأكد من حذف هذا القسم؟', 'Êtes-vous sûr de vouloir supprimer cette classe ?', 'Are you sure you want to delete this class?'))) return;
    try {
      await classesService.delete(id);
      setClasses(prev => prev.filter(c => c.id !== id));
      if (selectedClassId === id) {
        setSelectedClassId(classes.find(c => c.id !== id)?.id || '');
      }
    } catch (error) {
      console.error('Error deleting class:', error);
    }
  };

  const handleCreateStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStudent.name.trim() || !newStudent.parentPhone.trim()) {
      alert(tr('يرجى إدخال الاسم ورقم الهاتف.', 'Veuillez renseigner le nom et le numéro de téléphone.', 'Please enter the name and phone number.'));
      return;
    }
    const targetClassId = selectedClassId || (classes[0]?.id || '');
    if (!targetClassId) {
      alert(tr('يرجى اختيار قسم أولاً.', 'Veuillez d\'abord sélectionner une classe.', 'Please select a class first.'));
      return;
    }

    try {
      setIsSubmittingStudent(true);
      const created = await studentsService.create({ 
        ...newStudent, 
        classId: targetClassId,
        classIds: [targetClassId],
        paymentStatus: newStudent.paymentStatus || 'Pending'
      });
      setStudents(prev => [...prev.filter(s => s.id !== created.id), created]);
      setIsStudentModalOpen(false);
      setNewStudent({
        name: '',
        parentPhone: '',
        secondaryPhone: '',
        email: '',
        birthDate: '',
        address: '',
        classId: '',
        tokenId: '',
        currentMonth: 1,
        paidMonths: [],
        sessionsCompleted: 0,
        paymentStatus: 'Pending'
      });
      setStudentActionSuccess(tr('تم إنشاء وتسجيل التلميذ بنجاح!', 'Élève créé et inscrit avec succès !', 'Student created and enrolled successfully!'));
      setTimeout(() => setStudentActionSuccess(null), 3500);
      await fetchData(true);
    } catch (error: any) {
      console.error('Error creating student:', error);
      alert(tr('حدث خطأ أثناء إنشاء التلميذ: ', 'Erreur lors de la création de l\'élève : ', 'Error creating student: ') + (error?.message || tr('خطأ في الشبكة', 'Erreur réseau', 'Network error')));
    } finally {
      setIsSubmittingStudent(false);
    }
  };

  const handleAssignExistingStudent = async (studentId: string) => {
    const targetStudent = students.find(s => s.id === studentId);
    if (!targetStudent || !selectedClassId) return;

    try {
      const currentClassIds = Array.isArray(targetStudent.classIds) && targetStudent.classIds.length > 0
        ? targetStudent.classIds 
        : (targetStudent.classId ? [targetStudent.classId] : []);
      
      const newClassIds = currentClassIds.includes(selectedClassId)
        ? currentClassIds
        : [...currentClassIds, selectedClassId];
      
      // If student has no primary classId, set the new class as primary.
      const newClassId = targetStudent.classId || selectedClassId;

      const updated = await studentsService.update(targetStudent.id, {
        ...targetStudent,
        classId: newClassId,
        classIds: newClassIds
      });
      
      setStudents(prev => prev.map(s => s.id === studentId ? updated : s));
      setStudentActionSuccess(tr(`تم تسجيل ${targetStudent.name} في هذا القسم!`, `${targetStudent.name} inscrit(e) dans cette classe !`, `${targetStudent.name} enrolled in this class!`));
      setTimeout(() => setStudentActionSuccess(null), 3500);
      await fetchData(true);
    } catch (error: any) {
      console.error('Error assigning student:', error);
      alert(tr('حدث خطأ أثناء تسجيل التلميذ: ', 'Erreur lors de l\'inscription de l\'élève : ', 'Error enrolling student: ') + (error?.message || tr('خطأ في الشبكة', 'Erreur réseau', 'Network error')));
    }
  };

  const handleRemoveStudentFromClass = async (student: Student) => {
    if (!confirm(tr('هل تريد إزالة هذا التلميذ من هذا القسم؟', 'Retirer cet étudiant de cette classe ?', 'Remove this student from this class?'))) return;
    try {
      const currentClassIds = Array.isArray(student.classIds) && student.classIds.length > 0
        ? student.classIds
        : (student.classId ? [student.classId] : []);
      const newClassIds = currentClassIds.filter(id => id !== selectedClassId);
      const newClassId = student.classId === selectedClassId ? (newClassIds.length > 0 ? newClassIds[0] : '') : student.classId;

      const updated = await studentsService.update(student.id, {
        ...student,
        classId: newClassId,
        classIds: newClassIds
      });

      setStudents(prev => prev.map(s => s.id === student.id ? updated : s));
      setStudentActionSuccess(tr(`تمت إزالة ${student.name} من القسم.`, `${student.name} retiré(e) de la classe.`, `${student.name} removed from class.`));
      setTimeout(() => setStudentActionSuccess(null), 3500);
      await fetchData(true);
    } catch (error) {
      console.error('Error removing student from class:', error);
    }
  };

  const handleUpdateClass = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const updated = await classesService.update(editingClassId, editClass);
      setClasses(prev => prev.map(c => c.id === editingClassId ? updated : c));
      setIsEditClassModalOpen(false);
    } catch (error) {
      console.error('Error updating class:', error);
    }
  };

  const handleUpdateStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const updated = await studentsService.update(editingStudentId, editStudent);
      setStudents(prev => prev.map(s => s.id === editingStudentId ? updated : s));
      setIsEditStudentModalOpen(false);
    } catch (error) {
      console.error('Error updating student:', error);
    }
  };

  const selectedClass = classes.find(c => c.id === selectedClassId);
  const classStudents = students.filter(s => {
    const studentClassIds = (s.classIds && s.classIds.length > 0)
      ? s.classIds
      : (s.classId ? [s.classId] : []);
    const inThisClass = 
      studentClassIds.includes(selectedClassId) ||
      (selectedClass && studentClassIds.includes(selectedClass.name)) ||
      s.classId === selectedClassId ||
      (selectedClass && s.classId === selectedClass.name);
    return inThisClass && (search === '' || s.name.toLowerCase().includes(search.toLowerCase()));
  });

  if (loading) {
    return (
      <div className="h-[60vh] flex items-center justify-center">
        <Loader2 className="w-10 h-10 text-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className={cn("space-y-6 animate-in", isRTL && "text-right")}>
      <header className={cn("flex flex-col md:flex-row justify-between items-start md:items-end gap-4", isRTL && "md:flex-row-reverse")}>
        <div className="">
          <h1 className="text-3xl font-bold text-primary tracking-tight">{t('academic_classes')}</h1>
          <p className="text-slate-500 mt-1">{t('manage_rosters')}</p>
        </div>
        {activeRole === 'director' ? (
          <button 
            onClick={() => setIsClassModalOpen(true)}
            className="w-full md:w-auto bg-primary hover:bg-primary/90 text-white px-6 py-3 rounded-xl text-sm font-semibold shadow-lg shadow-primary/10 transition-all flex items-center justify-center gap-2"
          >
            <Plus size={18} />
            {t('create_class')}
          </button>
        ) : (
          <div className="flex items-center gap-2 text-xs font-black text-slate-400 bg-slate-50 border border-slate-100 px-4 py-3 rounded-2xl">
            <AlertCircle size={15} className="text-amber-500" />
            <span>{tr('إنشاء الأقسام مخصص للمدير فقط', 'Création réservée au Directeur', 'Class creation reserved for Director')}</span>
          </div>
        )}
      </header>

      <div className={cn("grid grid-cols-1 lg:grid-cols-12 gap-10 pt-8 border-t border-slate-100", isRTL && "lg:flex lg:flex-row-reverse")}>
        {/* Sidebar Classes List */}
        <div className="lg:col-span-3 space-y-4">
          <h3 className={cn("text-xs font-black text-slate-400 uppercase tracking-widest px-2", isRTL && "text-right")}>{t('program_selector')}</h3>
          <div className="space-y-2">
            {classes.length === 0 ? (
              <p className="p-5 text-sm text-slate-400 italic font-medium">{tr('لم يتم العثور على أي قسم', 'Aucune classe trouvée', 'No classes found')}</p>
            ) : classes.map((c) => {
              const assignedTeacher = findTeacher(teachers, c.teacherId);
              return (
              <div key={c.id} className="group relative">
                <button
                  onClick={() => {
                    setSelectedClassId(c.id);
                    localStorage.setItem('samy_selected_class_id', c.id);
                  }}
                  className={cn(
                    "w-full text-left p-5 rounded-2xl transition-all relative overflow-hidden pr-20",
                    selectedClassId === c.id 
                      ? "bg-primary text-white shadow-xl shadow-primary/20" 
                      : "bg-white text-slate-600 hover:bg-slate-50",
                    isRTL && "text-right pl-20 pr-5"
                  )}
                >
                  <div className="relative z-10">
                    <p className={cn(
                      "text-[10px] font-black uppercase tracking-[0.2em] mb-1",
                      selectedClassId === c.id ? "text-accent" : "text-slate-400"
                    )}>
                      {t('subscription')}: {c.price} {t('currency')}
                    </p>
                    <h4 className="font-black text-lg leading-tight tracking-tight">{c.name}</h4>
                    <div className={cn(
                      "mt-2 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold transition-all",
                      selectedClassId === c.id 
                        ? "bg-white/15 text-white border border-white/20" 
                        : "bg-slate-100 text-slate-700 border border-slate-200",
                      isRTL && "flex-row-reverse"
                    )}>
                      <GraduationCap size={13} className={selectedClassId === c.id ? "text-accent" : "text-primary shrink-0"} />
                      <span className="truncate">
                        {assignedTeacher ? assignedTeacher.name : tr('بدون أستاذ', 'Non assigné', 'Unassigned')}
                      </span>
                    </div>
                  </div>
                </button>
                <div className={cn(
                  "absolute top-1/2 -translate-y-1/2 flex items-center gap-1 z-20",
                  isRTL ? "left-2" : "right-1"
                )}>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setEditingClassId(c.id);
                      setEditClass({ name: c.name, price: c.price, description: c.description || '', teacherId: c.teacherId || '' });
                      setIsEditClassModalOpen(true);
                    }}
                    className={cn(
                      "p-2 text-slate-400 hover:text-accent transition-all rounded-lg hover:bg-slate-100/50",
                      selectedClassId === c.id && "text-white/80 hover:text-white hover:bg-white/10"
                    )}
                    title={tr('تعديل', 'Modifier', 'Edit')}
                  >
                    <Pencil size={15} />
                  </button>
                  <button
                    onClick={(e) => handleDeleteClass(c.id, e)}
                    className={cn(
                      "p-2 text-slate-400 hover:text-rose-500 transition-all rounded-lg hover:bg-rose-50",
                      selectedClassId === c.id && "text-rose-300 hover:text-rose-100 hover:bg-white/10"
                    )}
                    title={tr('حذف القسم', 'Supprimer la classe', 'Delete class')}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            );
            })}
          </div>
        </div>

        {/* Students Table for Selected Class */}
        <div className="lg:col-span-9 space-y-8">
          <div className="min-h-[500px] flex flex-col">
            {selectedClass ? (
              (() => {
                const currentTeacher = findTeacher(teachers, selectedClass.teacherId);
                return (
                <>
                <div className={cn("pb-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-6", isRTL && "md:flex-row-reverse")}>
                  <div className={cn("flex items-center gap-6", isRTL && "flex-row-reverse")}>
                     <div className="w-12 h-12 md:w-16 md:h-16 bg-accent/10 text-accent rounded-2xl md:rounded-3xl flex items-center justify-center shrink-0">
                        <BookOpen size={24} className="md:w-8 md:h-8 shrink-0" />
                     </div>
                     <div className={cn(isRTL && "text-right")}>
                        <div className={cn("flex items-center gap-2", isRTL && "flex-row-reverse")}>
                           <h2 className="text-2xl md:text-4xl font-black text-primary tracking-tighter">{selectedClass?.name}</h2>
                           <div className="flex items-center gap-1">
                             <button
                               onClick={() => {
                                 setEditingClassId(selectedClass.id);
                                 setEditClass({ name: selectedClass.name, price: selectedClass.price, description: selectedClass.description || '', teacherId: selectedClass.teacherId || '' });
                                 setIsEditClassModalOpen(true);
                               }}
                               className="text-slate-400 hover:text-accent p-1.5 rounded-lg hover:bg-slate-50 transition-all"
                               title={tr('تعديل القسم', 'Modifier le cours', 'Edit class')}
                             >
                               <Pencil size={18} />
                             </button>
                             <button
                               onClick={(e) => handleDeleteClass(selectedClass.id, e)}
                               className="text-slate-400 hover:text-rose-600 p-1.5 rounded-lg hover:bg-rose-50 transition-all"
                               title={tr('حذف القسم', 'Supprimer le cours', 'Delete class')}
                             >
                               <Trash2 size={18} />
                             </button>
                           </div>
                        </div>
                        <div className={cn("flex flex-wrap items-center gap-3 mt-1.5", isRTL && "flex-row-reverse")}>
                          <p className="text-[10px] md:text-xs text-slate-500 font-bold uppercase tracking-[0.2em]">
                            {t('monthly_price')}: <span className="text-accent">{selectedClass?.price} {t('currency')}</span>
                          </p>
                          <span className="text-slate-300">•</span>
                          <div className="inline-flex flex-wrap items-center gap-2 bg-primary/5 border border-primary/10 px-3 py-1.5 rounded-xl text-xs font-bold text-primary">
                            <div className="flex items-center gap-1.5">
                              <GraduationCap size={15} className="text-accent shrink-0" />
                              <span>
                                {currentTeacher 
                                  ? `${tr('الأستاذ:', 'Prof:', 'Teacher:')} ${currentTeacher.name}` 
                                  : tr('لم يتم تعيين أستاذ', 'Aucun enseignant assigné', 'No teacher assigned')}
                              </span>
                            </div>
                            {currentTeacher && (
                              <div className={cn("flex flex-wrap items-center gap-2 text-[11px] font-medium text-slate-500 border-slate-200/80", isRTL ? "border-r pr-2" : "border-l pl-2")}>
                                {(currentTeacher.phone || currentTeacher.email) && (
                                  <span className="text-slate-700 font-bold">
                                    📞 {currentTeacher.phone || currentTeacher.email}
                                  </span>
                                )}
                                {currentTeacher.secondaryPhone && (
                                  <span className="text-slate-500 font-medium">{tr('هاتف 2:', 'Tél 2:', 'Phone 2:')} {currentTeacher.secondaryPhone}</span>
                                )}
                                {currentTeacher.phone && currentTeacher.email && (
                                  <span className="text-slate-500 font-medium">✉️ {currentTeacher.email}</span>
                                )}
                                {currentTeacher.birthDate && (
                                  <span className="text-slate-500 font-medium">🎂 {currentTeacher.birthDate}</span>
                                )}
                                {currentTeacher.address && (
                                  <span className="text-slate-500 font-medium">📍 {currentTeacher.address}</span>
                                )}
                              </div>
                            )}
                          </div>
                          <span className="text-slate-300">•</span>
                          <span className="text-xs font-bold text-slate-500">
                            {classStudents.length} {tr('تلميذ', 'élève(s)', 'student(s)')}
                          </span>
                        </div>
                     </div>
                  </div>
                  
                  <div className="flex items-center gap-3 w-full md:w-auto">
                    <div className="relative flex-1 md:w-64">
                      <Search className={cn("absolute top-1/2 -translate-y-1/2 text-slate-400", isRTL ? "right-4" : "left-4")} size={18} />
                      <input
                        type="text"
                        placeholder={t('search_student')}
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className={cn(
                          "w-full py-2.5 bg-slate-50 rounded-2xl text-xs font-bold focus:ring-4 focus:ring-primary/5 outline-none transition-all placeholder:text-slate-400",
                          isRTL ? "pr-10 pl-4 text-right" : "pl-10 pr-4"
                        )}
                      />
                    </div>

                    {/* View mode toggle */}
                    <div className="flex bg-slate-100 p-1 rounded-2xl shrink-0">
                      <button
                        onClick={() => setViewMode('attendance')}
                        className={cn(
                          "px-3 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-1.5",
                          viewMode === 'attendance' ? "bg-primary text-white shadow-md shadow-primary/20" : "text-slate-600 hover:text-slate-900"
                        )}
                        title={tr('ورقة الحضور والغياب', 'Feuille de Présence Multi-Colonnes', 'Multi-Column Attendance Sheet')}
                      >
                        <CheckCheck size={15} />
                        <span className="hidden sm:inline">{tr('الحضور', 'Présences', 'Attendance')}</span>
                      </button>
                      <button
                        onClick={() => setViewMode('details')}
                        className={cn(
                          "px-3 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-1.5",
                          viewMode === 'details' ? "bg-primary text-white shadow-md shadow-primary/20" : "text-slate-600 hover:text-slate-900"
                        )}
                        title={tr('القائمة والتسجيلات', 'Liste & Inscriptions', 'Roster & Enrollments')}
                      >
                        <Users size={15} />
                        <span className="hidden sm:inline">{tr('القائمة', 'Liste', 'List')}</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* MONTH SELECTOR & BULK ACTIONS BAR (When in Attendance Mode) */}
                {viewMode === 'attendance' && (
                  <div className="space-y-4 mb-6 bg-slate-50/70 p-4 sm:p-5 rounded-3xl border border-slate-200/80">
                    {/* 12 Months Horizontal Pills */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-black uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                          <Calendar size={14} className="text-primary" />
                          <span>{tr('شهر تسجيل الحضور والمواظبة:', 'Mois de pointage & d\'assiduité :', 'Attendance & Tracking Month:')}</span>
                        </span>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={handlePrintClassAttendanceSheet}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 shadow-xs transition-all cursor-pointer active:scale-95"
                            title={tr('طباعة ورقة الحضور (A4)', 'Imprimer la feuille d\'appel A4', 'Print A4 Attendance Sheet')}
                          >
                            <Printer size={13} className="text-primary" />
                            <span>{tr('طباعة ورقة الحضور (A4)', 'Imprimer Feuille d\'Appel (A4)', 'Print Attendance Sheet (A4)')}</span>
                          </button>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
                        {[...Array(12)].map((_, idx) => {
                          const m = idx + 1;
                          const isSelected = selectedAttendanceMonth === m;
                          // Calculate present count for this month
                          const totalPresentThisMonth = classStudents.reduce((acc, s) => {
                            const att = getStudentAttendance(s, selectedClassId, m);
                            return acc + att.filter(val => val === true || val === 'present').length;
                          }, 0);

                          return (
                            <button
                              key={m}
                              type="button"
                              onClick={() => setSelectedAttendanceMonth(m)}
                              className={cn(
                                "px-3.5 py-2 rounded-2xl text-xs font-black transition-all flex items-center gap-2 shrink-0 border",
                                isSelected
                                  ? "bg-primary text-white border-primary shadow-md shadow-primary/20 scale-105"
                                  : "bg-white text-slate-700 border-slate-200 hover:border-slate-300 hover:bg-slate-100"
                              )}
                            >
                              <span>{tr(`الشهر ${m}`, `Mois ${m}`, `Month ${m}`)}</span>
                              <span className={cn(
                                "px-1.5 py-0.2 rounded-md text-[10px] font-bold",
                                isSelected ? "bg-white/20 text-white" : "bg-slate-100 text-slate-500"
                              )}>
                                {totalPresentThisMonth} {tr('ح', 'pt', 'pt')}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}

                {/* TABLE VIEW 1: MULTI-COLUMN ATTENDANCE GRID */}
                {viewMode === 'attendance' ? (
                  <div className="flex-1 overflow-x-auto w-full bg-white rounded-3xl border border-slate-200 shadow-sm">
                    <table className={cn("w-full text-left min-w-[850px]", isRTL && "text-right")}>
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 text-[10px] font-black uppercase tracking-[0.15em]">
                          <th className="px-5 py-4 w-12 text-center">#</th>
                          <th className="px-5 py-4 min-w-[200px]">{tr('التلميذ', 'Élève', 'Student')}</th>
                          <th className="px-4 py-4 min-w-[130px]">{tr('الهاتف', 'Téléphone', 'Phone')}</th>

                          {/* S1 Column */}
                          <th className="px-3 py-4 text-center min-w-[110px] bg-slate-100/50">
                            <div className="flex flex-col items-center gap-1">
                              <span className="font-black text-slate-800">{tr('الحصة 1', 'Séance 1', 'Session 1')}</span>
                              <div className="flex items-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => handleBulkSessionAttendance(0, true)}
                                  className="px-1.5 py-0.5 bg-emerald-100 hover:bg-emerald-200 text-emerald-800 rounded text-[9px] font-black tracking-tight"
                                  title={tr('تحديد كل القسم حاضر في ح1', 'Marquer toute la classe Présente en S1', 'Mark entire class Present in S1')}
                                >
                                  {tr('+ الكل', '+ Tous', '+ All')}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleBulkSessionAttendance(0, false)}
                                  className="px-1.5 py-0.5 bg-rose-100 hover:bg-rose-200 text-rose-800 rounded text-[9px] font-black tracking-tight"
                                  title={tr('تحديد كل القسم غائب في ح1', 'Marquer toute la classe Absente en S1', 'Mark entire class Absent in S1')}
                                >
                                  {tr('- الكل', '- Tous', '- All')}
                                </button>
                              </div>
                            </div>
                          </th>

                          {/* S2 Column */}
                          <th className="px-3 py-4 text-center min-w-[110px]">
                            <div className="flex flex-col items-center gap-1">
                              <span className="font-black text-slate-800">{tr('الحصة 2', 'Séance 2', 'Session 2')}</span>
                              <div className="flex items-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => handleBulkSessionAttendance(1, true)}
                                  className="px-1.5 py-0.5 bg-emerald-100 hover:bg-emerald-200 text-emerald-800 rounded text-[9px] font-black tracking-tight"
                                  title={tr('تحديد كل القسم حاضر في ح2', 'Marquer toute la classe Présente en S2', 'Mark entire class Present in S2')}
                                >
                                  {tr('+ الكل', '+ Tous', '+ All')}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleBulkSessionAttendance(1, false)}
                                  className="px-1.5 py-0.5 bg-rose-100 hover:bg-rose-200 text-rose-800 rounded text-[9px] font-black tracking-tight"
                                  title={tr('تحديد كل القسم غائب في ح2', 'Marquer toute la classe Absente en S2', 'Mark entire class Absent in S2')}
                                >
                                  {tr('- الكل', '- Tous', '- All')}
                                </button>
                              </div>
                            </div>
                          </th>

                          {/* S3 Column */}
                          <th className="px-3 py-4 text-center min-w-[110px] bg-slate-100/50">
                            <div className="flex flex-col items-center gap-1">
                              <span className="font-black text-slate-800">{tr('الحصة 3', 'Séance 3', 'Session 3')}</span>
                              <div className="flex items-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => handleBulkSessionAttendance(2, true)}
                                  className="px-1.5 py-0.5 bg-emerald-100 hover:bg-emerald-200 text-emerald-800 rounded text-[9px] font-black tracking-tight"
                                  title={tr('تحديد كل القسم حاضر في ح3', 'Marquer toute la classe Présente en S3', 'Mark entire class Present in S3')}
                                >
                                  {tr('+ الكل', '+ Tous', '+ All')}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleBulkSessionAttendance(2, false)}
                                  className="px-1.5 py-0.5 bg-rose-100 hover:bg-rose-200 text-rose-800 rounded text-[9px] font-black tracking-tight"
                                  title={tr('تحديد كل القسم غائب في ح3', 'Marquer toute la classe Absente en S3', 'Mark entire class Absent in S3')}
                                >
                                  {tr('- الكل', '- Tous', '- All')}
                                </button>
                              </div>
                            </div>
                          </th>

                          {/* S4 Column */}
                          <th className="px-3 py-4 text-center min-w-[110px]">
                            <div className="flex flex-col items-center gap-1">
                              <span className="font-black text-slate-800">{tr('الحصة 4', 'Séance 4', 'Session 4')}</span>
                              <div className="flex items-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => handleBulkSessionAttendance(3, true)}
                                  className="px-1.5 py-0.5 bg-emerald-100 hover:bg-emerald-200 text-emerald-800 rounded text-[9px] font-black tracking-tight"
                                  title={tr('تحديد كل القسم حاضر في ح4', 'Marquer toute la classe Présente en S4', 'Mark entire class Present in S4')}
                                >
                                  {tr('+ الكل', '+ Tous', '+ All')}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleBulkSessionAttendance(3, false)}
                                  className="px-1.5 py-0.5 bg-rose-100 hover:bg-rose-200 text-rose-800 rounded text-[9px] font-black tracking-tight"
                                  title={tr('تحديد كل القسم غائب في ح4', 'Marquer toute la classe Absente en S4', 'Mark entire class Absent in S4')}
                                >
                                  {tr('- الكل', '- Tous', '- All')}
                                </button>
                              </div>
                            </div>
                          </th>

                          <th className="px-4 py-4 text-center min-w-[100px]">{tr('المواظبة', 'Assiduité', 'Attendance')}</th>
                          <th className="px-4 py-4 text-center min-w-[110px]">{tr(`دفع ش${selectedAttendanceMonth}`, `Paiement M${selectedAttendanceMonth}`, `Payment M${selectedAttendanceMonth}`)}</th>
                          <th className={cn("px-5 py-4", isRTL ? "text-left" : "text-right")}>{tr('الإجراءات', 'Actions', 'Actions')}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {classStudents.length === 0 ? (
                          <tr>
                            <td colSpan={10} className="px-8 py-20 text-center text-slate-400 font-medium">
                              {tr('لا يوجد أي تلميذ مسجل في هذا القسم', 'Aucun étudiant enregistré dans cette classe', 'No students enrolled in this class')}
                            </td>
                          </tr>
                        ) : classStudents.map((s, index) => {
                          const attendanceList = getStudentAttendance(s, selectedClassId, selectedAttendanceMonth);
                          const datesList = getStudentAttendanceDates(s, selectedClassId, selectedAttendanceMonth);
                          const isPaidThisMonth = (s.paidMonths || []).includes(selectedAttendanceMonth);
                          const totalPresent = attendanceList.filter(val => val === true || val === 'present').length;

                          return (
                            <tr key={s.id} className="hover:bg-slate-50/70 transition-colors group">
                              {/* Index */}
                              <td className="px-5 py-4 text-center text-xs font-mono font-bold text-slate-400">
                                {index + 1}
                              </td>

                              {/* Student info */}
                              <td className="px-5 py-4">
                                <div>
                                  <p className="text-sm font-black text-slate-900 group-hover:text-primary transition-colors">{s.name}</p>
                                  {s.tokenId && (
                                    <span className="inline-block mt-0.5 font-mono text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.2 rounded font-bold">
                                      {s.tokenId}
                                    </span>
                                  )}
                                  {s.email && (
                                    <p className="text-[11px] text-slate-400 font-medium pt-0.5">✉️ {s.email}</p>
                                  )}
                                  {s.birthDate && (
                                    <p className="text-[11px] text-slate-400 font-medium">🎂 {tr('تاريخ الميلاد:', 'Né(e) le:', 'DOB:')} {s.birthDate}</p>
                                  )}
                                  {s.address && (
                                    <p className="text-[11px] text-slate-400 font-medium truncate max-w-[180px]">📍 {s.address}</p>
                                  )}
                                </div>
                              </td>

                              {/* Phone */}
                              <td className="px-4 py-4">
                                <div className="flex flex-col gap-0.5 text-slate-600 font-bold text-xs">
                                  <div className="flex items-center gap-1.5">
                                    <Phone size={12} className="text-slate-400 shrink-0" />
                                    <span dir="ltr">{s.parentPhone || '—'}</span>
                                  </div>
                                  {s.secondaryPhone && (
                                    <p className="text-[11px] text-slate-400 font-medium" dir="ltr">{tr('هاتف 2:', 'Tél 2:', 'Phone 2:')} {s.secondaryPhone}</p>
                                  )}
                                </div>
                              </td>

                              {/* 4 Attendance Toggle Cells: S1, S2, S3, S4 */}
                              {[0, 1, 2, 3].map((sessionIdx) => {
                                const sessionVal = attendanceList[sessionIdx];
                                const isPresent = sessionVal === true || sessionVal === 'present';
                                const isAbsent = sessionVal === 'absent';
                                const dateStr = datesList[sessionIdx] 
                                  ? new Date(datesList[sessionIdx]).toLocaleString(dateLocale, { dateStyle: 'short', timeStyle: 'short' })
                                  : null;

                                return (
                                  <td key={sessionIdx} className={cn("px-3 py-4 text-center", (sessionIdx === 0 || sessionIdx === 2) && "bg-slate-50/30")}>
                                    <button
                                      type="button"
                                      onClick={() => handleToggleAttendance(s, selectedAttendanceMonth, sessionIdx)}
                                      className={cn(
                                        "w-9 h-9 rounded-xl font-black text-xs transition-all inline-flex flex-col items-center justify-center cursor-pointer shadow-2xs active:scale-90 border",
                                        isPresent
                                          ? "bg-emerald-500 hover:bg-emerald-600 text-white border-emerald-600 shadow-emerald-500/20"
                                          : isAbsent
                                          ? "bg-rose-500 hover:bg-rose-600 text-white border-rose-600 shadow-rose-500/20"
                                          : "bg-white hover:bg-slate-100 text-slate-400 hover:text-slate-700 border-slate-200 hover:border-slate-300"
                                      )}
                                      title={
                                        isPresent
                                          ? tr(
                                              `الحصة ${sessionIdx + 1}: حاضر (${dateStr || 'مسجل'}) — انقر للتحديد كغائب`,
                                              `Séance ${sessionIdx + 1} : Présent (${dateStr || 'Enregistré'}) — Clic pour marquer Absent`,
                                              `Session ${sessionIdx + 1}: Present (${dateStr || 'Recorded'}) — Click to mark Absent`
                                            )
                                          : isAbsent
                                          ? tr(
                                              `الحصة ${sessionIdx + 1}: غائب — انقر لإعادة التعيين (محايد)`,
                                              `Séance ${sessionIdx + 1} : Absent — Clic pour réinitialiser (Neutre / Blanc)`,
                                              `Session ${sessionIdx + 1}: Absent — Click to reset (Neutral)`
                                            )
                                          : tr(
                                              `الحصة ${sessionIdx + 1}: غير محدد — انقر لتسجيل الحضور`,
                                              `Séance ${sessionIdx + 1} : Non renseigné (Neutre) — Clic pour marquer Présent`,
                                              `Session ${sessionIdx + 1}: Unmarked — Click to mark Present`
                                            )
                                      }
                                    >
                                      {isPresent ? (
                                        <Check size={16} className="stroke-[3]" />
                                      ) : isAbsent ? (
                                        <X size={16} className="stroke-[3]" />
                                      ) : (
                                        <span className="text-[11px] font-extrabold text-slate-400">{tr(`ح${sessionIdx + 1}`, `S${sessionIdx + 1}`, `S${sessionIdx + 1}`)}</span>
                                      )}
                                    </button>
                                  </td>
                                );
                              })}

                              {/* Total Attendance Bar */}
                              <td className="px-4 py-4 text-center">
                                <div className="inline-flex flex-col items-center gap-1">
                                  <span className={cn(
                                    "px-2.5 py-0.5 rounded-lg text-[11px] font-black border",
                                    totalPresent === 4 ? "bg-emerald-100 text-emerald-800 border-emerald-200" :
                                    totalPresent >= 2 ? "bg-amber-100 text-amber-800 border-amber-200" :
                                    "bg-slate-100 text-slate-600 border-slate-200"
                                  )}>
                                    {totalPresent}/4
                                  </span>
                                  <div className="w-12 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                    <div 
                                      className={cn(
                                        "h-full rounded-full transition-all",
                                        totalPresent === 4 ? "bg-emerald-500" : totalPresent >= 2 ? "bg-amber-500" : "bg-rose-500"
                                      )}
                                      style={{ width: `${(totalPresent / 4) * 100}%` }}
                                    />
                                  </div>
                                </div>
                              </td>

                              {/* Payment Month Badge */}
                              <td className="px-4 py-4 text-center">
                                <button
                                  type="button"
                                  onClick={() => handleToggleMonthPayment(s, selectedAttendanceMonth)}
                                  className={cn(
                                    "px-3 py-1.5 rounded-xl text-xs font-black transition-all border shadow-2xs whitespace-nowrap cursor-pointer active:scale-95",
                                    isPaidThisMonth
                                      ? "bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border-emerald-300"
                                      : "bg-rose-50 hover:bg-rose-100 text-rose-700 border-rose-200"
                                  )}
                                  title={tr('انقر لتغيير حالة الدفع لهذا الشهر', 'Cliquer pour changer le statut de paiement pour ce mois', 'Click to toggle payment status for this month')}
                                >
                                  {isPaidThisMonth ? tr('✓ مدفوع', '✓ Payé', '✓ Paid') : tr('✕ غير مدفوع', '✕ Non Payé', '✕ Unpaid')}
                                </button>
                              </td>

                              {/* Actions */}
                              <td className={cn("px-5 py-4", isRTL ? "text-left" : "text-right")}>
                                <div className={cn("relative z-50 flex items-center gap-2 justify-end", isRTL && "justify-start")}>
                                  <button
                                    onClick={() => {
                                      handlePrintMonthReceipt(s, selectedAttendanceMonth);
                                    }}
                                    className="p-2 text-slate-400 hover:text-primary hover:bg-slate-100 rounded-xl transition-all cursor-pointer"
                                    title={tr('طباعة وصل الدفع', 'Imprimer le reçu de paiement', 'Print payment receipt')}
                                  >
                                    <Printer size={15} />
                                  </button>
                                  <button
                                    onClick={() => {
                                      setAttendanceStudent(s);
                                    }}
                                    className="p-2 text-slate-400 hover:text-accent hover:bg-slate-100 rounded-xl transition-all cursor-pointer"
                                    title={tr('عرض السجل السنوي الكامل', 'Voir l\'historique annuel complet', 'View full annual history')}
                                  >
                                    <Calendar size={15} />
                                  </button>
                                  <button
                                    onClick={() => {
                                      setEditingStudentId(s.id);
                                      setEditStudent({
                                        name: s.name,
                                        parentPhone: s.parentPhone,
                                        secondaryPhone: s.secondaryPhone || '',
                                        email: s.email || '',
                                        birthDate: s.birthDate || '',
                                        address: s.address || '',
                                        classId: s.classId,
                                        tokenId: s.tokenId || ''
                                      });
                                      setIsEditStudentModalOpen(true);
                                    }}
                                    className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-all cursor-pointer"
                                    title={tr('تعديل التلميذ', 'Modifier l\'élève', 'Edit student')}
                                  >
                                    <Pencil size={15} />
                                  </button>
                                  <button
                                    onClick={() => {
                                      handleRemoveStudentFromClass(s);
                                    }}
                                    className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all cursor-pointer"
                                    title={tr('إزالة التلميذ من هذا القسم', 'Retirer l\'étudiant de cette classe', 'Remove student from this class')}
                                  >
                                    <Trash2 size={15} />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  /* TABLE VIEW 2: STANDARD / DETAILED LIST */
                  <div className="flex-1 overflow-x-auto w-full bg-white rounded-3xl border border-slate-200 shadow-sm">
                    <table className={cn("w-full text-left min-w-[650px]", isRTL && "text-right")}>
                      <thead>
                        <tr className="bg-slate-50 text-slate-400 text-[10px] font-black uppercase tracking-[0.2em] border-b border-slate-200">
                          <th className="px-8 py-5">{t('student_name')}</th>
                          <th className="px-8 py-5">{t('parent_phone')}</th>
                          <th className="px-8 py-5">{t('token_id')}</th>
                          <th className="px-8 py-5">{tr('الشهر الحالي', 'Mois Actuel', 'Current Month')}</th>
                          <th className={cn("px-8 py-5", isRTL ? "text-left" : "text-right")}>{tr('الإجراءات', 'Actions', 'Actions')}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {classStudents.length === 0 ? (
                          <tr>
                            <td colSpan={5} className="px-8 py-20 text-center text-slate-400 font-medium">
                              {tr('لا يوجد أي تلميذ مسجل في هذا القسم', 'Aucun étudiant enregistré dans cette classe', 'No students enrolled in this class')}
                            </td>
                          </tr>
                        ) : classStudents.map((s) => {
                          return (
                          <tr key={s.id} className="hover:bg-slate-50/50 transition-colors group">
                            <td className="px-8 py-6">
                               <div>
                                 <p className="text-base font-black text-primary group-hover:text-accent transition-colors">{s.name}</p>
                                 {s.email && (
                                   <p className="text-xs text-slate-400 font-medium pt-0.5">✉️ {s.email}</p>
                                 )}
                                 {s.birthDate && (
                                   <p className="text-xs text-slate-400 font-medium">🎂 {tr('تاريخ الميلاد:', 'Né(e) le:', 'DOB:')} {s.birthDate}</p>
                                 )}
                                 {s.address && (
                                   <p className="text-xs text-slate-400 font-medium truncate max-w-[220px]">📍 {s.address}</p>
                                 )}
                               </div>
                            </td>
                            <td className="px-8 py-6">
                              <div className="space-y-1.5">
                                <div className={cn("flex flex-col gap-0.5 text-slate-500 font-black text-sm", isRTL && "text-right")}>
                                  <div className="flex items-center gap-2">
                                    <Phone size={14} className="text-accent" />
                                    <span dir="ltr">{s.parentPhone}</span>
                                  </div>
                                  {s.secondaryPhone && (
                                    <p className={cn("text-xs text-slate-400 font-medium", isRTL ? "pr-5" : "pl-5")} dir="ltr">{tr('هاتف 2:', 'Tél 2:', 'Phone 2:')} {s.secondaryPhone}</p>
                                  )}
                                </div>
                                <div className={cn("flex flex-wrap items-center gap-1 max-w-[260px]", isRTL && "justify-end")}>
                                  {(() => {
                                    const studentClassIds = (s.classIds && s.classIds.length > 0)
                                      ? s.classIds
                                      : (s.classId ? [s.classId] : []);
                                    return studentClassIds.map(cid => {
                                      const found = classes.find(c => c.id === cid);
                                      const isCurrent = cid === selectedClassId;
                                      return (
                                        <span
                                          key={cid}
                                          className={cn(
                                            "inline-flex items-center px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider border",
                                            isCurrent
                                              ? "bg-primary/10 text-primary border-primary/20"
                                              : "bg-slate-100 text-slate-600 border-slate-200"
                                          )}
                                        >
                                          {found ? found.name : tr('قسم', 'Classe', 'Class')}
                                        </span>
                                      );
                                    });
                                  })()}
                                </div>
                              </div>
                            </td>
                            <td className="px-8 py-6">
                              <div className="flex items-center gap-1">
                                {s.tokenId ? (
                                  <span className="font-mono text-xs bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 px-2 py-1 rounded-md font-bold select-all">
                                    {s.tokenId}
                                  </span>
                                ) : (
                                  <span className="text-xs text-slate-300 italic">
                                    {t('no_token_assigned')}
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="px-8 py-6">
                              <button
                                onClick={() => setAttendanceStudent(s)}
                                className="flex items-center gap-1 font-black text-sm text-primary hover:text-accent bg-primary/10 px-3 py-1.5 rounded-lg transition-all"
                              >
                                  {s.currentMonth}
                                  <BookOpen size={12} className="opacity-50" />
                              </button>
                            </td>
                             <td className={cn("px-8 py-6", isRTL ? "text-left" : "text-right")}>
                               <div className={cn("flex items-center gap-4 justify-end", isRTL && "justify-start")}>
                                 <button 
                                   onClick={() => handlePrintMonthReceipt(s, s.currentMonth)}
                                   className="flex items-center gap-1.5 text-[10px] font-black text-primary hover:text-accent transition-colors underline-offset-4 hover:underline uppercase tracking-widest whitespace-nowrap cursor-pointer"
                                   title={tr('طباعة الوصل', 'Imprimer le reçu', 'Print receipt')}
                                 >
                                   <Printer size={12} />
                                   {t('print_receipt')}
                                 </button>
                                 <button 
                                   onClick={() => {
                                     setEditingStudentId(s.id);
                                     setEditStudent({
                                       name: s.name,
                                       parentPhone: s.parentPhone,
                                       secondaryPhone: s.secondaryPhone || '',
                                       email: s.email || '',
                                       birthDate: s.birthDate || '',
                                       address: s.address || '',
                                       classId: s.classId,
                                       tokenId: s.tokenId || ''
                                     });
                                     setIsEditStudentModalOpen(true);
                                   }}
                                   className="p-2 text-slate-300 hover:text-accent transition-colors"
                                   title={tr('تعديل التلميذ', 'Modifier l\'étudiant', 'Edit student')}
                                 >
                                   <Pencil size={15} />
                                 </button>
                                 <button 
                                   onClick={() => handleRemoveStudentFromClass(s)}
                                   className="p-2 text-slate-300 hover:text-rose-500 transition-colors"
                                   title={tr('إزالة من هذا القسم', 'Retirer de cette classe', 'Remove from this class')}
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
                  </div>
                )}

                <div className={cn("py-8 flex flex-col md:flex-row justify-between items-center gap-6 mt-auto", isRTL && "md:flex-row-reverse")}>
                   <div className={cn("text-[10px] md:text-sm font-black text-slate-400 uppercase tracking-[0.2em] text-center", isRTL ? "md:text-right" : "md:text-left")}>
                      <span className="text-primary font-black">{classStudents.length}</span> {tr('تلميذ مسجل', 'élèves inscrits', 'enrolled students')}
                   </div>
                   <div className="flex items-center gap-3 w-full md:w-auto">
                     <button 
                       onClick={() => setIsStudentModalOpen(true)}
                       className="w-full md:w-auto bg-primary hover:bg-primary/90 text-white px-8 py-3.5 rounded-2xl text-xs font-black transition-all shadow-xl shadow-primary/20 active:scale-95 flex items-center justify-center gap-2"
                     >
                        <UserPlus size={16} />
                        <span>{t('add_student')}</span>
                     </button>
                   </div>
                </div>
              </>
              );
            })()
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-slate-400 gap-4">
                <Users size={64} className="opacity-20" />
                <p className="font-black uppercase tracking-widest text-sm">{tr('اختر قسماً لعرض التلاميذ', 'Sélectionnez une classe pour voir les étudiants', 'Select a class to view students')}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Class Creation Modal */}
      <Modal 
        isOpen={isClassModalOpen} 
        onClose={() => setIsClassModalOpen(false)} 
        title={t('create_class')}
      >
        <form onSubmit={handleCreateClass} className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-black uppercase tracking-widest text-slate-400">{t('class_name')}</label>
            <input
              required
              type="text"
              value={newClass.name}
              onChange={e => setNewClass({ ...newClass, name: e.target.value })}
              className="w-full p-4 bg-slate-50 rounded-2xl outline-none focus:ring-4 focus:ring-primary/5 transition-all font-bold"
              placeholder={tr('مثال: الرياضيات مستوى أولى ثانوي', 'ex. Mathématiques 1ère AS', 'e.g. Mathematics Grade 10')}
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-black uppercase tracking-widest text-slate-400">{t('monthly_price')}</label>
            <input
              required
              type="number"
              value={newClass.price}
              onChange={e => setNewClass({ ...newClass, price: Number(e.target.value) })}
              className="w-full p-4 bg-slate-50 rounded-2xl outline-none focus:ring-4 focus:ring-primary/5 transition-all font-bold"
              placeholder="4500"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-black uppercase tracking-widest text-slate-400">
              {tr('الأستاذ المسؤول (اختياري)', 'Enseignant / Prof (Optionnel)', 'Teacher (Optional)')}
            </label>
            <select
              value={newClass.teacherId || ''}
              onChange={e => setNewClass({ ...newClass, teacherId: e.target.value })}
              className="w-full p-4 bg-slate-50 rounded-2xl outline-none focus:ring-4 focus:ring-primary/5 transition-all font-bold cursor-pointer"
            >
              <option value="">{tr('-- اختر الأستاذ --', '-- Choisir l\'enseignant --', '-- Select Teacher --')}</option>
              {teachers.map(teach => (
                <option key={teach.id} value={teach.id}>{teach.name} ({teach.subject})</option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-black uppercase tracking-widest text-slate-400">{t('description')}</label>
            <textarea
              required
              value={newClass.description}
              onChange={e => setNewClass({ ...newClass, description: e.target.value })}
              className="w-full p-4 bg-slate-50 rounded-2xl outline-none focus:ring-4 focus:ring-primary/5 transition-all font-bold h-32"
              placeholder={tr('تفاصيل القسم...', 'Détails de la classe...', 'Class details...')}
            />
          </div>
          <button type="submit" className="w-full bg-primary text-white p-4 rounded-2xl font-black shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all">
            {t('create_class')}
          </button>
        </form>
      </Modal>

      {/* Student Creation / Selection Modal */}
      <Modal 
        isOpen={isStudentModalOpen} 
        onClose={() => setIsStudentModalOpen(false)} 
        title={tr('تسجيل تلميذ في هذا القسم', 'Inscrire un élève dans cette classe', 'Enroll a student in this class')}
      >
        <div className="space-y-5">
          {studentActionSuccess && (
            <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl text-xs font-bold flex items-center gap-2.5 animate-fade-in shadow-xs">
              <CheckCircle2 size={18} className="text-emerald-600 shrink-0" />
              <span>{studentActionSuccess}</span>
            </div>
          )}

          {/* Tabs */}
          <div className="flex bg-slate-100 p-1.5 rounded-2xl gap-1">
            <button
              type="button"
              onClick={() => setStudentAddMode('choose')}
              className={cn(
                "flex-1 py-2.5 px-3 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2",
                studentAddMode === 'choose' ? "bg-white text-primary shadow-sm" : "text-slate-500 hover:text-slate-800"
              )}
            >
              <UserCheck size={16} />
              <span>{tr('اختيار تلميذ مسجل', 'Choisir un élève existant', 'Choose existing student')}</span>
            </button>
            <button
              type="button"
              onClick={() => setStudentAddMode('new')}
              className={cn(
                "flex-1 py-2.5 px-3 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2",
                studentAddMode === 'new' ? "bg-white text-primary shadow-sm" : "text-slate-500 hover:text-slate-800"
              )}
            >
              <UserPlus size={16} />
              <span>{tr('إنشاء تلميذ جديد', 'Créer un nouvel élève', 'Create new student')}</span>
            </button>
          </div>

          {studentAddMode === 'choose' ? (
            <div className="space-y-4">
              {/* Search Bar */}
              <div className="relative">
                <Search className={cn("absolute top-1/2 -translate-y-1/2 text-slate-400", isRTL ? "right-3.5" : "left-3.5")} size={18} />
                <input
                  type="text"
                  value={existingStudentSearch}
                  onChange={e => setExistingStudentSearch(e.target.value)}
                  placeholder={tr('البحث بالاسم أو رقم الهاتف...', 'Rechercher par nom ou téléphone...', 'Search by name or phone...')}
                  className={cn("w-full py-3 bg-slate-50 rounded-2xl text-sm font-bold border border-slate-200 outline-none focus:ring-2 focus:ring-primary/10", isRTL ? "pr-10 pl-4" : "pl-10 pr-4")}
                />
              </div>

              {/* List of candidates */}
              <div className="max-h-[320px] overflow-y-auto space-y-2 pr-1">
                {(() => {
                  const availableStudents = students.filter(s => {
                    const searchLower = existingStudentSearch.toLowerCase().trim();
                    const matchesSearch = !searchLower || 
                      (s.name || '').toLowerCase().includes(searchLower) || 
                      (s.parentPhone || '').includes(searchLower) ||
                      (s.secondaryPhone || '').includes(searchLower) ||
                      (s.tokenId || '').toLowerCase().includes(searchLower);
                    return matchesSearch;
                  });

                  if (availableStudents.length === 0) {
                    return (
                      <div className="p-8 text-center text-slate-400 text-xs font-bold">
                        {tr('لم يتم العثور على أي تلميذ', 'Aucun élève trouvé', 'No student found')}
                      </div>
                    );
                  }

                  return availableStudents.map(st => {
                    const studentClassIds = (st.classIds && st.classIds.length > 0)
                      ? st.classIds
                      : (st.classId ? [st.classId] : []);
                    const isAlreadyInThisClass = studentClassIds.includes(selectedClassId);
                    const enrolledClasses = studentClassIds.map(cid => classes.find(c => c.id === cid)).filter(Boolean) as SchoolClass[];

                    return (
                      <div 
                        key={st.id} 
                        className={cn(
                          "p-3.5 rounded-2xl border transition-all flex items-center justify-between gap-3",
                          isAlreadyInThisClass 
                            ? "bg-emerald-50/60 border-emerald-200" 
                            : "bg-white border-slate-100 hover:border-slate-200 shadow-sm"
                        )}
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <p className="font-black text-sm text-slate-800 truncate">{st.name}</p>
                            {st.tokenId && (
                              <span className="font-mono text-[10px] bg-primary/10 text-primary px-1.5 py-0.2 rounded font-black">
                                {st.tokenId}
                              </span>
                            )}
                          </div>
                          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 font-medium mt-1">
                            <span dir="ltr">📞 {st.parentPhone}</span>
                            {st.secondaryPhone && <span dir="ltr">📱 {st.secondaryPhone}</span>}
                            {st.email && <span>✉️ {st.email}</span>}
                            {st.birthDate && <span>🎂 {st.birthDate}</span>}
                            {st.address && <span className="truncate max-w-[150px]">📍 {st.address}</span>}
                          </div>
                          <div className="flex flex-wrap items-center gap-1 mt-1.5">
                            {enrolledClasses.map(cl => (
                              <span key={cl.id} className={cn(
                                "px-2 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-wider",
                                cl.id === selectedClassId ? "bg-emerald-100 text-emerald-800 border border-emerald-200" : "bg-slate-100 text-slate-600 border border-slate-200"
                              )}>
                                {cl.name}
                              </span>
                            ))}
                          </div>
                        </div>

                        {isAlreadyInThisClass ? (
                          <span className="inline-flex items-center gap-1 text-xs font-black text-emerald-600 px-3 py-1.5 bg-emerald-100/80 rounded-xl">
                            <Check size={14} />
                            <span>{tr('مسجل', 'Inscrit', 'Enrolled')}</span>
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleAssignExistingStudent(st.id)}
                            className="bg-primary hover:bg-primary/90 text-white px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-md active:scale-95 flex items-center gap-1.5 shrink-0"
                          >
                            <Plus size={14} />
                            <span>{tr('تسجيل', 'Inscrire', 'Enroll')}</span>
                          </button>
                        )}
                      </div>
                    );
                  });
                })()}
              </div>
            </div>
          ) : (
            <form onSubmit={handleCreateStudent} className="space-y-4">
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-black uppercase tracking-widest text-slate-400">{t('student_name')}</label>
                  {newStudent.name && (
                    <span className="text-[11px] font-black text-primary bg-primary/10 px-2 py-0.5 rounded-lg animate-fade-in">
                      {tr('المعاينة:', 'Sortie:', 'Preview:')} {newStudent.name}
                    </span>
                  )}
                </div>
                <input
                  required
                  type="text"
                  value={newStudent.name}
                  onChange={e => setNewStudent({ ...newStudent, name: e.target.value })}
                  className="w-full p-4 bg-slate-50 rounded-2xl outline-none focus:ring-4 focus:ring-primary/5 transition-all font-bold"
                  placeholder={tr('الاسم الكامل', 'Nom complet', 'Full name')}
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-black uppercase tracking-widest text-slate-400">{t('parent_phone')}</label>
                    {newStudent.parentPhone && (
                      <a 
                        href={`tel:${newStudent.parentPhone}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[11px] font-black text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-2 py-0.5 rounded-lg flex items-center gap-1 transition-colors"
                        dir="ltr"
                      >
                        📞 {tr('المعاينة:', 'Sortie:', 'Out:')} {newStudent.parentPhone}
                      </a>
                    )}
                  </div>
                  <input
                    required
                    type="tel"
                    value={newStudent.parentPhone}
                    onChange={e => setNewStudent({ ...newStudent, parentPhone: e.target.value })}
                    className="w-full p-4 bg-slate-50 rounded-2xl outline-none focus:ring-4 focus:ring-primary/5 transition-all font-bold"
                    placeholder="0550..."
                  />
                </div>
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-black uppercase tracking-widest text-slate-400">{tr('هاتف 2 (اختياري)', '2ème Tél. (Optionnel)', '2nd Phone (Optional)')}</label>
                    {newStudent.secondaryPhone && (
                      <a 
                        href={`tel:${newStudent.secondaryPhone}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[11px] font-black text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-2 py-0.5 rounded-lg flex items-center gap-1 transition-colors"
                        dir="ltr"
                      >
                        📱 {tr('معاينة 2:', 'Sortie 2:', 'Out 2:')} {newStudent.secondaryPhone}
                      </a>
                    )}
                  </div>
                  <input
                    type="tel"
                    value={newStudent.secondaryPhone || ''}
                    onChange={e => setNewStudent({ ...newStudent, secondaryPhone: e.target.value })}
                    className="w-full p-4 bg-slate-50 rounded-2xl outline-none focus:ring-4 focus:ring-primary/5 transition-all font-bold"
                    placeholder="0660..."
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-black uppercase tracking-widest text-slate-400">{tr('البريد الإلكتروني (اختياري)', 'Email (Optionnel)', 'Email (Optional)')}</label>
                    {newStudent.email && (
                      <span className="text-[11px] font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-lg truncate max-w-[150px]">
                        ✉️ {newStudent.email}
                      </span>
                    )}
                  </div>
                  <input
                    type="email"
                    value={newStudent.email || ''}
                    onChange={e => setNewStudent({ ...newStudent, email: e.target.value })}
                    className="w-full p-4 bg-slate-50 rounded-2xl outline-none focus:ring-4 focus:ring-primary/5 transition-all font-bold"
                    placeholder="student@example.com"
                  />
                </div>
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-black uppercase tracking-widest text-slate-400">{tr('تاريخ الميلاد (اختياري)', 'Date de naissance (Optionnel)', 'Date of Birth (Optional)')}</label>
                    {newStudent.birthDate && (
                      <span className="text-[11px] font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-lg">
                        🎂 {newStudent.birthDate}
                      </span>
                    )}
                  </div>
                  <input
                    type="date"
                    value={newStudent.birthDate || ''}
                    onChange={e => setNewStudent({ ...newStudent, birthDate: e.target.value })}
                    className="w-full p-4 bg-slate-50 rounded-2xl outline-none focus:ring-4 focus:ring-primary/5 transition-all font-bold"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-black uppercase tracking-widest text-slate-400">{tr('العنوان (اختياري)', 'Adresse (Optionnel)', 'Address (Optional)')}</label>
                    {newStudent.address && (
                      <span className="text-[11px] font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-lg truncate max-w-[150px]">
                        📍 {newStudent.address}
                      </span>
                    )}
                  </div>
                  <input
                    type="text"
                    value={newStudent.address || ''}
                    onChange={e => setNewStudent({ ...newStudent, address: e.target.value })}
                    className="w-full p-4 bg-slate-50 rounded-2xl outline-none focus:ring-4 focus:ring-primary/5 transition-all font-bold"
                    placeholder={tr('العنوان', 'Adresse', 'Address')}
                  />
                </div>
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-black uppercase tracking-widest text-slate-400">{t('token_id')} ({tr('اختياري', 'Optionnel', 'Optional')})</label>
                    {newStudent.tokenId && (
                      <span className="text-[11px] font-mono font-black text-primary bg-primary/10 px-2 py-0.5 rounded-lg">
                        🏷️ {newStudent.tokenId}
                      </span>
                    )}
                  </div>
                  <input
                    type="text"
                    value={newStudent.tokenId || ''}
                    onChange={e => setNewStudent({ ...newStudent, tokenId: e.target.value })}
                    className="w-full p-4 bg-slate-50 rounded-2xl outline-none focus:ring-4 focus:ring-primary/5 transition-all font-bold placeholder:font-medium font-mono uppercase"
                    placeholder={tr('مثال: S101', 'Ex: S101', 'e.g. S101')}
                  />
                </div>
              </div>

              {/* LIVE OUTPUT PREVIEW CARD */}
              <div className="p-4 bg-slate-900 text-white rounded-2xl space-y-2 border border-slate-800 shadow-lg">
                <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest text-slate-400">
                  <span>{tr('معاينة البطاقة (عرض مباشر)', 'Aperçu de la fiche (Output direct)', 'Card Preview (Live Output)')}</span>
                  <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-400 rounded-md">{tr('مباشر', 'Temps Réel', 'Live')}</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs font-bold text-slate-200">
                  <div>{tr('الاسم:', 'Nom:', 'Name:')} <span className="text-white font-extrabold">{newStudent.name || '—'}</span></div>
                  <div>{tr('هاتف الولي:', 'Tél Parent:', 'Parent Phone:')} <span className="text-accent" dir="ltr">{newStudent.parentPhone || '—'}</span></div>
                  {newStudent.secondaryPhone && <div>{tr('هاتف 2:', 'Tél 2:', 'Phone 2:')} <span className="text-slate-300" dir="ltr">{newStudent.secondaryPhone}</span></div>}
                  {newStudent.email && <div>{tr('البريد:', 'Email:', 'Email:')} <span className="text-slate-300">{newStudent.email}</span></div>}
                  {newStudent.birthDate && <div>{tr('الميلاد:', 'Né(e) le:', 'DOB:')} <span className="text-slate-300">{newStudent.birthDate}</span></div>}
                  {newStudent.address && <div>{tr('العنوان:', 'Adresse:', 'Address:')} <span className="text-slate-300">{newStudent.address}</span></div>}
                  {newStudent.tokenId && <div>{tr('رمز البطاقة:', 'Code Token:', 'Token ID:')} <span className="font-mono text-emerald-400">{newStudent.tokenId}</span></div>}
                </div>
              </div>

              <button 
                type="submit" 
                disabled={isSubmittingStudent}
                className="w-full bg-primary disabled:opacity-60 text-white p-4 rounded-2xl font-black shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2"
              >
                {isSubmittingStudent ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    <span>{tr('جاري التسجيل...', 'Inscription en cours...', 'Enrolling...')}</span>
                  </>
                ) : (
                  <span>{t('add_student')}</span>
                )}
              </button>
            </form>
          )}
        </div>
      </Modal>

      {/* Edit Class Modal */}
      <Modal 
        isOpen={isEditClassModalOpen} 
        onClose={() => setIsEditClassModalOpen(false)} 
        title={tr('تعديل القسم', 'Modifier la classe', 'Edit Class')}
      >
        <form onSubmit={handleUpdateClass} className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-black uppercase tracking-widest text-slate-400">{t('class_name')}</label>
            <input
              required
              type="text"
              value={editClass.name}
              onChange={e => setEditClass({ ...editClass, name: e.target.value })}
              className="w-full p-4 bg-slate-50 rounded-2xl outline-none focus:ring-4 focus:ring-primary/5 transition-all font-bold"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-black uppercase tracking-widest text-slate-400">{t('monthly_price')}</label>
            <input
              required
              type="number"
              value={editClass.price}
              onChange={e => setEditClass({ ...editClass, price: Number(e.target.value) })}
              className="w-full p-4 bg-slate-50 rounded-2xl outline-none focus:ring-4 focus:ring-primary/5 transition-all font-bold"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-black uppercase tracking-widest text-slate-400">
              {tr('الأستاذ المسؤول (اختياري)', 'Enseignant / Prof (Optionnel)', 'Teacher (Optional)')}
            </label>
            <select
              value={editClass.teacherId || ''}
              onChange={e => setEditClass({ ...editClass, teacherId: e.target.value })}
              className="w-full p-4 bg-slate-50 rounded-2xl outline-none focus:ring-4 focus:ring-primary/5 transition-all font-bold cursor-pointer"
            >
              <option value="">{tr('-- اختر الأستاذ --', '-- Choisir l\'enseignant --', '-- Select Teacher --')}</option>
              {teachers.map(teach => (
                <option key={teach.id} value={teach.id}>{teach.name} ({teach.subject})</option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-black uppercase tracking-widest text-slate-400">{t('description')}</label>
            <textarea
              required
              value={editClass.description}
              onChange={e => setEditClass({ ...editClass, description: e.target.value })}
              className="w-full p-4 bg-slate-50 rounded-2xl outline-none focus:ring-4 focus:ring-primary/5 transition-all font-bold h-32"
            />
          </div>
          <button type="submit" className="w-full bg-primary text-white p-4 rounded-2xl font-black shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all">
            {tr('حفظ التعديلات', 'Enregistrer les modifications', 'Save Changes')}
          </button>
        </form>
      </Modal>

      {/* Edit Student Modal */}
      <Modal 
        isOpen={isEditStudentModalOpen} 
        onClose={() => setIsEditStudentModalOpen(false)} 
        title={tr('تعديل بيانات التلميذ', 'Modifier l\'élève', 'Edit Student')}
      >
        <form onSubmit={handleUpdateStudent} className="space-y-4">
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label className="text-xs font-black uppercase tracking-widest text-slate-400">{t('student_name')}</label>
              {editStudent.name && (
                <span className="text-[11px] font-black text-primary bg-primary/10 px-2 py-0.5 rounded-lg">
                  {tr('المعاينة:', 'Sortie:', 'Preview:')} {editStudent.name}
                </span>
              )}
            </div>
            <input
              required
              type="text"
              value={editStudent.name}
              onChange={e => setEditStudent({ ...editStudent, name: e.target.value })}
              className="w-full p-4 bg-slate-50 rounded-2xl outline-none focus:ring-4 focus:ring-primary/5 transition-all font-bold"
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label className="text-xs font-black uppercase tracking-widest text-slate-400">{t('parent_phone')}</label>
                {editStudent.parentPhone && (
                  <span className="text-[11px] font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-lg" dir="ltr">
                    📞 {editStudent.parentPhone}
                  </span>
                )}
              </div>
              <input
                required
                type="tel"
                value={editStudent.parentPhone}
                onChange={e => setEditStudent({ ...editStudent, parentPhone: e.target.value })}
                className="w-full p-4 bg-slate-50 rounded-2xl outline-none focus:ring-4 focus:ring-primary/5 transition-all font-bold"
              />
            </div>
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label className="text-xs font-black uppercase tracking-widest text-slate-400">{tr('هاتف 2 (اختياري)', '2ème Tél. (Optionnel)', '2nd Phone (Optional)')}</label>
                {editStudent.secondaryPhone && (
                  <span className="text-[11px] font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-lg" dir="ltr">
                    📱 {editStudent.secondaryPhone}
                  </span>
                )}
              </div>
              <input
                type="tel"
                value={editStudent.secondaryPhone || ''}
                onChange={e => setEditStudent({ ...editStudent, secondaryPhone: e.target.value })}
                className="w-full p-4 bg-slate-50 rounded-2xl outline-none focus:ring-4 focus:ring-primary/5 transition-all font-bold"
              />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label className="text-xs font-black uppercase tracking-widest text-slate-400">{tr('البريد الإلكتروني (اختياري)', 'Email (Optionnel)', 'Email (Optional)')}</label>
                {editStudent.email && (
                  <span className="text-[11px] font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-lg truncate max-w-[150px]">
                    ✉️ {editStudent.email}
                  </span>
                )}
              </div>
              <input
                type="email"
                value={editStudent.email || ''}
                onChange={e => setEditStudent({ ...editStudent, email: e.target.value })}
                className="w-full p-4 bg-slate-50 rounded-2xl outline-none focus:ring-4 focus:ring-primary/5 transition-all font-bold"
              />
            </div>
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label className="text-xs font-black uppercase tracking-widest text-slate-400">{tr('تاريخ الميلاد (اختياري)', 'Date de naissance (Optionnel)', 'Date of Birth (Optional)')}</label>
                {editStudent.birthDate && (
                  <span className="text-[11px] font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-lg">
                    🎂 {editStudent.birthDate}
                  </span>
                )}
              </div>
              <input
                type="date"
                value={editStudent.birthDate || ''}
                onChange={e => setEditStudent({ ...editStudent, birthDate: e.target.value })}
                className="w-full p-4 bg-slate-50 rounded-2xl outline-none focus:ring-4 focus:ring-primary/5 transition-all font-bold"
              />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label className="text-xs font-black uppercase tracking-widest text-slate-400">{tr('العنوان (اختياري)', 'Adresse (Optionnel)', 'Address (Optional)')}</label>
                {editStudent.address && (
                  <span className="text-[11px] font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-lg truncate max-w-[150px]">
                    📍 {editStudent.address}
                  </span>
                )}
              </div>
              <input
                type="text"
                value={editStudent.address || ''}
                onChange={e => setEditStudent({ ...editStudent, address: e.target.value })}
                className="w-full p-4 bg-slate-50 rounded-2xl outline-none focus:ring-4 focus:ring-primary/5 transition-all font-bold"
              />
            </div>
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label className="text-xs font-black uppercase tracking-widest text-slate-400">{t('token_id')} ({tr('اختياري', 'Optionnel', 'Optional')})</label>
                {editStudent.tokenId && (
                  <span className="text-[11px] font-mono font-black text-primary bg-primary/10 px-2 py-0.5 rounded-lg">
                    🏷️ {editStudent.tokenId}
                  </span>
                )}
              </div>
              <input
                type="text"
                value={editStudent.tokenId || ''}
                onChange={e => setEditStudent({ ...editStudent, tokenId: e.target.value })}
                className="w-full p-4 bg-slate-50 rounded-2xl outline-none focus:ring-4 focus:ring-primary/5 transition-all font-bold placeholder:font-medium font-mono uppercase"
                placeholder={tr('مثال: S101', 'Ex: S101', 'e.g. S101')}
              />
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-black uppercase tracking-widest text-slate-400">{tr('القسم', 'Classe', 'Class')}</label>
            <select
              value={editStudent.classId}
              onChange={e => setEditStudent({ ...editStudent, classId: e.target.value })}
              className="w-full p-4 bg-slate-50 rounded-2xl outline-none focus:ring-4 focus:ring-primary/5 transition-all font-bold cursor-pointer"
            >
              {classes.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          {/* LIVE OUTPUT PREVIEW CARD FOR EDIT */}
          <div className="p-4 bg-slate-900 text-white rounded-2xl space-y-2 border border-slate-800 shadow-lg">
            <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest text-slate-400">
              <span>{tr('البطاقة المسجلة حالياً (عرض مباشر)', 'Fiche actuelle enregistrée (Output Direct)', 'Current Saved Card (Live Output)')}</span>
              <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-400 rounded-md">{tr('مباشر', 'Direct', 'Live')}</span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs font-bold text-slate-200">
              <div>{tr('الاسم:', 'Nom:', 'Name:')} <span className="text-white font-extrabold">{editStudent.name || '—'}</span></div>
              <div>{tr('هاتف الولي:', 'Tél Parent:', 'Parent Phone:')} <span className="text-accent" dir="ltr">{editStudent.parentPhone || '—'}</span></div>
              {editStudent.secondaryPhone && <div>{tr('هاتف 2:', 'Tél 2:', 'Phone 2:')} <span className="text-slate-300" dir="ltr">{editStudent.secondaryPhone}</span></div>}
              {editStudent.email && <div>{tr('البريد:', 'Email:', 'Email:')} <span className="text-slate-300">{editStudent.email}</span></div>}
              {editStudent.birthDate && <div>{tr('الميلاد:', 'Né(e) le:', 'DOB:')} <span className="text-slate-300">{editStudent.birthDate}</span></div>}
              {editStudent.address && <div>{tr('العنوان:', 'Adresse:', 'Address:')} <span className="text-slate-300">{editStudent.address}</span></div>}
              {editStudent.tokenId && <div>{tr('رمز البطاقة:', 'Code Token:', 'Token ID:')} <span className="font-mono text-emerald-400">{editStudent.tokenId}</span></div>}
            </div>
          </div>

          <button type="submit" className="w-full bg-primary text-white p-4 rounded-2xl font-black shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all">
            {tr('حفظ التعديلات', 'Enregistrer les modifications', 'Save Changes')}
          </button>
        </form>
      </Modal>

      {/* Attendance Modal */}
      <Modal 
        isOpen={!!attendanceStudent} 
        onClose={() => setAttendanceStudent(null)} 
        title={tr('الحضور والدفع', 'Présences & Paiement', 'Attendance & Payment')}
      >
        {attendanceStudent && (
          <div className="space-y-2">
            <div className={cn("grid grid-cols-6 gap-2 items-center text-[10px] font-bold text-slate-500 uppercase pb-1 border-b border-slate-100", isRTL ? "text-right" : "text-left")}>
              <div className={cn("font-black", isRTL ? "pr-1" : "pl-1")}>{tr('الشهر', 'Mois', 'Month')}</div>
              {[1, 2, 3, 4].map(i => <div key={i} className="text-center font-black">{tr(`ح${i}`, `S${i}`, `S${i}`)}</div>)}
              <div className="text-center font-black">{tr('الدفع والوصل', 'Paiement & Reçu', 'Payment & Receipt')}</div>
            </div>
            {[...Array(12)].map((_, monthIdx) => {
               const month = monthIdx + 1;
               const monthAttendance = getStudentAttendance(attendanceStudent, selectedClassId, month);
               const monthDates = getStudentAttendanceDates(attendanceStudent, selectedClassId, month);
               const isPaid = (attendanceStudent.paidMonths || []).includes(month);
               return (
                 <div key={month} className="grid grid-cols-6 gap-2 items-center py-1.5 border-b border-slate-100 last:border-none hover:bg-slate-50/50 rounded-lg px-1 transition-colors">
                    <div className={cn("font-black text-xs text-slate-800", isRTL ? "pr-1" : "pl-1")}>{tr(`ش ${month}`, `M ${month}`, `M ${month}`)}</div>
                    {monthAttendance.map((val, sessionIdx) => {
                      const isPresent = val === true || val === 'present';
                      const isAbsent = val === 'absent';
                      const dateStr = monthDates[sessionIdx] 
                        ? new Date(monthDates[sessionIdx]).toLocaleString(dateLocale, { dateStyle: 'short', timeStyle: 'short' })
                        : null;
                      return (
                        <button 
                           key={sessionIdx}
                           type="button"
                           onClick={() => handleToggleAttendance(attendanceStudent, month, sessionIdx)}
                           className={cn(
                             "w-5 h-5 rounded-full transition-all border mx-auto flex items-center justify-center cursor-pointer hover:scale-125 shadow-2xs text-[9px] font-black", 
                             isPresent 
                               ? "bg-emerald-500 border-emerald-600 text-white shadow-emerald-500/20" 
                               : isAbsent 
                               ? "bg-rose-500 border-rose-600 text-white shadow-rose-500/20" 
                               : "bg-white border-slate-300 text-slate-400 hover:border-slate-400"
                           )}
                           title={tr(
                             `الحصة ${sessionIdx + 1}: ${isPresent ? (dateStr ? `حاضر (${dateStr})` : 'حاضر') : isAbsent ? 'غائب' : 'غير محدد'}`,
                             `Séance ${sessionIdx + 1}: ${isPresent ? (dateStr ? `Présent (${dateStr})` : 'Présent') : isAbsent ? 'Absent' : 'Non renseigné'}`,
                             `Session ${sessionIdx + 1}: ${isPresent ? (dateStr ? `Present (${dateStr})` : 'Present') : isAbsent ? 'Absent' : 'Unmarked'}`
                           )}
                        >
                          {isPresent ? "✓" : isAbsent ? "✕" : ""}
                        </button>
                      );
                    })}
                    <div className="text-center flex items-center justify-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleToggleMonthPayment(attendanceStudent, month)}
                        className={cn(
                          "px-2 py-0.5 rounded-md text-[10px] font-bold transition-all border shadow-2xs whitespace-nowrap cursor-pointer",
                          isPaid 
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100" 
                            : "bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100"
                        )}
                      >
                        {isPaid ? tr('مدفوع', 'Payé', 'Paid') : tr('غير مدفوع', 'Non payé', 'Unpaid')}
                      </button>
                      {isPaid && (
                        <button
                          type="button"
                          onClick={() => handlePrintMonthReceipt(attendanceStudent, month)}
                          className="p-1 rounded-md bg-slate-100 hover:bg-primary hover:text-white text-slate-600 transition-all border border-slate-200 shadow-2xs cursor-pointer active:scale-90"
                          title={tr('طباعة وصل الدفع لهذا الشهر', 'Imprimer le reçu de paiement de ce mois', 'Print payment receipt for this month')}
                        >
                          <Printer size={11} />
                        </button>
                      )}
                    </div>
                 </div>
               )
            })}
          </div>
        )}
      </Modal>

      {/* Printable Official Payment Receipt (Single Month) */}
      {printReceiptData && (
        <div id="print-receipt-section" dir={isRTL ? 'rtl' : 'ltr'} className="hidden print:block w-[105mm] min-h-[148mm] bg-white text-slate-900 font-sans p-4 border border-slate-200">
          {/* Logo & Institution Header */}
          <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-300">
            <div className="flex items-center gap-2">
              <img src="/logo.png" alt="Samy Academy Logo" className="h-10 w-auto object-contain" />
              <div>
                <h1 className="text-sm font-black uppercase tracking-wider text-primary">{tr('وصل الدفع', 'REÇU', 'RECEIPT')}</h1>
                <p className="text-[9px] font-semibold text-accent uppercase tracking-wide">Samy Academy</p>
              </div>
            </div>

            <div className={isRTL ? "text-left" : "text-right"}>
              <p className="text-[10px] font-black text-slate-900 font-mono" dir="ltr">
                REC-M{printReceiptData.month}-{printReceiptData.student.id.slice(0, 4).toUpperCase()}
              </p>
              <p className="text-[9px] text-slate-500 font-medium">
                {new Date().toLocaleDateString(dateLocale)}
              </p>
            </div>
          </div>

          {/* Student & Class Information */}
          <div className="space-y-3 mb-4 text-xs">
            <div>
              <p className="text-[9px] text-slate-400 font-black uppercase tracking-wider">{tr('التلميذ', 'Élève', 'Student')}</p>
              <p className="font-bold text-slate-900">{printReceiptData.student.name}</p>
            </div>
            <div className="flex justify-between">
              <div>
                <p className="text-[9px] text-slate-400 font-black uppercase tracking-wider">{tr('القسم', 'Classe', 'Class')}</p>
                <p className="font-bold text-slate-900">{printReceiptData.schoolClass?.name}</p>
              </div>
              <div className={isRTL ? "text-left" : "text-right"}>
                <p className="text-[9px] text-slate-400 font-black uppercase tracking-wider">{tr('الشهر', 'Mois', 'Month')}</p>
                <p className="font-bold text-primary">{printReceiptData.month}</p>
              </div>
            </div>
          </div>

          {/* Amount Section */}
          <div className="bg-primary text-white p-3 rounded-lg flex justify-between items-center mb-4">
            <p className="text-[10px] uppercase font-bold tracking-widest text-blue-200">{tr('المبلغ الإجمالي المدفوع', 'TOTAL RÉGLÉ', 'TOTAL PAID')}</p>
            <span className="text-lg font-black tracking-tight text-amber-300">
              {(printReceiptData.schoolClass?.price || 0).toLocaleString()} {t('currency')}
            </span>
          </div>

          {/* Footer */}
          <div className="text-center mt-auto pt-4 border-t border-dashed border-slate-300">
            <p className="text-[9px] font-black uppercase text-slate-500">{tr('الختم والتوقيع', 'Cachet & Signature', 'Stamp & Signature')}</p>
            <div className="h-12"></div>
            <p className="text-[8px] text-slate-400">{tr('وثيقة رسمية للدفع', 'Document officiel de paiement', 'Official payment receipt')}</p>
          </div>
        </div>
      )}

      {/* Printable Official Class Attendance Sheet (A4) */}
      {printClassAttendanceData && (
        <div id="print-class-attendance-section" dir={isRTL ? 'rtl' : 'ltr'} className="hidden print:block fixed inset-0 bg-white z-[99999] p-8 text-slate-900 font-sans">
          {/* Header */}
          <div className="flex justify-between items-start border-b-2 border-slate-900 pb-5 mb-6">
            <div>
              <div className="flex items-center gap-3 mb-1">
                <img src="/logo.png" alt="Samy Academy Logo" className="h-10 w-auto object-contain" />
                <h1 className="text-xl font-black tracking-tight uppercase text-primary">
                  {tr('أكاديمية سامي — ورقة الحضور والغياب', 'SAMY ACADEMY — FEUILLE D\'ÉMARGEMENT', 'SAMY ACADEMY — ATTENDANCE SHEET')}
                </h1>
              </div>
              <p className="text-xs font-bold text-slate-600">
                {tr('تسجيل الحضور الرسمي والمواظبة الجماعية', 'Pointage officiel des présences & assiduité collective', 'Official attendance and collective punctuality tracking')}
              </p>
            </div>

            <div className={isRTL ? "text-left" : "text-right"}>
              <span className="inline-block bg-primary text-amber-300 font-black text-xs px-3.5 py-1 rounded-full uppercase tracking-wider">
                {tr(`الشهر ${printClassAttendanceData.month}`, `MOIS ${printClassAttendanceData.month}`, `MONTH ${printClassAttendanceData.month}`)}
              </span>
              <p className="text-[11px] text-slate-500 font-bold mt-1">
                {tr('تاريخ الإصدار :', 'Date d\'édition :', 'Issue Date:')} {new Date().toLocaleDateString(dateLocale)}
              </p>
            </div>
          </div>

          {/* Class & Teacher Details */}
          <div className="grid grid-cols-3 gap-4 mb-6 bg-slate-50 p-4 rounded-xl border border-slate-300 text-xs">
            <div>
              <span className="text-[10px] font-black uppercase text-slate-500 block">{tr('القسم / المادة', 'Classe / Cours', 'Class / Course')}</span>
              <span className="font-black text-sm text-slate-900">{printClassAttendanceData.schoolClass.name}</span>
            </div>
            <div>
              <span className="text-[10px] font-black uppercase text-slate-500 block">{tr('الأستاذ المسؤول', 'Enseignant Responsable', 'Assigned Teacher')}</span>
              <span className="font-black text-sm text-slate-900">{printClassAttendanceData.teacher ? printClassAttendanceData.teacher.name : tr('غير معين', 'Non assigné', 'Unassigned')}</span>
            </div>
            <div>
              <span className="text-[10px] font-black uppercase text-slate-500 block">{tr('العدد الإجمالي', 'Effectif Total', 'Total Students')}</span>
              <span className="font-black text-sm text-slate-900">{printClassAttendanceData.students.length} {tr('تلميذ', 'Élève(s)', 'Student(s)')}</span>
            </div>
          </div>

          {/* Attendance Table */}
          <table className={cn("w-full border-collapse border border-slate-400 text-xs mb-8", isRTL ? "text-right" : "text-left")}>
            <thead>
              <tr className="bg-slate-100 border-b border-slate-400 text-slate-800 font-black uppercase text-[10px]">
                <th className="border border-slate-400 p-2 text-center w-8">#</th>
                <th className="border border-slate-400 p-2 min-w-[180px]">{tr('الاسم الكامل للتلميذ', 'Nom & Prénom de l\'Élève', 'Student Full Name')}</th>
                <th className="border border-slate-400 p-2 w-28">{tr('الهاتف', 'Téléphone', 'Phone')}</th>
                <th className="border border-slate-400 p-2 text-center w-16">{tr('الحصة 1', 'Séance 1', 'Session 1')}</th>
                <th className="border border-slate-400 p-2 text-center w-16">{tr('الحصة 2', 'Séance 2', 'Session 2')}</th>
                <th className="border border-slate-400 p-2 text-center w-16">{tr('الحصة 3', 'Séance 3', 'Session 3')}</th>
                <th className="border border-slate-400 p-2 text-center w-16">{tr('الحصة 4', 'Séance 4', 'Session 4')}</th>
                <th className="border border-slate-400 p-2 text-center w-16">{tr('المجموع', 'Total', 'Total')}</th>
                <th className="border border-slate-400 p-2 text-center w-24">{tr('الدفع', 'Paiement', 'Payment')}</th>
              </tr>
            </thead>
            <tbody>
              {printClassAttendanceData.students.map((s, idx) => {
                const att = getStudentAttendance(s, printClassAttendanceData.schoolClass.id, printClassAttendanceData.month);
                const isPaid = (s.paidMonths || []).includes(printClassAttendanceData.month);
                const totalPresent = att.filter(val => val === true || val === 'present').length;

                const renderSessionCell = (val: any) => {
                  if (val === true || val === 'present') return <span className="text-emerald-700">{tr('✓ حاضر', '✓ Présent', '✓ Present')}</span>;
                  if (val === 'absent') return <span className="text-rose-600">{tr('✕ غائب', '✕ Absent', '✕ Absent')}</span>;
                  return <span className="text-slate-400">—</span>;
                };

                return (
                  <tr key={s.id} className="border-b border-slate-300">
                    <td className="border border-slate-400 p-2 text-center font-bold">{idx + 1}</td>
                    <td className="border border-slate-400 p-2 font-black text-slate-900">
                      <div>{s.name}</div>
                      {s.email && <div className="text-[10px] font-normal text-slate-500">✉️ {s.email}</div>}
                    </td>
                    <td className="border border-slate-400 p-2 text-slate-600 font-mono text-[11px]" dir="ltr">
                      <div>{s.parentPhone || '—'}</div>
                      {s.secondaryPhone && <div className="text-[10px] text-slate-500">{s.secondaryPhone}</div>}
                    </td>
                    <td className="border border-slate-400 p-2 text-center font-bold">
                      {renderSessionCell(att[0])}
                    </td>
                    <td className="border border-slate-400 p-2 text-center font-bold">
                      {renderSessionCell(att[1])}
                    </td>
                    <td className="border border-slate-400 p-2 text-center font-bold">
                      {renderSessionCell(att[2])}
                    </td>
                    <td className="border border-slate-400 p-2 text-center font-bold">
                      {renderSessionCell(att[3])}
                    </td>
                    <td className="border border-slate-400 p-2 text-center font-black">
                      {totalPresent}/4
                    </td>
                    <td className="border border-slate-400 p-2 text-center font-bold">
                      {isPaid ? tr('✓ مدفوع', '✓ Payé', '✓ Paid') : tr('غير مدفوع', 'Non payé', 'Unpaid')}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {/* Footer Signature */}
          <div className="flex justify-between items-end pt-4 border-t border-slate-400 text-xs">
            <div>
              <p className="font-bold text-slate-800">{tr('توقيع الأستاذ :', 'Visa de l\'Enseignant :', 'Teacher Signature:')}</p>
              <div className="border-b border-dashed border-slate-400 w-48 mt-12"></div>
            </div>
            <div>
              <p className="font-bold text-slate-800">{tr('ختم وتوقيع الإدارة :', 'Cachet & Signature de la Direction :', 'Director Stamp & Signature:')}</p>
              <div className="border-b border-dashed border-slate-400 w-48 mt-12"></div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

