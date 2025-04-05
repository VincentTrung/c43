const express = require("express");
const router = express.Router();
const pool = require("../db");

// Create a new stock list
router.post("/", async (req, res) => {
  try {
    const { name, visibility } = req.body;
    const userId = req.session.user.userid;

    // Validate visibility
    if (!["private", "shared", "public"].includes(visibility)) {
      return res.status(400).json({ message: "Invalid visibility setting" });
    }

    const result = await pool.query(
      "INSERT INTO stocklist (userid, name, visibility) VALUES ($1, $2, $3) RETURNING *",
      [userId, name, visibility]
    );

    res.json(result.rows[0]);
  } catch (error) {
    console.error("Error creating stock list:", error);
    res
      .status(500)
      .json({ message: "Error creating stock list", error: error.message });
  }
});

// Get all stock lists for a user
router.get("/", async (req, res) => {
  try {
    const userId = req.session.user.userid;

    // Get only user's own lists
    const result = await pool.query(
      `SELECT sl.*, u.username as creator_name,
              (SELECT COUNT(*) FROM stocklistitem WHERE listid = sl.listid) as item_count
       FROM stocklist sl
       JOIN users u ON sl.userid = u.userid
       WHERE sl.userid = $1
       ORDER BY sl.listid DESC`,
      [userId]
    );

    res.json(result.rows);
  } catch (error) {
    console.error("Error fetching stock lists:", error);
    res
      .status(500)
      .json({ message: "Error fetching stock lists", error: error.message });
  }
});

// Delete a stock list
router.delete("/:listId", async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // First verify ownership
    const ownershipResult = await client.query(
      "SELECT userid FROM stocklist WHERE listid = $1",
      [req.params.listId]
    );

    if (ownershipResult.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ message: "Stock list not found" });
    }

    if (ownershipResult.rows[0].userid !== req.session.user.userid) {
      await client.query("ROLLBACK");
      return res
        .status(403)
        .json({ message: "Not authorized to delete this stock list" });
    }

    // First delete all shared stock list entries
    await client.query("DELETE FROM sharedstocklist WHERE listid = $1", [
      req.params.listId,
    ]);

    // Then delete all items in the stock list
    await client.query("DELETE FROM stocklistitem WHERE listid = $1", [
      req.params.listId,
    ]);

    // Finally delete the stock list
    await client.query("DELETE FROM stocklist WHERE listid = $1", [
      req.params.listId,
    ]);

    await client.query("COMMIT");
    res.json({ message: "Stock list deleted successfully" });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Error deleting stock list:", err);
    res.status(500).json({ message: "Error deleting stock list" });
  } finally {
    client.release();
  }
});

// Get public stock lists
router.get("/public", async (req, res) => {
  try {
    const userId = req.session.user.userid;

    // Get public lists that are not owned by the current user
    const result = await pool.query(
      `SELECT sl.*, u.username as owner_name,
              (SELECT COUNT(*) FROM stocklistitem WHERE listid = sl.listid) as item_count
       FROM stocklist sl
       JOIN users u ON sl.userid = u.userid
       WHERE sl.visibility = 'public'
       AND sl.userid != $1
       ORDER BY sl.name`,
      [userId]
    );

    res.json(result.rows);
  } catch (error) {
    console.error("Error fetching public stock lists:", error);
    res.status(500).json({ message: "Error fetching public stock lists" });
  }
});

// Get shared stock lists from friends
router.get("/shared", async (req, res) => {
  try {
    const userId = req.session.user.userid;

    // Get lists explicitly shared with the user
    const result = await pool.query(
      `SELECT sl.*, u.username as owner_name,
              (SELECT COUNT(*) FROM stocklistitem WHERE listid = sl.listid) as item_count
       FROM stocklist sl
       JOIN users u ON sl.userid = u.userid
       JOIN sharedstocklist ssl ON sl.listid = ssl.listid
       WHERE ssl.shared_with_userid = $1
       AND sl.visibility = 'shared'
       ORDER BY sl.name`,
      [userId]
    );

    res.json(result.rows);
  } catch (error) {
    console.error("Error fetching shared stock lists:", error);
    res.status(500).json({ message: "Error fetching shared stock lists" });
  }
});

// Get a specific stock list with its items
router.get("/:listId", async (req, res) => {
  try {
    const { listId } = req.params;
    const userId = req.session.user.userid;

    // Get stock list details
    const listResult = await pool.query(
      `SELECT sl.*, u.username as creator_name, sl.userid
       FROM stocklist sl
       JOIN users u ON sl.userid = u.userid
       WHERE sl.listid = $1`,
      [listId]
    );

    if (listResult.rows.length === 0) {
      return res.status(404).json({ message: "Stock list not found" });
    }

    // Get stock list items with current prices
    const itemsResult = await pool.query(
      `SELECT sli.*, s.company_name,
              (SELECT close_price 
               FROM stockdata sd 
               WHERE sd.symbol = sli.symbol 
               ORDER BY date DESC 
               LIMIT 1) as current_price
       FROM stocklistitem sli
       JOIN stock s ON sli.symbol = s.symbol
       WHERE sli.listid = $1`,
      [listId]
    );

    // Calculate total value
    const totalValue = itemsResult.rows.reduce((sum, item) => {
      return sum + (item.current_price || 0) * item.quantity;
    }, 0);

    res.json({
      ...listResult.rows[0],
      items: itemsResult.rows,
      total_value: totalValue,
    });
  } catch (error) {
    console.error("Error fetching stock list:", error);
    res
      .status(500)
      .json({ message: "Error fetching stock list", error: error.message });
  }
});

// Add a stock to a list
router.post("/:listId/stocks", async (req, res) => {
  const client = await pool.connect();
  try {
    const { listId } = req.params;
    const { symbol, quantity } = req.body;
    const userId = req.session.user.userid;

    await client.query("BEGIN");

    // Verify list belongs to user or is shared with user
    const listResult = await client.query(
      `SELECT sl.* FROM stocklist sl
       LEFT JOIN sharedstocklist ssl ON sl.listid = ssl.listid
       WHERE sl.listid = $1 AND (sl.userid = $2 OR ssl.shared_with_userid = $2)`,
      [listId, userId]
    );

    if (listResult.rows.length === 0) {
      await client.query("ROLLBACK");
      return res
        .status(404)
        .json({ message: "Stock list not found or access denied" });
    }

    // Check if stock exists
    const stockResult = await client.query(
      "SELECT * FROM stock WHERE symbol = $1",
      [symbol]
    );

    // If stock doesn't exist, add it to the Stock table
    if (stockResult.rows.length === 0) {
      // Get stock info from stockdata table
      const stockDataResult = await client.query(
        "SELECT * FROM stockdata WHERE symbol = $1 ORDER BY date DESC LIMIT 1",
        [symbol]
      );

      if (stockDataResult.rows.length === 0) {
        await client.query("ROLLBACK");
        return res.status(404).json({ message: "Stock not found in database" });
      }

      // Add stock to Stock table
      await client.query(
        "INSERT INTO stock (symbol, company_name) VALUES ($1, $2)",
        [symbol, symbol] // Using symbol as company name for now
      );
    }

    // Add or update stock in list
    const result = await client.query(
      `INSERT INTO stocklistitem (listid, symbol, quantity)
       VALUES ($1, $2, $3)
       ON CONFLICT (listid, symbol)
       DO UPDATE SET quantity = stocklistitem.quantity + $3
       RETURNING *`,
      [listId, symbol, quantity]
    );

    await client.query("COMMIT");
    res.json(result.rows[0]);
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Error adding stock to list:", error);
    res
      .status(500)
      .json({ message: "Error adding stock to list", error: error.message });
  } finally {
    client.release();
  }
});

// Remove a stock from a list
router.delete("/:listId/stocks/:symbol", async (req, res) => {
  const client = await pool.connect();
  try {
    const { listId, symbol } = req.params;
    const userId = req.session.user.userid;

    await client.query("BEGIN");

    // Verify list belongs to user
    const listResult = await client.query(
      "SELECT * FROM stocklist WHERE listid = $1 AND userid = $2",
      [listId, userId]
    );

    if (listResult.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ message: "Stock list not found" });
    }

    // Remove stock from list
    const result = await client.query(
      "DELETE FROM stocklistitem WHERE listid = $1 AND symbol = $2 RETURNING *",
      [listId, symbol]
    );

    if (result.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ message: "Stock not found in list" });
    }

    await client.query("COMMIT");
    res.json({ message: "Stock removed from list successfully" });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Error removing stock from list:", error);
    res.status(500).json({
      message: "Error removing stock from list",
      error: error.message,
    });
  } finally {
    client.release();
  }
});

// Share a stock list with a friend
router.post("/:listId/share", async (req, res) => {
  const client = await pool.connect();
  try {
    const { listId } = req.params;
    const { friendId } = req.body;
    const userId = req.session.user.userid;

    await client.query("BEGIN");

    // Verify list belongs to user
    const listResult = await client.query(
      "SELECT * FROM stocklist WHERE listid = $1 AND userid = $2",
      [listId, userId]
    );

    if (listResult.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ message: "Stock list not found" });
    }

    // Verify friendship exists
    const friendResult = await client.query(
      `SELECT * FROM friend 
       WHERE (user1_id = $1 AND user2_id = $2) 
       OR (user1_id = $2 AND user2_id = $1)`,
      [userId, friendId]
    );

    if (friendResult.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(400).json({ message: "User is not your friend" });
    }

    // Check if already shared
    const sharedResult = await client.query(
      "SELECT * FROM sharedstocklist WHERE listid = $1 AND shared_with_userid = $2",
      [listId, friendId]
    );

    if (sharedResult.rows.length > 0) {
      await client.query("ROLLBACK");
      return res
        .status(400)
        .json({ message: "List already shared with this friend" });
    }

    // Share the list
    await client.query(
      "INSERT INTO sharedstocklist (listid, shared_with_userid) VALUES ($1, $2)",
      [listId, friendId]
    );

    // Update list visibility to 'shared' if it's currently 'private'
    if (listResult.rows[0].visibility === "private") {
      await client.query(
        "UPDATE stocklist SET visibility = 'shared' WHERE listid = $1",
        [listId]
      );
    }

    await client.query("COMMIT");
    res.json({ message: "Stock list shared successfully" });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Error sharing stock list:", error);
    res
      .status(500)
      .json({ message: "Error sharing stock list", error: error.message });
  } finally {
    client.release();
  }
});

// Helper function to calculate correlation and covariance between two return arrays
function calculateCorrelationAndCovariance(returns1, returns2) {
  // Find the minimum length between the two arrays
  const minLength = Math.min(returns1.length, returns2.length);
  if (minLength < 2) return { correlation: 0, covariance: 0 };

  // Use only the overlapping returns
  const alignedReturns1 = returns1.slice(0, minLength);
  const alignedReturns2 = returns2.slice(0, minLength);

  // Calculate means
  const mean1 = alignedReturns1.reduce((sum, r) => sum + r, 0) / minLength;
  const mean2 = alignedReturns2.reduce((sum, r) => sum + r, 0) / minLength;

  // Calculate covariance
  const covariance =
    alignedReturns1.reduce((sum, r1, i) => {
      return sum + (r1 - mean1) * (alignedReturns2[i] - mean2);
    }, 0) /
    (minLength - 1);

  // Calculate standard deviations
  const stddev1 = Math.sqrt(
    alignedReturns1.reduce((sum, r) => sum + Math.pow(r - mean1, 2), 0) /
      (minLength - 1)
  );
  const stddev2 = Math.sqrt(
    alignedReturns2.reduce((sum, r) => sum + Math.pow(r - mean2, 2), 0) /
      (minLength - 1)
  );

  // Calculate correlation
  const correlation = covariance / (stddev1 * stddev2);

  return {
    correlation: Number(correlation.toFixed(6)),
    covariance: Number(covariance.toFixed(6)),
  };
}

// Helper function to calculate beta
function calculateBeta(stockReturns, marketReturns) {
  if (stockReturns.length < 2 || marketReturns.length < 2) return 0;

  // Find the minimum length between the two arrays
  const minLength = Math.min(stockReturns.length, marketReturns.length);
  if (minLength < 2) return 0;

  // Use only the overlapping returns
  const alignedStockReturns = stockReturns.slice(0, minLength);
  const alignedMarketReturns = marketReturns.slice(0, minLength);

  // Calculate covariance between stock and market returns
  const { covariance } = calculateCorrelationAndCovariance(
    alignedStockReturns,
    alignedMarketReturns
  );

  // Calculate market variance
  const marketMean =
    alignedMarketReturns.reduce((sum, r) => sum + r, 0) / minLength;
  const marketVariance =
    alignedMarketReturns.reduce(
      (sum, r) => sum + Math.pow(r - marketMean, 2),
      0
    ) /
    (minLength - 1);

  // Calculate beta
  const beta = marketVariance !== 0 ? covariance / marketVariance : 0;

  return Number(beta.toFixed(6));
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

// Get stock list statistics
router.get("/:listId/statistics", async (req, res) => {
  try {
    const { listId } = req.params;
    const { startDate, endDate } = req.query;
    const userId = req.session.user.userid;

    // Validate dates
    if (!startDate || !endDate) {
      return res
        .status(400)
        .json({ error: "Start date and end date are required" });
    }

    // Verify stock list belongs to user or is shared/public
    const listResult = await pool.query(
      `SELECT sl.*, u.username as creator_name
       FROM stocklist sl
       JOIN users u ON sl.userid = u.userid
       WHERE sl.listid = $1
       AND (sl.userid = $2 
            OR sl.visibility = 'public'
            OR EXISTS (
              SELECT 1 FROM sharedstocklist ssl 
              WHERE ssl.listid = sl.listid 
              AND ssl.shared_with_userid = $2
            ))`,
      [listId, userId]
    );

    if (listResult.rows.length === 0) {
      return res
        .status(404)
        .json({ message: "Stock list not found or access denied" });
    }

    // Get stock list items with current prices
    const itemsResult = await pool.query(
      `SELECT sli.*, s.company_name,
              (SELECT close_price 
               FROM stockdata sd 
               WHERE sd.symbol = sli.symbol 
               ORDER BY date DESC 
               LIMIT 1) as current_price
       FROM stocklistitem sli
       JOIN stock s ON sli.symbol = s.symbol
       WHERE sli.listid = $1`,
      [listId]
    );

    const stocks = itemsResult.rows;
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

    // Calculate weights based on current prices
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
        coefficient_of_variation: Number(coefficientOfVariation.toFixed(6)),
        beta: Number(beta.toFixed(6)),
        expected_return: Number(expectedReturn.toFixed(6)),
        standard_deviation: Number((stddevReturn * Math.sqrt(252)).toFixed(6)), // Annualized volatility
        data_points: dataPointsBySymbol[stock.symbol],
      };
    });

    // Calculate list-level statistics
    const listBeta = stockStats.reduce(
      (sum, stock) => sum + stock.beta * stock.weight,
      0
    );
    const listExpectedReturn = stockStats.reduce(
      (sum, stock) => sum + stock.expected_return * stock.weight,
      0
    );

    // Calculate list variance using covariance matrix
    let listVariance = 0;
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
        listVariance += weight1 * weight2 * covariance;
      }
    }
    const listStandardDeviation = Math.sqrt(listVariance * 252); // Annualized

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
        beta: Number(listBeta.toFixed(6)),
        expected_return: Number(listExpectedReturn.toFixed(6)),
        standard_deviation: Number(listStandardDeviation.toFixed(6)),
        total_value: Number(totalValue.toFixed(2)),
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
    console.error("Error fetching stock list statistics:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

module.exports = router;
