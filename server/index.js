require("dotenv").config();
const express = require("express");
const cors = require("cors");
const session = require("express-session");
const cookieParser = require("cookie-parser");
const { router: authRoutes, authenticateSession } = require("./routes/auth");
const portfolioRoutes = require("./routes/portfolio");
const stocklistRoutes = require("./routes/stocklist");
const friendsRouter = require("./routes/friends");
const stockdataRoutes = require("./routes/stockdata");
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

// Session configuration with memory store
app.use(
  session({
    secret: process.env.SESSION_SECRET || "your-secret-key",
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === "production",
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
    },
    store: new session.MemoryStore(),
  })
);

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/portfolio", authenticateSession, portfolioRoutes);
app.use("/api/stocklist", authenticateSession, stocklistRoutes);
app.use("/api/friends", friendsRouter);
app.use("/api/stockdata", stockdataRoutes);

// Start server
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
