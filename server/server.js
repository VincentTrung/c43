const express = require("express");
const cors = require("cors");
const session = require("express-session");
const pgSession = require("connect-pg-simple")(session);
const pool = require("./db");
const authRouter = require("./routes/auth");
const portfolioRouter = require("./routes/portfolio");
const stockRouter = require("./routes/stock");
const stocklistRouter = require("./routes/stocklist");
const reviewRouter = require("./routes/review");

const app = express();

// ... existing middleware ...

// Routes
app.use("/api/auth", authRouter);
app.use("/api/portfolio", portfolioRouter);
app.use("/api/stock", stockRouter);
app.use("/api/stocklist", stocklistRouter);
app.use("/api/review", reviewRouter);

// ... rest of the server code ...
