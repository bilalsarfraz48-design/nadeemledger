import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";

// Drop-in replacement for the Claude-artifact window.storage API,
// backed by the browser's localStorage so the app works as a normal website.
window.storage = {
  get: async (key) => {
    const v = localStorage.getItem(key);
    if (v === null) {
      throw new Error(`Key not found: ${key}`);
    }
    return { key, value: v };
  },
  set: async (key, value) => {
    localStorage.setItem(key, value);
    return { key, value };
  },
  delete: async (key) => {
    localStorage.removeItem(key);
    return { key, deleted: true };
  },
  list: async (prefix) => {
    const keys = Object.keys(localStorage).filter((k) => !prefix || k.startsWith(prefix));
    return { keys, prefix };
  },
};

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
