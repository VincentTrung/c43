import React from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import Login from "./components/Login";
import Register from "./components/Register";
import PortfolioPage from "./components/PortfolioPage";
import PrivateRoute from "./components/PrivateRoute";
import DashboardPage from "./components/DashboardPage";
import StockDetailsPage from "./components/StockDetailsPage";
import StocklistPage from "./components/StocklistPage";

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
