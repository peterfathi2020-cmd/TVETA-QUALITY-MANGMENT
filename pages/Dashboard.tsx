
import React, { useMemo, useState } from 'react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { FolderOpen, CheckCircle2, Clock, FileText, Activity, MapPin, ChevronLeft, UserCircle, TrendingUp, Calendar, Zap, Users, ShieldCheck } from 'lucide-react';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

const StatCard = ({ title, value, icon: Icon, colorClass, subtext, onClick }: { title: string, value: string, icon: any, colorClass: string, subtext?: string, onClick?: () => void }) => (
  <div 
    onClick={onClick}
    className={`bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-soft border border-slate-100 dark:border-slate-800 transition-all duration-300 group relative overflow-hidden ${onClick ? 'cursor-pointer hover:shadow-xl hover:-translate-y-1 hover:border-blue-200 dark:hover:border-blue-700' : ''}`}
  >
    {onClick && <div className="absolute top-4 left-4 opacity-0 group-hover:opacity-100 transition-opacity text-slate-300 dark:text-slate-600"><ChevronLeft size={20} /></div>}
    <div className="flex items-center justify-between relative z-10">
      <div>
        <p className="text-sm font-bold text-slate-500 dark:text-slate-400 mb-1">{title}</p>
        <h3 className="text-3xl font-black text-slate-800 dark:text-white tracking-tight">{value}</h3>
        {subtext && <p className="text-xs text-slate-400 dark:text-slate-500 mt-2 font-medium">{subtext}</p>}
      </div>
      <div className={`p-4 rounded-xl ${colorClass} shadow-lg shadow-current/20 group-hover:scale-110 transition-transform duration-300`}>
        <Icon size={24} className="text-white" />
      </div>
    </div>
  </div>
);

const SupportTeamActivity = ({ members, onManage }: { members: any[], onManage: () => void }) => (
  <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-soft border border-slate-100 dark:border-slate-800 overflow-hidden no-print">
     <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/50">
        <div>
            <h3 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2">
                <Activity size={20} className="text-blue-600 dark:text-blue-400" />
                نشاط فريق الجودة
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">متابعة حية لحالة الأعضاء والزيارات الأخيرة</p>
        </div>
        <button onClick={onManage} className="text-sm text-blue-600 dark:text-blue-400 font-bold hover:bg-blue-50 dark:hover:bg-blue-900/20 px-4 py-2 rounded-xl transition-colors">عرض الفريق</button>
     </div>
     
     <div className="overflow-x-auto">
        <table className="w-full">
            <thead className="bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 text-xs font-black uppercase tracking-widest border-b border-slate-100 dark:border-slate-700">
                <tr>
                    <th className="px-6 py-4 text-right">عضو الفريق</th>
                    <th className="px-6 py-4 text-right">الدور</th>
                    <th className="px-6 py-4 text-right">الحالة</th>
                    <th className="px-6 py-4 text-right">آخر موقع (محافظة)</th>
                    <th className="px-6 py-4 text-right">التوقيت</th>
                </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                {members.length > 0 ? members.map((member) => (
                    <tr key={member.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors">
                        <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 dark:text-slate-400 font-bold border border-slate-200 dark:border-slate-700">
                                    <UserCircle size={24} />
                                </div>
                                <div>
                                   <p className="font-bold text-slate-800 dark:text-slate-200 text-sm">{member.name}</p>
                                   <p className="text-[10px] text-slate-500 dark:text-slate-400">{member.sector || member.specialization || 'عام'}</p>
                                </div>
                            </div>
                        </td>
                         <td className="px-6 py-4">
                            <span className={`text-[10px] px-2 py-1 rounded-lg font-bold ${member.roleType === 'دعم فني' ? 'bg-indigo-50 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-300' : 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-300'}`}>
                                {member.roleType}
                            </span>
                        </td>
                        <td className="px-6 py-4">
                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold border ${
                                member.status === 'online' ? 'bg-emerald-50 text-emerald-700 border-emerald-100 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800' :
                                'bg-slate-50 text-slate-500 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700'
                            }`}>
                                <span className={`w-1.5 h-1.5 rounded-full ${
                                    member.status === 'online' ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'
                                }`}></span>
                                {member.status === 'online' ? 'متصل' : 'غير متصل'}
                            </span>
                        </td>
                        <td className="px-6 py-4">
                            <div className="flex items-center gap-1 text-slate-500 dark:text-slate-400 text-xs font-medium bg-slate-50 dark:bg-slate-800 px-2 py-1 rounded-lg w-fit border border-slate-100 dark:border-slate-700">
                                <MapPin size={12} className="text-blue-500" />
                                {member.lastLocation}
                            </div>
                        </td>
                        <td className="px-6 py-4">
                            <div className="text-slate-400 dark:text-slate-500 text-xs flex items-center gap-1 font-mono">
                                <Clock size={12} />
                                {member.lastActiveTime}
                            </div>
                        </td>
                    </tr>
                )) : (
                    <tr>
                        <td colSpan={5} className="p-8 text-center text-slate-400 dark:text-slate-500 text-sm">
                            لا يوجد أعضاء نشطين في نطاقك حالياً.
                        </td>
                    </tr>
                )}
            </tbody>
        </table>
     </div>
  </div>
);

const Dashboard: React.FC = () => {
  const { visits, supportMembers, officers, reports, auditors } = useData();
  const { user, systemUsers } = useAuth();
  const navigate = useNavigate();
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());

  // --- Filtering Logic based on User Role ---
  const { scopedVisits, scopedReports, scopedStaff } = useMemo(() => {
    let v = visits;
    let r = reports;
    let s: any[] = [...supportMembers, ...officers]; // Combine lists for activity view

    if (user?.role === 'admin') {
        // Admin sees all
    } else if (user?.role === 'sector_manager' && user.governorates) {
        // Manager sees data in their governorates
        v = visits.filter(visit => user.governorates!.includes(visit.governorate));
        r = reports.filter(rep => user.governorates!.includes(rep.governorate));
        
        // Filter staff
        s = s.filter(member => {
            if ((member as any).sector === user.sector) return true;
            if ((member as any).governorate && user.governorates!.includes((member as any).governorate)) return true;
            return false;
        });

    } else if (user?.role === 'auditor') {
        // Auditor sees their own governorate data
        const userGov = user.governorate || (user.governorates && user.governorates[0]);
        if (userGov) {
            v = visits.filter(visit => visit.governorate === userGov);
            r = reports.filter(rep => rep.governorate === userGov);
            s = s.filter(member => (member as any).governorate === userGov || (member as any).governorates?.includes(userGov));
        }
    }
    return { scopedVisits: v, scopedReports: r, scopedStaff: s };
  }, [visits, reports, supportMembers, officers, user]);


  // --- Compute Stats (Quality Management KPIs) ---
  const stats = useMemo(() => {
    const total = scopedVisits.length;
    const completed = scopedVisits.filter(v => v.status === 'Completed').length;
    // Updated: Planned now includes In Progress for statistical overview
    const planned = scopedVisits.filter(v => v.status === 'Planned' || v.status === 'In Progress').length;
    const cancelled = scopedVisits.filter(v => v.status === 'Cancelled').length; 
    
    const compliance = total > 0 ? Math.round((completed / total) * 100) : 0;

    // Quality Color Logic
    let complianceColor = 'bg-blue-600';
    if (total > 0) {
        if (compliance >= 80) complianceColor = 'bg-emerald-500'; // Excellent
        else if (compliance >= 50) complianceColor = 'bg-amber-500'; // Warning
        else complianceColor = 'bg-rose-500'; // Critical
    }

    return { total, completed, planned, cancelled, compliance, complianceColor };
  }, [scopedVisits]);

  // --- Extract Available Years ---
  const availableYears = useMemo(() => {
    const years = new Set<number>(scopedVisits.map(v => new Date(v.date).getFullYear()));
    years.add(new Date().getFullYear());
    return Array.from(years).sort((a, b) => b - a);
  }, [scopedVisits]);

  // --- Prepare Chart Data ---
  const chartData = useMemo(() => {
    const months = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
    const counts: Record<string, number> = {};
    months.forEach(m => counts[m] = 0);

    scopedVisits.forEach(v => {
        const d = new Date(v.date);
        if (d.getFullYear() === selectedYear) {
            const mName = d.toLocaleString('ar-EG', { month: 'long' });
            counts[mName] = (counts[mName] || 0) + 1;
        }
    });

    return Object.keys(counts).map(name => ({ name, audits: counts[name] }));
  }, [scopedVisits, selectedYear]);

  const pieData = [
    { name: 'تم التنفيذ', value: stats.completed, color: '#10b981' },
    { name: 'جاري / مخطط', value: stats.planned, color: '#f59e0b' },
    { name: 'ملغى', value: stats.cancelled, color: '#ef4444' },
  ].filter(d => d.value > 0);

  // --- Activity Logic (Real-time Online Status) ---
  const activityList = useMemo(() => {
    // 1. Create a Lookup Map for Auditors -> Last Visit (O(N) complexity)
    // Map key: auditorId, value: Visit object (latest one)
    const latestVisitsMap = new Map<string, any>();
    
    // Helper to get name from ID if needed
    const getAuditorIdByName = (name: string) => auditors.find(a => a.name === name)?.id;

    visits.forEach(v => {
        const existing = latestVisitsMap.get(v.auditorId);
        if (!existing || new Date(v.date) > new Date(existing.date)) {
            latestVisitsMap.set(v.auditorId, v);
        }
    });

    // 2. Map scoped staff to status using System Users (from Firestore via AuthContext)
    const now = Date.now();
    const FIVE_MINUTES = 5 * 60 * 1000;

    return scopedStaff.slice(0, 10).map(member => {
        // Find matching system user by name or phone (since ID might not match strictly between collections)
        // Ideally ID matches, but we fallback to name for older data
        const sysUser = systemUsers.find(u => u.name === member.name || u.phone === member.phone);
        
        // Status Logic: Check lastSeen timestamp from system user
        let isOnline = false;
        let lastSeenText = 'غير متاح';

        if (sysUser && sysUser.lastSeen) {
            const lastSeenTime = typeof sysUser.lastSeen === 'number' ? sysUser.lastSeen : sysUser.lastSeen?.toMillis?.() || 0;
            if ((now - lastSeenTime) < FIVE_MINUTES) {
                isOnline = true;
            } else {
                // If offline, show when they were last seen
                lastSeenText = new Date(lastSeenTime).toLocaleTimeString('ar-EG', {hour: '2-digit', minute:'2-digit'});
            }
        } else {
            // Fallback to Visit Logic if no system user found (legacy behavior)
            // Try finding by explicit ID match or Name match
            let lastVisit = latestVisitsMap.get(String(member.id));
            if (!lastVisit) {
                 const foundId = getAuditorIdByName(member.name);
                 if (foundId) lastVisit = latestVisitsMap.get(foundId);
            }
            if (lastVisit) {
                 const today = new Date().toISOString().split('T')[0];
                 if (lastVisit.date === today && lastVisit.status !== 'Cancelled') isOnline = true;
                 lastSeenText = lastVisit.date;
            }
        }

        const status = isOnline ? 'online' : 'offline';
        const displayTime = isOnline ? 'نشط الآن' : (sysUser ? `آخر ظهور ${lastSeenText}` : lastSeenText);
        
        // Location Logic: Visit Location > Assigned Gov > First Sector Gov
        let lastGov = (member as any).governorate;
        if (!lastGov && (member as any).governorates?.length) {
            lastGov = (member as any).governorates[0];
        }

        return {
            ...member,
            status,
            lastLocation: lastGov || 'المقر المركزي',
            lastActiveTime: displayTime,
            roleType: (member as any).sector ? 'دعم فني' : 'مسؤول جودة'
        };
    });
  }, [scopedStaff, visits, auditors, systemUsers]);

  return (
    <div className="space-y-8 animate-fade-in pb-10">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 no-print">
        <div>
           <h2 className="text-2xl font-black text-slate-800 dark:text-white tracking-tight">
             {user?.role === 'admin' ? 'لوحة القيادة المركزية' : user?.role === 'sector_manager' ? `لوحة قيادة قطاع ${user.sector || ''}` : `لوحة قيادة محافظة ${user.governorate || ''}`}
           </h2>
           <p className="text-slate-500 dark:text-slate-400 font-medium">مؤشرات الأداء للنطاق الجغرافي المصرح به</p>
        </div>
        <div className="flex items-center gap-2 text-sm font-bold text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-800 px-4 py-2 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700">
            <Clock size={16} className="text-blue-500" />
            تاريخ اليوم: {new Date().toLocaleDateString('ar-EG')}
        </div>
      </div>

      {/* QUICK ACTIONS BAR (NEW) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-2 no-print">
          <button onClick={() => navigate('/visits')} className="flex flex-col items-center justify-center p-4 bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 hover:border-blue-500 hover:shadow-md transition-all group">
              <div className="p-3 bg-blue-50 text-blue-600 rounded-xl group-hover:bg-blue-600 group-hover:text-white transition-colors mb-2">
                  <Calendar size={24} />
              </div>
              <span className="font-bold text-sm text-slate-700 dark:text-slate-300">جدولة زيارة</span>
          </button>
          <button onClick={() => navigate('/reports?action=upload')} className="flex flex-col items-center justify-center p-4 bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 hover:border-indigo-500 hover:shadow-md transition-all group">
              <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl group-hover:bg-indigo-600 group-hover:text-white transition-colors mb-2">
                  <FolderOpen size={24} />
              </div>
              <span className="font-bold text-sm text-slate-700 dark:text-slate-300">إدراج ملف</span>
          </button>
          {user?.role === 'admin' && (
            <button onClick={() => navigate('/support-team')} className="flex flex-col items-center justify-center p-4 bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 hover:border-emerald-500 hover:shadow-md transition-all group">
                <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl group-hover:bg-emerald-600 group-hover:text-white transition-colors mb-2">
                    <Users size={24} />
                </div>
                <span className="font-bold text-sm text-slate-700 dark:text-slate-300">إدارة الفريق</span>
            </button>
          )}
           <button onClick={() => navigate('/ai-assistant')} className="flex flex-col items-center justify-center p-4 bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 hover:border-amber-500 hover:shadow-md transition-all group">
              <div className="p-3 bg-amber-50 text-amber-600 rounded-xl group-hover:bg-amber-600 group-hover:text-white transition-colors mb-2">
                  <Zap size={24} />
              </div>
              <span className="font-bold text-sm text-slate-700 dark:text-slate-300">مساعد الجودة</span>
          </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 no-print">
        <StatCard 
          title="إجمالي الزيارات" 
          value={stats.total.toString()} 
          icon={FileText} 
          colorClass="bg-blue-600" 
          subtext="إجمالي المهام المسجلة"
          onClick={() => navigate('/visits')}
        />
        <StatCard 
          title="التقارير والأرشيف" 
          value={scopedReports.length.toString()} 
          icon={FolderOpen} 
          colorClass="bg-indigo-500" 
          subtext="المستندات والنماذج الذكية"
          onClick={() => navigate('/reports')}
        />
        <StatCard 
          title="زيارات جارية" 
          value={stats.planned.toString()} 
          icon={Clock} 
          colorClass="bg-amber-500" 
          subtext="جدول الأعمال الحالي"
          onClick={() => navigate('/visits?filter=planned')}
        />
        <StatCard 
          title="نسبة الإنجاز" 
          value={`${stats.compliance}%`} 
          icon={stats.compliance >= 80 ? CheckCircle2 : TrendingUp} 
          colorClass={stats.complianceColor} 
          subtext={stats.compliance >= 80 ? 'أداء ممتاز' : stats.compliance >= 50 ? 'أداء متوسط' : 'يحتاج تحسين'}
          onClick={() => navigate('/visits?filter=completed')}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-soft border border-slate-100 dark:border-slate-800 print:shadow-none print:border-none">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-bold text-slate-800 dark:text-white">معدل الزيارات (الفعلي)</h3>
            <select 
                value={selectedYear}
                onChange={(e) => setSelectedYear(Number(e.target.value))}
                className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 font-bold text-sm rounded-lg px-3 py-1 outline-none focus:ring-2 focus:ring-blue-500 no-print"
            >
                {availableYears.map(year => (
                    <option key={year} value={year}>{year}</option>
                ))}
            </select>
          </div>
          <div className="h-80" dir="ltr">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#33415540" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} />
                <Tooltip 
                  cursor={{fill: '#33415510'}} 
                  contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', backgroundColor: '#fff'}} 
                />
                <Bar dataKey="audits" fill="#3b82f6" radius={[6, 6, 0, 0]} barSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-soft border border-slate-100 dark:border-slate-800 flex flex-col print:hidden">
          <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-6">توزيع الحالات</h3>
          <div className="flex-1 min-h-[200px] relative">
            {pieData.length > 0 ? (
                <>
                <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                    <Pie data={pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value" stroke="none">
                    {pieData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                    </Pie>
                    <Tooltip />
                </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <span className="text-3xl font-black text-slate-800 dark:text-white">{stats.total}</span>
                    <span className="text-xs text-slate-400 dark:text-slate-500 font-bold">إجمالي</span>
                </div>
                </>
            ) : (
                <div className="h-full flex items-center justify-center text-slate-400">لا توجد بيانات</div>
            )}
          </div>
          <div className="space-y-3 mt-6">
            {pieData.map((item) => (
              <div key={item.name} className="flex items-center justify-between p-2 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full shadow-sm" style={{ backgroundColor: item.color }}></div>
                  <span className="text-sm font-bold text-slate-600 dark:text-slate-300">{item.name}</span>
                </div>
                <span className="text-sm font-black text-slate-800 dark:text-white">{item.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <SupportTeamActivity members={activityList} onManage={() => user?.role === 'auditor' ? navigate('/quality-officers') : navigate('/support-team')} />
    </div>
  );
};

export default Dashboard;
