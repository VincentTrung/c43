const express = require("express");
const router = express.Router();
const pool = require("../db");

//
// Predicts future stock prices using a simple moving average method
// Parameters:
router.get("/:symbol/predict", async (req, res) => {
  try {
    const { symbol } = req.params;
    const days = parseInt(req.query.days) || 7;

    // Get historical data for the last 30 days
    const historicalData = await pool.query(
      `SELECT date, close_price 
       FROM stockdata 
       WHERE symbol = $1 
       ORDER BY date DESC 
       LIMIT 30`,
      [symbol]
    );

    if (historicalData.rows.length === 0) {
      return res
        .status(404)
        .json({ message: "No historical data found for this stock" });
    }

    // Calculate n-day moving average
    const reversedPrices = historicalData.rows.map((row) =>
      parseFloat(row.close_price)
    );

    const prices = [...reversedPrices].reverse(); // values are reversed, need to reverse them back

    // Calculate trend (simple linear regression)
    // X = (n - 1) / 2
    // Y = sum(y_i) / n
    // slope = sum((x_i - X)(y_i - Y)) / sum((x_i - X)^2)

    // Use the minimum of days and available data points
    const dataPoints = Math.min(days, prices.length);

    // Average price and days (time)
    const xMean = (dataPoints - 1) / 2;
    const yMean =
      prices.slice(0, dataPoints).reduce((a, b) => a + b, 0) / dataPoints;

    // Calculate slope (trend)
    let numerator = 0;
    let denominator = 0;
    for (let i = 0; i < dataPoints; i++) {
      numerator += (i - xMean) * (prices[i] - yMean);
      console.log("numerator:", numerator);
      denominator += Math.pow(i - xMean, 2);
      console.log("denominator:", denominator);
    }

    // Prevent division by zero or NaN slope
    let slope = 0;
    if (denominator !== 0) {
      slope = numerator / denominator;
    }

    // If slope is NaN, use a small random value to create some variation
    if (isNaN(slope)) {
      slope = (Math.random() - 0.5) * 0.1;
    }

    // Generate predictions
    const predictions = [];
    const lastDate = new Date(historicalData.rows[0].date);
    const lastPrice = prices[0];

    // Add the last historical price as the first prediction to ensure continuity
    predictions.push({
      date: lastDate.toISOString().split("T")[0],
      price: lastPrice,
    });

    // Start from the third day to ensure we have enough data points
    for (let i = 3; i <= days; i++) {
      const predictionDate = new Date(lastDate);
      predictionDate.setDate(predictionDate.getDate() + i);

      // Simple prediction: last price + trend
      const predictedPrice = lastPrice + slope * i;

      predictions.push({
        date: predictionDate.toISOString().split("T")[0],
        price: Math.max(0, predictedPrice), // Ensure price doesn't go negative
      });
    }

    // Log the predictions for debugging
    console.log("Generated predictions:", predictions);

    res.json({
      symbol,
      predictions,
      lastPrice,
      trend: slope > 0 ? "up" : "down",
    });
  } catch (error) {
    console.error("Error generating predictions:", error);
    res.status(500).json({ message: "Error generating predictions" });
  }
});

module.exports = router;
