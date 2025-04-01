const express = require("express");
const router = express.Router();
const pool = require("../db");
const axios = require("axios");

// Update stock data for a symbol
router.post("/update/:symbol", async (req, res) => {
  const client = await pool.connect();
  try {
    const { symbol } = req.params;
    const today = new Date().toISOString().split("T")[0];

    // Check if we already have data for today
    const existingData = await client.query(
      "SELECT * FROM stockdata WHERE symbol = $1 AND date = $2",
      [symbol, today]
    );

    if (existingData.rows.length > 0) {
      return res.status(400).json({ message: "Data already exists for today" });
    }

    // Fetch current stock data from Alpha Vantage API
    const apiKey = process.env.ALPHA_VANTAGE_API_KEY;
    const response = await axios.get(
      `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${symbol}&apikey=${apiKey}`
    );

    const quote = response.data["Global Quote"];
    if (!quote) {
      return res.status(404).json({ message: "Stock data not found" });
    }

    // Insert new stock data
    await client.query(
      `INSERT INTO stockdata 
      (symbol, date, open_price, high_price, low_price, close_price, volume) 
      VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        symbol,
        today,
        parseFloat(quote["02. open"]),
        parseFloat(quote["03. high"]),
        parseFloat(quote["04. low"]),
        parseFloat(quote["05. price"]),
        parseInt(quote["06. volume"]),
      ]
    );

    res.json({ message: "Stock data updated successfully" });
  } catch (error) {
    console.error("Error updating stock data:", error);
    res.status(500).json({ message: "Error updating stock data" });
  } finally {
    client.release();
  }
});

// Update all stock data
router.post("/update-all", async (req, res) => {
  const client = await pool.connect();
  try {
    // Get all unique symbols from stock holdings
    const symbolsResult = await client.query(
      "SELECT DISTINCT symbol FROM stockholding"
    );

    const today = new Date().toISOString().split("T")[0];
    const apiKey = process.env.ALPHA_VANTAGE_API_KEY;

    for (const { symbol } of symbolsResult.rows) {
      // Check if we already have data for today
      const existingData = await client.query(
        "SELECT * FROM stockdata WHERE symbol = $1 AND date = $2",
        [symbol, today]
      );

      if (existingData.rows.length > 0) continue;

      // Fetch current stock data
      const response = await axios.get(
        `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${symbol}&apikey=${apiKey}`
      );

      const quote = response.data["Global Quote"];
      if (!quote) continue;

      // Insert new stock data
      await client.query(
        `INSERT INTO stockdata 
        (symbol, date, open_price, high_price, low_price, close_price, volume) 
        VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          symbol,
          today,
          parseFloat(quote["02. open"]),
          parseFloat(quote["03. high"]),
          parseFloat(quote["04. low"]),
          parseFloat(quote["05. price"]),
          parseInt(quote["06. volume"]),
        ]
      );

      // Add delay to respect API rate limits
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    res.json({ message: "All stock data updated successfully" });
  } catch (error) {
    console.error("Error updating all stock data:", error);
    res.status(500).json({ message: "Error updating stock data" });
  } finally {
    client.release();
  }
});

// Add new stock data
router.post("/", async (req, res) => {
  const client = await pool.connect();
  try {
    const {
      symbol,
      date,
      open_price,
      high_price,
      low_price,
      close_price,
      volume,
    } = req.body;

    // Validate required fields
    if (
      !symbol ||
      !date ||
      !open_price ||
      !high_price ||
      !low_price ||
      !close_price ||
      !volume
    ) {
      return res.status(400).json({ message: "All fields are required" });
    }

    // Check if we already have data for this symbol and date
    const existingData = await client.query(
      "SELECT * FROM stockdata WHERE symbol = $1 AND date = $2",
      [symbol, date]
    );

    if (existingData.rows.length > 0) {
      return res
        .status(400)
        .json({ message: "Data already exists for this symbol and date" });
    }

    // Insert new stock data
    const result = await client.query(
      `INSERT INTO stockdata 
      (symbol, date, open_price, high_price, low_price, close_price, volume) 
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *`,
      [symbol, date, open_price, high_price, low_price, close_price, volume]
    );

    res.json(result.rows[0]);
  } catch (error) {
    console.error("Error adding stock data:", error);
    res.status(500).json({ message: "Error adding stock data" });
  } finally {
    client.release();
  }
});

// Get stock data for a symbol
router.get("/:symbol", async (req, res) => {
  try {
    const { symbol } = req.params;
    const result = await pool.query(
      "SELECT * FROM stockdata WHERE symbol = $1 ORDER BY date DESC",
      [symbol]
    );
    res.json(result.rows);
  } catch (error) {
    console.error("Error fetching stock data:", error);
    res.status(500).json({ message: "Error fetching stock data" });
  }
});

// Get all stock data
router.get("/", async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT * FROM stockdata ORDER BY date DESC, symbol"
    );
    res.json(result.rows);
  } catch (error) {
    console.error("Error fetching stock data:", error);
    res.status(500).json({ message: "Error fetching stock data" });
  }
});

module.exports = router;
