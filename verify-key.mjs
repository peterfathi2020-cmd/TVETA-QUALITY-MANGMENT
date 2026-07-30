import crypto from 'crypto';
import dotenv from 'dotenv';
import fs from 'fs';

// Force overwrite
const envConfig = dotenv.parse(fs.readFileSync('.env'));
for (const k in envConfig) {
  process.env[k] = envConfig[k];
}

try {
  let pk = process.env.GOOGLE_PRIVATE_KEY;
  // Format standard PEM
  let content = pk.trim();
  const markerType = content.includes('RSA PRIVATE KEY') ? 'RSA PRIVATE KEY' : 'PRIVATE KEY';
  const body = content.replace(/-----BEGIN [^-]+-----/g, '').replace(/-----END [^-]+-----/g, '').replace(/[^A-Za-z0-9+/=_-]/g, '');
  const chunks = body.match(/.{1,64}/g) || [];
  const formatted = `-----BEGIN ${markerType}-----\n${chunks.join('\n')}\n-----END ${markerType}-----\n`;

  const privateKey = crypto.createPrivateKey(formatted);
  console.log("SUCCESS: Private key is cryptographically valid!");
  console.log("Key details:", privateKey.asymmetricKeyType, privateKey.asymmetricKeyDetails);
} catch (err) {
  console.error("FAILED to parse private key:", err);
}
