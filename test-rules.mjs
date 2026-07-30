import { initializeTestEnvironment, assertFails, assertSucceeds } from '@firebase/rules-unit-testing';
import * as fs from 'fs';

let testEnv;

async function run() {
  testEnv = await initializeTestEnvironment({
    projectId: "tveta-quality-system-2",
    firestore: {
      rules: fs.readFileSync('firestore.rules', 'utf8'),
    },
  });

  const db = testEnv.authenticatedContext('user_123').firestore();

  try {
    await assertSucceeds(db.collection('system').doc('settings').set({ autoBackupVisitsArchive: false }));
    console.log("Write Succeeded as user_123");
  } catch (e) {
    console.error("Write Failed:", e);
  }

  await testEnv.cleanup();
}

run();
