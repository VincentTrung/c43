const fs = require("fs");
const csv = require("csv-parse");
const path = require("path");
const { Pool } = require("pg");

// Database configuration
const pool = new Pool({
  user: "vincenttrung",
  host: "localhost",
  database: "StockApp",
  password: "vincenttrung",
  port: 5432,
});

async function importStockData(filePath) {
  try {
    const fileContent = fs.readFileSync(filePath, "utf-8");

    // Parse CSV
    const records = await new Promise((resolve, reject) => {
      csv.parse(
        fileContent,
        {
          columns: true,
          skip_empty_lines: true,
          trim: true,
        },
        (err, records) => {
          if (err) reject(err);
          else resolve(records);
        }
      );
    });

    // Get unique stock codes
    const stockCodes = [...new Set(records.map((record) => record.Code))];

    // Begin transaction
    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      // Insert stocks if they don't exist
      for (const code of stockCodes) {
        await client.query(
          "INSERT INTO Stock (symbol, company_name) VALUES ($1, $2) ON CONFLICT (symbol) DO NOTHING",
          [code, `Company ${code}`] // You might want to provide actual company names
        );
      }

      // Insert stock data
      for (const record of records) {
        await client.query(
          `INSERT INTO StockData (
            symbol,
            date,
            open_price,
            high_price,
            low_price,
            close_price,
            volume
          ) VALUES ($1, $2, $3, $4, $5, $6, $7)
          ON CONFLICT (symbol, date) DO UPDATE SET
            open_price = EXCLUDED.open_price,
            high_price = EXCLUDED.high_price,
            low_price = EXCLUDED.low_price,
            close_price = EXCLUDED.close_price,
            volume = EXCLUDED.volume`,
          [
            record.Code,
            new Date(record.Timestamp),
            parseFloat(record.Open),
            parseFloat(record.High),
            parseFloat(record.Low),
            parseFloat(record.Close),
            parseInt(record.Volume),
          ]
        );
      }

      await client.query("COMMIT");
      console.log("Data import completed successfully");
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  } catch (err) {
    console.error("Error importing data:", err);
    throw err;
  }
}

// Example usage
const csvFilePath = process.argv[2];
if (!csvFilePath) {
  console.error("Please provide the path to the CSV file");
  process.exit(1);
}

importStockData(csvFilePath)
  .then(() => {
    console.log("Import completed");
    process.exit(0);
  })
  .catch((err) => {
    console.error("Import failed:", err);
    process.exit(1);
  });
