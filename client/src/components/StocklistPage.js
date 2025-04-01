import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
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
  Tooltip,
  Box,
  Chip,
} from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import VisibilityIcon from "@mui/icons-material/Visibility";
import api from "../services/api";

const StockListPage = () => {
  const { listId } = useParams();
  const navigate = useNavigate();
  const [stockList, setStockList] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isAddStockOpen, setIsAddStockOpen] = useState(false);
  const [newStockSymbol, setNewStockSymbol] = useState("");
  const [addStockError, setAddStockError] = useState("");

  useEffect(() => {
    fetchStockList();
  }, [listId]);

  const fetchStockList = async () => {
    try {
      setLoading(true);
      const response = await api.getStockList(listId);
      setStockList(response);
      setError(null);
    } catch (err) {
      setError(err.message || "Error fetching stock list");
    } finally {
      setLoading(false);
    }
  };

  const handleAddStock = async () => {
    try {
      setAddStockError("");
      await api.addStockToList(listId, newStockSymbol);
      setIsAddStockOpen(false);
      setNewStockSymbol("");
      fetchStockList();
    } catch (err) {
      setAddStockError(err.message || "Error adding stock to list");
    }
  };

  const handleDeleteStock = async (symbol) => {
    if (
      window.confirm(
        "Are you sure you want to remove this stock from the list?"
      )
    ) {
      try {
        await api.removeStockFromList(listId, symbol);
        fetchStockList();
      } catch (err) {
        setError(err.message || "Error removing stock from list");
      }
    }
  };

  const handleViewStock = (symbol) => {
    navigate(`/stock/${symbol}`);
  };

  if (loading) {
    return (
      <Container>
        <Typography>Loading...</Typography>
      </Container>
    );
  }

  if (error) {
    return (
      <Container>
        <Typography color="error">{error}</Typography>
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
    <Container>
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          mb: 3,
        }}
      >
        <Box>
          <Typography variant="h4" component="h1">
            {stockList.name}
          </Typography>
          <Typography variant="subtitle1" color="text.secondary">
            Created by {stockList.creator_name}
            {stockList.is_owner && (
              <Chip label="Owner" size="small" color="primary" sx={{ ml: 1 }} />
            )}
          </Typography>
        </Box>
        {stockList.is_owner && (
          <Button
            variant="contained"
            color="primary"
            onClick={() => setIsAddStockOpen(true)}
          >
            Add Stock
          </Button>
        )}
      </Box>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Symbol</TableCell>
              <TableCell>Company Name</TableCell>
              <TableCell>Current Price</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {stockList.stocks.map((stock) => (
              <TableRow key={stock.symbol}>
                <TableCell>{stock.symbol}</TableCell>
                <TableCell>{stock.company_name}</TableCell>
                <TableCell>${stock.current_price.toFixed(2)}</TableCell>
                <TableCell>
                  <Tooltip title="View Details">
                    <IconButton
                      onClick={() => handleViewStock(stock.symbol)}
                      color="primary"
                    >
                      <VisibilityIcon />
                    </IconButton>
                  </Tooltip>
                  {stockList.is_owner && (
                    <Tooltip title="Remove from List">
                      <IconButton
                        onClick={() => handleDeleteStock(stock.symbol)}
                        color="error"
                      >
                        <DeleteIcon />
                      </IconButton>
                    </Tooltip>
                  )}
                </TableCell>
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
            value={newStockSymbol}
            onChange={(e) => setNewStockSymbol(e.target.value.toUpperCase())}
            error={!!addStockError}
            helperText={addStockError}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setIsAddStockOpen(false)}>Cancel</Button>
          <Button onClick={handleAddStock} variant="contained" color="primary">
            Add
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default StockListPage;
