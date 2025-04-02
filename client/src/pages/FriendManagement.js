import React, { useState, useEffect } from "react";
import api from "../services/api";

const FriendManagement = () => {
  const [friends, setFriends] = useState([]);
  const [incomingRequests, setIncomingRequests] = useState([]);
  const [outgoingRequests, setOutgoingRequests] = useState([]);
  const [newFriendEmail, setNewFriendEmail] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    fetchFriends();
    fetchFriendRequests();
  }, []);

  const fetchFriends = async () => {
    try {
      const response = await api.getFriends();
      setFriends(response);
    } catch (err) {
      setError("Error fetching friends");
      console.error("Error:", err);
    }
  };

  const fetchFriendRequests = async () => {
    try {
      const [incoming, outgoing] = await Promise.all([
        api.getIncomingFriendRequests(),
        api.getOutgoingFriendRequests(),
      ]);
      setIncomingRequests(incoming);
      setOutgoingRequests(outgoing);
    } catch (err) {
      setError("Error fetching friend requests");
      console.error("Error:", err);
    }
  };

  const handleSendRequest = async (e) => {
    e.preventDefault();
    try {
      await api.sendFriendRequest(newFriendEmail);
      setSuccess("Friend request sent successfully");
      setNewFriendEmail("");
      fetchFriendRequests();
    } catch (err) {
      setError(err.response?.data?.message || "Error sending friend request");
      console.error("Error:", err);
    }
  };

  const handleAcceptRequest = async (requestId) => {
    try {
      await api.acceptFriendRequest(requestId);
      setSuccess("Friend request accepted");
      fetchFriends();
      fetchFriendRequests();
    } catch (err) {
      setError("Error accepting friend request");
      console.error("Error:", err);
    }
  };

  const handleRejectRequest = async (requestId) => {
    try {
      await api.rejectFriendRequest(requestId);
      setSuccess("Friend request rejected");
      fetchFriendRequests();
    } catch (err) {
      setError("Error rejecting friend request");
      console.error("Error:", err);
    }
  };

  const handleDeleteFriend = async (friendId) => {
    try {
      await api.deleteFriend(friendId);
      setSuccess("Friend deleted successfully");
      fetchFriends();
    } catch (err) {
      setError("Error deleting friend");
      console.error("Error:", err);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6 mb-6">
      <h2 className="text-2xl font-bold mb-4">Friend Management</h2>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      {success && (
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
          {success}
        </div>
      )}

      {/* Send Friend Request Form */}
      <form onSubmit={handleSendRequest} className="mb-6">
        <div className="flex gap-2">
          <input
            type="email"
            value={newFriendEmail}
            onChange={(e) => setNewFriendEmail(e.target.value)}
            placeholder="Enter friend's email"
            className="flex-1 p-2 border rounded"
            required
          />
          <button
            type="submit"
            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
          >
            Send Request
          </button>
        </div>
      </form>

      {/* Incoming Friend Requests */}
      {incomingRequests.length > 0 && (
        <div className="mb-6">
          <h3 className="text-xl font-semibold mb-2">Incoming Requests</h3>
          <div className="space-y-2">
            {incomingRequests.map((request) => (
              <div
                key={request.requestid}
                className="flex items-center justify-between p-3 bg-gray-50 rounded"
              >
                <span>{request.sender_username}</span>
                <div className="space-x-2">
                  <button
                    onClick={() => handleAcceptRequest(request.requestid)}
                    className="bg-green-500 text-white px-3 py-1 rounded hover:bg-green-600"
                  >
                    Accept
                  </button>
                  <button
                    onClick={() => handleRejectRequest(request.requestid)}
                    className="bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600"
                  >
                    Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Outgoing Friend Requests */}
      {outgoingRequests.length > 0 && (
        <div className="mb-6">
          <h3 className="text-xl font-semibold mb-2">Outgoing Requests</h3>
          <div className="space-y-2">
            {outgoingRequests.map((request) => (
              <div
                key={request.requestid}
                className="flex items-center justify-between p-3 bg-gray-50 rounded"
              >
                <span>{request.receiver_username}</span>
                <span className="text-gray-500">Pending</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Friends List */}
      <div>
        <h3 className="text-xl font-semibold mb-2">Friends</h3>
        <div className="space-y-2">
          {friends.map((friend) => (
            <div
              key={friend.userid}
              className="flex items-center justify-between p-3 bg-gray-50 rounded"
            >
              <span>{friend.username}</span>
              <button
                onClick={() => handleDeleteFriend(friend.userid)}
                className="bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600"
              >
                Delete
              </button>
            </div>
          ))}
          {friends.length === 0 && (
            <p className="text-gray-500">No friends yet</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default FriendManagement;
