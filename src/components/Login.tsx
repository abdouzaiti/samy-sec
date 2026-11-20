import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { Loader2 } from 'lucide-react';
import { cn } from '../lib/utils';
import { motion } from 'motion/react';

export function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const { login } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { t, tr, language, setLanguage, isRTL } = useLanguage();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      await login(username, password);
    } catch (err) {
      setError(tr(
        'اسم المستخدم أو كلمة المرور غير صحيحة',
        "Nom d'utilisateur ou mot de passe incorrect",
        'Invalid username or password'
      ));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 font-sans">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md"
      >
        <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-xl shadow-primary/5 relative overflow-hidden">
          <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-primary via-accent to-primary" />

          {/* Language Switcher */}
          <div className={cn("flex mb-4", isRTL ? "justify-start" : "justify-end")}>
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg">
              {(['ar', 'fr', 'en'] as const).map((lang) => (
                <button
                  key={lang}
                  type="button"
                  onClick={() => setLanguage(lang)}
                  className={cn(
                    "px-2 py-1 text-[10px] font-bold rounded-md uppercase transition-all cursor-pointer",
                    language === lang ? "bg-white text-primary shadow-sm" : "text-slate-400 hover:text-slate-600"
                  )}
                >
                  {lang === 'ar' ? 'عربي' : lang}
                </button>
              ))}
            </div>
          </div>

          <div className={cn("flex flex-col items-center mb-10", isRTL && "text-right")}>
            <div className="w-28 h-28 mb-5 transition-transform hover:scale-105">
              <img src="/logo.png" alt="Samy Academy Logo" className="w-full h-full object-contain" />
            </div>
            <h1 className="text-2xl font-bold text-primary tracking-tight text-center">{t('welcome')}</h1>
            <p className="text-slate-500 mt-2 text-center font-medium">{t('login_desc')}</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className={cn("p-4 bg-rose-50 text-rose-600 rounded-xl text-sm font-bold animate-in fade-in slide-in-from-top-2", isRTL && "text-right")}>
                {error}
              </div>
            )}
            <div>
              <label className={cn("block text-sm font-medium text-slate-700 mb-1", isRTL && "text-right")}>
                {tr('اسم المستخدم', "Nom d'utilisateur", 'Username')}
              </label>
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder={tr('اسم المستخدم', "Nom d'utilisateur", 'Username')}
                className={cn(
                  "w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-accent/20 focus:border-accent outline-none transition-all font-bold",
                   isRTL && "text-right"
                )}
              />
            </div>

            <div>
              <label className={cn("block text-sm font-medium text-slate-700 mb-1", isRTL && "text-right")}>
                {t('password')}
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className={cn(
                  "w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-accent/20 focus:border-accent outline-none transition-all",
                   isRTL && "text-right"
                )}
              />
            </div>

            <button
              disabled={isSubmitting}
              className="w-full bg-primary hover:bg-primary/90 text-white font-bold py-3.5 rounded-xl shadow-lg shadow-primary/10 transition-all flex items-center justify-center gap-2 group disabled:opacity-70"
            >
              {isSubmitting ? (
                <Loader2 className="animate-spin" size={20} />
              ) : (
                <>
                   {t('signin')}
                   <div className={cn("transition-transform group-hover:translate-x-1", isRTL && "rotate-180 group-hover:-translate-x-1")}>
                     →
                   </div>
                </>
              )}
            </button>
          </form>
        </div>
      </motion.div>
    </div>
  );
}
