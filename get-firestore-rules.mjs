import { google } from 'googleapis';
import dotenv from 'dotenv';
dotenv.config({ override: true });

async function run() {
  try {
    const auth = new google.auth.JWT(
      process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      null,
      process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
      ['https://www.googleapis.com/auth/cloud-platform']
    );

    const firestore = google.firestore({ version: 'v1', auth });
    
    // Get rulesets
    const name = `projects/${process.env.VITE_FIREBASE_PROJECT_ID || 'tveta-quality'}`;
    console.log("Fetching rulesets for:", name);
    
    // Let's use the rules api
    // We can fetch via the googleapis 'firebaserules' service
    const firebaserules = google.firebaserules({ version: 'v1', auth });
    const res = await firebaserules.projects.rulesets.list({ name });
    console.log("Rulesets:");
    console.log(JSON.stringify(res.data, null, 2));

    if (res.data.rulesets && res.data.rulesets.length > 0) {
      const latestRulesetName = res.data.rulesets[0].name;
      console.log("Fetching latest ruleset content:", latestRulesetName);
      const contentRes = await firebaserules.projects.rulesets.get({ name: latestRulesetName });
      console.log("Source:");
      console.log(contentRes.data.source?.files?.[0]?.content);
    }
  } catch (err) {
    console.error("Error fetching rules:", err);
  }
}

run();
