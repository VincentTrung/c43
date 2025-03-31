const API_BASE_URL = "http://localhost:3001/api";

const api = {
  // Auth endpoints
  register: async (username, email, password) => {
    const response = await fetch(`${API_BASE_URL}/auth/register`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include", // Important for sessions
      body: JSON.stringify({ username, email, password }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Registration failed");
    }

    return response.json();
  },

  login: async (email, password) => {
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include", // Important for sessions
      body: JSON.stringify({ email, password }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Login failed");
    }

    return response.json();
  },

  logout: async () => {
    const response = await fetch(`${API_BASE_URL}/auth/logout`, {
      method: "POST",
      credentials: "include", // Important for sessions
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Logout failed");
    }

    return response.json();
  },

  checkAuth: async () => {
    const response = await fetch(`${API_BASE_URL}/auth/check`, {
      credentials: "include",
    });

    if (!response.ok) {
      throw new Error("Not authenticated");
    }

    return response.json();
  },

  // Portfolio functions
  getPortfolios: async () => {
    const response = await fetch(`${API_BASE_URL}/portfolio`, {
      credentials: "include",
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Failed to fetch portfolios");
    }

    return response.json();
  },

  createPortfolio: async (name) => {
    const response = await fetch(`${API_BASE_URL}/portfolio`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
      body: JSON.stringify({ name }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Failed to create portfolio");
    }

    return response.json();
  },

  getPortfolio: async (portfolioId) => {
    const response = await fetch(`${API_BASE_URL}/portfolio/${portfolioId}`, {
      credentials: "include",
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Failed to fetch portfolio");
    }

    return response.json();
  },

  deletePortfolio: async (portfolioId) => {
    const response = await fetch(`${API_BASE_URL}/portfolio/${portfolioId}`, {
      method: "DELETE",
      credentials: "include",
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Failed to delete portfolio");
    }

    return response.json();
  },

  depositCash: async (portfolioId, amount) => {
    const response = await fetch(
      `${API_BASE_URL}/portfolio/${portfolioId}/cash/deposit`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({ amount }),
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Failed to deposit cash");
    }

    return response.json();
  },

  withdrawCash: async (portfolioId, amount) => {
    const response = await fetch(
      `${API_BASE_URL}/portfolio/${portfolioId}/cash/withdraw`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({ amount }),
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Failed to withdraw cash");
    }

    return response.json();
  },

  buyStock: async (portfolioId, symbol, quantity) => {
    const response = await fetch(
      `${API_BASE_URL}/portfolio/${portfolioId}/stocks/buy`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ symbol, quantity }),
        credentials: "include",
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(
        errorData.details || errorData.error || "Failed to buy stock"
      );
    }

    return response.json();
  },

  sellStock: async (portfolioId, symbol, quantity) => {
    const response = await fetch(
      `${API_BASE_URL}/portfolio/${portfolioId}/stocks/sell`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({ symbol, quantity }),
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Failed to sell stock");
    }

    return response.json();
  },

  getPortfolioTransactions: async (portfolioId) => {
    const response = await fetch(
      `${API_BASE_URL}/portfolio/${portfolioId}/transactions`,
      {
        credentials: "include",
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || "Failed to fetch transactions");
    }

    return response.json();
  },

  getStockInfo: async (symbol) => {
    const response = await fetch(`${API_BASE_URL}/portfolio/stock/${symbol}`, {
      credentials: "include",
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || "Failed to fetch stock information");
    }

    return response.json();
  },
};

export default api;
