const express = require("express");
const router = express.Router();
const bcrypt = require("bcrypt");
const pool = require("../db");

// Authentication middleware
const authenticateSession = (req, res, next) => {
  if (!req.session.user) {
    return res.status(401).json({ message: "Authentication required" });
  }
  next();
};

// Register route
router.post("/register", async (req, res) => {
  const client = await pool.connect();
  try {
    const { username, email, password } = req.body;
    console.log("Registration attempt for username:", username);

    // Start transaction
    await client.query("BEGIN");

    // Check if email already exists
    const existingUser = await client.query(
      "SELECT * FROM users WHERE email = $1",
      [email]
    );

    if (existingUser.rows.length > 0) {
      await client.query("ROLLBACK");
      return res.status(400).json({
        message: "Email already exists",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const userResult = await client.query(
      "INSERT INTO users (username, email, password) VALUES ($1, $2, $3) RETURNING userid, username, email",
      [username, email, hashedPassword]
    );

    // Create default portfolio
    const portfolioResult = await client.query(
      "INSERT INTO portfolio (userid, name, cash_balance) VALUES ($1, $2, 0) RETURNING *",
      [userResult.rows[0].userid, "My First Portfolio"]
    );

    await client.query("COMMIT");

    console.log("User registered successfully with default portfolio:", {
      user: userResult.rows[0],
      portfolio: portfolioResult.rows[0],
    });

    res.json({
      ...userResult.rows[0],
      defaultPortfolio: portfolioResult.rows[0],
    });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Registration error:", error);
    res
      .status(500)
      .json({ message: "Error creating user", error: error.message });
  } finally {
    client.release();
  }
});

// Login route
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    const result = await pool.query("SELECT * FROM users WHERE email = $1", [
      email,
    ]);

    const user = result.rows[0];

    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    // Set user data in session
    req.session.user = {
      userid: user.userid,
      username: user.username,
      email: user.email,
    };

    res.json({
      userid: user.userid,
      username: user.username,
      email: user.email,
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ message: "Error logging in", error: error.message });
  }
});

// Logout route
router.post("/logout", (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error("Logout error:", err);
      return res.status(500).json({ message: "Error logging out" });
    }
    res.json({ message: "Logged out successfully" });
  });
});

// Check authentication status
router.get("/check", authenticateSession, (req, res) => {
  res.json({ authenticated: true, user: req.session.user });
});

module.exports = {
  router,
  authenticateSession,
};
