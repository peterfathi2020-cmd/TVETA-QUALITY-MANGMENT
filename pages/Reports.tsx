
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { 
  FileText, Search, Eye, Check, X, Printer, Plus, 
  Trash2, Save, Sparkles, FileUp, Loader2, HardDriveUpload,
  AlignLeft, CheckSquare, List, CalendarDays, Hash, Layout, FolderOpen, Wand2, RefreshCw, MapPin, Send, Type
} from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { ReportDocument, DynamicFormTemplate, FormField, FieldType, DynamicFormSubmission } from '../types';
import { storage } from '../services/firebase';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { useDebounce } from '../hooks/useDebounce';
import { loadGoogleScripts, uploadFileToDrive, getSystemFolderId } from '../services/googleDriveService';
import { analyzeDocumentImage, generateSmartFormSchema } from '../services/geminiService';
import { TvetaLogo } from '../components/TvetaLogo';
import { EGYPT_GOVERNORATES } from '../constants';

const Reports: React.FC = () => {
  const { user, hasPermission } = useAuth();
  const location = useLocation();
  const canCreateForm = hasPermission('create', 'forms') && user?.role === 'admin'; 
  const { reports, dynamicForms, actions } = useData(); 
  
  const [activeTab, setActiveTab] = useState<'archive' | 'forms'>('archive');
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearchTerm = useDebounce(searchTerm, 300);
  const [filterGov, setFilterGov] = useState('All');
  
  // States for Modals/Forms
  const [showFormBuilder, setShowFormBuilder] = useState(false);
  const [formBuilderData, setFormBuilderData] = useState<{title: string, description: string, fields: FormField[]}>({title: '', description: '', fields: []});
  const [activeFieldId, setActiveFieldId] = useState<string | null>(null);

  const [showFormFiller, setShowFormFiller] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<DynamicFormTemplate | null>(null);
  const [formAnswers, setFormAnswers] = useState<Record<string, any>>({});
  
  // Print Preview State
  const [printData, setPrintData] = useState<{template: DynamicFormTemplate, answers: any, meta: any} | null>(null);
  
  // Smart Upload State
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadData, setUploadData] = useState({ title: '', governorate: '' });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [notification, setNotification] = useState<string | null>(null);
  const [saveToDrive, setSaveToDrive] = useState(false);
  const dragRef = useRef<HTMLLabelElement>(null);
  
  // AI Analysis & Generation State
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isGeneratingForm, setIsGeneratingForm] = useState(false);
  const [isSubmittingForm, setIsSubmittingForm] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const query = params.get('q');
    const action = params.get('action');

    if (query) { setSearchTerm(query); setActiveTab('archive'); }
    if (action === 'upload') { setShowUploadModal(true); }
    
    // Safely attempt to load scripts if admin
    if (user?.role === 'admin') {
        loadGoogleScripts().catch(err => console.warn("Google Drive scripts init failed", err));
    }
  }, [location.search, user]);

  // --- Strict Filtering Logic ---
  const filteredReports = useMemo(() => {
    let result = reports;
    if (user?.role === 'admin') {
        // Admin sees all
    } else if (user?.role === 'sector_manager' && user.governorates) {
        result = reports.filter(r => user.governorates!.includes(r.governorate));
    } else if (user?.role === 'auditor') {
        const userGov = user.governorate || (user.governorates && user.governorates[0]);
        if (userGov) {
            result = reports.filter(r => r.governorate === userGov);
        }
    }

    return result.filter(report => {
        const searchLow = debouncedSearchTerm.toLowerCase();
        const matchesSearch = report.title.toLowerCase().includes(searchLow) || report.governorate.toLowerCase().includes(searchLow);
        const matchesGov = filterGov === 'All' || report.governorate === filterGov;
        return matchesSearch && matchesGov;
    });
  }, [reports, debouncedSearchTerm, filterGov, user]);

  const allowedGovs = useMemo(() => {
      if (user?.role === 'admin') return [];
      if (user?.role === 'sector_manager') return user.governorates || [];
      return user?.governorate ? [user.governorate] : [];
  }, [user]);

  const handlePrint = () => {
    window.print();
  };

  // --- Form Builder Logic ---
  const addField = (type: FieldType, customOptions?: string[], label: string = 'سؤال جديد') => {
    const newField: FormField = {
      id: `field_${Date.now()}`,
      label: label,
      type,
      required: false
    };
    
    if (type === 'select') {
        newField.options = customOptions || ['الخيار 1', 'الخيار 2'];
    }

    setFormBuilderData(prev => ({ ...prev, fields: [...prev.fields, newField] }));
    setActiveFieldId(newField.id);
  };

  const addGovernorateField = () => {
      addField('select', EGYPT_GOVERNORATES, 'المحافظة');
  };

  const updateField = (id: string, updates: Partial<FormField>) => {
    setFormBuilderData(prev => ({
      ...prev,
      fields: prev.fields.map(f => f.id === id ? { ...f, ...updates } : f)
    }));
  };

  const removeField = (id: string) => {
    setFormBuilderData(prev => ({
      ...prev,
      fields: prev.fields.filter(f => f.id !== id)
    }));
  };

  const handleSaveForm = async () => {
    if (!formBuilderData.title) return;
    const newTemplate: DynamicFormTemplate = {
      id: `template_${Date.now()}`,
      title: formBuilderData.title,
      description: formBuilderData.description,
      fields: formBuilderData.fields,
      createdAt: new Date().toISOString()
    };
    await actions.saveFormTemplate(newTemplate);
    setShowFormBuilder(false);
    setFormBuilderData({ title: '', description: '', fields: [] });
    setNotification('تم حفظ نموذج التقرير بنجاح');
    setTimeout(() => setNotification(null), 3000);
  };

  const handleAIFormGeneration = async () => {
      const topic = prompt("اكتب وصفاً أو موضوعاً للنموذج الذي تريد إنشاءه (مثال: نموذج تقييم نظافة المعامل):");
      if(!topic) return;

      setIsGeneratingForm(true);
      try {
          const schema = await generateSmartFormSchema(topic);
          if (schema) {
              const enrichedFields = schema.fields.map((f: any, idx: number) => ({
                  ...f,
                  id: `ai_field_${Date.now()}_${idx}`,
                  type: f.type || 'text'
              }));
              setFormBuilderData({
                  title: schema.title || topic,
                  description: schema.description || 'تم إنشاؤه بواسطة الذكاء الاصطناعي',
                  fields: enrichedFields
              });
              setNotification("تم تصميم النموذج بنجاح!");
          } else {
              setNotification("فشل توليد النموذج. حاول مرة أخرى.");
          }
      } catch (e) {
          console.error(e);
          setNotification("حدث خطأ أثناء الاتصال بـ Gemini");
      } finally {
          setIsGeneratingForm(false);
          setTimeout(() => setNotification(null), 3000);
      }
  };

  // --- Form Filler Logic ---
  const handleOpenFill = (template: DynamicFormTemplate) => { 
    setSelectedTemplate(template); 
    setFormAnswers({}); 
    setShowFormFiller(true); 
  };

  const handleSubmitForm = async (closeAfter: boolean = true) => {
    if (!selectedTemplate || !user) return;
    
    // Validation
    const missingRequired = selectedTemplate.fields.filter(f => f.required && !formAnswers[f.id]);
    if (missingRequired.length > 0) {
      alert(`يرجى إكمال الحقول المطلوبة: ${missingRequired.map(f => f.label).join(', ')}`);
      return;
    }

    setIsSubmittingForm(true);
    try {
        const submissionData: DynamicFormSubmission = {
          id: `sub_${Date.now()}`,
          templateId: selectedTemplate.id,
          userId: user.id,
          userName: user.name,
          submittedAt: new Date().toISOString(),
          answers: formAnswers,
          governorate: user.governorate || (user.governorates?.[0]) || 'غير محدد'
        };

        await actions.saveFormSubmission(submissionData);
        
        // Show clear notification
        setNotification('تم إرسال النموذج إلى إدارة النظام بنجاح');
        
        if (closeAfter) {
            setShowFormFiller(false);
            // Open Print Preview after submission if closing
            setPrintData({
                template: selectedTemplate,
                answers: formAnswers,
                meta: {
                    user: user.name,
                    date: new Date().toLocaleDateString('ar-EG'),
                    gov: submissionData.governorate
                }
            });
        } else {
            // Reset for new submission
            setFormAnswers({});
            // Scroll to top
            const formContainer = document.getElementById('dynamic-form-container');
            if (formContainer) formContainer.scrollTop = 0;
        }

        setTimeout(() => setNotification(null), 4000);
    } catch (e) {
        console.error(e);
        setNotification("حدث خطأ أثناء الإرسال");
    } finally {
        setIsSubmittingForm(false);
    }
  };

  const handleViewReport = (report: ReportDocument) => {
     if(report.isSmartForm && report.smartFormData) {
         setPrintData({
             template: { id: 'view', title: report.title, description: 'عرض أرشيف', fields: [], createdAt: '' },
             answers: report.smartFormData,
             meta: {
                 user: 'مسجل بالنظام',
                 date: report.date,
                 gov: report.governorate,
                 isArchive: true
             }
         });
     } else {
         if (report.url) {
             window.open(report.url, '_blank');
         } else {
             alert('رابط الملف غير متوفر.');
         }
     }
  };

  // --- AI Smart Fill ---
  const handleSmartFill = async () => {
    if (!selectedFile) return;
    if (!selectedFile.type.startsWith('image/')) {
       alert("خاصية التحليل الذكي تدعم ملفات الصور فقط حالياً.");
       return;
    }

    setIsAnalyzing(true);
    try {
        const reader = new FileReader();
        reader.onloadend = async () => {
            const base64String = (reader.result as string).split(',')[1];
            const result = await analyzeDocumentImage(base64String);
            
            setUploadData(prev => ({
                ...prev,
                title: result.title || prev.title,
                governorate: result.governorate || prev.governorate
            }));
            
            setNotification("تم تحليل المستند واستخراج البيانات بنجاح!");
            setTimeout(() => setNotification(null), 3000);
            setIsAnalyzing(false);
        };
        reader.readAsDataURL(selectedFile);
    } catch (e) {
        console.error(e);
        setIsAnalyzing(false);
        setNotification("فشل تحليل المستند");
    }
  };

  // --- File Upload Logic ---
  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile || !uploadData.title || !uploadData.governorate) return;

    setUploadProgress(10);
    try {
        let downloadURL = '';
        
        // --- GOOGLE DRIVE INTEGRATION (Enhanced) ---
        if (saveToDrive && user?.role === 'admin') {
             try {
                 setNotification("جاري الاتصال بـ Google Drive...");
                 const folderId = await getSystemFolderId();
                 
                 setNotification("جاري رفع الملف إلى Drive...");
                 const driveFile = await uploadFileToDrive(selectedFile, folderId);
                 
                 // Use the WebViewLink from Drive as the report URL
                 downloadURL = driveFile.webViewLink;
             } catch (driveErr: any) {
                 console.error("Drive upload failed, falling back to Firebase", driveErr);
                 setNotification(`فشل الرفع لـ Drive (${driveErr.message || 'Error'}). جاري المحاولة عبر السيرفر الاحتياطي...`);
                 // Proceed to fall back to Firebase storage below if downloadURL is still empty
             }
        }
        // --------------------------------

        if (!downloadURL) {
            const storageRef = ref(storage, `reports/${Date.now()}_${selectedFile.name}`);
            const uploadTask = uploadBytesResumable(storageRef, selectedFile);
            
            await new Promise<void>((resolve, reject) => {
                uploadTask.on('state_changed', 
                    (snapshot) => {
                        const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                        setUploadProgress(Math.round(progress));
                    }, 
                    (error) => reject(error),
                    async () => {
                        downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
                        resolve();
                    }
                );
            });
        }

        const newReport: ReportDocument = {
            id: `rep_${Date.now()}`,
            title: uploadData.title,
            type: selectedFile.type.includes('pdf') ? 'PDF Document' : 'Image File',
            date: new Date().toISOString().split('T')[0],
            governorate: uploadData.governorate,
            status: 'Approved',
            url: downloadURL,
            auditorId: user?.id,
            isSmartForm: false
        };
        await actions.saveReport(newReport);

        setShowUploadModal(false);
        setUploadProgress(null);
        setUploadData({ title: '', governorate: '' });
        setSelectedFile(null);
        setSaveToDrive(false);
        setNotification('تم رفع الملف بنجاح');
        setTimeout(() => setNotification(null), 3000);

    } catch (error) {
      console.error(error);
      setUploadProgress(null);
      setNotification('فشل رفع الملف - تأكد من الاتصال');
    }
  };

  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); if(dragRef.current) dragRef.current.classList.add('border-blue-500', 'bg-blue-50', 'dark:bg-blue-900/20'); };
  const handleDragLeave = (e: React.DragEvent) => { e.preventDefault(); if(dragRef.current) dragRef.current.classList.remove('border-blue-500', 'bg-blue-50', 'dark:bg-blue-900/20'); };
  const handleDrop = (e: React.DragEvent) => {
      e.preventDefault();
      if(dragRef.current) dragRef.current.classList.remove('border-blue-500', 'bg-blue-50', 'dark:bg-blue-900/20');
      if (e.dataTransfer.files && e.dataTransfer.files[0]) setSelectedFile(e.dataTransfer.files[0]);
  };

  return (
    <div className="space-y-8 relative pb-20">
      {/* Notifications */}
      {notification && (
          <div className="fixed top-24 left-1/2 -translate-x-1/2 z-50 animate-bounce no-print">
              <div className={`px-8 py-4 rounded-3xl shadow-2xl flex items-center gap-3 border ${notification.includes('فشل') || notification.includes('خطأ') ? 'bg-rose-900 border-rose-700 text-white' : 'bg-slate-900 border-slate-700 text-white'}`}>
                  <div className={`rounded-full p-1 ${notification.includes('فشل') || notification.includes('خطأ') ? 'bg-rose-500' : 'bg-emerald-500'}`}>
                      {notification.includes('فشل') || notification.includes('خطأ') ? <X size={18} /> : <Check size={18} />}
                  </div>
                  <span className="font-bold">{notification}</span>
              </div>
          </div>
      )}

       <div className="flex flex-col md:flex-row justify-between items-center gap-4 no-print">
        <div className="flex items-center gap-3">
          <div className="w-14 h-14 bg-indigo-100 rounded-2xl flex items-center justify-center text-indigo-600 shadow-sm">
             <FolderOpen size={32} />
          </div>
          <div>
             <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">الأرشيف والنماذج</h2>
             <p className="text-slate-500 dark:text-slate-400 font-medium">{user?.role === 'admin' ? 'الأرشيف المركزي وبناء النماذج' : 'أرشيف النطاق الجغرافي'}</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-3 items-center">
           <button onClick={() => setShowUploadModal(true)} className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-8 py-4 rounded-2xl font-black flex items-center gap-3 shadow-lg shadow-blue-500/30 transition-all hover:-translate-y-1 active:scale-95 group">
             <div className="bg-white/20 p-2 rounded-xl group-hover:rotate-12 transition-transform">
               <FileUp size={22} />
             </div>
             <span>إدراج ملف جديد</span>
           </button>
        </div>
      </div>

      {/* Modern Sliding Tabs */}
      <div className="relative flex items-center bg-slate-100 dark:bg-slate-800 p-1.5 rounded-2xl w-full max-w-md mx-auto mb-8 shadow-inner no-print">
          <div 
            className={`absolute left-1.5 top-1.5 bottom-1.5 w-[calc(50%-6px)] bg-white dark:bg-slate-700 rounded-xl shadow-sm transition-all duration-300 ease-in-out ${activeTab === 'forms' ? 'translate-x-[100%] rtl:-translate-x-[100%]' : 'translate-x-0'}`} 
          />
          
          <button 
            onClick={() => setActiveTab('archive')} 
            className={`relative z-10 flex-1 flex items-center justify-center gap-2 py-3 text-sm font-bold transition-colors duration-300 ${activeTab === 'archive' ? 'text-blue-600 dark:text-blue-400' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700'}`}
          >
            <FolderOpen size={18} />
            سجل الأرشيف
          </button>
          
          <button 
            onClick={() => setActiveTab('forms')} 
            className={`relative z-10 flex-1 flex items-center justify-center gap-2 py-3 text-sm font-bold transition-colors duration-300 ${activeTab === 'forms' ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700'}`}
          >
            <Layout size={18} />
            النماذج الذكية
          </button>
      </div>

      {activeTab === 'archive' && (
        <div className="bg-white dark:bg-slate-900 p-8 rounded-[40px] shadow-soft border border-slate-100 dark:border-slate-800 fade-in">
             <div className="flex flex-wrap gap-4 mb-8 no-print">
                <div className="relative flex-1 min-w-[300px]">
                    <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                    <input type="text" placeholder="بحث..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pr-12 pl-4 py-3.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 dark:text-white" />
                </div>
                {user?.role !== 'auditor' && (
                    <select value={filterGov} onChange={e => setFilterGov(e.target.value)} className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-4 py-3.5 rounded-2xl font-bold text-slate-600 dark:text-slate-300 outline-none">
                        <option value="All">كل المحافظات</option>
                        {allowedGovs.length > 0 
                            ? allowedGovs.map(g => <option key={g} value={g}>{g}</option>
                            : <><option value="القاهرة">القاهرة</option><option value="الإسكندرية">الإسكندرية</option></> // Fallback
                        }
                    </select>
                )}
             </div>

             <div className="overflow-x-auto rounded-3xl border border-slate-100 dark:border-slate-800">
                <table className="w-full text-right">
                    <thead className="bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 text-xs font-black uppercase tracking-widest border-b border-slate-100 dark:border-slate-700">
                        <tr><th className="p-5">العنوان</th><th className="p-5">المحافظة</th><th className="p-5">التاريخ</th><th className="p-5 text-center">خيارات</th></tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                        {filteredReports.map(report => (
                            <tr key={report.id} className="hover:bg-blue-50/50 dark:hover:bg-blue-900/20 transition-colors">
                                <td className="p-5 font-bold text-slate-800 dark:text-slate-200 flex items-center gap-3">
                                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${report.isSmartForm ? 'bg-indigo-100 text-indigo-600' : 'bg-blue-100 text-blue-600'}`}>
                                        {report.isSmartForm ? <Layout size={18} /> : <FileText size={18} />}
                                    </div>
                                    {report.title}
                                </td>
                                <td className="p-5 text-slate-500 dark:text-slate-400 font-medium">{report.governorate}</td>
                                <td className="p-5 text-slate-500 dark:text-slate-400 font-mono">{report.date}</td>
                                <td className="p-5 text-center">
                                    <div className="flex justify-center gap-2">
                                        <button onClick={() => handleViewReport(report)} className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-slate-800 rounded-lg flex items-center gap-2" title="عرض">
                                            <Eye size={18} />
                                        </button>
                                        {report.isSmartForm && (
                                            <button onClick={() => handleViewReport(report)} className="p-2 text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-slate-800 rounded-lg" title="طباعة نموذج">
                                                <Printer size={18} />
                                            </button>
                                        )}
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
             </div>
        </div>
      )}

      {/* Forms Tab */}
      {activeTab === 'forms' && (
          <div className="space-y-6 animate-fade-in">
              {canCreateForm && (
                  <div className="bg-gradient-to-br from-indigo-600 to-blue-700 rounded-[32px] p-8 text-white flex justify-between items-center shadow-lg shadow-indigo-500/20">
                      <div>
                          <h3 className="text-2xl font-black mb-1">مركز تصميم النماذج</h3>
                          <p className="text-indigo-100 opacity-80">إنشاء نماذج ذكية لجمع البيانات الميدانية بسهولة</p>
                      </div>
                      <button onClick={() => setShowFormBuilder(true)} className="bg-white text-indigo-700 px-6 py-3 rounded-2xl font-bold flex gap-2 hover:bg-indigo-50 transition-colors shadow-xl">
                          <Plus size={20} /> تصميم جديد
                      </button>
                  </div>
              )}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                 {dynamicForms.map(form => (
                     <div key={form.id} className="bg-white dark:bg-slate-900 p-6 rounded-[32px] shadow-soft border border-slate-100 dark:border-slate-800 group hover:border-indigo-200 transition-all hover:shadow-lg">
                         <div className="flex justify-between items-start mb-4">
                            <h4 className="font-bold text-lg text-slate-900 dark:text-white line-clamp-1">{form.title}</h4>
                            <div className="bg-indigo-50 dark:bg-indigo-900/20 p-2.5 rounded-xl text-indigo-600 dark:text-indigo-400 group-hover:scale-110 transition-transform"><Layout size={20} /></div>
                         </div>
                         <p className="text-sm text-slate-500 dark:text-slate-400 mb-6 line-clamp-2 h-10">{form.description}</p>
                         <button onClick={() => handleOpenFill(form)} className="w-full py-3.5 bg-slate-50 dark:bg-slate-800 hover:bg-indigo-600 hover:text-white dark:hover:bg-indigo-600 text-slate-700 dark:text-slate-300 font-bold rounded-2xl transition-all flex items-center justify-center gap-2"><FileText size={18} /> تعبئة النموذج</button>
                     </div>
                 ))}
              </div>
          </div>
      )}

      {/* MODAL: Innovative Form Builder */}
      {showFormBuilder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm fade-in no-print">
           <div className="bg-white dark:bg-slate-900 rounded-[32px] w-full max-w-6xl shadow-2xl flex flex-col h-[90vh] overflow-hidden">
               {/* Builder Header */}
               <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/50">
                   <div className="flex items-center gap-4">
                       <Layout size={28} className="text-indigo-600" />
                       <div>
                           <h3 className="text-xl font-black text-slate-800 dark:text-white">مصمم النماذج الذكي</h3>
                           <p className="text-xs text-slate-500">سحب وإفلات • ذكاء اصطناعي • تخصيص كامل</p>
                       </div>
                   </div>
                   <div className="flex gap-2">
                       <button onClick={() => setShowFormBuilder(false)} className="px-6 py-2.5 text-slate-600 hover:bg-slate-100 rounded-xl font-bold">إلغاء</button>
                       <button onClick={handleSaveForm} disabled={!formBuilderData.title} className="px-6 py-2.5 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 flex items-center gap-2"><Save size={18} /> حفظ النموذج</button>
                   </div>
               </div>
               
               <div className="flex flex-1 overflow-hidden">
                   {/* Left Sidebar: Toolbox */}
                   <div className="w-80 bg-slate-50 dark:bg-slate-950 border-l border-slate-200 dark:border-slate-800 p-6 overflow-y-auto flex flex-col gap-6">
                       
                       {/* AI Section */}
                       <div className="p-4 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl text-white shadow-lg">
                           <div className="flex items-center gap-2 mb-2">
                               <Sparkles size={18} /> <span className="font-bold">التصميم التلقائي</span>
                           </div>
                           <p className="text-xs text-indigo-100 mb-3 opacity-90">دع الذكاء الاصطناعي ينشئ النموذج لك بالكامل.</p>
                           <button 
                               onClick={handleAIFormGeneration} 
                               disabled={isGeneratingForm}
                               className="w-full py-2 bg-white/20 hover:bg-white/30 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-colors"
                           >
                               {isGeneratingForm ? <Loader2 size={16} className="animate-spin" /> : <Wand2 size={16} />}
                               <span>توليد الآن</span>
                           </button>
                       </div>

                       {/* Standard Fields */}
                       <div>
                           <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">أدوات البناء</h4>
                           <div className="grid grid-cols-2 gap-3">
                               <button onClick={() => addField('text')} className="flex flex-col items-center gap-2 p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl hover:border-indigo-400 dark:hover:border-indigo-500 hover:shadow-md transition-all group">
                                   <Type size={20} className="text-slate-400 group-hover:text-indigo-500" />
                                   <span className="text-xs font-bold text-slate-600 dark:text-slate-300">نص قصير</span>
                               </button>
                               <button onClick={() => addField('textarea')} className="flex flex-col items-center gap-2 p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl hover:border-indigo-400 dark:hover:border-indigo-500 hover:shadow-md transition-all group">
                                   <AlignLeft size={20} className="text-slate-400 group-hover:text-indigo-500" />
                                   <span className="text-xs font-bold text-slate-600 dark:text-slate-300">نص طويل</span>
                               </button>
                               <button onClick={() => addField('number')} className="flex flex-col items-center gap-2 p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl hover:border-indigo-400 dark:hover:border-indigo-500 hover:shadow-md transition-all group">
                                   <Hash size={20} className="text-slate-400 group-hover:text-indigo-500" />
                                   <span className="text-xs font-bold text-slate-600 dark:text-slate-300">رقم</span>
                               </button>
                               <button onClick={() => addField('date')} className="flex flex-col items-center gap-2 p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl hover:border-indigo-400 dark:hover:border-indigo-500 hover:shadow-md transition-all group">
                                   <CalendarDays size={20} className="text-slate-400 group-hover:text-indigo-500" />
                                   <span className="text-xs font-bold text-slate-600 dark:text-slate-300">تاريخ</span>
                               </button>
                               <button onClick={() => addField('select')} className="flex flex-col items-center gap-2 p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl hover:border-indigo-400 dark:hover:border-indigo-500 hover:shadow-md transition-all group">
                                   <List size={20} className="text-slate-400 group-hover:text-indigo-500" />
                                   <span className="text-xs font-bold text-slate-600 dark:text-slate-300">قائمة</span>
                               </button>
                               <button onClick={() => addField('checkbox')} className="flex flex-col items-center gap-2 p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl hover:border-indigo-400 dark:hover:border-indigo-500 hover:shadow-md transition-all group">
                                   <CheckSquare size={20} className="text-slate-400 group-hover:text-indigo-500" />
                                   <span className="text-xs font-bold text-slate-600 dark:text-slate-300">اختيار</span>
                               </button>
                           </div>
                       </div>

                       {/* Special Fields */}
                       <div>
                           <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">حقول خاصة</h4>
                           <button onClick={addGovernorateField} className="w-full flex items-center gap-3 p-4 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-xl hover:bg-emerald-100 dark:hover:bg-emerald-900/40 transition-all text-emerald-800 dark:text-emerald-400">
                               <MapPin size={20} />
                               <div className="text-right">
                                   <span className="text-sm font-bold block">قائمة المحافظات</span>
                                   <span className="text-[10px] opacity-70">إدراج تلقائي لـ 27 محافظة</span>
                               </div>
                               <Plus size={16} className="mr-auto" />
                           </button>
                       </div>
                   </div>

                   {/* Main Canvas */}
                   <div className="flex-1 bg-slate-100 dark:bg-slate-900 overflow-y-auto p-8">
                       <div className="max-w-3xl mx-auto space-y-6">
                           {/* Form Meta */}
                           <div className="bg-white dark:bg-slate-800 p-8 rounded-2xl shadow-sm border-t-4 border-indigo-500">
                               <input 
                                   value={formBuilderData.title} 
                                   onChange={e => setFormBuilderData({...formBuilderData, title: e.target.value})} 
                                   className="w-full text-3xl font-black text-slate-900 dark:text-white bg-transparent border-b-2 border-transparent hover:border-slate-200 focus:border-indigo-500 focus:outline-none placeholder-slate-300 pb-2 mb-4 transition-colors"
                                   placeholder="عنوان النموذج"
                               />
                               <textarea 
                                   value={formBuilderData.description} 
                                   onChange={e => setFormBuilderData({...formBuilderData, description: e.target.value})} 
                                   className="w-full text-slate-600 dark:text-slate-300 bg-transparent border-b border-transparent hover:border-slate-200 focus:border-indigo-500 focus:outline-none resize-none h-20 placeholder-slate-400"
                                   placeholder="وصف النموذج وتعليمات التعبئة..."
                               />
                           </div>

                           {/* Fields List */}
                           {formBuilderData.fields.length === 0 ? (
                               <div className="border-3 border-dashed border-slate-300 dark:border-slate-700 rounded-3xl p-12 text-center">
                                   <Layout size={64} className="text-slate-300 mx-auto mb-4" />
                                   <h3 className="text-xl font-bold text-slate-400">مساحة العمل فارغة</h3>
                                   <p className="text-slate-400 mt-2">اختر عناصر من القائمة الجانبية لبدء التصميم</p>
                               </div>
                           ) : (
                               <div className="space-y-4">
                                   {formBuilderData.fields.map((field, idx) => (
                                       <div 
                                           key={field.id} 
                                           onClick={() => setActiveFieldId(field.id)}
                                           className={`bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm transition-all border-l-4 group relative ${activeFieldId === field.id ? 'border-l-indigo-500 ring-2 ring-indigo-500/20' : 'border-l-transparent hover:border-l-slate-300'}`}
                                       >
                                           <div className="absolute left-4 top-4 opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
                                               <button onClick={(e) => {e.stopPropagation(); removeField(field.id)}} className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg"><Trash2 size={18} /></button>
                                           </div>

                                           <div className="flex items-start gap-4">
                                               <span className="text-slate-300 font-black text-xl select-none">{idx + 1}</span>
                                               <div className="flex-1 space-y-4">
                                                   <div className="flex items-center gap-4">
                                                       <input 
                                                           value={field.label} 
                                                           onChange={(e) => updateField(field.id, { label: e.target.value })}
                                                           className="flex-1 bg-transparent font-bold text-lg text-slate-800 dark:text-white border-b border-transparent hover:border-slate-200 focus:border-indigo-500 outline-none pb-1"
                                                           placeholder="عنوان السؤال"
                                                       />
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-xs font-bold text-slate-400 uppercase">{field.type}</span>
                                                            <label className="flex items-center gap-2 cursor-pointer bg-slate-50 dark:bg-slate-700 px-3 py-1.5 rounded-lg">
                                                                <input 
                                                                    type="checkbox" 
                                                                    checked={field.required} 
                                                                    onChange={(e) => updateField(field.id, { required: e.target.checked })}
                                                                    className="rounded text-indigo-600 focus:ring-indigo-500"
                                                                />
                                                                <span className="text-xs font-bold text-slate-600 dark:text-slate-300">مطلوب</span>
                                                            </label>
                                                        </div>
                                                   </div>

                                                   {/* Options Editor for Select/Checkbox */}
                                                   {(field.type === 'select' || field.type === 'checkbox') && (
                                                       <div className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-xl border border-slate-100 dark:border-slate-700">
                                                           <p className="text-xs font-bold text-slate-500 mb-2">الخيارات (افصل بينها بفاصلة)</p>
                                                           <textarea 
                                                               className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg p-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                                                               value={field.options?.join(', ')}
                                                               onChange={(e) => updateField(field.id, { options: e.target.value.split(',').map(s => s.trim()) })}
                                                               placeholder="الخيار 1, الخيار 2, ..."
                                                           />
                                                       </div>
                                                   )}
                                               </div>
                                           </div>
                                       </div>
                                   ))}
                               </div>
                           )}
                       </div>
                   </div>
               </div>
           </div>
        </div>
      )}

      {/* MODAL: Form Filler */}
      {showFormFiller && selectedTemplate && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm fade-in no-print">
              <div className="bg-white dark:bg-slate-900 rounded-[32px] w-full max-w-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
                  <div className="p-6 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50">
                      <h3 className="text-xl font-black text-slate-800 dark:text-white">{selectedTemplate.title}</h3>
                      <p className="text-sm text-slate-500 dark:text-slate-400">{selectedTemplate.description}</p>
                  </div>
                  
                  <div id="dynamic-form-container" className="flex-1 overflow-y-auto p-8 space-y-6">
                      {selectedTemplate.fields.map((field) => (
                          <div key={field.id} className="space-y-2">
                              <label className="block text-sm font-bold text-slate-700 dark:text-slate-300">
                                  {field.label} {field.required && <span className="text-red-500">*</span>}
                              </label>
                              {/* Form inputs rendering (textarea, select, checkbox, input) */}
                              {field.type === 'textarea' ? (
                                  <textarea 
                                    required={field.required} 
                                    value={formAnswers[field.id] || ''}
                                    className="w-full p-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none" 
                                    onChange={(e) => setFormAnswers({...formAnswers, [field.id]: e.target.value})} 
                                  />
                              ) : field.type === 'select' ? (
                                  <select 
                                    required={field.required} 
                                    value={formAnswers[field.id] || ''}
                                    className="w-full p-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none" 
                                    onChange={(e) => setFormAnswers({...formAnswers, [field.id]: e.target.value})}
                                  >
                                      <option value="">اختر...</option>
                                      {field.options?.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                                  </select>
                              ) : (
                                  <input 
                                    type={field.type} 
                                    required={field.required} 
                                    value={formAnswers[field.id] || ''}
                                    className="w-full p-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none" 
                                    onChange={(e) => setFormAnswers({...formAnswers, [field.id]: e.target.value})} 
                                  />
                              )}
                          </div>
                      ))}
                  </div>

                  <div className="p-6 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 flex justify-between items-center gap-3">
                      <button onClick={() => setShowFormFiller(false)} className="px-6 py-3 text-slate-600 dark:text-slate-400 font-bold hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl">إلغاء</button>
                      <div className="flex gap-2">
                          <button 
                            onClick={() => handleSubmitForm(false)} 
                            disabled={isSubmittingForm}
                            className="px-6 py-3 bg-white border border-blue-200 text-blue-700 font-bold rounded-xl hover:bg-blue-50 shadow-sm flex items-center gap-2"
                          >
                             {isSubmittingForm ? <Loader2 className="animate-spin" size={18} /> : <RefreshCw size={18} />}
                             إرسال وتعبئة جديد
                          </button>
                          <button 
                            onClick={() => handleSubmitForm(true)} 
                            disabled={isSubmittingForm}
                            className="px-8 py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 shadow-lg flex items-center gap-2"
                          >
                             {isSubmittingForm ? <Loader2 className="animate-spin" size={18} /> : <Send size={18} />}
                             إرسال النموذج
                          </button>
                      </div>
                  </div>
              </div>
          </div>
      )}

      {/* MODAL: Print Preview */}
      {printData && (
        <div className="fixed inset-0 z-[100] bg-slate-900/90 backdrop-blur-sm overflow-y-auto print:bg-white print:overflow-visible print:inset-auto print:static">
             <div className="min-h-screen flex items-center justify-center p-4 print:p-0 print:block">
                 {/* Print Controls (Hidden when printing) */}
                 <div className="fixed top-4 right-4 flex gap-2 no-print z-50">
                     <button onClick={handlePrint} className="bg-blue-600 text-white px-6 py-3 rounded-full font-bold shadow-lg hover:bg-blue-700 flex items-center gap-2"><Printer size={20} /> طباعة التقرير</button>
                     <button onClick={() => setPrintData(null)} className="bg-white text-slate-800 px-6 py-3 rounded-full font-bold shadow-lg hover:bg-slate-100"><X size={20} /></button>
                 </div>

                 {/* A4 Paper Layout */}
                 <div className="bg-white w-[210mm] min-h-[297mm] p-[10mm] mx-auto shadow-2xl print:shadow-none print:w-full print:mx-0 text-slate-900">
                      {/* Header */}
                      <div className="flex justify-between items-center border-b-2 border-slate-900 pb-6 mb-8">
                          <TvetaLogo variant="light" size="lg" />
                          <div className="text-left">
                              <h1 className="text-xl font-black uppercase tracking-widest text-slate-900">تقرير فني / زيارة</h1>
                              <p className="text-sm font-bold text-slate-500 mt-1">نظام ضمان الجودة المركزي</p>
                              <p className="text-xs font-mono text-slate-400 mt-1">Ref: {Date.now().toString().slice(-8)}</p>
                          </div>
                      </div>

                      {/* Report Metadata */}
                      <div className="grid grid-cols-2 gap-6 mb-8 bg-slate-50 p-6 rounded-xl border border-slate-200 print:border-slate-300">
                          <div>
                              <p className="text-xs font-bold text-slate-500 uppercase">عنوان النموذج</p>
                              <p className="font-bold text-lg">{printData.template.title}</p>
                          </div>
                          <div>
                              <p className="text-xs font-bold text-slate-500 uppercase">مقدم التقرير</p>
                              <p className="font-bold text-lg">{printData.meta.user}</p>
                          </div>
                          <div>
                              <p className="text-xs font-bold text-slate-500 uppercase">المحافظة</p>
                              <p className="font-bold text-lg">{printData.meta.gov || 'غير محدد'}</p>
                          </div>
                          <div>
                              <p className="text-xs font-bold text-slate-500 uppercase">تاريخ التقديم</p>
                              <p className="font-bold text-lg font-mono">{printData.meta.date}</p>
                          </div>
                      </div>

                      {/* Content */}
                      <div className="space-y-6 mb-12">
                           <h3 className="font-bold text-lg border-b border-slate-200 pb-2 mb-4">بيانات التقرير التفصيلية</h3>
                           {printData.template.fields && printData.template.fields.map(field => (
                               <div key={field.id} className="break-inside-avoid">
                                   <p className="text-sm font-bold text-slate-500 mb-1">{field.label}</p>
                                   <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-slate-800 min-h-[3rem] whitespace-pre-wrap">
                                       {printData.answers[field.id] ? String(printData.answers[field.id]) : '-'}
                                   </div>
                               </div>
                           ))}
                           {!printData.template.fields.length && Object.entries(printData.answers).map(([key, value]) => (
                               <div key={key} className="break-inside-avoid">
                                   <p className="text-sm font-bold text-slate-500 mb-1">{key}</p>
                                   <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-slate-800 min-h-[3rem] whitespace-pre-wrap">
                                       {String(value)}
                                   </div>
                               </div>
                           ))}
                      </div>

                      {/* Footer / Signature */}
                      <div className="mt-12 pt-8 border-t-2 border-slate-900 break-inside-avoid">
                          <div className="flex justify-between items-end">
                              <div className="text-center w-40">
                                  <p className="font-bold text-sm mb-8">إعداد / مراجع الجودة</p>
                                  <p className="border-t border-slate-400 pt-1 text-xs">{printData.meta.user}</p>
                              </div>
                              <div className="text-center w-40">
                                  <p className="font-bold text-sm mb-8">اعتماد مدير القطاع</p>
                                  <p className="border-t border-slate-400 pt-1 text-xs">التوقيع / الختم</p>
                              </div>
                          </div>
                          <div className="text-center mt-8 text-[10px] text-slate-400 font-mono">
                              تم استخراج هذا المستند إلكترونياً عبر نظام TVETA للجودة | {new Date().toLocaleString('ar-EG')}
                          </div>
                      </div>
                 </div>
             </div>
        </div>
      )}

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm fade-in no-print">
            <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl w-full max-w-xl p-8 relative">
               <button onClick={() => setShowUploadModal(false)} className="absolute top-6 right-6 text-slate-400 hover:text-slate-600"><X size={24} /></button>
               <form onSubmit={handleUpload} className="space-y-4 pt-4">
                  <h3 className="text-2xl font-black text-slate-800 dark:text-white mb-4">إدراج ملف جديد</h3>
                  <input required value={uploadData.title} onChange={e => setUploadData({...uploadData, title: e.target.value})} className="w-full p-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none" placeholder="عنوان التقرير" />
                  <select required value={uploadData.governorate} onChange={e => setUploadData({...uploadData, governorate: e.target.value})} className="w-full p-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none">
                     <option value="">اختر المحافظة...</option>
                     {EGYPT_GOVERNORATES.map(g => <option key={g} value={g}>{g}</option>)}
                  </select>
                  <label className="flex flex-col items-center justify-center h-32 border-2 border-dashed border-slate-300 rounded-xl cursor-pointer hover:bg-slate-50">
                      <span className="text-sm text-slate-500">{selectedFile ? selectedFile.name : 'اضغط لاختيار ملف'}</span>
                      <input type="file" className="hidden" onChange={e => setSelectedFile(e.target.files?.[0] || null)} />
                  </label>
                  {user?.role === 'admin' && (
                       <label className="flex items-center gap-2 text-sm text-indigo-600 p-3 bg-indigo-50 border border-indigo-100 rounded-xl cursor-pointer hover:bg-indigo-100 transition-colors">
                           <input type="checkbox" className="w-5 h-5 rounded text-indigo-600" checked={saveToDrive} onChange={e => setSaveToDrive(e.target.checked)} />
                           <HardDriveUpload size={18} /> 
                           <span className="font-bold">حفظ نسخة في Google Drive (للأدمن)</span>
                       </label>
                   )}
                  
                  {/* Smart Fill Trigger */}
                  {selectedFile && selectedFile.type.startsWith('image/') && (
                      <button 
                        type="button" 
                        onClick={handleSmartFill} 
                        disabled={isAnalyzing}
                        className="w-full py-2 bg-gradient-to-r from-purple-500 to-indigo-500 text-white rounded-lg font-bold flex items-center justify-center gap-2 text-sm hover:opacity-90"
                      >
                          {isAnalyzing ? <Loader2 className="animate-spin" size={16} /> : <Sparkles size={16} />}
                          تحليل البيانات تلقائياً بالذكاء الاصطناعي
                      </button>
                  )}

                  {uploadProgress !== null && <div className="h-2 bg-slate-100 rounded-full overflow-hidden"><div className="h-full bg-blue-600 transition-all" style={{width: `${uploadProgress}%`}}></div></div>}
                  <button type="submit" disabled={!selectedFile || uploadProgress !== null} className="w-full py-4 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 disabled:opacity-50">حفظ</button>
               </form>
            </div>
        </div>
      )}
    </div>
  );
};

export default Reports;
