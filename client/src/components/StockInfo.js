import React, { useState, useEffect } from "react";
import api from "../services/api";
import Modal from "./Modal";
import ErrorModal from "./ErrorModal";

const StockInfo = ({ symbol, isOpen, onClose }) => {
  const [stockInfo, setStockInfo] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [isErrorModalOpen, setIsErrorModalOpen] = useState(false);

  useEffect(() => {
    const fetchStockInfo = async () => {
      try {
        setLoading(true);
        const data = await api.getStockInfo(symbol);

        // Convert string values to numbers
        const processedData = {
          ...data,
          latest_price: data.latest_price
            ? {
                ...data.latest_price,
                open_price: parseFloat(data.latest_price.open_price) || 0,
                high_price: parseFloat(data.latest_price.high_price) || 0,
                low_price: parseFloat(data.latest_price.low_price) || 0,
                close_price: parseFloat(data.latest_price.close_price) || 0,
                volume: parseInt(data.latest_price.volume) || 0,
              }
            : null,
          price_history:
            data.price_history?.map((day) => ({
              ...day,
              open_price: parseFloat(day.open_price) || 0,
              high_price: parseFloat(day.high_price) || 0,
              low_price: parseFloat(day.low_price) || 0,
              close_price: parseFloat(day.close_price) || 0,
              volume: parseInt(day.volume) || 0,
            })) || [],
        };

        setStockInfo(processedData);
      } catch (err) {
        setError(err.message);
        setIsErrorModalOpen(true);
        console.error("Error:", err);
      } finally {
        setLoading(false);
      }
    };

    if (symbol && isOpen) {
      fetchStockInfo();
    }
  }, [symbol, isOpen]);

  return (
    <>
      <Modal isOpen={isOpen} onClose={onClose}>
        <div className="bg-white">
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            </div>
          ) : !stockInfo ? (
            <div className="bg-gray-50 border-l-4 border-gray-500 p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg
                    className="h-4 w-4 text-gray-400"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fillRule="evenodd"
                      d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm text-gray-700">
                    No stock information available
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-4">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h2 className="text-xl font-bold">{stockInfo.symbol}</h2>
                  <p className="text-gray-600">{stockInfo.company_name}</p>
                </div>
              </div>

              {/* Latest Price Information */}
              {stockInfo.latest_price && (
                <div className="mb-4">
                  <h3 className="text-lg font-semibold mb-2">
                    Latest Price Information
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    <div className="bg-gray-50 p-2 rounded">
                      <p className="text-sm text-gray-600">Open</p>
                      <p className="text-base font-semibold">
                        ${stockInfo.latest_price.open_price.toFixed(2)}
                      </p>
                    </div>
                    <div className="bg-gray-50 p-2 rounded">
                      <p className="text-sm text-gray-600">High</p>
                      <p className="text-base font-semibold">
                        ${stockInfo.latest_price.high_price.toFixed(2)}
                      </p>
                    </div>
                    <div className="bg-gray-50 p-2 rounded">
                      <p className="text-sm text-gray-600">Low</p>
                      <p className="text-base font-semibold">
                        ${stockInfo.latest_price.low_price.toFixed(2)}
                      </p>
                    </div>
                    <div className="bg-gray-50 p-2 rounded">
                      <p className="text-sm text-gray-600">Close</p>
                      <p className="text-base font-semibold">
                        ${stockInfo.latest_price.close_price.toFixed(2)}
                      </p>
                    </div>
                    <div className="bg-gray-50 p-2 rounded">
                      <p className="text-sm text-gray-600">Volume</p>
                      <p className="text-base font-semibold">
                        {(stockInfo.latest_price.volume / 1000).toFixed(1)}K
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Price History Chart */}
              {stockInfo.price_history &&
                stockInfo.price_history.length > 0 && (
                  <div>
                    <h3 className="text-lg font-semibold mb-2">
                      Price History (Last 30 Days)
                    </h3>
                    <div className="h-48 bg-gray-50 rounded">
                      <div className="overflow-x-auto">
                        <table className="min-w-full">
                          <thead>
                            <tr className="bg-gray-100">
                              <th className="px-3 py-2 text-sm">Date</th>
                              <th className="px-3 py-2 text-sm">Close</th>
                              <th className="px-3 py-2 text-sm">Volume</th>
                            </tr>
                          </thead>
                          <tbody>
                            {stockInfo.price_history.map((day) => (
                              <tr key={day.date} className="border-b">
                                <td className="px-3 py-2 text-sm">
                                  {new Date(day.date).toLocaleDateString()}
                                </td>
                                <td className="px-3 py-2 text-sm">
                                  ${day.close_price.toFixed(2)}
                                </td>
                                <td className="px-3 py-2 text-sm">
                                  {(day.volume / 1000).toFixed(1)}K
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                )}
            </div>
          )}
        </div>
      </Modal>

      <ErrorModal
        isOpen={isErrorModalOpen}
        onClose={() => setIsErrorModalOpen(false)}
        error={error}
      />
    </>
  );
};

export default StockInfo;
