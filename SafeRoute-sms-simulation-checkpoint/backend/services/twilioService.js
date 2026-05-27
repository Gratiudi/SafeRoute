const twilio = require("twilio");

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const fromNumber = process.env.TWILIO_PHONE_NUMBER;

const client = twilio(accountSid, authToken);

async function sendSMS(to, message) {
  if (!accountSid || !authToken || !fromNumber) {
    throw new Error("Twilio not configured (missing env variables)");
  }

  const result = await client.messages.create({
    body: message,
    from: fromNumber,
    to: to,
  });

  return result; // contains sid, status, etc.
}

module.exports = {
  sendSMS,
};