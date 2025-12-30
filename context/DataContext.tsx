
import React, { createContext, useContext, useState, useEffect, ReactNode, useMemo, useRef } from 'react';
import { 
  Visit, Auditor, ReportDocument, SupportMember, QualityOfficer, Template, EvaluationTemplate, EvaluationSubmission, DynamicFormTemplate, DynamicFormSubmission, AggregatedReport
} from '../types';
import app, { db } from '../services/firebase';
import { collection, doc, setDoc, deleteDoc, onSnapshot, query, orderBy } from 'firebase/firestore';

interface DataActions {
  saveVisit: (visit: Visit) => Promise<void>;
  deleteVisit: (id: string) => Promise<void>;
  saveAuditor: (auditor: Auditor) => Promise<void>;
  deleteAuditor: (id: string) => Promise<void>;
  saveReport: (report: ReportDocument) => Promise<void>;
  saveSupportMember: (member: SupportMember) => Promise<void>;
  deleteSupportMember: (id: number) => Promise<void>;
  saveOfficer: (officer: QualityOfficer) => Promise<void>;
  deleteOfficer: (id: number) => Promise<void>;
  saveFormTemplate: (form: DynamicFormTemplate) => Promise<void>;
}

interface DataContextType {
  visits: Visit[];
  auditors: Auditor[];
  reports: ReportDocument[];
  supportMembers: SupportMember[];
  officers: QualityOfficer[];
  templates: Template[];
  setTemplates: React.Dispatch<React.SetStateAction<Template[]>>;
  evalTemplates: EvaluationTemplate[];
  evalSubmissions: EvaluationSubmission[];
  dynamicForms: DynamicFormTemplate[];
  dynamicSubmissions: DynamicFormSubmission[];
  aggregatedReports: AggregatedReport[];
  lastSaved: Date;
  isSyncing: boolean;
  actions: DataActions;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

// System Defaults (Can be moved to DB later)
const INITIAL_TEMPLATES: Template[] = [
    { id: '1', name: 'استمارة تقييم مدرب', description: 'نموذج لتقييم أداء المدربين داخل القاعات التدريبية.', fileName: 'trainer_eval_v1.docx' },
    { id: '2', name: 'استمارة تقييم مكان التدريب', description: 'نموذج للتأكد من جاهزية وكفاءة قاعات التدريب.', fileName: 'venue_check.docx' },
    { id: '3', name: 'استمارة متابعة العملية التدريبية', description: 'تقرير دوري لمتابعة سير العمل أثناء التدريب.', fileName: 'process_followup.pdf' },
    { id: '4', name: 'نموذج تقرير زيارة ميدانية', description: 'نموذج رسمي لتوثيق الزيارات الميدانية للمراكز.', fileName: 'visit_report.docx' }
];

export const DataProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // Sync state tracking
  const [isSyncing, setIsSyncing] = useState(true); // Default true to show loading initially
  const [lastSaved, setLastSaved] = useState(new Date());

  // App State - Initialize EMPTY to prove real cloud connection
  const [visits, setVisits] = useState<Visit[]>([]);
  const [auditors, setAuditors] = useState<Auditor[]>([]);
  const [reports, setReports] = useState<ReportDocument[]>([]);
  const [supportMembers, setSupportMembers] = useState<SupportMember[]>([]);
  const [officers, setOfficers] = useState<QualityOfficer[]>([]);
  const [dynamicForms, setDynamicForms] = useState<DynamicFormTemplate[]>([]);
  
  // Non-persisted or less critical states
  const [templates, setTemplates] = useState<Template[]>(INITIAL_TEMPLATES);
  const [evalTemplates, setEvalTemplates] = useState<EvaluationTemplate[]>([]);
  const [evalSubmissions, setEvalSubmissions] = useState<EvaluationSubmission[]>([]);
  const [dynamicSubmissions, setDynamicSubmissions] = useState<DynamicFormSubmission[]>([]);
  const [aggregatedReports, setAggregatedReports] = useState<AggregatedReport[]>([]);

  // Track loading of each collection
  const loadingStatus = useRef({
    visits: true,
    auditors: true,
    reports: true,
    support: true,
    officers: true,
    forms: true
  });

  const checkLoading = () => {
    const stillLoading = Object.values(loadingStatus.current).some(s => s);
    setIsSyncing(stillLoading);
  };

  // Generic Subscribe Function
  const subscribe = (collectionName: string, setter: any, orderByField?: string) => {
    let q = query(collection(db, collectionName));
    
    // Apply sorting if requested (requires index in Firestore sometimes, but safe for small datasets)
    // if (orderByField) { q = query(collection(db, collectionName), orderBy(orderByField, 'desc')); }

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const data: any[] = [];
      querySnapshot.forEach((doc) => {
        data.push(doc.data());
      });
      
      // Client-side sort for flexibility without complex indexes
      if (orderByField && data.length > 0) {
         if (orderByField === 'date' || orderByField === 'createdAt') {
             data.sort((a, b) => new Date(b[orderByField]).getTime() - new Date(a[orderByField]).getTime());
         }
      }

      setter(data);
      setLastSaved(new Date());
      
      // Update loading status
      // @ts-ignore
      loadingStatus.current[collectionName === 'dynamicForms' ? 'forms' : collectionName] = false;
      checkLoading();

    }, (error) => {
      console.error(`Error syncing ${collectionName}:`, error);
      // @ts-ignore
      loadingStatus.current[collectionName === 'dynamicForms' ? 'forms' : collectionName] = false;
      checkLoading();
    });
    return unsubscribe;
  };

  // Real-time Listeners
  useEffect(() => {
    const unsubVisits = subscribe('visits', setVisits, 'date');
    const unsubAuditors = subscribe('auditors', setAuditors);
    const unsubReports = subscribe('reports', setReports, 'date');
    const unsubSupport = subscribe('support', setSupportMembers);
    const unsubOfficers = subscribe('officers', setOfficers);
    const unsubForms = subscribe('dynamicForms', setDynamicForms, 'createdAt');

    return () => {
      unsubVisits();
      unsubAuditors();
      unsubReports();
      unsubSupport();
      unsubOfficers();
      unsubForms();
    };
  }, []);

  // --- Actions (Direct Firestore CRUD) ---
  const actions: DataActions = {
    saveVisit: async (visit: Visit) => {
      setIsSyncing(true);
      try {
        await setDoc(doc(db, 'visits', visit.id), visit);
      } catch (error) {
        console.error("Error saving visit:", error);
        alert("فشل الحفظ. تأكد من الاتصال بالإنترنت.");
      } finally {
        setIsSyncing(false);
      }
    },
    deleteVisit: async (id: string) => {
      setIsSyncing(true);
      await deleteDoc(doc(db, 'visits', id));
      setIsSyncing(false);
    },
    saveAuditor: async (auditor: Auditor) => {
        setIsSyncing(true);
        await setDoc(doc(db, 'auditors', auditor.id), auditor);
        setIsSyncing(false);
    },
    deleteAuditor: async (id: string) => {
        setIsSyncing(true);
        await deleteDoc(doc(db, 'auditors', id));
        setIsSyncing(false);
    },
    saveReport: async (report: ReportDocument) => {
        setIsSyncing(true);
        await setDoc(doc(db, 'reports', report.id), report);
        setIsSyncing(false);
    },
    saveSupportMember: async (member: SupportMember) => {
         setIsSyncing(true);
         await setDoc(doc(db, 'support', member.id.toString()), member);
         setIsSyncing(false);
    },
    deleteSupportMember: async (id: number) => {
        setIsSyncing(true);
        await deleteDoc(doc(db, 'support', id.toString()));
        setIsSyncing(false);
    },
    saveOfficer: async (officer: QualityOfficer) => {
        setIsSyncing(true);
        await setDoc(doc(db, 'officers', officer.id.toString()), officer);
        setIsSyncing(false);
    },
    deleteOfficer: async (id: number) => {
        setIsSyncing(true);
        await deleteDoc(doc(db, 'officers', id.toString()));
        setIsSyncing(false);
    },
    saveFormTemplate: async (form: DynamicFormTemplate) => {
         setIsSyncing(true);
         await setDoc(doc(db, 'dynamicForms', form.id), form);
         setIsSyncing(false);
    }
  };

  const contextValue = useMemo(() => ({
      visits, auditors, reports, supportMembers, officers, templates, setTemplates,
      evalTemplates, evalSubmissions, dynamicForms, dynamicSubmissions, aggregatedReports,
      lastSaved, isSyncing, actions
  }), [
      visits, auditors, reports, supportMembers, officers, templates, 
      evalTemplates, evalSubmissions, dynamicForms, dynamicSubmissions, aggregatedReports,
      lastSaved, isSyncing
  ]);

  return (
    <DataContext.Provider value={contextValue}>
      {children}
    </DataContext.Provider>
  );
};

export const useData = () => {
  const context = useContext(DataContext);
  if (!context) throw new Error('useData must be used within a DataProvider');
  return context;
};
