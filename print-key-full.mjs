import dotenv from 'dotenv';
dotenv.config({ override: true });

const key = process.env.GOOGLE_PRIVATE_KEY;
console.log("Key Length:", key?.length);
console.log("Key Newlines:", key?.split('\n').length);
console.log("Key Escaped Newlines:", key?.split('\\n').length);
console.log("Entire Key:\n", key);
