const API_BASE_URL = "http://localhost:3001/api";

const api = {
  // Auth endpoints //
  // Handles user authentication and session management
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

  // Portfolio API //
  // Manages user portfolios and their holdings
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

  // Create a portfolio transaction (deposit, withdrawal, or transfer)
  createPortfolioTransaction: async (portfolioId, transactionData) => {
    const response = await fetch(
      `${API_BASE_URL}/portfolio/${portfolioId}/transactions`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify(transactionData),
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(
        error.message || "Failed to create portfolio transaction"
      );
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
  // END OF PORTFOLIO API //

  // StockList API //
  createStockList: async (name, visibility) => {
    const response = await fetch(`${API_BASE_URL}/stocklist`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
      body: JSON.stringify({ name, visibility }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Failed to create stock list");
    }

    return response.json();
  },

  getStockLists: async () => {
    const response = await fetch(`${API_BASE_URL}/stocklist`, {
      credentials: "include",
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Failed to fetch stock lists");
    }

    return response.json();
  },

  deleteStockList: async (listId) => {
    const response = await fetch(`${API_BASE_URL}/stocklist/${listId}`, {
      method: "DELETE",
      credentials: "include",
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Failed to delete stock list");
    }

    return response.json();
  },

  // Get public stock lists
  getPublicStockLists: async () => {
    const response = await fetch(`${API_BASE_URL}/stocklist/public`, {
      credentials: "include",
    });
    if (!response.ok) {
      throw new Error("Failed to fetch public stock lists");
    }
    return response.json();
  },

  // Get shared stock lists from friends
  getSharedStockLists: async () => {
    const response = await fetch(`${API_BASE_URL}/stocklist/shared`, {
      credentials: "include",
    });
    if (!response.ok) {
      throw new Error("Failed to fetch shared stock lists");
    }
    return response.json();
  },
  // END OF STOCK LIST API //

  // Friend Management API //
  getFriends: async () => {
    const response = await fetch(`${API_BASE_URL}/friends`, {
      credentials: "include",
    });
    if (!response.ok) {
      throw new Error("Failed to fetch friends");
    }
    return response.json();
  },

  getIncomingFriendRequests: async () => {
    const response = await fetch(`${API_BASE_URL}/friends/requests/incoming`, {
      credentials: "include",
    });
    if (!response.ok) {
      throw new Error("Failed to fetch incoming friend requests");
    }
    return response.json();
  },

  getOutgoingFriendRequests: async () => {
    const response = await fetch(`${API_BASE_URL}/friends/requests/outgoing`, {
      credentials: "include",
    });
    if (!response.ok) {
      throw new Error("Failed to fetch outgoing friend requests");
    }
    return response.json();
  },

  sendFriendRequest: async (email) => {
    const response = await fetch(`${API_BASE_URL}/friends/requests`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
      body: JSON.stringify({ email }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Failed to send friend request");
    }

    return response.json();
  },

  acceptFriendRequest: async (requestId) => {
    const response = await fetch(
      `${API_BASE_URL}/friends/requests/${requestId}/accept`,
      {
        method: "POST",
        credentials: "include",
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Failed to accept friend request");
    }

    return response.json();
  },

  rejectFriendRequest: async (requestId) => {
    const response = await fetch(
      `${API_BASE_URL}/friends/requests/${requestId}/reject`,
      {
        method: "POST",
        credentials: "include",
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Failed to reject friend request");
    }

    return response.json();
  },

  deleteFriend: async (friendId) => {
    const response = await fetch(`${API_BASE_URL}/friends/${friendId}`, {
      method: "DELETE",
      credentials: "include",
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Failed to delete friend");
    }

    return response.json();
  },

  // END OF FRIEND MANAGEMENT API //

  // Stock data api (record daily stock information)//
  addStockData: async (stockData) => {
    const response = await fetch(`${API_BASE_URL}/stockdata`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
      body: JSON.stringify(stockData),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Failed to add stock data");
    }

    return response.json();
  },

  getStockData: async (symbol) => {
    const response = await fetch(`${API_BASE_URL}/stockdata/${symbol}`, {
      credentials: "include",
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Failed to fetch stock data");
    }

    return response.json();
  },

  getAllStockData: async () => {
    const response = await fetch(`${API_BASE_URL}/stockdata`, {
      credentials: "include",
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Failed to fetch stock data");
    }

    return response.json();
  },

  // END OF STOCK DATA API //

  // Stock list item API //
  // Manages stock lists, including creation, sharing, and modification
  getStockList: async (listId) => {
    const response = await fetch(`${API_BASE_URL}/stocklist/${listId}`, {
      credentials: "include",
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Failed to fetch stock list");
    }

    return response.json();
  },

  // Get stock list statistics
  getStockListStatistics: async (listId, startDate, endDate) => {
    const response = await fetch(
      `${API_BASE_URL}/stocklist/${listId}/statistics?startDate=${startDate}&endDate=${endDate}`,
      {
        credentials: "include",
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Failed to fetch stock list statistics");
    }

    return response.json();
  },

  addStockToList: async (listId, symbol, quantity) => {
    const response = await fetch(`${API_BASE_URL}/stocklist/${listId}/stocks`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
      body: JSON.stringify({ symbol, quantity }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Failed to add stock to list");
    }

    return response.json();
  },

  removeStockFromList: async (listId, symbol) => {
    const response = await fetch(
      `${API_BASE_URL}/stocklist/${listId}/stocks/${symbol}`,
      {
        method: "DELETE",
        credentials: "include",
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Failed to remove stock from list");
    }

    return response.json();
  },

  shareStockList: async (listId, friendId) => {
    const response = await fetch(`${API_BASE_URL}/stocklist/${listId}/share`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
      body: JSON.stringify({ friendId }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Failed to share stock list");
    }

    return response.json();
  },
  // END OF STOCK LIST ITEM API //

  // Review API //
  getReviews: async (listId) => {
    const response = await fetch(`${API_BASE_URL}/review/list/${listId}`, {
      credentials: "include",
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Error fetching reviews");
    }
    return response.json();
  },

  createReview: async (listId, content) => {
    const response = await fetch(`${API_BASE_URL}/review`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
      body: JSON.stringify({ listId, content }),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Error creating review");
    }
    return response.json();
  },

  updateReview: async (reviewId, content) => {
    const response = await fetch(`${API_BASE_URL}/review/${reviewId}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
      body: JSON.stringify({ content }),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Error updating review");
    }
    return response.json();
  },

  deleteReview: async (reviewId) => {
    const response = await fetch(`${API_BASE_URL}/review/${reviewId}`, {
      method: "DELETE",
      credentials: "include",
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Error deleting review");
    }
    return response.json();
  },
  // END OF REVIEW API //

  // Stock prediction endpoint
  // Fetches predicted stock prices for a given number of days
  getStockPrediction: async (symbol, days = 7) => {
    const response = await fetch(
      `${API_BASE_URL}/stock/${symbol}/predict?days=${days}`,
      {
        credentials: "include",
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Failed to fetch stock predictions");
    }

    return response.json();
  },

  // Get portfolio statistics
  getPortfolioStatistics: async (portfolioId, startDate, endDate) => {
    const response = await fetch(
      `${API_BASE_URL}/portfolio/${portfolioId}/statistics?startDate=${startDate}&endDate=${endDate}`,
      {
        credentials: "include",
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Failed to fetch portfolio statistics");
    }

    return response.json();
  },
};

export default api;
