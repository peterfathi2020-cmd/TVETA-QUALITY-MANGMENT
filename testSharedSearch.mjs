import dotenv from 'dotenv';
dotenv.config({ override: true });

import { google } from 'googleapis';
import fs from 'fs';

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

async function testList() {
  const folderQueryStr = 'TVETA_QUALITY_MANAGEMENT';
  const response = await drive.files.list({
    q: `name='${folderQueryStr}' and mimeType='application/vnd.google-apps.folder' and trashed=false`,
    fields: 'files(id, name, owners)',
    includeItemsFromAllDrives: true,
    supportsAllDrives: true,
  });
  console.log("Shared/Global search results:");
  console.dir(response.data.files, {depth: null});
}
testList().catch(console.error);
