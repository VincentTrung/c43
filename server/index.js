require("dotenv").config();
const express = require("express");
const cors = require("cors");
const bcrypt = require("bcrypt");
const session = require("express-session");
const pgSession = require("connect-pg-simple")(session);
const cookieParser = require("cookie-parser");
const portfolioRoutes = require("./routes/portfolio");
const pool = require("./db");

const app = express();
const port = process.env.PORT || 3001;

// Middleware
app.use(
  cors({
    origin: "http://localhost:3000",
    credentials: true,
  })
);
app.use(express.json());
app.use(cookieParser());

// Session configuration
app.use(
  session({
    store: new pgSession({
      pool: pool,
      tableName: "sessions",
      createTableIfMissing: true,
    }),
    secret: process.env.SESSION_SECRET || "your-secret-key",
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === "production",
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
      sameSite: "lax",
    },
  })
);

// Authentication middleware
const authenticateSession = (req, res, next) => {
  if (!req.session.user) {
    return res.status(401).json({ message: "Authentication required" });
  }
  next();
};

// Routes
app.post("/api/auth/register", async (req, res) => {
  try {
    const { username, email, password } = req.body;
    console.log("Registration attempt for username:", username);

    // Check if email already exists
    const existingUser = await pool.query(
      "SELECT * FROM users WHERE email = $1",
      [email]
    );

    if (existingUser.rows.length > 0) {
      return res.status(400).json({
        message: "Email already exists",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const result = await pool.query(
      "INSERT INTO users (username, email, password) VALUES ($1, $2, $3) RETURNING userid, username, email",
      [username, email, hashedPassword]
    );

    console.log("User registered successfully:", result.rows[0]);
    res.json(result.rows[0]);
  } catch (error) {
    console.error("Registration error:", error);
    res
      .status(500)
      .json({ message: "Error creating user", error: error.message });
  }
});

// Login route
app.post("/api/auth/login", async (req, res) => {
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
app.post("/api/auth/logout", (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error("Logout error:", err);
      return res.status(500).json({ message: "Error logging out" });
    }
    res.json({ message: "Logged out successfully" });
  });
});

app.get("/api/auth/check", authenticateSession, (req, res) => {
  res.json({ authenticated: true, user: req.session.user });
});

// Apply authentication middleware to portfolio routes
app.use("/api/portfolio", authenticateSession, portfolioRoutes);

// Start server
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
