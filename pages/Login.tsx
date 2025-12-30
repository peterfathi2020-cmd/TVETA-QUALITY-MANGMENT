
import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Lock, Mail, ArrowLeft, AlertTriangle, UserCircle2, ChevronDown, UserPlus, ArrowRight, CheckCircle2, Phone, MapPin, Briefcase } from 'lucide-react';
import { TvetaLogo } from '../components/Layout';
import { EGYPT_GOVERNORATES } from '../constants';

type AuthMode = 'login' | 'signup' | 'forgot';

const Login: React.FC = () => {
  const { login, signup, resetPassword } = useAuth();
  
  const [mode, setMode] = useState<AuthMode>('login');
  
  // Login State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  
  // Signup State
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPass, setNewPass] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newGov, setNewGov] = useState('');
  const [newSpec, setNewSpec] = useState('');

  // Forgot State
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotSent, setForgotSent] = useState(false);

  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
        const result = await login(email, password);
        if (!result.success) {
            setError(result.message || 'بيانات الدخول غير صحيحة.');
        }
        // If success, user state in Context updates, and App.tsx redirects automatically.
    } catch (e) {
        setError('حدث خطأ في الاتصال بالخادم. تأكد من اتصالك بالإنترنت.');
    } finally {
        setIsSubmitting(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    if (!newGov) {
        setError("يرجى اختيار المحافظة");
        setIsSubmitting(false);
        return;
    }

    const res = await signup({
        name: newName,
        email: newEmail,
        password: newPass,
        // Custom fields passed via any cast in context
        // @ts-ignore 
        phone: newPhone,
        governorate: newGov,
        specialization: newSpec
    });

    if (res) {
        setError(res);
        setIsSubmitting(false);
    } 
    // If success, Context updates and redirects
  };

  const handleForgot = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);
    
    // Simulate reset
    await new Promise(r => setTimeout(r, 1000));
    const success = await resetPassword(forgotEmail);
    
    if (success) {
        setForgotSent(true);
    } else {
        setError("البريد الإلكتروني غير مسجل في النظام.");
    }
    setIsSubmitting(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden bg-[#0f172a]" dir="rtl">
      {/* Dynamic Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-[#0f172a] to-blue-950 z-0"></div>
      <div className="absolute -top-[10%] -right-[5%] w-[600px] h-[600px] bg-blue-600/10 rounded-full mix-blend-screen filter blur-[120px] animate-pulse"></div>
      <div className="absolute bottom-[0%] -left-[5%] w-[500px] h-[500px] bg-indigo-500/10 rounded-full mix-blend-screen filter blur-[100px]" style={{ animationDelay: '3s' }}></div>

      <div className="w-full max-w-[1000px] grid grid-cols-1 lg:grid-cols-2 gap-0 bg-slate-900/50 backdrop-blur-3xl border border-white/10 rounded-[40px] shadow-2xl overflow-hidden relative z-10">
        
        {/* Right Side: Information & Branding */}
        <div className="hidden lg:flex flex-col justify-center p-12 bg-gradient-to-br from-blue-600 to-indigo-800 text-white relative">
            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/circuit-board.png')] opacity-20"></div>
            <div className="relative z-10">
                <div className="mb-8 transform scale-125 origin-right">
                    <TvetaLogo variant="dark" size="lg" />
                </div>
                <h2 className="text-3xl font-black mb-4 leading-tight">بوابة ضمان جودة التدريب الفني</h2>
                <p className="text-blue-100/80 text-lg mb-10 leading-relaxed">
                    نظام متكامل لمتابعة الزيارات الميدانية، تقييم الأداء، وإدارة الأرشيف الرقمي لقطاعات التنمية المهنية.
                </p>
                
                <div className="space-y-6">
                    <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center font-bold">1</div>
                        <span className="font-bold">تتبع لحظي للزيارات الميدانية عبر الـ GPS</span>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center font-bold">2</div>
                        <span className="font-bold">تقارير ذكية مدعومة بالذكاء الاصطناعي Gemini</span>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center font-bold">3</div>
                        <span className="font-bold">أرشيف دائم لكافة المستندات والنماذج</span>
                    </div>
                </div>
            </div>
        </div>

        {/* Left Side: Dynamic Forms */}
        <div className="p-8 md:p-12 lg:p-16 flex flex-col justify-center">
            <div className="text-center lg:text-right mb-8">
                <div className="lg:hidden flex justify-center mb-6">
                     <TvetaLogo variant="dark" size="lg" />
                </div>
                <h1 className="text-3xl font-black text-white mb-2">
                    {mode === 'login' ? 'تسجيل الدخول' : mode === 'signup' ? 'إنشاء حساب مراجع' : 'استعادة كلمة المرور'}
                </h1>
                <p className="text-slate-400 font-medium">
                    {mode === 'login' ? 'أهلاً بك مجدداً في نظام TVETA للجودة' : mode === 'signup' ? 'سجل بياناتك للانضمام لفريق المراجعين' : 'أدخل بريدك الإلكتروني لاستلام تعليمات الاستعادة'}
                </p>
            </div>

            {error && (
                <div className="bg-rose-500/10 border border-rose-500/20 text-rose-300 px-4 py-3 rounded-2xl text-sm flex items-center gap-3 animate-shake mb-6">
                    <AlertTriangle size={18} className="shrink-0" />
                    <span className="font-bold">{error}</span>
                </div>
            )}

            {/* LOGIN FORM */}
            {mode === 'login' && (
                <form onSubmit={handleLogin} className="space-y-5 animate-fade-in">
                    <div className="space-y-2">
                        <label className="text-sm font-bold text-slate-300 mr-1">البريد الإلكتروني</label>
                        <div className="relative group">
                            <Mail className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-400" size={20} />
                            <input 
                                type="email" 
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full bg-slate-800/50 border border-slate-700 text-white placeholder-slate-500 pr-12 pl-4 py-4 rounded-2xl focus:ring-2 focus:ring-blue-500/50 outline-none transition-all text-right font-sans"
                                placeholder="user@tveta.edu.eg"
                                required
                                dir="ltr"
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <div className="flex justify-between items-center">
                            <label className="text-sm font-bold text-slate-300 mr-1">كلمة المرور</label>
                            <button type="button" onClick={() => setMode('forgot')} className="text-xs text-blue-400 hover:text-blue-300 font-bold">نسيت كلمة المرور؟</button>
                        </div>
                        <div className="relative group">
                            <Lock className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-400" size={20} />
                            <input 
                                type="password" 
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full bg-slate-800/50 border border-slate-700 text-white placeholder-slate-500 pr-12 pl-4 py-4 rounded-2xl focus:ring-2 focus:ring-blue-500/50 outline-none transition-all text-right font-sans"
                                placeholder="••••••••"
                                required
                                dir="ltr"
                            />
                        </div>
                    </div>

                    <button 
                        type="submit" 
                        disabled={isSubmitting}
                        className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-black text-lg py-4 rounded-2xl transition-all shadow-xl shadow-blue-900/40 transform hover:-translate-y-1 mt-4 flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed group"
                    >
                        {isSubmitting ? (
                            <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                        ) : (
                            <>
                                <span>دخول للنظام</span>
                                <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
                            </>
                        )}
                    </button>

                    <div className="mt-6 pt-6 border-t border-slate-700/50 text-center">
                        <p className="text-slate-400 text-sm mb-3">ليس لديك حساب؟</p>
                        <button type="button" onClick={() => setMode('signup')} className="w-full py-3 border border-slate-600 hover:border-blue-500 hover:text-blue-400 text-slate-300 rounded-2xl font-bold transition-all flex items-center justify-center gap-2">
                            <UserPlus size={18} />
                            إنشاء حساب مراجع جودة
                        </button>
                        <p className="text-[10px] text-slate-500 mt-3">حسابات مديري القطاعات يتم إنشاؤها بواسطة الإدارة فقط.</p>
                    </div>
                </form>
            )}

            {/* SIGNUP FORM */}
            {mode === 'signup' && (
                <form onSubmit={handleSignup} className="space-y-4 animate-fade-in">
                    <div className="grid grid-cols-2 gap-3">
                         <div className="space-y-1">
                            <label className="text-xs font-bold text-slate-400 mr-1">الاسم بالكامل</label>
                            <div className="relative"><UserCircle2 className="absolute right-3 top-3 text-slate-500" size={16} /><input required value={newName} onChange={e => setNewName(e.target.value)} className="w-full bg-slate-800/50 border border-slate-700 text-white pr-9 pl-3 py-2.5 rounded-xl focus:ring-2 focus:ring-blue-500/50 outline-none text-sm" /></div>
                         </div>
                         <div className="space-y-1">
                            <label className="text-xs font-bold text-slate-400 mr-1">المحافظة</label>
                            <div className="relative">
                                <MapPin className="absolute right-3 top-3 text-slate-500" size={16} />
                                <select required value={newGov} onChange={e => setNewGov(e.target.value)} className="w-full bg-slate-800/50 border border-slate-700 text-white pr-9 pl-3 py-2.5 rounded-xl focus:ring-2 focus:ring-blue-500/50 outline-none text-sm appearance-none">
                                    <option value="">اختر...</option>
                                    {EGYPT_GOVERNORATES.map(g => <option key={g} value={g}>{g}</option>)}
                                </select>
                            </div>
                         </div>
                    </div>

                    <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-400 mr-1">البريد الإلكتروني (Gmail)</label>
                        <div className="relative"><Mail className="absolute right-3 top-3 text-slate-500" size={16} /><input type="email" required value={newEmail} onChange={e => setNewEmail(e.target.value)} className="w-full bg-slate-800/50 border border-slate-700 text-white pr-9 pl-3 py-2.5 rounded-xl focus:ring-2 focus:ring-blue-500/50 outline-none text-sm font-sans text-right" dir="ltr" /></div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-slate-400 mr-1">كلمة المرور</label>
                            <div className="relative"><Lock className="absolute right-3 top-3 text-slate-500" size={16} /><input type="password" required value={newPass} onChange={e => setNewPass(e.target.value)} className="w-full bg-slate-800/50 border border-slate-700 text-white pr-9 pl-3 py-2.5 rounded-xl focus:ring-2 focus:ring-blue-500/50 outline-none text-sm font-sans text-right" dir="ltr" /></div>
                        </div>
                        <div className="space-y-1">
                             <label className="text-xs font-bold text-slate-400 mr-1">رقم الهاتف</label>
                             <div className="relative"><Phone className="absolute right-3 top-3 text-slate-500" size={16} /><input required value={newPhone} onChange={e => setNewPhone(e.target.value)} className="w-full bg-slate-800/50 border border-slate-700 text-white pr-9 pl-3 py-2.5 rounded-xl focus:ring-2 focus:ring-blue-500/50 outline-none text-sm font-mono text-right" dir="ltr" /></div>
                        </div>
                    </div>

                    <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-400 mr-1">التخصص (اختياري)</label>
                        <div className="relative"><Briefcase className="absolute right-3 top-3 text-slate-500" size={16} /><input value={newSpec} onChange={e => setNewSpec(e.target.value)} className="w-full bg-slate-800/50 border border-slate-700 text-white pr-9 pl-3 py-2.5 rounded-xl focus:ring-2 focus:ring-blue-500/50 outline-none text-sm" placeholder="مثال: ميكانيكا، كهرباء..." /></div>
                    </div>

                    <button 
                        type="submit" 
                        disabled={isSubmitting}
                        className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-lg py-3 rounded-2xl transition-all shadow-xl shadow-emerald-900/40 mt-4 flex items-center justify-center gap-3"
                    >
                        {isSubmitting ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : <span>إنشاء الحساب</span>}
                    </button>

                    <button type="button" onClick={() => setMode('login')} className="w-full text-center text-slate-400 text-sm hover:text-white mt-2">
                        لديك حساب بالفعل؟ تسجيل الدخول
                    </button>
                </form>
            )}

            {/* FORGOT PASSWORD FORM */}
            {mode === 'forgot' && (
                <div className="animate-fade-in space-y-6">
                    {!forgotSent ? (
                        <form onSubmit={handleForgot} className="space-y-5">
                             <p className="text-slate-400 text-sm leading-relaxed">أدخل بريدك الإلكتروني المسجل وسنقوم بإرسال رابط لإعادة تعيين كلمة المرور.</p>
                             <div className="space-y-2">
                                <label className="text-sm font-bold text-slate-300 mr-1">البريد الإلكتروني</label>
                                <div className="relative group">
                                    <Mail className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-400" size={20} />
                                    <input 
                                        type="email" 
                                        value={forgotEmail}
                                        onChange={(e) => setForgotEmail(e.target.value)}
                                        className="w-full bg-slate-800/50 border border-slate-700 text-white placeholder-slate-500 pr-12 pl-4 py-4 rounded-2xl focus:ring-2 focus:ring-blue-500/50 outline-none transition-all text-right font-sans"
                                        required
                                        dir="ltr"
                                    />
                                </div>
                            </div>
                            <button 
                                type="submit" 
                                disabled={isSubmitting}
                                className="w-full bg-blue-600 hover:bg-blue-500 text-white font-black text-lg py-4 rounded-2xl transition-all shadow-xl shadow-blue-900/40 flex items-center justify-center gap-3"
                            >
                                {isSubmitting ? <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : <span>إرسال الرابط</span>}
                            </button>
                            <button type="button" onClick={() => setMode('login')} className="w-full text-center text-slate-400 text-sm hover:text-white">
                                العودة لتسجيل الدخول
                            </button>
                        </form>
                    ) : (
                        <div className="text-center py-6">
                            <div className="w-16 h-16 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mx-auto mb-4 border border-emerald-500/30">
                                <CheckCircle2 size={32} />
                            </div>
                            <h3 className="text-white font-bold text-xl mb-2">تم الإرسال بنجاح</h3>
                            <p className="text-slate-400 text-sm mb-6">يرجى التحقق من صندوق الوارد (أو الرسائل المزعجة) في بريدك الإلكتروني.</p>
                            <button onClick={() => setMode('login')} className="bg-slate-700 hover:bg-slate-600 text-white px-6 py-3 rounded-xl font-bold transition-all">
                                العودة لتسجيل الدخول
                            </button>
                        </div>
                    )}
                </div>
            )}
            
            <p className="mt-8 text-center text-slate-500 text-xs">
                &copy; {new Date().getFullYear()} نظام الجودة المتكامل TVETA. جميع الحقوق محفوظة.
            </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
