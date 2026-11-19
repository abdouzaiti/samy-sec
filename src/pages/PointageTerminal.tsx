import React, { useState, useEffect, useRef } from 'react';
import { 
  Scan, 
  CheckCircle, 
  XCircle, 
  Volume2, 
  VolumeX, 
  Keyboard, 
  Link2,
  Calendar
} from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { studentsService, teachersService, pointageService, classesService } from '../services/supabaseService';
import { Student, Teacher, PointageLog, SchoolClass } from '../types';
import { cn } from '../lib/utils';

export default function PointageTerminal() {
  const { t, tr, isRTL, language } = useLanguage();
  const [students, setStudents] = useState<Student[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [logs, setLogs] = useState<PointageLog[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [manualScanInput, setManualScanInput] = useState('');
  const [recentScanResult, setRecentScanResult] = useState<{
    success: boolean;
    type: 'student' | 'teacher';
    name: string;
    details: string;
    tokenId: string;
    isPaid?: boolean;
  } | null>(null);

  const [soundEnabled, setSoundEnabled] = useState(true);
  const [rfidFocus, setRfidFocus] = useState(false);
  const rfidInputRef = useRef<HTMLInputElement>(null);

  const [isAssigning, setIsAssigning] = useState(false);
  const [assignTargetType, setAssignTargetType] = useState<'student' | 'teacher'>('student');
  const [selectedPersonId, setSelectedPersonId] = useState('');
  const [newTokenCode, setNewTokenCode] = useState('');

  useEffect(() => {
    loadData();
    setTimeout(() => {
      rfidInputRef.current?.focus();
    }, 600);

    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      const activeEl = document.activeElement;
      if (activeEl) {
        const tagName = activeEl.tagName.toLowerCase();
        if (tagName === 'input' || tagName === 'textarea' || tagName === 'select') {
          if (activeEl !== rfidInputRef.current) {
            return;
          }
        }
      }

      if (e.ctrlKey || e.altKey || e.metaKey || e.key === 'Shift' || e.key === 'Control' || e.key === 'Alt') {
        return;
      }

      if (rfidInputRef.current && document.activeElement !== rfidInputRef.current) {
        rfidInputRef.current.focus();
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => {
      window.removeEventListener('keydown', handleGlobalKeyDown);
    };
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [sList, tList, lList, cList] = await Promise.all([
        studentsService.getAll(),
        teachersService.getAll(),
        pointageService.getAll(),
        classesService.getAll()
      ]);
      setStudents(sList);
      setTeachers(tList);
      setLogs(lList);
      setClasses(cList);
    } catch (err) {
      console.error("Error loading data in terminal:", err);
    } finally {
      setLoading(false);
    }
  };

  const playBeep = (type: 'success' | 'failure' | 'neutral') => {
    if (!soundEnabled) return;
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      
      if (type === 'success') {
        const osc1 = audioCtx.createOscillator();
        const osc2 = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();
        
        osc1.connect(gainNode);
        osc2.connect(gainNode);
        gainNode.connect(audioCtx.destination);
        
        osc1.type = 'sine';
        osc1.frequency.setValueAtTime(523.25, audioCtx.currentTime);
        osc2.type = 'triangle';
        osc2.frequency.setValueAtTime(659.25, audioCtx.currentTime);
        
        gainNode.gain.setValueAtTime(0.12, audioCtx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.35);
        
        osc1.start();
        osc2.start();
        osc1.stop(audioCtx.currentTime + 0.35);
        osc2.stop(audioCtx.currentTime + 0.35);
      } else if (type === 'failure') {
        const osc = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();
        
        osc.connect(gainNode);
        gainNode.connect(audioCtx.destination);
        
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(140.0, audioCtx.currentTime);
        
        gainNode.gain.setValueAtTime(0.18, audioCtx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.45);
        
        osc.start();
        osc.stop(audioCtx.currentTime + 0.45);
      } else {
        const osc = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();
        osc.connect(gainNode);
        gainNode.connect(audioCtx.destination);
        osc.type = 'sine';
        osc.frequency.setValueAtTime(440, audioCtx.currentTime);
        gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.15);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.15);
      }
    } catch (e) {
      console.warn("Sound synth failed to play", e);
    }
  };

  const handleScanToken = async (tokenIdToScan: string) => {
    const rawVal = tokenIdToScan.trim();
    if (!rawVal) return;

    const matchedStudent = students.find(s => s.tokenId?.toUpperCase() === rawVal.toUpperCase());
    const matchedTeacher = teachers.find(t => t.tokenId?.toUpperCase() === rawVal.toUpperCase());

    if (matchedStudent) {
      const now = new Date();
      const currentMonth = now.getMonth();
      const currentYear = now.getFullYear();

      const sessionsThisMonth = logs.filter(log => {
        const logDate = new Date(log.timestamp);
        return log.personId === matchedStudent.id && 
               logDate.getMonth() === currentMonth && 
               logDate.getFullYear() === currentYear;
      }).length;

      const newSessionCount = sessionsThisMonth + 1;
      const studentClassName = classes.find(c => c.id === matchedStudent.classId)?.name || '';
      
      let detailsMsg = '';
      let isSuccess = true;
      let logStatus = '';

      if (newSessionCount <= 4) {
        detailsMsg = tr(
          `تم تسجيل الحضور - الحصة ${newSessionCount}/4 (${studentClassName})`,
          `Présence enregistrée - Session ${newSessionCount}/4 (${studentClassName})`,
          `Attendance recorded - Session ${newSessionCount}/4 (${studentClassName})`
        );
        logStatus = `Session ${newSessionCount}/4`;
      } else {
        detailsMsg = tr(
          `تنبيه: تجاوز 4 حصص هذا الشهر (${newSessionCount}/4)`,
          `Attention: Plus de 4 sessions ce mois-ci (${newSessionCount}/4)`,
          `Warning: Over 4 sessions this month (${newSessionCount}/4)`
        );
        isSuccess = false;
        logStatus = `Session ${newSessionCount}/4 (Over limit)`;
      }
        
      playBeep(isSuccess ? 'success' : 'failure');
      
      setRecentScanResult({
        success: isSuccess,
        type: 'student',
        name: matchedStudent.name,
        details: detailsMsg,
        tokenId: rawVal,
        isPaid: isSuccess
      });

      try {
        const logged = await pointageService.log({
          personId: matchedStudent.id,
          personType: 'student',
          personName: matchedStudent.name,
          tokenId: rawVal,
          details: logStatus
        });
        setLogs(prev => [logged, ...prev]);
      } catch (err) {
        console.error(err);
      }

    } else if (matchedTeacher) {
      const detailsMsg = `${t('teacher_scan_outcome')} - ${matchedTeacher.subject}`;
      playBeep('success');
      
      setRecentScanResult({
        success: true,
        type: 'teacher',
        name: matchedTeacher.name,
        details: detailsMsg,
        tokenId: rawVal,
        isPaid: true
      });

      try {
        const logged = await pointageService.log({
          personId: matchedTeacher.id,
          personType: 'teacher',
          personName: matchedTeacher.name,
          tokenId: rawVal,
          details: `Pointage: Presence recorded`
        });
        setLogs(prev => [logged, ...prev]);
      } catch (err) {
        console.error(err);
      }

    } else {
      playBeep('failure');
      setRecentScanResult({
        success: false,
        type: 'student',
        name: rawVal,
        details: tr(
          'فشل المسح: البطاقة غير مسجلة في النظام! يرجى ربطها أولاً.',
          "Scan échoué : Jeton non reconnu dans le système ! Veuillez d'abord l'associer.",
          'Scan failed: Token not recognized in system! Please assign it first.'
        ),
        tokenId: rawVal,
        isPaid: false
      });
    }

    setManualScanInput('');
    setTimeout(() => {
      rfidInputRef.current?.focus();
    }, 100);
  };

  const handleManualFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleScanToken(manualScanInput);
  };

  const handleAssignTokenSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPersonId || !newTokenCode.trim()) return;

    try {
      setLoading(true);
      const code = newTokenCode.trim();
      
      if (assignTargetType === 'student') {
        const currentStudent = students.find(s => s.id === selectedPersonId);
        if (currentStudent) {
          await studentsService.update(selectedPersonId, {
            ...currentStudent,
            tokenId: code
          });
          setStudents(prev => prev.map(s => s.id === selectedPersonId ? { ...s, tokenId: code } : s));
        }
      } else {
        const currentTeacher = teachers.find(t => t.id === selectedPersonId);
        if (currentTeacher) {
          await teachersService.update(selectedPersonId, {
            ...currentTeacher,
            tokenId: code
          });
          setTeachers(prev => prev.map(t => t.id === selectedPersonId ? { ...t, tokenId: code } : t));
        }
      }

      setIsAssigning(false);
      setNewTokenCode('');
      setSelectedPersonId('');
      alert(tr('تم ربط البطاقة بنجاح!', 'Jeton associé avec succès !', 'Token assigned successfully!'));
      setTimeout(() => rfidInputRef.current?.focus(), 200);
    } catch (err: any) {
      alert(tr('خطأ: ', 'Erreur: ', 'Error: ') + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={cn("max-w-7xl mx-auto px-4 sm:px-6 py-6", isRTL && "text-right")} id="pointage_terminal_page">
      {/* Title Header */}
      <div className={cn("mb-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4", isRTL && "md:flex-row-reverse")}>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900" id="terminal_header_title">
            {t('pointage_terminal')}
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            {tr(
              'إدارة الدخول والتحقق الفوري من حالة الدفع وتسجيل الحضور تلقائياً.',
              "Gérez l'accès physique en vérifiant instantanément l'état des paiements et effectuez le pointage automatique.",
              'Manage gate access by verifying payment status and recording attendance automatically.'
            )}
          </p>
        </div>

        <div className="flex items-center gap-3 self-start md:self-auto">
          <button 
            type="button"
            onClick={() => setSoundEnabled(!soundEnabled)}
            className={`p-2.5 rounded-lg border transition-all flex items-center gap-2 text-sm font-medium ${
              soundEnabled 
                ? 'bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100' 
                : 'bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100'
            }`}
            title={tr('تشغيل / إيقاف الصوت', 'Activer/Désactiver le son', 'Toggle Speaker beep sound')}
          >
            {soundEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
            <span>{soundEnabled ? tr('الصوت مفعل', 'Son activé', 'Sound on') : tr('الصوت مكتوم', 'Son coupé', 'Sound muted')}</span>
          </button>

          <button
            onClick={() => {
              setIsAssigning(true);
              setNewTokenCode('');
            }}
            className="bg-primary text-white hover:bg-primary/95 text-xs sm:text-sm font-semibold px-4 py-2.5 rounded-lg shadow-sm flex items-center gap-2 transition-colors"
          >
            <Link2 size={16} />
            {t('assign_token')}
          </button>
        </div>
      </div>

      {/* Main Terminal Grid */}
      <div className="max-w-3xl mx-auto">
        <div className="space-y-6">
          <div 
            onClick={() => rfidInputRef.current?.focus()}
            className={`p-8 rounded-2xl border-2 text-center transition-all cursor-pointer relative overflow-hidden bg-white ${
              rfidFocus 
                ? 'border-primary ring-4 ring-primary/5 shadow-lg' 
                : 'border-slate-150 shadow-sm hover:border-slate-300'
            }`}
          >
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-primary to-transparent animate-pulse" />

            <div className="mx-auto w-16 h-16 rounded-full bg-slate-50 flex items-center justify-center text-primary mb-4 transition-transform hover:scale-110">
              <Scan size={32} className={rfidFocus ? "animate-pulse" : ""} />
            </div>

            <h3 className="text-lg font-bold text-slate-800">
              {rfidFocus
                ? tr('قارئ RFID متصل وجاهز', 'Lecteur RFID connecté & prêt', 'RFID reader connected & ready')
                : t('scan_instruction')}
            </h3>
            <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
              {tr(
                'انقر داخل هذه المنطقة ومرر البطاقة، أو أدخل رمز البطاقة يدوياً أدناه.',
                'Veuillez cliquer dans cette zone et badger, ou tapez manuellement le code du jeton ci-dessous.',
                'Click inside this box and scan, or manually enter the token code below.'
              )}
            </p>

            <form onSubmit={handleManualFormSubmit} className="mt-6 max-w-xs mx-auto">
              <div className="relative">
                <input
                  ref={rfidInputRef}
                  type="text"
                  placeholder={tr('مثال: S101, T201...', 'Ex: S101, T201...', 'Ex: S101, T201...')}
                  value={manualScanInput}
                  onChange={(e) => setManualScanInput(e.target.value)}
                  onFocus={() => setRfidFocus(true)}
                  onBlur={() => setRfidFocus(false)}
                  className="w-full text-center font-mono uppercase font-bold text-sm tracking-widest bg-slate-50 border border-slate-200 rounded-lg py-2.5 px-3 focus:outline-none focus:ring-2 focus:ring-primary focus:bg-white text-slate-800"
                />
                
                <button
                  type="submit"
                  className="mt-2.5 w-full bg-slate-800 text-white hover:bg-slate-900 font-semibold py-2 rounded-lg text-xs transition-colors tracking-wide flex items-center justify-center gap-1.5"
                >
                  <Keyboard size={14} />
                  {tr('تأكيد ومعاينة', 'Valider & Simuler', 'Validate & Simulate')}
                </button>
              </div>
            </form>

            <div className="mt-4 flex items-center justify-center gap-1.5 text-[11px] text-slate-400">
              <span className={`w-2.5 h-2.5 rounded-full ${rfidFocus ? 'bg-emerald-500 animate-ping' : 'bg-amber-400'}`} />
              <span>
                {rfidFocus
                  ? tr('الحالة: جاهز للمسح', 'Statut: Prêt à badger', 'Status: Ready to scan')
                  : tr('انقر هنا لتفعيل القارئ', 'Cliquez ici pour focaliser le terminal', 'Click here to focus terminal')}
              </span>
            </div>
          </div>

          {recentScanResult ? (
            <div className={`p-6 rounded-2xl border transition-all duration-300 ${
              recentScanResult.success 
                ? 'bg-emerald-50/50 border-emerald-150' 
                : 'bg-rose-50/50 border-rose-150'
            }`}>
              <div className={cn("flex items-start gap-4", isRTL && "flex-row-reverse")}>
                <div className={`p-3 rounded-full ${
                  recentScanResult.success ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'
                }`}>
                  {recentScanResult.success ? <CheckCircle size={24} /> : <XCircle size={24} />}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10px] font-bold tracking-widest text-slate-400 uppercase">
                      {recentScanResult.type === 'student'
                        ? tr('بطاقة تلميذ', 'Jeton Élève', 'Student Token')
                        : tr('بطاقة أستاذ', 'Jeton Enseignant', 'Teacher Token')}
                    </span>
                    <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-600 border">
                      ID: {recentScanResult.tokenId}
                    </span>
                  </div>

                  <h4 className="text-xl font-bold text-slate-800 mt-1 truncate">
                    {recentScanResult.name}
                  </h4>

                  <p className={`text-sm mt-1.5 font-medium leading-relaxed ${
                    recentScanResult.success ? 'text-emerald-700' : 'text-rose-700'
                  }`}>
                    {recentScanResult.details}
                  </p>

                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400">
                    <div className="flex items-center gap-1.5 text-slate-500">
                      <Calendar size={13} />
                      <span>{new Date().toLocaleTimeString(language === 'ar' ? 'ar-DZ' : language === 'fr' ? 'fr-FR' : 'en-GB')}</span>
                    </div>

                    {recentScanResult.type === 'student' && (
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        recentScanResult.success 
                          ? 'bg-emerald-100 text-emerald-800' 
                          : 'bg-rose-100 text-rose-800'
                      }`}>
                        {recentScanResult.success ? tr('مقبول', 'OK', 'OK') : tr('مرفوض', 'Refusé', 'Declined')}
                      </span>
                    )}

                    {recentScanResult.type === 'teacher' && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-800">
                        {tr('تم التسجيل', 'Pointage OK', 'Clock-in OK')}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-12 rounded-2xl border border-dashed border-slate-200 text-center bg-slate-50/50">
              <p className="text-slate-400 text-sm">
                {tr(
                  'لا يوجد مسح حالي. قم بتمرير بطاقة لعرض بياناتها.',
                  'Aucun scan en cours. Présentez un jeton pour afficher ses données.',
                  'No scan in progress. Present a token to view details.'
                )}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* TOKEN QUICK ASSOCIATION FLOW MODAL */}
      {isAssigning && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-xl border overflow-hidden p-6 relative">
            <h3 className="text-lg font-bold text-slate-800 mb-1 flex items-center gap-2">
              <Link2 size={20} className="text-primary" />
              {t('assign_token')}
            </h3>
            
            <p className="text-xs text-slate-500 mb-4">
              {tr(
                'اربط بطاقة فعلية بملف شخصي لتفعيلها فوراً.',
                "Associez un jeton physique à un profil pour qu'il soit opérationnel immédiatement.",
                'Link a physical token to a profile so it works immediately.'
              )}
            </p>

            <form onSubmit={handleAssignTokenSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase">
                  {tr('نوع الملف', 'Type de profil', 'Profile type')}
                </label>
                <div className="grid grid-cols-2 gap-2 text-center">
                  <button
                    type="button"
                    onClick={() => {
                      setAssignTargetType('student');
                      setSelectedPersonId('');
                    }}
                    className={`py-2 rounded-lg text-xs font-semibold border transition-all ${
                      assignTargetType === 'student'
                        ? 'bg-primary text-white border-primary shadow-sm shadow-primary/10'
                        : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    {tr('تلميذ', 'Élève', 'Student')}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setAssignTargetType('teacher');
                      setSelectedPersonId('');
                    }}
                    className={`py-2 rounded-lg text-xs font-semibold border transition-all ${
                      assignTargetType === 'teacher'
                        ? 'bg-primary text-white border-primary shadow-sm shadow-primary/10'
                        : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    {tr('أستاذ', 'Enseignant', 'Teacher')}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase">
                  {assignTargetType === 'student'
                    ? tr('اختر التلميذ', "Sélectionner l'élève", 'Select student')
                    : tr('اختر الأستاذ', "Sélectionner l'enseignant", 'Select teacher')}
                </label>
                <select
                  required
                  value={selectedPersonId}
                  onChange={(e) => {
                    setSelectedPersonId(e.target.value);
                    const item = assignTargetType === 'student' 
                      ? students.find(s => s.id === e.target.value)
                      : teachers.find(t => t.id === e.target.value);
                    if (item && item.tokenId) {
                      setNewTokenCode(item.tokenId);
                    } else {
                      setNewTokenCode('');
                    }
                  }}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:bg-white text-slate-700"
                >
                  <option value="">{tr('-- اختر --', '-- Sélectionner --', '-- Select --')}</option>
                  
                  {assignTargetType === 'student' ? (
                    students.map(s => (
                      <option key={s.id} value={s.id}>
                        {s.name} {s.tokenId ? `(${s.tokenId})` : tr('(بدون بطاقة)', '(Sans jeton)', '(No token)')}
                      </option>
                    ))
                  ) : (
                    teachers.map(teach => (
                      <option key={teach.id} value={teach.id}>
                        {teach.name} {teach.tokenId ? `(${teach.tokenId})` : tr('(بدون بطاقة)', '(Sans jeton)', '(No token)')}
                      </option>
                    ))
                  )}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase">
                  {t('token_id')}
                </label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    placeholder="Ex: S101, T201, 892305A"
                    value={newTokenCode}
                    onChange={(e) => setNewTokenCode(e.target.value)}
                    className="w-full font-mono uppercase bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:bg-white text-slate-800 placeholder-slate-400 font-semibold"
                  />
                </div>
                <p className="text-[10px] text-slate-400 mt-1">
                  {tr('ملاحظة: يمكنك تمرير البطاقة لملء هذا الحقل تلقائياً.', 'Astuce : Vous pouvez badger pour remplir ce champ automatiquement.', 'Tip: You can scan a token to auto-fill this field.')}
                </p>
              </div>

              <div className="flex gap-2.5 mt-6 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setIsAssigning(false);
                    setTimeout(() => rfidInputRef.current?.focus(), 150);
                  }}
                  className="w-1/2 border border-slate-200 text-slate-600 hover:bg-slate-50 font-semibold py-2.5 rounded-lg text-xs transition-colors"
                >
                  {tr('إلغاء', 'Annuler', 'Cancel')}
                </button>
                <button
                  type="submit"
                  className="w-1/2 bg-primary text-white hover:bg-primary/95 font-semibold py-2.5 rounded-lg text-xs transition-colors shadow-sm"
                >
                  {tr('ربط وحفظ', 'Associer & Enregistrer', 'Assign & Save')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
