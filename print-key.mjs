import dotenv from 'dotenv';
dotenv.config();

console.log("Email:", process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL);
console.log("Raw Key starts with:", process.env.GOOGLE_PRIVATE_KEY?.substring(0, 100));
const pk = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n');
console.log("Parsed Key starts with:", pk?.substring(0, 100));
