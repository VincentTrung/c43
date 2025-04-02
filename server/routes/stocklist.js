const express = require("express");
const router = express.Router();
const pool = require("../db");

// Create a new stock list
router.post("/", async (req, res) => {
  try {
    const { name, visibility } = req.body;
    const userId = req.session.user.userid;

    // Validate visibility
    if (!["private", "shared", "public"].includes(visibility)) {
      return res.status(400).json({ message: "Invalid visibility setting" });
    }

    const result = await pool.query(
      "INSERT INTO stocklist (userid, name, visibility) VALUES ($1, $2, $3) RETURNING *",
      [userId, name, visibility]
    );

    res.json(result.rows[0]);
  } catch (error) {
    console.error("Error creating stock list:", error);
    res
      .status(500)
      .json({ message: "Error creating stock list", error: error.message });
  }
});

// Get all stock lists for a user
router.get("/", async (req, res) => {
  try {
    const userId = req.session.user.userid;

    // Get only user's own lists
    const result = await pool.query(
      `SELECT sl.*, u.username as creator_name,
              (SELECT COUNT(*) FROM stocklistitem WHERE listid = sl.listid) as item_count
       FROM stocklist sl
       JOIN users u ON sl.userid = u.userid
       WHERE sl.userid = $1
       ORDER BY sl.listid DESC`,
      [userId]
    );

    res.json(result.rows);
  } catch (error) {
    console.error("Error fetching stock lists:", error);
    res
      .status(500)
      .json({ message: "Error fetching stock lists", error: error.message });
  }
});

// Delete a stock list
router.delete("/:listId", async (req, res) => {
  try {
    const { listId } = req.params;
    const userId = req.session.user.userid;

    // Verify list belongs to user
    const listResult = await pool.query(
      "SELECT * FROM stocklist WHERE listid = $1 AND userid = $2",
      [listId, userId]
    );

    if (listResult.rows.length === 0) {
      return res.status(404).json({ message: "Stock list not found" });
    }

    // Delete the list (cascade will handle related records)
    await pool.query("DELETE FROM stocklist WHERE listid = $1", [listId]);

    res.json({ message: "Stock list deleted successfully" });
  } catch (error) {
    console.error("Error deleting stock list:", error);
    res
      .status(500)
      .json({ message: "Error deleting stock list", error: error.message });
  }
});

// Get public stock lists
router.get("/public", async (req, res) => {
  try {
    const userId = req.session.user.userid;

    // Get public lists that are not owned by the current user
    const result = await pool.query(
      `SELECT sl.*, u.username as owner_name,
              (SELECT COUNT(*) FROM stocklistitem WHERE listid = sl.listid) as item_count
       FROM stocklist sl
       JOIN users u ON sl.userid = u.userid
       WHERE sl.visibility = 'public'
       AND sl.userid != $1
       ORDER BY sl.name`,
      [userId]
    );

    res.json(result.rows);
  } catch (error) {
    console.error("Error fetching public stock lists:", error);
    res.status(500).json({ message: "Error fetching public stock lists" });
  }
});

// Get shared stock lists from friends
router.get("/shared", async (req, res) => {
  try {
    const userId = req.session.user.userid;

    // Get lists explicitly shared with the user
    const result = await pool.query(
      `SELECT sl.*, u.username as owner_name,
              (SELECT COUNT(*) FROM stocklistitem WHERE listid = sl.listid) as item_count
       FROM stocklist sl
       JOIN users u ON sl.userid = u.userid
       JOIN sharedstocklist ssl ON sl.listid = ssl.listid
       WHERE ssl.shared_with_userid = $1
       AND sl.visibility = 'shared'
       ORDER BY sl.name`,
      [userId]
    );

    res.json(result.rows);
  } catch (error) {
    console.error("Error fetching shared stock lists:", error);
    res.status(500).json({ message: "Error fetching shared stock lists" });
  }
});

// Get a specific stock list with its items
router.get("/:listId", async (req, res) => {
  try {
    const { listId } = req.params;
    const userId = req.session.user.userid;

    // Get stock list details
    const listResult = await pool.query(
      `SELECT sl.*, u.username as creator_name, sl.userid
       FROM stocklist sl
       JOIN users u ON sl.userid = u.userid
       WHERE sl.listid = $1`,
      [listId]
    );

    if (listResult.rows.length === 0) {
      return res.status(404).json({ message: "Stock list not found" });
    }

    // Get stock list items with current prices
    const itemsResult = await pool.query(
      `SELECT sli.*, s.company_name,
              (SELECT close_price 
               FROM stockdata sd 
               WHERE sd.symbol = sli.symbol 
               ORDER BY date DESC 
               LIMIT 1) as current_price
       FROM stocklistitem sli
       JOIN stock s ON sli.symbol = s.symbol
       WHERE sli.listid = $1`,
      [listId]
    );

    // Calculate total value
    const totalValue = itemsResult.rows.reduce((sum, item) => {
      return sum + (item.current_price || 0) * item.quantity;
    }, 0);

    res.json({
      ...listResult.rows[0],
      items: itemsResult.rows,
      total_value: totalValue,
    });
  } catch (error) {
    console.error("Error fetching stock list:", error);
    res
      .status(500)
      .json({ message: "Error fetching stock list", error: error.message });
  }
});

// Add a stock to a list
router.post("/:listId/stocks", async (req, res) => {
  const client = await pool.connect();
  try {
    const { listId } = req.params;
    const { symbol, quantity } = req.body;
    const userId = req.session.user.userid;

    await client.query("BEGIN");

    // Verify list belongs to user or is shared with user
    const listResult = await client.query(
      `SELECT sl.* FROM stocklist sl
       LEFT JOIN sharedstocklist ssl ON sl.listid = ssl.listid
       WHERE sl.listid = $1 AND (sl.userid = $2 OR ssl.shared_with_userid = $2)`,
      [listId, userId]
    );

    if (listResult.rows.length === 0) {
      await client.query("ROLLBACK");
      return res
        .status(404)
        .json({ message: "Stock list not found or access denied" });
    }

    // Check if stock exists
    const stockResult = await client.query(
      "SELECT * FROM stock WHERE symbol = $1",
      [symbol]
    );

    // If stock doesn't exist, add it to the Stock table
    if (stockResult.rows.length === 0) {
      // Get stock info from stockdata table
      const stockDataResult = await client.query(
        "SELECT * FROM stockdata WHERE symbol = $1 ORDER BY date DESC LIMIT 1",
        [symbol]
      );

      if (stockDataResult.rows.length === 0) {
        await client.query("ROLLBACK");
        return res.status(404).json({ message: "Stock not found in database" });
      }

      // Add stock to Stock table
      await client.query(
        "INSERT INTO stock (symbol, company_name) VALUES ($1, $2)",
        [symbol, symbol] // Using symbol as company name for now
      );
    }

    // Add or update stock in list
    const result = await client.query(
      `INSERT INTO stocklistitem (listid, symbol, quantity)
       VALUES ($1, $2, $3)
       ON CONFLICT (listid, symbol)
       DO UPDATE SET quantity = stocklistitem.quantity + $3
       RETURNING *`,
      [listId, symbol, quantity]
    );

    await client.query("COMMIT");
    res.json(result.rows[0]);
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Error adding stock to list:", error);
    res
      .status(500)
      .json({ message: "Error adding stock to list", error: error.message });
  } finally {
    client.release();
  }
});

// Remove a stock from a list
router.delete("/:listId/stocks/:symbol", async (req, res) => {
  const client = await pool.connect();
  try {
    const { listId, symbol } = req.params;
    const userId = req.session.user.userid;

    await client.query("BEGIN");

    // Verify list belongs to user
    const listResult = await client.query(
      "SELECT * FROM stocklist WHERE listid = $1 AND userid = $2",
      [listId, userId]
    );

    if (listResult.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ message: "Stock list not found" });
    }

    // Remove stock from list
    const result = await client.query(
      "DELETE FROM stocklistitem WHERE listid = $1 AND symbol = $2 RETURNING *",
      [listId, symbol]
    );

    if (result.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ message: "Stock not found in list" });
    }

    await client.query("COMMIT");
    res.json({ message: "Stock removed from list successfully" });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Error removing stock from list:", error);
    res.status(500).json({
      message: "Error removing stock from list",
      error: error.message,
    });
  } finally {
    client.release();
  }
});

// Share a stock list with a friend
router.post("/:listId/share", async (req, res) => {
  const client = await pool.connect();
  try {
    const { listId } = req.params;
    const { friendId } = req.body;
    const userId = req.session.user.userid;

    await client.query("BEGIN");

    // Verify list belongs to user
    const listResult = await client.query(
      "SELECT * FROM stocklist WHERE listid = $1 AND userid = $2",
      [listId, userId]
    );

    if (listResult.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ message: "Stock list not found" });
    }

    // Verify friendship exists
    const friendResult = await client.query(
      `SELECT * FROM friend 
       WHERE (user1_id = $1 AND user2_id = $2) 
       OR (user1_id = $2 AND user2_id = $1)`,
      [userId, friendId]
    );

    if (friendResult.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(400).json({ message: "User is not your friend" });
    }

    // Check if already shared
    const sharedResult = await client.query(
      "SELECT * FROM sharedstocklist WHERE listid = $1 AND shared_with_userid = $2",
      [listId, friendId]
    );

    if (sharedResult.rows.length > 0) {
      await client.query("ROLLBACK");
      return res
        .status(400)
        .json({ message: "List already shared with this friend" });
    }

    // Share the list
    await client.query(
      "INSERT INTO sharedstocklist (listid, shared_with_userid) VALUES ($1, $2)",
      [listId, friendId]
    );

    // Update list visibility to 'shared' if it's currently 'private'
    if (listResult.rows[0].visibility === "private") {
      await client.query(
        "UPDATE stocklist SET visibility = 'shared' WHERE listid = $1",
        [listId]
      );
    }

    await client.query("COMMIT");
    res.json({ message: "Stock list shared successfully" });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Error sharing stock list:", error);
    res
      .status(500)
      .json({ message: "Error sharing stock list", error: error.message });
  } finally {
    client.release();
  }
});

module.exports = router;
