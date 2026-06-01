const { createClient } = require("@supabase/supabase-js");
require("dotenv").config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function runSeed() {
  console.log("Starting SafeRoute Database Seeding...");

  // 1. Get or create a seed test user
  let user_id;
  const { data: users, error: userError } = await supabase
    .from("users")
    .select("user_id")
    .limit(1);

  if (userError) {
    console.error("Error checking users:", userError);
    process.exit(1);
  }

  if (users && users.length > 0) {
    user_id = users[0].user_id;
    console.log(`Using existing user: ${user_id}`);
  } else {
    // Insert a default test user
    const { data: newUser, error: createError } = await supabase
      .from("users")
      .insert([
        {
          full_name: "Seed Tester",
          email: "seed@example.com",
          phone_number: "+251900000000",
          password: "password123", // Simulated plain text/hash placeholder
        },
      ])
      .select("user_id")
      .single();

    if (createError) {
      console.error("Error creating test user:", createError);
      process.exit(1);
    }
    user_id = newUser.user_id;
    console.log(`Created new seed test user: ${user_id}`);
  }

  // 2. Insert test locations
  console.log("Inserting test locations around Addis Ababa...");
  const locationsToInsert = [
    {
      location_id: "loc_safe_ave",
      latitude: 9.0310,
      longitude: 38.7410,
      address: "Avenue of Safety, Addis Ababa",
    },
    {
      location_id: "loc_dark_alley",
      latitude: 9.0320,
      longitude: 38.7420,
      address: "Deserted Lane, Addis Ababa",
    },
  ];

  for (const loc of locationsToInsert) {
    const { error } = await supabase.from("locations").upsert([loc]);
    if (error) console.error(`Error inserting location ${loc.location_id}:`, error);
  }

  // 3. Insert safety factors for those locations
  console.log("Inserting safety factors...");
  const factorsToInsert = [
    {
      location_id: "loc_safe_ave",
      people_density: 0.8,
      light_level: 0.9,
      risk_score: 0.1,
    },
    {
      location_id: "loc_dark_alley",
      people_density: 0.1,
      light_level: 0.15,
      risk_score: 0.8,
    },
  ];

  for (const fact of factorsToInsert) {
    // Delete existing entry if any to avoid uniqueness issues
    await supabase.from("safety_factors").delete().eq("location_id", fact.location_id);
    const { error } = await supabase.from("safety_factors").insert([fact]);
    if (error) console.error(`Error inserting safety factor for ${fact.location_id}:`, error);
  }

  // 4. Insert incident reports nearby
  console.log("Inserting incident reports...");
  const incidentsToInsert = [
    {
      category: "Assault",
      description: "Robbery and physical altercations reported near the intersection.",
      latitude: 9.0322,
      longitude: 38.7422,
      user_id: user_id,
      occurred_at: new Date().toISOString(),
    },
    {
      category: "Harassment",
      description: "Suspicious individuals loitering with no lighting.",
      latitude: 9.0325,
      longitude: 38.7425,
      user_id: user_id,
      occurred_at: new Date().toISOString(),
    },
  ];

  // Clean old simulated incidents to keep seed clean
  await supabase
    .from("incident_reports")
    .delete()
    .eq("description", "Robbery and physical altercations reported near the intersection.");
  await supabase
    .from("incident_reports")
    .delete()
    .eq("description", "Suspicious individuals loitering with no lighting.");

  for (const inc of incidentsToInsert) {
    const { error } = await supabase.from("incident_reports").insert([inc]);
    if (error) console.error("Error inserting incident report:", error);
  }

  console.log("Database seeding completed successfully.");
}

runSeed();
