import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  UserPlus,
  UserCog,
  KeyRound,
  Mail,
  Phone,
  Pencil,
  Trash2,
  Eye,
  EyeOff,
  CheckCircle2,
  XCircle,
  Copy,
  Check,
  Lock,
  Sparkles,
  Loader2,
  Users,
  Database,
  RefreshCw
} from 'lucide-react';
import { adminAccountsService } from '../services/supabaseService';
import { AdminAccount } from '../types';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { Modal } from '../components/Modal';
import { cn } from '../lib/utils';

export function AdminProfiles() {
  const { user, updateSessionUser } = useAuth();
  const { language, tr, isRTL } = useLanguage();
  const dateLocale = language === 'ar' ? 'ar-DZ' : language === 'fr' ? 'fr-FR' : 'en-GB';
  const isDirector = Boolean(user);

  const [accounts, setAccounts] = useState<AdminAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [visiblePasswords, setVisiblePasswords] = useState<Record<string, boolean>>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Add Secretary Modal
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isSubmittingAdd, setIsSubmittingAdd] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);
  const [newSecretary, setNewSecretary] = useState({
    displayName: '',
    username: '',
    password: '',
    email: '',
    phone: '',
    role: 'secretary' as 'director' | 'secretary',
    notes: ''
  });
  const [showNewPassword, setShowNewPassword] = useState(true);

  // Edit Profile Modal
  const [editingAccount, setEditingAccount] = useState<AdminAccount | null>(null);
  const [isSubmittingEdit, setIsSubmittingEdit] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({
    displayName: '',
    username: '',
    password: '',
    email: '',
    phone: '',
    isActive: true,
    notes: ''
  });
  const [showEditPassword, setShowEditPassword] = useState(false);

  // Supabase 'admin' table sync & SQL modal
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState<{ type: 'success' | 'warning'; text: string } | null>(null);
  const [isSqlModalOpen, setIsSqlModalOpen] = useState(false);
  const [isCopiedSql, setIsCopiedSql] = useState(false);

  const adminSqlCode = `-- ========================================================
-- SCHEMA SUPABASE: TABLE 'admin' (SAMY ACADEMY)
-- ========================================================

CREATE TABLE IF NOT EXISTS public.admin (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  username TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  display_name TEXT NOT NULL DEFAULT '',
  email TEXT,
  phone TEXT,
  role TEXT NOT NULL DEFAULT 'secretary' CHECK (role IN ('director', 'secretary')),
  is_active BOOLEAN NOT NULL DEFAULT true,
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT (now()::text)
);

ALTER TABLE public.admin ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all on admin" ON public.admin;
CREATE POLICY "Allow all on admin" ON public.admin FOR ALL USING (true) WITH CHECK (true);

GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.admin TO anon, authenticated;

NOTIFY pgrst, 'reload schema';`;

  const loadAccounts = async () => {
    setLoading(true);
    try {
      const syncResult = await adminAccountsService.syncWithSupabase();
      setAccounts(syncResult.accounts);
    } catch (err) {
      console.error('Error loading admin accounts:', err);
      const data = await adminAccountsService.getAll();
      setAccounts(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAccounts();
  }, []);

  const handleSyncWithSupabase = async () => {
    setIsSyncing(true);
    setSyncMessage(null);
    try {
      const res = await adminAccountsService.syncWithSupabase();
      setAccounts(res.accounts);
      if (res.synced) {
        setSyncMessage({
          type: 'success',
          text: tr(
            'تمت المزامنة بنجاح مع جدول admin في Supabase',
            'Synchronisé avec succès avec la table "admin" sur Supabase',
            'Successfully synced with Supabase "admin" table'
          )
        });
        setTimeout(() => setSyncMessage(null), 4000);
      } else if (res.needsTableSql) {
        setIsSqlModalOpen(true);
        setSyncMessage({
          type: 'warning',
          text: tr(
            'جدول "admin" غير موجود بعد في Supabase — انسخ كود SQL وشغله ثم أعد المزامنة',
            'La table "admin" n\'existe pas encore sur Supabase — exécutez le SQL ci-dessous',
            'Table "admin" not found in Supabase yet — run the SQL script below'
          )
        });
      } else {
        setSyncMessage({
          type: 'warning',
          text: res.errorMessage || tr('تعذرت المزامنة مع Supabase', 'Échec de synchronisation Supabase', 'Supabase sync failed')
        });
      }
    } finally {
      setIsSyncing(false);
    }
  };

  const handleCopySql = () => {
    navigator.clipboard.writeText(adminSqlCode);
    setIsCopiedSql(true);
    setTimeout(() => setIsCopiedSql(false), 2000);
  };

  const directorAccounts = accounts.filter(a => a.role === 'director');
  const secretaryAccounts = accounts.filter(a => a.role === 'secretary');
  const activeSecretariesCount = secretaryAccounts.filter(a => a.isActive).length;

  const getLocalizedName = (acc: AdminAccount) => {
    return acc.displayName || acc.username;
  };

  const generateRandomPassword = () => {
    const chars = 'abcdefghjkmnpqrstuvwxyz23456789';
    let pass = 'samy-';
    for (let i = 0; i < 4; i++) {
      pass += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setNewSecretary(prev => ({ ...prev, password: pass }));
    setShowNewPassword(true);
  };

  const handleCreateSecretary = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isDirector) return;
    setAddError(null);

    const cleanUsername = newSecretary.username.trim().toLowerCase();
    if (!cleanUsername || cleanUsername.includes(' ')) {
      setAddError(tr(
        'اسم المستخدم يجب ألا يحتوي على مسافات',
        "Le nom d'utilisateur ne doit pas contenir d'espaces",
        'Username must not contain spaces'
      ));
      return;
    }
    if (newSecretary.password.trim().length < 4) {
      setAddError(tr(
        'كلمة المرور يجب أن تحتوي على 4 أحرف على الأقل',
        'Le mot de passe doit contenir au moins 4 caractères',
        'Password must be at least 4 characters'
      ));
      return;
    }

    setIsSubmittingAdd(true);
    try {
      const created = await adminAccountsService.create({
        displayName: newSecretary.displayName.trim(),
        username: cleanUsername,
        password: newSecretary.password.trim(),
        email: newSecretary.email.trim() || `${cleanUsername}@samyacademy.dz`,
        phone: newSecretary.phone.trim(),
        role: newSecretary.role,
        isActive: true,
        notes: newSecretary.notes.trim()
      });
      setAccounts(prev => [...prev, created]);
      setIsAddModalOpen(false);
      setNewSecretary({
        displayName: '',
        username: '',
        password: '',
        email: '',
        phone: '',
        role: 'secretary',
        notes: ''
      });
    } catch (err: any) {
      if (err?.message === 'USERNAME_EXISTS') {
        setAddError(tr(
          'اسم المستخدم هذا مستخدم بالفعل، اختر اسماً آخر',
          "Ce nom d'utilisateur existe déjà",
          'This username already exists'
        ));
      } else {
        setAddError(tr(
          'حدث خطأ أثناء إنشاء الحساب',
          'Erreur lors de la création du compte',
          'Error creating account'
        ));
      }
    } finally {
      setIsSubmittingAdd(false);
    }
  };

  const openEditModal = (acc: AdminAccount) => {
    setEditError(null);
    setShowEditPassword(false);
    setEditingAccount(acc);
    setEditForm({
      displayName: acc.displayName,
      username: acc.username,
      password: '',
      email: acc.email || '',
      phone: acc.phone || '',
      isActive: acc.isActive,
      notes: acc.notes || ''
    });
  };

  const handleUpdateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAccount) return;
    setEditError(null);

    const canEditThis = isDirector || user?.uid === editingAccount.id;
    if (!canEditThis) return;

    const cleanUsername = editForm.username.trim().toLowerCase();
    if (!cleanUsername || cleanUsername.includes(' ')) {
      setEditError(tr(
        'اسم المستخدم يجب ألا يحتوي على مسافات',
        "Le nom d'utilisateur ne doit pas contenir d'espaces",
        'Username must not contain spaces'
      ));
      return;
    }

    if (editForm.password.trim() && editForm.password.trim().length < 4) {
      setEditError(tr(
        'كلمة المرور الجديدة يجب أن تحتوي على 4 أحرف على الأقل',
        'Le nouveau mot de passe doit contenir au moins 4 caractères',
        'New password must be at least 4 characters'
      ));
      return;
    }

    setIsSubmittingEdit(true);
    try {
      const updated = await adminAccountsService.update(editingAccount.id, {
        displayName: editForm.displayName.trim() || editingAccount.displayName,
        username: editingAccount.role === 'director' && !isDirector ? editingAccount.username : cleanUsername,
        password: editForm.password.trim() ? editForm.password.trim() : editingAccount.password,
        email: editForm.email.trim(),
        phone: editForm.phone.trim(),
        isActive: editingAccount.role === 'director' ? true : (isDirector ? editForm.isActive : editingAccount.isActive),
        notes: editForm.notes.trim()
      });

      setAccounts(prev => prev.map(a => (a.id === updated.id ? updated : a)));

      // Sync active session if user edited their own profile
      if (user?.uid === updated.id) {
        updateSessionUser({
          username: updated.username,
          displayName: updated.displayName,
          email: updated.email,
          phone: updated.phone
        });
      }

      setEditingAccount(null);
    } catch (err: any) {
      if (err?.message === 'USERNAME_EXISTS') {
        setEditError(tr(
          'اسم المستخدم هذا مستخدم بالفعل',
          "Ce nom d'utilisateur existe déjà",
          'This username already exists'
        ));
      } else {
        setEditError(tr(
          'تعذر حفظ التعديلات',
          'Impossible de sauvegarder les modifications',
          'Could not save changes'
        ));
      }
    } finally {
      setIsSubmittingEdit(false);
    }
  };

  const handleToggleActive = async (acc: AdminAccount) => {
    if (!isDirector || acc.id === user?.uid) return;
    try {
      const updated = await adminAccountsService.update(acc.id, { isActive: !acc.isActive });
      setAccounts(prev => prev.map(a => (a.id === updated.id ? updated : a)));
    } catch (err) {
      console.error('Error toggling account status:', err);
    }
  };

  const handleDeleteAccount = async (acc: AdminAccount) => {
    if (!isDirector || acc.id === user?.uid) return;
    const confirmed = window.confirm(
      tr(
        `هل أنت متأكد من حذف الحساب "${getLocalizedName(acc)}" (@${acc.username})؟`,
        `Voulez-vous vraiment supprimer le compte "${getLocalizedName(acc)}" (@${acc.username}) ?`,
        `Are you sure you want to delete account "${getLocalizedName(acc)}" (@${acc.username})?`
      )
    );
    if (!confirmed) return;

    try {
      await adminAccountsService.delete(acc.id);
      setAccounts(prev => prev.filter(a => a.id !== acc.id));
    } catch (err) {
      console.error('Error deleting account:', err);
    }
  };

  const copyCredentials = (acc: AdminAccount) => {
    const text = `${tr('اسم المستخدم', "Nom d'utilisateur", 'Username')}: ${acc.username}\n${tr('كلمة المرور', 'Mot de passe', 'Password')}: ${acc.password}`;
    navigator.clipboard.writeText(text);
    setCopiedId(acc.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="animate-spin text-primary" size={36} />
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-primary tracking-tight">
            {tr('ملفات الإدارة والسكرتارية', 'Profils Admins & Secrétariat', 'Admin & Secretary Profiles')}
          </h1>
          <p className="text-slate-500 mt-1 font-medium">
            {tr(
              'إدارة ملف المدير وإضافة أو تعديل حسابات السكرتارية للدخول إلى المنصة.',
              'Gérez le profil du Directeur et créez ou modifiez les comptes secrétaires.',
              'Manage the Director profile and create or manage Secretary login accounts.'
            )}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {isDirector && (
            <>
              <button
                type="button"
                onClick={handleSyncWithSupabase}
                disabled={isSyncing}
                className="flex items-center gap-2 bg-white hover:bg-slate-50 text-primary border border-slate-200 px-4 py-3 rounded-2xl font-bold text-xs shadow-sm transition-all active:scale-95 cursor-pointer disabled:opacity-60"
                title={tr('مزامنة الحسابات مع جدول admin في Supabase', 'Synchroniser avec la table admin sur Supabase', 'Sync accounts with Supabase admin table')}
              >
                <RefreshCw size={15} className={cn(isSyncing && "animate-spin")} />
                <span>{tr('مزامنة Supabase', 'Sync Supabase', 'Sync Supabase')}</span>
              </button>

              <button
                type="button"
                onClick={() => setIsSqlModalOpen(true)}
                className="flex items-center gap-2 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 px-4 py-3 rounded-2xl font-bold text-xs shadow-sm transition-all active:scale-95 cursor-pointer"
                title={tr('كود SQL لإنشاء جدول admin في Supabase', 'Script SQL de la table admin', 'SQL script for admin table')}
              >
                <Database size={15} />
                <span>{tr('جدول admin (SQL)', 'Table admin (SQL)', 'admin SQL')}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setAddError(null);
                  setShowNewPassword(true);
                  setIsAddModalOpen(true);
                }}
                className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-white px-5 py-3 rounded-2xl font-black text-xs sm:text-sm shadow-xl shadow-primary/15 transition-all active:scale-95 cursor-pointer"
              >
                <UserPlus size={18} />
                <span>{tr('إضافة حساب جديد', 'Ajouter un compte', 'Add Account')}</span>
              </button>
            </>
          )}
        </div>
      </div>

      {syncMessage && (
        <div
          className={cn(
            "p-3.5 rounded-2xl border text-xs font-bold flex items-center justify-between gap-3",
            syncMessage.type === 'success'
              ? "bg-emerald-50 border-emerald-200 text-emerald-800"
              : "bg-amber-50 border-amber-200 text-amber-900"
          )}
        >
          <span>{syncMessage.text}</span>
          <button
            type="button"
            onClick={() => setSyncMessage(null)}
            className="opacity-60 hover:opacity-100 cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              {tr('إجمالي الحسابات', 'Total Comptes', 'Total Accounts')}
            </p>
            <p className="text-3xl font-black text-primary mt-1">{accounts.length}</p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
            <Users size={24} />
          </div>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              {tr('حسابات الإدارة', 'Direction', 'Director')}
            </p>
            <p className="text-3xl font-black text-accent mt-1">{directorAccounts.length}</p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-amber-50 text-accent flex items-center justify-center border border-amber-100">
            <ShieldCheck size={24} />
          </div>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              {tr('السكرتارية النشطة', 'Secrétaires Actifs', 'Active Secretaries')}
            </p>
            <p className="text-3xl font-black text-emerald-600 mt-1">
              {activeSecretariesCount} <span className="text-sm font-bold text-slate-400">/ {secretaryAccounts.length}</span>
            </p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100">
            <UserCog size={24} />
          </div>
        </div>
      </div>

      {/* Director Profile Section */}
      <section className="space-y-4">
        <div className="flex items-center gap-2.5">
          <div className="w-2 h-6 rounded-full bg-accent" />
          <h2 className="text-lg font-black text-primary">
            {tr('ملف المدير العام', 'Profil du Directeur', 'Director Profile')}
          </h2>
        </div>

        {directorAccounts.length === 0 ? (
          <div className="bg-white rounded-3xl border border-slate-100 p-10 text-center space-y-2">
            <ShieldCheck size={36} className="mx-auto text-slate-300" />
            <p className="text-slate-500 font-bold text-sm">
              {tr('لا توجد حسابات مديرين مسجلة في Supabase بعد', 'Aucun compte directeur enregistré dans Supabase', 'No director accounts found in Supabase yet')}
            </p>
          </div>
        ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {directorAccounts.map(acc => {
            const isOwnProfile = user?.uid === acc.id;
            const showPass = !!visiblePasswords[acc.id];
            return (
              <div
                key={acc.id}
                className="bg-gradient-to-br from-primary via-[#0e3273] to-[#081d45] text-white p-6 sm:p-7 rounded-3xl shadow-xl shadow-primary/15 relative overflow-hidden border border-white/10"
              >
                <div className={cn("absolute -bottom-8 opacity-10 pointer-events-none", isRTL ? "-left-8" : "-right-8")}>
                  <ShieldCheck size={160} />
                </div>

                <div className="relative z-10 space-y-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <div className="w-14 h-14 rounded-2xl bg-accent text-white flex items-center justify-center font-black text-xl shadow-lg shadow-amber-500/25 shrink-0">
                        {getLocalizedName(acc).charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-xl font-black tracking-tight">{getLocalizedName(acc)}</h3>
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-accent text-white">
                            {tr('المدير', 'Directeur', 'Director')}
                          </span>
                          {isOwnProfile && (
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-white/15 text-blue-100 border border-white/20">
                              {tr('حسابك الحالي', 'Session actuelle', 'Current You')}
                            </span>
                          )}
                        </div>
                        <p className="text-xs font-mono text-blue-200 mt-1" dir="ltr">@{acc.username}</p>
                      </div>
                    </div>

                    {isDirector && (
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => openEditModal(acc)}
                          className="p-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl transition-all cursor-pointer shrink-0"
                          title={tr('تعديل ملف المدير', 'Modifier le profil', 'Edit profile')}
                        >
                          <Pencil size={16} />
                        </button>
                        {acc.id !== user?.uid && (
                          <button
                            type="button"
                            onClick={() => handleDeleteAccount(acc)}
                            className="p-2.5 bg-white/10 hover:bg-rose-500/80 text-white rounded-xl transition-all cursor-pointer shrink-0"
                            title={tr('حذف الحساب', 'Supprimer le compte', 'Delete account')}
                          >
                            <Trash2 size={16} />
                          </button>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-medium text-blue-100 bg-white/5 p-4 rounded-2xl border border-white/10">
                    <div className="flex items-center gap-2 truncate">
                      <Mail size={14} className="text-amber-300 shrink-0" />
                      <span className="truncate" dir="ltr">{acc.email || '—'}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Phone size={14} className="text-amber-300 shrink-0" />
                      <span dir="ltr">{acc.phone || tr('غير مضاف', 'Non renseigné', 'Not set')}</span>
                    </div>
                    {isDirector && (
                      <div className="sm:col-span-2 flex items-center justify-between pt-2 border-t border-white/10">
                        <div className="flex items-center gap-2">
                          <KeyRound size={14} className="text-amber-300 shrink-0" />
                          <span className="text-blue-200">{tr('كلمة المرور:', 'Mot de passe :', 'Password:')}</span>
                          <span className="font-mono font-bold text-white" dir="ltr">
                            {showPass ? acc.password : '••••••••'}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => setVisiblePasswords(prev => ({ ...prev, [acc.id]: !prev[acc.id] }))}
                            className="p-1.5 hover:bg-white/10 rounded-lg text-blue-100 cursor-pointer"
                            title={showPass ? tr('إخفاء', 'Masquer', 'Hide') : tr('إظهار', 'Afficher', 'Show')}
                          >
                            {showPass ? <EyeOff size={14} /> : <Eye size={14} />}
                          </button>
                          <button
                            type="button"
                            onClick={() => copyCredentials(acc)}
                            className="p-1.5 hover:bg-white/10 rounded-lg text-blue-100 cursor-pointer"
                            title={tr('نسخ بيانات الدخول', 'Copier les accès', 'Copy credentials')}
                          >
                            {copiedId === acc.id ? <Check size={14} className="text-emerald-300" /> : <Copy size={14} />}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        )}
      </section>

      {/* Secretaries Section */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-2 h-6 rounded-full bg-primary" />
            <h2 className="text-lg font-black text-primary">
              {tr('حسابات السكرتارية', 'Comptes Secrétaires', 'Secretary Accounts')}
            </h2>
          </div>
          <span className="text-xs font-bold text-slate-400">
            {secretaryAccounts.length} {tr('حسابات', 'comptes', 'accounts')}
          </span>
        </div>

        {secretaryAccounts.length === 0 ? (
          <div className="bg-white rounded-3xl border border-slate-100 p-12 text-center space-y-3">
            <UserCog size={40} className="mx-auto text-slate-300" />
            <p className="text-slate-500 font-bold">
              {tr('لا توجد حسابات سكرتارية مسجلة بعد', 'Aucun compte secrétaire enregistré', 'No secretary accounts created yet')}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            {secretaryAccounts.map(acc => {
              const isOwnProfile = user?.uid === acc.id;
              const canEdit = isDirector || isOwnProfile;
              const showPass = !!visiblePasswords[acc.id];

              return (
                <div
                  key={acc.id}
                  className={cn(
                    "bg-white p-6 rounded-3xl border transition-all flex flex-col justify-between gap-4 shadow-sm hover:shadow-md",
                    isOwnProfile ? "border-accent ring-2 ring-accent/15" : "border-slate-100",
                    !acc.isActive && "opacity-75 bg-slate-50/70"
                  )}
                >
                  <div className="space-y-4">
                    {/* Top Row: Avatar + Name + Actions */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={cn(
                          "w-12 h-12 rounded-2xl flex items-center justify-center font-black text-lg shrink-0",
                          acc.isActive ? "bg-primary/10 text-primary" : "bg-slate-200 text-slate-500"
                        )}>
                          {getLocalizedName(acc).charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <h3 className="font-black text-slate-900 text-base truncate">{getLocalizedName(acc)}</h3>
                          <div className="flex flex-wrap items-center gap-1.5 mt-1">
                            <span className="text-[11px] font-mono font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md" dir="ltr">
                              @{acc.username}
                            </span>
                            {isOwnProfile && (
                              <span className="text-[10px] font-black bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full">
                                {tr('حسابك', 'Vous', 'You')}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        {canEdit && (
                          <button
                            type="button"
                            onClick={() => openEditModal(acc)}
                            className="p-2 text-slate-400 hover:text-primary hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                            title={tr('تعديل الحساب', 'Modifier le profil', 'Edit account')}
                          >
                            <Pencil size={15} />
                          </button>
                        )}
                        {isDirector && acc.id !== user?.uid && (
                          <button
                            type="button"
                            onClick={() => handleDeleteAccount(acc)}
                            className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer"
                            title={tr('حذف الحساب', 'Supprimer le compte', 'Delete account')}
                          >
                            <Trash2 size={15} />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Details */}
                    <div className="space-y-2 text-xs text-slate-600 font-medium bg-slate-50 p-3.5 rounded-2xl border border-slate-100">
                      <div className="flex items-center gap-2 truncate">
                        <Mail size={13} className="text-slate-400 shrink-0" />
                        <span className="truncate" dir="ltr">{acc.email || '—'}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Phone size={13} className="text-slate-400 shrink-0" />
                        <span dir="ltr">{acc.phone || tr('غير مضاف', 'Non renseigné', 'Not set')}</span>
                      </div>
                      {(isDirector || isOwnProfile) && (
                        <div className="flex items-center justify-between pt-2 border-t border-slate-200/70">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <KeyRound size={13} className="text-accent shrink-0" />
                            <span className="font-mono font-bold text-slate-800 truncate" dir="ltr">
                              {showPass ? acc.password : '••••••••'}
                            </span>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              type="button"
                              onClick={() => setVisiblePasswords(prev => ({ ...prev, [acc.id]: !prev[acc.id] }))}
                              className="p-1 text-slate-400 hover:text-primary rounded-lg cursor-pointer"
                              title={showPass ? tr('إخفاء', 'Masquer', 'Hide') : tr('إظهار', 'Afficher', 'Show')}
                            >
                              {showPass ? <EyeOff size={13} /> : <Eye size={13} />}
                            </button>
                            <button
                              type="button"
                              onClick={() => copyCredentials(acc)}
                              className="p-1 text-slate-400 hover:text-primary rounded-lg cursor-pointer"
                              title={tr('نسخ بيانات الدخول', 'Copier les accès', 'Copy credentials')}
                            >
                              {copiedId === acc.id ? <Check size={13} className="text-emerald-600" /> : <Copy size={13} />}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>

                    {acc.notes && (
                      <p className="text-xs text-slate-500 italic line-clamp-2 px-1">
                        {acc.notes}
                      </p>
                    )}
                  </div>

                  {/* Bottom Status Bar */}
                  <div className="flex items-center justify-between pt-3 border-t border-slate-100 text-[11px]">
                    <span className="text-slate-400 font-semibold">
                      {tr('أنشئ في:', 'Créé le :', 'Created:')} {new Date(acc.createdAt).toLocaleDateString(dateLocale)}
                    </span>

                    {isDirector ? (
                      <button
                        type="button"
                        onClick={() => handleToggleActive(acc)}
                        className={cn(
                          "inline-flex items-center gap-1 px-2.5 py-1 rounded-full font-black text-[10px] border transition-all cursor-pointer",
                          acc.isActive
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100"
                            : "bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100"
                        )}
                        title={tr('انقر لتفعيل أو تعطيل الحساب', 'Cliquer pour activer/désactiver', 'Click to toggle active status')}
                      >
                        {acc.isActive ? <CheckCircle2 size={12} /> : <XCircle size={12} />}
                        <span>{acc.isActive ? tr('نشط', 'Actif', 'Active') : tr('معطل', 'Désactivé', 'Disabled')}</span>
                      </button>
                    ) : (
                      <span
                        className={cn(
                          "inline-flex items-center gap-1 px-2.5 py-1 rounded-full font-black text-[10px] border",
                          acc.isActive
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                            : "bg-rose-50 text-rose-700 border-rose-200"
                        )}
                      >
                        {acc.isActive ? <CheckCircle2 size={12} /> : <XCircle size={12} />}
                        <span>{acc.isActive ? tr('نشط', 'Actif', 'Active') : tr('معطل', 'Désactivé', 'Disabled')}</span>
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Add Account Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title={tr('إضافة حساب جديد', 'Créer un compte', 'Create Account')}
      >
        <form onSubmit={handleCreateSecretary} className="space-y-4">
          {addError && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs font-bold">
              {addError}
            </div>
          )}

          <div className="space-y-1">
            <label className="text-xs font-black uppercase tracking-wider text-slate-500">
              {tr('الدور', 'Rôle', 'Role')} *
            </label>
            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => setNewSecretary({ ...newSecretary, role: 'director' })}
                className={cn(
                  "p-3 rounded-2xl text-xs font-black border transition-all cursor-pointer",
                  newSecretary.role === 'director'
                    ? "bg-amber-50 border-accent text-primary shadow-xs"
                    : "bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100"
                )}
              >
                {tr('المدير', 'Directeur', 'Director')}
              </button>
              <button
                type="button"
                onClick={() => setNewSecretary({ ...newSecretary, role: 'secretary' })}
                className={cn(
                  "p-3 rounded-2xl text-xs font-black border transition-all cursor-pointer",
                  newSecretary.role === 'secretary'
                    ? "bg-primary/10 border-primary text-primary shadow-xs"
                    : "bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100"
                )}
              >
                {tr('سكرتير', 'Secrétaire', 'Secretary')}
              </button>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-black uppercase tracking-wider text-slate-500">
              {tr('الاسم الكامل', 'Nom complet', 'Full Name')} *
            </label>
            <input
              type="text"
              required
              value={newSecretary.displayName}
              onChange={e => setNewSecretary({ ...newSecretary, displayName: e.target.value })}
              placeholder={tr('مثال: سارة بن علي', 'ex. Sara Benali', 'e.g. Sara Benali')}
              className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-primary/15 font-bold text-sm"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-black uppercase tracking-wider text-slate-500">
                {tr('اسم المستخدم للدخول', "Nom d'utilisateur", 'Login Username')} *
              </label>
              <input
                type="text"
                required
                dir="ltr"
                value={newSecretary.username}
                onChange={e => setNewSecretary({ ...newSecretary, username: e.target.value.toLowerCase().replace(/\s+/g, '') })}
                placeholder="sara.sec"
                className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-primary/15 font-mono font-bold text-sm"
              />
            </div>

            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label className="text-xs font-black uppercase tracking-wider text-slate-500">
                  {tr('كلمة المرور', 'Mot de passe', 'Password')} *
                </label>
                <button
                  type="button"
                  onClick={generateRandomPassword}
                  className="text-[10px] font-black text-accent hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <Sparkles size={11} />
                  <span>{tr('توليد تلقائي', 'Générer', 'Generate')}</span>
                </button>
              </div>
              <div className="relative">
                <input
                  type={showNewPassword ? 'text' : 'password'}
                  required
                  dir="ltr"
                  value={newSecretary.password}
                  onChange={e => setNewSecretary({ ...newSecretary, password: e.target.value })}
                  placeholder="••••••••"
                  className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-primary/15 font-mono font-bold text-sm pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-primary cursor-pointer"
                >
                  {showNewPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-black uppercase tracking-wider text-slate-500">
                {tr('البريد الإلكتروني (اختياري)', 'Email (Optionnel)', 'Email (Optional)')}
              </label>
              <input
                type="email"
                dir="ltr"
                value={newSecretary.email}
                onChange={e => setNewSecretary({ ...newSecretary, email: e.target.value })}
                placeholder="sec@samyacademy.dz"
                className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-primary/15 font-bold text-sm"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-black uppercase tracking-wider text-slate-500">
                {tr('رقم الهاتف (اختياري)', 'Téléphone (Optionnel)', 'Phone (Optional)')}
              </label>
              <input
                type="tel"
                dir="ltr"
                value={newSecretary.phone}
                onChange={e => setNewSecretary({ ...newSecretary, phone: e.target.value })}
                placeholder="0550..."
                className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-primary/15 font-bold text-sm"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-black uppercase tracking-wider text-slate-500">
              {tr('ملاحظات (اختياري)', 'Notes (Optionnel)', 'Notes (Optional)')}
            </label>
            <textarea
              value={newSecretary.notes}
              onChange={e => setNewSecretary({ ...newSecretary, notes: e.target.value })}
              placeholder={tr('أوقات العمل أو مهام إضافية...', 'Horaires ou responsabilités...', 'Shift hours or notes...')}
              className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-primary/15 font-medium text-sm h-20 resize-none"
            />
          </div>

          <button
            type="submit"
            disabled={isSubmittingAdd}
            className="w-full bg-primary hover:bg-primary/90 disabled:opacity-60 text-white p-4 rounded-2xl font-black shadow-xl shadow-primary/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            {isSubmittingAdd ? <Loader2 size={18} className="animate-spin" /> : <UserPlus size={18} />}
            <span>{tr('إنشاء الحساب', 'Créer le compte', 'Create Account')}</span>
          </button>
        </form>
      </Modal>

      {/* Edit Admin / Secretary Profile Modal */}
      <Modal
        isOpen={!!editingAccount}
        onClose={() => setEditingAccount(null)}
        title={
          editingAccount?.role === 'director'
            ? tr('تعديل ملف المدير', 'Modifier le profil Directeur', 'Edit Director Profile')
            : tr('تعديل ملف السكرتير', 'Modifier le profil Secrétaire', 'Edit Secretary Profile')
        }
      >
        {editingAccount && (
          <form onSubmit={handleUpdateAccount} className="space-y-4">
            {editError && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs font-bold">
                {editError}
              </div>
            )}

            <div className="space-y-1">
              <label className="text-xs font-black uppercase tracking-wider text-slate-500">
                {tr('الاسم المعروض', 'Nom affiché', 'Display Name')} *
              </label>
              <input
                type="text"
                required
                value={editForm.displayName}
                onChange={e => setEditForm({ ...editForm, displayName: e.target.value })}
                className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-primary/15 font-bold text-sm"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-black uppercase tracking-wider text-slate-500">
                  {tr('اسم المستخدم', "Nom d'utilisateur", 'Username')}
                </label>
                <input
                  type="text"
                  required
                  dir="ltr"
                  disabled={editingAccount.role === 'director' && !isDirector}
                  value={editForm.username}
                  onChange={e => setEditForm({ ...editForm, username: e.target.value.toLowerCase().replace(/\s+/g, '') })}
                  className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-primary/15 font-mono font-bold text-sm disabled:opacity-60"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-black uppercase tracking-wider text-slate-500">
                  {tr('كلمة مرور جديدة (اختياري)', 'Nouveau mot de passe (Optionnel)', 'New Password (Optional)')}
                </label>
                <div className="relative">
                  <input
                    type={showEditPassword ? 'text' : 'password'}
                    dir="ltr"
                    value={editForm.password}
                    onChange={e => setEditForm({ ...editForm, password: e.target.value })}
                    placeholder={tr('اتركه فارغاً للإبقاء على الحالية', 'Laisser vide pour conserver', 'Leave blank to keep current')}
                    className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-primary/15 font-mono font-bold text-sm pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowEditPassword(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-primary cursor-pointer"
                  >
                    {showEditPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-black uppercase tracking-wider text-slate-500">
                  {tr('البريد الإلكتروني', 'Email', 'Email')}
                </label>
                <input
                  type="email"
                  dir="ltr"
                  value={editForm.email}
                  onChange={e => setEditForm({ ...editForm, email: e.target.value })}
                  className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-primary/15 font-bold text-sm"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-black uppercase tracking-wider text-slate-500">
                  {tr('رقم الهاتف', 'Téléphone', 'Phone')}
                </label>
                <input
                  type="tel"
                  dir="ltr"
                  value={editForm.phone}
                  onChange={e => setEditForm({ ...editForm, phone: e.target.value })}
                  className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-primary/15 font-bold text-sm"
                />
              </div>
            </div>

            {isDirector && editingAccount.role === 'secretary' && (
              <div className="flex items-center justify-between p-3.5 bg-slate-50 rounded-2xl border border-slate-200">
                <div>
                  <p className="text-xs font-black text-slate-800">
                    {tr('حالة الحساب', 'Statut du compte', 'Account Status')}
                  </p>
                  <p className="text-[11px] text-slate-500">
                    {tr('السماح لهذا الحساب بتسجيل الدخول', 'Autoriser ce compte à se connecter', 'Allow this account to sign in')}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setEditForm(prev => ({ ...prev, isActive: !prev.isActive }))}
                  className={cn(
                    "px-3.5 py-1.5 rounded-xl text-xs font-black border transition-all cursor-pointer",
                    editForm.isActive
                      ? "bg-emerald-50 text-emerald-700 border-emerald-300"
                      : "bg-rose-50 text-rose-700 border-rose-300"
                  )}
                >
                  {editForm.isActive ? tr('نشط', 'Actif', 'Active') : tr('معطل', 'Désactivé', 'Disabled')}
                </button>
              </div>
            )}

            <div className="space-y-1">
              <label className="text-xs font-black uppercase tracking-wider text-slate-500">
                {tr('ملاحظات', 'Notes', 'Notes')}
              </label>
              <textarea
                value={editForm.notes}
                onChange={e => setEditForm({ ...editForm, notes: e.target.value })}
                className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-primary/15 font-medium text-sm h-20 resize-none"
              />
            </div>

            <button
              type="submit"
              disabled={isSubmittingEdit}
              className="w-full bg-primary hover:bg-primary/90 disabled:opacity-60 text-white p-4 rounded-2xl font-black shadow-xl shadow-primary/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              {isSubmittingEdit && <Loader2 size={18} className="animate-spin" />}
              <span>{tr('حفظ التعديلات', 'Enregistrer les modifications', 'Save Changes')}</span>
            </button>
          </form>
        )}
      </Modal>

      {/* Supabase 'admin' Table SQL Modal */}
      <Modal
        isOpen={isSqlModalOpen}
        onClose={() => setIsSqlModalOpen(false)}
        title={tr('ربط جدول "admin" في Supabase', 'Table Supabase "admin"', 'Supabase "admin" Table Setup')}
      >
        <div className="space-y-4">
          <p className="text-xs text-slate-600 font-medium leading-relaxed">
            {tr(
              'قم بنسخ هذا السكربت وتشغيله في SQL Editor داخل لوحة تحكم Supabase لإنشاء جدول "admin" (اسم المستخدم، كلمة المرور، الدور، والمعلومات) ومزامنته مباشرة مع هذا القسم:',
              'Copiez et exécutez ce script dans le SQL Editor de Supabase pour créer la table "admin" (username, password, rôle et profils) et la synchroniser avec cette section :',
              'Copy and run this SQL script in your Supabase SQL Editor to create the "admin" table (username, password, role & profile details) and sync it with this section:'
            )}
          </p>

          <div className="relative">
            <pre
              dir="ltr"
              className="bg-slate-900 text-emerald-300 p-4 rounded-2xl text-[11px] font-mono overflow-x-auto max-h-64 leading-relaxed border border-slate-800 text-left"
            >
              {adminSqlCode}
            </pre>
            <button
              type="button"
              onClick={handleCopySql}
              className="absolute top-3 right-3 flex items-center gap-1.5 bg-white/10 hover:bg-white/20 text-white px-3 py-1.5 rounded-xl text-[11px] font-bold transition-colors cursor-pointer"
            >
              {isCopiedSql ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
              <span>{isCopiedSql ? tr('تم النسخ', 'Copié !', 'Copied!') : tr('نسخ SQL', 'Copier SQL', 'Copy SQL')}</span>
            </button>
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setIsSqlModalOpen(false)}
              className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-100 cursor-pointer"
            >
              {tr('إغلاق', 'Fermer', 'Close')}
            </button>
            <button
              type="button"
              onClick={async () => {
                await handleSyncWithSupabase();
                setIsSqlModalOpen(false);
              }}
              disabled={isSyncing}
              className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-white px-5 py-2.5 rounded-xl text-xs font-black shadow-lg shadow-primary/15 cursor-pointer disabled:opacity-60"
            >
              <RefreshCw size={14} className={cn(isSyncing && "animate-spin")} />
              <span>{tr('مزامنة الآن', 'Synchroniser maintenant', 'Sync Now')}</span>
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
