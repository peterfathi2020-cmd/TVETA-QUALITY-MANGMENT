
import React, { useState, useEffect, useMemo } from 'react';
import { Auditor } from '../types';
import { Plus, Search, Trash2, Edit, Star, Download, Filter, Upload, Share2, Shield, Map, Lock, UserCheck, Briefcase, ChevronDown } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { EGYPT_GOVERNORATES } from '../constants';
import { useDebounce } from '../hooks/useDebounce';

interface AuditorRowProps {
  auditor: Auditor;
  canManage: boolean;
  onEdit: (auditor: Auditor) => void;
  onDelete: (id: string) => void;
  onRatingChange: (id: string, newRating: number) => void;
  onShare: (auditor: Auditor) => void;
}

const AuditorRow: React.FC<AuditorRowProps> = React.memo(({ auditor, canManage, onEdit, onDelete, onRatingChange, onShare }) => {
  const [ratingInput, setRatingInput] = useState(auditor.rating.toString());

  useEffect(() => {
    setRatingInput(auditor.rating.toString());
  }, [auditor.rating]);

  const handleBlur = () => {
    let val = parseFloat(ratingInput);
    if (isNaN(val)) val = 0;
    val = Math.min(Math.max(val, 0), 5);
    val = Math.round(val * 10) / 10;
    setRatingInput(val.toString());
    if (val !== auditor.rating) {
      onRatingChange(auditor.id, val);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      (e.target as HTMLInputElement).blur();
    }
  };

  return (
    <tr className="hover:bg-slate-50 transition-colors">
      <td className="p-4 font-bold text-slate-800">{auditor.name}</td>
      <td className="p-4 text-slate-600">
        <span className="bg-slate-100 px-2 py-1 rounded text-xs">{auditor.governorate}</span>
      </td>
      <td className="p-4 text-slate-600">{auditor.specialization}</td>
      <td className="p-4 font-mono text-slate-500 text-sm" dir="ltr">{auditor.phone}</td>
      <td className="p-4">
        <div className={`flex items-center gap-1 bg-yellow-50 w-fit px-2 py-1 rounded-lg text-yellow-700 transition-all ${canManage ? 'focus-within:ring-2 focus-within:ring-yellow-400 focus-within:bg-white' : ''}`}>
          <input
            type="number" min="0" max="5" step="0.1" disabled={!canManage}
            value={ratingInput} onChange={(e) => setRatingInput(e.target.value)}
            onBlur={handleBlur} onKeyDown={handleKeyDown}
            className={`w-12 bg-transparent outline-none font-bold text-sm text-yellow-700 text-center ${!canManage ? 'cursor-default' : 'cursor-text'}`}
          />
          <Star size={14} className="fill-yellow-500 text-yellow-500" />
        </div>
      </td>
      <td className="p-4">
        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${auditor.status === 'Active' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
          <span className={`w-1.5 h-1.5 rounded-full ml-1.5 ${auditor.status === 'Active' ? 'bg-green-600' : 'bg-red-600'}`}></span>
          {auditor.status === 'Active' ? 'نشط' : 'غير نشط'}
        </span>
      </td>
      <td className="p-4">
          <div className="flex justify-center gap-2">
            <button onClick={() => onShare(auditor)} className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg transition" title="مشاركة واتساب"><Share2 size={18} /></button>
            {canManage && (
                <>
                <button onClick={() => onEdit(auditor)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition" title="تعديل"><Edit size={18} /></button>
                <button onClick={() => onDelete(auditor.id)} className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition" title="حذف"><Trash2 size={18} /></button>
                </>
            )}
          </div>
      </td>
    </tr>
  );
});

const ITEMS_PER_PAGE = 15;

const Auditors: React.FC = () => {
  const { user, hasPermission } = useAuth();
  const canCreate = hasPermission('create', 'auditors');
  const canEdit = hasPermission('edit', 'auditors');
  const canDelete = hasPermission('delete', 'auditors');
  const canManage = canCreate || canEdit || canDelete; 
  const isAuditorRole = user?.role === 'auditor';

  const { auditors, actions } = useData();

  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearchTerm = useDebounce(searchTerm, 300);

  let filteredAuditors = auditors;
  if (user?.role === 'sector_manager' && user.governorates) {
    filteredAuditors = auditors.filter(a => user.governorates?.includes(a.governorate));
  } else if (isAuditorRole) {
    filteredAuditors = auditors.filter(a => a.id === user.relatedId);
  }

  const myProfile = isAuditorRole ? filteredAuditors[0] : null;

  const [showForm, setShowForm] = useState(false);
  const [newAuditor, setNewAuditor] = useState<Partial<Auditor>>({});
  const [filterGov, setFilterGov] = useState('');
  const [visibleCount, setVisibleCount] = useState(ITEMS_PER_PAGE);

  const handleSave = async () => {
    if (newAuditor.name && newAuditor.governorate) {
      const auditor: Auditor = {
        id: newAuditor.id || Date.now().toString(),
        name: newAuditor.name!,
        governorate: newAuditor.governorate!,
        specialization: newAuditor.specialization || 'عام',
        status: newAuditor.status || 'Active',
        phone: newAuditor.phone || '',
        rating: newAuditor.rating || 5
      };
      await actions.saveAuditor(auditor);
      setShowForm(false);
      setNewAuditor({});
    }
  };

  const handleEdit = (auditor: Auditor) => {
    setNewAuditor({ ...auditor });
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm('هل أنت متأكد من حذف هذا المراجع من قاعدة البيانات السحابية؟')) {
      await actions.deleteAuditor(id);
    }
  };

  const handleShare = (auditor: Auditor) => {
    const text = `*بيانات المراجع (نظام الجودة)*\n\nالاسم: ${auditor.name}\nالمحافظة: ${auditor.governorate}\nالتخصص: ${auditor.specialization}\nرقم الهاتف: ${auditor.phone}\nالحالة: ${auditor.status}`;
    const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  const handleRatingUpdate = async (id: string, newRating: number) => {
    const auditor = auditors.find(a => a.id === id);
    if (auditor) {
        await actions.saveAuditor({ ...auditor, rating: newRating });
    }
  };

  const allFiltered = useMemo(() => {
    return filteredAuditors.filter(a => {
        const matchesGov = filterGov === '' || a.governorate === filterGov;
        const matchesSearch = a.name.toLowerCase().includes(debouncedSearchTerm.toLowerCase());
        return matchesGov && matchesSearch;
    });
  }, [filteredAuditors, filterGov, debouncedSearchTerm]);

  const displayList = useMemo(() => {
      return allFiltered.slice(0, visibleCount);
  }, [allFiltered, visibleCount]);

  const handleLoadMore = () => {
      setVisibleCount(prev => prev + ITEMS_PER_PAGE);
  };

  return (
    <div className="space-y-8 pb-10">
      {/* UI Code essentially identical, logic mapped to actions */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
           <h2 className="text-2xl font-bold text-slate-800">قاعدة بيانات المراجعين (Cloud)</h2>
           <p className="text-slate-500 mt-1">
             {isAuditorRole ? 'ملفي الشخصي وصلاحيات الوصول' : 'إدارة بيانات المراجعين وتزامنها لحظياً مع جميع الأجهزة'}
           </p>
        </div>
        <div className="flex gap-3">
          {canCreate && (
            <button onClick={() => { setNewAuditor({}); setShowForm(true); }} className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl flex items-center gap-2 transition shadow-lg shadow-blue-600/20 font-medium">
              <Plus size={18} />
              <span>إضافة مراجع</span>
            </button>
          )}
        </div>
      </div>

      {isAuditorRole && myProfile && (
        <div className="bg-white rounded-3xl shadow-soft border border-slate-200 p-6 relative overflow-hidden">
            {/* ... Profile Profile UI ... */}
             <div className="flex flex-col md:flex-row gap-8 relative z-10">
              <div className="flex-1">
                 <div className="flex items-center gap-4 mb-6">
                    <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400 border border-slate-200 shadow-inner"><UserCheck size={32} /></div>
                    <div><h3 className="text-xl font-black text-slate-800">{myProfile.name}</h3><p className="text-slate-500 font-medium flex items-center gap-1.5 mt-1"><Briefcase size={14} />{myProfile.specialization}</p></div>
                 </div>
              </div>
           </div>
        </div>
      )}

      {showForm && canCreate && (
        <div className="bg-white p-6 rounded-2xl shadow-lg border border-blue-100 fade-in relative overflow-hidden">
          <div className="absolute top-0 right-0 w-full h-1 bg-gradient-to-r from-blue-500 to-indigo-500"></div>
          <h3 className="text-lg font-bold mb-6 text-slate-800 flex items-center gap-2">
            {newAuditor.id ? <Edit size={20} className="text-blue-600" /> : <Plus size={20} className="text-blue-600" />}
            {newAuditor.id ? 'تعديل بيانات المراجع' : 'بيانات المراجع الجديد'}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-5 mb-6">
            <input className="p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition" placeholder="الاسم الثلاثي" value={newAuditor.name || ''} onChange={e => setNewAuditor({...newAuditor, name: e.target.value})} />
            <div className="relative">
              <select className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition appearance-none" value={newAuditor.governorate || ''} onChange={e => setNewAuditor({...newAuditor, governorate: e.target.value})}>
                <option value="">اختر المحافظة</option>
                {EGYPT_GOVERNORATES.map(g => <option key={g} value={g}>{g}</option>)}
              </select>
            </div>
            <input className="p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition" placeholder="التخصص" value={newAuditor.specialization || ''} onChange={e => setNewAuditor({...newAuditor, specialization: e.target.value})} />
            <input className="p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition" placeholder="رقم الهاتف" value={newAuditor.phone || ''} onChange={e => setNewAuditor({...newAuditor, phone: e.target.value})} />
            <div className="flex items-center gap-3 bg-slate-50 border border-slate-200 rounded-xl px-3">
                <span className="text-slate-500 text-sm whitespace-nowrap">التقييم:</span>
                <input type="number" min="1" max="5" step="0.1" className="w-full bg-transparent outline-none font-bold text-slate-700" placeholder="5" value={newAuditor.rating || ''} onChange={e => setNewAuditor({...newAuditor, rating: Number(e.target.value)})} />
                <Star size={16} className="text-yellow-400 fill-yellow-400" />
            </div>
          </div>
          <div className="flex gap-3 justify-end pt-4 border-t border-slate-100">
            <button onClick={() => setShowForm(false)} className="px-5 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition font-medium">إلغاء</button>
            <button onClick={handleSave} className="px-5 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 shadow-lg shadow-blue-600/20 transition font-medium">حفظ البيانات سحابياً</button>
          </div>
        </div>
      )}

      {/* List Table */}
      <div className="bg-white rounded-2xl shadow-soft border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-right">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase text-sm tracking-wider">
              <tr>
                <th className="p-4">الاسم</th>
                <th className="p-4">المحافظة</th>
                <th className="p-4">التخصص</th>
                <th className="p-4">رقم الهاتف</th>
                <th className="p-4">التقييم</th>
                <th className="p-4">الحالة</th>
                <th className="p-4 text-center">إجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {displayList.map((auditor) => (
                <AuditorRow key={auditor.id} auditor={auditor} canManage={canManage} onEdit={handleEdit} onDelete={handleDelete} onRatingChange={handleRatingUpdate} onShare={handleShare} />
              ))}
            </tbody>
          </table>
        </div>
      </div>
      
      {allFiltered.length > visibleCount && (
        <button onClick={handleLoadMore} className="w-full py-3 bg-white border border-slate-200 text-blue-600 font-bold rounded-2xl hover:bg-blue-50 transition-colors shadow-sm flex items-center justify-center gap-2">
            <ChevronDown size={20} /> عرض المزيد من المراجعين
        </button>
      )}
    </div>
  );
};

export default Auditors;
