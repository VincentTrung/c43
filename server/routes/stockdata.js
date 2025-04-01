const express = require("express");
const router = express.Router();
const pool = require("../db");
const axios = require("axios");

// Add new stock data manually
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

    // Check if stock exists
    const stockResult = await client.query(
      "SELECT symbol FROM stock WHERE symbol = $1",
      [symbol]
    );

    if (stockResult.rows.length === 0) {
      return res.status(404).json({ message: "Stock not found" });
    }

    // Check for duplicate entry for the same day
    const duplicateResult = await client.query(
      "SELECT date FROM stockdata WHERE symbol = $1 AND date = $2",
      [symbol, date]
    );

    if (duplicateResult.rows.length > 0) {
      return res
        .status(400)
        .json({ message: "Data for this date already exists" });
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

// Get stock data for a specific symbol
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
      "SELECT * FROM stockdata ORDER BY date DESC"
    );
    res.json(result.rows);
  } catch (error) {
    console.error("Error fetching stock data:", error);
    res.status(500).json({ message: "Error fetching stock data" });
  }
});

module.exports = router;
