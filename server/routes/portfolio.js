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
      `WITH latest_prices AS (
        SELECT DISTINCT ON (symbol) symbol, close_price
        FROM stockdata
        ORDER BY symbol, date DESC
      )
      SELECT p.portfolioid, p.userid, p.name, p.cash_balance,
             COALESCE(p.cash_balance + SUM(sh.quantity * COALESCE(lp.close_price, 0)), p.cash_balance) as total_value 
      FROM portfolio p 
      LEFT JOIN stockholding sh ON p.portfolioid = sh.portfolioid 
      LEFT JOIN latest_prices lp ON sh.symbol = lp.symbol 
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
      `SELECT DISTINCT
        pt.transactionid,
        pt.timestamp,
        pt.type,
        pt.amount,
        pt.source_portfolio_id,
        pt.destination_portfolio_id,
        'CASH' as transaction_type
       FROM portfoliotransaction pt
       WHERE pt.portfolioid = $1 OR pt.destination_portfolio_id = $1`,
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
      ORDER BY date DESC`,
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

// Create a new transaction
router.post("/:portfolioId/transactions", async (req, res) => {
  const client = await pool.connect();
  try {
    const { portfolioId } = req.params;
    const { type, amount, description, sourcePortfolioId } = req.body;
    const userId = req.session.user.userid;

    // Validate transaction type
    if (!["deposit", "withdrawal", "transfer"].includes(type)) {
      return res.status(400).json({ message: "Invalid transaction type" });
    }

    // Validate amount
    if (amount <= 0) {
      return res.status(400).json({ message: "Amount must be greater than 0" });
    }

    await client.query("BEGIN");

    // Verify portfolio ownership
    const portfolioResult = await client.query(
      "SELECT * FROM portfolio WHERE portfolioid = $1 AND userid = $2",
      [portfolioId, userId]
    );

    if (portfolioResult.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ message: "Portfolio not found" });
    }

    // For transfers, verify source portfolio ownership
    if (type === "transfer") {
      if (!sourcePortfolioId) {
        await client.query("ROLLBACK");
        return res
          .status(400)
          .json({ message: "Source portfolio ID is required for transfers" });
      }

      const sourcePortfolioResult = await client.query(
        "SELECT * FROM portfolio WHERE portfolioid = $1 AND userid = $2",
        [sourcePortfolioId, userId]
      );

      if (sourcePortfolioResult.rows.length === 0) {
        await client.query("ROLLBACK");
        return res.status(404).json({ message: "Source portfolio not found" });
      }

      // Check if source portfolio has sufficient balance
      const sourceBalanceResult = await client.query(
        "SELECT cash_balance FROM portfolio WHERE portfolioid = $1",
        [sourcePortfolioId]
      );

      if (sourceBalanceResult.rows[0].cash_balance < amount) {
        await client.query("ROLLBACK");
        return res
          .status(400)
          .json({ message: "Insufficient balance in source portfolio" });
      }

      // Deduct from source portfolio
      await client.query(
        "UPDATE portfolio SET cash_balance = cash_balance - $1 WHERE portfolioid = $2",
        [amount, sourcePortfolioId]
      );

      // Add to destination portfolio
      await client.query(
        "UPDATE portfolio SET cash_balance = cash_balance + $1 WHERE portfolioid = $2",
        [amount, portfolioId]
      );

      // Create a single transfer transaction record
      const transactionResult = await client.query(
        `INSERT INTO portfoliotransaction 
        (portfolioid, type, amount, source_portfolio_id, destination_portfolio_id) 
        VALUES ($1, 'TRANSFER', $2, $3, $4) 
        RETURNING *`,
        [sourcePortfolioId, amount, sourcePortfolioId, portfolioId]
      );

      await client.query("COMMIT");
      res.json(transactionResult.rows[0]);
      return;
    }

    // Update portfolio balance
    if (type === "deposit") {
      await client.query(
        "UPDATE portfolio SET cash_balance = cash_balance + $1 WHERE portfolioid = $2",
        [amount, portfolioId]
      );
    } else if (type === "withdrawal") {
      // Check if portfolio has sufficient balance for withdrawal
      const balanceResult = await client.query(
        "SELECT cash_balance FROM portfolio WHERE portfolioid = $1",
        [portfolioId]
      );

      if (balanceResult.rows[0].cash_balance < amount) {
        await client.query("ROLLBACK");
        return res.status(400).json({ message: "Insufficient balance" });
      }

      await client.query(
        "UPDATE portfolio SET cash_balance = cash_balance - $1 WHERE portfolioid = $2",
        [amount, portfolioId]
      );
    }

    // Create transaction record for non-transfer transactions
    const transactionResult = await client.query(
      `INSERT INTO portfoliotransaction 
      (portfolioid, type, amount) 
      VALUES ($1, $2, $3) 
      RETURNING *`,
      [portfolioId, type.toUpperCase(), amount]
    );

    await client.query("COMMIT");
    res.json(transactionResult.rows[0]);
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Error creating transaction:", error);
    res.status(500).json({ message: "Error creating transaction" });
  } finally {
    client.release();
  }
});

// Get portfolio statistics
router.get("/:portfolioId/statistics", async (req, res) => {
  try {
    const { portfolioId } = req.params;
    const { startDate, endDate } = req.query;
    const userId = req.session.user.userid;

    // Verify portfolio belongs to user
    const portfolioResult = await pool.query(
      "SELECT * FROM portfolio WHERE portfolioid = $1 AND userid = $2",
      [portfolioId, userId]
    );

    if (portfolioResult.rows.length === 0) {
      return res.status(404).json({ message: "Portfolio not found" });
    }

    // Get portfolio holdings with current prices
    const holdingsResult = await pool.query(
      `WITH latest_prices AS (
        SELECT DISTINCT ON (symbol) symbol, close_price
        FROM stockdata
        ORDER BY symbol, date DESC
      )
      SELECT sh.symbol, sh.quantity, s.company_name, COALESCE(lp.close_price, 0) as current_price 
      FROM stockholding sh 
      JOIN stock s ON sh.symbol = s.symbol 
      LEFT JOIN latest_prices lp ON sh.symbol = lp.symbol 
      WHERE sh.portfolioid = $1`,
      [portfolioId]
    );

    const stocks = holdingsResult.rows;
    const stockSymbols = stocks.map((stock) => stock.symbol);

    // Get price data for all stocks
    const priceDataResult = await pool.query(
      `SELECT symbol, date, close_price 
       FROM stockdata 
       WHERE symbol = ANY($1)
       AND date BETWEEN $2 AND $3
       ORDER BY symbol, date`,
      [stockSymbols, startDate, endDate]
    );

    // Check if we have enough data points
    const dataPointsBySymbol = {};
    priceDataResult.rows.forEach((row) => {
      if (!dataPointsBySymbol[row.symbol]) {
        dataPointsBySymbol[row.symbol] = 0;
      }
      dataPointsBySymbol[row.symbol]++;
    });

    // If we have less than 2 data points for any stock, return an error
    const insufficientData = Object.entries(dataPointsBySymbol).filter(
      ([_, count]) => count < 2
    );
    if (insufficientData.length > 0) {
      return res.status(400).json({
        error: "Insufficient data points",
        details: `Need at least 2 data points for each stock. Current data points: ${Object.entries(
          dataPointsBySymbol
        )
          .map(([symbol, count]) => `${symbol}: ${count}`)
          .join(", ")}`,
      });
    }

    // Organize price data by symbol
    const priceDataBySymbol = {};
    priceDataResult.rows.forEach((row) => {
      if (!priceDataBySymbol[row.symbol]) {
        priceDataBySymbol[row.symbol] = [];
      }
      priceDataBySymbol[row.symbol].push(row);
    });

    // Calculate daily returns for each stock
    const returnsBySymbol = {};
    Object.entries(priceDataBySymbol).forEach(([symbol, prices]) => {
      returnsBySymbol[symbol] = prices.slice(1).map((price, i) => {
        const prevPrice = prices[i].close_price;
        return (price.close_price - prevPrice) / prevPrice;
      });
    });

    // Calculate portfolio weights
    const totalValue = stocks.reduce(
      (sum, stock) => sum + stock.quantity * stock.current_price,
      0
    );
    const weights = stocks.map((stock) => ({
      symbol: stock.symbol,
      weight: (stock.quantity * stock.current_price) / totalValue,
    }));

    // Calculate market returns (average of all stocks)
    const marketReturns = calculateMarketReturns(returnsBySymbol, weights);

    // Calculate statistics for each stock
    const stockStats = stocks.map((stock) => {
      const returns = returnsBySymbol[stock.symbol] || [];

      // Calculate mean and standard deviation of returns
      const meanReturn =
        returns.reduce((sum, r) => sum + r, 0) / returns.length;
      const stddevReturn = Math.sqrt(
        returns.reduce((sum, r) => sum + Math.pow(r - meanReturn, 2), 0) /
          (returns.length - 1)
      );

      // Calculate coefficient of variation (risk per unit of return)
      const coefficientOfVariation = stddevReturn / Math.abs(meanReturn || 1);

      // Calculate beta (market sensitivity)
      const beta = calculateBeta(returns, marketReturns);

      // Calculate expected return (using historical mean)
      const expectedReturn = meanReturn * 252; // Annualized return

      return {
        symbol: stock.symbol,
        company_name: stock.company_name,
        weight: weights.find((w) => w.symbol === stock.symbol)?.weight || 0,
        coefficient_of_variation: coefficientOfVariation,
        beta: beta,
        expected_return: expectedReturn,
        standard_deviation: stddevReturn * Math.sqrt(252), // Annualized volatility
        data_points: dataPointsBySymbol[stock.symbol],
      };
    });

    // Calculate portfolio-level statistics
    const portfolioBeta = stockStats.reduce(
      (sum, stock) => sum + stock.beta * stock.weight,
      0
    );
    const portfolioExpectedReturn = stockStats.reduce(
      (sum, stock) => sum + stock.expected_return * stock.weight,
      0
    );

    // Calculate portfolio variance using covariance matrix
    let portfolioVariance = 0;
    for (let i = 0; i < stockSymbols.length; i++) {
      for (let j = 0; j < stockSymbols.length; j++) {
        const stock1Returns = returnsBySymbol[stockSymbols[i]] || [];
        const stock2Returns = returnsBySymbol[stockSymbols[j]] || [];

        const { covariance } = calculateCorrelationAndCovariance(
          stock1Returns,
          stock2Returns
        );

        const weight1 =
          weights.find((w) => w.symbol === stockSymbols[i])?.weight || 0;
        const weight2 =
          weights.find((w) => w.symbol === stockSymbols[j])?.weight || 0;
        portfolioVariance += weight1 * weight2 * covariance;
      }
    }
    const portfolioStandardDeviation = Math.sqrt(portfolioVariance * 252); // Annualized

    // Calculate correlation matrix
    const correlationMatrix = [];
    for (let i = 0; i < stockSymbols.length; i++) {
      for (let j = i + 1; j < stockSymbols.length; j++) {
        const stock1Returns = returnsBySymbol[stockSymbols[i]] || [];
        const stock2Returns = returnsBySymbol[stockSymbols[j]] || [];

        const { correlation, covariance } = calculateCorrelationAndCovariance(
          stock1Returns,
          stock2Returns
        );

        correlationMatrix.push({
          stock1: stockSymbols[i],
          stock2: stockSymbols[j],
          correlation: Number(correlation.toFixed(6)),
          covariance: Number(covariance.toFixed(6)),
          data_points: Math.min(
            dataPointsBySymbol[stockSymbols[i]],
            dataPointsBySymbol[stockSymbols[j]]
          ),
        });
      }
    }

    res.json({
      stocks: stockStats,
      correlation_matrix: correlationMatrix,
      portfolio: {
        beta: portfolioBeta,
        expected_return: portfolioExpectedReturn,
        standard_deviation: portfolioStandardDeviation,
        total_value: totalValue,
      },
      data_summary: {
        date_range: {
          start: startDate,
          end: endDate,
        },
        data_points: dataPointsBySymbol,
      },
    });
  } catch (error) {
    console.error("Error fetching portfolio statistics:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Helper function to calculate correlation and covariance
function calculateCorrelationAndCovariance(returns1, returns2) {
  // Find the overlapping dates
  const minLength = Math.min(returns1.length, returns2.length);
  if (minLength < 2) return { correlation: 0, covariance: 0 };

  // Use only the overlapping returns
  const alignedReturns1 = returns1.slice(0, minLength);
  const alignedReturns2 = returns2.slice(0, minLength);

  const mean1 = alignedReturns1.reduce((sum, r) => sum + r, 0) / minLength;
  const mean2 = alignedReturns2.reduce((sum, r) => sum + r, 0) / minLength;

  let covariance = 0;
  let variance1 = 0;
  let variance2 = 0;

  for (let i = 0; i < minLength; i++) {
    const diff1 = alignedReturns1[i] - mean1;
    const diff2 = alignedReturns2[i] - mean2;
    covariance += diff1 * diff2;
    variance1 += diff1 * diff1;
    variance2 += diff2 * diff2;
  }

  covariance /= minLength - 1;
  variance1 /= minLength - 1;
  variance2 /= minLength - 1;

  const correlation =
    variance1 === 0 || variance2 === 0
      ? 0
      : covariance / Math.sqrt(variance1 * variance2);

  return { correlation, covariance };
}

// Helper function to calculate beta
function calculateBeta(stockReturns, marketReturns) {
  const minLength = Math.min(stockReturns.length, marketReturns.length);
  if (minLength < 2) return 0;

  const alignedStockReturns = stockReturns.slice(0, minLength);
  const alignedMarketReturns = marketReturns.slice(0, minLength);

  const { covariance } = calculateCorrelationAndCovariance(
    alignedStockReturns,
    alignedMarketReturns
  );
  const marketVariance = calculateVariance(alignedMarketReturns);

  return marketVariance === 0 ? 0 : covariance / marketVariance;
}

// Helper function to calculate variance
function calculateVariance(returns) {
  if (returns.length === 0) return 0;
  const mean = returns.reduce((sum, r) => sum + r, 0) / returns.length;
  return (
    returns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) /
    (returns.length - 1)
  );
}

// Helper function to calculate market returns (average of all stocks)
function calculateMarketReturns(returnsBySymbol, weights) {
  const symbols = Object.keys(returnsBySymbol);
  if (symbols.length === 0) return [];

  // Find the minimum length of returns arrays
  const minLength = Math.min(...symbols.map((s) => returnsBySymbol[s].length));
  if (minLength < 2) return [];

  // Calculate weighted average returns
  const marketReturns = [];
  for (let i = 0; i < minLength; i++) {
    let weightedReturn = 0;
    let totalWeight = 0;

    symbols.forEach((symbol) => {
      const weight = weights.find((w) => w.symbol === symbol)?.weight || 0;
      weightedReturn += returnsBySymbol[symbol][i] * weight;
      totalWeight += weight;
    });

    marketReturns.push(totalWeight > 0 ? weightedReturn / totalWeight : 0);
  }

  return marketReturns;
}

module.exports = router;
