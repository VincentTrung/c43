import React, { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../services/api";
import {
  Container,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  IconButton,
  Box,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/Delete";
import VisibilityIcon from "@mui/icons-material/Visibility";
import ShareIcon from "@mui/icons-material/Share";
import EditIcon from "@mui/icons-material/Edit";

const StocklistPage = () => {
  // URL parameter for the stock list ID
  const { listId } = useParams();
  const navigate = useNavigate();
  const [stockList, setStockList] = useState(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [isAddStockOpen, setIsAddStockOpen] = useState(false);

  const [isShareOpen, setIsShareOpen] = useState(false);
  const [newStock, setNewStock] = useState({ symbol: "", quantity: "" });

  const [friends, setFriends] = useState([]);
  const [selectedFriend, setSelectedFriend] = useState("");

  const [currentUser, setCurrentUser] = useState(null);
  const [isOwner, setIsOwner] = useState(false);

  const [reviews, setReviews] = useState([]);
  const [reviewContent, setReviewContent] = useState("");
  const [isReviewDialogOpen, setIsReviewDialogOpen] = useState(false);
  const [editingReview, setEditingReview] = useState(null);
  const [reviewError, setReviewError] = useState("");

  // Fetch stock list data and check ownership
  const fetchStockList = useCallback(async () => {
    try {
      setLoading(true);
      const data = await api.getStockList(listId);
      setStockList(data);
      // Check if current user is the owner
      const currentUser = await api.checkAuth();
      console.log("Stock List Data:", data);
      console.log("Current User:", currentUser);
      console.log("Is Owner:", data.userid === currentUser.user.userid);
      setIsOwner(data.userid === currentUser.user.userid);
    } catch (err) {
      setError(err.message || "Error fetching stock list");
      console.error("Error:", err);
    } finally {
      setLoading(false);
    }
  }, [listId]);

  // Fetch current user data
  const fetchCurrentUser = useCallback(async () => {
    try {
      const userData = await api.checkAuth();
      setCurrentUser(userData);
    } catch (err) {
      console.error("Error fetching current user:", err);
    }
  }, []);

  // Fetch list of friends for sharing
  const fetchFriends = useCallback(async () => {
    try {
      const friendsData = await api.getFriends();
      setFriends(friendsData);
    } catch (err) {
      console.error("Error fetching friends:", err);
    }
  }, []);

  // Fetch reviews for the current stock list
  const fetchReviews = useCallback(async () => {
    try {
      const data = await api.getReviews(listId);
      setReviews(data);
    } catch (err) {
      console.error("Error fetching reviews:", err);
    }
  }, [listId]);

  // Load initial data
  useEffect(() => {
    fetchStockList();
    fetchFriends();
    fetchReviews();
    fetchCurrentUser();
  }, [fetchStockList, fetchFriends, fetchReviews, fetchCurrentUser]);

  // Handle adding a new stock to the list
  const handleAddStock = async () => {
    try {
      setError(""); // Clear any previous errors

      // Validate quantity
      const quantity = parseInt(newStock.quantity);
      if (isNaN(quantity) || quantity <= 0) {
        setError("Quantity must be a positive number");
        return;
      }

      // Validate symbol
      if (!newStock.symbol.trim()) {
        setError("Stock symbol is required");
        return;
      }

      await api.addStockToList(listId, newStock.symbol, quantity);
      setNewStock({ symbol: "", quantity: "" });
      setIsAddStockOpen(false);
      fetchStockList();
    } catch (err) {
      setError(err.message || "Error adding stock to list");
      console.error("Error:", err);
    }
  };

  // Handle sharing the list with a friend
  const handleShareList = async () => {
    try {
      setError(""); // Clear any previous errors
      await api.shareStockList(listId, selectedFriend);
      setIsShareOpen(false);
      setSelectedFriend("");
      fetchStockList();
    } catch (err) {
      setError(err.message || "Error sharing stock list");
      console.error("Error:", err);
    }
  };

  // Handle removing a stock from the list
  const handleRemoveStock = async (symbol) => {
    if (
      !window.confirm(
        "Are you sure you want to remove this stock from the list?"
      )
    ) {
      return;
    }

    try {
      setError(""); // Clear any previous errors
      await api.removeStockFromList(listId, symbol);
      fetchStockList();
    } catch (err) {
      setError(err.message || "Error removing stock from list");
      console.error("Error:", err);
    }
  };

  // Navigate to stock details page
  const handleViewStockDetails = (symbol) => {
    navigate(`/stock/${symbol}`);
  };

  // Clear error message
  const handleCloseError = () => {
    setError("");
  };

  // Handle submitting or updating a review
  const handleReviewSubmit = async () => {
    try {
      setReviewError("");

      // Validate review content
      if (!reviewContent.trim()) {
        setReviewError("Review content cannot be empty");
        return;
      }

      if (reviewContent.length > 4000) {
        setReviewError("Review cannot exceed 4000 characters");
        return;
      }

      if (editingReview) {
        await api.updateReview(editingReview.reviewid, reviewContent);
      } else {
        await api.createReview(listId, reviewContent);
      }
      setReviewContent("");
      setIsReviewDialogOpen(false);
      setEditingReview(null);
      fetchReviews();
    } catch (err) {
      setReviewError(err.message);
    }
  };

  // Handle deleting a review
  const handleDeleteReview = async (reviewId) => {
    try {
      await api.deleteReview(reviewId);
      fetchReviews();
    } catch (err) {
      setError(err.message);
    }
  };

  // Loading state
  if (loading) {
    return (
      <Container>
        <Typography>Loading...</Typography>
      </Container>
    );
  }

  // Error state
  if (!stockList) {
    return (
      <Container>
        <Typography>Stock list not found</Typography>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Box sx={{ display: "flex", justifyContent: "space-between", mb: 4 }}>
        <Box>
          <Typography variant="h4" component="h1">
            {stockList.name}
          </Typography>
          <Typography variant="subtitle1" color="text.secondary">
            Created by: {stockList.creator_name}
          </Typography>
        </Box>
        <Box sx={{ display: "flex", gap: 2, alignItems: "center" }}>
          <Typography variant="subtitle1" color="text.secondary">
            Total Value: ${stockList.total_value.toFixed(2)}
          </Typography>
          {isOwner && (
            <>
              <Button
                variant="contained"
                startIcon={<ShareIcon />}
                onClick={() => setIsShareOpen(true)}
              >
                Share List
              </Button>
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={() => setIsAddStockOpen(true)}
              >
                Add Stock
              </Button>
            </>
          )}
        </Box>
      </Box>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Symbol</TableCell>
              <TableCell>Company Name</TableCell>
              <TableCell align="right">Quantity</TableCell>
              <TableCell align="right">Current Price</TableCell>
              <TableCell align="right">Total Value</TableCell>
              {isOwner && <TableCell align="center">Actions</TableCell>}
            </TableRow>
          </TableHead>
          <TableBody>
            {stockList.items.map((item) => (
              <TableRow key={item.symbol}>
                <TableCell>{item.symbol}</TableCell>
                <TableCell>{item.company_name}</TableCell>
                <TableCell align="right">{item.quantity}</TableCell>
                <TableCell align="right">
                  ${Number(item.current_price || 0).toFixed(2)}
                </TableCell>
                <TableCell align="right">
                  $
                  {(Number(item.current_price || 0) * item.quantity).toFixed(2)}
                </TableCell>
                {isOwner && (
                  <TableCell align="center">
                    <IconButton
                      onClick={() => handleViewStockDetails(item.symbol)}
                      color="primary"
                    >
                      <VisibilityIcon />
                    </IconButton>
                    <IconButton
                      onClick={() => handleRemoveStock(item.symbol)}
                      color="error"
                    >
                      <DeleteIcon />
                    </IconButton>
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={isAddStockOpen} onClose={() => setIsAddStockOpen(false)}>
        <DialogTitle>Add Stock to List</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Stock Symbol"
            fullWidth
            value={newStock.symbol}
            onChange={(e) =>
              setNewStock({ ...newStock, symbol: e.target.value.toUpperCase() })
            }
            inputProps={{ minLength: 1 }}
          />
          <TextField
            margin="dense"
            label="Quantity"
            type="number"
            fullWidth
            value={newStock.quantity}
            onChange={(e) => {
              const value = e.target.value;
              if (value === "" || parseInt(value) > 0) {
                setNewStock({ ...newStock, quantity: value });
              }
            }}
            inputProps={{ min: 1 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setIsAddStockOpen(false)}>Cancel</Button>
          <Button onClick={handleAddStock} variant="contained">
            Add
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={isShareOpen} onClose={() => setIsShareOpen(false)}>
        <DialogTitle>Share Stock List</DialogTitle>
        <DialogContent>
          <FormControl fullWidth sx={{ mt: 2 }}>
            <InputLabel>Select Friend</InputLabel>
            <Select
              value={selectedFriend}
              onChange={(e) => setSelectedFriend(e.target.value)}
              label="Select Friend"
            >
              {friends.map((friend) => (
                <MenuItem key={friend.userid} value={friend.userid}>
                  {friend.username}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setIsShareOpen(false)}>Cancel</Button>
          <Button onClick={handleShareList} variant="contained">
            Share
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={!!error} onClose={handleCloseError}>
        <DialogTitle>Error</DialogTitle>
        <DialogContent>
          <Typography>{error}</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseError}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Reviews Section */}
      <div className="bg-white p-6 rounded-lg shadow-md mb-8">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">Reviews</h2>
          {stockList && currentUser && (
            <Button
              variant="contained"
              color="primary"
              onClick={() => {
                setEditingReview(null);
                setReviewContent("");
                setIsReviewDialogOpen(true);
              }}
            >
              Write Review
            </Button>
          )}
        </div>

        {reviews.length === 0 ? (
          <p className="text-gray-500">No reviews yet.</p>
        ) : (
          <div className="space-y-4">
            {reviews.map((review) => (
              <div key={review.reviewid} className="border-b pb-4">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-semibold">{review.username}</p>
                    <p className="text-sm text-gray-500">
                      {new Date(review.created_at).toLocaleDateString()}
                      {review.edited_at && " (edited)"}
                    </p>
                  </div>
                  {currentUser &&
                    (review.userid === currentUser.user.userid ||
                      stockList?.userid === currentUser.user.userid) && (
                      <div className="flex space-x-2">
                        {review.userid === currentUser.user.userid && (
                          <IconButton
                            size="small"
                            onClick={() => {
                              setEditingReview(review);
                              setReviewContent(review.content);
                              setIsReviewDialogOpen(true);
                            }}
                          >
                            <EditIcon />
                          </IconButton>
                        )}
                        <IconButton
                          size="small"
                          onClick={() => handleDeleteReview(review.reviewid)}
                        >
                          <DeleteIcon />
                        </IconButton>
                      </div>
                    )}
                </div>
                <p className="mt-2">{review.content}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Review Dialog */}
      <Dialog
        open={isReviewDialogOpen}
        onClose={() => {
          setIsReviewDialogOpen(false);
          setEditingReview(null);
          setReviewContent("");
        }}
      >
        <DialogTitle>
          {editingReview ? "Edit Review" : "Write Review"}
        </DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Review"
            type="text"
            fullWidth
            multiline
            rows={4}
            value={reviewContent}
            onChange={(e) => setReviewContent(e.target.value)}
            error={!!reviewError}
            helperText={reviewError}
            inputProps={{ maxLength: 4000 }}
          />
          <Typography variant="caption" color="text.secondary" sx={{ mt: 1 }}>
            {reviewContent.length}/4000 characters
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              setIsReviewDialogOpen(false);
              setEditingReview(null);
              setReviewContent("");
            }}
          >
            Cancel
          </Button>
          <Button
            onClick={handleReviewSubmit}
            color="primary"
            disabled={!reviewContent.trim() || reviewContent.length > 4000}
          >
            {editingReview ? "Update" : "Submit"}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default StocklistPage;
