import dotenv from 'dotenv';
dotenv.config({ override: true });
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

// Initialize Drive
const authClient = new google.auth.JWT({
  email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
  key: formatPrivateKey(process.env.GOOGLE_PRIVATE_KEY),
  scopes: ['https://www.googleapis.com/auth/drive']
});
const drive = google.drive({ version: 'v3', auth: authClient });

async function resetDrive() {
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

  console.log("Drive wipe completed successfully!");
}

resetDrive().catch(console.error);
