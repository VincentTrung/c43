import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../services/api";
import {
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Container,
  Box,
  CircularProgress,
  Alert,
} from "@mui/material";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

const StockDetailsPage = () => {
  const { symbol } = useParams();
  const navigate = useNavigate();
  const [stockInfo, setStockInfo] = useState(null);
  const [predictions, setPredictions] = useState(null);
  const [predictionDays, setPredictionDays] = useState(7);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [timeInterval, setTimeInterval] = useState("1M"); // Default to 1 month

  useEffect(() => {
    const fetchStockInfo = async () => {
      try {
        setLoading(true);
        const data = await api.getStockInfo(symbol);

        // Process the data to convert string values to numbers
        const processedData = {
          ...data,
          latest_price: data.latest_price
            ? {
                ...data.latest_price,
                open_price: parseFloat(data.latest_price.open_price) || 0,
                high_price: parseFloat(data.latest_price.high_price) || 0,
                low_price: parseFloat(data.latest_price.low_price) || 0,
                close_price: parseFloat(data.latest_price.close_price) || 0,
                volume: parseInt(data.latest_price.volume) || 0,
              }
            : null,
          price_history: data.price_history.map((price) => ({
            ...price,
            open_price: parseFloat(price.open_price) || 0,
            high_price: parseFloat(price.high_price) || 0,
            low_price: parseFloat(price.low_price) || 0,
            close_price: parseFloat(price.close_price) || 0,
            volume: parseInt(price.volume) || 0,
          })),
        };

        setStockInfo(processedData);
      } catch (err) {
        setError("Error fetching stock information");
        console.error("Error:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchStockInfo();
  }, [symbol]);

  useEffect(() => {
    if (stockInfo) {
      fetchPredictions();
    }
  }, [stockInfo, predictionDays]);

  const fetchPredictions = async () => {
    try {
      console.log(
        `Fetching predictions for ${symbol} for ${predictionDays} days`
      );
      const data = await api.getStockPrediction(symbol, predictionDays);
      console.log("Prediction data received:", data);

      // Ensure predictions have valid price values
      if (data && data.predictions) {
        data.predictions = data.predictions.map((pred) => ({
          ...pred,
          price: pred.price !== null ? pred.price : 0,
        }));
      }

      console.log("Processed prediction data:", data);
      setPredictions(data);
    } catch (err) {
      console.error("Error fetching predictions:", err);
      // Don't set error state here to avoid breaking the UI
      // Just log the error and continue with null predictions
    }
  };

  // Filter price history based on selected time interval
  const getFilteredPriceHistory = () => {
    if (!stockInfo?.price_history) return [];

    // Sort all history by date ascending
    const sortedHistory = [...stockInfo.price_history].sort(
      (a, b) => new Date(a.date) - new Date(b.date)
    );

    if (sortedHistory.length === 0) return [];

    const intervals = {
      "1W": 7, // 1 week
      "1M": 30, // 1 month
      "3M": 90, // 3 months
      "1Y": 365, // 1 year
      "5Y": 1825, // 5 years
      ALL: null, // null means show all data
    };

    // If ALL is selected or no interval is found, return all data
    if (timeInterval === "ALL" || !intervals[timeInterval]) {
      return sortedHistory;
    }

    // Get the latest date from the data
    const latestDate = new Date(sortedHistory[sortedHistory.length - 1].date);

    // Calculate the start date based on the selected interval
    const startDate = new Date(latestDate);
    startDate.setDate(startDate.getDate() - intervals[timeInterval]);

    // Filter data to only include dates after the start date
    return sortedHistory.filter((price) => new Date(price.date) >= startDate);
  };

  if (loading) {
    return (
      <Container
        sx={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: "80vh",
        }}
      >
        <CircularProgress />
      </Container>
    );
  }

  if (error) {
    return (
      <Container sx={{ mt: 4 }}>
        <Alert severity="error">{error}</Alert>
      </Container>
    );
  }

  if (!stockInfo) {
    return (
      <Container sx={{ mt: 4 }}>
        <Alert severity="warning">Stock not found</Alert>
      </Container>
    );
  }

  const filteredPriceHistory = getFilteredPriceHistory();

  // Prepare historical data with null values for prediction dates
  const historicalData = stockInfo.price_history
    .slice()
    .reverse()
    .map((day) => ({
      date: new Date(day.date).toLocaleDateString(),
      historicalPrice: day.close_price,
      predictedPrice: null,
    }));

  // Add predictions with null values for historical dates
  if (predictions?.predictions?.length > 0) {
    // Get the last historical date
    const lastHistoricalDate = new Date(
      historicalData[historicalData.length - 1].date
    );

    // First, add the last historical price as the first prediction point
    // to connect the lines smoothly
    historicalData[historicalData.length - 1].predictedPrice =
      historicalData[historicalData.length - 1].historicalPrice;

    // Then add future predictions
    predictions.predictions.forEach((pred) => {
      const predDate = new Date(pred.date);

      // Only add future predictions
      if (
        pred.price !== null &&
        pred.price !== undefined &&
        predDate > lastHistoricalDate
      ) {
        historicalData.push({
          date: predDate.toLocaleDateString(),
          historicalPrice: null,
          predictedPrice: pred.price,
        });
      }
    });
  }

  // Sort the combined data by date
  historicalData.sort((a, b) => new Date(a.date) - new Date(b.date));

  console.log("Combined data:", historicalData);

  // Safely get the last prediction price
  const getLastPredictionPrice = () => {
    const lastPrediction = historicalData.find(
      (d) => d.predictedPrice !== null
    );
    return lastPrediction ? lastPrediction.predictedPrice : null;
  };

  const lastPredictionPrice = getLastPredictionPrice();

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <Button
          variant="contained"
          color="primary"
          onClick={() => navigate(-1)}
        >
          Back
        </Button>
      </div>
      <div className="flex justify-between items-center">
        <Typography
          variant="h4"
          component="h1"
          style={{ fontWeight: "bold" }}
          gutterBottom
        >
          {symbol}
        </Typography>
      </div>
      {stockInfo.price_history.length > 0 && (
        <Alert severity="info" sx={{ mb: 2 }}>
          Historical data available from{" "}
          {new Date(stockInfo.price_history[0].date).toLocaleDateString()} to{" "}
          {new Date(
            stockInfo.price_history[stockInfo.price_history.length - 1].date
          ).toLocaleDateString()}
        </Alert>
      )}
      Stock Details
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}
      {stockInfo.latest_price && (
        <Paper className="p-6 mb-8">
          <Typography variant="h6" className="mb-4">
            Latest Price Information
          </Typography>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <Typography variant="subtitle2" color="textSecondary">
                Date
              </Typography>
              <Typography variant="h6">
                {new Date(stockInfo.latest_price.date).toLocaleDateString()}
              </Typography>
            </div>
            <div>
              <Typography variant="subtitle2" color="textSecondary">
                Open
              </Typography>
              <Typography variant="h6">
                ${stockInfo.latest_price.open_price.toFixed(2)}
              </Typography>
            </div>
            <div>
              <Typography variant="subtitle2" color="textSecondary">
                High
              </Typography>
              <Typography variant="h6">
                ${stockInfo.latest_price.high_price.toFixed(2)}
              </Typography>
            </div>
            <div>
              <Typography variant="subtitle2" color="textSecondary">
                Low
              </Typography>
              <Typography variant="h6">
                ${stockInfo.latest_price.low_price.toFixed(2)}
              </Typography>
            </div>
            <div>
              <Typography variant="subtitle2" color="textSecondary">
                Close
              </Typography>
              <Typography variant="h6">
                ${stockInfo.latest_price.close_price.toFixed(2)}
              </Typography>
            </div>
            <div>
              <Typography variant="subtitle2" color="textSecondary">
                Volume
              </Typography>
              <Typography variant="h6">
                {stockInfo.latest_price.volume.toLocaleString()}
              </Typography>
            </div>
          </div>
        </Paper>
      )}
      <Box sx={{ mb: 3 }}>
        <FormControl sx={{ minWidth: 200 }}>
          <InputLabel>Prediction Days</InputLabel>
          <Select
            value={predictionDays}
            onChange={(e) => setPredictionDays(e.target.value)}
            label="Prediction Days"
          >
            <MenuItem value={7}>7 days</MenuItem>
            <MenuItem value={14}>14 days</MenuItem>
            <MenuItem value={30}>30 days</MenuItem>
          </Select>
        </FormControl>
      </Box>
      <Box sx={{ height: 400 }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={historicalData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis
              domain={["auto", "auto"]}
              tickFormatter={(value) => `$${value.toFixed(2)}`}
              padding={{ top: 20, bottom: 20 }}
            />
            <Tooltip
              formatter={(value, name) => {
                if (value === null) return ["-", name];
                return [`$${value.toFixed(2)}`, name];
              }}
            />
            <Legend />
            <Line
              type="monotone"
              dataKey="historicalPrice"
              stroke="#8884d8"
              name="Historical Price"
              dot={false}
              strokeWidth={2}
              activeDot={{ r: 8 }}
              connectNulls={true}
            />
            <Line
              type="monotone"
              dataKey="predictedPrice"
              stroke="#ff7300"
              name="Predicted Price"
              dot={false}
              strokeWidth={2}
              strokeDasharray="5 5"
              connectNulls={true}
            />
          </LineChart>
        </ResponsiveContainer>
      </Box>
      {predictions && predictions.lastPrice && lastPredictionPrice && (
        <Box sx={{ mt: 3 }}>
          <Typography variant="h6" style={{ fontWeight: "bold" }} gutterBottom>
            Prediction Summary
          </Typography>
          <Typography>
            Current Price: ${predictions.lastPrice.toFixed(2)}
          </Typography>
          <Typography>
            Trend: {predictions.trend === "up" ? "Upward" : "Downward"}
          </Typography>
          <Typography>
            Predicted Price in {predictionDays} days: $
            {lastPredictionPrice.toFixed(2)}
          </Typography>
        </Box>
      )}
      {/* Price History Graph */}
      <Paper className="p-6 mb-8">
        <div className="flex justify-between items-center mb-4">
          <Typography variant="h6" style={{ fontWeight: "bold" }}>
            Price History
          </Typography>
          <FormControl sx={{ minWidth: 120 }}>
            <InputLabel>Time Interval</InputLabel>
            <Select
              value={timeInterval}
              label="Time Interval"
              onChange={(e) => setTimeInterval(e.target.value)}
            >
              <MenuItem value="1W">1 Week</MenuItem>
              <MenuItem value="1M">1 Month</MenuItem>
              <MenuItem value="3M">3 Months</MenuItem>
              <MenuItem value="1Y">1 Year</MenuItem>
              <MenuItem value="5Y">5 Years</MenuItem>
              <MenuItem value="ALL">All Data</MenuItem>
            </Select>
          </FormControl>
        </div>
        <div style={{ width: "100%", height: 400 }}>
          <ResponsiveContainer>
            <LineChart
              data={filteredPriceHistory}
              margin={{
                top: 20,
                right: 30,
                left: 20,
                bottom: 20,
              }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="date"
                tickFormatter={(date) => new Date(date).toLocaleDateString()}
              />
              <YAxis
                domain={["auto", "auto"]}
                tickFormatter={(value) => `$${value.toFixed(2)}`}
                padding={{ top: 20, bottom: 20 }}
              />
              <Tooltip
                labelFormatter={(date) => new Date(date).toLocaleDateString()}
                formatter={(value) => [`$${value.toFixed(2)}`, "Close Price"]}
              />
              <Legend />
              <Line
                type="monotone"
                dataKey="close_price"
                stroke="#8884d8"
                name="Close Price"
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Paper>
      {/* Price History Table */}
      <Paper className="p-6">
        <Typography
          variant="h6"
          className="mb-4"
          style={{ fontWeight: "bold" }}
        >
          Price History Table
        </Typography>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Date</TableCell>
                <TableCell>Open</TableCell>
                <TableCell>High</TableCell>
                <TableCell>Low</TableCell>
                <TableCell>Close</TableCell>
                <TableCell>Volume</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredPriceHistory.map((price) => (
                <TableRow key={price.date}>
                  <TableCell>
                    {new Date(price.date).toLocaleDateString()}
                  </TableCell>
                  <TableCell>${price.open_price.toFixed(2)}</TableCell>
                  <TableCell>${price.high_price.toFixed(2)}</TableCell>
                  <TableCell>${price.low_price.toFixed(2)}</TableCell>
                  <TableCell>${price.close_price.toFixed(2)}</TableCell>
                  <TableCell>{price.volume.toLocaleString()}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
    </div>
  );
};

export default StockDetailsPage;
