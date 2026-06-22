import React from "react";
import ReactDOM from "react-dom/client";
import "./storage-polyfill.js";
import App from "./App.jsx";
import PinGate from "./PinGate.jsx";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <PinGate>
      <App />
    </PinGate>
  </React.StrictMode>
);
