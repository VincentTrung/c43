const express = require("express");
const router = express.Router();
const pool = require("../db");
const { authenticateSession } = require("./auth");

// Apply authentication middleware to all routes
router.use(authenticateSession);

// Cleanup old friend request records
const cleanupFriendRequests = async (client) => {
  try {
    // Delete accepted requests
    await client.query("DELETE FROM friendrequest WHERE status = 'accepted'");

    // Delete rejected requests older than 5 minutes
    await client.query(
      "DELETE FROM friendrequest WHERE status = 'rejected' AND rejected_time < NOW() - INTERVAL '5 minutes'"
    );

    // Delete rejected requests if users are friends
    await client.query(
      `DELETE FROM friendrequest fr
       WHERE fr.status = 'rejected'
       AND EXISTS (
         SELECT 1 FROM friend f
         WHERE ((f.user1_id = fr.sender_userid AND f.user2_id = fr.receiver_userid) OR
                (f.user2_id = fr.sender_userid AND f.user1_id = fr.receiver_userid))
       )`
    );

    // Delete duplicate requests (keep only the most recent one)
    await client.query(
      `DELETE FROM friendrequest a USING (
        SELECT MAX(requestid) as requestid, sender_userid, receiver_userid
        FROM friendrequest
        GROUP BY sender_userid, receiver_userid
        HAVING COUNT(*) > 1
      ) b
      WHERE a.sender_userid = b.sender_userid 
      AND a.receiver_userid = b.receiver_userid
      AND a.requestid < b.requestid`
    );
  } catch (error) {
    console.error("Error cleaning up friend requests:", error);
  }
};

// Get all friends
router.get("/", async (req, res) => {
  try {
    const userId = req.session.user.userid;

    const result = await pool.query(
      `SELECT u.userid, u.username
       FROM users u
       JOIN friend f ON (
         (f.user1_id = $1 AND f.user2_id = u.userid) OR
         (f.user2_id = $1 AND f.user1_id = u.userid)
       )
       ORDER BY u.username`,
      [userId]
    );

    res.json(result.rows);
  } catch (error) {
    console.error("Error fetching friends:", error);
    res.status(500).json({ message: "Error fetching friends" });
  }
});

// Get incoming friend requests
router.get("/requests/incoming", async (req, res) => {
  try {
    const userId = req.session.user.userid;

    const result = await pool.query(
      `SELECT fr.requestid, fr.sender_userid, u.username as sender_username
       FROM friendrequest fr
       JOIN users u ON fr.sender_userid = u.userid
       WHERE fr.receiver_userid = $1
       AND fr.status = 'pending'
       ORDER BY fr.created_at DESC`,
      [userId]
    );

    res.json(result.rows);
  } catch (error) {
    console.error("Error fetching incoming friend requests:", error);
    res
      .status(500)
      .json({ message: "Error fetching incoming friend requests" });
  }
});

// Get outgoing friend requests
router.get("/requests/outgoing", async (req, res) => {
  try {
    const userId = req.session.user.userid;

    const result = await pool.query(
      `SELECT fr.requestid, fr.receiver_userid, u.username as receiver_username
       FROM friendrequest fr
       JOIN users u ON fr.receiver_userid = u.userid
       WHERE fr.sender_userid = $1
       AND fr.status = 'pending'
       ORDER BY fr.created_at DESC`,
      [userId]
    );

    res.json(result.rows);
  } catch (error) {
    console.error("Error fetching outgoing friend requests:", error);
    res
      .status(500)
      .json({ message: "Error fetching outgoing friend requests" });
  }
});

// Send friend request
router.post("/requests", async (req, res) => {
  const client = await pool.connect();
  try {
    const { email } = req.body;
    const senderId = req.session.user.userid;

    await client.query("BEGIN");

    // Cleanup old records first
    await cleanupFriendRequests(client);

    // Get receiver's user ID
    const receiverResult = await client.query(
      "SELECT userid FROM users WHERE email = $1",
      [email]
    );

    if (receiverResult.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ message: "User not found" });
    }

    const receiverId = receiverResult.rows[0].userid;

    // Prevent sending friend request to yourself
    if (senderId === receiverId) {
      await client.query("ROLLBACK");
      return res
        .status(400)
        .json({ message: "Cannot send friend request to yourself" });
    }

    // Check if they're already friends
    const friendResult = await client.query(
      `SELECT 1 FROM friend 
       WHERE (user1_id = $1 AND user2_id = $2) OR 
             (user1_id = $2 AND user2_id = $1)`,
      [senderId, receiverId]
    );

    if (friendResult.rows.length > 0) {
      await client.query("ROLLBACK");
      return res.status(400).json({ message: "Already friends" });
    }

    // Check for existing pending request
    const existingRequestResult = await client.query(
      `SELECT 1 FROM friendrequest 
       WHERE ((sender_userid = $1 AND receiver_userid = $2) OR 
              (sender_userid = $2 AND receiver_userid = $1))
       AND status = 'pending'`,
      [senderId, receiverId]
    );

    if (existingRequestResult.rows.length > 0) {
      await client.query("ROLLBACK");
      return res.status(400).json({ message: "Friend request already sent" });
    }

    // Check if the user was deleted by the receiver within 5 minutes
    const recentDeletionResult = await client.query(
      `SELECT 1 FROM friendrequest 
       WHERE sender_userid = $1
       AND receiver_userid = $2
       AND status = 'rejected'
       AND rejected_time > NOW() - INTERVAL '5 minutes'`,
      [senderId, receiverId]
    );

    if (recentDeletionResult.rows.length > 0) {
      await client.query("ROLLBACK");
      return res.status(400).json({
        message:
          "Please wait 5 minutes before sending a request to someone who deleted you",
      });
    }

    // Create new friend request
    const requestResult = await client.query(
      `INSERT INTO friendrequest (sender_userid, receiver_userid, status)
       VALUES ($1, $2, 'pending')
       RETURNING *`,
      [senderId, receiverId]
    );

    await client.query("COMMIT");
    res.json(requestResult.rows[0]);
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Error sending friend request:", error);
    res.status(500).json({ message: "Error sending friend request" });
  } finally {
    client.release();
  }
});

// Accept friend request
router.post("/requests/:requestId/accept", async (req, res) => {
  const client = await pool.connect();
  try {
    const { requestId } = req.params;
    const userId = req.session.user.userid;

    await client.query("BEGIN");

    // Cleanup old records first
    await cleanupFriendRequests(client);

    // Get request details
    const requestResult = await client.query(
      `SELECT * FROM friendrequest 
       WHERE requestid = $1 AND receiver_userid = $2 AND status = 'pending'`,
      [requestId, userId]
    );

    if (requestResult.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ message: "Friend request not found" });
    }

    const request = requestResult.rows[0];

    // Create friendship
    await client.query(
      `INSERT INTO friend (user1_id, user2_id)
       VALUES ($1, $2)`,
      [
        Math.min(request.sender_userid, request.receiver_userid),
        Math.max(request.sender_userid, request.receiver_userid),
      ]
    );

    // Update request status
    await client.query(
      "UPDATE friendrequest SET status = 'accepted' WHERE requestid = $1",
      [requestId]
    );

    await client.query("COMMIT");
    res.json({ message: "Friend request accepted" });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Error accepting friend request:", error);
    res.status(500).json({ message: "Error accepting friend request" });
  } finally {
    client.release();
  }
});

// Reject friend request
router.post("/requests/:requestId/reject", async (req, res) => {
  const client = await pool.connect();
  try {
    const { requestId } = req.params;
    const userId = req.session.user.userid;

    await client.query("BEGIN");

    // Cleanup old records first
    await cleanupFriendRequests(client);

    const result = await client.query(
      `UPDATE friendrequest 
       SET status = 'rejected', rejected_time = NOW()
       WHERE requestid = $1 AND receiver_userid = $2 AND status = 'pending'`,
      [requestId, userId]
    );

    if (result.rowCount === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ message: "Friend request not found" });
    }

    await client.query("COMMIT");
    res.json({ message: "Friend request rejected" });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Error rejecting friend request:", error);
    res.status(500).json({ message: "Error rejecting friend request" });
  } finally {
    client.release();
  }
});

// Delete friend
router.delete("/:friendId", async (req, res) => {
  const client = await pool.connect();
  try {
    const { friendId } = req.params;
    const userId = req.session.user.userid;

    await client.query("BEGIN");

    // Cleanup old records first
    await cleanupFriendRequests(client);

    // Delete friendship
    const result = await client.query(
      `DELETE FROM friend 
       WHERE (user1_id = $1 AND user2_id = $2) OR 
             (user1_id = $2 AND user2_id = $1)`,
      [userId, friendId]
    );

    if (result.rowCount === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ message: "Friend not found" });
    }

    // Create rejected friend request only from the deleted user's side
    await client.query(
      `INSERT INTO friendrequest (sender_userid, receiver_userid, status, rejected_time)
       VALUES ($1, $2, 'rejected', NOW())`,
      [friendId, userId] // friendId is the sender (deleted user), userId is the receiver (deleter)
    );

    await client.query("COMMIT");
    res.json({ message: "Friend deleted successfully" });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Error deleting friend:", error);
    res.status(500).json({ message: "Error deleting friend" });
  } finally {
    client.release();
  }
});

module.exports = router;
