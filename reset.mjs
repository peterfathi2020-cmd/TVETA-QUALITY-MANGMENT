import dotenv from 'dotenv';
dotenv.config({ override: true });
import admin from 'firebase-admin';
import { google } from 'googleapis';

const formatPrivateKey = (key) => {
  if (!key || typeof key !== 'string') return null;
  let content = key.trim();
  content = content.replace(/^["']|["']$/g, '');
  content = content.replace(/\\n/g, '\n');
  if (content.includes('-----BEGIN') && content.includes('-----END') && content.includes('\n')) {
    return content;
  }
  const markerType = content.includes('RSA PRIVATE KEY') ? 'RSA PRIVATE KEY' : 'PRIVATE KEY';
  const body = content.replace(/-----BEGIN [^-]+-----/g, '').replace(/-----END [^-]+-----/g, '').replace(/[^A-Za-z0-9+/=_-]/g, '').replace(/-/g, '+').replace(/_/g, '/');
  if (body.length < 100) return null;
  const chunks = body.match(/.{1,64}/g) || [];
  return `-----BEGIN ${markerType}-----\n${chunks.join('\n')}\n-----END ${markerType}-----\n`;
};

// Initialize Firebase
const clientEmail = (process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || '').trim();
const privateKey = formatPrivateKey(process.env.GOOGLE_PRIVATE_KEY);
if (clientEmail && privateKey) {
    console.log("Initializing firebase-admin with Service Account credentials");
    admin.initializeApp({
        credential: admin.credential.cert({
            projectId: 'tveta-quality',
            clientEmail,
            privateKey,
        }),
    });
} else {
    console.log("Initializing firebase-admin WITHOUT Service Account (Using App Default)");
    admin.initializeApp({ projectId: 'tveta-quality' });
}

const db = admin.firestore();

// Initialize Drive
const authClient = new google.auth.JWT({
  email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
  key: formatPrivateKey(process.env.GOOGLE_PRIVATE_KEY),
  scopes: ['https://www.googleapis.com/auth/drive']
});
const drive = google.drive({ version: 'v3', auth: authClient });

async function resetAll() {
  console.log("Starting full reset...");
  
  // 1. Reset Firestore
  const collectionsToClear = [
      'visits', 'auditors', 'reports', 'support', 'officers', 
      'templates', 'evalTemplates', 'dynamicForms', 'dynamicSubmissions',
      'audits', 'defects', 'forms', 'submissions'
  ];

  for (const colName of collectionsToClear) {
      console.log(`Clearing collection: ${colName}`);
      const snapshot = await db.collection(colName).get();
      const batch = db.batch();
      snapshot.docs.forEach((doc) => {
          batch.delete(doc.ref);
      });
      if (!snapshot.empty) await batch.commit();
      console.log(`Cleared ${snapshot.size} documents from ${colName}`);
  }

  console.log("Clearing non-admin users from 'users' collection...");
  const usersSnapshot = await db.collection('users').get();
  const usersBatch = db.batch();
  let deletedUsersCount = 0;
  usersSnapshot.docs.forEach((doc) => {
      const userData = doc.data() || {};
      const role = userData.role || '';
      const email = (userData.email || '').toLowerCase().trim();
      
      // Keep only admins
      const isAdmin = role === 'admin' || 
                      email === 'peterfathi2020@gmail.com' || 
                      email === 'sayedjica2016@gmail.com';
      
      if (!isAdmin) {
          usersBatch.delete(doc.ref);
          deletedUsersCount++;
      }
  });
  if (deletedUsersCount > 0) {
      await usersBatch.commit();
  }
  console.log(`Cleared ${deletedUsersCount} non-admin user accounts.`);

  console.log("Resetting system settings...");
  await db.collection('system').doc('settings').set({ autoBackupVisitsArchive: false });

  // 2. Clear Google Drive
  const targetFolderId = process.env.GOOGLE_DRIVE_FOLDER_ID || '1OYFmU9NSPJrYkIRdgQTlV4nRAlHqXR1f';
  console.log("Emptying Google Drive folder:", targetFolderId);
  const res = await drive.files.list({
      q: `'${targetFolderId}' in parents`,
      supportsAllDrives: true,
      includeItemsFromAllDrives: true,
  });
  
  const files = res.data.files || [];
  console.log(`Found ${files.length} files in Drive to delete...`);
  for (const file of files) {
      await drive.files.delete({ fileId: file.id, supportsAllDrives: true });
      console.log(`Deleted file from drive: ${file.name}`);
  }

  console.log("Full reset completed successfully!");
}

resetAll().catch(console.error);
