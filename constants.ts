
import { SupportMember, QualityOfficer, Sector, Auditor, Visit, PerformanceReport, ReportDocument } from './types';

export const EGYPT_GOVERNORATES = [
  "الإسكندرية", "الإسماعيلية", "أسوان", "أسيوط", "الأقصر", "البحر الأحمر", "البحيرة", "بني سويف", "بورسعيد", 
  "جنوب سيناء", "الجيزة", "الدقهلية", "دمياط", "سوهاج", "السويس", "الشرقية", "شمال سيناء", "الغربية", 
  "الفيوم", "القاهرة", "القليوبية", "قنا", "كفر الشيخ", "مطروح", "المنوفية", "المنيا", "الوادي الجديد"
];

// Mapping Sectors to Governorates for Logic
export const SECTOR_GOVERNORATES_MAP: Record<Sector, string[]> = {
  [Sector.WestDelta]: ["البحيرة", "مطروح", "الإسكندرية", "دمياط"],
  [Sector.CanalSinai]: ["الإسماعيلية", "جنوب سيناء", "شمال سيناء", "بورسعيد", "السويس"],
  [Sector.CentralDelta]: ["الدقهلية", "القليوبية", "المنوفية", "الغربية", "كفر الشيخ", "الشرقية"],
  [Sector.Cairo]: ["الجيزة", "القاهرة", "الفيوم"],
  [Sector.UpperEgypt]: ["الوادي الجديد", "المنيا", "سوهاج", "أسيوط", "أسوان", "الأقصر", "قنا", "بني سويف", "البحر الأحمر"],
  [Sector.IT]: []
};

// Data from Page 1 of PDF
export const SUPPORT_TEAM: SupportMember[] = [
  { id: 1, name: "شيرين علي جاد احمد سالم", phone: "01145643006", sector: Sector.WestDelta, governorates: ["البحيرة", "مطروح", "الإسكندرية", "دمياط"] },
  { id: 2, name: "أميمة مسعد مهدي شلبي", phone: "01554771947", sector: Sector.WestDelta, governorates: ["بورسعيد", "الغربية", "كفر الشيخ"] },
  { id: 3, name: "نعمه سعد عبد الرحمن محمد", phone: "01278200038", sector: Sector.CanalSinai, governorates: ["الإسماعيلية", "جنوب سيناء", "شمال سيناء"] },
  { id: 4, name: "اسامة محمد عبده على سويفى", phone: "01012850998", sector: Sector.CanalSinai, governorates: ["أسوان", "البحر الأحمر", "قنا", "الأقصر"] },
  { id: 5, name: "رشا محمود حماد حمزه", phone: "01024860168", sector: Sector.CentralDelta, governorates: ["الدقهلية", "القليوبية", "المنوفية"] },
  { id: 6, name: "يمني يسرى علي حسن", phone: "01003929767", sector: Sector.CentralDelta, governorates: ["الشرقية", "السويس", "بني سويف"] },
  { id: 7, name: "يارا حمدى محمد عفيفى شاكر", phone: "01096806661", sector: Sector.Cairo, governorates: ["الجيزة", "القاهرة", "الفيوم"] },
  { id: 8, name: "محمد فؤاد احمد", phone: "01002001958", sector: Sector.UpperEgypt, governorates: ["الوادي الجديد", "المنيا", "سوهاج", "أسيوط"] },
  { id: 9, name: "بيتر فتحي حليم ابسخرون", phone: "01200724259", sector: Sector.IT, governorates: [] }
];

// Data from Page 2 of PDF
export const QUALITY_OFFICERS: QualityOfficer[] = [
  { id: 1, name: "مروه فوزي عابد", phone: "01281213052", governorate: "أسوان" },
  { id: 2, name: "رشا عبد الهادى احمد سيد", phone: "1010325309", governorate: "أسيوط" },
  { id: 3, name: "اسامة محمد عبده على سويفى", phone: "01012850998", governorate: "الإسكندرية" },
  { id: 4, name: "نارمين مهران عبدالحسيب", phone: "1094831502", governorate: "الأقصر" },
  { id: 5, name: "خالد عفت محمد محمود", phone: "1099937393", governorate: "الإسماعيلية" },
  { id: 6, name: "هبه محمد عبدالله سيد", phone: "01026668133", governorate: "البحر الأحمر" },
  { id: 7, name: "صلاح عبد الحميد على خضر", phone: "01008382731", governorate: "البحيرة" },
  { id: 8, name: "سامح نسيم عطية درياس", phone: "01203290631", governorate: "الجيزة" },
  { id: 9, name: "وفاء صبحى عبد الحى على", phone: "01029951870", governorate: "الدقهلية" },
  { id: 10, name: "نعمه سعد عبد الرحمن محمد", phone: "01111796965", governorate: "السويس" },
  { id: 11, name: "هبه الله إسماعيل", phone: "1286802209", governorate: "الشرقية" },
  { id: 12, name: "خالد ربيع عطية محمد العشماوي", phone: "01000482821", governorate: "الغربية" },
  { id: 13, name: "نهى حامد محمد عبدالرحمن", phone: "01007829860", governorate: "الفيوم" },
  { id: 14, name: "شيرين على جاد احمد سالم", phone: "01145643006", governorate: "القاهرة" },
  { id: 15, name: "يارا حمدى محمد عفيفى شاكر", phone: "01096806661", governorate: "القليوبية" },
  { id: 16, name: "جمالات بدر محمد الفقي", phone: "1002377081", governorate: "المنوفية" },
  { id: 17, name: "امل على محمد حسان", phone: "01000699849", governorate: "المنيا" },
  { id: 18, name: "محمد كمال حسين علي", phone: "01283557701", governorate: "الوادي الجديد" },
  { id: 19, name: "تامر جمال جميل كامل", phone: "01001730506", governorate: "بني سويف" },
  { id: 20, name: "محمد علي عبد السلام علي", phone: "1225384724", governorate: "بورسعيد" },
  { id: 21, name: "نها عبد الفتاح إبراهيم", phone: "01501069699", governorate: "جنوب سيناء" },
  { id: 22, name: "مني علي محمد العشري", phone: "1066558912", governorate: "دمياط" },
  { id: 23, name: "وفاء فتحى عبد السلام خليل", phone: "01003992672", governorate: "سوهاج" },
  { id: 24, name: "وائل محمود حسين حسونه", phone: "1270099785", governorate: "شمال سيناء" },
  { id: 25, name: "ناهد مهران فايد تمام", phone: "01000669618", governorate: "قنا" },
  { id: 26, name: "شيريهان اسماعيل سعد محمود", phone: "01006295576", governorate: "كفر الشيخ" },
  { id: 27, name: "هند سيد عفيفي محمد", phone: "1224511627", governorate: "مطروح" },
];

// Mock Data for Auditors (To be populated by user)
export const INITIAL_AUDITORS: Auditor[] = [
  { id: '1', name: 'أحمد محمود', governorate: 'القاهرة', specialization: 'تكنولوجيا معلومات', status: 'Active', phone: '0100000001', rating: 4.5 },
  { id: '2', name: 'سارة علي', governorate: 'الإسكندرية', specialization: 'إدارة أعمال', status: 'Active', phone: '0100000002', rating: 4.8 },
  { id: '3', name: 'محمود حسن', governorate: 'أسيوط', specialization: 'صيانة ميكانيكية', status: 'Inactive', phone: '0100000003', rating: 3.2 },
];

// Mock Data for Visits
export const INITIAL_VISITS: Visit[] = [
  { id: 'v1', auditorId: '1', location: 'مركز تدريب شبرا', date: '2023-10-25', status: 'Planned', governorate: 'القاهرة' },
  { id: 'v2', auditorId: '2', location: 'المدرسة الفنية المتقدمة', date: '2023-10-20', status: 'Completed', governorate: 'الإسكندرية' },
  { id: 'v3', auditorId: '3', location: 'مركز تدريب أسيوط المهني', date: '2023-10-22', status: 'Planned', governorate: 'أسيوط' },
];

// Mock Performance Data
export const PERFORMANCE_DATA: PerformanceReport[] = [
  { id: 'p1', month: 'أكتوبر', governorate: 'القاهرة', completionRate: 85, issuesCount: 3, notes: 'أداء جيد' },
  { id: 'p2', month: 'أكتوبر', governorate: 'الإسكندرية', completionRate: 92, issuesCount: 1, notes: 'ممتاز' },
  { id: 'p3', month: 'أكتوبر', governorate: 'أسيوط', completionRate: 70, issuesCount: 5, notes: 'يحتاج دعم' },
  { id: 'p4', month: 'أكتوبر', governorate: 'قنا', completionRate: 78, issuesCount: 2, notes: '' },
  { id: 'p5', month: 'أكتوبر', governorate: 'البحيرة', completionRate: 88, issuesCount: 0, notes: '' },
];

// Mock Data for Reports
export const MOCK_REPORTS: ReportDocument[] = [
  { id: 'r1', title: 'تقرير الأداء الشهري - أكتوبر', type: 'تقرير شهري', date: '2023-10-31', governorate: 'القاهرة', status: 'Approved', auditorId: '1' },
  { id: 'r2', title: 'تقرير زيارة مركز تدريب شبرا', type: 'زيارة ميدانية', date: '2023-10-25', governorate: 'القاهرة', status: 'Approved', auditorId: '1' },
  { id: 'r3', title: 'تقرير الأداء الشهري - أكتوبر', type: 'تقرير شهري', date: '2023-10-31', governorate: 'الإسكندرية', status: 'Pending', auditorId: '2' },
  { id: 'r4', title: 'نموذج تقييم كفاءة مدربين', type: 'تقييم فني', date: '2023-10-20', governorate: 'أسيوط', status: 'Rejected', auditorId: '3' },
  { id: 'r5', title: 'تقرير متابعة البنية التحتية', type: 'متابعة', date: '2023-10-15', governorate: 'الغربية', status: 'Approved', auditorId: '2' },
  { id: 'r6', title: 'تقرير الأداء الشهري - سبتمبر', type: 'تقرير شهري', date: '2023-09-30', governorate: 'القاهرة', status: 'Approved', auditorId: '1' },
];
