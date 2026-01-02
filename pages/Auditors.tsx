
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Auditor } from '../types';
import { Plus, Search, Trash2, Edit, Star, Share2, UserCheck, Briefcase, ChevronDown, FileSpreadsheet } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { EGYPT_GOVERNORATES } from '../constants';
import { useDebounce } from '../hooks/useDebounce';
import { parseCSV } from '../services/backupService';

// AuditorRow Component (kept simple)
const AuditorRow: React.FC<any> = React.memo(({ auditor, canManage, onEdit, onDelete, onRatingChange, onShare }) => {
  return (
    <tr className="hover:bg-slate-50 transition-colors">
      <td className="p-4 font-bold text-slate-800">{auditor.name}</td>
      <td className="p-4 text-slate-600"><span className="bg-slate-100 px-2 py-1 rounded text-xs">{auditor.governorate}</span></td>
      <td className="p-4 text-slate-600">{auditor.specialization}</td>
      <td className="p-4 font-mono text-slate-500 text-sm" dir="ltr">{auditor.phone}</td>
      <td className="p-4 text-yellow-500 font-bold flex gap-1">{auditor.rating} <Star size={14} className="fill-current" /></td>
      <td className="p-4 text-center">
          <div className="flex justify-center gap-2">
            <button onClick={() => onShare(auditor)} className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg"><Share2 size={18} /></button>
            {canManage && (<><button onClick={() => onEdit(auditor)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg"><Edit size={18} /></button><button onClick={() => onDelete(auditor.id)} className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg"><Trash2 size={18} /></button></>)}
          </div>
      </td>
    </tr>
  );
});

const ITEMS_PER_PAGE = 15;

const Auditors: React.FC = () => {
  const { user, hasPermission } = useAuth();
  const canCreate = hasPermission('create', 'auditors');
  const { auditors, actions } = useData();
  
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearchTerm = useDebounce(searchTerm, 300);
  const [showForm, setShowForm] = useState(false);
  const [newAuditor, setNewAuditor] = useState<Partial<Auditor>>({});
  const [visibleCount, setVisibleCount] = useState(ITEMS_PER_PAGE);

  // --- Strict Scope Filtering ---
  const filteredAuditors = useMemo(() => {
    let result = auditors;
    if (user?.role === 'admin') {
        // Admin sees all
    } else if (user?.role === 'sector_manager' && user.governorates) {
        result = auditors.filter(a => user.governorates!.includes(a.governorate));
    } else if (user?.role === 'auditor') {
        // Auditors can see colleagues in same governorate
        const userGov = user.governorate || (user.governorates && user.governorates[0]);
        if (userGov) result = auditors.filter(a => a.governorate === userGov);
    }
    
    return result.filter(a => a.name.toLowerCase().includes(debouncedSearchTerm.toLowerCase()));
  }, [auditors, user, debouncedSearchTerm]);

  const displayList = useMemo(() => filteredAuditors.slice(0, visibleCount), [filteredAuditors, visibleCount]);
  const handleSave = async () => { /* ... existing save logic ... */ 
      if (newAuditor.name && newAuditor.governorate) {
          const a: Auditor = { id: newAuditor.id || Date.now().toString(), name: newAuditor.name!, governorate: newAuditor.governorate!, specialization: newAuditor.specialization || 'عام', status: 'Active', phone: newAuditor.phone || '', rating: 5 };
          await actions.saveAuditor(a); setShowForm(false); setNewAuditor({});
      }
  };
  const handleDelete = async (id: string) => { if(confirm('حذف؟')) await actions.deleteAuditor(id); };

  // Allowed Governorates for Form
  const allowedGovs = useMemo(() => {
     if(user?.role === 'admin') return EGYPT_GOVERNORATES;
     if(user?.role === 'sector_manager') return user.governorates || [];
     return [];
  }, [user]);

  return (
    <div className="space-y-8 pb-10">
      <div className="flex justify-between items-center gap-4">
        <div><h2 className="text-2xl font-bold text-slate-800">قاعدة بيانات المراجعين</h2><p className="text-slate-500">نطاق {user?.role === 'admin' ? 'الكل' : user?.governorates?.join('، ')}</p></div>
        {canCreate && <button onClick={() => { setNewAuditor({}); setShowForm(true); }} className="bg-blue-600 text-white px-5 py-2.5 rounded-xl flex items-center gap-2 font-medium"><Plus size={18} /> إضافة مراجع</button>}
      </div>

      {showForm && canCreate && (
        <div className="bg-white p-6 rounded-2xl shadow-lg border border-blue-100 fade-in">
          <h3 className="text-lg font-bold mb-4">بيانات المراجع</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <input className="p-3 bg-slate-50 rounded-xl" placeholder="الاسم" value={newAuditor.name || ''} onChange={e => setNewAuditor({...newAuditor, name: e.target.value})} />
            <select className="p-3 bg-slate-50 rounded-xl" value={newAuditor.governorate || ''} onChange={e => setNewAuditor({...newAuditor, governorate: e.target.value})}>
                <option value="">المحافظة</option>
                {allowedGovs.map(g => <option key={g} value={g}>{g}</option>)}
            </select>
            <input className="p-3 bg-slate-50 rounded-xl" placeholder="التخصص" value={newAuditor.specialization || ''} onChange={e => setNewAuditor({...newAuditor, specialization: e.target.value})} />
            <input className="p-3 bg-slate-50 rounded-xl" placeholder="الهاتف" value={newAuditor.phone || ''} onChange={e => setNewAuditor({...newAuditor, phone: e.target.value})} />
          </div>
          <div className="flex gap-2 justify-end mt-4"><button onClick={() => setShowForm(false)} className="px-4 py-2 bg-slate-100 rounded-lg">إلغاء</button><button onClick={handleSave} className="px-4 py-2 bg-blue-600 text-white rounded-lg">حفظ</button></div>
        </div>
      )}

      <div className="bg-white rounded-2xl shadow-soft border border-slate-200 overflow-hidden">
        <table className="w-full text-right">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase text-sm"><tr><th className="p-4">الاسم</th><th className="p-4">المحافظة</th><th className="p-4">التخصص</th><th className="p-4">الهاتف</th><th className="p-4">التقييم</th><th className="p-4 text-center">إجراءات</th></tr></thead>
            <tbody className="divide-y divide-slate-100">
              {displayList.map((a) => <AuditorRow key={a.id} auditor={a} canManage={canCreate} onEdit={() => {setNewAuditor(a); setShowForm(true);}} onDelete={handleDelete} onRatingChange={()=>{}} onShare={()=>{}} />)}
            </tbody>
        </table>
      </div>
      {filteredAuditors.length > visibleCount && <button onClick={() => setVisibleCount(p => p + ITEMS_PER_PAGE)} className="w-full py-3 bg-white border border-slate-200 text-blue-600 font-bold rounded-2xl">عرض المزيد</button>}
    </div>
  );
};

export default Auditors;
