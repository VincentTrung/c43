import React from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import Login from "./pages/Login";
import Register from "./pages/Register";
import PortfolioPage from "./pages/PortfolioPage";
import PrivateRoute from "./pages/PrivateRoute";
import DashboardPage from "./pages/DashboardPage";
import StockDetailsPage from "./pages/StockDetailsPage";
import StocklistPage from "./pages/StocklistPage";

function App() {
  return (
    <Router>
      <div className="App">
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route
            path="/dashboard"
            element={
              <PrivateRoute>
                <DashboardPage />
              </PrivateRoute>
            }
          />
          <Route
            path="/portfolio/:portfolioId"
            element={
              <PrivateRoute>
                <PortfolioPage />
              </PrivateRoute>
            }
          />
          <Route
            path="/stock/:symbol"
            element={
              <PrivateRoute>
                <StockDetailsPage />
              </PrivateRoute>
            }
          />
          <Route
            path="/stocklist/:listId"
            element={
              <PrivateRoute>
                <StocklistPage />
              </PrivateRoute>
            }
          />
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
