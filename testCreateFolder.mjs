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

const rawKey = process.env.GOOGLE_PRIVATE_KEY;
const authClient = new google.auth.JWT({
  email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
  key: formatPrivateKey(rawKey),
  scopes: ['https://www.googleapis.com/auth/drive']
});
const drive = google.drive({ version: 'v3', auth: authClient });

async function testCreateFolder() {
  const targetFolderId = '1OYFmU9NSPJrYkIRdgQTlV4nRAlHqXR1f'; // The shared folder
  console.log("Creating folder in:", targetFolderId);
  
  const response = await drive.files.create({
    requestBody: { name: "test-folder-by-sa", mimeType: 'application/vnd.google-apps.folder', parents: [targetFolderId] },
    fields: 'id, name',
    supportsAllDrives: true
  });
  console.log("Upload successful:", response.data);
}
testCreateFolder().catch(console.error);
