import dotenv from 'dotenv';
dotenv.config({ override: true });
import admin from 'firebase-admin';

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

const clientEmail = (process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || '').trim();
const privateKey = formatPrivateKey(process.env.GOOGLE_PRIVATE_KEY);

admin.initializeApp({
  credential: admin.credential.cert({
    projectId: 'tveta-quality-system-2',
    clientEmail,
    privateKey,
  }),
  storageBucket: 'tveta-quality-system-2.firebasestorage.app'
});

async function testFirebaseStorage() {
  const bucket = admin.storage().bucket();
  const file = bucket.file('test-storage.txt');
  await file.save('Hello from Firebase Storage!', { contentType: 'text/plain' });
  console.log('Successfully saved to Firebase Storage.');
  
  const [url] = await file.getSignedUrl({ action: 'read', expires: '03-09-2491' });
  console.log('File URL:', url);
}

testFirebaseStorage().catch(console.error);
