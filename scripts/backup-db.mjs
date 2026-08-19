import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "path";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://etlauinhmtcsgcxabmyu.supabase.co";
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

if (!supabaseUrl || !supabaseKey) {
  console.error("❌ Missing Supabase URL or Anon Key in .env.local");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const TABLES = [
  "profiles",
  "ledger_accounts",
  "ledger_entries",
  "ledger_transactions",
  "audit_logs",
];

async function runBackup() {
  console.log("🚀 Starting Market Maker Database Backup from Supabase Cloud...");
  const backupData = {
    project_url: supabaseUrl,
    timestamp: new Date().toISOString(),
    tables: {},
  };

  const backupDir = path.join(process.cwd(), "backups");
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }

  let totalRows = 0;

  for (const table of TABLES) {
    try {
      const { data, error, count } = await supabase.from(table).select("*", { count: "exact" });
      if (error) {
        console.warn(`⚠️ Notice for table "${table}":`, error.message);
        backupData.tables[table] = [];
      } else {
        backupData.tables[table] = data || [];
        const rows = data ? data.length : 0;
        totalRows += rows;
        console.log(`✓ Table [${table}]: ${rows} rows exported.`);
      }
    } catch (err) {
      console.warn(`⚠️ Failed reading table ${table}:`, err.message);
      backupData.tables[table] = [];
    }
  }

  const dateStr = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  const jsonPath = path.join(backupDir, `market_maker_backup_${dateStr}.json`);
  const latestJsonPath = path.join(backupDir, "market_maker_backup_latest.json");

  fs.writeFileSync(jsonPath, JSON.stringify(backupData, null, 2), "utf-8");
  fs.writeFileSync(latestJsonPath, JSON.stringify(backupData, null, 2), "utf-8");

  console.log("\n==================================================");
  console.log(`✅ Backup Completed Successfully!`);
  console.log(`📊 Total Records Saved: ${totalRows} rows across ${TABLES.length} tables.`);
  console.log(`📁 File Saved: backups/market_maker_backup_${dateStr}.json`);
  console.log(`📁 Latest Snapshot: backups/market_maker_backup_latest.json`);
  console.log("==================================================\n");
}

runBackup().catch((e) => {
  console.error("❌ Backup script error:", e);
  process.exit(1);
});
