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
  const client = await pool.connect();
  try {
    const { listId } = req.params;
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

    // First delete all stock list items
    await client.query("DELETE FROM stocklistitem WHERE listid = $1", [listId]);

    // Then delete the list
    await client.query("DELETE FROM stocklist WHERE listid = $1", [listId]);

    await client.query("COMMIT");
    res.json({ message: "Stock list deleted successfully" });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Error deleting stock list:", error);
    res
      .status(500)
      .json({ message: "Error deleting stock list", error: error.message });
  } finally {
    client.release();
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

module.exports = router;
