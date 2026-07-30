
import { SupportMember, QualityOfficer, Sector, Auditor, Visit, PerformanceReport, ReportDocument, Trainer } from './types';

export const EGYPT_GOVERNORATES = [
  "الإسكندرية", "الإسماعيلية", "أسوان", "أسيوط", "الأقصر", "البحر الأحمر", "البحيرة", "بني سويف", "بورسعيد", 
  "جنوب سيناء", "الجيزة", "الدقهلية", "دمياط", "سوهاج", "السويس", "الشرقية", "شمال سيناء", "الغربية", 
  "الفيوم", "القاهرة", "القليوبية", "قنا", "كفر الشيخ", "مطروح", "المنوفية", "المنيا", "الوادي الجديد"
];

export const EDUCATION_TYPES = [
  "صناعي",
  "زراعي",
  "تجاري",
  "فندقي",
  "عام"
];

// Mapping Sectors to Governorates for Logic
export const SECTOR_GOVERNORATES_MAP: Record<Sector, string[]> = {
  [Sector.WestDelta]: ["البحيرة", "مطروح", "الإسكندرية", "بورسعيد"],
  [Sector.CanalSinai]: ["السويس", "الإسماعيلية", "جنوب سيناء", "شمال سيناء", "البحر الأحمر", "دمياط"],
  [Sector.CentralDelta]: ["الدقهلية", "المنوفية", "الغربية", "كفر الشيخ", "الشرقية"],
  [Sector.Cairo]: ["الجيزة", "القاهرة", "الفيوم", "بني سويف", "القليوبية", "المنيا"],
  [Sector.UpperEgypt]: ["الوادي الجديد", "سوهاج", "أسيوط", "أسوان", "قنا", "الأقصر"],
  [Sector.IT]: [],
  [Sector.WorkshopCoordinator]: []
};

// Data from Page 1 (Technical Support Team) - Verified against document
export const SUPPORT_TEAM: SupportMember[] = [
  { 
    id: 1, 
    name: "يمني يسرى علي حسن", 
    phone: "01003929767", 
    sector: Sector.WestDelta, 
    governorates: ["البحيرة", "مطروح", "الإسكندرية", "بورسعيد"] 
  },
  { 
    id: 2, 
    name: "منى علي محمد العشري", 
    phone: "01066558912", 
    sector: Sector.CanalSinai, 
    governorates: ["السويس", "الإسماعيلية", "جنوب سيناء", "شمال سيناء", "البحر الأحمر", "دمياط"] 
  },
  { 
    id: 3, 
    name: "رشا محمود حماد حمزه", 
    phone: "01024860168", 
    sector: Sector.CentralDelta, 
    governorates: ["الدقهلية", "المنوفية", "الغربية", "كفر الشيخ", "الشرقية"] 
  },
  { 
    id: 4, 
    name: "يارا حمدى محمد عفيفى شاكر", 
    phone: "01096806661", 
    sector: Sector.Cairo, 
    governorates: ["الجيزة", "القاهرة", "الفيوم", "بني سويف", "القليوبية", "المنيا"] 
  },
  { 
    id: 5, 
    name: "محمد فؤاد احمد", 
    phone: "01002001958", 
    sector: Sector.UpperEgypt, 
    governorates: ["الوادي الجديد", "سوهاج", "أسيوط", "أسوان", "قنا", "الأقصر"] 
  },
  { 
    id: 6, 
    name: "بيتر فتحي حليم ابسخرون", 
    phone: "01200724259", 
    sector: Sector.IT, 
    governorates: [] 
  },
  { 
    id: 7, 
    name: "اسامة محمد عبده على سويفى", 
    phone: "01012850998", 
    sector: Sector.WorkshopCoordinator, 
    governorates: [] 
  },
  { 
    id: 8, 
    name: "هيام حسيني ابراهيم", 
    phone: "01220784649", 
    sector: Sector.WorkshopCoordinator, 
    governorates: [] 
  }
];

// Data from Page 2 (Quality Officers) - Verified against document
export const QUALITY_OFFICERS: QualityOfficer[] = [
  { id: 1, name: "مروه فوزي عابد", phone: "01281213052", governorate: "أسوان" },
  { id: 2, name: "رشا عبد الهادى احمد سيد", phone: "01010325309", governorate: "أسيوط" },
  { id: 3, name: "اسامة محمد عبده على سويفى", phone: "01012850998", governorate: "الإسكندرية" },
  { id: 4, name: "نارمين مهران عبدالحسيب", phone: "01094831502", governorate: "الأقصر" },
  { id: 5, name: "خالد عفت محمد محمود", phone: "01099937393", governorate: "الإسماعيلية" },
  { id: 6, name: "هبه محمد عبدالله سيد", phone: "01026668133", governorate: "البحر الأحمر" },
  { id: 7, name: "صلاح عبد الحميد على خضر", phone: "01008382731", governorate: "البحيرة" },
  { id: 8, name: "سامح نسيم عطية درياس", phone: "01203290631", governorate: "الجيزة" },
  { id: 9, name: "وفاء صبحى عبد الحى على", phone: "01029951870", governorate: "الدقهلية" },
  { id: 10, name: "نعمه سعد عبد الرحمن محمد", phone: "01111796965", governorate: "السويس" },
  { id: 11, name: "هبه الله إسماعيل", phone: "01286802209", governorate: "الشرقية" },
  { id: 12, name: "خالد ربيع عطية محمد العشماوي", phone: "01000482821", governorate: "الغربية" },
  { id: 13, name: "نهى حامد محمد عبدالرحمن", phone: "01007829860", governorate: "الفيوم" },
  { id: 14, name: "شيرين على جاد احمد سالم", phone: "01145643006", governorate: "القاهرة" },
  { id: 15, name: "يارا حمدى محمد عفيفى شاكر", phone: "01096806661", governorate: "القليوبية" },
  { id: 16, name: "جماالت بدر محمد الفقي", phone: "01002377081", governorate: "المنوفية" },
  { id: 17, name: "امل على محمد حسان", phone: "01000699849", governorate: "المنيا" },
  { id: 18, name: "محمد كمال حسين علي", phone: "01283557701", governorate: "الوادي الجديد" },
  { id: 19, name: "تامر جمال جميل كامل", phone: "01001730506", governorate: "بني سويف" },
  { id: 20, name: "محمد علي عبد السالم علي", phone: "01225384724", governorate: "بورسعيد" },
  { id: 21, name: "نها عبد الفتاح إبراهيم", phone: "01501069699", governorate: "جنوب سيناء" },
  { id: 22, name: "مني علي محمد العشري", phone: "01066558912", governorate: "دمياط" },
  { id: 23, name: "وفاء فتحى عبد السالم خليل", phone: "01003992672", governorate: "سوهاج" },
  { id: 24, name: "وائل محمود حسين حسونه", phone: "01270099785", governorate: "شمال سيناء" },
  { id: 25, name: "ناهد مهران فايد تمام", phone: "01000669618", governorate: "قنا" },
  { id: 26, name: "شيريهان اسماعيل سعد محمود", phone: "01006295576", governorate: "كفر الشيخ" },
  { id: 27, name: "هند سيد عفيفي محمد", phone: "01224511627", governorate: "مطروح" },
];

// Mock Data for Auditors (To be populated by user)
export const INITIAL_AUDITORS: Auditor[] = [
  { id: '1', name: 'أحمد محمود', governorate: 'القاهرة', specialization: 'تكنولوجيا معلومات', status: 'Active', phone: '0100000001', rating: 4.5 },
  { id: '2', name: 'سارة علي', governorate: 'الإسكندرية', specialization: 'إدارة أعمال', status: 'Active', phone: '0100000002', rating: 4.8 },
];

// Mock Data for Visits
export const INITIAL_VISITS: Visit[] = [
  { id: 'v1', auditorId: '1', location: 'مركز تدريب شبرا', date: '2023-10-25', status: 'Planned', governorate: 'القاهرة' },
  { id: 'v2', auditorId: '2', location: 'المدرسة الفنية المتقدمة', date: '2023-10-20', status: 'Completed', governorate: 'الإسكندرية' },
];

// Mock Performance Data
export const PERFORMANCE_DATA: PerformanceReport[] = [
  { id: 'p1', month: 'أكتوبر', governorate: 'القاهرة', completionRate: 85, issuesCount: 3, notes: 'أداء جيد' },
  { id: 'p2', month: 'أكتوبر', governorate: 'الإسكندرية', completionRate: 92, issuesCount: 1, notes: 'ممتاز' },
];

// Mock Data for Reports
export const MOCK_REPORTS: ReportDocument[] = [
  { id: 'r1', title: 'تقرير الأداء الشهري - أكتوبر', type: 'تقرير شهري', date: '2023-10-31', governorate: 'القاهرة', status: 'Approved', auditorId: '1' },
];

export const INITIAL_TRAINERS: Trainer[] = [
  {
    id: "1",
    name: "محمد السيد محمد أبوشبانه",
    governorate: "البحيرة",
    type: "صناعي",
    specialization: "الصناعات المعمارية",
    job: "معلم خبير ..مدرسة أبوحمص ث ص بنين",
    nationalId: "27509171800279",
    phone: "01224650288",
    qualification: "دبلوم مهني/ خاص",
    hasTot: true,
    accreditation: "معتمد",
    performance: "متميز",
    participation: "مشارك / متعاون"
  },
  {
    id: "2",
    name: "عزه احمد محمد على نصار",
    governorate: "الشرقية",
    type: "تجاري",
    specialization: "قانون",
    job: "معلم اول ا مدرسه التجاره الجديده المشتركه بالزقازيق",
    nationalId: "27511081300042",
    phone: "01208176029",
    qualification: "بكالوريوس",
    hasTot: true,
    accreditation: "معتمد",
    performance: "متميز",
    participation: "مشارك / متعاون"
  },
  {
    id: "3",
    name: "احمد محمود عبدالحميد ابوركبه",
    governorate: "الإسكندرية",
    type: "صناعي",
    specialization: "ميكانيكا",
    job: "معلم ميكانيكا بمدرسة الراس السوداء الصناعية",
    nationalId: "27002111800493",
    phone: "01224340755",
    qualification: "دبلوم مهني/ خاص",
    hasTot: true,
    accreditation: "غير معتمد",
    performance: "يحتاج الي تدريب واعادة تأهيل",
    participation: "لم يتم تكليفه"
  },
  {
    id: "4",
    name: "ايمان ابراهيم السيد عطيه",
    governorate: "الإسكندرية",
    type: "صناعي",
    specialization: "ملابس جاهزه",
    job: "معلم اول بمدرسة الشهيد محمد نعيم",
    nationalId: "28001180201469",
    phone: "1271950760",
    qualification: "بكالوريوس",
    hasTot: true,
    accreditation: "معتمد",
    performance: "مقبول",
    participation: "لم يتم تكليفه"
  },
  {
    id: "5",
    name: "شاكره مبروك احمد عبدالرحمن",
    governorate: "الشرقية",
    type: "صناعي",
    specialization: "ميكانيكا نظرى",
    job: "معلم اول بمدرسة الشهيد أحمد خليل الصناعية",
    nationalId: "27805091800641",
    phone: "010288035065",
    qualification: "دبلوم مهني/ خاص",
    hasTot: false,
    accreditation: "معتمد",
    performance: "جيد",
    participation: "مشارك / متعاون"
  },
  {
    id: "6",
    name: "رجاء ابراهيم محمود عبد الله",
    governorate: "الإسكندرية",
    type: "فندقي",
    specialization: "فندقى",
    job: "ندب جزئى للمديرية عضو فريق تحسين وضمان الجودة",
    nationalId: "28506211200444",
    phone: "1006267115",
    qualification: "دبلوم مهني/ خاص",
    hasTot: true,
    accreditation: "معتمد",
    performance: "مقبول",
    participation: "لم يتم تكليفه"
  }
];

