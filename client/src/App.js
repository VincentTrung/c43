import React from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import Login from "./components/Login";
import Register from "./components/Register";
import PortfolioDashboard from "./components/PortfolioDashboard";
import PortfolioPage from "./components/PortfolioPage";
import PrivateRoute from "./components/PrivateRoute";

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
                <PortfolioDashboard />
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
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
