
import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { initGoogleDrive, listDriveFiles, uploadFileToDrive, deleteFileFromDrive, createDriveFolder, getSystemFolderId } from '../services/googleDriveService';
import { HardDrive, UploadCloud, FolderPlus, Trash2, File, Folder, ExternalLink, Loader2, RefreshCw, AlertCircle, CheckCircle, Lock, ShieldCheck, Image as ImageIcon, FileText, Settings, Copy } from 'lucide-react';

const DriveManager: React.FC = () => {
  const { user } = useAuth();
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [files, setFiles] = useState<any[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [notification, setNotification] = useState<string | null>(null);
  const [configError, setConfigError] = useState(false);

  // Auto-connect check
  useEffect(() => {
      const checkAutoConnect = async () => {
        if (user?.role !== 'admin') return;
        setIsLoading(true);
        setConfigError(false);
        try {
            // Attempt silent init
            await initGoogleDrive();
            // If we get here, connection handles/scripts loaded. 
            // We check if we have access by trying to list files (or check token presence)
            // But we won't force a popup here. Just see if we can fetch.
            // For better UX, we usually require manual click first time, but if token persists:
            // setIsConnected(true);
            // await loadFiles();
        } catch (error: any) {
            console.warn("Drive Init Status:", error);
            if (error?.toString().includes("Client ID") || error?.message?.includes("Client ID")) {
                setConfigError(true);
            }
        } finally {
            setIsLoading(false);
        }
      };
      checkAutoConnect();
  }, [user]);

  const handleManualConnect = async () => {
      setIsLoading(true);
      setConfigError(false);
      try {
          await initGoogleDrive();
          setIsConnected(true);
          await loadFiles();
          setNotification("تم الاتصال بـ Google Drive بنجاح");
      } catch (error: any) {
          console.error("Connection Failed:", error);
          if (error?.toString().includes("Client ID") || error?.message?.includes("Client ID")) {
              setConfigError(true);
              setNotification("خطأ: مفتاح Client ID مفقود");
          } else if (error?.error === 'popup_closed_by_user') {
              setNotification("تم إلغاء الاتصال من قبل المستخدم");
          } else {
              setNotification("فشل الاتصال: " + (error.message || "تأكد من إعدادات Google Cloud"));
          }
      } finally {
          setIsLoading(false);
          setTimeout(() => setNotification(null), 4000);
      }
  };

  const loadFiles = async () => {
      try {
          setIsLoading(true);
          const driveFiles = await listDriveFiles();
          setFiles(driveFiles || []);
      } catch (error) {
          console.error("Error loading files", error);
      } finally {
          setIsLoading(false);
      }
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      setIsUploading(true);
      try {
          const folderId = await getSystemFolderId();
          await uploadFileToDrive(file, folderId);
          await loadFiles();
          setNotification("تم رفع الملف بنجاح");
      } catch (error: any) {
          console.error(error);
          setNotification("فشل رفع الملف: " + error.message);
      } finally {
          setIsUploading(false);
          e.target.value = '';
          setTimeout(() => setNotification(null), 3000);
      }
  };

  const handleDelete = async (fileId: string) => {
      if(!confirm("هل أنت متأكد من حذف هذا الملف من Google Drive؟ لا يمكن التراجع عن هذا الإجراء.")) return;
      
      try {
          setNotification("جاري الحذف...");
          await deleteFileFromDrive(fileId);
          setFiles(prev => prev.filter(f => f.id !== fileId));
          setNotification("تم الحذف بنجاح");
      } catch (error) {
          console.error(error);
          setNotification("فشل الحذف");
      } finally {
          setTimeout(() => setNotification(null), 3000);
      }
  };

  const handleCreateFolder = async () => {
      const name = prompt("ادخل اسم المجلد الجديد:");
      if (!name) return;
      
      setIsLoading(true);
      try {
          const parentId = await getSystemFolderId();
          await createDriveFolder(name, parentId);
          await loadFiles(); 
          setNotification("تم إنشاء المجلد");
      } catch (error) {
           console.error(error);
           setNotification("فشل إنشاء المجلد");
      } finally {
          setIsLoading(false);
          setTimeout(() => setNotification(null), 3000);
      }
  };

  if (!user || user.role !== 'admin') {
      return (
          <div className="flex flex-col items-center justify-center h-[60vh] text-slate-400 gap-4">
              <Lock size={64} className="opacity-20" />
              <div className="text-center">
                  <h2 className="text-xl font-bold text-slate-600">غير مصرح بالوصول</h2>
                  <p className="text-sm">هذه الصفحة مخصصة لمديري النظام (Admins) فقط.</p>
              </div>
          </div>
      );
  }

  // --- Configuration Error View ---
  if (configError) {
      return (
          <div className="space-y-6 pb-20 animate-fade-in">
              <div className="bg-rose-50 border border-rose-100 rounded-[32px] p-12 text-center shadow-soft flex flex-col items-center gap-6 max-w-3xl mx-auto mt-10">
                  <div className="w-24 h-24 bg-rose-100 rounded-full flex items-center justify-center mb-2 text-rose-600">
                      <Settings size={48} />
                  </div>
                  <h3 className="text-2xl font-black text-rose-800">مطلوب إعدادات الربط</h3>
                  <p className="text-rose-600/80 max-w-lg mx-auto leading-relaxed">
                      لم يتم العثور على <code>Google Client ID</code> في متغيرات البيئة.
                  </p>
                  
                  <div className="bg-white p-6 rounded-2xl border border-rose-100 w-full text-left space-y-4" dir="ltr">
                      <h4 className="font-bold text-slate-700 flex items-center gap-2">
                          <AlertCircle size={18} className="text-amber-500" />
                          Troubleshooting:
                      </h4>
                      <ul className="list-disc list-inside text-sm text-slate-600 space-y-2">
                          <li>Ensure <code>.env</code> file exists in the project root.</li>
                          <li>Ensure <code>VITE_GOOGLE_CLIENT_ID</code> is set correctly.</li>
                          <li><strong>Important:</strong> Restart the development server after changing <code>.env</code> file.</li>
                      </ul>
                  </div>

                  <button 
                      onClick={() => window.location.reload()}
                      className="bg-rose-600 hover:bg-rose-700 text-white px-8 py-3 rounded-2xl font-bold transition-all shadow-lg shadow-rose-600/20"
                  >
                      تحديث الصفحة
                  </button>
              </div>
          </div>
      );
  }

  return (
    <div className="space-y-6 pb-20 animate-fade-in">
       {notification && (
          <div className="fixed top-24 left-1/2 -translate-x-1/2 z-50 animate-bounce no-print">
              <div className={`px-6 py-3 rounded-2xl shadow-xl flex items-center gap-2 text-white font-bold ${notification.includes('فشل') || notification.includes('خطأ') ? 'bg-rose-600' : 'bg-emerald-600'}`}>
                  {notification.includes('فشل') || notification.includes('خطأ') ? <AlertCircle size={20} /> : <CheckCircle size={20} />}
                  <span>{notification}</span>
              </div>
          </div>
       )}

       <div className="flex justify-between items-center border-b border-slate-200 pb-6">
          <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center text-blue-600 shadow-sm">
                  <HardDrive size={32} />
              </div>
              <div>
                  <h2 className="text-3xl font-black text-slate-800">إدارة الملفات (Google Drive)</h2>
                  <p className="text-slate-500 font-medium">الربط السحابي وإدارة الملفات المركزية</p>
              </div>
          </div>
          
          {isConnected && (
              <div className="flex gap-3">
                  <button onClick={loadFiles} disabled={isLoading} className="p-3 bg-white border border-slate-200 text-slate-600 rounded-xl hover:bg-slate-50 transition-colors" title="تحديث القائمة">
                      <RefreshCw size={20} className={isLoading ? "animate-spin" : ""} />
                  </button>
              </div>
          )}
       </div>

       {!isConnected ? (
           <div className="bg-white rounded-[32px] p-12 text-center shadow-soft border border-slate-100 flex flex-col items-center gap-6">
               <div className="w-24 h-24 bg-blue-50 rounded-full flex items-center justify-center mb-2">
                   <HardDrive size={48} className="text-blue-600" />
               </div>
               <h3 className="text-2xl font-black text-slate-800">ربط حساب Google Drive</h3>
               <p className="text-slate-500 max-w-lg mx-auto leading-relaxed">
                   لإدارة ملفات النظام، سيتم إنشاء مجلد مركزي باسم <br/>
                   <span className="font-mono bg-slate-100 px-2 py-0.5 rounded text-blue-600 font-bold">TVETA_QUALITY_MANAGEMENT</span><br/>
                   يرجى تسجيل الدخول بحساب Google الخاص بالمسؤول للمتابعة.<br/>
                   <span className="text-xs text-slate-400 mt-2 block">(يتطلب السماح بالنوافذ المنبثقة)</span>
               </p>
               <button 
                  onClick={handleManualConnect} 
                  disabled={isLoading}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 rounded-2xl font-bold text-lg shadow-xl shadow-blue-600/30 transition-all flex items-center gap-3 disabled:opacity-70"
               >
                   {isLoading ? <Loader2 className="animate-spin" /> : <img src="https://www.google.com/favicon.ico" className="w-6 h-6 bg-white rounded-full p-0.5" alt="G" />}
                   <span>بدء الاتصال بـ Google</span>
               </button>
           </div>
       ) : (
           <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
               {/* Sidebar / Actions */}
               <div className="lg:col-span-1 space-y-4">
                   <div className="bg-white p-6 rounded-3xl shadow-soft border border-slate-100">
                       <h3 className="font-bold text-slate-800 mb-6">إجراءات الملفات</h3>
                       <div className="space-y-3">
                           <label className={`w-full flex items-center gap-3 p-4 bg-blue-600 text-white rounded-xl cursor-pointer hover:bg-blue-700 transition-all shadow-lg shadow-blue-600/20 ${isUploading ? 'opacity-70 pointer-events-none' : ''}`}>
                               {isUploading ? <Loader2 className="animate-spin" size={24} /> : <UploadCloud size={24} />}
                               <div className="flex-1">
                                   <span className="font-bold block">رفع ملف جديد</span>
                                   <span className="text-xs text-blue-100 opacity-80">PDF, Excel, Images...</span>
                               </div>
                               <input type="file" className="hidden" onChange={handleUpload} disabled={isUploading} />
                           </label>
                           
                           <button onClick={handleCreateFolder} className="w-full flex items-center gap-3 p-4 bg-white border border-slate-200 text-slate-700 rounded-xl hover:bg-slate-50 transition-all">
                               <FolderPlus size={24} className="text-amber-500" />
                               <span className="font-bold">إنشاء مجلد فرعي</span>
                           </button>
                       </div>
                   </div>

                   <div className="bg-slate-900 text-slate-300 p-6 rounded-3xl">
                       <div className="flex items-center gap-2 mb-4">
                           <ShieldCheck className="text-emerald-500" />
                           <h4 className="font-bold text-white">متصل وآمن</h4>
                       </div>
                       <p className="text-sm text-slate-400 mb-2">المجلد المركزي النشط:</p>
                       <p className="text-xs font-mono bg-slate-800 p-2 rounded text-emerald-400 truncate select-all">TVETA_QUALITY_MANAGEMENT</p>
                       <div className="mt-4 pt-4 border-t border-slate-800 flex justify-between items-end">
                           <div>
                               <p className="text-xs text-slate-500">عدد الملفات</p>
                               <p className="text-2xl font-black text-white">{files.length}</p>
                           </div>
                       </div>
                   </div>
               </div>

               {/* Files Grid */}
               <div className="lg:col-span-2">
                   <div className="bg-white rounded-3xl shadow-soft border border-slate-100 overflow-hidden min-h-[500px] flex flex-col">
                       <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                           <h3 className="font-bold text-slate-800">الملفات المخزنة سحابياً</h3>
                           <div className="text-xs text-slate-400">يتم مزامنتها تلقائياً</div>
                       </div>
                       
                       {files.length === 0 ? (
                           <div className="flex-1 flex flex-col items-center justify-center text-slate-400 p-8">
                               <HardDrive size={64} className="mb-4 opacity-20" />
                               <p>المجلد فارغ.</p>
                               <p className="text-xs mt-2">استخدم زر "رفع ملف" لإضافة محتوى.</p>
                           </div>
                       ) : (
                           <div className="divide-y divide-slate-50 max-h-[600px] overflow-y-auto custom-scrollbar p-2">
                               {files.map((file) => (
                                   <div key={file.id} className="p-4 hover:bg-slate-50 transition-colors flex items-center gap-4 group rounded-2xl">
                                       <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center shrink-0 border border-slate-200">
                                            {file.mimeType.includes('folder') ? (
                                                <Folder size={24} className="text-amber-500" />
                                            ) : file.mimeType.includes('image') ? (
                                                <ImageIcon size={24} className="text-purple-500" />
                                            ) : file.mimeType.includes('pdf') ? (
                                                <FileText size={24} className="text-red-500" />
                                            ) : (
                                                <File size={24} className="text-blue-500" />
                                            )}
                                       </div>
                                       
                                       <div className="flex-1 min-w-0">
                                           <h4 className="font-bold text-slate-800 truncate text-sm">{file.name}</h4>
                                           <div className="flex gap-3 text-[10px] text-slate-500 mt-1">
                                               <span className="bg-slate-100 px-2 rounded">{file.mimeType.includes('folder') ? 'مجلد' : file.mimeType.split('/').pop()}</span>
                                               {file.size && <span>{(parseInt(file.size) / 1024).toFixed(1)} KB</span>}
                                               <span>{new Date(file.createdTime).toLocaleDateString('ar-EG')}</span>
                                           </div>
                                       </div>

                                       <div className="flex items-center gap-2">
                                           <a 
                                              href={file.webViewLink} 
                                              target="_blank" 
                                              rel="noreferrer" 
                                              className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-colors" 
                                              title="فتح في Drive"
                                           >
                                               <ExternalLink size={18} />
                                           </a>
                                           <button 
                                              onClick={() => handleDelete(file.id)} 
                                              className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors" 
                                              title="حذف"
                                           >
                                               <Trash2 size={18} />
                                           </button>
                                       </div>
                                   </div>
                               ))}
                           </div>
                       )}
                   </div>
               </div>
           </div>
       )}
    </div>
  );
};

export default DriveManager;
