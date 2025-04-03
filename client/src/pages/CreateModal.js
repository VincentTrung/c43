import React, { useState } from "react";

// Create a new stock list or portfolio modal
const CreateModal = ({
  isOpen,
  onClose,
  onSubmit,
  title,
  placeholder,
  type,
}) => {
  const [name, setName] = useState("");
  const [visibility, setVisibility] = useState("private");

  const handleSubmit = (e) => {
    e.preventDefault();
    if (type === "stocklist") {
      onSubmit(name, visibility);
    } else {
      onSubmit(name);
    }
    setName("");
    setVisibility("private");
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg shadow-xl w-96">
        <h2 className="text-xl font-semibold mb-4">{title}</h2>
        <form onSubmit={handleSubmit}>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={placeholder}
            className="w-full p-2 border rounded mb-4"
            required
          />
          {type === "stocklist" && (
            <select
              value={visibility}
              onChange={(e) => setVisibility(e.target.value)}
              className="w-full p-2 border rounded mb-4"
            >
              <option value="private">Private</option>
              <option value="public">Public</option>
            </select>
          )}
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-600 hover:text-gray-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              Create
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateModal;
