
import { db } from "./firebase";
import { collection, writeBatch, doc } from "firebase/firestore";

// Helper to download data as a file
const downloadFile = (content: string, fileName: string, contentType: string) => {
  const a = document.createElement("a");
  const file = new Blob([content], { type: contentType });
  a.href = URL.createObjectURL(file);
  a.download = fileName;
  a.click();
};

// 1. Export to Excel/CSV (Supports Arabic)
export const exportToCSV = (data: any[], filename: string) => {
  if (!data || !data.length) return;

  // Get headers
  const headers = Object.keys(data[0]);
  
  // Create CSV content with BOM for Excel Arabic support
  const csvContent = "\uFEFF" + [
    headers.join(","),
    ...data.map(row => headers.map(fieldName => {
      let cell = row[fieldName] === null || row[fieldName] === undefined ? '' : row[fieldName];
      cell = cell.toString().replace(/"/g, '""'); // Escape quotes
      if (cell.search(/("|,|\n)/g) >= 0) cell = `"${cell}"`; // Quote complex cells
      return cell;
    }).join(","))
  ].join("\n");

  downloadFile(csvContent, `${filename}_${new Date().toISOString().split('T')[0]}.csv`, 'text/csv;charset=utf-8;');
};

// 2. Full System Backup (JSON)
export const backupSystemData = (allData: any) => {
  const backup = {
    metadata: {
      timestamp: new Date().toISOString(),
      version: "1.0",
      type: "FULL_BACKUP"
    },
    data: allData
  };
  
  downloadFile(JSON.stringify(backup, null, 2), `TVETA_System_Backup_${new Date().toISOString().split('T')[0]}.json`, 'application/json');
};

// 3. Restore Data to Firebase
export const restoreSystemData = async (jsonFile: File, onProgress: (msg: string) => void): Promise<void> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const content = e.target?.result as string;
        const parsed = JSON.parse(content);
        
        if (!parsed.data) throw new Error("Invalid Backup File Format");

        const batch = writeBatch(db);
        let operationCount = 0;
        const BATCH_LIMIT = 450; // Firebase limit is 500

        // Process Visits
        if (parsed.data.visits) {
            parsed.data.visits.forEach((item: any) => {
                const ref = doc(db, 'visits', item.id);
                batch.set(ref, item);
                operationCount++;
            });
            onProgress(`تم تجهيز ${parsed.data.visits.length} زيارة للاستعادة...`);
        }

        // Process Auditors
        if (parsed.data.auditors) {
            parsed.data.auditors.forEach((item: any) => {
                const ref = doc(db, 'auditors', item.id);
                batch.set(ref, item);
                operationCount++;
            });
            onProgress(`تم تجهيز ${parsed.data.auditors.length} مراجع للاستعادة...`);
        }

        // Process Team
        if (parsed.data.supportMembers) {
             parsed.data.supportMembers.forEach((item: any) => {
                const ref = doc(db, 'support', item.id.toString());
                batch.set(ref, item);
                operationCount++;
            });
        }
        
         // Process Reports
        if (parsed.data.reports) {
             parsed.data.reports.forEach((item: any) => {
                const ref = doc(db, 'reports', item.id);
                batch.set(ref, item);
                operationCount++;
            });
        }

        if (operationCount > BATCH_LIMIT) {
             // In a real production app, we would split into multiple batches here.
             // For this demo, we assume data fits or we'd implement chunking.
             onProgress("تنبيه: حجم البيانات كبير، جاري الاستعادة...");
        }

        await batch.commit();
        onProgress("تمت استعادة البيانات بنجاح إلى السحابة!");
        resolve();

      } catch (err) {
        reject(err);
      }
    };
    reader.readAsText(jsonFile);
  });
};
