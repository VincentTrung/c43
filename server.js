// Get portfolio statistics
app.get(
  "/api/portfolio/:portfolioId/statistics",
  authenticateToken,
  async (req, res) => {
    try {
      const { portfolioId } = req.params;
      const { startDate, endDate } = req.query;

      // Validate dates
      if (!startDate || !endDate) {
        return res
          .status(400)
          .json({ error: "Start date and end date are required" });
      }

      // Check if user has access to this portfolio
      const portfolioResult = await pool.query(
        "SELECT * FROM portfolios WHERE portfolioid = $1 AND userid = $2",
        [portfolioId, req.user.userid]
      );

      if (portfolioResult.rows.length === 0) {
        return res.status(403).json({ error: "Access denied" });
      }

      // Get portfolio statistics using the database function
      const result = await pool.query(
        "SELECT * FROM get_portfolio_statistics($1, $2, $3)",
        [portfolioId, startDate, endDate]
      );

      res.json(result.rows);
    } catch (error) {
      console.error("Error fetching portfolio statistics:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);
