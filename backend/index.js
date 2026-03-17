require("dotenv").config();
const express = require("express");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const fetch = require("node-fetch");
const twilio = require("twilio");
const crypto = require("crypto");
const { supabase } = require("./supabaseClient");

const app = express();
const port = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

const MAPBOX_TOKEN = process.env.MAPBOX_TOKEN;
const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID;
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN;
const TWILIO_FROM_NUMBER = process.env.TWILIO_FROM_NUMBER;
const twilioClient =
  TWILIO_ACCOUNT_SID && TWILIO_AUTH_TOKEN ? twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN) : null;

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
  if (!MAPBOX_TOKEN) return null;
  const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(
    name
  )}.json?limit=1&access_token=${MAPBOX_TOKEN}`;
  const data = await fetchJson(url);
  const feature = data?.features?.[0];
  if (!feature || !Array.isArray(feature.center)) return null;
  return { lng: feature.center[0], lat: feature.center[1] };
}

async function mapboxDirections(start, end) {
  if (!MAPBOX_TOKEN) return null;
  const url = `https://api.mapbox.com/directions/v5/mapbox/walking/${start.lng},${start.lat};${end.lng},${end.lat}?geometries=geojson&overview=full&alternatives=true&access_token=${MAPBOX_TOKEN}`;
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

async function notifyContacts(contacts, messageBody) {
  const smsResults = [];
  if (!twilioClient || !TWILIO_FROM_NUMBER) return smsResults;

  for (const contact of contacts || []) {
    if (!contact.phone_number) continue;
    try {
      const result = await twilioClient.messages.create({
        to: contact.phone_number,
        from: TWILIO_FROM_NUMBER,
        body: messageBody,
      });
      smsResults.push({ contact_id: contact.contact_id, status: "sent", sid: result.sid });
    } catch (err) {
      console.error("Twilio send error:", err);
      smsResults.push({ contact_id: contact.contact_id, status: "failed" });
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
  if (phone_number) updates.phone_number = phone_number;
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
  const { alert_id } = req.body || {};

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
  const smsResults = await notifyContacts(
    contacts,
    "SafeRoute SOS alert: Medium alert escalated. Please check in immediately."
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
  const { type } = req.body || {};

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
  const smsResults = await notifyContacts(
    contacts,
    `SafeRoute alert: ${data.type} activated. Please check in and respond if you can help.`
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
  const { alert_id, type, file_path, timestamp } = req.body || {};

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

  const { data: evidenceAgg, error: evError } = await supabase
    .from("emergency_evidence")
    .select("alert_id, count:evidence_id")
    .in("alert_id", alertIds)
    .group("alert_id");

  if (evError) {
    console.error("Supabase error:", evError);
    return res.status(400).json({ error: evError.message });
  }

  const countsByAlert = new Map();
  (evidenceAgg || []).forEach((row) => {
    countsByAlert.set(row.alert_id, row.count);
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

  if (!MAPBOX_TOKEN || !start || !end) {
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
      note: "Mapbox not configured or coordinates missing; returned a placeholder plan.",
    });
  }

  try {
    const directions = await mapboxDirections(start, end);
    const routes = (directions.routes || []).map((route, idx) => ({
      id: `route-${idx + 1}`,
      label: idx === 0 ? "Route option" : `Route option ${idx + 1}`,
      distance_km: Math.round((route.distance / 1000) * 100) / 100,
      duration_min: Math.round((route.duration / 60) * 10) / 10,
      safety_score: clamp(baseScore + (idx === 0 ? 0.06 : 0.03 - idx * 0.01), 0, 1),
      geometry: route.geometry,
    }));

    return res.json({
      start_location_name,
      end_location_name,
      start,
      end,
      time_of_day: time_of_day || null,
      routes,
    });
  } catch (err) {
    console.error("Mapbox error:", err);
    return res.status(502).json({ error: "Failed to fetch routes from Mapbox." });
  }
});

app.listen(port, () => {
  console.log(`Backend running on http://localhost:${port}`);
});
