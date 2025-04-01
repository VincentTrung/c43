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
      `SELECT p.portfolioid, p.userid, p.name, p.cash_balance,
              COALESCE(SUM(sh.quantity * COALESCE(sd.close_price, 0)), 0) as total_value 
       FROM portfolio p 
       LEFT JOIN stockholding sh ON p.portfolioid = sh.portfolioid 
       LEFT JOIN stockdata sd ON sh.symbol = sd.symbol 
       WHERE p.userid = $1 
       GROUP BY p.portfolioid, p.userid, p.name, p.cash_balance`,
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
      "SELECT portfolioid, userid, name, cash_balance FROM portfolio WHERE portfolioid = $1 AND userid = $2",
      [portfolioId, userId]
    );

    if (portfolioResult.rows.length === 0) {
      return res.status(404).json({ message: "Portfolio not found" });
    }

    // Get portfolio holdings with stock details and current prices
    const holdingsResult = await pool.query(
      `WITH latest_prices AS (
        SELECT DISTINCT ON (symbol) symbol, close_price
        FROM stockdata
        ORDER BY symbol, date DESC
      )
      SELECT sh.*, s.symbol, s.company_name, COALESCE(lp.close_price, 0) as current_price 
      FROM stockholding sh 
      JOIN stock s ON sh.symbol = s.symbol 
      LEFT JOIN latest_prices lp ON sh.symbol = lp.symbol 
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

// Deposit cash into portfolio
router.post("/:portfolioId/cash/deposit", async (req, res) => {
  try {
    const { portfolioId } = req.params;
    const { amount } = req.body;
    const userId = req.session.user.userid;

    // Verify portfolio belongs to user
    const portfolioResult = await pool.query(
      "SELECT * FROM portfolio WHERE portfolioid = $1 AND userid = $2",
      [portfolioId, userId]
    );

    if (portfolioResult.rows.length === 0) {
      return res.status(404).json({ message: "Portfolio not found" });
    }

    // Start transaction
    await pool.query("BEGIN");

    // Update portfolio cash balance
    const updateResult = await pool.query(
      "UPDATE portfolio SET cash_balance = cash_balance + $1 WHERE portfolioid = $2 RETURNING *",
      [amount, portfolioId]
    );

    // Record transaction in PortfolioTransaction table
    await pool.query(
      "INSERT INTO portfoliotransaction (portfolioid, type, amount) VALUES ($1, 'DEPOSIT', $2)",
      [portfolioId, amount]
    );

    await pool.query("COMMIT");

    res.json(updateResult.rows[0]);
  } catch (error) {
    await pool.query("ROLLBACK");
    console.error("Error depositing cash:", error);
    res
      .status(500)
      .json({ message: "Error depositing cash", error: error.message });
  }
});

// Withdraw cash from portfolio
router.post("/:portfolioId/cash/withdraw", async (req, res) => {
  try {
    const { portfolioId } = req.params;
    const { amount } = req.body;
    const userId = req.session.user.userid;

    // Verify portfolio belongs to user
    const portfolioResult = await pool.query(
      "SELECT * FROM portfolio WHERE portfolioid = $1 AND userid = $2",
      [portfolioId, userId]
    );

    if (portfolioResult.rows.length === 0) {
      return res.status(404).json({ message: "Portfolio not found" });
    }

    // Check if sufficient funds
    if (portfolioResult.rows[0].cash_balance < amount) {
      return res.status(400).json({ message: "Insufficient funds" });
    }

    // Start transaction
    await pool.query("BEGIN");

    // Update portfolio cash balance
    const updateResult = await pool.query(
      "UPDATE portfolio SET cash_balance = cash_balance - $1 WHERE portfolioid = $2 RETURNING *",
      [amount, portfolioId]
    );

    // Record transaction in PortfolioTransaction table
    await pool.query(
      "INSERT INTO portfoliotransaction (portfolioid, type, amount) VALUES ($1, 'WITHDRAWAL', $2)",
      [portfolioId, amount]
    );

    await pool.query("COMMIT");

    res.json(updateResult.rows[0]);
  } catch (error) {
    await pool.query("ROLLBACK");
    console.error("Error withdrawing cash:", error);
    res
      .status(500)
      .json({ message: "Error withdrawing cash", error: error.message });
  }
});

// Buy stock
router.post("/:portfolioId/stocks/buy", async (req, res) => {
  const { portfolioId } = req.params;
  const { symbol, quantity } = req.body;
  const userId = req.session.user.userid;

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // Verify portfolio ownership
    const portfolioResult = await client.query(
      "SELECT * FROM portfolio WHERE portfolioid = $1 AND userid = $2",
      [portfolioId, userId]
    );

    if (portfolioResult.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: "Portfolio not found" });
    }

    const portfolio = portfolioResult.rows[0];
    // Convert cash_balance to number
    const cashBalance = parseFloat(portfolio.cash_balance) || 0;

    // Check if stock exists
    const stockExistsResult = await client.query(
      "SELECT symbol FROM stock WHERE symbol = $1",
      [symbol]
    );

    if (stockExistsResult.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: "Stock not found" });
    }

    // Get current stock price
    const stockResult = await client.query(
      "SELECT close_price FROM stockdata WHERE symbol = $1 ORDER BY date DESC LIMIT 1",
      [symbol]
    );

    if (stockResult.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: "Stock not found" });
    }

    const currentPrice = parseFloat(stockResult.rows[0].close_price) || 0;
    const totalCost = currentPrice * quantity;

    // Check if user has enough cash
    if (cashBalance < totalCost) {
      await client.query("ROLLBACK");
      return res.status(400).json({
        error: "Insufficient funds",
        details: `You need $${totalCost.toFixed(
          2
        )} but only have $${cashBalance.toFixed(2)}`,
      });
    }

    // Update cash balance
    await client.query(
      "UPDATE portfolio SET cash_balance = cash_balance - $1 WHERE portfolioid = $2",
      [totalCost, portfolioId]
    );

    // Record stock transaction
    await client.query(
      "INSERT INTO stocktransaction (portfolioid, symbol, type, quantity, price) VALUES ($1, $2, 'BUY', $3, $4)",
      [portfolioId, symbol, quantity, currentPrice]
    );

    // Update or insert stock holding
    await client.query(
      `INSERT INTO stockholding (portfolioid, symbol, quantity)
       VALUES ($1, $2, $3)
       ON CONFLICT (portfolioid, symbol)
       DO UPDATE SET quantity = stockholding.quantity + $3`,
      [portfolioId, symbol, quantity]
    );

    await client.query("COMMIT");
    res.json({ message: "Stock purchased successfully" });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Error buying stock:", err);
    res.status(500).json({ error: "Error buying stock" });
  } finally {
    client.release();
  }
});

// Sell stock
router.post("/:portfolioId/stocks/sell", async (req, res) => {
  const { portfolioId } = req.params;
  const { symbol, quantity } = req.body;
  const userId = req.session.user.userid;

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // Verify portfolio ownership
    const portfolioResult = await client.query(
      "SELECT * FROM portfolio WHERE portfolioid = $1 AND userid = $2",
      [portfolioId, userId]
    );

    if (portfolioResult.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: "Portfolio not found" });
    }

    // Check if user has enough shares
    const holdingResult = await client.query(
      "SELECT quantity FROM stockholding WHERE portfolioid = $1 AND symbol = $2",
      [portfolioId, symbol]
    );

    if (holdingResult.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(400).json({
        error: "No holdings found",
        details: `You don't own any shares of ${symbol}`,
      });
    }

    const currentHolding = holdingResult.rows[0];
    if (currentHolding.quantity < quantity) {
      await client.query("ROLLBACK");
      return res.status(400).json({
        error: "Insufficient shares",
        details: `You only have ${currentHolding.quantity} shares of ${symbol}`,
      });
    }

    // Get current stock price
    const stockResult = await client.query(
      "SELECT close_price FROM stockdata WHERE symbol = $1 ORDER BY date DESC LIMIT 1",
      [symbol]
    );

    if (stockResult.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: "Stock not found" });
    }

    const currentPrice = stockResult.rows[0].close_price;
    const totalValue = currentPrice * quantity;

    // Update cash balance
    await client.query(
      "UPDATE portfolio SET cash_balance = cash_balance + $1 WHERE portfolioid = $2",
      [totalValue, portfolioId]
    );

    // Record stock transaction
    await client.query(
      "INSERT INTO stocktransaction (portfolioid, symbol, type, quantity, price) VALUES ($1, $2, 'SELL', $3, $4)",
      [portfolioId, symbol, quantity, currentPrice]
    );

    // Update stock holding
    await client.query(
      `UPDATE stockholding 
       SET quantity = quantity - $1 
       WHERE portfolioid = $2 AND symbol = $3 
       RETURNING quantity`,
      [quantity, portfolioId, symbol]
    );

    // Check if quantity is zero and delete if it is
    const updatedHolding = await client.query(
      "DELETE FROM stockholding WHERE portfolioid = $1 AND symbol = $2 AND quantity = 0 RETURNING *",
      [portfolioId, symbol]
    );

    await client.query("COMMIT");
    res.json({ message: "Stock sold successfully" });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Error selling stock:", err);
    res.status(500).json({ error: "Error selling stock" });
  } finally {
    client.release();
  }
});

// Get all transactions for a portfolio (both stock and cash transactions)
router.get("/:portfolioId/transactions", async (req, res) => {
  try {
    const { portfolioId } = req.params;
    const userId = req.session.user.userid;

    // Verify portfolio belongs to user
    const portfolioResult = await pool.query(
      "SELECT * FROM portfolio WHERE portfolioid = $1 AND userid = $2",
      [portfolioId, userId]
    );

    if (portfolioResult.rows.length === 0) {
      return res.status(404).json({ error: "Portfolio not found" });
    }

    // Get stock transactions with stock details
    const stockTransactionsResult = await pool.query(
      `SELECT 
        st.transactionid,
        st.timestamp,
        st.type,
        st.quantity,
        st.price,
        st.symbol,
        s.company_name,
        'STOCK' as transaction_type
       FROM stocktransaction st 
       JOIN stock s ON st.symbol = s.symbol 
       WHERE st.portfolioid = $1`,
      [portfolioId]
    );

    // Get cash transactions
    const cashTransactionsResult = await pool.query(
      `SELECT 
        pt.transactionid,
        pt.timestamp,
        pt.type,
        pt.amount,
        'CASH' as transaction_type
       FROM portfoliotransaction pt
       WHERE pt.portfolioid = $1`,
      [portfolioId]
    );

    // Combine and sort all transactions by timestamp
    const allTransactions = [
      ...stockTransactionsResult.rows,
      ...cashTransactionsResult.rows,
    ].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    res.json(allTransactions);
  } catch (error) {
    console.error("Error fetching transactions:", error);
    res.status(500).json({ error: "Error fetching transactions" });
  }
});

// Get unified stock information
router.get("/stock/:symbol", async (req, res) => {
  try {
    const { symbol } = req.params;

    // Get historical data
    const historicalResult = await pool.query(
      `SELECT 
        s.symbol,
        s.company_name
      FROM stock s 
      WHERE s.symbol = $1`,
      [symbol]
    );

    if (historicalResult.rows.length === 0) {
      return res.status(404).json({ error: "Stock not found" });
    }

    // Get latest price data
    const latestPriceResult = await pool.query(
      `SELECT 
        date,
        open_price,
        high_price,
        low_price,
        close_price,
        volume
      FROM stockdata 
      WHERE symbol = $1 
      ORDER BY date DESC 
      LIMIT 1`,
      [symbol]
    );

    // Get price history for the last 30 days
    const priceHistoryResult = await pool.query(
      `SELECT 
        date,
        open_price,
        high_price,
        low_price,
        close_price,
        volume
      FROM stockdata 
      WHERE symbol = $1 
      ORDER BY date DESC 
      LIMIT 30`,
      [symbol]
    );

    // Combine the data
    const stockInfo = {
      ...historicalResult.rows[0],
      latest_price: latestPriceResult.rows[0] || null,
      price_history: priceHistoryResult.rows,
    };

    res.json(stockInfo);
  } catch (error) {
    console.error("Error fetching stock information:", error);
    res.status(500).json({ error: "Error fetching stock information" });
  }
});

module.exports = router;
