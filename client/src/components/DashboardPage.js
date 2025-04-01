import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";
import CreateModal from "./CreateModal";

const DashboardPage = () => {
  const [portfolios, setPortfolios] = useState([]);
  const [stockLists, setStockLists] = useState([]);
  const [error, setError] = useState("");
  const [isPortfolioModalOpen, setIsPortfolioModalOpen] = useState(false);
  const [isStockListModalOpen, setIsStockListModalOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    fetchPortfolios();
    fetchStockLists();
  }, []);

  const fetchPortfolios = async () => {
    try {
      const data = await api.getPortfolios();
      setPortfolios(data);
    } catch (err) {
      setError("Error fetching portfolios");
      console.error("Error:", err);
    }
  };

  const fetchStockLists = async () => {
    try {
      const data = await api.getStockLists();
      setStockLists(data);
    } catch (err) {
      setError("Error fetching stock lists");
      console.error("Error:", err);
    }
  };

  const handleCreatePortfolio = async (name) => {
    try {
      const newPortfolio = await api.createPortfolio(name);
      setPortfolios([...portfolios, newPortfolio]);
    } catch (err) {
      setError("Error creating portfolio");
      console.error("Error:", err);
    }
  };

  const handleCreateStockList = async (name, visibility) => {
    try {
      const newStockList = await api.createStockList(name, visibility);
      setStockLists([...stockLists, newStockList]);
    } catch (err) {
      setError("Error creating stock list");
      console.error("Error:", err);
    }
  };

  const handleDeletePortfolio = async (portfolioId) => {
    if (!window.confirm("Are you sure you want to delete this portfolio?")) {
      return;
    }

    try {
      await api.deletePortfolio(portfolioId);
      setPortfolios(portfolios.filter((p) => p.portfolioid !== portfolioId));
    } catch (err) {
      setError("Error deleting portfolio");
      console.error("Error:", err);
    }
  };

  const handleDeleteStockList = async (listId) => {
    if (!window.confirm("Are you sure you want to delete this stock list?")) {
      return;
    }

    try {
      await api.deleteStockList(listId);
      setStockLists(stockLists.filter((l) => l.listid !== listId));
    } catch (err) {
      setError("Error deleting stock list");
      console.error("Error:", err);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Dashboard</h1>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      {/* Portfolios Section */}
      <div className="mb-12">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold">My Portfolios</h2>
          <button
            onClick={() => setIsPortfolioModalOpen(true)}
            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
          >
            Create Portfolio
          </button>
        </div>

        {/* Portfolios List */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {portfolios.map((portfolio) => (
            <div
              key={portfolio.portfolioid}
              className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow cursor-pointer"
              onClick={() => navigate(`/portfolio/${portfolio.portfolioid}`)}
            >
              <div className="flex justify-between items-start mb-4">
                <h3 className="text-xl font-semibold">{portfolio.name}</h3>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeletePortfolio(portfolio.portfolioid);
                  }}
                  className="text-red-500 hover:text-red-700"
                >
                  Delete
                </button>
              </div>
              <div className="text-gray-600">
                <p>
                  Cash Balance: $
                  {parseFloat(portfolio.cash_balance || 0).toFixed(2)}
                </p>
                <p>
                  Total Value: $
                  {parseFloat(portfolio.total_value || 0).toFixed(2)}
                </p>
              </div>
            </div>
          ))}
        </div>

        {portfolios.length === 0 && (
          <div className="text-center text-gray-500 mt-8">
            No portfolios yet. Create your first portfolio above!
          </div>
        )}
      </div>

      {/* Stock Lists Section */}
      <div>
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold">My Stock Lists</h2>
          <button
            onClick={() => setIsStockListModalOpen(true)}
            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
          >
            Create Stock List
          </button>
        </div>

        {/* Stock Lists Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {stockLists.map((list) => (
            <div
              key={list.listid}
              className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow cursor-pointer"
              onClick={() => navigate(`/stocklist/${list.listid}`)}
            >
              <div className="flex justify-between items-start mb-4">
                <h3 className="text-xl font-semibold">{list.name}</h3>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteStockList(list.listid);
                  }}
                  className="text-red-500 hover:text-red-700"
                >
                  Delete
                </button>
              </div>
              <div className="text-gray-600">
                <p>Visibility: {list.visibility}</p>
                <p>Items: {list.item_count || 0}</p>
              </div>
            </div>
          ))}
        </div>

        {stockLists.length === 0 && (
          <div className="text-center text-gray-500 mt-8">
            No stock lists yet. Create your first stock list above!
          </div>
        )}
      </div>

      {/* Create Modals */}
      <CreateModal
        isOpen={isPortfolioModalOpen}
        onClose={() => setIsPortfolioModalOpen(false)}
        onSubmit={handleCreatePortfolio}
        title="Create New Portfolio"
        placeholder="Enter portfolio name"
      />

      <CreateModal
        isOpen={isStockListModalOpen}
        onClose={() => setIsStockListModalOpen(false)}
        onSubmit={handleCreateStockList}
        title="Create New Stock List"
        placeholder="Enter stock list name"
        type="stocklist"
      />
    </div>
  );
};

export default DashboardPage;
