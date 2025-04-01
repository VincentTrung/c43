import React, { useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
} from "@mui/material";
import api from "../services/api";

const AddStockData = ({ isOpen, onClose, onSuccess }) => {
  const [formData, setFormData] = useState({
    symbol: "",
    date: "",
    open_price: "",
    high_price: "",
    low_price: "",
    close_price: "",
    volume: "",
  });
  const [error, setError] = useState("");

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async () => {
    try {
      setError("");
      // Convert string values to numbers
      const stockData = {
        ...formData,
        open_price: parseFloat(formData.open_price),
        high_price: parseFloat(formData.high_price),
        low_price: parseFloat(formData.low_price),
        close_price: parseFloat(formData.close_price),
        volume: parseInt(formData.volume),
      };

      await api.addStockData(stockData);
      onSuccess();
      onClose();
      // Reset form
      setFormData({
        symbol: "",
        date: "",
        open_price: "",
        high_price: "",
        low_price: "",
        close_price: "",
        volume: "",
      });
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <Dialog open={isOpen} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Add Daily Stock Data</DialogTitle>
      <DialogContent>
        <TextField
          fullWidth
          label="Stock Symbol"
          name="symbol"
          value={formData.symbol}
          onChange={handleChange}
          margin="normal"
          required
          error={!!error}
          helperText={error}
        />
        <TextField
          fullWidth
          label="Date"
          name="date"
          type="date"
          value={formData.date}
          onChange={handleChange}
          margin="normal"
          required
          InputLabelProps={{ shrink: true }}
        />
        <TextField
          fullWidth
          label="Open Price"
          name="open_price"
          type="number"
          value={formData.open_price}
          onChange={handleChange}
          margin="normal"
          required
          inputProps={{ step: "0.01" }}
        />
        <TextField
          fullWidth
          label="High Price"
          name="high_price"
          type="number"
          value={formData.high_price}
          onChange={handleChange}
          margin="normal"
          required
          inputProps={{ step: "0.01" }}
        />
        <TextField
          fullWidth
          label="Low Price"
          name="low_price"
          type="number"
          value={formData.low_price}
          onChange={handleChange}
          margin="normal"
          required
          inputProps={{ step: "0.01" }}
        />
        <TextField
          fullWidth
          label="Close Price"
          name="close_price"
          type="number"
          value={formData.close_price}
          onChange={handleChange}
          margin="normal"
          required
          inputProps={{ step: "0.01" }}
        />
        <TextField
          fullWidth
          label="Volume"
          name="volume"
          type="number"
          value={formData.volume}
          onChange={handleChange}
          margin="normal"
          required
          inputProps={{ step: "1" }}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={handleSubmit} variant="contained" color="primary">
          Add Data
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default AddStockData;
