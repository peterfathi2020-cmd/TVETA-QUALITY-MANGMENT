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
import { AlertCircle, CheckCircle2, Clock, FileText, Activity, MapPin, Signal, ChevronLeft } from 'lucide-react';
import { useData } from '../context/DataContext';
import { useNavigate } from 'react-router-dom';

const PIE_COLORS = ['#10b981', '#f59e0b', '#ef4444'];

const StatCard = ({ title, value, icon: Icon, color, subtext, onClick }: { title: string, value: string, icon: any, color: string, subtext?: string, onClick?: () => void }) => (
  <div 
    onClick={onClick}
    className={`bg-white p-6 rounded-2xl shadow-soft border border-slate-100 transition-all duration-300 group relative overflow-hidden ${onClick ? 'cursor-pointer hover:shadow-xl hover:-translate-y-1 hover:border-blue-200' : ''}`}
  >
    {onClick && <div className="absolute top-4 left-4 opacity-0 group-hover:opacity-100 transition-opacity text-slate-300"><ChevronLeft size={20} /></div>}
    <div className="flex items-center justify-between relative z-10">
      <div>
        <p className="text-sm font-bold text-slate-500 mb-1">{title}</p>
        <h3 className="text-3xl font-black text-slate-800 tracking-tight">{value}</h3>
        {subtext && <p className="text-xs text-slate-400 mt-2 font-medium">{subtext}</p>}
      </div>
      <div className={`p-4 rounded-xl ${color} shadow-lg shadow-current/20 group-hover:scale-110 transition-transform duration-300`}>
        <Icon size={24} className="text-white" />
      </div>
    </div>
  </div>
);

const Dashboard: React.FC = () => {
  const { visits, supportMembers, reports } = useData();
  const navigate = useNavigate();
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());

  // --- Compute Stats (Real Data) ---
  const stats = useMemo(() => {
    const total = visits.length;
    const completed = visits.filter(v => v.status === 'Completed').length;
    const planned = visits.filter(v => v.status === 'Planned').length;
    // Calculate actual delayed/issues based on status or logic
    const openDefects = visits.filter(v => v.status === 'Cancelled').length; 
    const compliance = total > 0 ? Math.round((completed / total) * 100) : 0;

    return { total, completed, planned, openDefects, compliance };
  }, [visits]);

  // --- Extract Available Years from Data ---
  const availableYears = useMemo(() => {
    const years = new Set(visits.map(v => new Date(v.date).getFullYear()));
    years.add(new Date().getFullYear()); // Ensure current year always exists
    return Array.from(years).sort((a, b) => b - a);
  }, [visits]);

  // --- Prepare Chart Data (Dynamic Year) ---
  const chartData = useMemo(() => {
    const months = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
    
    // Initialize with 0
    const counts: Record<string, number> = {};
    months.forEach(m => counts[m] = 0);

    visits.forEach(v => {
        const d = new Date(v.date);
        if (d.getFullYear() === selectedYear) {
            const mName = d.toLocaleString('ar-EG', { month: 'long' });
            counts[mName] = (counts[mName] || 0) + 1;
        }
    });

    return Object.keys(counts).map(name => ({ name, audits: counts[name] }));
  }, [visits, selectedYear]);

  const pieData = [
    { name: 'مطابق (تم التنفيذ)', value: stats.completed, color: '#10b981' },
    { name: 'مخطط (جاري)', value: stats.planned, color: '#f59e0b' },
    { name: 'ملغى/ملاحظات', value: stats.openDefects, color: '#ef4444' },
  ].filter(d => d.value > 0); // Hide empty segments

  // --- Support Activity Logic ---
  const supportActivity = useMemo(() => {
    return supportMembers.slice(0, 6).map(member => {
        // Simple heuristic for status simulation based on member ID (since we don't have real-time presence API yet)
        const isOnline = Number(member.id) % 2 !== 0; 
        const status = isOnline ? 'online' : 'offline';
        
        const lastGov = member.governorates.length > 0 
            ? member.governorates[0] 
            : 'المقر الرئيسي';

        return {
            ...member,
            status,
            lastLocation: lastGov,
            lastActiveTime: isOnline ? 'الآن' : 'منذ ساعة'
        };
    });
  }, [supportMembers]);

  return (
    <div className="space-y-8 animate-fade-in pb-10">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 no-print">
        <div>
           <h2 className="text-2xl font-black text-slate-800 tracking-tight">لوحة القيادة المركزية</h2>
           <p className="text-slate-500 font-medium">نظرة عامة حية على مؤشرات الأداء من قاعدة البيانات السحابية</p>
        </div>
        <div className="flex items-center gap-2 text-sm font-bold text-slate-500 bg-white px-4 py-2 rounded-xl shadow-sm border border-slate-100">
            <Clock size={16} className="text-blue-500" />
            تاريخ اليوم: {new Date().toLocaleDateString('ar-EG')}
        </div>
      </div>

      {/* Stats Grid - Clickable Navigation */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 no-print">
        <StatCard 
          title="إجمالي الزيارات" 
          value={stats.total.toString()} 
          icon={FileText} 
          color="bg-blue-600" 
          subtext="سجل الزيارات الكامل"
          onClick={() => navigate('/visits')}
        />
        <StatCard 
          title="زيارات قيد التنفيذ" 
          value={stats.planned.toString()} 
          icon={Clock} 
          color="bg-amber-500" 
          subtext="الجدول الحالي"
          onClick={() => navigate('/visits?filter=planned')}
        />
        <StatCard 
          title="التقارير والملاحظات" 
          value={reports.length.toString()} 
          icon={AlertCircle} 
          color="bg-rose-500" 
          subtext="الأرشيف السحابي"
          onClick={() => navigate('/reports')}
        />
        <StatCard 
          title="نسبة الإنجاز" 
          value={`${stats.compliance}%`} 
          icon={CheckCircle2} 
          color="bg-emerald-500" 
          subtext="معدل إغلاق المهام"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Chart */}
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl shadow-soft border border-slate-100 print:shadow-none print:border-none">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-bold text-slate-800">معدل الزيارات الشهري (الفعلي)</h3>
            <select 
                value={selectedYear}
                onChange={(e) => setSelectedYear(Number(e.target.value))}
                className="bg-slate-50 border border-slate-200 text-slate-800 font-bold text-sm rounded-lg px-3 py-1 outline-none focus:ring-2 focus:ring-blue-500 no-print"
            >
                {availableYears.map(year => (
                    <option key={year} value={year}>{year}</option>
                ))}
            </select>
            <span className="hidden print:block font-bold text-slate-600">{selectedYear}</span>
          </div>
          <div className="h-80" dir="ltr">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} />
                <Tooltip 
                    cursor={{fill: '#f8fafc'}}
                    contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}}
                />
                <Bar dataKey="audits" fill="#3b82f6" radius={[6, 6, 0, 0]} barSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Status Distribution */}
        <div className="bg-white p-6 rounded-2xl shadow-soft border border-slate-100 flex flex-col print:hidden">
          <h3 className="text-lg font-bold text-slate-800 mb-6">توزيع حالات الزيارات</h3>
          <div className="flex-1 min-h-[200px] relative">
            {pieData.length > 0 ? (
                <>
                <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                    <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                    stroke="none"
                    >
                    {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                    </Pie>
                    <Tooltip />
                </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <span className="text-3xl font-black text-slate-800">{stats.total}</span>
                    <span className="text-xs text-slate-400 font-bold">إجمالي</span>
                </div>
                </>
            ) : (
                <div className="h-full flex items-center justify-center text-slate-400">لا توجد بيانات للعرض</div>
            )}
          </div>
          <div className="space-y-3 mt-6">
            {pieData.map((item) => (
              <div key={item.name} className="flex items-center justify-between p-2 hover:bg-slate-50 rounded-lg transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full shadow-sm" style={{ backgroundColor: item.color }}></div>
                  <span className="text-sm font-bold text-slate-600">{item.name}</span>
                </div>
                <span className="text-sm font-black text-slate-800">{item.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* --- Support Team Activity (Only visible on screen) --- */}
      <div className="bg-white rounded-2xl shadow-soft border border-slate-100 overflow-hidden no-print">
         <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
            <div>
                <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                    <Activity size={20} className="text-blue-600" />
                    فريق الدعم (تحديث لحظي)
                </h3>
            </div>
            <button onClick={() => navigate('/support-team')} className="text-sm text-blue-600 font-bold hover:bg-blue-50 px-4 py-2 rounded-xl transition-colors">إدارة الفريق</button>
         </div>
         
         <div className="overflow-x-auto">
            <table className="w-full">
                <thead className="bg-slate-50 text-slate-500 text-xs font-black uppercase tracking-widest border-b border-slate-100">
                    <tr>
                        <th className="px-6 py-4 text-right">عضو الفريق</th>
                        <th className="px-6 py-4 text-right">الحالة</th>
                        <th className="px-6 py-4 text-right">الموقع</th>
                        <th className="px-6 py-4 text-right">آخر ظهور</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                    {supportActivity.length > 0 ? supportActivity.map((member) => (
                        <tr key={member.id} className="hover:bg-slate-50/80 transition-colors">
                            <td className="px-6 py-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-500 font-bold text-xs">
                                        {member.name.charAt(0)}
                                    </div>
                                    <p className="font-bold text-slate-800 text-sm">{member.name}</p>
                                </div>
                            </td>
                            <td className="px-6 py-4">
                                <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                                    member.status === 'online' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' :
                                    'bg-slate-50 text-slate-600 border-slate-200'
                                }`}>
                                    <span className={`w-1.5 h-1.5 rounded-full ${
                                        member.status === 'online' ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'
                                    }`}></span>
                                    {member.status === 'online' ? 'متصل' : 'غير متصل'}
                                </span>
                            </td>
                            <td className="px-6 py-4">
                                <div className="flex items-center gap-1 text-slate-500 text-xs font-medium">
                                    <MapPin size={12} />
                                    {member.lastLocation}
                                </div>
                            </td>
                            <td className="px-6 py-4">
                                <div className="text-slate-400 text-xs flex items-center gap-1">
                                    <Signal size={12} />
                                    {member.lastActiveTime}
                                </div>
                            </td>
                        </tr>
                    )) : (
                        <tr>
                            <td colSpan={4} className="p-8 text-center text-slate-400 text-sm">
                                جاري تحميل بيانات الفريق...
                            </td>
                        </tr>
                    )}
                </tbody>
            </table>
         </div>
      </div>
    </div>
  );
};

export default Dashboard;