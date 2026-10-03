require("dotenv").config();

const fs = require("fs");
const path = require("path");
const { Client } = require("pg");
const pool = require("./config/db");

const databaseName = process.env.DB_NAME || "k3_safety";

async function ensureDatabase() {
  if (["postgres", "template0", "template1"].includes(databaseName)) {
    throw new Error("DB_NAME harus nama database aplikasi, bukan database maintenance PostgreSQL.");
  }

  const adminClient = new Client({
    host: process.env.DB_HOST || "localhost",
    port: Number(process.env.DB_PORT || 5432),
    database: "postgres",
    user: process.env.DB_USER || "postgres",
    password: process.env.DB_PASSWORD || "",
    connectionTimeoutMillis: 5000
  });

  try {
    await adminClient.connect();
    const { rows } = await adminClient.query(
      "SELECT 1 FROM pg_database WHERE datname = $1",
      [databaseName]
    );

    if (rows.length > 0) {
      console.log(`Database "${databaseName}" sudah ada.`);
      return;
    }

    const escapedName = `"${databaseName.replace(/"/g, '""')}"`;
    await adminClient.query(`CREATE DATABASE ${escapedName} WITH ENCODING 'UTF8'`);
    console.log(`Database "${databaseName}" berhasil dibuat.`);
  } finally {
    await adminClient.end();
  }
}

async function migrate() {
  const schemaPath = path.join(__dirname, "schema.sql");
  const schema = fs.readFileSync(schemaPath, "utf8");
  const requiredTables = [...schema.matchAll(/\bCREATE TABLE\s+([a-z_][a-z0-9_]*)/gi)]
    .map(([, tableName]) => tableName.toLowerCase());

  if (requiredTables.length === 0) {
    throw new Error("Tidak ada definisi CREATE TABLE di schema.sql.");
  }

  await ensureDatabase();

  const { rows } = await pool.query(
    "SELECT table_name, table_type FROM information_schema.tables WHERE table_schema = 'public'"
  );
  const existingTables = new Set(
    rows.filter((row) => row.table_type === "BASE TABLE").map((row) => row.table_name)
  );
  const missingTables = requiredTables.filter((tableName) => !existingTables.has(tableName));

  if (missingTables.length === 0) {
    console.log(`Skema sudah lengkap (${requiredTables.length} tabel); migrasi dilewati.`);
    return;
  }

  if (rows.length > 0) {
    throw new Error(
      `Database tidak kosong tetapi skema belum lengkap. Tabel yang belum ada: ${missingTables.join(", ")}`
    );
  }

  await pool.query(schema);
  console.log("Database schema berhasil diterapkan.");
}

migrate()
  .catch((error) => {
    console.error("Migrasi database gagal:", error.message);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
