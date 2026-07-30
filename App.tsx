import React, { Suspense, lazy, ReactNode, Component, ErrorInfo } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import { Loader2, RefreshCcw } from 'lucide-react';
import { AuthProvider } from './context/AuthContext';
import { useAuth } from './hooks/useAuth';
import { DataProvider } from './context/DataContext';
import { ThemeProvider } from './context/ThemeContext';
import { ToastProvider } from './context/ToastContext';
import { ToastContainer } from './components/ToastContainer';
import InstallPWA from './components/InstallPWA';
import ConnectionStatus from './components/ConnectionStatus';
import Login from './pages/Login';
import { safeLocalStorage } from './services/storage';

// Helper to force a browser reload bypassing the cache by appending a cache-buster query parameter
const forceCleanReload = () => {
  try {
    const currentUrl = new URL(window.location.href);
    currentUrl.searchParams.set('cv', Date.now().toString());
    window.location.replace(currentUrl.toString());
  } catch {
    try {
      window.location.reload();
    } catch {
      // ignore reload failure
    }
  }
};

// Error Boundary to catch render/chunk errors gracefully instead of crashing the whole app silently
class ErrorBoundary extends Component<{ children: ReactNode, fallback?: ReactNode }, { hasError: boolean }> {
  constructor(props: { children: ReactNode, fallback?: ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("ErrorBoundary caught an error", error, errorInfo);
    
    // Auto-reload recovery for ChunkLoadError in case lazyRetry didn't catch it
    const errorMsg = error?.message || "";
    const isChunkError = 
      error?.name === 'ChunkLoadError' || 
      errorMsg.includes('Failed to fetch') ||
      errorMsg.includes('dynamically imported module') || 
      errorMsg.includes('error loading dynamically imported module') ||
      errorMsg.includes('Importing a module script failed') ||
      errorMsg.includes('script error');
      
    if (isChunkError) {
      try {
        const lastReload = safeLocalStorage.getItem('last_chunk_reload');
        const now = Date.now();
        // Prevent infinite loops (only reload if we haven't reloaded in the last 15 seconds)
        if (!lastReload || now - parseInt(lastReload, 10) > 15000) {
          safeLocalStorage.setItem('last_chunk_reload', now.toString());
          console.log("ErrorBoundary detected ChunkLoadError, reloading to recover latest deployment version...");
          forceCleanReload();
        }
      } catch (e) {
        console.error("Failed to trigger reload in ErrorBoundary:", e);
      }
    }
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;
      return (
        <div className="min-h-screen w-full flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-950 p-6 text-center">
          <div className="bg-white dark:bg-slate-900 p-8 rounded-2xl shadow-xl flex flex-col items-center max-w-md w-full border border-slate-200 dark:border-slate-800">
            <div className="bg-red-100 dark:bg-red-900/30 p-4 rounded-full mb-6">
              <RefreshCcw className="text-red-600 dark:text-red-400" size={40} />
            </div>
            <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100 mb-2">عفواً، فشل تحميل الصفحة</h2>
            <p className="text-slate-600 dark:text-slate-400 mb-8 leading-relaxed">
              يبدو أن هناك مشكلة في تحميل جزء من التطبيق. قد يكون السبب تحديثاً جديداً أو مشكلة في الاتصال بالشبكة.
            </p>
            <button
              onClick={() => {
                try {
                  safeLocalStorage.removeItem('last_chunk_reload');
                } catch {
                  // ignore localStorage failure
                }
                forceCleanReload();
              }}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-xl transition-all shadow-md flex items-center justify-center gap-2"
            >
              <RefreshCcw size={20} />
              <span>تحديث الصفحة</span>
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

// Utility to retry lazy imports if network fails (fixes "ChunkLoadError")
const lazyRetry = (importFn: () => Promise<{ default: React.ComponentType }>, retries: number = 3, interval: number = 1000) => {
  return lazy(async () => {
    let attempt = 0;
    while (attempt < retries) {
      try {
        return await importFn();
      } catch (err: unknown) {
        attempt++;
        console.warn(`Chunk load failed (attempt ${attempt}/${retries}). Retrying...`, err);
        
        const error = err as { name?: string; message?: string };
        const errorMsg = error?.message || "";
        const isChunkError = 
          error?.name === 'ChunkLoadError' || 
          errorMsg.includes('Failed to fetch') ||
          errorMsg.includes('dynamically imported module') || 
          errorMsg.includes('error loading dynamically imported module') ||
          errorMsg.includes('Importing a module script failed') ||
          errorMsg.includes('script error');
          
        if (isChunkError) {
          console.log("ChunkLoadError detected during dynamic import. Attempting auto recovery...");
          try {
            const lastReload = safeLocalStorage.getItem('last_chunk_reload');
            const now = Date.now();
            if (!lastReload || now - parseInt(lastReload, 10) > 15000) {
              safeLocalStorage.setItem('last_chunk_reload', now.toString());
              console.log("Reloading browser window to fetch the new deployment assets...");
              forceCleanReload();
              return new Promise(() => {}); // block resolving to let page reload
            }
          } catch {
            // ignore localStorage/reload errors
          }
        }

        if (attempt === retries) {
          console.error("Chunk load failed permanently after all retries.", err);
          throw err;
        }
        await new Promise(resolve => setTimeout(resolve, interval));
      }
    }
    throw new Error("Unexpected error in lazyRetry");
  });
};

// Lazy loading pages with retry
const Dashboard = lazyRetry(() => import('./pages/Dashboard'));
const Team = lazyRetry(() => import('./pages/Team'));
const Auditors = lazyRetry(() => import('./pages/Auditors'));
const Trainers = lazyRetry(() => import('./pages/Trainers'));
const Visits = lazyRetry(() => import('./pages/Visits'));
const Reports = lazyRetry(() => import('./pages/Reports'));
const SmartAudits = lazyRetry(() => import('./pages/AuditManagement'));
const AIAssistant = lazyRetry(() => import('./pages/AIAssistant'));
const SystemBackup = lazyRetry(() => import('./pages/SystemBackup'));
const DriveManager = lazyRetry(() => import('./pages/DriveManager'));
const Settings = lazyRetry(() => import('./pages/Settings'));
const BulkImport = lazyRetry(() => import('./pages/BulkImport'));
const TrainingBags = lazyRetry(() => import('./pages/TrainingBags'));
const TrainingHalls = lazyRetry(() => import('./pages/TrainingHalls'));
const Profile = lazyRetry(() => import('./pages/Profile'));
const Documents = lazyRetry(() => import('./pages/Documents'));
const AuditLogs = lazyRetry(() => import('./pages/AuditLogs'));

const LoadingScreen = () => (
  <div className="h-screen w-full flex items-center justify-center bg-slate-50 dark:bg-slate-950 transition-colors duration-300">
    <div className="flex flex-col items-center gap-6 p-8 rounded-3xl bg-white dark:bg-slate-900 shadow-2xl border border-slate-100 dark:border-slate-800 animate-in fade-in zoom-in duration-500">
      <div className="relative">
        <div className="absolute inset-0 bg-blue-500 rounded-full blur-xl opacity-20 animate-pulse"></div>
        <div className="relative bg-white dark:bg-slate-800 p-4 rounded-full shadow-inner border border-slate-50 dark:border-slate-700">
          <Loader2 className="animate-spin text-blue-600 dark:text-blue-400" size={48} strokeWidth={2.5} />
        </div>
      </div>
      <div className="text-center space-y-2">
        <h2 className="text-xl font-bold text-slate-800 dark:text-slate-200 tracking-tight">TVETA Quality System</h2>
        <p className="text-slate-500 dark:text-slate-400 font-medium text-sm flex items-center justify-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-bounce"></span>
          <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-bounce" style={{ animationDelay: '150ms' }}></span>
          <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-bounce" style={{ animationDelay: '300ms' }}></span>
          <span className="mr-2">جاري تهيئة بيئة العمل...</span>
        </p>
      </div>
    </div>
  </div>
);

// Performance Optimization: 
// Only wrap authenticated routes with DataProvider. 
const ProtectedRoute = ({ children }: { children?: ReactNode }) => {
  const { isAuthenticated, isAuthReady } = useAuth();
  
  if (!isAuthReady) {
    return <LoadingScreen />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" />;
  }

  return (
    <DataProvider>
      {children}
    </DataProvider>
  );
};

// Redirect to Dashboard if already authenticated
const PublicRoute = ({ children }: { children?: ReactNode }) => {
  const { isAuthenticated } = useAuth();
  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }
  return <>{children}</>;
};

// Admin Only Route Protection
const AdminRoute = ({ children }: { children?: ReactNode }) => {
    const { user } = useAuth();
    if (user?.role !== 'admin') {
        return <Navigate to="/" />;
    }
    return <>{children}</>;
};

const AppRoutes = () => {
  return (
    <Routes>
      <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
      <Route
        path="/*"
        element={
          <ProtectedRoute>
            <Layout>
              <ErrorBoundary>
                <Suspense fallback={<LoadingScreen />}>
                  <Routes>
                    <Route path="/" element={<Dashboard />} />
                    <Route path="/support-team" element={<Team />} />
                    <Route path="/quality-officers" element={<Team />} />
                    <Route path="/auditors" element={<Auditors />} />
                    <Route path="/trainers" element={<Trainers />} />
                    <Route path="/visits" element={<Visits />} />
                    <Route path="/smart-audit" element={<SmartAudits />} />
                    <Route path="/reports" element={<Reports />} />
                    <Route path="/ai-assistant" element={<AIAssistant />} />
                    <Route path="/backup" element={<AdminRoute><SystemBackup /></AdminRoute>} />
                    <Route path="/drive" element={<AdminRoute><DriveManager /></AdminRoute>} />
                    <Route path="/settings" element={<AdminRoute><Settings /></AdminRoute>} />
                    <Route path="/bulk-import" element={<AdminRoute><BulkImport /></AdminRoute>} />
                    <Route path="/training-bags" element={<TrainingBags />} />
                    <Route path="/training-halls" element={<TrainingHalls />} />
                    <Route path="/documents" element={<Documents />} />
                    <Route path="/audit-logs" element={<AuditLogs />} />
                    <Route path="/profile" element={<Profile />} />
                    <Route path="*" element={<Navigate to="/" />} />
                  </Routes>
                </Suspense>
              </ErrorBoundary>
            </Layout>
          </ProtectedRoute>
        }
      />
    </Routes>
  );
};

const App = () => {
  return (
    <ThemeProvider>
      <ToastProvider>
        <AuthProvider>
          <HashRouter>
            <ConnectionStatus />
            <AppRoutes />
            <ToastContainer />
            <InstallPWA />
          </HashRouter>
        </AuthProvider>
      </ToastProvider>
    </ThemeProvider>
  );
};

export default App;
