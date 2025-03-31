const express = require("express");
const router = express.Router();
const pool = require("../db");

// Create a new portfolio
router.post("/", async (req, res) => {
  try {
    const { name } = req.body;
    const userId = req.session.user.userid;

    const result = await pool.query(
      "INSERT INTO portfolio (userid, name, cash_balance) VALUES ($1, $2, 0) RETURNING *",
      [userId, name]
    );

    res.json(result.rows[0]);
  } catch (error) {
    console.error("Error creating portfolio:", error);
    res
      .status(500)
      .json({ message: "Error creating portfolio", error: error.message });
  }
});

// Get all portfolios for a user
router.get("/", async (req, res) => {
  try {
    console.log("Session:", req.session);
    if (!req.session.user) {
      console.error("No user in session");
      return res.status(401).json({ message: "Not authenticated" });
    }

    const userId = req.session.user.userid;
    console.log("Fetching portfolios for user:", userId);

    const result = await pool.query(
      `SELECT p.portfolioid, p.userid, p.name, p.cash_balance, p.created_at,
              COALESCE(SUM(sh.quantity * COALESCE(sd.close_price, 0)), 0) as total_value 
       FROM portfolio p 
       LEFT JOIN stockholding sh ON p.portfolioid = sh.portfolioid 
       LEFT JOIN stockdata sd ON sh.symbol = sd.symbol 
       WHERE p.userid = $1 
       GROUP BY p.portfolioid, p.userid, p.name, p.cash_balance, p.created_at`,
      [userId]
    );

    console.log("Query result:", result.rows);
    res.json(result.rows);
  } catch (error) {
    console.error("Error fetching portfolios:", error);
    console.error("Error stack:", error.stack);
    res
      .status(500)
      .json({ message: "Error fetching portfolios", error: error.message });
  }
});

// Get a specific portfolio with its holdings
router.get("/:portfolioId", async (req, res) => {
  try {
    const { portfolioId } = req.params;
    const userId = req.session.user.userid;

    // Verify portfolio belongs to user
    const portfolioResult = await pool.query(
      "SELECT portfolioid, userid, name, cash_balance, created_at FROM portfolio WHERE portfolioid = $1 AND userid = $2",
      [portfolioId, userId]
    );

    if (portfolioResult.rows.length === 0) {
      return res.status(404).json({ message: "Portfolio not found" });
    }

    // Get portfolio holdings with stock details and current prices
    const holdingsResult = await pool.query(
      `SELECT sh.*, s.symbol, s.company_name, COALESCE(sd.close_price, 0) as current_price 
       FROM stockholding sh 
       JOIN stock s ON sh.symbol = s.symbol 
       LEFT JOIN stockdata sd ON sh.symbol = sd.symbol 
       WHERE sh.portfolioid = $1`,
      [portfolioId]
    );

    // Calculate total value of holdings
    const totalValue = holdingsResult.rows.reduce(
      (sum, holding) => sum + holding.quantity * holding.current_price,
      0
    );

    res.json({
      ...portfolioResult.rows[0],
      holdings: holdingsResult.rows,
      total_value: totalValue,
    });
  } catch (error) {
    console.error("Error fetching portfolio:", error);
    res
      .status(500)
      .json({ message: "Error fetching portfolio", error: error.message });
  }
});

// Update portfolio name
router.put("/:portfolioId", async (req, res) => {
  try {
    const { portfolioId } = req.params;
    const { name } = req.body;
    const userId = req.session.user.userid;

    const result = await pool.query(
      "UPDATE portfolio SET name = $1 WHERE portfolioid = $2 AND userid = $3 RETURNING *",
      [name, portfolioId, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Portfolio not found" });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error("Error updating portfolio:", error);
    res
      .status(500)
      .json({ message: "Error updating portfolio", error: error.message });
  }
});

// Delete a portfolio
router.delete("/:portfolioId", async (req, res) => {
  try {
    const { portfolioId } = req.params;
    const userId = req.session.user.userid;

    const result = await pool.query(
      "DELETE FROM portfolio WHERE portfolioid = $1 AND userid = $2 RETURNING *",
      [portfolioId, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Portfolio not found" });
    }

    res.json({ message: "Portfolio deleted successfully" });
  } catch (error) {
    console.error("Error deleting portfolio:", error);
    res
      .status(500)
      .json({ message: "Error deleting portfolio", error: error.message });
  }
});

module.exports = router;
