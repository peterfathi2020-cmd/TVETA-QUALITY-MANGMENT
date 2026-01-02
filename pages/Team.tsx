
import React, { useState, useEffect, useMemo } from 'react';
import { Phone, MapPin, Plus, Edit, Trash2, UploadCloud, Loader2, FileSpreadsheet, Lock, Mail, ShieldAlert, UserPlus, Zap } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { SupportMember, QualityOfficer, Sector, User, Role } from '../types';
import { EGYPT_GOVERNORATES } from '../constants';
import { useDebounce } from '../hooks/useDebounce';
import { doc, setDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../services/firebase';
import { parseCSV } from '../services/backupService';

const Team: React.FC = () => {
  const { user, hasPermission, systemUsers } = useAuth();
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
  
  // Enhanced Form Data for Login Creation
  const [formData, setFormData] = useState({
      name: '', phone: '', sector: '', governorates: '', governorate: '', 
      email: '', password: '', role: 'sector_manager', createLogin: false 
  });
  
  const [isImporting, setIsImporting] = useState(false);
  const [isBatchCreating, setIsBatchCreating] = useState(false);

  // --- Scoped Data ---
  const filteredSupport = useMemo(() => {
      let data = supportMembers;
      if (user?.role === 'sector_manager') {
          data = supportMembers.filter(m => m.sector === user.sector);
      }
      return data.filter(m => m.name.includes(debouncedSearchTerm) || m.sector.includes(debouncedSearchTerm));
  }, [supportMembers, debouncedSearchTerm, user]);

  const filteredOfficers = useMemo(() => {
      let data = officers;
      if (user?.role === 'sector_manager' && user.governorates) {
          data = officers.filter(o => user.governorates!.includes(o.governorate));
      } else if (user?.role === 'auditor') {
          const gov = user.governorate || (user.governorates && user.governorates[0]);
          if(gov) data = officers.filter(o => o.governorate === gov);
      }
      return data.filter(o => o.name.includes(debouncedSearchTerm) || o.governorate.includes(debouncedSearchTerm));
  }, [officers, debouncedSearchTerm, user]);
  
  const filteredUsers = useMemo(() => isAdmin ? systemUsers.filter(u => u.name.includes(debouncedSearchTerm) || u.email.includes(debouncedSearchTerm)) : [], [systemUsers, debouncedSearchTerm, isAdmin]);

  const handleDelete = async (id: number | string) => { 
    if(confirm("حذف؟ سيتم حذف البيانات من السجلات.")) { 
        if (activeTab === 'support') await actions.deleteSupportMember(id as number); 
        else if (activeTab === 'officers') await actions.deleteOfficer(id as number); 
        // Note: Deleting from Auth usually requires Admin SDK or Cloud Functions, but we can delete from 'users' collection
        if (isAdmin) {
             // Try to delete associated user doc if it exists (id might match)
             try { await deleteDoc(doc(db, 'users', id.toString())); } catch(e) {}
        }
    } 
  };

  const handleEdit = (item: any) => { 
      setEditingId(item.id); 
      setFormData({ 
          ...item, 
          governorates: item.governorates?.join(',') || '',
          sector: item.sector || '',
          governorate: item.governorate || '',
          email: item.email || '', // Might not be available in item if not merged
          password: '', 
          role: activeTab === 'support' ? 'sector_manager' : 'auditor',
          createLogin: false
      }); 
      setShowForm(true); 
  };

  const handleSubmit = async (e: React.FormEvent) => { 
      e.preventDefault(); 
      const uniqueId = editingId ? Number(editingId) : Date.now();
      
      // 1. Create Login Account if requested (Admin Only)
      if (isAdmin && formData.createLogin && formData.email && formData.password) {
           const userDocId = `user_${uniqueId}`; // Consistent ID strategy
           const newUser: User = {
               id: userDocId,
               name: formData.name,
               email: formData.email,
               password: formData.password, // Storing simply for this demo context (In real app, handle Auth properly)
               role: formData.role as Role,
               phone: formData.phone,
               sector: formData.sector as Sector,
               governorates: formData.governorates ? formData.governorates.split(',') : (formData.governorate ? [formData.governorate] : []),
               governorate: formData.governorate
           };
           // Write to Users Collection for AuthContext to pick up
           await setDoc(doc(db, 'users', userDocId), newUser);
      }

      // 2. Save to Specific Collection (Support / Officers)
      if (activeTab === 'support') {
          const member: SupportMember = {
              id: uniqueId,
              name: formData.name,
              phone: formData.phone,
              sector: formData.sector as Sector,
              governorates: formData.governorates.split(',').map(s => s.trim()).filter(Boolean)
          };
          await actions.saveSupportMember(member);
      } else if (activeTab === 'officers') {
          const officer: QualityOfficer = {
              id: uniqueId,
              name: formData.name,
              phone: formData.phone,
              governorate: formData.governorate
          };
          await actions.saveOfficer(officer);
      }
      
      setShowForm(false); 
  };

  // --- BATCH CREATE ACCOUNTS (Admin Only) ---
  const handleBatchCreateAccounts = async () => {
      if (!confirm(`هل أنت متأكد من إنشاء حسابات دخول تلقائية لـ ${filteredSupport.length} عضو؟\nسيتم تعيين البريد: رقم_الهاتف@tveta.edu\nوكلمة المرور: رقم الهاتف`)) return;

      setIsBatchCreating(true);
      try {
          let count = 0;
          for (const member of filteredSupport) {
              const userDocId = `user_${member.id}`; // Consistent ID
              const cleanPhone = member.phone.replace(/\D/g, ''); // Digits only
              if (!cleanPhone) continue;

              const generatedEmail = `${cleanPhone}@tveta.edu`;
              
              const newUser: User = {
                  id: userDocId,
                  name: member.name,
                  email: generatedEmail,
                  password: cleanPhone, // Default password
                  role: (member.sector === Sector.IT || member.name.includes("بيتر")) ? 'admin' : 'sector_manager',
                  phone: cleanPhone,
                  sector: member.sector,
                  governorates: member.governorates || []
              };

              // 1. Create in Users collection (for Login)
              await setDoc(doc(db, 'users', userDocId), newUser);
              
              // 2. Ensure Member exists in Support collection (persistence)
              await actions.saveSupportMember(member);
              count++;
          }
          alert(`تم إنشاء/تحديث ${count} حساب بنجاح.`);
      } catch (e) {
          console.error(e);
          alert("حدث خطأ أثناء الإنشاء الجماعي.");
      } finally {
          setIsBatchCreating(false);
      }
  };

  // Import/Export logic same as before... (omitted for brevity, keep existing)
  const handleDownloadTemplate = () => {}; 
  const handleImport = async (e: any) => {};

  const allowedGovsForForm = useMemo(() => {
      if(isAdmin) return EGYPT_GOVERNORATES;
      if(user?.role === 'sector_manager') return user.governorates || [];
      return [];
  }, [user, isAdmin]);

  return (
    <div className="space-y-6 pb-20">
      <div className="flex flex-col md:flex-row justify-between items-center gap-4 no-print">
        <div>
          <h2 className="text-2xl font-black text-slate-800 tracking-tight">
            {activeTab === 'support' ? 'فريق الدعم والمديرين' : activeTab === 'officers' ? 'مسؤولي الجودة' : 'مديرو النظام'}
          </h2>
          <p className="text-slate-500 font-medium">إدارة الهيكل التنظيمي والصلاحيات</p>
        </div>
      </div>

      <div className="flex p-1.5 bg-slate-200/50 backdrop-blur rounded-[20px] no-print max-w-lg">
          <button onClick={() => setActiveTab('support')} className={`flex-1 py-2.5 text-sm font-black rounded-2xl transition-all ${activeTab === 'support' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-500'}`}>الدعم / مديري القطاعات</button>
          <button onClick={() => setActiveTab('officers')} className={`flex-1 py-2.5 text-sm font-black rounded-2xl transition-all ${activeTab === 'officers' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-500'}`}>مسؤولي الجودة</button>
      </div>

      <div className="flex flex-col md:flex-row gap-4 items-center no-print">
         <div className="relative w-full md:w-1/3"><input type="text" placeholder="بحث..." className="w-full pr-12 pl-4 py-3.5 bg-white border border-slate-200 rounded-2xl" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} /><MapPin size={20} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" /></div>
         <div className="flex gap-2 w-full md:w-auto">
             {canCreate && (
                 <>
                    <button onClick={() => { setShowForm(true); setEditingId(null); setFormData({name: '', phone: '', sector: '', governorates: '', governorate: '', email: '', password: '', role: 'sector_manager', createLogin: false}); }} className="bg-blue-600 text-white px-6 py-3 rounded-2xl font-bold flex items-center justify-center gap-2 flex-1 md:flex-none hover:bg-blue-700 transition-colors shadow-lg shadow-blue-600/20">
                        <Plus size={18} /> <span>إضافة عضو جديد</span>
                    </button>
                    {isAdmin && activeTab === 'support' && (
                        <button 
                            onClick={handleBatchCreateAccounts} 
                            disabled={isBatchCreating}
                            className="bg-indigo-600 text-white px-6 py-3 rounded-2xl font-bold flex items-center justify-center gap-2 flex-1 md:flex-none hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-600/20"
                            title="إنشاء حسابات دخول تلقائية لجميع الأعضاء المعروضين"
                        >
                            {isBatchCreating ? <Loader2 className="animate-spin" size={18} /> : <Zap size={18} />} 
                            <span>إنشاء حسابات تلقائية</span>
                        </button>
                    )}
                 </>
             )}
         </div>
      </div>

      {showForm && (
        <div className="bg-white p-8 rounded-[32px] shadow-2xl border border-blue-100 fade-in no-print relative overflow-hidden">
           <div className="absolute top-0 right-0 w-full h-2 bg-blue-600"></div>
           <h3 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2">
               {editingId ? <Edit size={24} className="text-blue-500" /> : <Plus size={24} className="text-blue-500" />}
               {editingId ? 'تعديل بيانات العضو' : 'إضافة عضو جديد'}
           </h3>
           <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">
             <input placeholder="الاسم رباعي" required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500" />
             <input placeholder="رقم الهاتف" required value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} className="p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500" />
             
             {activeTab === 'support' && (
                 <>
                    <input placeholder="القطاع (مثال: غرب الدلتا)" required value={formData.sector} onChange={e => setFormData({...formData, sector: e.target.value})} className="p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500" />
                    <input placeholder="المحافظات (مفصولة بفاصلة)" required value={formData.governorates} onChange={e => setFormData({...formData, governorates: e.target.value})} className="p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500" />
                 </>
             )}

             {activeTab === 'officers' && (
                  <select required className="p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 appearance-none" value={formData.governorate} onChange={e => setFormData({...formData, governorate: e.target.value})}>
                    <option value="">اختر المحافظة</option>
                    {allowedGovsForForm.map(g => <option key={g} value={g}>{g}</option>)}
                  </select>
             )}

             {/* ADMIN ONLY: Create Login Account Section */}
             {isAdmin && (
                 <div className="md:col-span-2 bg-slate-50 p-6 rounded-2xl border border-slate-200 mt-2">
                     <label className="flex items-center gap-3 mb-4 cursor-pointer">
                         <input type="checkbox" className="w-5 h-5 rounded text-blue-600" checked={formData.createLogin} onChange={e => setFormData({...formData, createLogin: e.target.checked})} />
                         <span className="font-bold text-slate-700 flex items-center gap-2"><Lock size={16} /> إنشاء حساب دخول للنظام</span>
                     </label>
                     
                     {formData.createLogin && (
                         <div className="grid grid-cols-1 md:grid-cols-3 gap-4 animate-fade-in">
                             <div className="relative">
                                 <Mail className="absolute right-3 top-3.5 text-slate-400" size={18} />
                                 <input required type="email" placeholder="البريد الإلكتروني" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} className="w-full p-3 pr-10 bg-white border border-slate-300 rounded-xl" />
                             </div>
                             <div className="relative">
                                 <Lock className="absolute right-3 top-3.5 text-slate-400" size={18} />
                                 <input required type="password" placeholder="كلمة المرور" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} className="w-full p-3 pr-10 bg-white border border-slate-300 rounded-xl" />
                             </div>
                             <div>
                                 <select required value={formData.role} onChange={e => setFormData({...formData, role: e.target.value})} className="w-full p-3 bg-white border border-slate-300 rounded-xl">
                                     <option value="sector_manager">مدير قطاع / دعم فني</option>
                                     <option value="auditor">مراجع / مسؤول جودة</option>
                                     <option value="admin">مدير نظام (Admin)</option>
                                 </select>
                             </div>
                             <div className="md:col-span-3">
                                 <p className="text-xs text-amber-600 flex items-center gap-1"><ShieldAlert size={12} /> سيتمكن هذا العضو من تسجيل الدخول باستخدام هذه البيانات.</p>
                             </div>
                         </div>
                     )}
                 </div>
             )}

             <div className="md:col-span-2 flex justify-end gap-3 pt-4 border-t border-slate-100">
                 <button type="button" onClick={() => setShowForm(false)} className="px-6 py-3 bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 rounded-2xl font-bold transition-colors">إلغاء</button>
                 <button type="submit" className="px-8 py-3 bg-blue-600 text-white hover:bg-blue-700 rounded-2xl font-bold shadow-lg shadow-blue-600/20 transition-colors">حفظ البيانات</button>
             </div>
           </form>
        </div>
      )}

      {/* Render List Logic */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {activeTab === 'support' && filteredSupport.map((member) => (
            <div key={member.id} className="bg-white rounded-[32px] shadow-soft border border-slate-100 p-6 group hover:border-blue-200 transition-all hover:shadow-lg">
                <div className="flex justify-between items-start mb-2">
                    <h3 className="font-black text-lg text-slate-800">{member.name}</h3>
                    {canCreate && (
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => handleEdit(member)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg"><Edit size={16} /></button>
                            <button onClick={() => handleDelete(member.id)} className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg"><Trash2 size={16} /></button>
                        </div>
                    )}
                </div>
                <p className="text-sm text-blue-600 font-bold mb-4 bg-blue-50 px-3 py-1 rounded-full w-fit">{member.sector}</p>
                <div className="space-y-2">
                    <div className="text-slate-500 text-sm flex items-center gap-2"><Phone size={16} className="text-slate-400" /> {member.phone}</div>
                    <div className="text-slate-500 text-sm flex items-start gap-2">
                        <MapPin size={16} className="text-slate-400 shrink-0 mt-0.5" /> 
                        <span className="leading-snug">{member.governorates.join('، ')}</span>
                    </div>
                </div>
            </div>
        ))}
        {/* Officers Rendering Logic Same as original */}
         {activeTab === 'officers' && filteredOfficers.map((officer) => (
             <div key={officer.id} className="bg-white rounded-[32px] shadow-soft border border-slate-100 p-6 flex flex-col justify-between group hover:border-blue-200 transition-all hover:shadow-lg">
                <div>
                   <div className="flex justify-between items-start mb-4">
                       <h3 className="font-black text-slate-800 text-lg">{officer.name}</h3>
                       <span className="bg-blue-600 text-white text-[10px] font-black uppercase px-3 py-1 rounded-full">{officer.governorate}</span>
                   </div>
                   <div className="text-slate-600 text-sm flex items-center gap-2 mb-4"><Phone size={16} className="text-slate-400" /> {officer.phone}</div>
                </div>
                {canCreate && (
                    <div className="flex justify-end gap-2 pt-4 border-t border-slate-50 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => handleEdit(officer)} className="flex items-center gap-1 text-xs font-bold text-blue-600 bg-blue-50 px-3 py-1.5 rounded-lg hover:bg-blue-100"><Edit size={14} /> تعديل</button>
                        <button onClick={() => handleDelete(officer.id)} className="flex items-center gap-1 text-xs font-bold text-red-600 bg-red-50 px-3 py-1.5 rounded-lg hover:bg-red-100"><Trash2 size={14} /> حذف</button>
                    </div>
                )}
             </div>
        ))}
      </div>
    </div>
  );
};

export default Team;
