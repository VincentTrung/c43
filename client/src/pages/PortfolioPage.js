import React, { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../services/api";
import ErrorModal from "./ErrorModal";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  MenuItem,
  Box,
  IconButton,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Alert,
  CircularProgress,
  Grid,
} from "@mui/material";
import VisibilityIcon from "@mui/icons-material/Visibility";
import AddStockData from "./AddStockData";

const PortfolioPage = () => {
  // Get portfolio ID from URL parameters
  const { portfolioId } = useParams();
  const navigate = useNavigate();

  // State management
  const [portfolio, setPortfolio] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  // Form state
  const [depositAmount, setDepositAmount] = useState("");
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [buySymbol, setBuySymbol] = useState("");
  const [buyQuantity, setBuyQuantity] = useState("");
  const [sellSymbol, setSellSymbol] = useState("");
  const [sellQuantity, setSellQuantity] = useState("");

  // Modal state
  const [isErrorModalOpen, setIsErrorModalOpen] = useState(false);

  // Transfer state
  const [transferDialogOpen, setTransferDialogOpen] = useState(false);
  const [transferAmount, setTransferAmount] = useState("");
  const [sourcePortfolioId, setSourcePortfolioId] = useState("");
  const [transferError, setTransferError] = useState("");

  // Add these state variables after the other state declarations
  const [portfolios, setPortfolios] = useState([]);
  const [depositDialogOpen, setDepositDialogOpen] = useState(false);
  const [withdrawDialogOpen, setWithdrawDialogOpen] = useState(false);

  // Add Stock Data state
  const [isAddStockDataOpen, setIsAddStockDataOpen] = useState(false);

  // Statistics state
  const [statistics, setStatistics] = useState(null);
  const [statsLoading, setStatsLoading] = useState(false);
  const [statsError, setStatsError] = useState("");
  const [dateRange, setDateRange] = useState({
    startDate: "2013-02-07", // Updated default start date
    endDate: "2018-02-06", // Updated default end date
  });

  // Fetch portfolio data and convert string values to numbers
  const fetchPortfolio = useCallback(async () => {
    try {
      setLoading(true);
      const data = await api.getPortfolio(portfolioId);
      const processedData = {
        ...data,
        cash_balance: parseFloat(data.cash_balance) || 0,
        total_value: parseFloat(data.total_value) || 0,
        holdings:
          data.holdings?.map((holding) => ({
            ...holding,
            quantity: parseInt(holding.quantity) || 0,
            current_price: parseFloat(holding.current_price) || 0,
          })) || [],
      };
      setPortfolio(processedData);
    } catch (err) {
      setError("Error fetching portfolio");
      setIsErrorModalOpen(true);
      console.error("Error:", err);
    } finally {
      setLoading(false);
    }
  }, [portfolioId]);

  // Fetch transaction history and convert string values to numbers
  const fetchTransactions = useCallback(async () => {
    try {
      const data = await api.getPortfolioTransactions(portfolioId);
      const processedData = data.map((transaction) => ({
        ...transaction,
        quantity: parseInt(transaction.quantity) || 0,
        price: parseFloat(transaction.price) || 0,
        amount: parseFloat(transaction.amount) || 0,
      }));
      setTransactions(processedData);
    } catch (err) {
      console.error("Error fetching transactions:", err);
    }
  }, [portfolioId]);

  // Update the fetchPortfolios function
  const fetchPortfolios = useCallback(async () => {
    try {
      const data = await api.getPortfolios();
      const processedData = data.map((portfolio) => ({
        ...portfolio,
        cash_balance: parseFloat(portfolio.cash_balance) || 0,
        total_value: parseFloat(portfolio.total_value) || 0,
      }));
      setPortfolios(processedData);
    } catch (err) {
      console.error("Error fetching portfolios:", err);
    }
  }, []);

  // Fetch portfolio statistics
  const fetchPortfolioStatistics = useCallback(async () => {
    try {
      setStatsLoading(true);
      setStatsError("");
      const data = await api.getPortfolioStatistics(
        portfolioId,
        dateRange.startDate,
        dateRange.endDate
      );
      console.log("Portfolio Statistics Data:", data);
      setStatistics(data);
    } catch (err) {
      setStatsError(err.message);
      console.error("Error fetching portfolio statistics:", err);
    } finally {
      setStatsLoading(false);
    }
  }, [portfolioId, dateRange]);

  // Load portfolio and transaction data on component mount
  useEffect(() => {
    fetchPortfolio();
    fetchTransactions();
    fetchPortfolios();
    fetchPortfolioStatistics();
  }, [
    fetchPortfolio,
    fetchTransactions,
    fetchPortfolios,
    fetchPortfolioStatistics,
  ]);

  // Handle cash deposit
  const handleDeposit = async () => {
    try {
      setError("");
      await api.depositCash(portfolioId, parseFloat(depositAmount));
      setDepositAmount("");
      setDepositDialogOpen(false);
      fetchPortfolio();
      fetchTransactions();
    } catch (err) {
      setError(err.message);
      setIsErrorModalOpen(true);
      console.error("Error:", err);
    }
  };

  // Handle cash withdrawal
  const handleWithdraw = async () => {
    try {
      setError("");
      await api.withdrawCash(portfolioId, parseFloat(withdrawAmount));
      setWithdrawAmount("");
      setWithdrawDialogOpen(false);
      fetchPortfolio();
      fetchTransactions();
    } catch (err) {
      setError(err.message);
      setIsErrorModalOpen(true);
      console.error("Error:", err);
    }
  };

  // Handle stock purchase
  const handleBuyStock = async (e) => {
    e.preventDefault();
    try {
      setError("");
      await api.buyStock(portfolioId, buySymbol, parseInt(buyQuantity));
      setBuySymbol("");
      setBuyQuantity("");
      fetchPortfolio();
      fetchTransactions();
    } catch (err) {
      setError(err.message);
      setIsErrorModalOpen(true);
      console.error("Error:", err);
    }
  };

  // Handle stock sale
  const handleSellStock = async (e) => {
    e.preventDefault();
    try {
      setError("");
      await api.sellStock(portfolioId, sellSymbol, parseInt(sellQuantity));
      setSellSymbol("");
      setSellQuantity("");
      fetchPortfolio();
      fetchTransactions();
    } catch (err) {
      setError(err.message);
      setIsErrorModalOpen(true);
      console.error("Error:", err);
    }
  };

  // Handle transfer
  const handleTransfer = async () => {
    try {
      setTransferError("");
      if (!transferAmount || !sourcePortfolioId) {
        setTransferError("Please fill in all fields");
        return;
      }

      const amount = parseFloat(transferAmount);
      if (isNaN(amount) || amount <= 0) {
        setTransferError("Please enter a valid amount");
        return;
      }

      await api.createPortfolioTransaction(portfolioId, {
        type: "transfer",
        amount: amount,
        sourcePortfolioId: sourcePortfolioId,
      });

      // Refresh both portfolio and portfolios data
      await Promise.all([
        fetchPortfolio(),
        fetchTransactions(),
        fetchPortfolios(),
      ]);

      setTransferDialogOpen(false);
      setTransferAmount("");
      setSourcePortfolioId("");
    } catch (error) {
      setTransferError(error.message);
    }
  };

  // Show loading state
  if (loading) return <div>Loading...</div>;
  if (!portfolio) return <div>Portfolio not found</div>;

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-start items-center mb-8">
        <div className="flex gap-4">
          <Button
            variant="contained"
            color="primary"
            onClick={() => navigate("/dashboard")}
          >
            Back to Dashboard
          </Button>
        </div>
      </div>

      <div className="flex justify-between items-center mb-8">
        <Typography
          variant="h4"
          component="h1"
          style={{ fontWeight: "bold" }}
          gutterBottom
        >
          {portfolio?.name || "Portfolio"}
        </Typography>
        <Button
          variant="contained"
          color="primary"
          onClick={() => setIsAddStockDataOpen(true)}
        >
          Add Daily Stock Data
        </Button>
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      {/* Cash Account Section */}
      <div className="bg-white p-6 rounded-lg shadow-md mb-8">
        <h2 className="text-xl font-semibold mb-4">Cash Account</h2>
        <div className="mb-4">
          <p className="text-2xl font-bold text-green-600">
            ${portfolio.cash_balance.toFixed(2)}
          </p>
        </div>

        {/* Deposit Form */}
        <Box sx={{ display: "flex", gap: 2, mb: 3 }}>
          <Button
            variant="contained"
            color="primary"
            onClick={() => setDepositDialogOpen(true)}
          >
            Deposit
          </Button>
          <Button
            variant="contained"
            color="error"
            onClick={() => setWithdrawDialogOpen(true)}
          >
            Withdraw
          </Button>
          <Button
            variant="contained"
            color="secondary"
            onClick={() => setTransferDialogOpen(true)}
          >
            Transfer
          </Button>
        </Box>
      </div>

      {/* Stock Holdings Section */}
      <div className="bg-white p-6 rounded-lg shadow-md mb-8">
        <h2 className="text-xl font-semibold mb-4">Stock Holdings</h2>
        <div className="mb-4">
          <p className="text-lg">
            Total Portfolio Value: ${portfolio.total_value.toFixed(2)}
          </p>
        </div>

        {/* Stock Holdings Table */}
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead>
              <tr className="bg-gray-100">
                <th className="px-4 py-2">Symbol</th>
                <th className="px-4 py-2">Company Name</th>
                <th className="px-4 py-2">Quantity</th>
                <th className="px-4 py-2">Current Price</th>
                <th className="px-4 py-2">Value</th>
                <th className="px-4 py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {portfolio.holdings.map((holding) => (
                <tr key={holding.symbol} className="border-b">
                  <td className="px-4 py-2">{holding.symbol}</td>
                  <td className="px-4 py-2">{holding.company_name}</td>
                  <td className="px-4 py-2">{holding.quantity}</td>
                  <td className="px-4 py-2">
                    ${holding.current_price.toFixed(2)}
                  </td>
                  <td className="px-4 py-2">
                    ${(holding.quantity * holding.current_price).toFixed(2)}
                  </td>
                  <td className="px-4 py-2">
                    <IconButton
                      onClick={() => navigate(`/stock/${holding.symbol}`)}
                      color="primary"
                    >
                      <VisibilityIcon />
                    </IconButton>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Trading Forms */}
        <div className="mt-8">
          <h3 className="text-lg font-semibold mb-4">Buy Stock</h3>
          <form onSubmit={handleBuyStock}>
            <div className="flex gap-4">
              <input
                type="text"
                value={buySymbol}
                onChange={(e) => setBuySymbol(e.target.value)}
                placeholder="Stock Symbol"
                className="flex-1 p-2 border rounded"
                required
              />
              <input
                type="number"
                value={buyQuantity}
                onChange={(e) => setBuyQuantity(e.target.value)}
                placeholder="Quantity"
                className="flex-1 p-2 border rounded"
                required
                min="1"
              />
              <button
                type="submit"
                className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
              >
                Buy
              </button>
            </div>
          </form>
        </div>

        <div className="mt-4">
          <h3 className="text-lg font-semibold mb-4">Sell Stock</h3>
          <form onSubmit={handleSellStock}>
            <div className="flex gap-4">
              <input
                type="text"
                value={sellSymbol}
                onChange={(e) => setSellSymbol(e.target.value)}
                placeholder="Stock Symbol"
                className="flex-1 p-2 border rounded"
                required
              />
              <input
                type="number"
                value={sellQuantity}
                onChange={(e) => setSellQuantity(e.target.value)}
                placeholder="Quantity"
                className="flex-1 p-2 border rounded"
                required
                min="1"
              />
              <button
                type="submit"
                className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
              >
                Sell
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Stock Trading History Section */}
      <div className="bg-white p-6 rounded-lg shadow-md mb-8">
        <h2 className="text-xl font-semibold mb-4">Stock Trading History</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead>
              <tr className="bg-gray-100">
                <th className="px-4 py-2">Date</th>
                <th className="px-4 py-2">Symbol</th>
                <th className="px-4 py-2">Company Name</th>
                <th className="px-4 py-2">Type</th>
                <th className="px-4 py-2">Quantity</th>
                <th className="px-4 py-2">Price</th>
                <th className="px-4 py-2">Total</th>
              </tr>
            </thead>
            <tbody>
              {transactions
                .filter((t) => t.type === "BUY" || t.type === "SELL")
                .map((transaction) => (
                  <tr key={transaction.transactionid} className="border-b">
                    <td className="px-4 py-2">
                      {new Date(transaction.timestamp).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-2">{transaction.symbol}</td>
                    <td className="px-4 py-2">{transaction.company_name}</td>
                    <td
                      className={`px-4 py-2 ${
                        transaction.type === "BUY"
                          ? "text-green-600"
                          : "text-red-600"
                      }`}
                    >
                      {transaction.type}
                    </td>
                    <td className="px-4 py-2">{transaction.quantity}</td>
                    <td className="px-4 py-2">
                      ${transaction.price.toFixed(2)}
                    </td>
                    <td className="px-4 py-2">
                      ${(transaction.quantity * transaction.price).toFixed(2)}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Cash Transaction History Section */}
      <div className="bg-white p-6 rounded-lg shadow-md mb-8">
        <h2 className="text-xl font-semibold mb-4">Transaction History</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead>
              <tr className="bg-gray-100">
                <th className="px-4 py-2">Date</th>
                <th className="px-4 py-2">Type</th>
                <th className="px-4 py-2">Amount</th>
                <th className="px-4 py-2">Description</th>
              </tr>
            </thead>
            <tbody>
              {transactions
                .filter(
                  (t) => t.transaction_type === "CASH" || t.type === "TRANSFER"
                )
                .map((transaction) => (
                  <tr
                    key={`${transaction.transactionid}-${transaction.type}`}
                    className="border-b"
                  >
                    <td className="px-4 py-2">
                      {new Date(transaction.timestamp).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-2">
                      {transaction.type === "TRANSFER"
                        ? transaction.source_portfolio_id ===
                          portfolio.portfolioid
                          ? "TRANSFER WITHDRAWAL"
                          : "TRANSFER DEPOSIT"
                        : transaction.type === "DEPOSIT"
                        ? "EXTERNAL DEPOSIT"
                        : "EXTERNAL WITHDRAWAL"}
                    </td>
                    <td
                      className={`px-4 py-2 ${
                        transaction.type === "TRANSFER"
                          ? transaction.source_portfolio_id ===
                            portfolio.portfolioid
                            ? "text-red-600"
                            : "text-green-600"
                          : transaction.type === "DEPOSIT"
                          ? "text-green-600"
                          : "text-red-600"
                      }`}
                    >
                      {transaction.type === "TRANSFER"
                        ? transaction.source_portfolio_id ===
                          portfolio.portfolioid
                          ? "-"
                          : "+"
                        : transaction.type === "DEPOSIT"
                        ? "+"
                        : "-"}
                      ${transaction.amount.toFixed(2)}
                    </td>
                    <td className="px-4 py-2">
                      {transaction.type === "TRANSFER"
                        ? transaction.source_portfolio_id ===
                          portfolio.portfolioid
                          ? `Transfer to Portfolio #${transaction.destination_portfolio_id}`
                          : `Transfer from Portfolio #${transaction.source_portfolio_id}`
                        : transaction.type === "DEPOSIT"
                        ? "External Deposit"
                        : "External Withdrawal"}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Portfolio Statistics Section */}
      <div className="bg-white p-6 rounded-lg shadow-md mb-8">
        <Box sx={{ mt: 4 }}>
          <Typography variant="h6" style={{ fontWeight: "bold" }} gutterBottom>
            Portfolio Statistics
          </Typography>
          <Box sx={{ mb: 2, display: "flex", gap: 2, alignItems: "center" }}>
            <TextField
              label="Start Date"
              type="date"
              value={dateRange.startDate}
              onChange={(e) =>
                setDateRange({ ...dateRange, startDate: e.target.value })
              }
              InputLabelProps={{ shrink: true }}
            />
            <TextField
              label="End Date"
              type="date"
              value={dateRange.endDate}
              onChange={(e) =>
                setDateRange({ ...dateRange, endDate: e.target.value })
              }
              InputLabelProps={{ shrink: true }}
            />
            <Button
              variant="contained"
              onClick={fetchPortfolioStatistics}
              disabled={statsLoading}
            >
              Refresh Statistics
            </Button>
          </Box>

          {statsError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {statsError}
            </Alert>
          )}

          {statsLoading ? (
            <CircularProgress />
          ) : statistics ? (
            <>
              {/* Portfolio Summary */}
              <Paper sx={{ p: 2, mb: 3 }}>
                <Typography variant="subtitle1" gutterBottom>
                  Portfolio Summary
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6} md={3}>
                    <Typography variant="body2" color="text.secondary">
                      Total Value
                    </Typography>
                    <Typography variant="h6">
                      ${statistics.portfolio.total_value.toFixed(2)}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} sm={6} md={3}>
                    <Typography variant="body2" color="text.secondary">
                      Expected Return (Annual)
                    </Typography>
                    <Typography variant="h6">
                      {(statistics.portfolio.expected_return * 100).toFixed(2)}%
                    </Typography>
                  </Grid>
                  <Grid item xs={12} sm={6} md={3}>
                    <Typography variant="body2" color="text.secondary">
                      Portfolio Beta
                    </Typography>
                    <Typography variant="h6">
                      {statistics.portfolio.beta.toFixed(2)}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} sm={6} md={3}>
                    <Typography variant="body2" color="text.secondary">
                      Portfolio Volatility (Annual)
                    </Typography>
                    <Typography variant="h6">
                      {(statistics.portfolio.standard_deviation * 100).toFixed(
                        2
                      )}
                      %
                    </Typography>
                  </Grid>
                </Grid>
              </Paper>

              {/* Stock Statistics */}
              <TableContainer component={Paper} sx={{ mb: 3 }}>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Symbol</TableCell>
                      <TableCell>Company</TableCell>
                      <TableCell align="right">Weight</TableCell>
                      <TableCell align="right">Expected Return</TableCell>
                      <TableCell align="right">Beta</TableCell>
                      <TableCell align="right">
                        Coefficient of Variation
                      </TableCell>
                      <TableCell align="right">Volatility</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {statistics.stocks.map((stock) => (
                      <TableRow key={stock.symbol}>
                        <TableCell>{stock.symbol}</TableCell>
                        <TableCell>{stock.company_name}</TableCell>
                        <TableCell align="right">
                          {(stock.weight * 100).toFixed(2)}%
                        </TableCell>
                        <TableCell align="right">
                          {(stock.expected_return * 100).toFixed(2)}%
                        </TableCell>
                        <TableCell align="right">
                          {stock.beta.toFixed(2)}
                        </TableCell>
                        <TableCell align="right">
                          {stock.coefficient_of_variation.toFixed(2)}
                        </TableCell>
                        <TableCell align="right">
                          {(stock.standard_deviation * 100).toFixed(2)}%
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>

              {/* Correlation Matrix */}
              <Paper sx={{ p: 2, mb: 3 }}>
                <Typography variant="subtitle1" gutterBottom>
                  Correlation Matrix
                </Typography>
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Stock 1</TableCell>
                        <TableCell>Stock 2</TableCell>
                        <TableCell align="right">Correlation</TableCell>
                        <TableCell align="right">Covariance</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {statistics?.correlation_matrix?.map(
                        (correlation, index) => {
                          console.log("Correlation Entry:", correlation);
                          return (
                            <TableRow key={index}>
                              <TableCell>{correlation.stock1}</TableCell>
                              <TableCell>{correlation.stock2}</TableCell>
                              <TableCell align="right">
                                {correlation.correlation.toFixed(2)}
                              </TableCell>
                              <TableCell align="right">
                                {correlation.covariance.toFixed(4)}
                              </TableCell>
                            </TableRow>
                          );
                        }
                      )}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Paper>
            </>
          ) : null}
        </Box>
      </div>

      {/* Error Modal */}
      <ErrorModal
        isOpen={isErrorModalOpen}
        onClose={() => setIsErrorModalOpen(false)}
        error={error}
      />

      {/* Transfer Dialog */}
      <Dialog
        open={transferDialogOpen}
        onClose={() => setTransferDialogOpen(false)}
      >
        <DialogTitle>Transfer Between Portfolios</DialogTitle>
        <DialogContent>
          <TextField
            select
            fullWidth
            label="Source Portfolio"
            value={sourcePortfolioId}
            onChange={(e) => setSourcePortfolioId(e.target.value)}
            margin="normal"
            error={!!transferError}
            helperText={transferError}
          >
            {portfolios
              .filter((p) => p.portfolioid !== portfolio.portfolioid)
              .map((p) => (
                <MenuItem key={p.portfolioid} value={p.portfolioid}>
                  {p.name} (Balance: ${p.cash_balance.toFixed(2)})
                </MenuItem>
              ))}
          </TextField>
          <TextField
            fullWidth
            label="Amount"
            type="number"
            value={transferAmount}
            onChange={(e) => setTransferAmount(e.target.value)}
            margin="normal"
            error={!!transferError}
            helperText={transferError}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setTransferDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleTransfer} variant="contained" color="primary">
            Transfer
          </Button>
        </DialogActions>
      </Dialog>

      {/* Deposit Dialog */}
      <Dialog
        open={depositDialogOpen}
        onClose={() => setDepositDialogOpen(false)}
      >
        <DialogTitle>Deposit Cash</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label="Amount"
            type="number"
            value={depositAmount}
            onChange={(e) => setDepositAmount(e.target.value)}
            margin="normal"
            error={!!error}
            helperText={error}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDepositDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleDeposit} variant="contained" color="primary">
            Deposit
          </Button>
        </DialogActions>
      </Dialog>

      {/* Withdrawal Dialog */}
      <Dialog
        open={withdrawDialogOpen}
        onClose={() => setWithdrawDialogOpen(false)}
      >
        <DialogTitle>Withdraw Cash</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label="Amount"
            type="number"
            value={withdrawAmount}
            onChange={(e) => setWithdrawAmount(e.target.value)}
            margin="normal"
            error={!!error}
            helperText={error}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setWithdrawDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleWithdraw} variant="contained" color="error">
            Withdraw
          </Button>
        </DialogActions>
      </Dialog>

      {/* Add Stock Data Dialog */}
      <AddStockData
        isOpen={isAddStockDataOpen}
        onClose={() => setIsAddStockDataOpen(false)}
        onSuccess={() => {
          fetchPortfolio();
          fetchTransactions();
        }}
      />
    </div>
  );
};

export default PortfolioPage;
