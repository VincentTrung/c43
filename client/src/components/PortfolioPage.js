import React, { useState, useEffect, useCallback } from "react";
import { useParams } from "react-router-dom";
import api from "../services/api";
import StockInfo from "./StockInfo";
import ErrorModal from "./ErrorModal";

const PortfolioPage = () => {
  // Get portfolio ID from URL parameters
  const { portfolioId } = useParams();

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
  const [selectedStock, setSelectedStock] = useState(null);
  const [isStockInfoOpen, setIsStockInfoOpen] = useState(false);
  const [isErrorModalOpen, setIsErrorModalOpen] = useState(false);

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
      }));
      setTransactions(processedData);
    } catch (err) {
      console.error("Error fetching transactions:", err);
    }
  }, [portfolioId]);

  // Load portfolio and transaction data on component mount
  useEffect(() => {
    fetchPortfolio();
    fetchTransactions();
  }, [fetchPortfolio, fetchTransactions]);

  // Handle cash deposit
  const handleDeposit = async (e) => {
    e.preventDefault();
    try {
      setError("");
      await api.depositCash(portfolioId, parseFloat(depositAmount));
      setDepositAmount("");
      fetchPortfolio();
      fetchTransactions();
    } catch (err) {
      setError(err.message);
      setIsErrorModalOpen(true);
      console.error("Error:", err);
    }
  };

  // Handle cash withdrawal
  const handleWithdraw = async (e) => {
    e.preventDefault();
    try {
      setError("");
      await api.withdrawCash(portfolioId, parseFloat(withdrawAmount));
      setWithdrawAmount("");
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

  // Show loading state
  if (loading) return <div>Loading...</div>;
  if (!portfolio) return <div>Portfolio not found</div>;

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">{portfolio.name}</h1>

      {/* Cash Account Section */}
      <div className="bg-white p-6 rounded-lg shadow-md mb-8">
        <h2 className="text-xl font-semibold mb-4">Cash Account</h2>
        <div className="mb-4">
          <p className="text-2xl font-bold text-green-600">
            ${portfolio.cash_balance.toFixed(2)}
          </p>
        </div>

        {/* Deposit Form */}
        <form onSubmit={handleDeposit} className="mb-4">
          <div className="flex gap-4">
            <input
              type="number"
              value={depositAmount}
              onChange={(e) => setDepositAmount(e.target.value)}
              placeholder="Amount to deposit"
              className="flex-1 p-2 border rounded"
              required
              min="0"
              step="0.01"
            />
            <button
              type="submit"
              className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
            >
              Deposit
            </button>
          </div>
        </form>

        {/* Withdraw Form */}
        <form onSubmit={handleWithdraw}>
          <div className="flex gap-4">
            <input
              type="number"
              value={withdrawAmount}
              onChange={(e) => setWithdrawAmount(e.target.value)}
              placeholder="Amount to withdraw"
              className="flex-1 p-2 border rounded"
              required
              min="0"
              step="0.01"
            />
            <button
              type="submit"
              className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
            >
              Withdraw
            </button>
          </div>
        </form>
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
                    <button
                      onClick={() => {
                        setSelectedStock(holding.symbol);
                        setIsStockInfoOpen(true);
                      }}
                      className="text-blue-500 hover:text-blue-700"
                    >
                      View Details
                    </button>
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

      {/* Stock Information Modal */}
      {selectedStock && (
        <StockInfo
          symbol={selectedStock}
          isOpen={isStockInfoOpen}
          onClose={() => setIsStockInfoOpen(false)}
        />
      )}

      {/* Transaction History Section */}
      <div className="bg-white p-6 rounded-lg shadow-md">
        <h2 className="text-xl font-semibold mb-4">Transaction History</h2>
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
              {transactions.map((transaction) => (
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
                  <td className="px-4 py-2">${transaction.price.toFixed(2)}</td>
                  <td className="px-4 py-2">
                    ${(transaction.quantity * transaction.price).toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Error Modal */}
      <ErrorModal
        isOpen={isErrorModalOpen}
        onClose={() => setIsErrorModalOpen(false)}
        error={error}
      />
    </div>
  );
};

export default PortfolioPage;
