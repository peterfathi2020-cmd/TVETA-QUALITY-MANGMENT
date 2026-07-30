import { google } from 'googleapis';
import fs from 'fs';

const keyFile = JSON.parse(fs.readFileSync('tveta-quality-firebase-adminsdk.json', 'utf8').catch(() => "{}") || "{}");
// wait, I don't have the JSON file, I just have the env vars!
