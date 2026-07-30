import dotenv from 'dotenv';
dotenv.config();
console.log("From process.env directly: ", process.env.GOOGLE_PRIVATE_KEY ? process.env.GOOGLE_PRIVATE_KEY.substring(0, 20) + "..." : "MISSING");
