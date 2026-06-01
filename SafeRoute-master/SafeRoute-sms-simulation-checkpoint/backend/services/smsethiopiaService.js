const axios = require("axios");

const API_KEY = process.env.SMSETHIOPIA_API_KEY;
const API_URL =
  process.env.SMSETHIOPIA_API_URL ||
  "https://smsethiopia.com/api/sms/send";

async function sendSMSEthiopia(to, message) {
  if (!API_KEY) {
    throw new Error("SMSEthiopia not configured (missing API key)");
  }

  try {
    const response = await axios.post(
      API_URL,
      {
        to,
        message,
      },
      {
        headers: {
          Authorization: `Bearer ${API_KEY}`,
          "Content-Type": "application/json",
        },
      }
    );

    return response.data;
  } catch (err) {
    throw new Error(
      err.response?.data?.message || err.message || "SMSEthiopia failed"
    );
  }
}

module.exports = {
  sendSMSEthiopia,
};