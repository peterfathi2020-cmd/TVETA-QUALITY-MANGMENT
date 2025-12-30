
import React from 'react';
import { Search, Plus, Filter, MoreHorizontal, FileText } from 'lucide-react';
import { AuditStatus } from '../types';

const audits = [
  { id: 'AUD-001', title: 'مراجعة قسم الإنتاج', dept: 'التصنيع', date: '2024-05-15', status: AuditStatus.COMPLETED, auditor: 'أحمد علي' },
  { id: 'AUD-002', title: 'مراجعة الموارد البشرية', dept: 'الإدارة', date: '2024-05-20', status: AuditStatus.IN_PROGRESS, auditor: 'سارة حسن' },
  { id: 'AUD-003', title: 'مراجعة الأمن والسلامة', dept: 'الصيانة', date: '2024-06-01', status: AuditStatus.PLANNED, auditor: 'محمد خليل' },
  { id: 'AUD-004', title: 'مراجعة الجودة - خط 3', dept: 'الجودة', date: '2024-04-28', status: AuditStatus.COMPLETED, auditor: 'أحمد علي' },
];

const AuditList: React.FC = () => {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">قائمة المراجعات</h2>
          <p className="text-gray-500">إدارة وتنظيم كافة مهام المراجعة الداخلية</p>
        </div>
        <button className="flex items-center justify-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors shadow-sm">
          <Plus size={20} />
          <span>مراجعة جديدة</span>
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {/* Filters */}
        <div className="p-4 border-b border-gray-100 flex flex-wrap gap-4 items-center justify-between">
          <div className="relative flex-1 min-w-[300px]">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input 
              type="text" 
              placeholder="البحث في المراجعات..."
              className="w-full pr-10 pl-4 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <button className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50">
            <Filter size={18} />
            <span>تصفية</span>
          </button>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-right">
            <thead>
              <tr className="bg-gray-50 text-gray-500 text-sm font-semibold border-b border-gray-100">
                <th className="px-6 py-4">رقم المراجعة</th>
                <th className="px-6 py-4">العنوان</th>
                <th className="px-6 py-4">القسم</th>
                <th className="px-6 py-4">التاريخ</th>
                <th className="px-6 py-4">رئيس الفريق</th>
                <th className="px-6 py-4">الحالة</th>
                <th className="px-6 py-4"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {audits.map((audit) => (
                <tr key={audit.id} className="hover:bg-gray-50 transition-colors group">
                  <td className="px-6 py-4 font-medium text-blue-600">{audit.id}</td>
                  <td className="px-6 py-4 text-gray-800 font-medium">{audit.title}</td>
                  <td className="px-6 py-4 text-gray-600">{audit.dept}</td>
                  <td className="px-6 py-4 text-gray-600">{audit.date}</td>
                  <td className="px-6 py-4 text-gray-600">{audit.auditor}</td>
                  <td className="px-6 py-4">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                      audit.status === AuditStatus.COMPLETED ? 'bg-emerald-100 text-emerald-700' :
                      audit.status === AuditStatus.IN_PROGRESS ? 'bg-blue-100 text-blue-700' :
                      'bg-gray-100 text-gray-700'
                    }`}>
                      {audit.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-left">
                    <button className="p-1 hover:bg-gray-200 rounded text-gray-400 group-hover:text-gray-600">
                      <MoreHorizontal size={18} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AuditList;
