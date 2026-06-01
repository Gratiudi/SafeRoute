require("dotenv").config();
const express = require("express");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const fetch = require("node-fetch");
const crypto = require("crypto");
const { supabase } = require("./supabaseClient");


const app = express();
const port = process.env.PORT || 4000;

app.use(cors());
app.use(express.json({ limit: "20mb" }));
app.use(express.urlencoded({ limit: "20mb", extended: true }));

// In-memory store for OTPs
const otpStore = new Map();

const MAPBOX_TOKEN = process.env.MAPBOX_TOKEN;
const SMS_PROVIDER = (process.env.SMS_PROVIDER || "auto").toLowerCase();
const SMSETHIOPIA_API_KEY = process.env.SMSETHIOPIA_API_KEY;
const SMSETHIOPIA_API_URL =
  process.env.SMSETHIOPIA_API_URL || "https://smsethiopia.com/api/sms/send";
const EVIDENCE_BUCKET = process.env.SUPABASE_EVIDENCE_BUCKET || "evidence";
const canSendSms =
  typeof SMSETHIOPIA_API_KEY === "string" &&
  SMSETHIOPIA_API_KEY.length > 0 &&
  !SMSETHIOPIA_API_KEY.startsWith("your-");
if (!canSendSms) {
  console.warn("SMSEthiopia not configured. SMS notifications will be simulated.");
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

async function fetchJson(url) {
  const response = await fetch(url);
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`HTTP ${response.status}: ${text}`);
  }
  return response.json();
}

async function mapboxGeocode(name) {
  const queryName = name.toLowerCase().includes("addis ababa")
    ? name
    : `${name}, Addis Ababa, Ethiopia`;

  if (MAPBOX_TOKEN) {
    const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(
      queryName
    )}.json?limit=1&access_token=${MAPBOX_TOKEN}`;
    const data = await fetchJson(url);
    const feature = data?.features?.[0];
    if (!feature || !Array.isArray(feature.center)) return null;
    return { lng: feature.center[0], lat: feature.center[1] };
  }

  const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(
    queryName
  )}`;
  const response = await fetch(url, {
    headers: {
      "User-Agent": "SafeRoute/1.0 (student project)",
    },
  });
  if (!response.ok) return null;
  const data = await response.json();
  const first = data?.[0];
  if (!first) return null;
  return { lng: Number(first.lon), lat: Number(first.lat) };
}

// Calculate distance in meters between two GPS coordinates using Haversine formula
function getDistanceMeters(lat1, lon1, lat2, lon2) {
  const R = 6371e3; // Earth radius in meters
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

async function mapboxDirections(start, end) {
  if (MAPBOX_TOKEN) {
    const url = `https://api.mapbox.com/directions/v5/mapbox/walking/${start.lng},${start.lat};${end.lng},${end.lat}?geometries=geojson&overview=full&alternatives=true&access_token=${MAPBOX_TOKEN}`;
    return fetchJson(url);
  }

  const url = `https://router.project-osrm.org/route/v1/foot/${start.lng},${start.lat};${end.lng},${end.lat}?geometries=geojson&overview=full&alternatives=true`;
  return fetchJson(url);
}

async function getBaseSafetyScore(time_of_day) {
  const { data: factors, error } = await supabase.from("safety_factors").select("risk_score");
  let avgRisk = 5;
  if (!error && factors && factors.length > 0) {
    const sum = factors.reduce((acc, f) => acc + (f.risk_score || 0), 0);
    avgRisk = sum / factors.length;
  }

  const normalizedRisk = avgRisk > 1 ? avgRisk / 10 : avgRisk;
  let baseScore = clamp(1 - normalizedRisk, 0, 1);
  if (time_of_day === "night") {
    baseScore = clamp(baseScore - 0.05, 0, 1);
  } else if (time_of_day === "day") {
    baseScore = clamp(baseScore + 0.05, 0, 1);
  }

  return baseScore;
}

async function fetchUserContacts(user_id) {
  const { data, error } = await supabase
    .from("emergency_contacts")
    .select("contact_id, name, phone_number, relationship")
    .eq("user_id", user_id);

  if (error) {
    console.error("Supabase error:", error);
    return [];
  }

  return data || [];
}

async function fetchUserProfile(user_id) {
  const { data, error } = await supabase
    .from("users")
    .select("full_name, email, phone_number")
    .eq("user_id", user_id)
    .single();

  if (error) {
    console.error("Supabase error:", error);
    return null;
  }

  return data;
}

function toMsisdn(phoneNumber) {
  const digits = String(phoneNumber || "").replace(/[^\d]/g, "");
  if (digits.startsWith("0")) return `+251${digits.slice(1)}`;
  if (digits.startsWith("251")) return `+${digits}`;
  return `+${digits}`;
}

function toSmsethiopiaMsisdn(phoneNumber) {
  return toMsisdn(phoneNumber).replace(/^\+/, "");
}

const { sendSMS: sendTwilioSms } = require("./services/twilioService");

async function sendSmsethiopiaSms(to, body) {
  if (!canSendSms) {
    throw new Error("SMSEthiopia is not configured");
  }

  const response = await fetch(SMSETHIOPIA_API_URL, {
    method: "POST",
    headers: {
      KEY: SMSETHIOPIA_API_KEY,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      msisdn: toSmsethiopiaMsisdn(to),
      text: body,
    }),
  });

  const text = await response.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    // Keep the raw response text for the error below.
  }

  if (!response.ok || json?.status === "error") {
    const errMsg = json?.message || text || `SMSEthiopia HTTP ${response.status}`;
    const err = new Error(errMsg);
    // Tag whitelist errors so callers can fall back gracefully
    if (typeof errMsg === "string" && errMsg.includes("WHITELISTED")) {
      err.code = "SMSETHIOPIA_NOT_WHITELISTED";
    }
    throw err;
  }

  return {
    status: "sent",
    provider: "smsethiopia",
    response: json,
  };
}

async function sendSms(to, body) {
  const msisdn = toMsisdn(to);

  if (SMS_PROVIDER === "smsethiopia") {
    console.log("Sending SMS via SMSEthiopia...");
    return sendSmsethiopiaSms(msisdn, body);
  }

  if (SMS_PROVIDER === "twilio") {
    console.log("Sending SMS via Twilio...");
    const result = await sendTwilioSms(msisdn, body);
    console.log("Twilio success:", result.sid);
    return {
      status: "sent",
      provider: "twilio",
      sid: result.sid,
    };
  }

  try {
    console.log("📲 Sending SMS via Twilio...");

    const result = await sendTwilioSms(msisdn, body);

    console.log("Twilio success:", result.sid);

    return {
      status: "sent",
      provider: "twilio",
      sid: result.sid,
    };
  } catch (err) {
    console.error("❌ Twilio failed:", err.message);

    // Try SMSEthiopia as fallback (skip if Twilio also isn't configured)
    if (canSendSms) {
      try {
        console.log("Falling back to SMSEthiopia...");
        return await sendSmsethiopiaSms(msisdn, body);
      } catch (fallbackErr) {
        // If the number isn't whitelisted on the SMSEthiopia starter plan,
        // log it and drop through to simulation so the alert still fires.
        if (fallbackErr.code === "SMSETHIOPIA_NOT_WHITELISTED") {
          console.warn(
            `SMSEthiopia: ${msisdn} is not whitelisted on this starter campaign. ` +
            "Whitelist it via the SMSEthiopia whitelist API, or upgrade your plan."
          );
        } else {
          console.error("SMSEthiopia fallback failed:", fallbackErr.message);
        }
      }
    }

    console.log(`\n=== SIMULATED SMS TO ${msisdn} ===\n${body}\n==============================\n`);

    return { status: "simulated" };
  }
}

function mapsLink(latitude, longitude) {
  if (latitude === undefined || longitude === undefined) return null;
  const lat = Number(latitude);
  const lng = Number(longitude);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return `https://maps.google.com/?q=${lat},${lng}`;
}

function buildEmergencySms({ alertType, user, latitude, longitude, isEscalation = false }) {
  const name = user?.full_name || "A SafeRoute user";
  const locationUrl = mapsLink(latitude, longitude);
  const reason = isEscalation
    ? "Their medium alert timer expired and escalated to SOS."
    : `${alertType} alert activated.`;
  return [
    `SafeRoute emergency alert from ${name}.`,
    reason,
    locationUrl ? `Location: ${locationUrl}` : null,
    "Please check in immediately.",
  ]
    .filter(Boolean)
    .join(" ");
}

async function notifyContacts(contacts, messageBody) {
  const smsResults = [];

  for (const contact of contacts || []) {
    if (!contact.phone_number) continue;
    try {
      const result = await sendSms(contact.phone_number, messageBody);
      smsResults.push({ contact_id: contact.contact_id, ...result });
    } catch (err) {
      console.error("SMSEthiopia send error:", err);
      smsResults.push({
        contact_id: contact.contact_id,
        status: "failed",
        error: err?.message || "Unable to send SMS",
      });
    }
  }

  return smsResults;
}

async function createEmergencyAlert(user_id, type) {
  const { data, error } = await supabase
    .from("emergency_alerts")
    .insert([
      {
        user_id,
        type,
        status: "Active",
      },
    ])
    .select("*")
    .single();

  if (error) {
    console.error("Supabase error:", error);
    return { error };
  }

  return { data };
}

// Health check (no DB) – use this to confirm server is running
app.get("/", (req, res) => {
  res.json({ ok: true, message: "SafeRoute backend is running" });
});

app.get("/api/health", (req, res) => {
  res.json({ ok: true });
});
 //here

 app.post("/api/test-twilio", async (req, res) => {
   const { phone_number, message } = req.body || {};

   if (!phone_number) {
     return res.status(400).json({ error: "phone_number is required" });
   }

   try {
     const result = await sendTwilioSms(
       phone_number,
       message || "SafeRoute Twilio test message 🚀"
     );

     res.json({
       ok: true,
       sid: result.sid,
       status: result.status,
     });
   } catch (err) {
     console.error("Twilio error:", err);
     res.status(500).json({
       ok: false,
       error: err.message,
     });
   }
 });
// SMS provider smoke test (no database required)
app.post("/api/test-sms", async (req, res) => {
  const { phone_number, message } = req.body || {};
  const cleanPhone = typeof phone_number === "string" ? phone_number.trim() : "";

  if (!cleanPhone) {
    return res.status(400).json({ error: "phone_number is required" });
  }

  const phoneRegex = /^\+?[1-9]\d{1,14}$/;
  if (!phoneRegex.test(cleanPhone)) {
    return res.status(400).json({ error: "Invalid phone number format. Use +251..." });
  }

  try {
    const result = await sendSms(
      cleanPhone,
      message || "SafeRoute test SMS: your SMS provider is connected."
    );
    res.json({ ok: true, phone_number: cleanPhone, sms: result });
  } catch (err) {
    console.error("SMS test error:", err);
    res.status(502).json({ error: err?.message || "Failed to send test SMS" });
  }
});

// JWT auth middleware
function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization || "";
  const [, token] = authHeader.split(" ");

  if (!token) {
    return res.status(401).json({ error: "Missing Authorization header" });
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET || "dev-secret");
    req.user = { user_id: payload.user_id, email: payload.email };
    next();
  } catch (err) {
    console.error("JWT verify error:", err);
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}

// Profile: get current user
app.get("/api/profile", requireAuth, async (req, res) => {
  const { user_id } = req.user;

  const { data, error } = await supabase
    .from("users")
    .select("user_id, full_name, email, phone_number, created_at")
    .eq("user_id", user_id)
    .single();

  if (error) {
    console.error("Supabase error:", error);
    return res.status(400).json({ error: error.message });
  }

  res.json(data);
});

// Profile: update current user
app.put("/api/profile", requireAuth, async (req, res) => {
  const { user_id } = req.user;
  const { full_name, email, phone_number } = req.body || {};

  if (!full_name && !email && !phone_number) {
    return res.status(400).json({ error: "At least one field is required" });
  }

  const updates = {};
  if (full_name) updates.full_name = full_name;
  if (email) updates.email = email;
  if (phone_number) updates.phone_number = phone_number;

  const { data, error } = await supabase
    .from("users")
    .update(updates)
    .eq("user_id", user_id)
    .select("user_id, full_name, email, phone_number")
    .single();

  if (error) {
    console.error("Supabase error:", error);
    return res.status(400).json({ error: error.message });
  }

  res.json(data);
});

// SEND OTP
app.post("/api/auth/send-otp", async (req, res) => {
  const { phone_number } = req.body;
  if (!phone_number) {
    return res.status(400).json({ error: "phone_number is required" });
  }
  const cleanPhone = phone_number.trim();
  const phoneRegex = /^\+[1-9]\d{1,14}$/;
  if (!phoneRegex.test(cleanPhone)) {
    return res.status(400).json({ error: "Invalid phone number format. Must be E.164 (e.g., +251...)" });
  }

  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  otpStore.set(cleanPhone, { otp, expiresAt: Date.now() + 5 * 60 * 1000 });

  if (!canSendSms) {
    console.log(`\n=== SIMULATED OTP FOR ${cleanPhone} ===\n${otp}\n=========================================\n`);
  }
  try {
    await sendSms(cleanPhone, `Your SafeRoute verification code is ${otp}. It expires in 5 minutes.`);
    res.json({ message: "OTP sent successfully" });
  } catch (err) {
    console.error("SMSEthiopia OTP send error:", err);
    otpStore.delete(cleanPhone);
    res.status(502).json({ error: "Failed to send OTP SMS" });
  }
});

// VERIFY OTP
app.post("/api/auth/verify-otp", async (req, res) => {
  const { phone_number, otp } = req.body;
  if (!phone_number || !otp) {
    return res.status(400).json({ error: "phone_number and otp are required" });
  }
  const cleanPhone = phone_number.trim();
  const stored = otpStore.get(cleanPhone);
  
  if (!stored) {
    return res.status(400).json({ error: "No OTP found for this number" });
  }
  if (Date.now() > stored.expiresAt) {
    otpStore.delete(cleanPhone);
    return res.status(400).json({ error: "OTP expired" });
  }
  if (stored.otp !== otp.trim()) {
    return res.status(400).json({ error: "Invalid OTP" });
  }
  
  otpStore.delete(cleanPhone);
  res.json({ message: "OTP verified successfully" });
});

// REGISTER
app.post("/api/auth/register", async (req, res) => {
  const { full_name, email, phone_number, password } = req.body;
  const cleanEmail = typeof email === "string" ? email.trim().toLowerCase() : null;
  const cleanPhone = typeof phone_number === "string" ? phone_number.trim() : null;
  const cleanName = typeof full_name === "string" ? full_name.trim() : full_name;

  if (!cleanName || !password) {
    return res.status(400).json({ error: "full_name and password are required" });
  }

  if (!cleanEmail && !cleanPhone) {
    return res.status(400).json({ error: "email or phone_number is required" });
  }

  if (cleanEmail) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/i;
    if (!emailRegex.test(cleanEmail)) {
      return res.status(400).json({ error: "Invalid email format" });
    }
  }

  if (cleanPhone) {
    const phoneRegex = /^\+[1-9]\d{1,14}$/;
    if (!phoneRegex.test(cleanPhone)) {
      return res.status(400).json({ error: "Invalid phone number format" });
    }
  }

  const password_hash = await bcrypt.hash(password, 10);

  const { data, error } = await supabase
    .from('users')
    .insert([
      {
        full_name: cleanName,
        email: cleanEmail || null,
        phone_number: cleanPhone || null,
        password: password_hash,
      },
    ])
    .select('user_id, full_name, email')
    .single();

  if (error) {
    console.error(error);
    return res.status(400).json({ error: error.message });
  }

  res.status(201).json(data);
});

// LOGIN
app.post('/api/auth/login', async (req, res) => {
  const { email, phone_number, identifier, password } = req.body;
  const loginValue = identifier || email || phone_number;

  if (!loginValue || !password) {
    return res.status(400).json({ error: 'email/phone and password are required' });
  }

  const { data: user, error } = await supabase
    .from('users')
    .select('*')
    .or(`email.eq.${loginValue},phone_number.eq.${loginValue}`)
    .single();

  if (error || !user) {
    return res.status(400).json({ error: 'Invalid email or password' });
  }

  const matches = await bcrypt.compare(password, user.password);
  if (!matches) {
    return res.status(400).json({ error: 'Invalid email or password' });
  }

  const token = jwt.sign(
    { user_id: user.user_id, email: user.email },
    process.env.JWT_SECRET || 'dev-secret',
    { expiresIn: '7d' }
  );

  res.json({
    token,
    user: {
      user_id: user.user_id,
      full_name: user.full_name,
      email: user.email,
    },
  });
});

// VERIFY PASSWORD — confirms the current user's password without re-issuing a token.
// Used by the app to gate access to sensitive sections (e.g. Evidence tab).
app.post('/api/auth/verify-password', requireAuth, async (req, res) => {
  const { user_id } = req.user;
  const { password } = req.body;

  if (!password) {
    return res.status(400).json({ error: 'password is required' });
  }

  const { data: user, error } = await supabase
    .from('users')
    .select('password')
    .eq('user_id', user_id)
    .single();

  if (error || !user) {
    return res.status(404).json({ error: 'User not found' });
  }

  const matches = await bcrypt.compare(password, user.password);
  if (!matches) {
    return res.status(401).json({ error: 'Incorrect password' });
  }

  res.json({ ok: true });
});

// List current user's routes (protected)
app.get("/api/routes", requireAuth, async (req, res) => {
  const { user_id } = req.user;

  const { data, error } = await supabase
    .from("routes")
    .select("*")
    .eq("user_id", user_id)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Supabase error:", error);
    return res.status(500).json({ error: error.message });
  }

  res.json(data);
});

// Create a route for current user (protected)
app.post("/api/routes", requireAuth, async (req, res) => {
  const { user_id } = req.user;
  const { distance, duration, safety_score } = req.body;

  const normalizedSafety =
    safety_score === undefined || safety_score === null
      ? null
      : clamp(Number(safety_score), 0, 1);

  const { data, error } = await supabase
    .from("routes")
    .insert([
      {
        user_id,
        distance,
        duration,
        safety_score: normalizedSafety,
      },
    ])
    .select("*")
    .single();

  if (error) {
    console.error("Supabase error:", error);
    return res.status(400).json({ error: error.message });
  }

  res.status(201).json(data);
});

// Get current user's emergency contacts (protected)
app.get("/api/emergency-contacts", requireAuth, async (req, res) => {
  const { user_id } = req.user;

  const { data, error } = await supabase
    .from("emergency_contacts")
    .select("*")
    .eq("user_id", user_id)
    .order("contact_id", { ascending: true });

  if (error) {
    console.error("Supabase error:", error);
    return res.status(500).json({ error: error.message });
  }

  res.json(data);
});

// Create an emergency contact for current user (protected)
app.post("/api/emergency-contacts", requireAuth, async (req, res) => {
  const { user_id } = req.user;
  const { name, phone_number, relationship } = req.body;

  if (!name || !phone_number) {
    return res.status(400).json({ error: "name and phone_number are required" });
  }

  const cleanPhone = phone_number.trim();
  const phoneRegex = /^\+[1-9]\d{1,14}$/;
  if (!phoneRegex.test(cleanPhone)) {
    return res.status(400).json({ error: "Invalid phone number format. Must be E.164 (e.g., +251...)" });
  }

  const { data, error } = await supabase
    .from("emergency_contacts")
    .insert([
      {
        user_id,
        name,
        phone_number,
        relationship: relationship || null,
      },
    ])
    .select("*")
    .single();

  if (error) {
    console.error("Supabase error:", error);
    return res.status(400).json({ error: error.message });
  }

  res.status(201).json(data);
});

// Update an emergency contact for current user (protected)
app.put("/api/emergency-contacts/:id", requireAuth, async (req, res) => {
  const { user_id } = req.user;
  const contactId = req.params.id;
  const { name, phone_number, relationship } = req.body || {};

  if (!contactId) {
    return res.status(400).json({ error: "Invalid contact id" });
  }

  if (!name && !phone_number && relationship === undefined) {
    return res.status(400).json({ error: "At least one field is required" });
  }

  const updates = {};
  if (name) updates.name = name;
  if (phone_number) {
    const cleanPhone = phone_number.trim();
    const phoneRegex = /^\+[1-9]\d{1,14}$/;
    if (!phoneRegex.test(cleanPhone)) {
      return res.status(400).json({ error: "Invalid phone number format. Must be E.164 (e.g., +251...)" });
    }
    updates.phone_number = cleanPhone;
  }
  if (relationship !== undefined) updates.relationship = relationship || null;

  const { data, error } = await supabase
    .from("emergency_contacts")
    .update(updates)
    .eq("contact_id", contactId)
    .eq("user_id", user_id)
    .select("*")
    .single();

  if (error) {
    console.error("Supabase error:", error);
    return res.status(400).json({ error: error.message });
  }

  res.json(data);
});

// Delete an emergency contact for current user (protected)
app.delete("/api/emergency-contacts/:id", requireAuth, async (req, res) => {
  const { user_id } = req.user;
  const contactId = req.params.id;

  if (!contactId) {
    return res.status(400).json({ error: "Invalid contact id" });
  }

  const { error } = await supabase
    .from("emergency_contacts")
    .delete()
    .eq("contact_id", contactId)
    .eq("user_id", user_id);

  if (error) {
    console.error("Supabase error:", error);
    return res.status(400).json({ error: error.message });
  }

  res.status(204).send();
});

// Medium alert: start countdown window
app.post("/api/medium/start", requireAuth, async (req, res) => {
  const { user_id } = req.user;
  const { duration_seconds } = req.body || {};
  const duration = clamp(Number(duration_seconds || 60), 15, 300);

  const { data: alert, error } = await supabase
    .from("emergency_alerts")
    .insert([
      {
        user_id,
        type: "Medium",
        status: "Active",
      },
    ])
    .select("*")
    .single();

  if (error) {
    console.error("Supabase error:", error);
    return res.status(400).json({ error: error.message });
  }

  const started_at = new Date(alert.timestamp || new Date().toISOString());
  const expires_at = new Date(started_at.getTime() + duration * 1000).toISOString();

  res.status(201).json({
    alert_id: alert.alert_id,
    status: alert.status,
    started_at: alert.timestamp,
    expires_at,
    duration_seconds: duration,
  });
});

// Medium alert: user confirms they are safe
app.post("/api/medium/confirm", requireAuth, async (req, res) => {
  const { user_id } = req.user;
  const { alert_id } = req.body || {};

  if (!alert_id) {
    return res.status(400).json({ error: "alert_id is required" });
  }

  const { data, error } = await supabase
    .from("emergency_alerts")
    .update({ status: "Resolved" })
    .eq("alert_id", alert_id)
    .eq("user_id", user_id)
    .eq("type", "Medium")
    .select("*")
    .single();

  if (error) {
    console.error("Supabase error:", error);
    return res.status(400).json({ error: error.message });
  }

  res.json(data);
});

// Medium alert: escalation to SOS (called when countdown expires)
app.post("/api/medium/escalate", requireAuth, async (req, res) => {
  const { user_id } = req.user;
  const { alert_id, latitude, longitude } = req.body || {};

  if (!alert_id) {
    return res.status(400).json({ error: "alert_id is required" });
  }

  const { data: medium, error: mediumError } = await supabase
    .from("emergency_alerts")
    .select("*")
    .eq("alert_id", alert_id)
    .eq("user_id", user_id)
    .eq("type", "Medium")
    .single();

  if (mediumError || !medium) {
    return res.status(404).json({ error: "Medium alert not found" });
  }

  if (medium.status === "Resolved") {
    return res.status(409).json({ error: "Medium alert already resolved" });
  }

  await supabase
    .from("emergency_alerts")
    .update({ status: "Resolved" })
    .eq("alert_id", alert_id);

  const { data: sosAlert, error: sosError } = await supabase
    .from("emergency_alerts")
    .insert([{ user_id, type: "SOS", status: "Active" }])
    .select("*")
    .single();

  if (sosError) {
    console.error("Supabase error:", sosError);
    return res.status(400).json({ error: sosError.message });
  }

  const contacts = await fetchUserContacts(user_id);
  const user = await fetchUserProfile(user_id);
  const smsResults = await notifyContacts(
    contacts,
    buildEmergencySms({
      alertType: "SOS",
      user,
      latitude,
      longitude,
      isEscalation: true,
    })
  );

  res.status(201).json({ medium_resolved: true, sos_alert: sosAlert, sms: smsResults });
});

// Location sharing: start a share session
app.post("/api/location/share/start", requireAuth, async (req, res) => {
  const { user_id } = req.user;
  const share_code = crypto.randomBytes(6).toString("hex");

  await supabase
    .from("location_shares")
    .update({ is_active: false, ended_at: new Date().toISOString() })
    .eq("user_id", user_id)
    .eq("is_active", true);

  const { data, error } = await supabase
    .from("location_shares")
    .insert([{ user_id, share_code, is_active: true }])
    .select("*")
    .single();

  if (error) {
    console.error("Supabase error:", error);
    return res.status(400).json({ error: error.message });
  }

  const share_url = `${req.protocol}://${req.get("host")}/api/location/share/${share_code}`;
  res.status(201).json({ ...data, share_url });
});

// Location sharing: stop a share session
app.post("/api/location/share/stop", requireAuth, async (req, res) => {
  const { user_id } = req.user;
  const { share_id, share_code } = req.body || {};

  if (!share_id && !share_code) {
    return res.status(400).json({ error: "share_id or share_code is required" });
  }

  let query = supabase
    .from("location_shares")
    .update({ is_active: false, ended_at: new Date().toISOString() })
    .eq("user_id", user_id);

  if (share_id) {
    query = query.eq("share_id", share_id);
  } else {
    query = query.eq("share_code", share_code);
  }

  const { data, error } = await query.select("*").single();
  if (error) {
    console.error("Supabase error:", error);
    return res.status(400).json({ error: error.message });
  }

  res.json(data);
});

// Location sharing: update current position
app.post("/api/location/share/update", requireAuth, async (req, res) => {
  const { user_id } = req.user;
  const { share_code, latitude, longitude } = req.body || {};

  if (!share_code || latitude === undefined || longitude === undefined) {
    return res.status(400).json({ error: "share_code, latitude, and longitude are required" });
  }

  const { data: share, error: shareError } = await supabase
    .from("location_shares")
    .select("share_id")
    .eq("user_id", user_id)
    .eq("share_code", share_code)
    .eq("is_active", true)
    .single();

  if (shareError || !share) {
    return res.status(403).json({ error: "Active share not found for this user" });
  }

  const { data, error } = await supabase
    .from("location_updates")
    .insert([
      {
        share_id: share.share_id,
        latitude,
        longitude,
      },
    ])
    .select("*")
    .single();

  if (error) {
    console.error("Supabase error:", error);
    return res.status(400).json({ error: error.message });
  }

  res.status(201).json(data);
});

// Location sharing: list active shares
app.get("/api/location/share", requireAuth, async (req, res) => {
  const { user_id } = req.user;

  const { data, error } = await supabase
    .from("location_shares")
    .select("*")
    .eq("user_id", user_id)
    .order("started_at", { ascending: false });

  if (error) {
    console.error("Supabase error:", error);
    return res.status(400).json({ error: error.message });
  }

  res.json(data);
});

// Location sharing: public lookup by share code (no auth)
app.get("/api/location/share/:share_code", async (req, res) => {
  const { share_code } = req.params;

  const { data: share, error: shareError } = await supabase
    .from("location_shares")
    .select("share_id, share_code, is_active, started_at, ended_at")
    .eq("share_code", share_code)
    .single();

  if (shareError || !share) {
    return res.status(404).json({ error: "Share not found" });
  }

  const { data: updates, error: updatesError } = await supabase
    .from("location_updates")
    .select("latitude, longitude, captured_at")
    .eq("share_id", share.share_id)
    .order("captured_at", { ascending: false })
    .limit(1);

  if (updatesError) {
    console.error("Supabase error:", updatesError);
    return res.status(400).json({ error: updatesError.message });
  }

  res.json({
    share,
    latest: updates?.[0] || null,
  });
});

// Start SOS alert (EmergencyAlert) for current user
app.post("/api/sos/start", requireAuth, async (req, res) => {
  const { user_id } = req.user;
  const { type, latitude, longitude } = req.body || {};

  const alertType = type === "Medium" ? "Medium" : "SOS";
  const { data, error } = await supabase
    .from("emergency_alerts")
    .insert([
      {
        user_id,
        type: alertType,
        status: "Active",
      },
    ])
    .select("*")
    .single();

  if (error) {
    console.error("Supabase error:", error);
    return res.status(400).json({ error: error.message });
  }

  const contacts = await fetchUserContacts(user_id);
  const user = await fetchUserProfile(user_id);
  const smsResults = await notifyContacts(
    contacts,
    buildEmergencySms({
      alertType: data.type,
      user,
      latitude,
      longitude,
    })
  );

  res.status(201).json({
    alert: data,
    contacts: contacts || [],
    sms: smsResults,
  });
});

// Stop / complete SOS alert for current user
app.post("/api/sos/stop", requireAuth, async (req, res) => {
  const { user_id } = req.user;
  const { alert_id } = req.body || {};

  if (!alert_id) {
    return res.status(400).json({ error: "alert_id is required" });
  }

  const { data, error } = await supabase
    .from("emergency_alerts")
    .update({
      status: "Resolved",
    })
    .eq("alert_id", alert_id)
    .eq("user_id", user_id)
    .select("*")
    .single();

  if (error) {
    console.error("Supabase error:", error);
    return res.status(400).json({ error: error.message });
  }

  res.json(data);
});

// Attach emergency evidence (audio/photo) to an alert
app.post("/api/sos/evidence", requireAuth, async (req, res) => {
  const { user_id } = req.user;
  const { alert_id, type, file_path, timestamp, file_base64 } = req.body || {};

  if (!alert_id || !type || !file_path) {
    return res
      .status(400)
      .json({ error: "alert_id, type and file_path are required" });
  }

  // Ensure alert belongs to current user
  const { error: alertError } = await supabase
    .from("emergency_alerts")
    .select("alert_id")
    .eq("alert_id", alert_id)
    .eq("user_id", user_id)
    .single();

  if (alertError) {
    console.error("Supabase error:", alertError);
    return res.status(403).json({ error: "Alert not found for this user" });
  }

  // If a base64 file payload is sent, upload it to Supabase Storage
  if (file_base64) {
    try {
      const fileBuffer = Buffer.from(file_base64, "base64");
      const contentType = type === "Audio" ? "audio/m4a" : "image/jpeg";

      let { error: uploadError } = await supabase.storage
        .from(EVIDENCE_BUCKET)
        .upload(file_path, fileBuffer, {
          contentType,
          upsert: true,
        });

      // If the bucket doesn't exist surface a clear message — it must be
      // created manually in the Supabase dashboard (Storage > New bucket)
      // because the backend uses the anon key which cannot manage buckets.
      if (uploadError && uploadError.message?.toLowerCase().includes("bucket not found")) {
        console.error(
          `Supabase Storage bucket '${EVIDENCE_BUCKET}' does not exist. ` +
          "Please create it in the Supabase dashboard: Storage → New bucket → " +
          `name it '${EVIDENCE_BUCKET}', set it to private.`
        );
      }

      if (uploadError) {
        console.error("Supabase Storage error during upload:", uploadError);
        return res.status(500).json({ error: `Storage upload failed: ${uploadError.message}` });
      }
    } catch (err) {
      console.error("Failed to parse/upload base64 payload:", err);
      return res.status(500).json({ error: `Storage upload failed: ${err.message}` });
    }
  }

  const { data, error } = await supabase
    .from("emergency_evidence")
    .insert([
      {
        alert_id,
        type,
        file_path,
        timestamp: timestamp || new Date().toISOString(),
      },
    ])
    .select("*")
    .single();

  if (error) {
    console.error("Supabase error:", error);
    return res.status(400).json({ error: error.message });
  }

  res.status(201).json(data);
});

// Evidence list for a specific alert (protected)
app.get("/api/sos/history/:alert_id/evidence", requireAuth, async (req, res) => {
  const { user_id } = req.user;
  const alertId = req.params.alert_id;

  if (!alertId) {
    return res.status(400).json({ error: "Invalid alert id" });
  }

  const { data: alert, error: alertError } = await supabase
    .from("emergency_alerts")
    .select("alert_id")
    .eq("alert_id", alertId)
    .eq("user_id", user_id)
    .single();

  if (alertError || !alert) {
    return res.status(403).json({ error: "Alert not found for this user" });
  }

  const { data, error } = await supabase
    .from("emergency_evidence")
    .select("*")
    .eq("alert_id", alertId)
    .order("timestamp", { ascending: true });

  if (error) {
    console.error("Supabase error:", error);
    return res.status(400).json({ error: error.message });
  }

  res.json(data);
});

// Generate a short-lived signed URL for a private evidence file (protected)
// GET /api/sos/evidence/signed-url?file_path=evidence/123/audio_xyz.m4a
app.get("/api/sos/evidence/signed-url", requireAuth, async (req, res) => {
  const { user_id } = req.user;
  const { file_path } = req.query;

  if (!file_path || typeof file_path !== "string") {
    return res.status(400).json({ error: "file_path query parameter is required" });
  }

  // Verify the path belongs to an alert owned by this user:
  // file paths look like "evidence/<alert_id>/audio_xxx.m4a"
  const pathParts = file_path.split("/");
  const alertIdFromPath = pathParts.length >= 2 ? pathParts[1] : null;

  if (alertIdFromPath) {
    const { error: alertError } = await supabase
      .from("emergency_alerts")
      .select("alert_id")
      .eq("alert_id", alertIdFromPath)
      .eq("user_id", user_id)
      .single();

    if (alertError) {
      return res.status(403).json({ error: "Access denied to this evidence file" });
    }
  }

  // Create a signed URL valid for 15 minutes
  const { data, error } = await supabase.storage
    .from(EVIDENCE_BUCKET)
    .createSignedUrl(file_path, 60 * 15);

  if (error || !data?.signedUrl) {
    console.error("Failed to create signed URL:", error);
    return res.status(500).json({ error: error?.message || "Failed to generate signed URL" });
  }

  res.json({ signed_url: data.signedUrl });
});

// SOS / Emergency history for current user (alerts + evidence count)
app.get("/api/sos/history", requireAuth, async (req, res) => {
  const { user_id } = req.user;

  const { data: alerts, error: alertsError } = await supabase
    .from("emergency_alerts")
    .select("alert_id, timestamp, type, status")
    .eq("user_id", user_id)
    .order("timestamp", { ascending: false });

  if (alertsError) {
    console.error("Supabase error:", alertsError);
    return res.status(400).json({ error: alertsError.message });
  }

  if (!alerts || alerts.length === 0) {
    return res.json([]);
  }

  const alertIds = alerts.map((a) => a.alert_id);

  const { data: evidenceRows, error: evError } = await supabase
    .from("emergency_evidence")
    .select("alert_id")
    .in("alert_id", alertIds);

  if (evError) {
    console.error("Supabase error:", evError);
    return res.status(400).json({ error: evError.message });
  }

  const countsByAlert = new Map();
  (evidenceRows || []).forEach((row) => {
    countsByAlert.set(row.alert_id, (countsByAlert.get(row.alert_id) || 0) + 1);
  });

  const result = alerts.map((a) => ({
    ...a,
    evidence_count: countsByAlert.get(a.alert_id) || 0,
  }));

  res.json(result);
});

// Submit a community safety rating (protected)
app.post("/api/ratings", requireAuth, async (req, res) => {
  const { user_id } = req.user;
  const { route_id, score, comment } = req.body || {};

  if (!route_id || score === undefined) {
    return res.status(400).json({ error: "route_id and score are required" });
  }

  const numericScore = Number(score);
  if (Number.isNaN(numericScore) || numericScore < 1 || numericScore > 5) {
    return res.status(400).json({ error: "score must be between 1 and 5" });
  }

  const { data, error } = await supabase
    .from("ratings")
    .insert([
      {
        user_id,
        route_id,
        score: numericScore,
        comment: comment || null,
      },
    ])
    .select("*")
    .single();

  if (error) {
    console.error("Supabase error:", error);
    return res.status(400).json({ error: error.message });
  }

  res.status(201).json(data);
});

// Aggregate community safety rating for a segment
app.get("/api/ratings/aggregate", requireAuth, async (req, res) => {
  const { route_id } = req.query || {};

  if (!route_id) {
    return res.status(400).json({ error: "route_id is required" });
  }

  const { data, error } = await supabase
    .from("ratings")
    .select("score")
    .eq("route_id", route_id);

  if (error) {
    console.error("Supabase error:", error);
    return res.status(400).json({ error: error.message });
  }

  const count = data?.length || 0;
  const avg = count > 0 ? data.reduce((acc, r) => acc + (r.score || 0), 0) / count : 0;

  res.json({ route_id, average_score: avg, count });
});

// Crowd-sourced incident reporting (protected)
app.post("/api/incidents", requireAuth, async (req, res) => {
  const { user_id } = req.user;
  const { category, description, latitude, longitude, occurred_at } = req.body || {};

  if (!category || latitude === undefined || longitude === undefined) {
    return res.status(400).json({ error: "category, latitude, and longitude are required" });
  }

  const { data, error } = await supabase
    .from("incident_reports")
    .insert([
      {
        user_id,
        category,
        description: description || null,
        latitude,
        longitude,
        occurred_at: occurred_at || new Date().toISOString(),
      },
    ])
    .select("*")
    .single();

  if (error) {
    console.error("Supabase error:", error);
    return res.status(400).json({ error: error.message });
  }

  res.status(201).json(data);
});

// List incident reports (protected)
app.get("/api/incidents", requireAuth, async (req, res) => {
  const { data, error } = await supabase
    .from("incident_reports")
    .select("*")
    .order("occurred_at", { ascending: false })
    .limit(200);

  if (error) {
    console.error("Supabase error:", error);
    return res.status(400).json({ error: error.message });
  }

  res.json(data);
});

// Traffic flow reports (protected)
app.post("/api/traffic", requireAuth, async (req, res) => {
  const { user_id } = req.user;
  const { segment_id, congestion_level, average_speed, reported_at } = req.body || {};

  if (!segment_id || congestion_level === undefined) {
    return res.status(400).json({ error: "segment_id and congestion_level are required" });
  }

  const { data, error } = await supabase
    .from("traffic_reports")
    .insert([
      {
        user_id,
        segment_id,
        congestion_level,
        average_speed: average_speed ?? null,
        reported_at: reported_at || new Date().toISOString(),
      },
    ])
    .select("*")
    .single();

  if (error) {
    console.error("Supabase error:", error);
    return res.status(400).json({ error: error.message });
  }

  res.status(201).json(data);
});

app.get("/api/traffic", requireAuth, async (req, res) => {
  const { data, error } = await supabase
    .from("traffic_reports")
    .select("*")
    .order("reported_at", { ascending: false })
    .limit(200);

  if (error) {
    console.error("Supabase error:", error);
    return res.status(400).json({ error: error.message });
  }

  res.json(data);
});

// Road closures (protected)
app.post("/api/road-closures", requireAuth, async (req, res) => {
  const { user_id } = req.user;
  const { segment_id, reason, starts_at, ends_at } = req.body || {};

  if (!segment_id || !reason) {
    return res.status(400).json({ error: "segment_id and reason are required" });
  }

  const { data, error } = await supabase
    .from("road_closures")
    .insert([
      {
        user_id,
        segment_id,
        reason,
        starts_at: starts_at || new Date().toISOString(),
        ends_at: ends_at || null,
      },
    ])
    .select("*")
    .single();

  if (error) {
    console.error("Supabase error:", error);
    return res.status(400).json({ error: error.message });
  }

  res.status(201).json(data);
});

app.get("/api/road-closures", requireAuth, async (req, res) => {
  const { data, error } = await supabase
    .from("road_closures")
    .select("*")
    .order("starts_at", { ascending: false })
    .limit(200);

  if (error) {
    console.error("Supabase error:", error);
    return res.status(400).json({ error: error.message });
  }

  res.json(data);
});

// Crowd-sourced safety reports (protected)
app.post("/api/crowd-reports", requireAuth, async (req, res) => {
  const { user_id } = req.user;
  const { segment_id, note, safety_score, reported_at } = req.body || {};

  if (!segment_id || safety_score === undefined) {
    return res.status(400).json({ error: "segment_id and safety_score are required" });
  }

  const { data, error } = await supabase
    .from("crowd_reports")
    .insert([
      {
        user_id,
        segment_id,
        note: note || null,
        safety_score,
        reported_at: reported_at || new Date().toISOString(),
      },
    ])
    .select("*")
    .single();

  if (error) {
    console.error("Supabase error:", error);
    return res.status(400).json({ error: error.message });
  }

  res.status(201).json(data);
});

app.get("/api/crowd-reports", requireAuth, async (req, res) => {
  const { data, error } = await supabase
    .from("crowd_reports")
    .select("*")
    .order("reported_at", { ascending: false })
    .limit(200);

  if (error) {
    console.error("Supabase error:", error);
    return res.status(400).json({ error: error.message });
  }

  res.json(data);
});

// Safe route planning (simple safetyScore based on SafetyFactor table)
app.post("/api/safe-route/plan", requireAuth, async (req, res) => {
  const {
    start_location_name,
    end_location_name,
    start_lat,
    start_lng,
    end_lat,
    end_lng,
    time_of_day,
  } = req.body || {};

  if ((!start_location_name && (start_lat === undefined || start_lng === undefined)) ||
      (!end_location_name && (end_lat === undefined || end_lng === undefined))) {
    return res
      .status(400)
      .json({
        error: "Provide start/end names or coordinates (start_lat/start_lng, end_lat/end_lng).",
      });
  }

  const baseScore = await getBaseSafetyScore(time_of_day);

  let start = null;
  let end = null;

  if (start_lat !== undefined && start_lng !== undefined) {
    start = { lat: Number(start_lat), lng: Number(start_lng) };
  } else if (start_location_name) {
    start = await mapboxGeocode(start_location_name);
  }

  if (end_lat !== undefined && end_lng !== undefined) {
    end = { lat: Number(end_lat), lng: Number(end_lng) };
  } else if (end_location_name) {
    end = await mapboxGeocode(end_location_name);
  }

  if (!start || !end) {
    const safestRouteScore = clamp(baseScore + 0.05, 0, 1);
    const fastestRouteScore = clamp(baseScore - 0.05, 0, 1);

    return res.json({
      start_location_name,
      end_location_name,
      time_of_day: time_of_day || null,
      routes: [
        {
          id: "safest",
          label: "Safest route",
          distance_km: 3.5,
          duration_min: 15,
          safety_score: safestRouteScore,
        },
        {
          id: "fastest",
          label: "Fastest route",
          distance_km: 3.0,
          duration_min: 12,
          safety_score: fastestRouteScore,
        },
      ],
      note: "Coordinates missing or geocoding failed; returned a placeholder plan.",
    });
  }

  try {
    const directions = await mapboxDirections(start, end);

    // Fetch all active incident reports
    const { data: incidents, error: incidentsError } = await supabase
      .from("incident_reports")
      .select("category, latitude, longitude, occurred_at");

    if (incidentsError) {
      console.error("Error fetching incidents for routing:", incidentsError);
    }

    // Fetch all safety factors (joined with locations for coords)
    const { data: factors, error: factorsError } = await supabase
      .from("safety_factors")
      .select(`
        people_density,
        light_level,
        risk_score,
        locations (
          latitude,
          longitude
        )
      `);

    if (factorsError) {
      console.error("Error fetching safety factors for routing:", factorsError);
    }

    const routes = (directions.routes || []).map((route, idx) => {
      const isHighway = route.distance > 5000;
      const coords = route.geometry?.coordinates || [];

      // If no geometry/coordinates are present, fall back to baseScore simulation
      if (coords.length === 0) {
        let fallbackScore = baseScore;
        if (isHighway) fallbackScore -= 0.05;
        else fallbackScore += 0.05;
        return {
          id: `route-${idx + 1}`,
          label: idx === 0 ? "Route option" : `Route option ${idx + 1}`,
          distance_km: Math.round((route.distance / 1000) * 100) / 100,
          duration_min: Math.round((route.duration / 60) * 10) / 10,
          safety_score: clamp(fallbackScore, 0.1, 1.0),
          geometry: route.geometry,
        };
      }

      // Sample coordinates along the path to keep calculations performant.
      // For short routes, sample every point. For longer ones, sample every Nth point.
      const maxSamples = 30;
      const step = Math.max(1, Math.floor(coords.length / maxSamples));
      const sampledCoords = [];
      for (let i = 0; i < coords.length; i += step) {
        sampledCoords.push(coords[i]);
      }
      // Ensure the last coordinate is included
      if (coords.length > 1 && (coords.length - 1) % step !== 0) {
        sampledCoords.push(coords[coords.length - 1]);
      }

      let totalPointScore = 0;

      for (const [lng, lat] of sampledCoords) {
        let pointScore = baseScore;

        // 1. Calculate Incident Penalty at this point
        let pointIncidentPenalty = 0;
        if (incidents && incidents.length > 0) {
          for (const incident of incidents) {
            const dist = getDistanceMeters(lat, lng, incident.latitude, incident.longitude);
            if (dist <= 150) {
              // Base weight by category
              let weight = 0.10;
              const cat = (incident.category || "").toLowerCase();
              if (cat.includes("assault") || cat.includes("violence") || cat.includes("weapon")) {
                weight = 0.25;
              } else if (cat.includes("theft") || cat.includes("robbery") || cat.includes("mugging")) {
                weight = 0.15;
              } else if (cat.includes("harassment") || cat.includes("stalking")) {
                weight = 0.12;
              }

              // Recency time decay over 30 days
              const daysOld = (new Date() - new Date(incident.occurred_at)) / (1000 * 60 * 60 * 24);
              let decay = 1.0;
              if (daysOld >= 0 && daysOld < 30) {
                decay = (30 - daysOld) / 30;
              } else if (daysOld >= 30) {
                decay = 0.05; // tiny residual penalty for historical hot-spots
              }

              // Distance decay (stronger penalty closer to incident)
              let distDecay = 1.0;
              if (dist > 50) {
                distDecay = (150 - dist) / 100;
              }

              let penalty = weight * decay * distDecay;

              // Night-time factor multiplier
              if (time_of_day === "night") {
                penalty *= 1.5;
              }

              pointIncidentPenalty += penalty;
            }
          }
        }
        // Cap point incident penalty at 0.70 to avoid complete zero/negative scores at single points
        pointScore -= Math.min(pointIncidentPenalty, 0.70);

        // 2. Calculate Lighting/Density Bonus at this point
        let pointLightingBonus = 0;
        let pointDensityBonus = 0;

        if (factors && factors.length > 0) {
          for (const factor of factors) {
            if (!factor.locations || factor.locations.latitude === undefined) continue;

            const dist = getDistanceMeters(
              lat,
              lng,
              factor.locations.latitude,
              factor.locations.longitude
            );

            if (dist <= 100) {
              const distWeight = (100 - dist) / 100;

              // Lighting score calculation
              if (factor.light_level !== null && factor.light_level !== undefined) {
                if (time_of_day === "night") {
                  if (factor.light_level > 0.6) {
                    pointLightingBonus = Math.max(
                      pointLightingBonus,
                      0.10 * factor.light_level * distWeight
                    );
                  } else if (factor.light_level < 0.4) {
                    // Dark street penalty at night
                    pointLightingBonus = Math.min(
                      pointLightingBonus,
                      -0.12 * (1 - factor.light_level) * distWeight
                    );
                  }
                } else {
                  // Small daylight illumination bonus
                  pointLightingBonus = Math.max(
                    pointLightingBonus,
                    0.02 * factor.light_level * distWeight
                  );
                }
              }

              // People density calculation
              if (factor.people_density !== null && factor.people_density !== undefined) {
                if (time_of_day === "night") {
                  // Moderate crowd is safe at night, avoid empty areas
                  pointDensityBonus = Math.max(
                    pointDensityBonus,
                    0.05 * factor.people_density * distWeight
                  );
                } else {
                  // High density is good during the day
                  pointDensityBonus = Math.max(
                    pointDensityBonus,
                    0.07 * factor.people_density * distWeight
                  );
                }
              }
            }
          }
        }

        pointScore += pointLightingBonus + pointDensityBonus;
        // Clamp point safety score between 0.05 and 1.00
        totalPointScore += clamp(pointScore, 0.05, 1.0);
      }

      let routeSafetyAverage = totalPointScore / Math.max(1, sampledCoords.length);

      // 3. Final Route-wide Adjustments
      if (isHighway) {
        routeSafetyAverage -= 0.05; // walking along highway is less safe
      } else {
        routeSafetyAverage += 0.05; // local walking street is better
      }

      // Add a slight preference for the first route option from provider
      routeSafetyAverage += idx === 0 ? 0.02 : -0.01 * idx;

      return {
        id: `route-${idx + 1}`,
        label: idx === 0 ? "Route option" : `Route option ${idx + 1}`,
        distance_km: Math.round((route.distance / 1000) * 100) / 100,
        duration_min: Math.round((route.duration / 60) * 10) / 10,
        safety_score: clamp(routeSafetyAverage, 0.1, 1.0),
        geometry: route.geometry,
      };
    });

    return res.json({
      start_location_name,
      end_location_name,
      start,
      end,
      time_of_day: time_of_day || null,
      routes,
      note: MAPBOX_TOKEN
        ? null
        : "Using OpenStreetMap (Nominatim + OSRM) for routing.",
    });
  } catch (err) {
    console.error("Routing provider error:", err);
    return res
      .status(502)
      .json({ error: "Failed to fetch routes from the routing provider." });
  }
});

// Post route ratings (UC-05)
app.post("/api/ratings", requireAuth, async (req, res) => {
  const { user_id } = req.user;
  const { route_id, score, comment } = req.body;

  if (!route_id || !score) {
    return res.status(400).json({ error: "route_id and score are required" });
  }

  const { data, error } = await supabase
    .from("ratings")
    .insert([{
      user_id,
      route_id,
      score: clamp(Number(score), 1, 5),
      comment: comment || null,
    }])
    .select("*")
    .single();

  if (error) {
    console.error("Supabase error (ratings):", error);
    return res.status(400).json({ error: error.message });
  }

  res.status(201).json(data);
});

// Get evidence for a specific SOS alert (UC-08)
app.get("/api/sos/evidence/:alertId", requireAuth, async (req, res) => {
  const { alertId } = req.params;
  const { data, error } = await supabase
    .from("emergency_evidence")
    .select("*")
    .eq("alert_id", alertId)
    .order("timestamp", { ascending: true });

  if (error) {
    console.error("Supabase error (get evidence):", error);
    return res.status(400).json({ error: error.message });
  }

  res.json(data || []);
});

app.listen(port, '0.0.0.0', () => {
  console.log(`Backend running on http://0.0.0.0:${port}`);
});
