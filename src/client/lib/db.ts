import { Pool } from "pg";

// Support for Vercel Postgres connection string
const getConnectionConfig = () => {
  // Check for Vercel Postgres connection string first
  if (process.env.POSTGRES_URL) {
    return {
      connectionString: process.env.POSTGRES_URL,
      ssl:
        process.env.NODE_ENV === "production"
          ? { rejectUnauthorized: false }
          : false,
    };
  }

  // Fallback to individual connection parameters
  return {
    host: process.env.DB_HOST || process.env.POSTGRES_HOST || "localhost",
    port: parseInt(
      process.env.DB_PORT || process.env.POSTGRES_PORT || "5432",
      10
    ),
    user: process.env.DB_USERNAME || process.env.POSTGRES_USER || "postgres",
    password:
      process.env.DB_PASSWORD || process.env.POSTGRES_PASSWORD || "postgres",
    database:
      process.env.DB_DATABASE || process.env.POSTGRES_DATABASE || "postgres",
    ssl:
      process.env.NODE_ENV === "production"
        ? { rejectUnauthorized: false }
        : false,
  };
};

// Create a connection pool
const pool = new Pool({
  ...getConnectionConfig(),
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
});

// Query function similar to the original
export async function query<T = any>(
  text: string,
  params?: any[]
): Promise<T[]> {
  const start = Date.now();
  try {
    const res = await pool.query(text, params);
    const duration = Date.now() - start;
    if (process.env.NODE_ENV === "development") {
      console.log("Executed query", { text, duration, rows: res.rowCount });
    }
    return res.rows;
  } catch (error) {
    console.error("Database query error:", error);
    throw error;
  }
}
