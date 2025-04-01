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

    // Get user's own lists and public lists from others
    const result = await pool.query(
      `SELECT sl.*, u.username as creator_name,
              (SELECT COUNT(*) FROM stocklistitem WHERE listid = sl.listid) as item_count
       FROM stocklist sl
       JOIN users u ON sl.userid = u.userid
       WHERE sl.userid = $1 
       OR (sl.visibility = 'public')
       OR (sl.visibility = 'shared' AND EXISTS (
         SELECT 1 FROM sharedstocklist ssl 
         WHERE ssl.listid = sl.listid 
         AND ssl.shared_with_userid = $1
       ))
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

module.exports = router;
