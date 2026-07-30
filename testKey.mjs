import dotenv from 'dotenv';
dotenv.config();

const formatPrivateKey = (key) => {
  if (!key || typeof key !== 'string') return null;
  
  let content = key.trim();
  
  // 1. Handle JSON input
  if (content.startsWith('{')) {
    try {
      const parsed = JSON.parse(content);
      if (parsed.private_key) content = parsed.private_key;
    } catch {
      // ignore
    }
  }

  // 2. Clean up quotes and handles literal \n
  content = content.replace(/^["']|["']$/g, '');
  content = content.replace(/\\n/g, '\n');

  // 4. If it already has headers and newlines, it's likely good
  if (content.includes('-----BEGIN') && content.includes('-----END') && content.includes('\n')) {
    return content;
  }

  // 5. Reconstruction path
  const markerType = content.includes('RSA PRIVATE KEY') ? 'RSA PRIVATE KEY' : 'PRIVATE KEY';
  
  const body = content
    .replace(/-----BEGIN [^-]+-----/g, '')
    .replace(/-----END [^-]+-----/g, '')
    .replace(/[^A-Za-z0-9+/=_-]/g, '')
    .replace(/-/g, '+')
    .replace(/_/g, '/');
    
  if (body.length < 100) return null;

  const chunks = body.match(/.{1,64}/g) || [];
  return `-----BEGIN ${markerType}-----\n${chunks.join('\n')}\n-----END ${markerType}-----\n`;
};

const clientEmail = (process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || '').trim();
const rawKey = (process.env.GOOGLE_PRIVATE_KEY || '').trim();

console.log("Email:", clientEmail);
console.log("Raw Key Exists:", !!rawKey);

const mappedJson = (clientEmail && clientEmail.startsWith('{')) ? clientEmail : (rawKey && rawKey.startsWith('{') ? rawKey : null);
console.log("Mapped JSON:", !!mappedJson);

const privateKey = formatPrivateKey(rawKey);
console.log("Returned PK Exists:", !!privateKey);

if (privateKey) {
   console.log("PK Start:", privateKey.substring(0, 30));
   console.log("PK End:", privateKey.substring(privateKey.length - 30));
}
