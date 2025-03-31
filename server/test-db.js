const { Pool } = require("pg");

const pool = new Pool({
  user: "vincenttrung",
  host: "localhost",
  database: "postgres",
  password: "Vincent.123.",
  port: 5432,
});

async function testConnection() {
  try {
    const client = await pool.connect();
    console.log("Successfully connected to PostgreSQL database!");

    // Test query
    const result = await client.query("SELECT NOW()");
    console.log("Current database time:", result.rows[0].now);

    client.release();
    pool.end();
  } catch (err) {
    console.error("Error connecting to the database:", err);
  }
}

testConnection();
