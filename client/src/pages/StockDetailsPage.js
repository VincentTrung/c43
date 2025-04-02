import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../services/api";
import {
  Box,
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

  // Filter price history based on selected time interval
  const getFilteredPriceHistory = () => {
    if (!stockInfo?.price_history) return [];

    const now = new Date();
    const intervals = {
      "1W": 7, // 1 week
      "1M": 30, // 1 month
      "3M": 90, // 3 months
      "1Y": 365, // 1 year
      "5Y": 1825, // 5 years
    };

    const daysToShow = intervals[timeInterval] || 30;
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToShow);

    console.log("Filtering with:", {
      timeInterval,
      daysToShow,
      cutoffDate: cutoffDate.toISOString(),
      totalRecords: stockInfo.price_history.length,
    });

    const filtered = stockInfo.price_history
      .filter((price) => {
        const priceDate = new Date(price.date);
        return priceDate >= cutoffDate;
      })
      .sort((a, b) => new Date(a.date) - new Date(b.date));

    console.log("Filtered records:", filtered.length);
    return filtered;
  };

  if (loading) return <div>Loading...</div>;
  if (error) return <div>{error}</div>;
  if (!stockInfo) return <div>Stock not found</div>;

  const filteredPriceHistory = getFilteredPriceHistory();

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">
          {stockInfo.symbol} - {stockInfo.company_name}
        </h1>
        <Button
          variant="contained"
          color="primary"
          onClick={() => navigate(-1)}
        >
          Back
        </Button>
      </div>

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

      {/* Price History Graph */}
      <Paper className="p-6 mb-8">
        <div className="flex justify-between items-center mb-4">
          <Typography variant="h6">Price History</Typography>
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
            </Select>
          </FormControl>
        </div>
        <div style={{ width: "100%", height: 400 }}>
          <ResponsiveContainer>
            <LineChart
              data={filteredPriceHistory}
              margin={{
                top: 5,
                right: 30,
                left: 20,
                bottom: 5,
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
        <Typography variant="h6" className="mb-4">
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
