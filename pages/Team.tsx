
import React, { useState, useEffect, useMemo } from 'react';
import { Phone, MapPin, Briefcase, Plus, Edit, Trash2, Printer, Share2, ChevronRight, Lock, ShieldAlert } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { SupportMember, QualityOfficer, Sector, User, Role } from '../types';
import { EGYPT_GOVERNORATES } from '../constants';
import { useDebounce } from '../hooks/useDebounce';
import { doc, setDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../services/firebase';

const Team: React.FC = () => {
  const { user, hasPermission, systemUsers } = useAuth(); // systemUsers is synced from AuthContext
  const location = useLocation();
  const [activeTab, setActiveTab] = useState<'support' | 'officers' | 'admins'>('support');
  
  useEffect(() => {
    if (location.pathname === '/quality-officers') setActiveTab('officers');
    else setActiveTab('support');
  }, [location.pathname]);

  const canCreate = hasPermission('create', 'team');
  const isAdmin = user?.role === 'admin';

  const { supportMembers, officers, actions } = useData();

  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearchTerm = useDebounce(searchTerm, 300);
  
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | string | null>(null);
  
  // Generic Form Data State
  const [formData, setFormData] = useState({
    name: '', phone: '', sector: '', governorates: '', governorate: '', email: '', password: '', role: 'sector_manager'
  });

  const filteredSupport = useMemo(() => supportMembers.filter(m => 
    m.name.includes(debouncedSearchTerm) || m.sector.includes(debouncedSearchTerm)
  ), [supportMembers, debouncedSearchTerm]);

  const filteredOfficers = useMemo(() => officers.filter(o => o.name.includes(debouncedSearchTerm) || o.governorate.includes(debouncedSearchTerm)), [officers, debouncedSearchTerm]);
  
  const filteredUsers = useMemo(() => systemUsers.filter(u => u.name.includes(debouncedSearchTerm) || u.email.includes(debouncedSearchTerm)), [systemUsers, debouncedSearchTerm]);

  const handleDelete = async (id: number | string) => {
    if(confirm("هل أنت متأكد من الحذف من قاعدة البيانات؟")) {
      if (activeTab === 'support') await actions.deleteSupportMember(id as number);
      else if (activeTab === 'officers') await actions.deleteOfficer(id as number);
      else if (activeTab === 'admins') {
          // Delete User from Firestore
          await deleteDoc(doc(db, 'users', id as string));
      }
    }
  };

  const handleEdit = (item: any) => {
    setEditingId(item.id);
    if (activeTab === 'support') {
      setFormData({ name: item.name, phone: item.phone, sector: item.sector, governorates: item.governorates.join(', '), governorate: '', email: '', password: '', role: '' });
    } else if (activeTab === 'officers') {
       setFormData({ name: item.name, phone: item.phone, sector: '', governorates: '', governorate: item.governorate, email: '', password: '', role: '' });
    } else {
        // Edit User
        setFormData({ name: item.name, phone: '', sector: '', governorates: '', governorate: '', email: item.email, password: item.password || '', role: item.role });
    }
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (activeTab === 'support') {
      const newMember: SupportMember = {
        id: (editingId as number) || Date.now(),
        name: formData.name,
        phone: formData.phone,
        sector: formData.sector as Sector,
        governorates: formData.governorates.split(',').map(s => s.trim()).filter(s => s !== '')
      };
      await actions.saveSupportMember(newMember);
    } else if (activeTab === 'officers') {
      const newOfficer: QualityOfficer = {
        id: (editingId as number) || Date.now(),
        name: formData.name,
        phone: formData.phone,
        governorate: formData.governorate
      };
      await actions.saveOfficer(newOfficer);
    } else if (activeTab === 'admins') {
       // Save User to Firestore
       const userId = (editingId as string) || `user_${Date.now()}`;
       const newUser: User = {
           id: userId,
           name: formData.name,
           email: formData.email,
           password: formData.password,
           role: formData.role as Role,
           // Default value logic for sector/governorates would go here if needed for managers
       };
       await setDoc(doc(db, 'users', userId), newUser);
    }

    setShowForm(false);
    setEditingId(null);
    setFormData({ name: '', phone: '', sector: '', governorates: '', governorate: '', email: '', password: '', role: 'sector_manager' });
  };

  const handlePrint = () => window.print();

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-center gap-4 no-print">
        <div>
          <h2 className="text-2xl font-black text-slate-800 tracking-tight">
            {activeTab === 'support' ? 'فريق الدعم الفني بالقطاعات' : activeTab === 'officers' ? 'دليل مسؤولي الجودة' : 'إدارة مستخدمي النظام (Admins)'}
          </h2>
          <p className="text-slate-500 font-medium">قاعدة البيانات السحابية المركزية</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex p-1.5 bg-slate-200/50 backdrop-blur rounded-[20px] no-print max-w-lg">
          <button onClick={() => setActiveTab('support')} className={`flex-1 py-2.5 text-sm font-black rounded-2xl transition-all ${activeTab === 'support' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>الدعم الفني</button>
          <button onClick={() => setActiveTab('officers')} className={`flex-1 py-2.5 text-sm font-black rounded-2xl transition-all ${activeTab === 'officers' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>مسؤولي الجودة</button>
          {isAdmin && <button onClick={() => setActiveTab('admins')} className={`flex-1 py-2.5 text-sm font-black rounded-2xl transition-all ${activeTab === 'admins' ? 'bg-white text-rose-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>مديرو النظام</button>}
      </div>

      <div className="flex flex-col md:flex-row gap-4 items-center no-print">
         <div className="relative w-full md:w-1/3">
           <input type="text" placeholder="بحث..." className="w-full pr-12 pl-4 py-3.5 bg-white border border-slate-200 rounded-2xl focus:ring-2 focus:ring-blue-500 focus:outline-none shadow-sm transition-all" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
           <div className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400"><MapPin size={20} /></div>
        </div>
        <div className="flex gap-2 w-full md:w-auto overflow-x-auto pb-1">
          <button onClick={handlePrint} className="bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 px-5 py-3 rounded-2xl flex items-center gap-2 transition whitespace-nowrap shadow-sm font-bold text-sm"><Printer size={18} /> طباعة</button>
          {canCreate && (
            <button onClick={() => { setShowForm(true); setEditingId(null); setFormData({ name: '', phone: '', sector: '', governorates: '', governorate: '', email: '', password: '', role: 'sector_manager' }); }} className="bg-blue-600 text-white hover:bg-blue-700 px-6 py-3 rounded-2xl flex items-center gap-2 transition whitespace-nowrap shadow-lg shadow-blue-600/20 font-bold text-sm"><Plus size={18} /> إضافة جديد</button>
          )}
        </div>
      </div>

      {showForm && (
        <div className="bg-white p-8 rounded-[32px] shadow-2xl border border-blue-100 fade-in relative overflow-hidden no-print">
           <div className="absolute top-0 right-0 w-full h-1.5 bg-gradient-to-r from-blue-500 to-indigo-500"></div>
           <h3 className="text-xl font-black mb-6 text-slate-800 flex items-center gap-2"><Edit size={24} className="text-blue-600" /> {editingId ? 'تعديل البيانات' : 'إضافة سجل جديد'}</h3>
           <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">
             
             {/* Fields for Support & Officers */}
             {(activeTab !== 'admins') && (
                 <>
                    <div className="space-y-1.5"><label className="text-sm font-bold text-slate-600 mr-2">الاسم بالكامل</label><input required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none" /></div>
                    <div className="space-y-1.5"><label className="text-sm font-bold text-slate-600 mr-2">رقم الهاتف</label><input required value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none font-mono" dir="ltr" /></div>
                 </>
             )}

             {activeTab === 'support' && (
               <>
                 <div className="space-y-1.5"><label className="text-sm font-bold text-slate-600 mr-2">القطاع</label><input required value={formData.sector} onChange={e => setFormData({...formData, sector: e.target.value})} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none" /></div>
                 <div className="space-y-1.5"><label className="text-sm font-bold text-slate-600 mr-2">المحافظات</label><input required value={formData.governorates} onChange={e => setFormData({...formData, governorates: e.target.value})} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none" placeholder="القاهرة، الجيزة..." /></div>
               </>
             )}

             {activeTab === 'officers' && (
                <div className="space-y-1.5 md:col-span-2">
                  <label className="text-sm font-bold text-slate-600 mr-2">المحافظة</label>
                  <select required className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none appearance-none" value={formData.governorate} onChange={e => setFormData({...formData, governorate: e.target.value})}>
                    <option value="">اختر المحافظة من القائمة</option>
                    {EGYPT_GOVERNORATES.map(g => <option key={g} value={g}>{g}</option>)}
                  </select>
                </div>
             )}

             {/* Fields for Admins */}
             {activeTab === 'admins' && (
                 <>
                    <div className="space-y-1.5"><label className="text-sm font-bold text-slate-600 mr-2">الاسم</label><input required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none" /></div>
                    <div className="space-y-1.5"><label className="text-sm font-bold text-slate-600 mr-2">الصلاحية</label>
                        <select className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none" value={formData.role} onChange={e => setFormData({...formData, role: e.target.value})}>
                            <option value="admin">Admin (مدير نظام)</option>
                            <option value="sector_manager">Manager (مدير قطاع)</option>
                            <option value="auditor">Auditor (مراجع)</option>
                        </select>
                    </div>
                    <div className="space-y-1.5"><label className="text-sm font-bold text-slate-600 mr-2">البريد الإلكتروني (Login)</label><input required type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none" dir="ltr" /></div>
                    <div className="space-y-1.5"><label className="text-sm font-bold text-slate-600 mr-2">كلمة المرور</label><input required type="text" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none font-mono" dir="ltr" /></div>
                 </>
             )}

             <div className="md:col-span-2 flex justify-end gap-3 mt-4">
                <button type="button" onClick={() => setShowForm(false)} className="px-6 py-3 text-slate-600 font-bold bg-slate-100 hover:bg-slate-200 rounded-2xl transition">إلغاء</button>
                <button type="submit" className="px-8 py-3 text-white font-bold bg-blue-600 hover:bg-blue-700 rounded-2xl shadow-lg shadow-blue-600/20 transition">حفظ التغييرات</button>
             </div>
          </form>
        </div>
      )}

      {/* Render Lists */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        
        {/* Support List */}
        {activeTab === 'support' && filteredSupport.map((member) => (
            <div key={member.id} className="bg-white rounded-[32px] shadow-soft border border-slate-100 overflow-hidden hover:shadow-2xl hover:-translate-y-1.5 transition-all duration-500 group relative">
               <div className="bg-slate-50/80 p-6 border-b border-slate-100 flex justify-between items-start">
                  <div><h3 className="font-black text-lg text-slate-800 tracking-tight">{member.name}</h3><div className="flex items-center text-sm text-blue-600 font-bold mt-1.5"><Briefcase size={14} className="ml-1.5" /><span>{member.sector}</span></div></div>
                  <div className="flex gap-1.5 no-print opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <button onClick={() => {}} className="p-2 text-emerald-600 bg-emerald-50 rounded-xl hover:bg-emerald-100 transition shadow-sm"><Share2 size={16} /></button>
                    {canCreate && (<><button onClick={() => handleEdit(member)} className="p-2 text-blue-600 bg-blue-50 rounded-xl hover:bg-blue-100 transition shadow-sm"><Edit size={16} /></button><button onClick={() => handleDelete(member.id)} className="p-2 text-rose-600 bg-rose-50 rounded-xl hover:bg-rose-100 transition shadow-sm"><Trash2 size={16} /></button></>)}
                  </div>
               </div>
               <div className="p-6 space-y-4">
                  <div className="flex items-start text-slate-500"><MapPin size={18} className="ml-2 mt-1 shrink-0 text-slate-400" /><p className="text-sm font-medium leading-relaxed">{member.governorates.length > 0 ? member.governorates.join('، ') : 'مسؤول مركزي'}</p></div>
                  <a href={`tel:${member.phone}`} className="flex items-center justify-between text-slate-700 bg-slate-50 hover:bg-slate-100 p-3.5 rounded-2xl border border-slate-100 transition-colors cursor-pointer group/call">
                    <div className="flex items-center gap-3"><div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-600 group-hover/call:scale-110 transition-transform"><Phone size={20} /></div><span className="font-mono font-black text-xl tracking-wider" dir="ltr">{member.phone}</span></div><ChevronRight size={16} className="text-slate-300" />
                  </a>
               </div>
            </div>
        ))}

        {/* Officers List */}
        {activeTab === 'officers' && filteredOfficers.map((officer) => (
             <div key={officer.id} className="bg-white rounded-[32px] shadow-soft border border-slate-100 p-6 hover:shadow-2xl hover:-translate-y-1.5 transition-all duration-500 flex flex-col justify-between group relative">
                <div>
                   <div className="flex justify-between items-start mb-4"><h3 className="font-black text-slate-800 tracking-tight text-lg">{officer.name}</h3><span className="bg-blue-600 text-white text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full shadow-lg shadow-blue-500/20">{officer.governorate}</span></div>
                   <div className="absolute top-2 left-2 flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity no-print">
                      {canCreate && (<><button onClick={() => handleEdit(officer)} className="p-2 text-blue-600 bg-blue-50 rounded-xl hover:bg-blue-100"><Edit size={14} /></button><button onClick={() => handleDelete(officer.id)} className="p-2 text-rose-600 bg-rose-50 rounded-xl hover:bg-rose-100"><Trash2 size={14} /></button></>)}
                   </div>
                </div>
                <div className="mt-6 pt-4 border-t border-slate-50 flex items-center justify-between">
                   <div className="flex items-center text-slate-600 bg-slate-50 px-3 py-2 rounded-xl border border-slate-100"><Phone size={16} className="ml-2 text-emerald-500" /><span className="font-mono text-sm font-black" dir="ltr">{officer.phone}</span></div>
                </div>
             </div>
        ))}

        {/* Admins List (Only visible to Admin) */}
        {activeTab === 'admins' && filteredUsers.map((u) => (
             <div key={u.id} className="bg-white rounded-[32px] shadow-soft border border-slate-100 p-6 hover:shadow-2xl transition-all duration-500 group relative border-l-4 border-l-rose-500">
                <div className="flex items-start justify-between">
                    <div>
                        <h3 className="font-black text-slate-800 text-lg">{u.name}</h3>
                        <p className="text-slate-500 text-sm font-mono mt-1">{u.email}</p>
                    </div>
                    <div className="bg-rose-50 p-2 rounded-xl text-rose-600"><ShieldAlert size={20} /></div>
                </div>
                <div className="mt-4 flex gap-2">
                    <span className="px-3 py-1 bg-slate-100 rounded-lg text-xs font-bold uppercase">{u.role}</span>
                    <span className="px-3 py-1 bg-slate-100 rounded-lg text-xs font-mono">Pwd: {u.password}</span>
                </div>
                <div className="mt-4 pt-4 border-t border-slate-50 flex justify-end gap-2 opacity-60 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => handleEdit(u)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"><Edit size={16} /></button>
                    {u.id !== 'fallback-admin' && <button onClick={() => handleDelete(u.id)} className="p-2 text-rose-600 hover:bg-rose-50 rounded-lg"><Trash2 size={16} /></button>}
                </div>
             </div>
        ))}

      </div>
    </div>
  );
};

export default Team;
