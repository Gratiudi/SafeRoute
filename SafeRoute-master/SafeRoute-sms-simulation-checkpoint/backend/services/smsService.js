// /services/smsService.js

const { sendSMS: sendTwilio } = require("./twilioService");
const { sendSMSEthiopia } = require("./smsethiopiaService");

async function sendSms(to, message) {
  let lastError;

  // 1. Try Twilio first
  try {
    const result = await sendTwilio(to, message);

    return {
      success: true,
      provider: "twilio",
      sid: result.sid,
    };
  } catch (err) {
    console.error("Twilio failed:", err.message);
    lastError = err;
  }

  // 2. Fallback → SMSEthiopia
  try {
    const result = await sendSMSEthiopia(to, message);

    return {
      success: true,
      provider: "smsethiopia",
      result,
    };
  } catch (err) {
    console.error("SMSEthiopia failed:", err.message);
    lastError = err;
  }

  // 3. Both failed → hard failure
  throw new Error("All SMS providers failed: " + lastError?.message);
}

module.exports = { sendSms };