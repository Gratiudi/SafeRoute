const { createClient } = require("@supabase/supabase-js");

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const hasSupabaseConfig =
  typeof supabaseUrl === "string" &&
  /^https?:\/\//i.test(supabaseUrl) &&
  typeof supabaseServiceKey === "string" &&
  supabaseServiceKey.length > 0 &&
  !supabaseServiceKey.startsWith("your-");

if (!hasSupabaseConfig) {
  console.warn("Supabase not configured. Database-backed routes will not work.");
  module.exports = { supabase: null };
  return;
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    persistSession: false,
  },
});

module.exports = { supabase };
