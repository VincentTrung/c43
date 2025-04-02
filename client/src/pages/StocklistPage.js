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

const StocklistPage = () => {
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
  const [isOwner, setIsOwner] = useState(false);

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

  useEffect(() => {
    fetchStockList();
    fetchFriends();
  }, [fetchStockList]);

  const fetchFriends = async () => {
    try {
      const friendsData = await api.getFriends();
      setFriends(friendsData);
    } catch (err) {
      console.error("Error fetching friends:", err);
    }
  };

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

  const handleViewStockDetails = (symbol) => {
    navigate(`/stock/${symbol}`);
  };

  const handleCloseError = () => {
    setError("");
  };

  if (loading) {
    return (
      <Container>
        <Typography>Loading...</Typography>
      </Container>
    );
  }

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
    </Container>
  );
};

export default StocklistPage;
