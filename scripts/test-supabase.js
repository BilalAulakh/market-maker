const { createClient } = require("@supabase/supabase-js");

const supabaseUrl = "https://etlauinhmtcsgcxabmyu.supabase.co";
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV0bGF1aW5obXRjc2djeGFibXl1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY5NjQ2NTQsImV4cCI6MjEwMjU0MDY1NH0.r3kWGJpTYGrgHcQFFtil1MgODyCgXhQakUMF9glqhPY";

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testSupabase() {
  console.log("Testing Supabase connection to:", supabaseUrl);

  // 1. Check if audit_logs table exists
  const { data: auditData, error: auditError } = await supabase
    .from("audit_logs")
    .select("*")
    .limit(5);

  console.log("audit_logs query result:", { auditData, auditError });

  // 2. Try inserting a test audit log
  const { data: insertData, error: insertError } = await supabase
    .from("audit_logs")
    .insert({
      action: "TEST_CONNECTION",
      category: "trading",
      metadata: { test: true, timestamp: new Date().toISOString() },
    })
    .select();

  console.log("audit_logs insert result:", { insertData, insertError });
}

testSupabase();
