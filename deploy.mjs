import { execSync } from 'child_process';
import dotenv from 'dotenv';
import { google } from 'googleapis';
import fs from 'fs';

// Force override existing environment variables with .env values
try {
  const envConfig = dotenv.parse(fs.readFileSync('.env'));
  for (const k in envConfig) {
    process.env[k] = envConfig[k];
  }
} catch (e) {
  console.warn("Could not load .env file directly, relying on process.env:", e);
}

const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
const rawKey = process.env.GOOGLE_PRIVATE_KEY;

if (!email || !rawKey) {
  console.error("Error: GOOGLE_SERVICE_ACCOUNT_EMAIL or GOOGLE_PRIVATE_KEY is missing in .env");
  process.exit(1);
}

// Format the private key correctly
const formatPrivateKey = (key) => {
  if (!key) return null;
  let content = key.trim();
  const markerType = content.includes('RSA PRIVATE KEY') ? 'RSA PRIVATE KEY' : 'PRIVATE KEY';
  const body = content.replace(/-----BEGIN [^-]+-----/g, '').replace(/-----END [^-]+-----/g, '').replace(/[^A-Za-z0-9+/=_-]/g, '');
  const chunks = body.match(/.{1,64}/g) || [];
  return `-----BEGIN ${markerType}-----\n${chunks.join('\n')}\n-----END ${markerType}-----\n`;
};

const formattedKey = formatPrivateKey(rawKey);

async function run() {
  try {
    // 1. Build the production assets
    console.log("Building production assets...");
    execSync('npm run build', { stdio: 'inherit' });
    console.log("Build completed successfully.");

    // 2. Write service account to temp file
    console.log("Setting up service account credentials...");
    const saConfig = {
      client_email: email,
      private_key: formattedKey,
      project_id: "tveta-quality"
    };
    fs.writeFileSync('/tmp/sa.json', JSON.stringify(saConfig));
    
    // 3. Deploy Hosting to Firebase using GOOGLE_APPLICATION_CREDENTIALS
    console.log("Deploying Hosting to Firebase...");
    execSync('npx firebase deploy --only hosting --project tveta-quality --non-interactive', {
      env: {
        ...process.env,
        GOOGLE_APPLICATION_CREDENTIALS: '/tmp/sa.json'
      },
      stdio: 'inherit'
    });
    
    // 4. Deploy rules via REST API
    console.log("Deploying Firestore rules via REST API...");
    const jwtClient = new google.auth.JWT({
      email: email,
      key: formattedKey,
      scopes: ['https://www.googleapis.com/auth/cloud-platform', 'https://www.googleapis.com/auth/firebase']
    });
    const firebaserules = google.firebaserules({ version: 'v1', auth: jwtClient });
    const rulesContent = fs.readFileSync('firestore.rules', 'utf8');
    const rulesetRes = await firebaserules.projects.rulesets.create({
      name: `projects/tveta-quality`,
      requestBody: {
        source: {
          files: [{ name: 'firestore.rules', content: rulesContent }]
        }
      }
    });
    const rulesetName = rulesetRes.data.name;
    await firebaserules.projects.releases.patch({
      name: `projects/tveta-quality/releases/cloud.firestore`,
      requestBody: {
        release: {
          name: `projects/tveta-quality/releases/cloud.firestore`,
          rulesetName: rulesetName
        },
        updateMask: 'rulesetName'
      }
    });
    console.log("Rules deployed successfully!");

    console.log("Deployment completed successfully! 🎉");

  } catch (error) {
    console.error("An error occurred during deployment:", error);
    process.exit(1);
  }
}

run();
