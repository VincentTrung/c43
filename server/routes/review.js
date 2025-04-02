const express = require("express");
const router = express.Router();
const pool = require("../db");

// Get reviews for a stock list
router.get("/list/:listId", async (req, res) => {
  try {
    const { listId } = req.params;
    const userId = req.session.user.userid;

    // Check if user has access to the list
    const listResult = await pool.query(
      `SELECT sl.*, ssl.shared_with_userid 
       FROM stocklist sl
       LEFT JOIN sharedstocklist ssl ON sl.listid = ssl.listid
       WHERE sl.listid = $1 AND (
         sl.userid = $2 OR 
         sl.visibility = 'public' OR 
         ssl.shared_with_userid = $2
       )`,
      [listId, userId]
    );

    if (listResult.rows.length === 0) {
      return res
        .status(403)
        .json({ message: "Access denied to this stock list" });
    }

    // Get reviews
    const reviewsResult = await pool.query(
      `SELECT r.*, u.username 
       FROM review r
       JOIN users u ON r.userid = u.userid
       WHERE r.listid = $1
       ORDER BY r.created_at DESC`,
      [listId]
    );

    res.json(reviewsResult.rows);
  } catch (error) {
    console.error("Error fetching reviews:", error);
    res.status(500).json({ message: "Error fetching reviews" });
  }
});

// Create a review
router.post("/", async (req, res) => {
  const client = await pool.connect();
  try {
    const { listId, content } = req.body;
    const userId = req.session.user.userid;

    await client.query("BEGIN");

    // Check if user has access to the list
    const listResult = await client.query(
      `SELECT sl.*, ssl.shared_with_userid 
       FROM stocklist sl
       LEFT JOIN sharedstocklist ssl ON sl.listid = ssl.listid
       WHERE sl.listid = $1 AND (
         sl.userid = $2 OR 
         sl.visibility = 'public' OR 
         ssl.shared_with_userid = $2
       )`,
      [listId, userId]
    );

    if (listResult.rows.length === 0) {
      await client.query("ROLLBACK");
      return res
        .status(403)
        .json({ message: "Access denied to this stock list" });
    }

    // Check if user already has a review
    const existingReview = await client.query(
      "SELECT * FROM review WHERE listid = $1 AND userid = $2",
      [listId, userId]
    );

    if (existingReview.rows.length > 0) {
      await client.query("ROLLBACK");
      return res
        .status(400)
        .json({ message: "You have already reviewed this list" });
    }

    // Create review
    const result = await client.query(
      "INSERT INTO review (userid, listid, content) VALUES ($1, $2, $3) RETURNING *",
      [userId, listId, content]
    );

    await client.query("COMMIT");
    res.json(result.rows[0]);
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Error creating review:", error);
    res.status(500).json({ message: "Error creating review" });
  } finally {
    client.release();
  }
});

// Update a review
router.put("/:reviewId", async (req, res) => {
  const client = await pool.connect();
  try {
    const { reviewId } = req.params;
    const { content } = req.body;
    const userId = req.session.user.userid;

    await client.query("BEGIN");

    // Check if review exists and belongs to user
    const reviewResult = await client.query(
      "SELECT * FROM review WHERE reviewid = $1 AND userid = $2",
      [reviewId, userId]
    );

    if (reviewResult.rows.length === 0) {
      await client.query("ROLLBACK");
      return res
        .status(404)
        .json({ message: "Review not found or unauthorized" });
    }

    // Update review
    const result = await client.query(
      "UPDATE review SET content = $1, edited_at = CURRENT_TIMESTAMP WHERE reviewid = $2 RETURNING *",
      [content, reviewId]
    );

    await client.query("COMMIT");
    res.json(result.rows[0]);
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Error updating review:", error);
    res.status(500).json({ message: "Error updating review" });
  } finally {
    client.release();
  }
});

// Delete a review
router.delete("/:reviewId", async (req, res) => {
  const client = await pool.connect();
  try {
    const { reviewId } = req.params;
    const userId = req.session.user.userid;

    await client.query("BEGIN");

    // Check if review exists and if user is authorized to delete it
    const reviewResult = await client.query(
      `SELECT r.*, sl.userid as list_owner_id 
       FROM review r
       JOIN stocklist sl ON r.listid = sl.listid
       WHERE r.reviewid = $1 AND (r.userid = $2 OR sl.userid = $2)`,
      [reviewId, userId]
    );

    if (reviewResult.rows.length === 0) {
      await client.query("ROLLBACK");
      return res
        .status(404)
        .json({ message: "Review not found or unauthorized" });
    }

    // Delete review
    await client.query("DELETE FROM review WHERE reviewid = $1", [reviewId]);

    await client.query("COMMIT");
    res.json({ message: "Review deleted successfully" });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Error deleting review:", error);
    res.status(500).json({ message: "Error deleting review" });
  } finally {
    client.release();
  }
});

module.exports = router;
