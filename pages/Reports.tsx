
import React, { useState, useMemo, useEffect } from 'react';
import { 
  FileText, Search, Eye, Check, X, Printer, Plus, 
  Trash2, Save, Sparkles, FileUp, GripVertical, Copy, Asterisk, Layout, Loader2, HardDriveUpload,
  AlignLeft, CheckSquare, List, CalendarDays, Hash
} from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { ReportDocument, DynamicFormTemplate, FormField, FieldType } from '../types';
import { storage } from '../services/firebase';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { useDebounce } from '../hooks/useDebounce';

const Reports: React.FC = () => {
  const { user, hasPermission } = useAuth();
  const location = useLocation();
  const canCreateForm = hasPermission('create', 'forms') && user?.role === 'admin'; 
  const { reports, actions } = useData();
  
  const [activeTab, setActiveTab] = useState<'archive' | 'forms' | 'library'>('archive');
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearchTerm = useDebounce(searchTerm, 300);
  const [filterGov, setFilterGov] = useState('All');
  
  // Form Builder State
  const [showFormBuilder, setShowFormBuilder] = useState(false);
  const [formBuilderData, setFormBuilderData] = useState<{title: string, description: string, fields: FormField[]}>({
    title: '', description: '', fields: []
  });
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  // Upload State
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadData, setUploadData] = useState({ title: '', governorate: '' });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [notification, setNotification] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const query = params.get('q');
    if (query) { setSearchTerm(query); setActiveTab('archive'); }
  }, [location.search]);

  const filteredReports = useMemo(() => reports.filter(report => {
    const searchLow = debouncedSearchTerm.toLowerCase();
    const matchesSearch = report.title.toLowerCase().includes(searchLow) || report.governorate.toLowerCase().includes(searchLow);
    const matchesGov = filterGov === 'All' || report.governorate === filterGov;
    return matchesSearch && matchesGov;
  }), [reports, debouncedSearchTerm, filterGov]);

  const handlePrint = () => {
    window.print();
  };

  const addField = (type: FieldType) => {
    const newField: FormField = {
      id: `field_${Date.now()}`, label: `حقل ${type} جديد`, type, required: false,
      defaultValue: type === 'checkbox' ? false : '',
      options: type === 'select' ? ['خيار 1', 'خيار 2'] : undefined
    };
    setFormBuilderData(prev => ({ ...prev, fields: [...prev.fields, newField] }));
  };

  const updateField = (id: string, updates: Partial<FormField>) => {
    setFormBuilderData(prev => ({ ...prev, fields: prev.fields.map(f => f.id === id ? { ...f, ...updates } : f) }));
  };

  const duplicateField = (id: string) => {
    const index = formBuilderData.fields.findIndex(f => f.id === id);
    if (index === -1) return;
    const original = formBuilderData.fields[index];
    const copy: FormField = { ...original, id: `field_copy_${Date.now()}`, label: `${original.label} (نسخة)` };
    const newFields = [...formBuilderData.fields];
    newFields.splice(index + 1, 0, copy);
    setFormBuilderData(prev => ({ ...prev, fields: newFields }));
  };

  const removeField = (id: string) => {
    setFormBuilderData(prev => ({ ...prev, fields: prev.fields.filter(f => f.id !== id) }));
  };

  const handleDragStart = (index: number) => setDraggedIndex(index);
  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;
    const newFields = [...formBuilderData.fields];
    const item = newFields.splice(draggedIndex, 1)[0];
    newFields.splice(index, 0, item);
    setFormBuilderData(prev => ({ ...prev, fields: newFields }));
    setDraggedIndex(index);
  };

  const handleSaveForm = async () => {
    if (!formBuilderData.title) return alert("يرجى إدخال عنوان للنموذج");
    const newForm: DynamicFormTemplate = {
      id: `form_${Date.now()}`,
      ...formBuilderData,
      createdAt: new Date().toISOString()
    };
    await actions.saveFormTemplate(newForm);
    setShowFormBuilder(false);
    setNotification("تم حفظ النموذج ومزامنته سحابياً بنجاح");
    setTimeout(() => setNotification(null), 3000);
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) return;

    const storageRef = ref(storage, `uploads/${Date.now()}_${selectedFile.name}`);
    const uploadTask = uploadBytesResumable(storageRef, selectedFile);

    uploadTask.on('state_changed', 
      (snapshot) => {
        const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
        setUploadProgress(progress);
      }, 
      (error) => {
        alert("فشل الرفع: " + error.message);
        setUploadProgress(null);
      }, 
      async () => {
        await getDownloadURL(uploadTask.snapshot.ref);
        const newReport: ReportDocument = {
          id: `rep_${Date.now()}`,
          title: uploadData.title,
          type: selectedFile.type,
          date: new Date().toISOString().split('T')[0],
          governorate: uploadData.governorate || 'المقر الرئيسي',
          status: 'Approved'
        };
        await actions.saveReport(newReport);
        setShowUploadModal(false);
        setUploadProgress(null);
        setSelectedFile(null);
        setNotification("تم رفع الملف وتوثيقه في الأرشيف السحابي");
        setTimeout(() => setNotification(null), 3000);
      }
    );
  };

  return (
    <div className="space-y-8 relative pb-20">
      {notification && (
        <div className="fixed top-24 left-1/2 -translate-x-1/2 z-50 animate-bounce no-print">
          <div className="bg-slate-900 text-white px-8 py-4 rounded-3xl shadow-2xl flex items-center gap-3 border border-slate-700">
            <div className="bg-emerald-500 rounded-full p-1"><Check size={18} /></div>
            <span className="font-bold">{notification}</span>
          </div>
        </div>
      )}

      {/* Header and Actions */}
       <div className="flex flex-col md:flex-row justify-between items-center gap-4 no-print">
        <div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tight">إدارة الأرشيف السحابي</h2>
          <p className="text-slate-500 font-medium">التقارير، النماذج، والمستندات</p>
        </div>
        <div className="flex gap-3">
           <button onClick={handlePrint} className="bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 px-5 py-3 rounded-2xl font-bold flex items-center gap-2 shadow-sm transition-all">
             <Printer size={20} /> طباعة السجل
           </button>
           {/* PRIMARY ADMIN TASK: Insert Report */}
           <button 
             onClick={() => setShowUploadModal(true)} 
             className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-2xl font-black flex items-center gap-2 shadow-xl shadow-blue-500/30 hover:-translate-y-0.5 transition-all border border-blue-500"
           >
             <FileUp size={20} /> إدراج تقرير جديد
           </button>
        </div>
      </div>

      <div className="flex p-1.5 bg-slate-200/50 backdrop-blur rounded-[24px] no-print max-w-2xl">
          {['archive', 'forms', 'library'].map((tab) => (
             <button key={tab} onClick={() => setActiveTab(tab as any)} className={`flex-1 py-3 text-sm font-black rounded-2xl transition-all ${activeTab === tab ? 'bg-white text-blue-700 shadow-xl scale-[1.02]' : 'text-slate-500 hover:text-slate-700'}`}>
                {tab === 'archive' ? 'سجل التقارير' : tab === 'forms' ? 'النماذج الذكية' : 'المكتبة'}
             </button>
          ))}
      </div>

      {activeTab === 'archive' && (
        <div className="bg-white p-8 rounded-[40px] shadow-soft border border-slate-100 fade-in print:shadow-none print:border-none print:p-0">
             <div className="flex flex-wrap gap-4 mb-8 no-print">
                <div className="relative flex-1 min-w-[300px]">
                    <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                    <input type="text" placeholder="بحث في عناوين التقارير..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pr-12 pl-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 transition-all" />
                </div>
                <select value={filterGov} onChange={e => setFilterGov(e.target.value)} className="bg-white border border-slate-200 px-4 py-3.5 rounded-2xl font-bold text-slate-600 outline-none">
                    <option value="All">كل المحافظات</option>
                    <option value="القاهرة">القاهرة</option>
                    <option value="الإسكندرية">الإسكندرية</option>
                    {/* Could map real governorates here */}
                </select>
             </div>

             {/* Print Header */}
             <div className="hidden print:block mb-6 text-center">
                <h1 className="text-2xl font-bold mb-2">سجل التقارير والأرشيف</h1>
                <p className="text-sm text-slate-500">تم استخراج هذا التقرير بتاريخ {new Date().toLocaleDateString('ar-EG')}</p>
             </div>

             <div className="overflow-x-auto rounded-3xl border border-slate-100 print:border-black">
                <table className="w-full text-right">
                    <thead className="bg-slate-50 text-slate-500 text-xs font-black uppercase tracking-widest border-b border-slate-100 print:bg-slate-200 print:text-black">
                        <tr>
                            <th className="p-5">عنوان التقرير</th>
                            <th className="p-5">المحافظة</th>
                            <th className="p-5">تاريخ الإدراج</th>
                            <th className="p-5">الحالة</th>
                            <th className="p-5 text-center no-print">خيارات</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50 print:divide-black">
                        {filteredReports.length > 0 ? filteredReports.map(report => (
                            <tr key={report.id} className="hover:bg-blue-50/50 transition-colors">
                                <td className="p-5 font-bold text-slate-800 flex items-center gap-3">
                                    <div className="w-10 h-10 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center no-print"><FileText size={18} /></div>
                                    {report.title}
                                </td>
                                <td className="p-5 text-slate-500 font-medium">{report.governorate}</td>
                                <td className="p-5 text-slate-500 font-mono">{report.date}</td>
                                <td className="p-5">
                                    <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${report.status === 'Approved' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'} print:border print:border-black`}>
                                        {report.status === 'Approved' ? 'معتمد' : 'قيد المراجعة'}
                                    </span>
                                </td>
                                <td className="p-5 text-center no-print">
                                    <div className="flex justify-center gap-2">
                                        <button className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="عرض"><Eye size={18} /></button>
                                        <button onClick={() => window.print()} className="p-2 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors" title="طباعة"><Printer size={18} /></button>
                                    </div>
                                </td>
                            </tr>
                        )) : (
                            <tr>
                                <td colSpan={5} className="p-8 text-center text-slate-400 font-medium">لا توجد تقارير مطابقة للبحث</td>
                            </tr>
                        )}
                    </tbody>
                </table>
             </div>
        </div>
      )}

      {/* Form Builder Modal */}
      {showFormBuilder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md fade-in no-print">
            <div className="bg-white rounded-[40px] w-full max-w-5xl shadow-2xl h-[90vh] flex flex-col relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-blue-600 to-indigo-600"></div>
                {/* Header */}
                <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                    <div className="flex items-center gap-4"><div className="w-14 h-14 bg-blue-600 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-blue-500/20"><Layout size={28} /></div><div><h3 className="text-2xl font-black text-slate-900">منشئ النماذج الديناميكي</h3><p className="text-sm text-slate-500">صمم نماذجك واسحب الحقول للترتيب</p></div></div>
                    <button onClick={() => setShowFormBuilder(false)} className="w-12 h-12 bg-white rounded-full flex items-center justify-center text-slate-400 hover:text-rose-500 hover:rotate-90 transition-all border border-slate-100"><X size={24} /></button>
                </div>
                {/* Content */}
                <div className="flex-1 flex overflow-hidden">
                    {/* Tool Bar */}
                    <div className="w-80 border-l border-slate-100 p-8 space-y-8 overflow-y-auto bg-slate-50/30">
                        <div className="space-y-4">
                            <label className="text-xs font-black text-slate-400 uppercase tracking-widest block px-1">بيانات النموذج</label>
                            <input value={formBuilderData.title} onChange={e => setFormBuilderData({...formBuilderData, title: e.target.value})} className="w-full p-4 bg-white border border-slate-200 rounded-2xl font-bold outline-none focus:ring-2 focus:ring-blue-500 shadow-sm" placeholder="عنوان النموذج..." />
                            <textarea value={formBuilderData.description} onChange={e => setFormBuilderData({...formBuilderData, description: e.target.value})} className="w-full p-4 bg-white border border-slate-200 rounded-2xl text-sm h-24 resize-none outline-none focus:ring-2 focus:ring-blue-500 shadow-sm" placeholder="وصف موجز..." />
                        </div>
                        <div className="space-y-4">
                            <label className="text-xs font-black text-slate-400 uppercase tracking-widest block px-1">إضافة حقل</label>
                            <div className="grid grid-cols-2 gap-3">
                                {[{ type: 'text', label: 'نص قصير', icon: AlignLeft }, { type: 'textarea', label: 'مقال طويل', icon: FileText }, { type: 'number', label: 'قيمة رقمية', icon: Hash }, { type: 'date', label: 'تاريخ', icon: CalendarDays }, { type: 'select', label: 'قائمة اختيار', icon: List }, { type: 'checkbox', label: 'مربع تأكيد', icon: CheckSquare }].map(item => (
                                    <button key={item.type} onClick={() => addField(item.type as any)} className="flex flex-col items-center gap-2 p-4 bg-white border border-slate-200 rounded-2xl hover:border-blue-500 hover:shadow-lg transition-all group">
                                        <item.icon size={20} className="text-slate-400 group-hover:text-blue-500 transition-colors" /><span className="text-[10px] font-black text-slate-600">{item.label}</span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                    {/* Editor Canvas */}
                    <div className="flex-1 p-10 overflow-y-auto bg-white">
                        {formBuilderData.fields.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center text-slate-300 border-2 border-dashed border-slate-100 rounded-[40px] bg-slate-50/50"><Sparkles size={64} className="mb-4 opacity-20" /><p className="font-bold">ابدأ بإضافة حقول من القائمة الجانبية</p></div>
                        ) : (
                            <div className="space-y-4">
                                {formBuilderData.fields.map((field, index) => (
                                    <div key={field.id} draggable onDragStart={() => handleDragStart(index)} onDragOver={(e) => handleDragOver(e, index)} onDragEnd={() => setDraggedIndex(null)} className={`group relative p-6 bg-white border-2 rounded-3xl transition-all ${draggedIndex === index ? 'opacity-30 scale-95 border-blue-500' : 'border-slate-100 hover:border-blue-200 hover:shadow-xl'}`}>
                                        <div className="flex items-start gap-5">
                                            <div className="mt-2 text-slate-300 group-hover:text-blue-400 cursor-grab active:cursor-grabbing"><GripVertical size={24} /></div>
                                            <div className="flex-1 space-y-4">
                                                <div className="flex justify-between items-center">
                                                    <div className="flex items-center gap-3"><span className="w-7 h-7 bg-slate-100 text-[10px] font-black text-slate-400 rounded-full flex items-center justify-center">{index + 1}</span><span className="bg-blue-50 text-blue-600 text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-lg">{field.type}</span></div>
                                                    <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <button onClick={() => duplicateField(field.id)} className="p-2 text-indigo-500 hover:bg-indigo-50 rounded-xl transition-colors" title="تكرار الحقل"><Copy size={18} /></button>
                                                        <button onClick={() => removeField(field.id)} className="p-2 text-rose-500 hover:bg-rose-50 rounded-xl transition-colors" title="حذف الحقل"><Trash2 size={18} /></button>
                                                    </div>
                                                </div>
                                                <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-center">
                                                    <div className={`md:col-span-8 relative transition-all duration-300 ${field.required ? 'ring-2 ring-rose-100 rounded-2xl' : ''}`}><input value={field.label} onChange={e => updateField(field.id, {label: e.target.value})} className="w-full p-4 bg-slate-50 border-none rounded-2xl font-bold outline-none focus:bg-white transition-all" placeholder="عنوان الحقل..." />{field.required && <Asterisk size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-rose-500 animate-pulse" />}</div>
                                                    <div className="md:col-span-4 flex justify-end"><label className="flex items-center gap-3 cursor-pointer group/toggle select-none"><span className={`text-xs font-black transition-colors ${field.required ? 'text-rose-600' : 'text-slate-400'}`}>مطلوب</span><div className="relative"><input type="checkbox" checked={field.required} onChange={e => updateField(field.id, {required: e.target.checked})} className="sr-only peer" /><div className="w-12 h-7 bg-slate-200 rounded-full peer peer-checked:bg-rose-500 after:content-[''] after:absolute after:top-[2px] after:right-[2px] after:bg-white after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:after:-translate-x-5"></div></div></label></div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
                <div className="p-8 border-t border-slate-100 flex justify-between items-center bg-slate-50/50">
                    <div className="flex items-center gap-2 text-slate-400 text-xs font-bold"><HardDriveUpload size={16} /> المزامنة التلقائية مفعلة</div>
                    <div className="flex gap-3"><button onClick={() => setShowFormBuilder(false)} className="px-8 py-4 font-bold text-slate-600 hover:bg-slate-100 rounded-2xl transition-all">إلغاء</button><button onClick={handleSaveForm} className="px-10 py-4 bg-blue-600 text-white font-black rounded-2xl shadow-xl shadow-blue-500/20 hover:bg-blue-700 hover:-translate-y-1 transition-all flex items-center gap-2"><Save size={20} /> حفظ وتفعيل النموذج</button></div>
                </div>
            </div>
        </div>
      )}

      {/* Upload Modal (Primary Task) */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm fade-in no-print">
            <div className="bg-white rounded-[40px] w-full max-w-lg shadow-2xl p-10 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-full h-1.5 bg-blue-600"></div>
                <div className="flex justify-between items-center mb-8"><h3 className="text-2xl font-black text-slate-900">إدراج تقرير جديد</h3><button onClick={() => setShowUploadModal(false)}><X size={28} className="text-slate-400" /></button></div>
                <form onSubmit={handleUpload} className="space-y-6">
                    <div className="space-y-2"><label className="text-xs font-black text-slate-400 uppercase tracking-widest mr-1">عنوان التقرير</label><input required value={uploadData.title} onChange={e => setUploadData({...uploadData, title: e.target.value})} className="w-full p-4 bg-slate-100 border-none rounded-2xl font-bold outline-none focus:ring-2 focus:ring-blue-500" placeholder="مثال: تقرير متابعة زيارة..." /></div>
                    <div className="border-3 border-dashed border-slate-200 rounded-[32px] p-10 flex flex-col items-center justify-center bg-slate-50 hover:bg-blue-50 hover:border-blue-300 transition-all cursor-pointer relative group">
                        <input type="file" onChange={e => setSelectedFile(e.target.files?.[0] || null)} className="absolute inset-0 opacity-0 cursor-pointer" />
                        <FileUp size={48} className="text-slate-300 group-hover:text-blue-500 transition-all mb-4" />
                        <p className="font-bold text-slate-500 group-hover:text-blue-600">{selectedFile ? selectedFile.name : 'اسحب الملف هنا أو انقر للإدراج'}</p>
                        {selectedFile && <span className="text-[10px] text-slate-400 mt-2">{(selectedFile.size / 1024 / 1024).toFixed(2)} MB</span>}
                    </div>
                    {uploadProgress !== null && (<div className="space-y-2"><div className="flex justify-between text-xs font-black text-blue-600"><span>جاري الحفظ سحابياً...</span><span>{Math.round(uploadProgress)}%</span></div><div className="h-2 bg-slate-100 rounded-full overflow-hidden"><div className="h-full bg-blue-600 transition-all duration-300" style={{ width: `${uploadProgress}%` }}></div></div></div>)}
                    <div className="flex gap-4 pt-4">
                        <button type="button" onClick={() => setShowUploadModal(false)} className="flex-1 py-4 font-bold text-slate-600 bg-slate-100 rounded-2xl">إلغاء</button>
                        <button type="submit" disabled={!selectedFile || uploadProgress !== null} className="flex-[2] py-4 bg-blue-600 text-white font-black rounded-2xl shadow-xl shadow-blue-600/20 hover:bg-blue-700 disabled:opacity-50 transition-all flex items-center justify-center gap-2">{uploadProgress !== null ? <Loader2 className="animate-spin" /> : <HardDriveUpload size={20} />} حفظ في الأرشيف</button>
                    </div>
                </form>
            </div>
        </div>
      )}
    </div>
  );
};

export default Reports;
