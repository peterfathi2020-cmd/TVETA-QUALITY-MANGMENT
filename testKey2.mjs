const envVal = process.env.GOOGLE_PRIVATE_KEY || '';
console.log("process.env.GOOGLE_PRIVATE_KEY length:", envVal.length);
if (envVal.length < 50) {
  console.log("It's too short, probably just an API key:", envVal);
}
