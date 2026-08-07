import fs from "fs";
import { Pool } from "pg";

const DATABASE_URL = process.env.DATABASE_URL || "postgres://skyharp:skyharp@localhost:5432/skyharp";

export const pool = new Pool({ connectionString: DATABASE_URL });

export const migrate = async () => {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        name TEXT PRIMARY KEY,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);
    const migrationsUrl = new URL("./migrations/", import.meta.url);
    const files = (await fs.promises.readdir(migrationsUrl)).filter((file) => file.endsWith(".sql")).sort();

    for (const file of files) {
      const exists = await client.query("SELECT 1 FROM schema_migrations WHERE name = $1", [file]);
      if (exists.rowCount) continue;

      const sql = await fs.promises.readFile(new URL(file, migrationsUrl), "utf8");
      await client.query("BEGIN");
      try {
        await client.query(sql);
        await client.query("INSERT INTO schema_migrations (name) VALUES ($1)", [file]);
        await client.query("COMMIT");
      } catch (error) {
        await client.query("ROLLBACK");
        throw error;
      }
    }
  } finally {
    client.release();
  }
};
