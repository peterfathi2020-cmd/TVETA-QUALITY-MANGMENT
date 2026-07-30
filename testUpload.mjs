import dotenv from 'dotenv';
dotenv.config({ override: true });

import { google } from 'googleapis';
import stream from 'stream';

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
  scopes: ['https://www.googleapis.com/auth/drive'],
  subject: 'peterfathi2020@gmail.com' // DWD Impersonation
});
const drive = google.drive({ version: 'v3', auth: authClient });

async function testUpload() {
  const targetFolderId = '1OYFmU9NSPJrYkIRdgQTlV4nRAlHqXR1f'; // The shared folder
  console.log("Uploading to folder:", targetFolderId);
  
  const bufferStream = new stream.PassThrough();
  bufferStream.end(Buffer.from("Hello world, DWD test."));

  const response = await drive.files.create({
    requestBody: { name: "zero-byte.txt", parents: [targetFolderId] },
    media: { mimeType: "text/plain", body: bufferStream },
    fields: 'id, name',
    supportsAllDrives: true
  });
  console.log("Upload successful:", response.data);
}
testUpload().catch(console.error);
testUpload().catch(console.error);
