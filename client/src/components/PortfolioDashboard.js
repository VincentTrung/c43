import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";

const PortfolioDashboard = () => {
  const [portfolios, setPortfolios] = useState([]);
  const [newPortfolioName, setNewPortfolioName] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    fetchPortfolios();
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

  const handleCreatePortfolio = async (e) => {
    e.preventDefault();
    try {
      const newPortfolio = await api.createPortfolio(newPortfolioName);
      setPortfolios([...portfolios, newPortfolio]);
      setNewPortfolioName("");
    } catch (err) {
      setError("Error creating portfolio");
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

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">My Portfolios</h1>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      {/* Create New Portfolio Form */}
      <div className="bg-white p-6 rounded-lg shadow-md mb-8">
        <h2 className="text-xl font-semibold mb-4">Create New Portfolio</h2>
        <form onSubmit={handleCreatePortfolio} className="flex gap-4">
          <input
            type="text"
            value={newPortfolioName}
            onChange={(e) => setNewPortfolioName(e.target.value)}
            placeholder="Portfolio Name"
            className="flex-1 p-2 border rounded"
            required
          />
          <button
            type="submit"
            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
          >
            Create Portfolio
          </button>
        </form>
      </div>

      {/* Portfolios List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {portfolios.map((portfolio) => (
          <div
            key={portfolio.portfolioid}
            className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow"
          >
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-xl font-semibold">{portfolio.name}</h3>
              <div className="flex gap-2">
                <button
                  onClick={() =>
                    navigate(`/portfolio/${portfolio.portfolioid}`)
                  }
                  className="text-blue-500 hover:text-blue-700"
                >
                  View
                </button>
                <button
                  onClick={() => handleDeletePortfolio(portfolio.portfolioid)}
                  className="text-red-500 hover:text-red-700"
                >
                  Delete
                </button>
              </div>
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
  );
};

export default PortfolioDashboard;
