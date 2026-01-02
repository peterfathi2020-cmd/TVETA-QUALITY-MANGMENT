
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

// 3. Restore Data to Firebase (JSON Backup)
export const restoreSystemData = async (jsonFile: File, onProgress: (msg: string) => void): Promise<void> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const content = e.target?.result as string;
        const parsed = JSON.parse(content);
        
        if (!parsed.data) throw new Error("Invalid Backup File Format");

        // Use batch chunks (limit 500 ops per batch)
        const chunks: any[][] = [];
        const allItems: { coll: string, data: any }[] = [];

        // Collect all operations
        if (parsed.data.visits) parsed.data.visits.forEach((d: any) => allItems.push({coll: 'visits', data: d}));
        if (parsed.data.auditors) parsed.data.auditors.forEach((d: any) => allItems.push({coll: 'auditors', data: d}));
        if (parsed.data.supportMembers) parsed.data.supportMembers.forEach((d: any) => allItems.push({coll: 'support', data: d}));
        if (parsed.data.officers) parsed.data.officers.forEach((d: any) => allItems.push({coll: 'officers', data: d}));
        if (parsed.data.reports) parsed.data.reports.forEach((d: any) => allItems.push({coll: 'reports', data: d}));

        // Split into chunks of 450
        for (let i = 0; i < allItems.length; i += 450) {
            chunks.push(allItems.slice(i, i + 450));
        }

        onProgress(`جاري استعادة ${allItems.length} سجل...`);

        // Execute batches sequentially
        for (const chunk of chunks) {
            const batch = writeBatch(db);
            chunk.forEach(item => {
                const ref = doc(db, item.coll, item.data.id.toString());
                batch.set(ref, item.data);
            });
            await batch.commit();
        }

        onProgress("تمت استعادة البيانات بنجاح إلى السحابة!");
        resolve();

      } catch (err) {
        reject(err);
      }
    };
    reader.readAsText(jsonFile);
  });
};

// 4. Import from CSV (Excel)
export const parseCSV = (file: File): Promise<any[]> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const text = e.target?.result as string;
            if (!text) return resolve([]);
            
            const rows = text.split('\n').filter(r => r.trim() !== '');
            const headers = rows[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
            
            const data = rows.slice(1).map(row => {
                // Corrected Regex to handle quoted CSV fields correctly
                const regex = /(?:,|^)("(?:""|[^"])*"|[^",]*)/g;
                const matches: string[] = [];
                let match;
                while ((match = regex.exec(row))) {
                    let val = match[1] || '';
                    if (val.startsWith('"') && val.endsWith('"')) {
                        val = val.slice(1, -1).replace(/""/g, '"');
                    }
                    matches.push(val.trim());
                }
                
                const cols = matches.length > 0 ? matches : row.split(',');
                
                const obj: any = {};
                headers.forEach((h, i) => {
                    if (cols[i] !== undefined) obj[h] = cols[i];
                });
                return obj;
            });
            resolve(data);
        };
        reader.onerror = (err) => reject(err);
        reader.readAsText(file);
    });
};

export const batchImportToFirestore = async (collectionName: string, data: any[]) => {
    const chunks: any[][] = [];
    for (let i = 0; i < data.length; i += 450) {
        chunks.push(data.slice(i, i + 450));
    }

    for (const chunk of chunks) {
        const batch = writeBatch(db);
        chunk.forEach(item => {
            // Ensure ID exists
            const id = item.id || doc(collection(db, collectionName)).id; 
            const ref = doc(db, collectionName, id.toString());
            batch.set(ref, { ...item, id });
        });
        await batch.commit();
    }
};
