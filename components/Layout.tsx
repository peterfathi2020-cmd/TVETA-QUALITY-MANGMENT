
import React, { useState } from 'react';
import { Menu, X, Users, ClipboardCheck, Calendar, BarChart2, UserCheck, Home, FileText, LogOut, User as UserIcon, Settings, ChevronRight, Signal, Database, ShieldCheck, Search as SearchIcon, Bell } from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';

interface LayoutProps {
  children: React.ReactNode;
}

// --- NEW TVETA LOGO COMPONENT ---
export const TvetaLogo: React.FC<{ variant?: 'light' | 'dark', size?: 'sm' | 'lg' }> = ({ variant = 'light', size = 'sm' }) => {
  const isDark = variant === 'dark'; // Dark background, light text
  const isLg = size === 'lg';
  
  return (
    <div className="flex items-center gap-3 select-none">
      <div className={`relative flex items-center justify-center ${isLg ? 'w-14 h-14 rounded-2xl' : 'w-10 h-10 rounded-xl'} ${isDark ? 'bg-gradient-to-br from-blue-600 to-indigo-700 shadow-lg shadow-blue-900/50' : 'bg-blue-600 text-white shadow-sm'}`}>
        <ShieldCheck size={isLg ? 28 : 20} className="text-white" strokeWidth={2.5} />
        <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-amber-400 rounded-full border-2 border-white"></div>
      </div>
      <div className="flex flex-col">
        <h1 className={`${isLg ? 'text-3xl' : 'text-xl'} font-black tracking-tighter ${isDark ? 'text-white' : 'text-slate-800'}`}>
          TVETA
        </h1>
        <span className={`${isLg ? 'text-xs' : 'text-[8px]'} font-bold uppercase tracking-[0.2em] ${isDark ? 'text-blue-200' : 'text-blue-600'}`}>
          Quality System
        </span>
      </div>
    </div>
  );
};

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [globalSearch, setGlobalSearch] = useState('');
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { lastSaved, isSyncing } = useData();

  const allNavItems = [
    { name: 'لوحة القيادة', path: '/', icon: Home, roles: ['admin', 'sector_manager', 'auditor'] },
    { name: 'فريق الدعم والمديرين', path: '/support-team', icon: Users, roles: ['admin', 'sector_manager'] }, 
    { name: 'مسؤولي الجودة', path: '/quality-officers', icon: UserCheck, roles: ['admin', 'sector_manager'] }, 
    { name: 'قاعدة المراجعين', path: '/auditors', icon: ClipboardCheck, roles: ['admin', 'sector_manager', 'auditor'] },
    { name: 'الزيارات الميدانية', path: '/visits', icon: Calendar, roles: ['admin', 'sector_manager', 'auditor'] },
    { name: 'الأرشيف والنماذج', path: '/reports', icon: FileText, roles: ['admin', 'sector_manager', 'auditor'] },
    { name: 'مساعد الجودة الذكي', path: '/ai-assistant', icon: ShieldCheck, roles: ['admin', 'sector_manager', 'auditor'] },
    // Admin Only
    { name: 'النسخ الاحتياطي', path: '/backup', icon: Database, roles: ['admin'] },
  ];

  const navItems = allNavItems.filter(item => item.roles.includes(user?.role || ''));

  const getRoleLabel = (role?: string) => {
    switch(role) {
        case 'admin': return 'مدير النظام (Admin)';
        case 'sector_manager': return 'مسئول قطاع (Manager)';
        case 'auditor': return 'مراجع جودة (Auditor)';
        default: return 'مستخدم';
    }
  };

  const getRoleColor = (role?: string) => {
    switch(role) {
        case 'admin': return 'from-red-500 to-rose-400';
        case 'sector_manager': return 'from-blue-500 to-indigo-400';
        case 'auditor': return 'from-emerald-500 to-teal-400';
        default: return 'from-slate-500 to-gray-400';
    }
  };

  const handleGlobalSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (globalSearch.trim()) {
      navigate(`/reports?q=${encodeURIComponent(globalSearch)}`);
      setGlobalSearch('');
    }
  };

  return (
    <div className="min-h-screen bg-[#f1f5f9] flex overflow-hidden font-sans">
      {isSidebarOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setIsSidebarOpen(false)} />
      )}

      <aside className={`no-print fixed inset-y-0 right-0 z-50 w-80 bg-[#0f172a] text-slate-300 transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0 ${isSidebarOpen ? 'translate-x-0' : 'translate-x-full'} flex flex-col shadow-2xl border-l border-slate-800`}>
        <div className="flex items-center justify-between px-8 py-8 h-24 bg-slate-900/50">
          <TvetaLogo variant="dark" />
          <button onClick={() => setIsSidebarOpen(false)} className="lg:hidden text-slate-400 hover:text-white transition p-1 bg-white/5 rounded-lg">
            <X size={20} />
          </button>
        </div>
        
        <nav className="px-4 space-y-1.5 flex-1 overflow-y-auto py-6">
          <p className="px-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-4 opacity-70">القائمة الرئيسية</p>
          {navItems.map((item) => {
             const isActive = location.pathname === item.path;
             const Icon = item.icon;
             return (
              <Link key={item.path} to={item.path} onClick={() => setIsSidebarOpen(false)} className={`group flex items-center justify-between px-4 py-3.5 rounded-2xl transition-all duration-300 border border-transparent ${isActive ? 'bg-blue-600 shadow-xl shadow-blue-600/30' : 'hover:bg-slate-800/80 hover:border-slate-700/50'}`}>
                <div className="flex items-center gap-4">
                  <span className={`flex items-center justify-center w-9 h-9 rounded-xl transition-all duration-300 ${isActive ? 'bg-white/15 text-cyan-300 shadow-inner' : 'text-slate-400 bg-slate-800/50 group-hover:text-blue-400 group-hover:bg-slate-700'}`}>
                    <Icon size={18} strokeWidth={isActive ? 2.5 : 2} />
                  </span>
                  <span className={`font-bold text-sm transition-colors duration-300 ${isActive ? 'text-white' : 'text-slate-400 group-hover:text-white'}`}>
                    {item.name}
                  </span>
                </div>
                {isActive && <ChevronRight size={14} className="text-cyan-300/70" />}
              </Link>
            );
          })}
        </nav>

        {/* Sync Status - Neutral Branding (TVETA Server) */}
        <div className="px-8 py-4 mb-2 bg-slate-900/50 border-t border-slate-800/50">
           <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2 text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                {isSyncing ? (
                  <>
                    <div className="relative">
                      <Signal size={12} className="text-blue-400 animate-pulse" />
                    </div>
                    <span>جاري الاتصال بالخادم...</span>
                  </>
                ) : (
                  <>
                    <div className="relative">
                      <Signal size={12} className="text-emerald-500" />
                    </div>
                    <span>TVETA Server Online</span>
                  </>
                )}
              </div>
              <p className="text-[9px] text-slate-600">Last Sync: {lastSaved.toLocaleTimeString('ar-EG')}</p>
           </div>
        </div>

        <div className="p-4 bg-slate-900">
          <div className="bg-slate-800/30 rounded-2xl p-4 border border-slate-800/80">
            <div className="flex items-center gap-3 mb-4">
              <div className={`w-10 h-10 rounded-full bg-gradient-to-tr ${getRoleColor(user?.role)} p-[2px] shadow-lg`}>
                 <div className="w-full h-full rounded-full bg-slate-800 flex items-center justify-center">
                    <UserIcon size={18} className="text-white" />
                 </div>
              </div>
              <div className="overflow-hidden">
                <p className="font-bold text-sm text-white truncate">{user?.name}</p>
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">{getRoleLabel(user?.role)}</p>
              </div>
            </div>
            <button onClick={logout} className="w-full flex items-center justify-center gap-2 py-3 bg-rose-500/10 hover:bg-rose-500 text-rose-400 hover:text-white text-xs font-black rounded-xl transition-all border border-rose-500/20 group">
              <LogOut size={16} className="group-hover:-translate-x-1 transition-transform" />
              <span>تسجيل الخروج</span>
            </button>
          </div>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden bg-[#f1f5f9]">
        <header className="no-print bg-white/80 backdrop-blur-xl shadow-sm h-16 lg:h-20 flex items-center justify-between px-6 sticky top-0 z-40 border-b border-slate-200/60">
          <div className="flex items-center gap-4 flex-1">
            <button onClick={() => setIsSidebarOpen(true)} className="lg:hidden p-2 text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition">
              <Menu size={24} />
            </button>
            <form onSubmit={handleGlobalSearch} className="hidden md:flex relative w-full max-w-md group">
               <input type="text" value={globalSearch} onChange={(e) => setGlobalSearch(e.target.value)} placeholder="بحث في السجلات..." className="w-full bg-slate-100 border-none rounded-2xl py-2.5 pr-11 pl-4 text-sm focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all placeholder:text-slate-400" />
               <SearchIcon className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={18} />
            </form>
          </div>
          <div className="flex items-center gap-3">
            <button className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition relative">
                <Bell size={20} />
                <span className="absolute top-2 right-2 w-2 h-2 bg-rose-500 rounded-full border-2 border-white"></span>
            </button>
            <div className="w-10 h-10 lg:w-12 lg:h-12 rounded-2xl bg-gradient-to-br from-slate-100 to-slate-200 border border-slate-300/50 flex items-center justify-center text-slate-700 font-black text-lg shadow-sm">
               {user?.name.charAt(0)}
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 md:p-8 lg:p-10 scroll-smooth">
           <div className="max-w-7xl mx-auto fade-in pb-12">
              {/* PRINT HEADER: Only Visible when printing */}
              <div className="hidden print:flex flex-col mb-8 border-b-2 border-slate-800 pb-6">
                 <div className="flex justify-between items-center">
                    <TvetaLogo variant="light" size="lg" />
                    <div className="text-left">
                       <h2 className="text-xl font-bold text-slate-800">تقرير نظام الجودة</h2>
                       <p className="text-sm text-slate-500 mt-1">Quality Assurance Management System</p>
                    </div>
                 </div>
                 <div className="mt-4 flex justify-between text-xs text-slate-500 font-medium">
                    <span>تاريخ الطباعة: {new Date().toLocaleDateString('ar-EG')}</span>
                    <span>المستخدم: {user?.name}</span>
                 </div>
              </div>
              
              {children}
           </div>
        </main>
      </div>
    </div>
  );
};

export default Layout;
